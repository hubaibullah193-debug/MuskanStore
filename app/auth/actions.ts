'use server';

/**
 * Authentication Server Actions
 * Handle signup, login, logout, and session management
 * This runs server-side only and handles cookie/token operations
 */

import { cookies } from 'next/headers';
import { ZodError } from 'zod';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { SignUpSchema, LogInSchema } from '@/lib/validation/schemas';

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

    // Get user profile (use admin client to bypass RLS)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, phone, role, email_verified')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return { success: false, error: 'Failed to fetch user profile' };
    }

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
        name: userProfile?.name,
        phone: userProfile?.phone,
        role: userProfile?.role || 'customer',
        emailVerified: userProfile?.email_verified,
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
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    // Get user profile (use admin client to bypass RLS)
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, email, name, phone, role, email_verified')
      .eq('id', data.session.user.id)
      .single();

    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        name: userProfile?.name,
        phone: userProfile?.phone,
        role: userProfile?.role || 'customer',
        emailVerified: userProfile?.email_verified,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      },
    };
  } catch (error) {
    console.error('session fetch error:', error);
    return null;
  }
}
