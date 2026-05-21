"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
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
  entityType: "driver_profile" | "vehicle" | "subscription" | "zone",
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
  monthlyFee: number;
  yearlyFee: number;
};

export async function createZone(input: CreateZoneInput) {
  const admin = await assertAdmin();
  if (!input.name.trim()) throw new Error("Zone name is required.");
  if (input.monthlyFee < 0 || input.yearlyFee < 0) throw new Error("Fees cannot be negative.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("zones")
    .insert({
      name: input.name.trim(),
      description: input.description.trim() || null,
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
