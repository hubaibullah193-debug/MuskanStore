'use client';

/**
 * Forgot Password Page
 * Request password reset link via email
 */

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction } from '@/app/auth/actions';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email) {
        setError('Email is required');
        return;
      }

      await requestPasswordResetAction(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-xl p-8"
            style={{
              backgroundColor: 'var(--color-paper-3)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">✓</div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                Reset Link Sent
              </h1>
            </div>

            <div className="space-y-4 text-center">
              <p style={{ color: 'var(--color-text-secondary)' }}>
                We&apos;ve sent a password reset link to your email. Check your inbox and follow the
                instructions to reset your password.
              </p>

              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                The link expires in 30 minutes. If you don&apos;t see the email, check your spam folder.
              </p>

              <div className="pt-4">
                <Link
                  href="/auth/login"
                  className="inline-block px-6 py-2.5 rounded-lg font-medium transition-colors"
                  style={{
                    fontWeight: 'var(--font-weight-ui)',
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
          >
            MStore
          </h1>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Reset your password
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{
            backgroundColor: 'var(--color-paper-3)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Error Message */}
          {error && (
            <div
              className="mb-6 p-4 rounded-lg text-sm flex items-start gap-3"
              style={{
                backgroundColor: 'color-mix(in oklch, var(--color-error) 8%, white)',
                border: '1px solid color-mix(in oklch, var(--color-error) 30%, transparent)',
                color: 'var(--color-error)',
              }}
              role="alert"
            >
              <svg
                className="w-5 h-5 mt-0.5 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            <div>
              <label
                htmlFor="email"
                className="block mb-1.5"
                style={{
                  fontSize: 'var(--text-3)',
                  fontWeight: 'var(--font-weight-label)',
                  color: 'var(--color-text)',
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg transition-colors disabled:cursor-not-allowed"
              style={{
                fontWeight: 'var(--font-weight-ui)',
                backgroundColor: loading ? 'var(--color-accent-light)' : 'var(--color-accent)',
                color: 'white',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className="px-2"
                style={{
                  backgroundColor: 'var(--color-paper-3)',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 'var(--text-3)',
                }}
              >
                Or
              </span>
            </div>
          </div>

          {/* Back to Login */}
          <Link
            href="/auth/login"
            className="block w-full text-center py-2.5 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--color-border)',
              fontWeight: 'var(--font-weight-ui)',
              color: 'var(--color-text)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-paper-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Back to Login
          </Link>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-6">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-label)' }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
