import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** The permission keys held by the current user's role (for UI gating). */
export async function getMyPermissions(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("permission_key")
    .eq("role", user.role)
    .returns<{ permission_key: string }[]>();
  return new Set((data ?? []).map((r) => r.permission_key));
}
