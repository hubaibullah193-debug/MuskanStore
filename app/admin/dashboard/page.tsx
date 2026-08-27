'use client';

/**
 * Admin Dashboard - Main Overview
 * Key metrics, recent orders, sales trends, inventory alerts
 */

import { useEffect, useState } from 'react';
import { getAdminDashboardStats } from '@/server/actions/admin-dashboard';
import Link from 'next/link';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { statusTint, toneSolid, Tone } from '@/lib/ui/status-colors';

function Sparkline({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(...data, 1);
  const width = 280;
  const height = 60;
  const barWidth = width / data.length - 1;

  return (
    <div>
      <p className="text-sm text-text-secondary mb-1">{label}</p>
      <svg width={width} height={height} className="block">
        {data.map((value, i) => {
          const barHeight = (value / max) * (height - 4);
          return (
            <rect
              key={i}
              x={i * (barWidth + 1)}
              y={height - barHeight - 2}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={2}
              opacity={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  pending: 'warning',
  pending_payment: 'warning',
  confirmed: 'success',
  shipped: 'info',
  delivered: 'success',
  refund_requested: 'warning',
  refunded: 'neutral',
  cancelled: 'error',
  unknown: 'neutral',
};

const PAYMENT_TONE: Record<string, Tone> = {
  cod: 'success',
  jazz_cash: 'info',
  easypaisa: 'info',
  unknown: 'neutral',
};

function DistributionBar({
  title,
  data,
  toneMap,
}: {
  title: string;
  data: Record<string, number>;
  toneMap: Record<string, Tone>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (total === 0) {
    return <p className="text-text-tertiary text-sm">No data yet</p>;
  }

  return (
    <div>
      <p className="text-sm text-text-secondary mb-2">{title}</p>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-paper-2" role="img" aria-label={title}>
        {entries.map(([key, value]) => (
          <div
            key={key}
            className={toneSolid[toneMap[key] || 'neutral']}
            style={{ width: `${(value / total) * 100}%` }}
            title={`${key.replace(/_/g, ' ')}: ${value}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([key, value]) => (
          <span key={key} className="inline-flex items-center gap-1 text-xs text-text-secondary">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${toneSolid[toneMap[key] || 'neutral']}`} />
            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
            <span className="font-medium text-foreground">{value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    refundRequests: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<Array<{ date: string; orders: number; revenue: number }>>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<Record<string, number>>({});
  const [ordersByPaymentMethod, setOrdersByPaymentMethod] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await getAdminDashboardStats();
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setDailyStats(data.dailyStats);
        setLowStockProducts(data.lowStockProducts);
        setOrdersByStatus(data.ordersByStatus || {});
        setOrdersByPaymentMethod(data.ordersByPaymentMethod || {});
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-text-secondary mt-1">Welcome to the admin dashboard</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Orders</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.totalOrders}</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-success mt-2">
                Rs {(stats.totalRevenue).toFixed(0)}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Pending Orders</p>
              <p className="text-3xl font-bold text-warning mt-2">{stats.pendingOrders}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Refund Requests</p>
              <p className="text-3xl font-bold text-warning mt-2">{stats.refundRequests}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Charts & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Last 14 Days</h2>
          {dailyStats.length > 0 ? (
            <div className="space-y-4">
              <Sparkline
                data={dailyStats.map((d) => d.orders)}
                color="var(--color-accent)"
                label="Orders per day"
              />
              <Sparkline
                data={dailyStats.map((d) => d.revenue)}
                color="var(--color-success)"
                label="Revenue (PKR) per day"
              />
            </div>
          ) : (
            <p className="text-text-tertiary text-sm">No data yet</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-text-tertiary text-sm">All products well stocked</p>
          ) : (
            <ul className="space-y-3">
              {lowStockProducts.map((item, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{item.product?.name}</p>
                    <p className="text-text-tertiary text-xs">{item.product?.sku}</p>
                  </div>
                  <span
                    className={`ml-3 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                      item.quantity === 0
                        ? statusTint.error
                        : statusTint.warning
                    }`}
                  >
                    {item.quantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Order Analytics */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Order Analytics</h2>
        <div className="space-y-6">
          <DistributionBar
            title="Orders by status"
            data={ordersByStatus}
            toneMap={STATUS_TONE}
          />
          <DistributionBar
            title="Orders by payment method"
            data={ordersByPaymentMethod}
            toneMap={PAYMENT_TONE}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/orders"
          className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow hover:bg-paper-2"
        >
          <p className="text-lg font-semibold text-foreground">View All Orders</p>
          <p className="text-text-secondary text-sm mt-1">Manage all customer orders</p>
        </Link>

        <Link
          href="/admin/refunds"
          className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow hover:bg-paper-2"
        >
          <p className="text-lg font-semibold text-foreground">Handle Refunds</p>
          <p className="text-text-secondary text-sm mt-1">Review refund requests</p>
        </Link>

        <Link
          href="/admin/products"
          className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow hover:bg-paper-2"
        >
          <p className="text-lg font-semibold text-foreground">Manage Products</p>
          <p className="text-text-secondary text-sm mt-1">Add or update products</p>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow hover:bg-paper-2"
        >
          <p className="text-lg font-semibold text-foreground">View Audit Logs</p>
          <p className="text-text-secondary text-sm mt-1">Track all system activities</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
        </div>
        {error ? (
          <div className="p-6 bg-[color-mix(in_oklch,var(--color-error)_12%,white)] text-error border-t border-[color-mix(in_oklch,var(--color-error)_35%,transparent)]">
            {error}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            No orders yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-paper-2 border-t border-border">
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
                    Status
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
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-paper-2">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-accent">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.guest_email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">
                      Rs {order.total_amount.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={order.order_status} />
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
      </div>
    </div>
  );
}
