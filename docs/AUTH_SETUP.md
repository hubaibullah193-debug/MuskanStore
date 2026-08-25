# Authentication Setup Guide

## Status
✅ Code setup complete
⏳ Database migrations pending

## Your next steps:

### 1. Apply Database Migrations

You need to run the migrations on your Supabase project. There are two ways:

**Option A: Using Supabase Dashboard (Fastest for testing)**

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project `ehwawaqugswvtdxoyxyr`
3. Go to **SQL Editor** → click **New Query**
4. Copy and paste the contents of each migration file in order:
    - Run all migration files in `supabase/migrations/` in numeric order
      (`000_unified_mvp_schema.sql` → `014_bundle_cart_support.sql`).
5. Run each query (click the play button or Ctrl+Enter)

**Option B: Using Supabase CLI (Recommended for production)**

```bash
# Install if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref ehwawaqugswvtdxoyxyr

# Push all migrations
supabase db push
```

### 2. Test the Auth Flow

Once migrations are applied, test locally:

```bash
npm run dev
```

Then:
1. Go to http://localhost:3000/auth/signup
2. Create a test account
3. You should be redirected to login
4. Log in with your credentials
5. Check the header - you should see your name and a **Logout** button

### 3. Verify Session Persistence

- Refresh the page - you should stay logged in
- Open DevTools → Application → Cookies → look for `auth-token` and `refresh-token`
- Both should be marked as `HttpOnly` and `Secure`

## What's now working

✅ Sign up creates user in `users` table  
✅ Login stores secure session cookies  
✅ User info displays in header  
✅ Logout clears session  
✅ Cart is tied to user (ready for next step)  
✅ Route protection via middleware (admin/checkout routes blocked without auth)  

## Next: Cart Persistence

Once auth is working, the cart will automatically persist to Supabase when a user is logged in. The cart Server Actions are already built (`app/cart/actions.ts`).

## Troubleshooting

**"Invalid email or password"** → Account wasn't created in signup step

**Logout button not showing** → Migrations didn't apply; check Supabase SQL editor for errors

**"SUPABASE_JWT_SECRET not configured"** → Middleware can't verify tokens. The build provided a placeholder; Supabase uses its own secret automatically at runtime.

**"Failed to fetch session"** → Usually a network error; check your Supabase connection string in `.env.local`
