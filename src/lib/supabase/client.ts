import { createClient } from "@supabase/supabase-js";

/**
 * Browser-safe Supabase client with anon key.
 * Only has read access to availability data.
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase public environment variables.");
  }

  return createClient(supabaseUrl, supabaseKey);
}
