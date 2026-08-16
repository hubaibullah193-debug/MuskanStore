import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Browser/Client Supabase client
 * Uses anon key - respects RLS policies
 * Safe for client-side use
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client
 * Uses service role key - bypasses RLS (for server-only operations)
 * NEVER expose this to client code
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export { SupabaseClient } from "@supabase/supabase-js";
