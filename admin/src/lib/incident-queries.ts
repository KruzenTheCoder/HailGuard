import type { IncidentStatus, IncidentType } from "@hailguard/shared";

import type { UserLite } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";

export type IncidentListItem = {
  id: string;
  driverId: string;
  incidentType: IncidentType;
  status: IncidentStatus;
  notes: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  driverName: string;
  vehicleLabel: string | null;
};

type IncidentRow = {
  id: string;
  driver_id: string;
  incident_type: IncidentType;
  status: IncidentStatus;
  notes: string | null;
  resolution_notes: string | null;
  created_at: string;
  driver_profiles: { users: UserLite | null } | null;
  vehicles: { make: string; model: string; license_plate: string } | null;
};

export async function getIncidents(): Promise<IncidentListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("incidents")
    .select(
      "id, driver_id, incident_type, status, notes, resolution_notes, created_at, driver_profiles(users(id, full_name, email, phone_number)), vehicles(make, model, license_plate)"
    )
    .order("created_at", { ascending: false })
    .returns<IncidentRow[]>();

  return (data ?? []).map((row) => {
    const u = row.driver_profiles?.users ?? null;
    return {
      id: row.id,
      driverId: row.driver_id,
      incidentType: row.incident_type,
      status: row.status,
      notes: row.notes,
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
      driverName: u?.full_name || u?.email || u?.phone_number || "Unknown driver",
      vehicleLabel: row.vehicles
        ? `${row.vehicles.make} ${row.vehicles.model} · ${row.vehicles.license_plate}`
        : null,
    };
  });
}

export type ComplianceLogItem = {
  id: string;
  actionType: string;
  notes: string | null;
  createdAt: string;
  system: boolean;
};

export async function getDriverComplianceLogs(driverId: string): Promise<ComplianceLogItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compliance_logs")
    .select("id, action_type, notes, performed_by, created_at")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<
      { id: string; action_type: string; notes: string | null; performed_by: string | null; created_at: string }[]
    >();

  return (data ?? []).map((r) => ({
    id: r.id,
    actionType: r.action_type,
    notes: r.notes,
    createdAt: r.created_at,
    system: r.performed_by === null,
  }));
}
