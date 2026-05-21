// Public Expo env vars are inlined at build time from EXPO_PUBLIC_* keys.
// Copy mobile/.env.example to mobile/.env and fill in your Supabase project values.
//
// We intentionally do NOT throw when these are missing — a module-load throw
// here cascades into "Route is missing default export" errors for every screen
// that transitively imports Supabase. Instead, `env.configured` is exported and
// the root layout renders a clear "configure your .env" screen when false.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const verifyBaseUrl = process.env.EXPO_PUBLIC_VERIFY_BASE_URL ?? 'https://hailguard.zone';

export const env = {
  supabaseUrl: supabaseUrl ?? '',
  supabaseAnonKey: supabaseAnonKey ?? '',
  /** Base URL the Zone Pass QR resolves to. */
  verifyBaseUrl: verifyBaseUrl.replace(/\/+$/, ''),
  configured: !!(supabaseUrl && supabaseAnonKey),
} as const;
