'use client';

/**
 * Track Order Page
 * Allows guests to view order status using email + token
 * No authentication required - security via token validation
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Alert } from '@/app/components/ui/alert';

export default function TrackOrderPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      if (!email || !token) {
        setError('Email and tracking code required');
        return;
      }

      // Fetch order by email and token
      const response = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Order not found');
      }

      const { orderId } = await response.json();
      router.push(`/order-confirmation/${orderId}?token=${encodeURIComponent(token)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find order';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper py-12 px-4">
      <div className="max-w-md mx-auto bg-card border border-border rounded-lg shadow-sm p-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Track Your Order</h1>
        <p className="text-text-secondary mb-6">
          Enter your email and tracking code to view your order status
        </p>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
              Email Address
            </label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-text-tertiary mt-1">
              The email you used for checkout
            </p>
          </div>

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-text-secondary mb-1">
              Tracking Code
            </label>
            <Input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your tracking code"
              className="font-mono text-sm"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-text-tertiary mt-1">
              Sent in your order confirmation email
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Searching...' : 'Track Order'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-text-secondary">
            Don&apos;t have your tracking code?{' '}
            <Link href="/contact" className="text-sm underline" style={{ color: 'var(--color-accent)' }}>
              Contact support
            </Link>
          </p>
        </div>

        <div className="mt-4">
          <Link
            href="/"
            className="text-sm underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
