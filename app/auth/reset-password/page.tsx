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
      <div className="min-h-screen flex items-center justify-center p-4" style={{
      backgroundImage: 'linear-gradient(to bottom right, rgba(52, 80, 64, 0.05), rgba(52, 80, 64, 0.08))',
    }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">✓</div>
              <h1 className="text-2xl font-bold text-gray-900">Password Reset</h1>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-gray-600">
                Your password has been reset successfully. You can now log in with your new
                password.
              </p>

              <div className="pt-4">
                <Link
                  href="/auth/login"
                  className="inline-block px-6 py-2 text-white rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-accent)',
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      backgroundImage: 'linear-gradient(to bottom right, rgba(52, 80, 64, 0.05), rgba(52, 80, 64, 0.08))',
    }}>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">MStore</h1>
          <p className="text-gray-600 mt-2">Set your new password</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{
                  '--tw-ring-color': 'var(--color-accent)',
                } as React.CSSProperties}
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="passwordConfirm"
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{
                  '--tw-ring-color': 'var(--color-accent)',
                } as React.CSSProperties}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !tokenHash}
              className="w-full text-white py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                backgroundColor: loading || !tokenHash ? 'var(--color-accent-light)' : 'var(--color-accent)',
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
              className="block text-center text-sm text-blue-600 hover:text-blue-700"
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
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
