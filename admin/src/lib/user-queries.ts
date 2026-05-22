import type { UserRole } from "@hailguard/shared";

import { createClient } from "@/lib/supabase/server";

export type PortalUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  createdAt: string;
};

export async function getPortalUsers(): Promise<PortalUser[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, email, full_name, role, created_at")
    .order("role", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<
      { id: string; email: string | null; full_name: string | null; role: UserRole; created_at: string }[]
    >();

  return (data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    createdAt: u.created_at,
  }));
}
