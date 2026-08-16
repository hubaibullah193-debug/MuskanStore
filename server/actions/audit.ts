// server/actions/audit.ts
// Admin audit logging for compliance and tracking

'use server';

import { createClient } from '@/lib/supabase/server';

interface AuditPayload {
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
}

/**
 * Log an audit event
 * Used for tracking admin actions and compliance
 */
export async function logAudit(payload: AuditPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: user.id,
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
