'use client';

import { Suspense, useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { confirmPasswordReset } from '@/lib/auth/server';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get('token_hash');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    passwordConfirm: '',
  });

  useEffect(() => {
    if (!tokenHash) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [tokenHash]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!tokenHash) {
        setError('Reset token is missing');
        return;
      }

      if (!formData.password || !formData.passwordConfirm) {
        setError('Both password fields are required');
        return;
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      if (formData.password !== formData.passwordConfirm) {
        setError('Passwords do not match');
        return;
      }

      await confirmPasswordReset(tokenHash, formData.password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
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
                Password Reset
              </h1>
            </div>

            <div className="space-y-4 text-center">
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Your password has been reset successfully. You can now log in with your new
                password.
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
                  Go to Login
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
            Set your new password
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
            <div>
              <label
                htmlFor="password"
                className="block mb-1.5"
                style={{
                  fontSize: 'var(--text-3)',
                  fontWeight: 'var(--font-weight-label)',
                  color: 'var(--color-text)',
                }}
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full"
                placeholder="••••••••"
                required
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                At least 8 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="block mb-1.5"
                style={{
                  fontSize: 'var(--text-3)',
                  fontWeight: 'var(--font-weight-label)',
                  color: 'var(--color-text)',
                }}
              >
                Confirm Password
              </label>
              <input
                id="passwordConfirm"
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="w-full"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !tokenHash}
              className="w-full py-2.5 rounded-lg transition-colors disabled:cursor-not-allowed"
              style={{
                fontWeight: 'var(--font-weight-ui)',
                backgroundColor: loading || !tokenHash ? 'var(--color-accent-light)' : 'var(--color-accent)',
                color: 'white',
                opacity: loading || !tokenHash ? 0.7 : 1,
              }}
              onMouseEnter={(e) => !(loading || !tokenHash) && (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
              onMouseLeave={(e) => !(loading || !tokenHash) && (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="block text-center text-sm"
              style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-label)' }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen"
          style={{ backgroundColor: 'var(--color-paper)' }}
        />
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
