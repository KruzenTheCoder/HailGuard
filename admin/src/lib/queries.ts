import type {
  DriverProfile,
  PlatformVerifications,
  ReviewStatus,
  SubscriptionStatus,
  Vehicle,
  VehicleStatus,
} from "@hailguard/shared";

import {
  mapDriverProfile,
  mapVehicle,
  type DriverProfileRow,
  type UserLite,
  type VehicleRow,
} from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });
export function formatZAR(amount: number): string {
  return ZAR.format(amount);
}

// ---------------------------------------------------------------------------
// Dashboard — KPIs + 30-day sparkline series
// ---------------------------------------------------------------------------
const SPARKLINE_DAYS = 30;

export type DashboardMetrics = {
  activeDrivers: number;
  totalDrivers: number;
  totalVehicles: number;
  activeVehicles: number;
  pendingApplications: number;
  pendingProfiles: number;
  pendingVehicles: number;
  activeSubscriptions: number;
  activeZones: number;
  revenueCollected: number;
  /** Active drivers / total drivers, 0–100. */
  compliancePercent: number;
  /**
   * 30-element series, oldest first, used for the bar charts on each KPI card.
   * Every entry is a **per-day** count (not cumulative) so each bar represents
   * activity on that day. Days outside the window are ignored — we do NOT
   * absorb pre-window history into bar[0].
   */
  series: {
    /** New drivers approved on each day in the window. */
    approvedDrivers: number[];
    /** Vehicles flipped to active on each day in the window. */
    activeVehicles: number[];
    /** New pending applications received on each day (profiles + vehicles). */
    newPending: number[];
    /**
     * End-of-day compliance % (approved drivers ÷ total drivers). This is the
     * only series that includes pre-window history, because a snapshot ratio
     * needs accurate totals at every point in time.
     */
    compliance: number[];
    /** Succeeded payment revenue per day. */
    revenue: number[];
  };
};

