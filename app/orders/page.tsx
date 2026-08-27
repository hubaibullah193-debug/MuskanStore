'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Spinner } from '@/app/components/ui/spinner';
import { Button } from '@/app/components/ui/button';
import { Alert } from '@/app/components/ui/alert';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserOrders } from '@/server/actions/orders';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  item_count: number;
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchOrders = async () => {
      try {
        const data = await getUserOrders(user.id);
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">My Orders</h1>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {orders.length === 0 ? (
          <div className="bg-card border border-border rounded-lg shadow-sm p-12 text-center">
            <p className="text-text-secondary mb-4">You haven&apos;t placed any orders yet.</p>
            <Button href="/products">Start Shopping</Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-paper-2">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-border hover:bg-paper-2">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        #{order.order_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        Rs {(order.total_amount).toFixed(0)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatusBadge status={order.payment_status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
