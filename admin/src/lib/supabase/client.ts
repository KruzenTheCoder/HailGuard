import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/** Supabase client for use in Client Components. Persists session to cookies. */
export function createClient() {
  return createBrowserClient(env.supabaseUrl(), env.supabaseAnonKey());
}
