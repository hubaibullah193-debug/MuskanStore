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
import { StatusBadge } from '@/app/components/ui/status-badge';
import { statusTint } from '@/lib/ui/status-colors';

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

  const getEmailStatusTone = (status: string) => {
    if (status === 'sent') return statusTint.success;
    if (status === 'failed') return statusTint.error;
    if (status === 'bounced') return statusTint.warning;
    return statusTint.warning;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-[color-mix(in_oklch,var(--color-error)_12%,white)] border border-[color-mix(in_oklch,var(--color-error)_35%,transparent)] rounded-lg p-6">
        <h1 className="text-2xl font-bold text-error mb-2">Error</h1>
        <p className="text-error mb-4">{error || 'Order not found'}</p>
        <Link href="/admin/orders" className="text-error hover:opacity-80 underline">
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
          <Link href="/admin/orders" className="text-accent hover:text-accent-dark mb-2 inline-block">
            ← Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Order {order.order_number}</h1>
          <p className="text-text-secondary mt-1">
            Created {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={order.order_status} className="text-sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Email</p>
                <p className="font-medium">{order.guest_email || 'N/A'}</p>
              </div>
              {order.delivery_address?.phone && (
                <div>
                  <p className="text-sm text-text-secondary">Phone</p>
                  <p className="font-medium">{order.delivery_address.phone}</p>
                </div>
              )}
              {order.delivery_address?.recipient_name && (
                <div className="col-span-2">
                  <p className="text-sm text-text-secondary">Recipient Name</p>
                  <p className="font-medium">{order.delivery_address.recipient_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
            <div className="text-foreground space-y-1">
              <p>{order.delivery_address?.street}</p>
              <p>
                {order.delivery_address?.city}
                {order.delivery_address?.postal_code && `, ${order.delivery_address.postal_code}`}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
                {Array.isArray(order.items) &&
                  order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start pb-4 border-b last:pb-0 last:border-b-0">
                      <div>
                        {item.is_bundle && (
                          <span className={`mr-1 rounded px-1.5 py-0.5 text-xs font-semibold align-middle ${statusTint.info}`}>
                            Bundle
                          </span>
                        )}
                        <p className="font-medium">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-text-secondary">{item.variant_name}</p>
                        )}
                        <p className="text-sm text-text-secondary">Qty: {item.quantity}</p>
                        {item.is_bundle && Array.isArray(item.bundle_items) && (
                          <ul className="mt-1 space-y-0.5 text-sm text-text-tertiary">
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
                        <p className="text-sm text-text-secondary">
                          Subtotal: Rs {(item.subtotal).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Payment Attempts */}
          {paymentAttempts.length > 0 && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Attempts</h2>
              <div className="space-y-3">
                {paymentAttempts.map((attempt, idx) => (
                  <div key={idx} className="flex justify-between items-start pb-3 border-b last:pb-0 last:border-b-0">
                    <div>
                      <p className="font-medium">Attempt {attempt.attempt_number}</p>
                      <p className="text-sm text-text-secondary">
                        {new Date(attempt.attempted_at).toLocaleString()}
                      </p>
                      {attempt.error_message && (
                        <p className="text-sm text-error mt-1">{attempt.error_message}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          attempt.is_counted_failure
                            ? statusTint.error
                            : statusTint.success
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
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold mb-4">Audit Trail</h2>
              <div className="space-y-4">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="pb-4 border-b last:pb-0 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-text-secondary">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs bg-paper-2 text-text-secondary px-2 py-1 rounded">
                        {log.admin_id || 'System'}
                      </span>
                    </div>
                    {log.changes && (
                      <pre className="text-xs bg-paper-2 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Email Delivery (reliability visibility) */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Email Delivery</h2>
            {emailLogs.length === 0 ? (
              <p className="text-sm text-text-secondary">No emails recorded for this order.</p>
            ) : (
              <div className="space-y-3">
                {emailLogs.map((log: any) => (
                  <div key={log.id} className="pb-3 border-b last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium capitalize">{log.email_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-text-secondary">{log.recipient_email}</p>
                        {log.error_message && (
                          <p className="text-sm text-error mt-1">{log.error_message}</p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getEmailStatusTone(log.status)}`}
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
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 pb-4 border-b">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal:</span>
                <span>Rs {(order.subtotal).toFixed(0)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Tax:</span>
                  <span>Rs {(order.tax_amount).toFixed(0)}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-text-secondary">
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
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Info</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-secondary mb-1">Payment Method</p>
                <p className="font-medium capitalize">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">Payment Status</p>
                <div className="font-medium w-fit">
                  <StatusBadge status={order.payment_status} />
                </div>
              </div>
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status change..."
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                  rows={3}
                  disabled={updatingStatus}
                />
              </div>

              <button
                type="submit"
                disabled={updatingStatus || newStatus === order.order_status}
                className="w-full bg-accent text-accent-foreground py-2 rounded-lg font-medium hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
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
