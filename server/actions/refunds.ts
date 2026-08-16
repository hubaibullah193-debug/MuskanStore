// server/actions/refunds.ts
// Refund request and management operations

'use server';

import { createClient } from '@/lib/supabase/server';
import { sendRefundEmail } from './email';
import { logAudit } from './audit';

interface CreateRefundPayload {
  orderId: string;
  refundAmount: number;
  reason: string;
}

interface ApproveRefundPayload {
  refundId: string;
  notes?: string;
}

interface RejectRefundPayload {
  refundId: string;
  rejectionReason: string;
}

interface CompleteRefundPayload {
  refundId: string;
}

/**
 * Create a refund request
 * Called by customers after receiving their order
 */
export async function createRefundRequest(
  payload: CreateRefundPayload
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get order to verify ownership and get customer email
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, guest_email, user_id, items')
      .eq('id', payload.orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Verify user owns this order
    if (user?.id !== order.user_id && !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate refund amount doesn't exceed order total
    if (payload.refundAmount > order.total_amount) {
      return { success: false, error: 'Refund amount exceeds order total' };
    }

    // Check if refund already requested for this order
    const { data: existingRefund } = await supabase
      .from('refunds')
      .select('id, status')
      .eq('order_id', payload.orderId)
      .in('status', ['requested', 'approved'])
      .single();

    if (existingRefund) {
      return { success: false, error: 'A refund request already exists for this order' };
    }

    // Create refund request
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .insert({
        order_id: payload.orderId,
        requested_by: user?.id || null,
        refund_amount: payload.refundAmount,
        reason: payload.reason,
        status: 'requested',
      })
      .select('id')
      .single();

    if (refundError || !refund) {
      console.error('Failed to create refund request:', refundError);
      return { success: false, error: 'Failed to create refund request' };
    }

    // Send notification email
    const customerEmail = user?.email || order.guest_email;
    await sendRefundEmail({
      orderNumber: order.order_number,
      customerEmail,
      refundAmount: payload.refundAmount,
      reason: payload.reason,
      status: 'requested',
    }).catch(err => console.error('Failed to send refund email:', err));

    // Log audit
    await logAudit({
      action: 'refund_requested',
      entityType: 'refund',
      entityId: refund.id,
      changes: { status: 'requested', refundAmount: payload.refundAmount },
    }).catch(err => console.error('Failed to log audit:', err));

    return { success: true, refundId: refund.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error creating refund request:', message);
    return { success: false, error: message };
  }
}

/**
 * Approve a refund request (admin only)
 */
export async function approveRefund(
  payload: ApproveRefundPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { verifyAdminAccess } = await import('./auth');
    const adminAccess = await verifyAdminAccess();

    if (!adminAccess) {
      return { success: false, error: 'Unauthorized - admin access required' };
    }
    const adminId = adminAccess.userId;

    // Get refund and order details
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select('id, status, order_id, refund_amount, reason')
      .eq('id', payload.refundId)
      .single();

    if (refundError || !refund) {
      return { success: false, error: 'Refund not found' };
    }

    if (refund.status !== 'requested') {
      return { success: false, error: 'Refund is not in requested status' };
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, guest_email, user_id')
      .eq('id', refund.order_id)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Update refund status
    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: 'approved',
        admin_id: adminId,
        approved_at: new Date().toISOString(),
        admin_notes: payload.notes,
      })
      .eq('id', payload.refundId);

    if (updateError) {
      console.error('Failed to approve refund:', updateError);
      return { success: false, error: 'Failed to approve refund' };
    }

    // Send approval email
    const customerEmail = order.guest_email;

    await sendRefundEmail({
      orderNumber: order?.order_number || '',
      customerEmail,
      refundAmount: refund.refund_amount,
      reason: refund.reason,
      status: 'approved',
    }).catch(err => console.error('Failed to send refund approval email:', err));

    // Log audit
    await logAudit({
      action: 'refund_approved',
      entityType: 'refund',
      entityId: payload.refundId,
      changes: { status: 'approved', adminId },
    }).catch(err => console.error('Failed to log audit:', err));

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error approving refund:', message);
    return { success: false, error: message };
  }
}