type LiteDriverRow = {
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
};
type LiteVehicleRow = {
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
};
type LitePaymentRow = {
  amount: number;
  status: string;
  created_at: string;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayBuckets(days: number): { dates: Date[]; index: Map<string, number> } {
  const today = startOfDay(new Date());
  const dates: Date[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d);
    index.set(d.toISOString().slice(0, 10), days - 1 - i);
  }
  return { dates, index };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient();

  const [allProfiles, allVehicles, activeZonesCount, payments, activeSubs] = await Promise.all([
    supabase
      .from("driver_profiles")
      .select("status, created_at, updated_at")
      .returns<LiteDriverRow[]>(),
    supabase
      .from("vehicles")
      .select("status, created_at, updated_at")
      .returns<LiteVehicleRow[]>(),
    supabase.from("zones").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("payments")
      .select("amount, status, created_at")
      .eq("status", "succeeded")
      .returns<LitePaymentRow[]>(),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const profiles = allProfiles.data ?? [];
  const vehicles = allVehicles.data ?? [];
  const paymentRows = payments.data ?? [];

  const totalDrivers = profiles.length;
  const approvedProfiles = profiles.filter((p) => p.status === "approved");
  const pendingProfiles = profiles.filter((p) => p.status === "pending").length;
  const totalVehicles = vehicles.length;
  const activeVehicleCount = vehicles.filter((v) => v.status === "active").length;
  const pendingVehiclesCount = vehicles.filter((v) => v.status === "pending").length;
  const revenueCollected = paymentRows.reduce((sum, p) => sum + Number(p.amount), 0);

  const compliancePercent = totalDrivers === 0
    ? 0
    : Math.round((approvedProfiles.length / totalDrivers) * 100);

  const { dates, index } = dayBuckets(SPARKLINE_DAYS);
  const startMs = dates[0].getTime();
  const endMs = dates[dates.length - 1].getTime() + 86_400_000;

  // Honest per-day counters — events outside the window are skipped, not
  // crammed into bar[0]. A "flat" first bar on a young tenant is correct.
  const bucketByDay = (
    rows: { time: string }[],
    out: number[],
    weight = 1,
  ) => {
    for (const row of rows) {
      const t = Date.parse(row.time);
      if (Number.isNaN(t) || t < startMs || t >= endMs) continue;
      const key = new Date(t).toISOString().slice(0, 10);
      const i = index.get(key);
      if (i !== undefined) out[i] += weight;
    }
  };

  const approvedDrivers = new Array(SPARKLINE_DAYS).fill(0) as number[];
  bucketByDay(
    approvedProfiles.map((p) => ({ time: p.updated_at ?? p.created_at })),
    approvedDrivers,
  );

  const activeVehiclesSeries = new Array(SPARKLINE_DAYS).fill(0) as number[];
  bucketByDay(
    vehicles
      .filter((v) => v.status === "active")
      .map((v) => ({ time: v.updated_at ?? v.created_at })),
    activeVehiclesSeries,
  );

  const newPending = new Array(SPARKLINE_DAYS).fill(0) as number[];
  bucketByDay(
    [...profiles, ...vehicles]
      .filter((r) => r.status === "pending")
      .map((r) => ({ time: r.created_at })),
    newPending,
  );

  const revenue = new Array(SPARKLINE_DAYS).fill(0) as number[];
  for (const p of paymentRows) {
    const t = Date.parse(p.created_at);
    if (Number.isNaN(t) || t < startMs || t >= endMs) continue;
    const key = new Date(t).toISOString().slice(0, 10);
    const i = index.get(key);
    if (i !== undefined) revenue[i] += Number(p.amount);
  }

  // Compliance % is a SNAPSHOT, so we DO include pre-window history. Build
  // cumulative approved + cumulative total drivers at each day, then ratio.
  const approvedCumulative = new Array(SPARKLINE_DAYS).fill(0) as number[];
  for (const p of approvedProfiles) {
    const t = Date.parse(p.updated_at ?? p.created_at);
    if (Number.isNaN(t)) continue;
    if (t < startMs) {
      approvedCumulative[0] += 1;
      continue;
    }
    if (t >= endMs) continue;
    const i = index.get(new Date(t).toISOString().slice(0, 10));
    if (i !== undefined) approvedCumulative[i] += 1;
  }
  for (let i = 1; i < SPARKLINE_DAYS; i++) approvedCumulative[i] += approvedCumulative[i - 1];

  const totalDriversCumulative = new Array(SPARKLINE_DAYS).fill(0) as number[];
  for (const p of profiles) {
    const t = Date.parse(p.created_at);
    if (Number.isNaN(t)) continue;
    if (t < startMs) {
      totalDriversCumulative[0] += 1;
      continue;
    }
    if (t >= endMs) continue;
    const i = index.get(new Date(t).toISOString().slice(0, 10));
    if (i !== undefined) totalDriversCumulative[i] += 1;
  }
  for (let i = 1; i < SPARKLINE_DAYS; i++)
    totalDriversCumulative[i] += totalDriversCumulative[i - 1];

  const compliance = approvedCumulative.map((approved, i) => {
    const total = totalDriversCumulative[i];
    return total === 0 ? 0 : Math.round((approved / total) * 100);
  });

  return {
    totalDrivers,
    activeDrivers: approvedProfiles.length,
    totalVehicles,
    activeVehicles: activeVehicleCount,
    pendingApplications: pendingProfiles + pendingVehiclesCount,
    pendingProfiles,
    pendingVehicles: pendingVehiclesCount,
    activeSubscriptions: activeSubs.count ?? 0,
    activeZones: activeZonesCount.count ?? 0,
    revenueCollected,
    compliancePercent,
    series: {
      approvedDrivers,
      activeVehicles: activeVehiclesSeries,
      newPending,
      compliance,
      revenue,
    },
  };
}

// ---------------------------------------------------------------------------
// Driver & vehicle status table — one row per vehicle, joined with driver +
// active subscriptions for the dashboard table.
// ---------------------------------------------------------------------------
export type DriverVehicleStatusRow = {
  vehicleId: string;
  driverId: string;
  userId: string | null;
  driverName: string;
  driverEmail: string | null;
  driverPhone: string | null;
  driverStatus: ReviewStatus;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vehicleStatus: VehicleStatus;
  roadworthyExpiresAt: string | null;
  activeZones: string[];
  fullyCompliant: boolean;
  createdAt: string;
};

type VehicleStatusRow = VehicleRow & {
  driver_profiles:
    | (DriverProfileRow & {
        users: UserLite | null;
      })
    | null;
  subscriptions:
    | {
        status: SubscriptionStatus;
        zones: { name: string } | null;
      }[]
    | null;
};

export async function getDriverVehicleStatus(): Promise<DriverVehicleStatusRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select(
      `*,
       driver_profiles(*, users(id, full_name, email, phone_number)),
       subscriptions(status, zones(name))`
    )
    .order("created_at", { ascending: false })
    .returns<VehicleStatusRow[]>();

  return (data ?? []).map((row) => {
    const user = row.driver_profiles?.users ?? null;
    const activeZones = (row.subscriptions ?? [])
      .filter((s) => s.status === "active")
      .map((s) => s.zones?.name)
      .filter((n): n is string => !!n);

    const fullyCompliant =
      row.status === "active" &&
      row.driver_profiles?.status === "approved" &&
      activeZones.length > 0;

    return {
      vehicleId: row.id,
      driverId: row.driver_id,
      userId: user?.id ?? null,
      driverName: user?.full_name || user?.email || user?.phone_number || "Unnamed driver",
      driverEmail: user?.email ?? null,
      driverPhone: user?.phone_number ?? null,
      driverStatus: row.driver_profiles?.status ?? "pending",
      make: row.make,
      model: row.model,
      year: row.year,
      licensePlate: row.license_plate,
      vehicleStatus: row.status,
      roadworthyExpiresAt: row.roadworthy_expires_at,
      activeZones,
      fullyCompliant,
      createdAt: row.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// Recent activity — last N audit events
// ---------------------------------------------------------------------------
export type ActivityRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
  actorName: string;
};

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  actor: UserLite | null;
};

export async function getRecentActivity(limit = 12): Promise<ActivityRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, detail, created_at, actor:users(id, full_name, email, phone_number)"
    )
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AuditRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detail: row.detail ?? {},
    createdAt: row.created_at,
    actorName:
      row.actor?.full_name || row.actor?.email || row.actor?.phone_number || "System",
  }));
}

