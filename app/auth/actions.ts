'use server';

/**
 * Authentication Server Actions
 * Handle signup, login, logout, and session management
 * This runs server-side only and handles cookie/token operations
 */

import { cookies } from 'next/headers';
import { ZodError } from 'zod';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { verifySupabaseToken } from '@/lib/auth/verify';
import { SignUpSchema, LogInSchema } from '@/lib/validation/schemas';
import { requestPasswordReset, confirmPasswordReset } from '@/lib/auth/server';

// ===================================================================
// SIGNUP
// ===================================================================

export async function signUpAction(
  email: string,
  password: string,
  name: string,
  phone?: string
) {
  try {
    // Validate input
    const validated = SignUpSchema.parse({ email, password, name, phone });

    // Create auth user via Supabase Admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' };
    }

    // Create user profile in public.users table
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: validated.email,
        name: validated.name,
        phone: validated.phone,
        role: 'customer',
        email_verified: false,
      });

    if (profileError) {
      // Delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: profileError.message };
    }

    return {
      success: true,
      userId: authData.user.id,
      email: authData.user.email,
      message: 'Signup successful. Please log in.',
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors.map((e) => e.message).join('. ');
      return { success: false, error: message };
    }
    console.error('signup error:', error);
    return { success: false, error: 'An unexpected error occurred during signup' };
  }
}

// ===================================================================
// LOGIN
// ===================================================================

export async function loginAction(email: string, password: string) {
  try {
    // Validate input
    const validated = LogInSchema.parse({ email, password });

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!data.session) {
      return { success: false, error: 'Failed to create session' };
    }

    // Get or create the user profile. Accounts created outside the app's
    // signup flow (Supabase dashboard, OAuth, magic link, diagnostic tools)
    // have no public.users row, which previously made login fail even with
    // valid credentials. We tolerate that and upsert a profile instead.
    let { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, phone, role, email_verified')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !userProfile) {
      const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
      const { data: created, error: createErr } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            id: data.user.id,
            email: data.user.email ?? '',
            name:
              (meta.name as string) ||
              (meta.full_name as string) ||
              (data.user.email ? data.user.email.split('@')[0] : ''),
            phone: (data.user.phone as string) ?? null,
            role: 'customer',
            email_verified: !!data.user.email_confirmed_at,
          },
          { onConflict: 'id' }
        )
        .select('id, email, name, phone, role, email_verified')
        .maybeSingle();
      if (createErr) {
        console.error('profile upsert failed:', createErr);
      } else if (created) {
        userProfile = created;
      }
    }

    const profile = userProfile ?? {
      id: data.user.id,
      email: data.user.email,
      name: (data.user.user_metadata?.name as string) ?? null,
      phone: (data.user.phone as string) ?? null,
      role: 'customer',
      email_verified: !!data.user.email_confirmed_at,
    };

    // Store session in secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in,
      path: '/',
    });

    // Store refresh token in separate cookie (also HTTP-only)
    cookieStore.set('refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        phone: profile.phone,
        role: profile.role || 'customer',
        emailVerified: profile.email_verified,
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors.map((e) => e.message).join('. ');
      return { success: false, error: message };
    }
    console.error('login error:', error);
    return { success: false, error: 'An unexpected error occurred during login' };
  }
}

// ===================================================================
// LOGOUT
// ===================================================================

export async function logoutAction() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }

    // Clear auth cookies
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    cookieStore.delete('refresh-token');

    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    console.error('logout error:', error);
    return { success: false, error: 'Failed to logout' };
  }
}

// ===================================================================
// GET CURRENT SESSION
// ===================================================================

export async function getCurrentSessionAction() {
  try {
    // Login sets the session in the httpOnly `auth-token` cookie (not in the
    // Supabase browser client storage), so we recover the session from that
    // cookie instead of `supabase.auth.getSession()` (which would be empty).
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifySupabaseToken(token);
    const userId = payload?.sub as string | undefined;

    if (!userId) {
      return null;
    }

    // Get user profile (use admin client to bypass RLS). Fall back to the
    // auth user record if no profile row exists, so a missing profile never
    // forces a logout.
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, email, name, phone, role, email_verified')
      .eq('id', userId)
      .maybeSingle();

    let authUser: import('@supabase/supabase-js').User | null = null;
    if (!userProfile) {
      const { data: au } = await supabaseAdmin.auth.admin.getUserById(userId);
      authUser = au?.user ?? null;
    }

    return {
      user: {
        id: userId,
        email: userProfile?.email ?? authUser?.email ?? null,
        name:
          userProfile?.name ??
          (authUser?.user_metadata?.name as string | undefined) ??
          null,
        phone: userProfile?.phone ?? authUser?.phone ?? null,
        role: userProfile?.role || 'customer',
        emailVerified:
          userProfile?.email_verified ?? !!authUser?.email_confirmed_at,
      },
      session: {
        accessToken: token,
        refreshToken: cookieStore.get('refresh-token')?.value ?? '',
        expiresIn:
          typeof payload?.exp === 'number'
            ? payload.exp - Math.floor(Date.now() / 1000)
            : 0,
      },
    };
  } catch (error) {
    console.error('session fetch error:', error);
    return null;
  }
}

// ===================================================================
// PASSWORD RESET (server actions — keep Supabase client server-side so the
// forgot/reset client pages don't bundle it)
// ===================================================================

export async function requestPasswordResetAction(email: string) {
  return requestPasswordReset(email);
}

export async function confirmPasswordResetAction(tokenHash: string, password: string) {
  return confirmPasswordReset(tokenHash, password);
}
