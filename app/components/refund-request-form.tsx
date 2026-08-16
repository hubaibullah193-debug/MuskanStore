// app/components/refund-request-form.tsx
'use client';

import { useState } from 'react';
import { createRefundRequest } from '@/server/actions/refunds';

interface RefundRequestFormProps {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
}

export function RefundRequestForm({ orderId, orderNumber, orderTotal }: RefundRequestFormProps) {
  const [refundAmount, setRefundAmount] = useState(orderTotal);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createRefundRequest({
        orderId,
        refundAmount,
        reason,
      });

      if (!result.success) {
        setError(result.error || 'Failed to create refund request');
        return;
      }

      setSuccess(true);
      setReason('');
      setRefundAmount(orderTotal);

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <p className="text-green-900 font-medium">
          Refund request submitted successfully! Our team will review your request and respond within 2-3 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 rounded-lg p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Refund Amount (PKR)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-500">PKR</span>
          <input
            type="number"
            value={refundAmount}
            onChange={e => setRefundAmount(Math.min(parseFloat(e.target.value), orderTotal))}
            min="0"
            max={orderTotal}
            step="0.01"
            className="w-full pl-12 pr-4 py-2 border rounded-lg"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Maximum: PKR {orderTotal.toFixed(2)}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reason for Refund *
        </label>
        <select
          value={reason}
          onChange={e => setReason(e.target.value)}
          required
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a reason...</option>
          <option value="defective">Defective Product</option>
          <option value="not_as_described">Not as Described</option>
          <option value="duplicate_order">Duplicate Order</option>
          <option value="changed_mind">Changed Mind</option>
          <option value="damaged_in_shipping">Damaged in Shipping</option>
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-900 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !reason}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
      >
        {loading ? 'Submitting...' : 'Submit Refund Request'}
      </button>

      <p className="text-xs text-gray-600 text-center">
        Our team will review your request and contact you within 2-3 business days.
      </p>
    </form>
  );
}
