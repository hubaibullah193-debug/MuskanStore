'use client';

/**
 * Admin Dashboard - Orders Management
 * View, filter, and manage all orders
 * Update order status, handle refunds, view audit logs
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { getAdminOrders, exportOrdersCSV } from '@/server/actions/admin-orders';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { orders } = await getAdminOrders(
          1,
          1000,
          filter !== 'all' ? { status: filter } : undefined
        );
        setOrders(orders || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [filter]);

  const filteredOrders = orders.filter((order) =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.guest_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      const csv = await exportOrdersCSV(
        filter !== 'all' ? { status: filter } : undefined
      );
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `orders-${filter === 'all' ? 'all' : filter}-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export orders');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-text-secondary mt-1">Manage all customer orders</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Search by Order # or Email
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Order Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="pending_payment">Awaiting Payment</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="refund_requested">Refund Requested</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {error ? (
        <div className="bg-[color-mix(in_oklch,var(--color-error)_12%,white)] border border-[color-mix(in_oklch,var(--color-error)_35%,transparent)] rounded-lg p-6">
          <p className="text-error">{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-paper-2 border border-border rounded-lg p-6 text-center">
          <p className="text-text-secondary">No orders found</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-paper-2 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Order Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-paper-2">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-accent hover:text-accent-dark"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {order.guest_email || 'N/A'}
                      </p>
                      {order.delivery_address?.recipient_name && (
                        <p className="text-sm text-text-secondary">
                          {order.delivery_address.recipient_name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold">
                      Rs {(order.total_amount).toFixed(0)}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={order.order_status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={order.payment_status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-accent hover:text-accent-dark font-medium text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <p className="text-text-secondary text-sm">Total Orders</p>
          <p className="text-3xl font-bold text-foreground mt-2">{orders.length}</p>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <p className="text-text-secondary text-sm">Pending Payment</p>
          <p className="text-3xl font-bold text-warning mt-2">
            {orders.filter((o) => o.payment_status === 'pending').length}
          </p>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <p className="text-text-secondary text-sm">Confirmed</p>
          <p className="text-3xl font-bold text-success mt-2">
            {orders.filter((o) => o.order_status === 'confirmed').length}
          </p>
        </div>
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <p className="text-text-secondary text-sm">Refund Requests</p>
          <p className="text-3xl font-bold text-warning mt-2">
            {orders.filter((o) => o.order_status === 'refund_requested').length}
          </p>
        </div>
      </div>
    </div>
  );
}
