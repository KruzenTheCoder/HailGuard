// HailGuard — demo accounts + linked data seed (all roles + Phase 7/8 data).
//
// Creates loginable Supabase auth accounts for every role and ties driver
// profiles, vehicles (with technical specs), subscriptions, incidents, shifts,
// reviewer recommendations, compliance logs and an attributed audit trail to
// them — so every feature is visibly populated when you sign in.
//
// Prereqs: run all SQL migrations + seed.sql first (zones must exist).
// Run:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed-accounts.mjs
// (or it reads admin/.env.local automatically)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const txt = readFileSync(join(here, "..", "admin", ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* optional */
  }
}
loadEnvLocal();

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const PASSWORD = "HailGuard#2026";
const isoDate = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => isoDate(new Date(Date.now() + n * 86_400_000));
const today = () => isoDate(new Date());

// ---- helpers --------------------------------------------------------------
async function getUserIdByEmail(email) {
  const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function ensureUser({ email, fullName, phone, role }) {
  let id = await getUserIdByEmail(email);
  if (!id) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      phone: phone || undefined,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    id = data.user.id;
  }
  await sb
    .from("users")
    .upsert({ id, email, full_name: fullName, phone_number: phone ?? null, role }, { onConflict: "id" });
  return id;
}

async function ensureProfile(userId, p) {
  const { data } = await sb
    .from("driver_profiles")
    .upsert({ user_id: userId, ...p }, { onConflict: "user_id" })
    .select("id")
    .single();
  return data.id;
}

async function ensureVehicle(driverId, v) {
  const { data } = await sb
    .from("vehicles")
    .upsert({ driver_id: driverId, ...v }, { onConflict: "driver_id,license_plate" })
    .select("id")
    .single();
  return data.id;
}

async function zoneByName(name) {
  const { data } = await sb
    .from("zones")
    .select("id, monthly_fee")
    .eq("name", name)
    .maybeSingle();
  return data;
}

async function ensureActiveSubscription(vehicleId, zoneName) {
  const zone = await zoneByName(zoneName);
  if (!zone) return;
  const { count } = await sb
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .eq("status", "active");
  if ((count ?? 0) > 0) return;
  const { data: sub, error } = await sb
    .from("subscriptions")
    .insert({
      vehicle_id: vehicleId,
      zone_id: zone.id,
      plan_type: "monthly",
      status: "active",
      amount: zone.monthly_fee,
      start_date: today(),
      end_date: addDays(20),
    })
    .select("id")
    .single();
  if (error) return; // e.g. capacity restriction trigger
  await sb.from("payments").insert({
    subscription_id: sub.id,
    provider: "stub",
    provider_reference: `SEED-${sub.id}`,
    amount: zone.monthly_fee,
    status: "succeeded",
  });
}

async function ensureRecommendation(entityType, entityId, recommendation, note, reviewerId) {
  await sb.from("application_recommendations").upsert(
    { entity_type: entityType, entity_id: entityId, recommendation, note, reviewer_id: reviewerId },
    { onConflict: "entity_type,entity_id" }
  );
}

async function ensureComplianceLog(driverId, vehicleId, actionType, performedBy, notes) {
  const { count } = await sb
    .from("compliance_logs")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", driverId)
    .eq("action_type", actionType);
  if ((count ?? 0) > 0) return;
  await sb
    .from("compliance_logs")
    .insert({ driver_id: driverId, vehicle_id: vehicleId, action_type: actionType, performed_by: performedBy, notes });
}

async function ensureAudit(actorId, actorRole, actionType, targetTable, targetId, detail) {
  const { count } = await sb
    .from("audit_trails")
    .select("*", { count: "exact", head: true })
    .eq("actor_id", actorId)
    .eq("action_type", actionType)
    .eq("target_id", targetId);
  if ((count ?? 0) > 0) return;
  await sb.from("audit_trails").insert({
    actor_id: actorId,
    actor_role: actorRole,
    action_type: actionType,
    target_table: targetTable,
    target_id: targetId,
    new_data: detail ?? {},
  });
}

