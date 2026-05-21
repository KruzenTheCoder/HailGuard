import type { DriverProfile, Vehicle } from "@hailguard/shared";

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

export type DashboardMetrics = {
  activeDrivers: number;
  pendingApplications: number;
  revenueCollected: number;
  activeZones: number;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient();

  const [activeDrivers, pendingProfiles, pendingVehicles, activeZones, payments] =
    await Promise.all([
      supabase
        .from("driver_profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("driver_profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("zones").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("payments").select("amount").eq("status", "succeeded").returns<{ amount: number }[]>(),
    ]);

  const revenue = (payments.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    activeDrivers: activeDrivers.count ?? 0,
    pendingApplications: (pendingProfiles.count ?? 0) + (pendingVehicles.count ?? 0),
    revenueCollected: revenue,
    activeZones: activeZones.count ?? 0,
  };
}

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
  currency: string;
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
  currency: string;
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
      currency: row.currency,
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
  currency: string;
  isActive: boolean;
};

type ZoneListRow = {
  id: string;
  name: string;
  description: string | null;
  monthly_fee: number;
  yearly_fee: number;
  currency: string;
  is_active: boolean;
};

export async function getZonesAdmin(): Promise<ZoneListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("zones")
    .select("id, name, description, monthly_fee, yearly_fee, currency, is_active")
    .order("name")
    .returns<ZoneListRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    monthlyFee: Number(row.monthly_fee),
    yearlyFee: Number(row.yearly_fee),
    currency: row.currency,
    isActive: row.is_active,
  }));
}
