// server/actions/audit.ts
// Admin audit logging for compliance and tracking

'use server';

import { supabaseAdmin } from '@/lib/supabase/client';

interface AuditPayload {
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  adminId?: string;
}

/**
 * Log an audit event
 * Used for tracking admin actions and compliance
 */
export async function logAudit(payload: AuditPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const adminId = payload.adminId;

    if (!adminId) {
      console.warn('logAudit called without adminId - audit entry skipped');
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
