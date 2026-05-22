"use server";

import { revalidatePath } from "next/cache";

import type { UserRole } from "@hailguard/shared";

import {
  sendCertificate,
  sendComplianceUpdate,
  sendExpiryReminder,
  sendIncidentResolved,
  sendWelcome,
} from "@/lib/email/send";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const STAFF_ROLES: UserRole[] = ["admin", "super_admin", "compliance_admin", "reviewer"];

/** Authenticated backoffice staff (any portal role). */
async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) {
    throw new Error("Unauthorized");
  }
  return user;
}

/** Staff member who additionally holds a specific UAC permission. */
async function assertPermission(perm: string) {
  const user = await assertAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", { p_key: perm });
  if (error || data !== true) {
    throw new Error("You do not have permission to perform this action.");
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
  const admin = await assertPermission("application:approve");
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
  const admin = await assertPermission("application:approve");
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
  const admin = await assertPermission("application:approve");
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
  const admin = await assertPermission("application:approve");
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
  const admin = await assertPermission("application:approve");
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
  const admin = await assertPermission("subscription:write");
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
  const admin = await assertPermission("zone:write");
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
  const admin = await assertPermission("zone:write");
  const supabase = await createClient();
  const { error } = await supabase.from("zones").update({ is_active: isActive }).eq("id", zoneId);
  if (error) throw new Error(error.message);

  await writeAudit(admin.id, "zone.set_active", "zone", zoneId, { isActive });
  revalidateAdmin();
}

export async function deleteZone(zoneId: string) {
  const admin = await assertPermission("zone:write");
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
  const admin = await assertPermission("incident:manage");
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

  if (status === "resolved") {
    const { data } = await supabase
      .from("incidents")
      .select("incident_type, driver_profiles(users(email, full_name))")
      .eq("id", incidentId)
      .maybeSingle<{
        incident_type: string;
        driver_profiles: { users: { email: string | null; full_name: string | null } | null } | null;
      }>();
    const u = data?.driver_profiles?.users;
    if (u?.email) {
      await sendIncidentResolved(u.email, {
        fullName: u.full_name ?? "",
        type: data!.incident_type,
      });
    }
  }

  await writeAudit(admin.id, `incident.${status}`, "incident", incidentId, {});
  revalidateAdmin();
}

/** Auto-suspend expired roadworthy + expire lapsed subscriptions. */
export async function runComplianceSweep() {
  await assertPermission("compliance:revoke");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_compliance_sweep");
  if (error) throw new Error(error.message);
  revalidateAdmin();
  return data as { vehiclesSuspended: number; subscriptionsExpired: number };
}

/** One-click: cancel active subscriptions + suspend active vehicles for a driver. */
export async function revokeCompliance(driverId: string) {
  await assertPermission("compliance:revoke");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revoke_compliance", { p_driver_id: driverId });
  if (error) throw new Error(error.message);

  const { data: prof } = await supabase
    .from("driver_profiles")
    .select("users(email, full_name)")
    .eq("id", driverId)
    .maybeSingle<{ users: { email: string | null; full_name: string | null } | null }>();
  if (prof?.users?.email) {
    await sendComplianceUpdate(prof.users.email, {
      fullName: prof.users.full_name ?? "",
      reason:
        "Your HailGuard compliance has been revoked. Active zone passes were cancelled and your vehicle(s) suspended. Contact operations to reinstate.",
    });
  }

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
  const me = await assertPermission("user:write");
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
  await sendWelcome(email, { fullName: input.fullName.trim(), role: input.role });
  revalidateAdmin();
}

export async function setUserRole(userId: string, role: UserRole) {
  const me = await assertPermission("user:write");
  if (userId === me.id && !STAFF_ROLES.includes(role)) {
    throw new Error("You can't remove your own portal access.");
  }
  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  await writeAudit(me.id, "user.set_role", "user", userId, { role });
  revalidateAdmin();
}

export async function deletePortalUser(userId: string) {
  const me = await assertPermission("user:write");
  if (userId === me.id) throw new Error("You can't delete your own account.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  await writeAudit(me.id, "user.delete", "user", userId, {});
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Email actions (Resend) — themed driver communications
// ---------------------------------------------------------------------------
export async function emailCertificate(subscriptionId: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("end_date, zones(name), vehicles(license_plate, driver_profiles(users(email, full_name)))")
    .eq("id", subscriptionId)
    .maybeSingle<{
      end_date: string | null;
      zones: { name: string } | null;
      vehicles: {
        license_plate: string;
        driver_profiles: { users: { email: string | null; full_name: string | null } | null } | null;
      } | null;
    }>();

  const u = data?.vehicles?.driver_profiles?.users;
  if (!u?.email) throw new Error("Driver has no email address on file.");

  const ok = await sendCertificate(u.email, {
    fullName: u.full_name ?? "",
    zone: data?.zones?.name ?? "Zone",
    plate: data?.vehicles?.license_plate ?? "",
    validUntil: data?.end_date ?? "—",
    subscriptionId,
  });
  if (!ok) throw new Error("Email could not be sent (is RESEND_API_KEY configured?).");
}

const DAY_MS = 86_400_000;

/** Email every driver with a compliance document expiring within 30 days. */
export async function emailExpiryReminders() {
  await assertAdmin();
  const supabase = await createClient();
  const now = Date.now();
  const cutoff = new Date(now + 30 * DAY_MS).toISOString().slice(0, 10);

  type Lite = { email: string | null; full_name: string | null };
  const buckets = new Map<string, { fullName: string; items: { label: string; date: string; daysLeft: number }[] }>();
  const add = (u: Lite | null | undefined, label: string, date: string | null) => {
    if (!u?.email || !date) return;
    const daysLeft = Math.ceil((Date.parse(date) - now) / DAY_MS);
    const b = buckets.get(u.email) ?? { fullName: u.full_name ?? "", items: [] };
    b.items.push({ label, date, daysLeft });
    buckets.set(u.email, b);
  };

  const [profiles, vehicles] = await Promise.all([
    supabase
      .from("driver_profiles")
      .select("prdp_expires_at, users(email, full_name)")
      .not("prdp_expires_at", "is", null)
      .lte("prdp_expires_at", cutoff)
      .returns<{ prdp_expires_at: string; users: Lite | null }[]>(),
    supabase
      .from("vehicles")
      .select("roadworthy_expires_at, license_plate, driver_profiles(users(email, full_name))")
      .eq("status", "active")
      .not("roadworthy_expires_at", "is", null)
      .lte("roadworthy_expires_at", cutoff)
      .returns<
        {
          roadworthy_expires_at: string;
          license_plate: string;
          driver_profiles: { users: Lite | null } | null;
        }[]
      >(),
  ]);

  for (const p of profiles.data ?? []) add(p.users, "Professional Driving Permit", p.prdp_expires_at);
  for (const v of vehicles.data ?? [])
    add(v.driver_profiles?.users, `Roadworthy — ${v.license_plate}`, v.roadworthy_expires_at);

  let sent = 0;
  for (const [email, b] of buckets) {
    if (await sendExpiryReminder(email, b)) sent += 1;
  }
  return { recipients: buckets.size, sent };
}

// ---------------------------------------------------------------------------
// Reviewer recommendation pipeline (non-binding; final call = application:approve)
// ---------------------------------------------------------------------------
async function recommend(
  entityType: "driver_profile" | "vehicle",
  entityId: string,
  recommendation: "approve" | "reject",
  note: string
) {
  const me = await assertPermission("application:review");
  const supabase = await createClient();
  const { error } = await supabase.from("application_recommendations").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      recommendation,
      note: note.trim() || null,
      reviewer_id: me.id,
    },
    { onConflict: "entity_type,entity_id" }
  );
  if (error) throw new Error(error.message);
  await writeAudit(me.id, `${entityType}.recommend.${recommendation}`, entityType, entityId, {
    note: note.trim(),
  });
  revalidateAdmin();
}

export async function recommendProfile(
  profileId: string,
  recommendation: "approve" | "reject",
  note: string
) {
  await recommend("driver_profile", profileId, recommendation, note);
}

export async function recommendVehicle(
  vehicleId: string,
  recommendation: "approve" | "reject",
  note: string
) {
  await recommend("vehicle", vehicleId, recommendation, note);
}
