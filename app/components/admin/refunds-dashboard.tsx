// app/components/admin/refunds-dashboard.tsx
'use client';

import { useState, useEffect } from 'react';

interface Refund {
  id: string;
  order_id: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
  refund_amount: number;
  reason: string;
  admin_notes?: string;
  rejection_reason?: string;
  requested_by?: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  completed_at?: string;
}

interface Order {
  order_number: string;
  guest_email?: string;
  user_id?: string;
}

export function RefundsDashboard() {
  const [refunds, setRefunds] = useState<(Refund & { order?: Order })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'requested' | 'approved' | 'completed'>('requested');
  const [selectedRefund, setSelectedRefund] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRefunds();
  }, [filter]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/refunds?status=${filter}`);
      if (!response.ok) throw new Error('Failed to fetch refunds');
      const data = await response.json();
      setRefunds(data.refunds || []);
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (refundId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/refunds/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundId, notes: adminNotes }),
      });

      if (!response.ok) throw new Error('Failed to approve refund');

      setAdminNotes('');
      setSelectedRefund(null);
      fetchRefunds();
    } catch (error) {
      console.error('Error approving refund:', error);
      alert('Failed to approve refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (refundId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/refunds/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundId, rejectionReason }),
      });

      if (!response.ok) throw new Error('Failed to reject refund');

      setRejectionReason('');
      setSelectedRefund(null);
      fetchRefunds();
    } catch (error) {
      console.error('Error rejecting refund:', error);
      alert('Failed to reject refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (refundId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/refunds/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundId }),
      });

      if (!response.ok) throw new Error('Failed to complete refund');

      setSelectedRefund(null);
      fetchRefunds();
    } catch (error) {
      console.error('Error completing refund:', error);
      alert('Failed to complete refund');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRefunds = refunds.filter(r =>
    filter === 'all' ? true : r.status === filter
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-50 text-yellow-900';
      case 'approved':
        return 'bg-blue-50 text-blue-900';
      case 'completed':
        return 'bg-green-50 text-green-900';
      case 'rejected':
        return 'bg-red-50 text-red-900';
      default:
        return 'bg-gray-50 text-gray-900';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Refund Management</h2>
        <div className="flex gap-2">
          {(['all', 'requested', 'approved', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading refunds...</div>
      ) : filteredRefunds.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No refunds found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-4 py-2 text-left font-semibold">Order</th>
                <th className="px-4 py-2 text-left font-semibold">Amount</th>
                <th className="px-4 py-2 text-left font-semibold">Reason</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2 text-left font-semibold">Requested</th>
                <th className="px-4 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.map(refund => (
                <tr key={refund.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{refund.order?.order_number || 'N/A'}</td>
                  <td className="px-4 py-3 font-semibold">PKR {refund.refund_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{refund.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor(refund.status)}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(refund.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {refund.status === 'requested' && (
                      <button
                        onClick={() => setSelectedRefund(refund.id)}
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        Review
                      </button>
                    )}
                    {refund.status === 'approved' && (
                      <button
                        onClick={() => handleComplete(refund.id)}
                        disabled={actionLoading}
                        className="text-green-600 hover:underline text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading ? 'Processing...' : 'Mark Complete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Review Refund Request</h3>

            {refunds.find(r => r.id === selectedRefund) && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-2">Amount</p>
                  <p className="text-lg font-semibold">
                    PKR {refunds.find(r => r.id === selectedRefund)!.refund_amount.toFixed(2)}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-2">Reason</p>
                  <p className="text-sm">{refunds.find(r => r.id === selectedRefund)!.reason}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Optional notes for approval..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Why are you rejecting this request?"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleReject(selectedRefund)}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRefund)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRefund(null);
                      setAdminNotes('');
                      setRejectionReason('');
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
