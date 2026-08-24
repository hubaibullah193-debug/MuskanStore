// server/actions/audit.ts
// Admin audit logging for compliance and tracking

'use server';

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/client';
import { verifySupabaseToken } from '@/lib/auth/verify';

interface AuditPayload {
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  adminId?: string;
}

/**
 * Resolve the acting admin's id from the current session cookie when a caller
 * does not explicitly provide one. This keeps audit logging reliable even when
 * an action (or API route) forgets to thread the admin id through.
 */
async function resolveAdminId(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = store.get('auth-token')?.value;
    if (!token) return null;
    const payload = await verifySupabaseToken(token);
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Log an audit event
 * Used for tracking admin actions and compliance
 */
export async function logAudit(payload: AuditPayload): Promise<{ success: boolean; error?: string }> {
  try {
    let adminId: string | null = payload.adminId ?? null;
    if (!adminId) {
      adminId = await resolveAdminId();
    }

    if (!adminId) {
      console.warn('logAudit called without adminId and no session - audit entry skipped');
      return { success: false, error: 'adminId is required' };
    }

    const { error } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_id: adminId,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        changes: payload.changes || null,
      });

    if (error) {
      console.error('Failed to log audit:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error logging audit:', message);
    return { success: false, error: message };
  }
}
