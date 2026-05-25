import { redirect } from "next/navigation";

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

/**
 * Page-level guard: bounce to the dashboard if the signed-in role lacks the
 * required permission. Dashboard (/admin) is always reachable by any staff.
 */
export async function requirePermission(perm: string): Promise<void> {
  const perms = await getMyPermissions();
  if (!perms.has(perm)) redirect("/admin");
}
