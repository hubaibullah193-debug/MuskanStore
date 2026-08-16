// lib/supabase/server.ts
// Server-side Supabase client factory
// Uses service role key for server-only operations
// NEVER expose this to client code

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase server configuration");
}

/**
 * Create a server-side Supabase client
 * Uses service role key - bypasses RLS
 * Only for server-side operations
 */
export async function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);
}

export { SupabaseClient } from "@supabase/supabase-js";
