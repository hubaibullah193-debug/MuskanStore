'use server';

/**
 * Server Actions for Authentication
 * Session verification, role checking, account management
 */

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/client';
import { verifySupabaseToken } from '@/lib/auth/verify';

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

    const payload = await verifySupabaseToken(token);
    const userId = payload?.sub as string | undefined;

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

    const payload = await verifySupabaseToken(token);
    const userId = payload?.sub as string | undefined;

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

/**
 * Delete current user's account
 * Cleans up cart, removes auth user, clears session
 */
export async function deleteAccount() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const payload = await verifySupabaseToken(token);
    const userId = payload?.sub as string | undefined;

    if (!userId) {
      return { success: false, error: 'Invalid session' };
    }

    // Clean up user's cart items
    await supabaseAdmin.from('cart_items').delete().eq('user_id', userId);

    // Delete user from Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('deleteUser error:', error);
      return { success: false, error: 'Failed to delete account' };
    }

    // Clear session cookies
    cookieStore.delete('auth-token');
    cookieStore.delete('refresh-token');

    return { success: true };
  } catch (error) {
    console.error('deleteAccount error:', error);
    return { success: false, error: 'Failed to delete account' };
  }
}

/**
 * Update current user's profile (name, phone)
 */
export async function updateUserProfile(updates: { name?: string; phone?: string }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const payload = await verifySupabaseToken(token);
    const userId = payload?.sub as string | undefined;

    if (!userId) {
      return { success: false, error: 'Invalid session' };
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('updateUserProfile error:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}