// ---------------------------------------------------------------------------
// Pending queues + driver detail
// ---------------------------------------------------------------------------
export type ProfileWithUser = { profile: DriverProfile; user: UserLite | null };

export async function getPendingProfiles(): Promise<ProfileWithUser[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("driver_profiles")
    .select("*, users(id, full_name, email, phone_number)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<(DriverProfileRow & { users: UserLite | null })[]>();

  return (data ?? []).map((row) => ({ profile: mapDriverProfile(row), user: row.users }));
}

export type VehicleWithDriver = {
  vehicle: Vehicle;
  user: UserLite | null;
};

export async function getPendingVehicles(): Promise<VehicleWithDriver[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*, driver_profiles(id, users(id, full_name, email, phone_number))")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<(VehicleRow & { driver_profiles: { users: UserLite | null } | null })[]>();

  return (data ?? []).map((row) => ({
    vehicle: mapVehicle(row),
    user: row.driver_profiles?.users ?? null,
  }));
}

export type DriverListItem = {
  profile: DriverProfile;
  user: UserLite | null;
  vehicleCount: number;
};

export async function getDrivers(): Promise<DriverListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("driver_profiles")
    .select("*, users(id, full_name, email, phone_number), vehicles(id)")
    .order("created_at", { ascending: false })
    .returns<(DriverProfileRow & { users: UserLite | null; vehicles: { id: string }[] })[]>();

  return (data ?? []).map((row) => ({
    profile: mapDriverProfile(row),
    user: row.users,
    vehicleCount: row.vehicles?.length ?? 0,
  }));
}

export type DriverDetail = {
  profile: DriverProfile;
  user: UserLite | null;
  vehicles: Vehicle[];
};

export async function getDriverDetail(profileId: string): Promise<DriverDetail | null> {
  const supabase = await createClient();

  const { data: profileRow } = await supabase
    .from("driver_profiles")
    .select("*, users(id, full_name, email, phone_number)")
    .eq("id", profileId)
    .maybeSingle<DriverProfileRow & { users: UserLite | null }>();

  if (!profileRow) return null;

  const { data: vehicleRows } = await supabase
    .from("vehicles")
    .select("*")
    .eq("driver_id", profileId)
    .order("created_at", { ascending: false })
    .returns<VehicleRow[]>();

  return {
    profile: mapDriverProfile(profileRow),
    user: profileRow.users,
    vehicles: (vehicleRows ?? []).map(mapVehicle),
  };
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
export type SubscriptionListItem = {
  id: string;
  status: string;
  planType: string;
  amount: number;
  startDate: string | null;
  endDate: string | null;
  zoneName: string;
  vehicleLabel: string;
  driverName: string;
};

type SubscriptionListRow = {
  id: string;
  status: string;
  plan_type: string;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  zones: { name: string } | null;
  vehicles: {
    make: string;
    model: string;
    license_plate: string;
    driver_profiles: { users: UserLite | null } | null;
  } | null;
};

export async function getSubscriptions(): Promise<SubscriptionListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(
      "*, zones(name), vehicles(make, model, license_plate, driver_profiles(users(id, full_name, email, phone_number)))"
    )
    .order("created_at", { ascending: false })
    .returns<SubscriptionListRow[]>();

  return (data ?? []).map((row) => {
    const user = row.vehicles?.driver_profiles?.users ?? null;
    return {
      id: row.id,
      status: row.status,
      planType: row.plan_type,
      amount: Number(row.amount),
      startDate: row.start_date,
      endDate: row.end_date,
      zoneName: row.zones?.name ?? "Unknown zone",
      vehicleLabel: row.vehicles
        ? `${row.vehicles.make} ${row.vehicles.model} · ${row.vehicles.license_plate}`
        : "Vehicle",
      driverName: user?.full_name || user?.email || user?.phone_number || "Unknown driver",
    };
  });
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------
export type ZoneListItem = {
  id: string;
  name: string;
  description: string | null;
  monthlyFee: number;
  yearlyFee: number;
  polygon: [number, number][] | null;
  isActive: boolean;
};

type ZoneListRow = {
  id: string;
  name: string;
  description: string | null;
  monthly_fee: number;
  yearly_fee: number;
  polygon_coordinates: [number, number][] | null;
  is_active: boolean;
};

export async function getZonesAdmin(): Promise<ZoneListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("zones")
    .select("id, name, description, monthly_fee, yearly_fee, polygon_coordinates, is_active")
    .order("name")
    .returns<ZoneListRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    monthlyFee: Number(row.monthly_fee),
    yearlyFee: Number(row.yearly_fee),
    polygon: row.polygon_coordinates,
    isActive: row.is_active,
  }));
}

