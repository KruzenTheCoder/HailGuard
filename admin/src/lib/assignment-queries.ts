import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Assignment = { reviewerId: string; reviewerName: string };

/** Current assignee per entity id (profile/vehicle), for display. */
export async function getAssignments(entityIds: string[]): Promise<Record<string, Assignment>> {
  const ids = entityIds.filter(Boolean);
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("application_assignments")
    .select("entity_id, reviewer_id, users:reviewer_id(full_name, email)")
    .in("entity_id", ids)
    .returns<
      {
        entity_id: string;
        reviewer_id: string;
        users: { full_name: string | null; email: string | null } | null;
      }[]
    >();
  const out: Record<string, Assignment> = {};
  for (const r of data ?? []) {
    out[r.entity_id] = {
      reviewerId: r.reviewer_id,
      reviewerName: r.users?.full_name || r.users?.email || "Reviewer",
    };
  }
  return out;
}

/** Entity ids assigned to the signed-in user (used to scope a reviewer's view). */
export async function getMyAssignedEntityIds(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("application_assignments")
    .select("entity_id")
    .eq("reviewer_id", user.id)
    .returns<{ entity_id: string }[]>();
  return new Set((data ?? []).map((r) => r.entity_id));
}

/** Reviewers available to be assigned work. */
export async function getReviewers(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "reviewer")
    .order("full_name")
    .returns<{ id: string; full_name: string | null; email: string | null }[]>();
  return (data ?? []).map((u) => ({ id: u.id, name: u.full_name || u.email || "Reviewer" }));
}
