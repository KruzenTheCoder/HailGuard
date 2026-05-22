import { createClient } from "@/lib/supabase/server";

export type AuditEntry = {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  actionType: string;
  targetTable: string | null;
  targetId: string | null;
  createdAt: string;
};

export type AuditFilters = {
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
};

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action_type: string;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
  users: { email: string | null } | null;
};

/** Read the immutable global audit trail (most recent first, capped). */
export async function getAuditTrail(filters: AuditFilters): Promise<AuditEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("audit_trails")
    .select("id, actor_id, actor_role, action_type, target_table, target_id, created_at, users(email)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (filters.action) query = query.ilike("action_type", `%${filters.action}%`);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);

  const { data } = await query.returns<AuditRow[]>();

  let rows = (data ?? []).map((r) => ({
    id: r.id,
    actorEmail: r.users?.email ?? null,
    actorRole: r.actor_role,
    actionType: r.action_type,
    targetTable: r.target_table,
    targetId: r.target_id,
    createdAt: r.created_at,
  }));

  // Actor email filter applied post-fetch (embedded column can't be filtered server-side).
  if (filters.actor) {
    const needle = filters.actor.toLowerCase();
    rows = rows.filter((r) => r.actorEmail?.toLowerCase().includes(needle));
  }
  return rows;
}

/** Distinct action types for the filter dropdown. */
export async function getAuditActionTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_trails")
    .select("action_type")
    .order("action_type")
    .limit(1000)
    .returns<{ action_type: string }[]>();
  return [...new Set((data ?? []).map((r) => r.action_type))].sort();
}
