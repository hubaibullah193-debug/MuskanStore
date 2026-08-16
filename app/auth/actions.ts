'use server';

/**
 * Authentication Server Actions
 * Handle signup, login, logout, and session management
 * This runs server-side only and handles cookie/token operations
 */

import { cookies } from 'next/headers';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { SignUpSchema, LogInSchema } from '@/lib/validation/schemas';
import { AppError } from '@/lib/utils/helpers';

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
      email_confirm: false,
    });

    if (authError) {
      throw new AppError('AUTH_SIGNUP_FAILED', authError.message, 400);
    }

    if (!authData.user) {
      throw new AppError('AUTH_SIGNUP_FAILED', 'Failed to create user', 500);
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
      throw new AppError('AUTH_PROFILE_CREATION_FAILED', profileError.message, 500);
    }

    return {
      success: true,
      userId: authData.user.id,
      email: authData.user.email,
      message: 'Signup successful. Please log in.',
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('AUTH_SIGNUP_ERROR', 'An unexpected error occurred during signup', 500);
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
      throw new AppError('AUTH_LOGIN_FAILED', 'Invalid email or password', 401);
    }

    if (!data.session) {
      throw new AppError('AUTH_LOGIN_FAILED', 'Failed to create session', 500);
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, phone, role, email_verified')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      throw new AppError('AUTH_PROFILE_FETCH_FAILED', profileError.message, 500);
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
    if (error instanceof AppError) throw error;
    throw new AppError('AUTH_LOGIN_ERROR', 'An unexpected error occurred during login', 500);
  }
}

// ===================================================================
// LOGOUT
// ===================================================================

export async function logoutAction() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AppError('AUTH_LOGOUT_FAILED', error.message, 400);
    }

    // Clear auth cookies
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    cookieStore.delete('refresh-token');

    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('AUTH_LOGOUT_ERROR', 'Failed to logout', 500);
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

    // Get user profile
    const { data: userProfile } = await supabase
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
    return null;
  }
}
