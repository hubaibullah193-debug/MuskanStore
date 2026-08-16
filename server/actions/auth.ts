'use server';

/**
 * Server Actions for Authentication
 * Logout, session verification, role checking
 */

import { cookies } from 'next/headers';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { jwtVerify } from 'jose';

export async function logoutAction() {
  try {
    const cookieStore = await cookies();

    // Clear auth token cookie
    cookieStore.delete('auth-token');

    // Sign out from Supabase
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Failed to logout' };
  }
}

/**
 * Verify current user is authenticated and has admin role
 */
export async function verifyAdminAccess(): Promise<{ userId: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      return null;
    }

    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = verified.payload.sub as string;

    if (!userId) {
      return null;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'admin') {
      return null;
    }

    return { userId, role: user.role };
  } catch (error) {
    return null;
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      return null;
    }

    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = verified.payload.sub as string;

    if (!userId) {
      return null;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, name, phone, role, email_verified, created_at')
      .eq('id', userId)
      .single();

    return user || null;
  } catch (error) {
    return null;
  }
}
