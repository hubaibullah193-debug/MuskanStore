import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/client';
import { jwtVerify } from 'jose';

/**
 * Verify the current request's user has admin role.
 * Reads the auth-token cookie, verifies the JWT signature, then checks
 * the users table role. Must be called from server code (route handlers,
 * server components, server actions).
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return false;
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      return false;
    }

    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = verified.payload.sub as string;

    if (!userId) {
      return false;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    return user?.role === 'admin';
  } catch {
    return false;
  }
}