/**
 * Reject a refund request (admin only)
 */
export async function rejectRefund(
  payload: RejectRefundPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { verifyAdminAccess } = await import('./auth');
    const adminAccess = await verifyAdminAccess();

    if (!adminAccess) {
      return { success: false, error: 'Unauthorized - admin access required' };
    }
    const adminId = adminAccess.userId;

    // Get refund and order details
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select('id, status, order_id, refund_amount, reason')
      .eq('id', payload.refundId)
      .single();

    if (refundError || !refund) {
      return { success: false, error: 'Refund not found' };
    }

    if (refund.status !== 'requested') {
      return { success: false, error: 'Refund is not in requested status' };
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, guest_email, user_id')
      .eq('id', refund.order_id)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Update refund status
    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: 'rejected',
        admin_id: adminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: payload.rejectionReason,
      })
      .eq('id', payload.refundId);

    if (updateError) {
      console.error('Failed to reject refund:', updateError);
      return { success: false, error: 'Failed to reject refund' };
    }

    // Send rejection email
    const customerEmail = order.guest_email;

    await sendRefundEmail({
      orderNumber: order?.order_number || '',
      customerEmail,
      refundAmount: refund.refund_amount,
      reason: refund.reason,
      status: 'rejected',
    }).catch(err => console.error('Failed to send refund rejection email:', err));

    // Log audit
    await logAudit({
      action: 'refund_rejected',
      entityType: 'refund',
      entityId: payload.refundId,
      changes: { status: 'rejected', adminId },
    }).catch(err => console.error('Failed to log audit:', err));

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error rejecting refund:', message);
    return { success: false, error: message };
  }
}

/**
 * Complete a refund (admin only)
 * Marks refund as completed and notifies customer
 */
export async function completeRefund(
  payload: CompleteRefundPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { verifyAdminAccess } = await import('./auth');
    const adminAccess = await verifyAdminAccess();

    if (!adminAccess) {
      return { success: false, error: 'Unauthorized - admin access required' };
    }
    const adminId = adminAccess.userId;

    // Get refund and order details
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select('id, status, order_id, refund_amount, reason')
      .eq('id', payload.refundId)
      .single();

    if (refundError || !refund) {
      return { success: false, error: 'Refund not found' };
    }

    if (refund.status !== 'approved') {
      return { success: false, error: 'Refund must be approved before completion' };
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, guest_email, user_id')
      .eq('id', refund.order_id)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Update refund status
    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', payload.refundId);

    if (updateError) {
      console.error('Failed to complete refund:', updateError);
      return { success: false, error: 'Failed to complete refund' };
    }

    // Send completion email
    const customerEmail = order.guest_email;

    await sendRefundEmail({
      orderNumber: order?.order_number || '',
      customerEmail,
      refundAmount: refund.refund_amount,
      reason: refund.reason,
      status: 'completed',
    }).catch(err => console.error('Failed to send refund completion email:', err));

    // Log audit
    await logAudit({
      action: 'refund_completed',
      entityType: 'refund',
      entityId: payload.refundId,
      changes: { status: 'completed', completedAt: new Date().toISOString() },
    }).catch(err => console.error('Failed to log audit:', err));

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error completing refund:', message);
    return { success: false, error: message };
  }
}

/**
 * Get refunds for an order (customer or admin)
 */
export async function getRefundsForOrder(
  orderId: string
): Promise<{ success: boolean; refunds?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: refunds, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch refunds:', error);
      return { success: false, error: 'Failed to fetch refunds' };
    }

    return { success: true, refunds: refunds || [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching refunds:', message);
    return { success: false, error: message };
  }
}
