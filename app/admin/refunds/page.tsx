'use client';

/**
 * Admin Dashboard - Refunds Management
 * Handle refund requests, approve/reject, process refunds
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'requested' | 'approved' | 'rejected' | 'all'>('all');

  useEffect(() => {
    const fetchRefunds = async () => {
      try {
        let query = supabase
          .from('orders')
          .select('*')
          .or('order_status.eq.refund_requested,order_status.eq.refunded')
          .order('created_at', { ascending: false });

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        let filtered = data || [];
        if (filter !== 'all') {
          filtered = filtered.filter((order) => {
            if (filter === 'requested') return order.order_status === 'refund_requested';
            if (filter === 'approved') return order.order_status === 'refunded';
            return true;
          });
        }

        setRefunds(filtered);
      } catch (err: any) {
        setError(err.message || 'Failed to load refunds');
      } finally {
        setLoading(false);
      }
    };

    fetchRefunds();
  }, [filter]);

  const getTotalRefundAmount = () => {
    return refunds.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading refunds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Refunds</h1>
        <p className="text-gray-600 mt-1">Manage refund requests and process refunds</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            All Refunds
          </button>
          <button
            onClick={() => setFilter('requested')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'requested'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            Requested
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            Processed
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Refunds</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{refunds.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Pending Requests</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {refunds.filter((r) => r.order_status === 'refund_requested').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Amount</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            Rs {(getTotalRefundAmount() / 100).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Refunds List */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">{error}</p>
        </div>
      ) : refunds.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">No refunds found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
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
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {refunds.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-blue-600 hover:text-blue-900"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium">{order.guest_email || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    Rs {(order.total_amount / 100).toFixed(0)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 truncate max-w-xs">
                      {order.refund_reason || 'No reason provided'}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.order_status === 'refund_requested'
                          ? 'bg-orange-100 text-orange-900'
                          : 'bg-green-100 text-green-900'
                      }`}
                    >
                      {order.order_status === 'refund_requested' ? 'Requested' : 'Processed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.order_status === 'refund_requested' && (
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                      >
                        Review
                      </Link>
                    )}
                    {order.order_status === 'refunded' && (
                      <span className="text-gray-600 text-sm">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
