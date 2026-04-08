import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client with auth session management.
 * Used in admin dashboard client components.
 */
export function createAuthBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(supabaseUrl, supabaseKey);
}
