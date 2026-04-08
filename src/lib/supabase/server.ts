import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with service role key.
 * Only use in API routes (server-side code).
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