async function ensureIncident(driverId, vehicleId, type, notes) {
  const { count } = await sb
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", driverId)
    .eq("incident_type", type);
  if ((count ?? 0) > 0) return;
  await sb.from("incidents").insert({ driver_id: driverId, vehicle_id: vehicleId, incident_type: type, notes });
}

async function ensureClosedShift(driverId, hours) {
  const { count } = await sb
    .from("driver_shifts")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", driverId);
  if ((count ?? 0) > 0) return;
  const start = new Date(Date.now() - (hours + 14) * 3_600_000);
  const end = new Date(start.getTime() + hours * 3_600_000);
  await sb
    .from("driver_shifts")
    .insert({ driver_id: driverId, start_time: start.toISOString(), end_time: end.toISOString() });
}

// ---------------------------------------------------------------------------
async function run() {
  const creds = [];

  // --- Staff (one per role) ---
  const staff = {};
  for (const [key, email, name, role] of [
    ["superAdmin", "super@hailguard.zone", "Sam Super", "super_admin"],
    ["compliance", "compliance@hailguard.zone", "Cathy Compliance", "compliance_admin"],
    ["reviewer", "reviewer@hailguard.zone", "Riaan Reviewer", "reviewer"],
    ["inspector", "inspector@hailguard.zone", "Ingrid Inspector", "inspector"],
    ["admin", "admin@hailguard.zone", "Hail Guard Admin", "admin"],
  ]) {
    staff[key] = await ensureUser({ email, fullName: name, role });
    creds.push([email, role]);
  }

  // Demo a capacity restriction: Johannesburg CBD caps at 4 passengers.
  await sb.from("zones").update({ max_passenger_capacity: 4 }).eq("name", "Johannesburg CBD");

  // --- Driver 1: fully compliant (approved, active vehicle + pass) ---
  let uid = await ensureUser({ email: "thabo@example.com", fullName: "Thabo Mokoena", phone: "+27821110001", role: "driver" });
  let pid = await ensureProfile(uid, {
    id_number: "8801015800081", license_number: "MOK001", status: "approved",
    prdp_number: "PRDP-1001", prdp_expires_at: addDays(120), prdp_status: "verified",
    platform_verifications: { uber: { status: "approved" }, bolt: { status: "approved" } },
  });
  let vid = await ensureVehicle(pid, {
    make: "Toyota", model: "Corolla", year: 2021, license_plate: "CA 111 001", status: "active",
    vin_number: "AHTBZ29G706012345", engine_number: "2ZR1234567", passenger_capacity: 5,
    vehicle_category: "Sedan", roadworthy_expires_at: addDays(80),
  });
  await ensureActiveSubscription(vid, "Sandton");
  await ensureClosedShift(pid, 8);
  await ensureRecommendation("driver_profile", pid, "approve", "Documents in order.", staff.reviewer);
  await ensureComplianceLog(pid, vid, "document_verified", staff.compliance, "PrDP & licence verified.");
  await ensureAudit(staff.reviewer, "reviewer", "driver_profile.recommend.approve", "driver_profile", pid, { note: "Documents in order." });
  await ensureAudit(staff.compliance, "compliance_admin", "driver_profile.approve", "driver_profile", pid, {});
  await ensureAudit(staff.compliance, "compliance_admin", "vehicle.approve", "vehicle", vid, {});
  creds.push(["thabo@example.com", "driver — compliant"]);

  // --- Driver 2: pending application with a reviewer recommendation ---
  uid = await ensureUser({ email: "lerato@example.com", fullName: "Lerato Dlamini", phone: "+27821110002", role: "driver" });
  pid = await ensureProfile(uid, {
    id_number: "9203026700082", license_number: "DLA002", status: "pending",
    prdp_number: "PRDP-1002", prdp_expires_at: addDays(60), prdp_status: "pending",
    platform_verifications: { uber: { status: "pending" } },
  });
  vid = await ensureVehicle(pid, {
    make: "Volkswagen", model: "Polo", year: 2020, license_plate: "CA 222 002", status: "pending",
    vin_number: "WVWZZZ6RZLY000222", engine_number: "CHZ222222", passenger_capacity: 5,
    vehicle_category: "Hatchback", roadworthy_expires_at: addDays(40),
  });
  await ensureRecommendation("driver_profile", pid, "approve", "ID & licence valid; recommend approval.", staff.reviewer);
  await ensureRecommendation("vehicle", vid, "approve", "Roadworthy current.", staff.reviewer);
  await ensureAudit(staff.reviewer, "reviewer", "driver_profile.recommend.approve", "driver_profile", pid, {});
  creds.push(["lerato@example.com", "driver — pending + recommended"]);

  // --- Driver 3: approved, vehicle pending, PrDP expiring ---
  uid = await ensureUser({ email: "naledi@example.com", fullName: "Naledi Khumalo", phone: "+27821110003", role: "driver" });
  pid = await ensureProfile(uid, {
    id_number: "9508124800083", license_number: "KHU003", status: "approved",
    prdp_number: "PRDP-1003", prdp_expires_at: addDays(8), prdp_status: "verified",
    platform_verifications: { indrive: { status: "approved" } },
  });
  await ensureVehicle(pid, {
    make: "Toyota", model: "Avanza", year: 2019, license_plate: "CA 333 003", status: "pending",
    vin_number: "MHFM1BA3J0K033303", engine_number: "K3VE333333", passenger_capacity: 7,
    vehicle_category: "7-Seater/MPV", roadworthy_expires_at: addDays(5),
  });
  creds.push(["naledi@example.com", "driver — vehicle pending, PrDP expiring"]);

  // --- Driver 4: active + open SOS + inspector-reported violation ---
  uid = await ensureUser({ email: "sipho@example.com", fullName: "Sipho Nene", phone: "+27821110004", role: "driver" });
  pid = await ensureProfile(uid, {
    id_number: "8709155900084", license_number: "NEN004", status: "approved",
    prdp_number: "PRDP-1004", prdp_expires_at: addDays(200), prdp_status: "verified",
    platform_verifications: { uber: { status: "approved" }, bolt: { status: "approved" }, indrive: { status: "approved" } },
  });
  vid = await ensureVehicle(pid, {
    make: "Suzuki", model: "Swift", year: 2022, license_plate: "CA 444 004", status: "active",
    vin_number: "MA3FB32S0N0044404", engine_number: "K12M444444", passenger_capacity: 5,
    vehicle_category: "Hatchback", roadworthy_expires_at: addDays(150),
  });
  await ensureActiveSubscription(vid, "Cape Town CBD");
  await ensureIncident(pid, vid, "sos_triggered", "Driver-triggered panic alert.");
  await ensureIncident(pid, vid, "compliance_violation", "Operating outside subscribed zone — field report.");
  await ensureAudit(staff.inspector, "inspector", "incidents.insert", "incidents", pid, { type: "compliance_violation" });
  creds.push(["sipho@example.com", "driver — active + SOS + violation"]);

  // --- Driver 5: minibus blocked from a capacity-restricted zone ---
  uid = await ensureUser({ email: "themba@example.com", fullName: "Themba Zulu", phone: "+27821110005", role: "driver" });
  pid = await ensureProfile(uid, {
    id_number: "9001015900085", license_number: "ZUL005", status: "approved",
    prdp_number: "PRDP-1005", prdp_expires_at: addDays(300), prdp_status: "verified",
    platform_verifications: { bolt: { status: "approved" } },
  });
  vid = await ensureVehicle(pid, {
    make: "Toyota", model: "Quantum", year: 2021, license_plate: "CA 555 005", status: "active",
    vin_number: "JTFSX22P1M0055505", engine_number: "2TR555555", passenger_capacity: 15,
    vehicle_category: "Minibus", roadworthy_expires_at: addDays(95),
  });
  // Eligible for a high-capacity zone; CBD (cap 4) would be blocked by the trigger.
  await ensureActiveSubscription(vid, "Soweto");
  creds.push(["themba@example.com", "driver — minibus (capacity-restricted)"]);

  console.log("\nSeeded accounts — password for all: " + PASSWORD + "\n");
  for (const [email, role] of creds) console.log(`  ${email.padEnd(30)} ${role}`);
  console.log("\nStaff sign in at the web portal; drivers/inspector use the mobile apps.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
