import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Data features will be unavailable.'
  );
}

// Use placeholder values when env vars are missing so createClient() never
// throws on startup — the app will still render, API calls will just fail.
export const supabase = createClient(
  supabaseUrl      || 'https://placeholder.supabase.co',
  supabaseAnonKey  || 'placeholder-anon-key',
  {
    auth: {
      persistSession:   true,
      autoRefreshToken: true,
      storageKey:       'tradazone_supabase_session',
    },
  },
);
