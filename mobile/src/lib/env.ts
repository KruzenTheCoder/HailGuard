// Public Expo env vars are inlined at build time from EXPO_PUBLIC_* keys.
// Copy .env.example to .env and fill in your Supabase project values.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env (see .env.example).'
  );
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
} as const;
