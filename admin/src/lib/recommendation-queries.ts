import { createClient } from "@/lib/supabase/server";

export type Recommendation = {
  recommendation: "approve" | "reject";
  note: string | null;
};

/** Latest reviewer recommendation per entity id (profile or vehicle). */
export async function getRecommendations(
  entityIds: string[]
): Promise<Record<string, Recommendation>> {
  const ids = entityIds.filter(Boolean);
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("application_recommendations")
    .select("entity_id, recommendation, note")
    .in("entity_id", ids)
    .returns<{ entity_id: string; recommendation: "approve" | "reject"; note: string | null }[]>();

  const out: Record<string, Recommendation> = {};
  for (const r of data ?? []) out[r.entity_id] = { recommendation: r.recommendation, note: r.note };
  return out;
}
