import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * The Supabase client, or null when the app is built without credentials.
 *
 * Null is a supported mode, not an error: the tracker falls back to the
 * bundled catalog and browser-local progress, so a fork with no Supabase
 * project of its own still works exactly as it did before.
 *
 * The anon key is public by design — it ships in this bundle. Row Level
 * Security is what actually protects user rows; see
 * supabase/migrations/0001_init.sql.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // The magic link comes back as a URL fragment; let the client
          // consume it on load and then clean up after itself.
          detectSessionInUrl: true,
        },
      })
    : null;

export const isRemoteEnabled = supabase !== null;
