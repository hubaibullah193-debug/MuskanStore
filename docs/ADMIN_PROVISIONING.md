# Admin Provisioning (Secure)

This project has **no public admin signup**. Admin accounts are designated by a
privileged operator through a guarded server-side mechanism. Customers can never
select, request, or modify their own role.

## How an admin is created

Admins are created in two steps:

1. **Create the user account** — sign up normally through the app (or create the
   account via the Supabase dashboard). New accounts always get `role = 'customer'`.
2. **Promote the account to admin** using `provision_admin(email)`.

### Option A — Node script (recommended)

```bash
# .env.local (server-side only, never committed, never exposed to the browser)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

npm run provision-admin -- you@yourdomain.com
```

The script calls the `provision_admin()` Postgres function with the **service
role** key (which bypasses RLS). It is idempotent and safe to re-run.

### Option B — Supabase SQL editor (initial bootstrap only)

Run this from the Supabase dashboard SQL editor (executed as `postgres`):

```sql
select provision_admin('you@yourdomain.com');
```

This works for the **initial** admin even when no admins exist yet. After the
first admin exists, further promotions require either the service role key
(Option A) or an existing admin session.

## Authorization rules (`public.provision_admin`)

| Situation                              | Who may call                          |
| -------------------------------------- | ------------------------------------- |
| No admins exist yet (bootstrap)        | Any caller with direct DB access (dashboard / service role) |
| Admins already exist                   | An existing admin **or** the service role key |

`EXECUTE` on `provision_admin` is **revoked from `PUBLIC`** and granted only to
`service_role`. Because the function cannot be invoked by `anon`/`authenticated`
clients, a raw browser/client call can never promote anyone — not even during the
initial bootstrap window.

## Defense in depth: customers cannot escalate

Even if a customer crafted a direct API call, RLS blocks self-promotion:

- `users_update_own` allows a user to edit their **own** row but its `WITH CHECK`
  enforces `own_role_unchanged(role)` — the `role` column cannot be changed by a
  non-admin client.
- `users_admin_all` (and all other admin policies) delegate to `public.is_admin()`,
  which reads `public.users.role = 'admin'` for the current user.
- `signUpAction` / `loginAction` always set `role = 'customer'`; there is no
  role parameter in the signup flow.

## Auditing

Every promotion is recorded in `admin_audit_logs` (action `provision_admin`)
with the promoted email, whether it was a bootstrap, and who promoted them.

## Listing / revoking admins

```sql
-- List current admins
select email from public.users where role = 'admin' order by created_at;

-- Revoke (demote) an admin — run as an existing admin or via service role
update public.users set role = 'customer' where email = 'someone@domain.com';
```

## Files

- `supabase/migrations/009_secure_admin_provisioning.sql` — `provision_admin()`,
  `own_role_unchanged()` helper, tightened RLS.
- `scripts/provision-admin.mjs` — service-role provisioning script (`npm run provision-admin`).
- `lib/auth/admin.ts` — `isAdmin()` (role-based check used by app code).
- `middleware.ts` — protects `/admin/*` and `/api/admin/*` by role.
