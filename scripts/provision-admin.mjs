#!/usr/bin/env node
/**
 * Secure admin provisioning script.
 *
 * Promotes an EXISTING user to the `admin` role by calling the
 * public.provision_admin() Postgres function with the SERVICE ROLE key.
 *
 * This is the only supported way to create the initial admin (and to promote
 * further admins from tooling). There is intentionally NO public admin signup
 * and the function cannot be invoked by anon/authenticated clients.
 *
 * Prerequisites:
 *   1. The target user account must already exist (sign up normally or create
 *      it via the Supabase dashboard).
 *   2. The following environment variables must be set (e.g. in .env.local,
 *      which must never be committed and never exposed to the browser):
 *        SUPABASE_URL
 *        SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/provision-admin.mjs <email>
 *
 * The SERVICE ROLE key is all-powerful (bypasses RLS). Keep it secret.
 */

import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/provision-admin.mjs <email>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    'Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

// service_role bypasses RLS; never use this client in the browser.
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const { error } = await supabase.rpc('provision_admin', { p_email: email });

  if (error) {
    console.error(`Failed to provision admin "${email}": ${error.message}`);
    process.exit(1);
  }

  console.log(`Successfully provisioned admin: ${email}`);
} catch (err) {
  console.error(`Error provisioning admin: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
