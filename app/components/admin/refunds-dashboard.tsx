// app/components/admin/refunds-dashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { StatusBadge } from '@/app/components/ui/status-badge';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Refund Management</h2>
        <div className="flex gap-2">
          {(['all', 'requested', 'approved', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-paper-2 text-text-secondary hover:bg-border'
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
        <div className="text-center py-8 text-text-tertiary">No refunds found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-paper-2 border-b border-border">
                <th className="px-4 py-2 text-left font-semibold text-foreground">Order</th>
                <th className="px-4 py-2 text-left font-semibold text-foreground">Amount</th>
                <th className="px-4 py-2 text-left font-semibold text-foreground">Reason</th>
                <th className="px-4 py-2 text-left font-semibold text-foreground">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-foreground">Requested</th>
                <th className="px-4 py-2 text-left font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.map(refund => (
                <tr key={refund.id} className="border-b border-border hover:bg-paper-2">
                  <td className="px-4 py-3">{refund.order?.order_number || 'N/A'}</td>
                  <td className="px-4 py-3 font-semibold">PKR {refund.refund_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{refund.reason}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={refund.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">
                    {new Date(refund.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {refund.status === 'requested' && (
                      <button
                        onClick={() => setSelectedRefund(refund.id)}
                        className="text-accent hover:text-accent-dark text-sm font-medium"
                      >
                        Review
                      </button>
                    )}
                    {refund.status === 'approved' && (
                      <button
                        onClick={() => handleComplete(refund.id)}
                        disabled={actionLoading}
                        className="text-success hover:underline text-sm font-medium disabled:opacity-50"
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
          <div className="bg-card rounded-lg shadow-lg max-w-md w-full p-6 border border-border">
            <h3 className="text-xl font-bold mb-4 text-foreground">Review Refund Request</h3>

            {refunds.find(r => r.id === selectedRefund) && (
              <div className="space-y-4">
                <div className="bg-paper-2 p-4 rounded">
                  <p className="text-sm text-text-secondary mb-2">Amount</p>
                  <p className="text-lg font-semibold text-foreground">
                    PKR {refunds.find(r => r.id === selectedRefund)!.refund_amount.toFixed(2)}
                  </p>
                </div>

                <div className="bg-paper-2 p-4 rounded">
                  <p className="text-sm text-text-secondary mb-2">Reason</p>
                  <p className="text-sm text-foreground">{refunds.find(r => r.id === selectedRefund)!.reason}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-secondary">Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                    rows={3}
                    placeholder="Optional notes for approval..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-secondary">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                    rows={3}
                    placeholder="Why are you rejecting this request?"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleReject(selectedRefund)}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="flex-1 px-4 py-2 bg-error text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRefund)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-success text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
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
                    className="px-4 py-2 bg-paper-2 text-foreground rounded-lg hover:bg-border disabled:opacity-50 font-medium"
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
