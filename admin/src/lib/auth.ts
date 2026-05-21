import type { UserRole } from "@hailguard/shared";

import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  role: UserRole;
  fullName: string | null;
  email: string | null;
};

/** Returns the signed-in app user (with role), or null if not authenticated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: UserRole; full_name: string | null; email: string | null }>();

  if (!data) return null;
  return { id: data.id, role: data.role, fullName: data.full_name, email: data.email };
}
