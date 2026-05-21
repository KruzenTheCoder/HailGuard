import type { IncidentType } from "@hailguard/shared";

import { createClient } from "@/lib/supabase/server";

const WINDOW_DAYS = 30;
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MAX_SHIFT_HOURS = 12;

export type OperationsAnalytics = {
  incidents: {
    total: number;
    open: number;
    byType: { type: IncidentType; label: string; count: number }[];
    series30: number[];
  };
  expiry: {
    roadworthyExpiring: number;
    roadworthyExpired: number;
    prdpExpiring: number;
    prdpExpired: number;
    passExpiring: number;
    passExpired: number;
  };
  shifts: { activeNow: number; overLimitNow: number };
  zoneDensity: { name: string; activeVehicles: number }[];
};

const TYPE_LABEL: Record<IncidentType, string> = {
  sos_triggered: "SOS / Panic",
  passenger_dispute: "Passenger dispute",
  accident: "Accident",
  compliance_violation: "Compliance violation",
};

/** expiring = due within 30 days; expired = past. */
function classify(date: string | null, now: number) {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  if (t < now) return "expired" as const;
  if (t <= now + WINDOW_DAYS * DAY) return "expiring" as const;
  return "valid" as const;
}

export async function getOperationsAnalytics(): Promise<OperationsAnalytics> {
  const supabase = await createClient();
  const now = Date.now();

  const [incidentsRes, vehiclesRes, profilesRes, subsRes, shiftsRes] = await Promise.all([
    supabase
      .from("incidents")
      .select("incident_type, status, created_at")
      .returns<{ incident_type: IncidentType; status: string; created_at: string }[]>(),
    supabase
      .from("vehicles")
      .select("roadworthy_expires_at, status")
      .eq("status", "active")
      .returns<{ roadworthy_expires_at: string | null; status: string }[]>(),
    supabase
      .from("driver_profiles")
      .select("prdp_expires_at")
      .returns<{ prdp_expires_at: string | null }[]>(),
    supabase
      .from("subscriptions")
      .select("end_date, vehicle_id, status, zones(name)")
      .eq("status", "active")
      .returns<{ end_date: string | null; vehicle_id: string; status: string; zones: { name: string } | null }[]>(),
    supabase
      .from("driver_shifts")
      .select("start_time")
      .is("end_time", null)
      .returns<{ start_time: string }[]>(),
  ]);

  // --- incidents ---
  const incidents = incidentsRes.data ?? [];
  const byTypeMap = new Map<IncidentType, number>();
  const series30 = new Array(WINDOW_DAYS).fill(0) as number[];
  const startMs = now - (WINDOW_DAYS - 1) * DAY;
  for (const i of incidents) {
    byTypeMap.set(i.incident_type, (byTypeMap.get(i.incident_type) ?? 0) + 1);
    const t = Date.parse(i.created_at);
    if (!Number.isNaN(t) && t >= startMs - DAY) {
      const idx = Math.floor((t - startMs) / DAY);
      if (idx >= 0 && idx < WINDOW_DAYS) series30[idx] += 1;
    }
  }

  // --- expiry risk ---
  let rwExpiring = 0,
    rwExpired = 0,
    prdpExpiring = 0,
    prdpExpired = 0,
    passExpiring = 0,
    passExpired = 0;
  for (const v of vehiclesRes.data ?? []) {
    const c = classify(v.roadworthy_expires_at, now);
    if (c === "expiring") rwExpiring++;
    else if (c === "expired") rwExpired++;
  }
  for (const p of profilesRes.data ?? []) {
    const c = classify(p.prdp_expires_at, now);
    if (c === "expiring") prdpExpiring++;
    else if (c === "expired") prdpExpired++;
  }
  const zoneVehicles = new Map<string, Set<string>>();
  for (const s of subsRes.data ?? []) {
    const c = classify(s.end_date, now);
    if (c === "expiring") passExpiring++;
    else if (c === "expired") passExpired++;
    const zone = s.zones?.name ?? "Unknown";
    if (!zoneVehicles.has(zone)) zoneVehicles.set(zone, new Set());
    zoneVehicles.get(zone)!.add(s.vehicle_id);
  }

  // --- shifts ---
  const openShifts = shiftsRes.data ?? [];
  const overLimitNow = openShifts.filter(
    (s) => (now - Date.parse(s.start_time)) / HOUR > MAX_SHIFT_HOURS
  ).length;

  return {
    incidents: {
      total: incidents.length,
      open: incidents.filter((i) => i.status !== "resolved").length,
      byType: (Object.keys(TYPE_LABEL) as IncidentType[]).map((type) => ({
        type,
        label: TYPE_LABEL[type],
        count: byTypeMap.get(type) ?? 0,
      })),
      series30,
    },
    expiry: {
      roadworthyExpiring: rwExpiring,
      roadworthyExpired: rwExpired,
      prdpExpiring,
      prdpExpired,
      passExpiring,
      passExpired,
    },
    shifts: { activeNow: openShifts.length, overLimitNow },
    zoneDensity: [...zoneVehicles.entries()]
      .map(([name, set]) => ({ name, activeVehicles: set.size }))
      .sort((a, b) => b.activeVehicles - a.activeVehicles),
  };
}
