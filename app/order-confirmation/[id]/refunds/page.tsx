// app/order-confirmation/[id]/refunds/page.tsx
'use server';

import { createClient } from '@/lib/supabase/server';
import { RefundRequestForm } from '../../../components/refund-request-form';
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

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Order #{order.order_number}</h1>
      <p className="text-gray-600 mb-8">
        Ordered on {new Date(order.created_at).toLocaleDateString()}
      </p>

      <div className="grid gap-8">
        {/* Existing Refunds */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Refund History</h2>

          {!refunds || refunds.length === 0 ? (
            <p className="text-gray-500">No refund requests yet.</p>
          ) : (
            <div className="space-y-4">
              {refunds.map(refund => (
                <div key={refund.id} className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold">PKR {refund.refund_amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-600 mt-1">Reason: {refund.reason}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadgeColor(refund.status)}`}>
                      {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Requested: {new Date(refund.created_at).toLocaleDateString()}</p>

                    {refund.status === 'approved' && refund.approved_at && (
                      <p>Approved: {new Date(refund.approved_at).toLocaleDateString()}</p>
                    )}

                    {refund.status === 'completed' && refund.completed_at && (
                      <p>Completed: {new Date(refund.completed_at).toLocaleDateString()}</p>
                    )}

                    {refund.status === 'rejected' && refund.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                        <p className="text-red-900 font-medium mb-1">Rejection Reason:</p>
                        <p className="text-red-800">{refund.rejection_reason}</p>
                      </div>
                    )}

                    {refund.admin_notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-blue-900 font-medium mb-1">Admin Notes:</p>
                        <p className="text-blue-800">{refund.admin_notes}</p>
                      </div>
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
            <h2 className="text-2xl font-bold mb-4">Request a Refund</h2>
            <RefundRequestForm
              orderId={params.id}
              orderNumber={order.order_number}
              orderTotal={order.total_amount}
            />
          </div>
        )}

        {!canRequestRefund && !refunds?.length && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-900">
              {order.order_status !== 'delivered'
                ? 'Refunds can only be requested after the order is delivered.'
                : 'A refund request is already in progress for this order.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
