// app/order-confirmation/[id]/refunds/page.tsx

import { createClient } from '@/lib/supabase/server';
import { RefundRequestForm } from '../../../components/refund-request-form';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { Alert } from '@/app/components/ui/alert';
import { notFound, redirect } from 'next/navigation';

interface RefundStatus {
  id: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
  refund_amount: number;
  reason: string;
  admin_notes?: string;
  rejection_reason?: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  completed_at?: string;
}

export default async function OrderRefundsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { token?: string };
}) {
  const supabase = await createClient();
  const { getCurrentUser } = await import('@/server/actions/auth');
  const user = await getCurrentUser();

  // Get order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, guest_email, user_id, order_status, payment_status, created_at')
    .eq('id', params.id)
    .single();

  if (orderError || !order) {
    notFound();
  }

  // Verify ownership (user or guest with token)
  const isGuest = !user && searchParams.token;
  const isOwner = user?.id === order.user_id;

  if (!isOwner && !isGuest) {
    redirect('/');
  }

  // Get refunds for this order
  const { data: refunds = [] } = await supabase
    .from('refunds')
    .select('*')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false });

  // Check if order qualifies for refund (delivered and no active request)
  const canRequestRefund =
    order.order_status === 'delivered' &&
    (refunds || []).every(r => r.status !== 'requested');

  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-2 text-foreground">Order #{order.order_number}</h1>
        <p className="text-text-secondary mb-8">
          Ordered on {new Date(order.created_at).toLocaleDateString()}
        </p>

        <div className="grid gap-8">
          {/* Existing Refunds */}
          <div>
            <h2 className="font-display text-2xl font-bold mb-4 text-foreground">Refund History</h2>

            {!refunds || refunds.length === 0 ? (
              <p className="text-text-tertiary">No refund requests yet.</p>
            ) : (
              <div className="space-y-4">
                {refunds.map(refund => (
                  <div key={refund.id} className="border border-border rounded-lg p-6 bg-card">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-lg font-semibold text-foreground">PKR {refund.refund_amount.toFixed(2)}</p>
                        <p className="text-sm text-text-secondary mt-1">Reason: {refund.reason}</p>
                      </div>
                      <StatusBadge status={refund.status} />
                    </div>

                    <div className="space-y-2 text-sm text-text-secondary">
                      <p>Requested: {new Date(refund.created_at).toLocaleDateString()}</p>

                      {refund.status === 'approved' && refund.approved_at && (
                        <p>Approved: {new Date(refund.approved_at).toLocaleDateString()}</p>
                      )}

                      {refund.status === 'completed' && refund.completed_at && (
                        <p>Completed: {new Date(refund.completed_at).toLocaleDateString()}</p>
                      )}

                      {refund.status === 'rejected' && refund.rejection_reason && (
                        <Alert variant="error">
                          <p className="font-medium mb-1">Rejection Reason:</p>
                          <p>{refund.rejection_reason}</p>
                        </Alert>
                      )}

                      {refund.admin_notes && (
                        <Alert variant="info">
                          <p className="font-medium mb-1">Admin Notes:</p>
                          <p>{refund.admin_notes}</p>
                        </Alert>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Refund Request */}
          {canRequestRefund && (
            <div>
              <h2 className="font-display text-2xl font-bold mb-4 text-foreground">Request a Refund</h2>
              <RefundRequestForm
                orderId={params.id}
                orderNumber={order.order_number}
                orderTotal={order.total_amount}
              />
            </div>
          )}

          {!canRequestRefund && !refunds?.length && (
            <Alert variant="warning">
              {order.order_status !== 'delivered'
                ? 'Refunds can only be requested after the order is delivered.'
                : 'A refund request is already in progress for this order.'}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
