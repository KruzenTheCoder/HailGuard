import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Service-role client that bypasses RLS. SERVER-ONLY — never import this into
 * a Client Component. Used for privileged admin actions (approvals,
 * subscription overrides, audit writes) in Phase 5+.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
