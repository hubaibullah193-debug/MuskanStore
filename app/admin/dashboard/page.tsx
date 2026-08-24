'use client';

/**
 * Admin Dashboard - Main Overview
 * Key metrics, recent orders, sales trends, inventory alerts
 */

import { useEffect, useState } from 'react';
import { getAdminDashboardStats } from '@/server/actions/admin-dashboard';
import Link from 'next/link';

function Sparkline({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(...data, 1);
  const width = 280;
  const height = 60;
  const barWidth = width / data.length - 1;

  return (
    <div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
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
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getOrderStatusColor = (status: string) => {
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
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to the admin dashboard</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                Rs {(stats.totalRevenue / 100).toFixed(0)}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Orders</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingOrders}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Refund Requests</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.refundRequests}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Charts & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Last 14 Days</h2>
          {dailyStats.length > 0 ? (
            <div className="space-y-4">
              <Sparkline
                data={dailyStats.map((d) => d.orders)}
                color="var(--color-accent)"
                label="Orders per day"
              />
              <Sparkline
                data={dailyStats.map((d) => d.revenue / 100)}
                color="#22c55e"
                label="Revenue (PKR) per day"
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-gray-500 text-sm">All products well stocked</p>
          ) : (
            <ul className="space-y-3">
              {lowStockProducts.map((item, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.product?.name}</p>
                    <p className="text-gray-500 text-xs">{item.product?.sku}</p>
                  </div>
                  <span
                    className={`ml-3 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                      item.quantity === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/orders"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow hover:bg-gray-50"
        >
          <p className="text-lg font-semibold text-gray-900">View All Orders</p>
          <p className="text-gray-600 text-sm mt-1">Manage all customer orders</p>
        </Link>

        <Link
          href="/admin/refunds"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow hover:bg-gray-50"
        >
          <p className="text-lg font-semibold text-gray-900">Handle Refunds</p>
          <p className="text-gray-600 text-sm mt-1">Review refund requests</p>
        </Link>

        <Link
          href="/admin/products"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow hover:bg-gray-50"
        >
          <p className="text-lg font-semibold text-gray-900">Manage Products</p>
          <p className="text-gray-600 text-sm mt-1">Add or update products</p>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow hover:bg-gray-50"
        >
          <p className="text-lg font-semibold text-gray-900">View Audit Logs</p>
          <p className="text-gray-600 text-sm mt-1">Track all system activities</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
        </div>
        {error ? (
          <div className="p-6 bg-red-50 text-red-700">
            {error}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            No orders yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-600">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.guest_email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">
                      Rs {(order.total_amount / 100).toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(
                          order.order_status
                        )}`}
                      >
                        {order.order_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm"
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
