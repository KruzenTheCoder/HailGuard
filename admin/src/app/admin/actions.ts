"use server";

import { revalidatePath } from "next/cache";

import type { UserRole } from "@hailguard/shared";

import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return user;
}

async function writeAudit(
  actorId: string,
  action: string,
  entityType: "driver_profile" | "vehicle" | "subscription" | "zone" | "incident" | "user",
  entityId: string | null,
  detail: Record<string, unknown>
) {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    detail,
  });
}

function revalidateAdmin() {
  // Revalidate the whole admin subtree so queues, lists and detail refresh.
  revalidatePath("/admin", "layout");
}

export async function approveProfile(profileId: string) {
  const admin = await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("driver_profiles")
    .update({ status: "approved", review_note: null })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "profile.approve", "driver_profile", profileId, {});
  revalidateAdmin();
}

export async function rejectProfile(profileId: string, note: string) {
  const admin = await assertAdmin();
  if (!note.trim()) throw new Error("A rejection reason is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("driver_profiles")
    .update({ status: "rejected", review_note: note.trim() })
    .eq("id", profileId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "profile.reject", "driver_profile", profileId, { note: note.trim() });
  revalidateAdmin();
}

export async function approveVehicle(vehicleId: string) {
  const admin = await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({ status: "active", review_note: null })
    .eq("id", vehicleId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "vehicle.approve", "vehicle", vehicleId, {});
  revalidateAdmin();
}

export async function rejectVehicle(vehicleId: string, note: string) {
  const admin = await assertAdmin();
  if (!note.trim()) throw new Error("A rejection reason is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({ status: "rejected", review_note: note.trim() })
    .eq("id", vehicleId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "vehicle.reject", "vehicle", vehicleId, { note: note.trim() });
  revalidateAdmin();
}

export async function suspendVehicle(vehicleId: string, note: string) {
  const admin = await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({ status: "suspended", review_note: note.trim() || null })
    .eq("id", vehicleId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "vehicle.suspend", "vehicle", vehicleId, { note: note.trim() });
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
export async function cancelSubscription(subscriptionId: string) {
  const admin = await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", subscriptionId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "subscription.cancel", "subscription", subscriptionId, {});
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------
export type CreateZoneInput = {
  name: string;
  description: string;
  province: string;
  monthlyFee: number;
  yearlyFee: number;
};

export async function createZone(input: CreateZoneInput) {
  const admin = await assertAdmin();
  if (!input.name.trim()) throw new Error("Zone name is required.");
  if (!input.province.trim()) throw new Error("Province is required.");
  if (input.monthlyFee < 0 || input.yearlyFee < 0) throw new Error("Fees cannot be negative.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("zones")
    .insert({
      name: input.name.trim(),
      description: input.description.trim() || null,
      province: input.province.trim(),
      monthly_fee: input.monthlyFee,
      yearly_fee: input.yearlyFee,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "zone.create", "zone", data.id, { name: input.name.trim() });
  revalidateAdmin();
}

export async function setZoneActive(zoneId: string, isActive: boolean) {
  const admin = await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("zones").update({ is_active: isActive }).eq("id", zoneId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "zone.set_active", "zone", zoneId, { isActive });
  revalidateAdmin();
}

export async function deleteZone(zoneId: string) {
  const admin = await assertAdmin();
  const supabase = await createClient();

  // A zone with subscriptions can't be hard-deleted (FK is ON DELETE RESTRICT);
  // guide the admin to deactivate instead.
  const { count } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("zone_id", zoneId);
  if ((count ?? 0) > 0) {
    throw new Error(
      `This zone has ${count} subscription(s) and can't be deleted. Deactivate it instead to stop new sign-ups.`
    );
  }

  const { error } = await supabase.from("zones").delete().eq("id", zoneId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "zone.delete", "zone", zoneId, {});
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Phase 7 — incidents, suspension engine, revoke compliance
// ---------------------------------------------------------------------------
export async function setIncidentStatus(
  incidentId: string,
  status: "open" | "under_investigation" | "resolved",
  resolutionNotes?: string
) {
  const admin = await assertAdmin();
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "resolved") {
    patch.resolved_by = admin.id;
    patch.resolved_at = new Date().toISOString();
    if (resolutionNotes !== undefined) patch.resolution_notes = resolutionNotes.trim() || null;
  } else if (resolutionNotes !== undefined) {
    patch.resolution_notes = resolutionNotes.trim() || null;
  }
  const { error } = await supabase.from("incidents").update(patch).eq("id", incidentId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, `incident.${status}`, "incident", incidentId, {});
  revalidateAdmin();
}

/** Auto-suspend expired roadworthy + expire lapsed subscriptions. */
export async function runComplianceSweep() {
  await assertAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_compliance_sweep");
  if (error) throw new Error(error.message);
  revalidateAdmin();
  return data as { vehiclesSuspended: number; subscriptionsExpired: number };
}

/** One-click: cancel active subscriptions + suspend active vehicles for a driver. */
export async function revokeCompliance(driverId: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revoke_compliance", { p_driver_id: driverId });
  if (error) throw new Error(error.message);
  revalidateAdmin();
  return data as { subscriptionsCancelled: number; vehiclesSuspended: number };
}

// ---------------------------------------------------------------------------
// Portal user management (service-role admin API)
// ---------------------------------------------------------------------------
export type CreatePortalUserInput = {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
};

export async function createPortalUser(input: CreatePortalUserInput) {
  const me = await assertAdmin();
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email is required.");
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() },
  });
  if (error) throw new Error(error.message);
  const userId = data.user?.id;
  if (!userId) throw new Error("User creation failed.");

  // handle_new_user inserts public.users (role driver); set the chosen role.
  const { error: upErr } = await admin
    .from("users")
    .upsert(
      { id: userId, email, full_name: input.fullName.trim() || null, role: input.role },
      { onConflict: "id" }
    );
  if (upErr) throw new Error(upErr.message);

  await writeAudit(me.id, "user.create", "user", userId, { email, role: input.role });
  revalidateAdmin();
}

export async function setUserRole(userId: string, role: UserRole) {
  const me = await assertAdmin();
  if (userId === me.id && role !== "admin") {
    throw new Error("You can't remove your own admin access.");
  }
  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  await writeAudit(me.id, "user.set_role", "user", userId, { role });
  revalidateAdmin();
}

export async function deletePortalUser(userId: string) {
  const me = await assertAdmin();
  if (userId === me.id) throw new Error("You can't delete your own account.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  await writeAudit(me.id, "user.delete", "user", userId, {});
  revalidateAdmin();
}
