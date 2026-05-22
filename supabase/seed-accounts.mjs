// HailGuard — demo accounts + linked data seed.
//
// Creates real, loginable Supabase auth accounts (email + password) and ties
// driver profiles, vehicles, applications, subscriptions, incidents and shifts
// to them. Idempotent: re-running skips existing users and guarded inserts.
//
// Prereqs: run the SQL migrations + seed.sql first (zones must exist).
// Run:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed-accounts.mjs
// (or it will read admin/.env.local automatically if present)

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
const today = () => new Date();
const isoDate = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => isoDate(new Date(Date.now() + n * 86_400_000));

// ---- helpers --------------------------------------------------------------
async function getUserIdByEmail(email) {
  // listUsers is paginated; demo data is small so one page suffices.
  const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function ensureUser({ email, password, fullName, phone, role }) {
  let id = await getUserIdByEmail(email);
  if (!id) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone: phone || undefined,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    id = data.user.id;
  }
  await sb.from("users").upsert(
    { id, email, full_name: fullName, phone_number: phone ?? null, role },
    { onConflict: "id" }
  );
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

async function zoneIdByName(name) {
  const { data } = await sb.from("zones").select("id, monthly_fee").eq("name", name).maybeSingle();
  return data;
}

async function ensureActiveSubscription(vehicleId, zoneName) {
  const zone = await zoneIdByName(zoneName);
  if (!zone) return;
  const { count } = await sb
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .eq("status", "active");
  if ((count ?? 0) > 0) return;
  const { data: sub } = await sb
    .from("subscriptions")
    .insert({
      vehicle_id: vehicleId,
      zone_id: zone.id,
      plan_type: "monthly",
      status: "active",
      amount: zone.monthly_fee,
      start_date: isoDate(today()),
      end_date: addDays(20),
    })
    .select("id")
    .single();
  await sb.from("payments").insert({
    subscription_id: sub.id,
    provider: "stub",
    provider_reference: `SEED-${sub.id}`,
    amount: zone.monthly_fee,
    status: "succeeded",
  });
}

async function ensureIncident(driverId, vehicleId, type) {
  const { count } = await sb
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .eq("driver_id", driverId)
    .eq("incident_type", type);
  if ((count ?? 0) > 0) return;
  await sb.from("incidents").insert({
    driver_id: driverId,
    vehicle_id: vehicleId,
    incident_type: type,
    notes: "Seeded demo incident.",
  });
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

// ---- personas -------------------------------------------------------------
async function run() {
  const created = [];

  // Admin
  await ensureUser({
    email: "admin@hailguard.zone",
    password: PASSWORD,
    fullName: "Hail Guard Admin",
    role: "admin",
  });
  created.push(["admin@hailguard.zone", PASSWORD, "admin"]);

  // 1. Fully compliant driver (approved, active vehicle, active pass)
  let uid = await ensureUser({
    email: "thabo@example.com", password: PASSWORD, fullName: "Thabo Mokoena",
    phone: "+27821110001", role: "driver",
  });
  let pid = await ensureProfile(uid, {
    id_number: "8801015800081", license_number: "MOK001", status: "approved",
    id_document_path: null, license_document_path: null,
    prdp_number: "PRDP-1001", prdp_expires_at: addDays(120),
    platform_verifications: { uber: { status: "approved" }, bolt: { status: "approved" } },
  });
  let vid = await ensureVehicle(pid, {
    make: "Toyota", model: "Corolla", year: 2021, license_plate: "CA 111 001",
    status: "active", roadworthy_expires_at: addDays(80),
  });
  await ensureActiveSubscription(vid, "Sandton");
  await ensureClosedShift(pid, 8);
  created.push(["thabo@example.com", PASSWORD, "driver — compliant"]);

  // 2. Pending application (profile under review)
  uid = await ensureUser({
    email: "lerato@example.com", password: PASSWORD, fullName: "Lerato Dlamini",
    phone: "+27821110002", role: "driver",
  });
  pid = await ensureProfile(uid, {
    id_number: "9203026700082", license_number: "DLA002", status: "pending",
    prdp_number: "PRDP-1002", prdp_expires_at: addDays(15),
    platform_verifications: { uber: { status: "pending" } },
  });
  await ensureVehicle(pid, {
    make: "Volkswagen", model: "Polo", year: 2020, license_plate: "CA 222 002",
    status: "pending", roadworthy_expires_at: addDays(40),
  });
  created.push(["lerato@example.com", PASSWORD, "driver — pending application"]);

  // 3. Approved driver, vehicle awaiting review + expiring roadworthy
  uid = await ensureUser({
    email: "naledi@example.com", password: PASSWORD, fullName: "Naledi Khumalo",
    phone: "+27821110003", role: "driver",
  });
  pid = await ensureProfile(uid, {
    id_number: "9508124800083", license_number: "KHU003", status: "approved",
    prdp_number: "PRDP-1003", prdp_expires_at: addDays(8),
    platform_verifications: { indrive: { status: "approved" } },
  });
  await ensureVehicle(pid, {
    make: "Hyundai", model: "i20", year: 2019, license_plate: "CA 333 003",
    status: "pending", roadworthy_expires_at: addDays(5),
  });
  created.push(["naledi@example.com", PASSWORD, "driver — vehicle pending, docs expiring"]);

  // 4. Driver with active pass + an open SOS incident
  uid = await ensureUser({
    email: "sipho@example.com", password: PASSWORD, fullName: "Sipho Nene",
    phone: "+27821110004", role: "driver",
  });
  pid = await ensureProfile(uid, {
    id_number: "8709155900084", license_number: "NEN004", status: "approved",
    prdp_number: "PRDP-1004", prdp_expires_at: addDays(200),
    platform_verifications: { uber: { status: "approved" }, bolt: { status: "approved" }, indrive: { status: "approved" } },
  });
  vid = await ensureVehicle(pid, {
    make: "Suzuki", model: "Swift", year: 2022, license_plate: "CA 444 004",
    status: "active", roadworthy_expires_at: addDays(150),
  });
  await ensureActiveSubscription(vid, "Cape Town CBD");
  await ensureIncident(pid, vid, "sos_triggered");
  created.push(["sipho@example.com", PASSWORD, "driver — active pass + open SOS"]);

  console.log("\nSeeded accounts (email / password / role):");
  for (const [e, p, r] of created) console.log(`  ${e}  ${p}  — ${r}`);
  console.log("\nPromote/manage further via /admin/team. Done.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
