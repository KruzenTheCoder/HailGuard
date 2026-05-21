import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from './env';

// When env vars are missing we still construct a client with placeholder
// values so module evaluation succeeds. The root layout gates the app behind
// `env.configured` and shows a setup screen, so this placeholder client is
// never actually called.
const url = env.configured ? env.supabaseUrl : 'https://placeholder.supabase.co';
const key = env.configured ? env.supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: env.configured,
    persistSession: env.configured,
    // No URL-based session detection in a native app.
    detectSessionInUrl: false,
  },
});
