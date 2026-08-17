# Constitution — Next.js + Supabase Projects

1. **Stack discipline**: Next.js (App Router) + Supabase only — no new dependency without clear justification over an existing one.
2. **Supabase is source of truth**: schema changes go through migrations, never manual dashboard edits in shared/prod environments.
3. **Security**: Row Level Security (RLS) enabled on every table by default; no client ever trusts unvalidated input — validate server-side (Server Actions/Route Handlers) even if the UI already checks.
4. **Secrets**: service role keys and secrets stay server-side only, never in client components or exposed env vars (`NEXT_PUBLIC_*`).
5. **Simplicity first**: prefer Server Components and Server Actions over client-side state/fetch unless interactivity requires it.
6. **Reuse before rebuild**: check existing components, hooks, and Supabase functions before writing new ones.
7. **Spec before non-trivial work**: any feature beyond a trivial CRUD change gets a short spec (goal, requirements, edge cases) before code.
8. **Definition of done**: matches spec, passes lint/type-check/tests, RLS/auth verified, and reviewed before merge.

## References

- `AGENTS.md` — Architecture overview, file map, current state, conventions
- `docs/` — All project documentation (spec, design, implementation plan, auth setup, environment setup, E2E testing guide, research findings)
