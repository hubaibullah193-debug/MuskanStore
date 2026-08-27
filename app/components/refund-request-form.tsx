// app/components/refund-request-form.tsx
'use client';

import { useState } from 'react';
import { createRefundRequest } from '@/server/actions/refunds';
import { Button } from '@/app/components/ui/button';
import { Alert } from '@/app/components/ui/alert';

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
      <Alert variant="success">
        Refund request submitted successfully! Our team will review your request and respond within 2-3 business days.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-paper-2 p-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-secondary">
          Refund Amount (PKR)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-secondary">PKR</span>
          <input
            type="number"
            value={refundAmount}
            onChange={e => setRefundAmount(Math.min(parseFloat(e.target.value), orderTotal))}
            min="0"
            max={orderTotal}
            step="0.01"
            className="w-full rounded-md border border-border bg-paper-3 py-2 pl-12 pr-4 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <p className="mt-1 text-xs text-secondary">
          Maximum: PKR {orderTotal.toFixed(2)}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-secondary">
          Reason for Refund *
        </label>
        <select
          value={reason}
          onChange={e => setReason(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-paper-3 px-4 py-2 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
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
        <Alert variant="error">{error}</Alert>
      )}

      <Button
        type="submit"
        disabled={loading || !reason}
        className="w-full"
      >
        {loading ? 'Submitting...' : 'Submit Refund Request'}
      </Button>

      <p className="text-center text-xs text-secondary">
        Our team will review your request and contact you within 2-3 business days.
      </p>
    </form>
  );
}
