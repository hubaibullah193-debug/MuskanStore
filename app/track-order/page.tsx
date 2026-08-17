'use client';

/**
 * Track Order Page
 * Allows guests to view order status using email + token
 * No authentication required - security via token validation
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Order</h1>
        <p className="text-gray-600 mb-6">
          Enter your email and tracking code to view your order status
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{
                '--tw-ring-color': 'var(--color-accent)',
              } as React.CSSProperties}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The email you used for checkout
            </p>
          </div>

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
              Tracking Code
            </label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your tracking code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Sent in your order confirmation email
            </p>
          </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50"
              style={{
                backgroundColor: isLoading ? 'var(--color-accent-light)' : 'var(--color-accent)',
                transition: 'background-color 200ms cubic-bezier(0.33, 1, 0.68, 1)',
              }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
            >
              {isLoading ? 'Searching...' : 'Track Order'}
            </button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-gray-600">
            Don&apos;t have your tracking code?{' '}
            <Link href="/" className="text-sm underline" style={{color: 'var(--color-accent)'}}>
              Contact support
            </Link>
          </p>
        </div>

        <div className="mt-4">
          <Link
            href="/"
            className="text-sm underline"
            style={{color: 'var(--color-accent)'}}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