// ---------------------------------------------------------------------------
// Public pass verification (called by /verify/[id])
// ---------------------------------------------------------------------------
export type VerifyPassResult = {
  subscriptionId: string;
  status: "pending_payment" | "active" | "expired" | "cancelled";
  planType: "monthly" | "yearly";
  startDate: string | null;
  endDate: string | null;
  zone: { id: string; name: string };
  vehicle: { make: string; model: string; year: number; licensePlate: string };
  driver: { displayName: string };
  verifiedAt: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getVerifyPass(
  subscriptionId: string,
): Promise<VerifyPassResult | null> {
  if (!UUID_RE.test(subscriptionId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_pass", {
    p_subscription_id: subscriptionId,
  });
  if (error) {
    console.error("verify_pass RPC error", error);
    return null;
  }
  return (data as VerifyPassResult | null) ?? null;
}

// ---------------------------------------------------------------------------
// Offline pass token verification (signature-only check)
// ---------------------------------------------------------------------------
export type VerifyPassToken = {
  signatureValid: boolean;
  expired: boolean;
  payload: {
    sid: string;
    plate: string;
    zone: string;
    plan: "monthly" | "yearly";
    st: string | null;
    exp: string | null;
    iat: number;
  };
};

export async function verifyPassToken(token: string): Promise<VerifyPassToken | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_pass_token", { p_token: token });
  if (error) {
    console.error("verify_pass_token RPC error", error);
    return null;
  }
  return (data as VerifyPassToken | null) ?? null;
}

// ---------------------------------------------------------------------------
// Zone fleet summary (drives the compliance map)
// ---------------------------------------------------------------------------
export type ZoneFleetSummary = {
  id: string;
  name: string;
  description: string | null;
  monthlyFee: number;
  yearlyFee: number;
  polygon: [number, number][] | null;
  isActive: boolean;
  activeVehicleCount: number;
  activeSubscriptionCount: number;
};

type ZoneFleetRow = {
  id: string;
  name: string;
  description: string | null;
  monthly_fee: number;
  yearly_fee: number;
  polygon_coordinates: [number, number][] | null;
  is_active: boolean;
};

type ActiveSubRow = { zone_id: string; vehicle_id: string };

export async function getZoneFleetSummary(): Promise<ZoneFleetSummary[]> {
  const supabase = await createClient();
  const [zonesRes, subsRes] = await Promise.all([
    supabase
      .from("zones")
      .select(
        "id, name, description, monthly_fee, yearly_fee, polygon_coordinates, is_active",
      )
      .eq("is_active", true)
      .order("name")
      .returns<ZoneFleetRow[]>(),
    supabase
      .from("subscriptions")
      .select("zone_id, vehicle_id")
      .eq("status", "active")
      .returns<ActiveSubRow[]>(),
  ]);

  const subsByZone = new Map<string, { vehicles: Set<string>; subscriptions: number }>();
  for (const row of subsRes.data ?? []) {
    const entry = subsByZone.get(row.zone_id) ?? { vehicles: new Set(), subscriptions: 0 };
    entry.vehicles.add(row.vehicle_id);
    entry.subscriptions += 1;
    subsByZone.set(row.zone_id, entry);
  }

  return (zonesRes.data ?? []).map((z) => {
    const totals = subsByZone.get(z.id);
    return {
      id: z.id,
      name: z.name,
      description: z.description,
      monthlyFee: Number(z.monthly_fee),
      yearlyFee: Number(z.yearly_fee),
      polygon: z.polygon_coordinates,
      isActive: z.is_active,
      activeVehicleCount: totals?.vehicles.size ?? 0,
      activeSubscriptionCount: totals?.subscriptions ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// PlatformVerifications re-export so consumers can stay in this module.
// ---------------------------------------------------------------------------
export type { PlatformVerifications };
