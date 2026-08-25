import { verifyAdminAccess } from '@/server/actions/auth';

/**
 * Verify the current request's user has admin role.
 * Delegates to the canonical `verifyAdminAccess` so the token-verification +
 * role-check logic lives in exactly one place.
 * Must be called from server code (route handlers, server components, server actions).
 */
export async function isAdmin(): Promise<boolean> {
  return (await verifyAdminAccess()) !== null;
}
