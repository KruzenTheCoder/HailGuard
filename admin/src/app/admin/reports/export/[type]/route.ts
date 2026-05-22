import { STAFF_ROLES } from "@hailguard/shared";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Cell = string | number | null | undefined;

function toCsv(headers: string[], rows: Cell[][]): string {
  const esc = (v: Cell) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { type } = await params;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  if (type === "financial") {
    type Row = {
      id: string;
      created_at: string;
      status: string;
      amount: number;
      provider: string;
      subscriptions: {
        zones: { name: string } | null;
        vehicles: {
          license_plate: string;
          driver_profiles: { users: { full_name: string | null } | null } | null;
        } | null;
      } | null;
    };
    const { data } = await supabase
      .from("payments")
      .select(
        "id, created_at, status, amount, provider, subscriptions(zones(name), vehicles(license_plate, driver_profiles(users(full_name))))"
      )
      .order("created_at", { ascending: false })
      .returns<Row[]>();

    const rows = (data ?? []).map((p) => [
      new Date(p.created_at).toISOString(),
      p.status,
      Number(p.amount).toFixed(2),
      p.provider,
      p.subscriptions?.zones?.name ?? "",
      p.subscriptions?.vehicles?.license_plate ?? "",
      p.subscriptions?.vehicles?.driver_profiles?.users?.full_name ?? "",
    ]);
    const csv = toCsv(
      ["paid_at", "status", "amount_zar", "provider", "zone", "license_plate", "driver"],
      rows
    );
    return csvResponse(`hailguard-financial-audit-${today}.csv`, csv);
  }

  if (type === "density") {
    type Row = { vehicle_id: string; zones: { name: string } | null };
    const { data } = await supabase
      .from("subscriptions")
      .select("vehicle_id, zones(name)")
      .eq("status", "active")
      .returns<Row[]>();

    const byZone = new Map<string, Set<string>>();
    const subCount = new Map<string, number>();
    for (const s of data ?? []) {
      const zone = s.zones?.name ?? "Unknown";
      if (!byZone.has(zone)) byZone.set(zone, new Set());
      byZone.get(zone)!.add(s.vehicle_id);
      subCount.set(zone, (subCount.get(zone) ?? 0) + 1);
    }
    const rows = [...byZone.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .map(([zone, vehicles]) => [zone, vehicles.size, subCount.get(zone) ?? 0]);
    const csv = toCsv(["zone", "active_vehicles", "active_subscriptions"], rows);
    return csvResponse(`hailguard-density-report-${today}.csv`, csv);
  }

  if (type === "regulatory") {
    type Row = {
      id_number: string | null;
      license_number: string | null;
      prdp_number: string | null;
      prdp_expires_at: string | null;
      status: string;
      users: { full_name: string | null; phone_number: string | null } | null;
    };
    const { data } = await supabase
      .from("driver_profiles")
      .select(
        "id_number, license_number, prdp_number, prdp_expires_at, status, users(full_name, phone_number)"
      )
      .eq("status", "approved")
      .returns<Row[]>();

    const rows = (data ?? []).map((d) => [
      d.users?.full_name ?? "",
      d.users?.phone_number ?? "",
      d.id_number ?? "",
      d.license_number ?? "",
      d.prdp_number ?? "",
      d.prdp_expires_at ?? "",
      d.status,
    ]);
    const csv = toCsv(
      ["driver_name", "phone", "id_number", "license_number", "prdp_number", "prdp_expiry", "profile_status"],
      rows
    );
    return csvResponse(`hailguard-regulatory-audit-${today}.csv`, csv);
  }

  return new Response("Unknown report type", { status: 404 });
}
