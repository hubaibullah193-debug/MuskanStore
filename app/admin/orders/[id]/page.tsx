'use client';

/**
 * Admin Dashboard - Order Detail
 * View complete order details, update status, handle refunds
 * View payment attempts and audit logs
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { updateOrderStatus } from '@/server/actions/orders';
import { verifyAdminAccess } from '@/server/actions/auth';

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [paymentAttempts, setPaymentAttempts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        // Get admin ID
        const admin = await verifyAdminAccess();
        if (!admin) {
          setError('Unauthorized. Admin access required.');
          setLoading(false);
          return;
        }
        setAdminId(admin.userId);

        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', params.id)
          .single();

        if (orderError || !orderData) {
          throw new Error('Order not found');
        }

        setOrder(orderData);
        setNewStatus(orderData.order_status);

        // Fetch payment attempts
        const { data: attempts } = await supabase
          .from('payment_attempts')
          .select('*')
          .eq('order_id', params.id)
          .order('attempted_at', { ascending: false });

        setPaymentAttempts(attempts || []);

        // Fetch audit logs
        const { data: logs } = await supabase
          .from('admin_audit_logs')
          .select('*')
          .eq('entity_id', params.id)
          .order('created_at', { ascending: false });

        setAuditLogs(logs || []);

        // Fetch email delivery logs for this order
        try {
          const emailRes = await fetch(
            `/api/admin/email-logs?referenceId=${params.id}`
          );
          if (emailRes.ok) {
            const emailJson = await emailRes.json();
            setEmailLogs(emailJson.logs || []);
          }
        } catch {
          // Email logs are best-effort; ignore failures.
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [params.id]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus || newStatus === order.order_status || !adminId) {
      return;
    }

    setUpdatingStatus(true);

    try {
      await updateOrderStatus(params.id, newStatus, adminId, statusNotes);

      setOrder((prev: any) => ({
        ...prev,
        order_status: newStatus,
      }));

      setStatusNotes('');
      alert('Order status updated successfully');
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-900',
      pending_payment: 'bg-yellow-100 text-yellow-900',
      confirmed: 'bg-blue-100 text-blue-900',
      shipped: 'bg-purple-100 text-purple-900',
      delivered: 'bg-green-100 text-green-900',
      refund_requested: 'bg-orange-100 text-orange-900',
      refunded: 'bg-gray-100 text-gray-900',
      cancelled: 'bg-red-100 text-red-900',
    };
    return colors[status] || 'bg-gray-100 text-gray-900';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
        <p className="text-red-700 mb-4">{error || 'Order not found'}</p>
        <Link href="/admin/orders" className="text-red-600 hover:text-red-700 underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/orders" className="text-blue-600 hover:text-blue-900 mb-2 inline-block">
            ← Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Order {order.order_number}</h1>
          <p className="text-gray-600 mt-1">
            Created {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(order.order_status)}`}>
          {order.order_status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{order.guest_email || 'N/A'}</p>
              </div>
              {order.delivery_address?.phone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{order.delivery_address.phone}</p>
                </div>
              )}
              {order.delivery_address?.recipient_name && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Recipient Name</p>
                  <p className="font-medium">{order.delivery_address.recipient_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
            <div className="text-gray-700 space-y-1">
              <p>{order.delivery_address?.street}</p>
              <p>
                {order.delivery_address?.city}
                {order.delivery_address?.postal_code && `, ${order.delivery_address.postal_code}`}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
                {Array.isArray(order.items) &&
                  order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start pb-4 border-b last:pb-0 last:border-b-0">
                      <div>
                        {item.is_bundle && (
                          <span className="mr-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-semibold text-purple-800 align-middle">
                            Bundle
                          </span>
                        )}
                        <p className="font-medium">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-gray-600">{item.variant_name}</p>
                        )}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        {item.is_bundle && Array.isArray(item.bundle_items) && (
                          <ul className="mt-1 space-y-0.5 text-sm text-gray-500">
                            {item.bundle_items.map((bi: any, i: number) => (
                              <li key={i} className="truncate">
                                {bi.product_name || bi.product_id}
                                {bi.variant_name ? ` (${bi.variant_name})` : ''} × {bi.quantity}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Rs {(item.price).toFixed(0)}</p>
                        <p className="text-sm text-gray-600">
                          Subtotal: Rs {(item.subtotal).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Payment Attempts */}
          {paymentAttempts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Attempts</h2>
              <div className="space-y-3">
                {paymentAttempts.map((attempt, idx) => (
                  <div key={idx} className="flex justify-between items-start pb-3 border-b last:pb-0 last:border-b-0">
                    <div>
                      <p className="font-medium">Attempt {attempt.attempt_number}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(attempt.attempted_at).toLocaleString()}
                      </p>
                      {attempt.error_message && (
                        <p className="text-sm text-red-600 mt-1">{attempt.error_message}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          attempt.is_counted_failure
                            ? 'bg-red-100 text-red-900'
                            : 'bg-green-100 text-green-900'
                        }`}
                      >
                        {attempt.is_counted_failure ? 'Failed' : 'Success'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          {auditLogs.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Audit Trail</h2>
              <div className="space-y-4">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="pb-4 border-b last:pb-0 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {log.admin_id || 'System'}
                      </span>
                    </div>
                    {log.changes && (
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Email Delivery (reliability visibility) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Email Delivery</h2>
            {emailLogs.length === 0 ? (
              <p className="text-sm text-gray-600">No emails recorded for this order.</p>
            ) : (
              <div className="space-y-3">
                {emailLogs.map((log: any) => (
                  <div key={log.id} className="pb-3 border-b last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium capitalize">{log.email_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600">{log.recipient_email}</p>
                        {log.error_message && (
                          <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          log.status === 'sent'
                            ? 'bg-green-100 text-green-900'
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-900'
                            : log.status === 'bounced'
                            ? 'bg-orange-100 text-orange-900'
                            : 'bg-yellow-100 text-yellow-900'
                        }`}
                      >
                        {log.status}
                        {log.retry_count > 0 ? ` (retry ${log.retry_count})` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 pb-4 border-b">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>Rs {(order.subtotal).toFixed(0)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span>Rs {(order.tax_amount).toFixed(0)}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery:</span>
                  <span>Rs {(order.delivery_fee).toFixed(0)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between font-semibold text-lg pt-4">
              <span>Total:</span>
              <span>Rs {(order.total_amount).toFixed(0)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Info</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="font-medium capitalize">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                <p
                  className={`font-medium px-3 py-1 rounded text-sm w-fit ${
                    order.payment_status === 'paid'
                      ? 'bg-green-100 text-green-900'
                      : order.payment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-900'
                        : 'bg-red-100 text-red-900'
                  }`}
                >
                  {order.payment_status}
                </p>
              </div>
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status change..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  rows={3}
                  disabled={updatingStatus}
                />
              </div>

              <button
                type="submit"
                disabled={updatingStatus || newStatus === order.order_status}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
