'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { submitContactForm } from '@/server/actions/contact';

export default function ContactPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    orderId: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from auth state
  useState(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await submitContactForm({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        orderId: formData.orderId || undefined,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'Failed to submit message');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h1>
            <p className="text-gray-600 mb-6">
              Thank you for reaching out. We&apos;ll get back to you within 1-2 business days.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 text-white rounded-lg"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-600 mb-8">
          Have a question or need help? Fill out the form below and we&apos;ll get back to you.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                  >
                    <option value="">Select a subject</option>
                    <option value="Order Issue">Order Issue</option>
                    <option value="Shipping Question">Shipping Question</option>
                    <option value="Return/Refund">Return/Refund</option>
                    <option value="Product Inquiry">Product Inquiry</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order ID (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    placeholder="e.g. ORD-12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us how we can help..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 resize-y"
                  style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 text-white rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-dark)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Get in Touch</h2>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <div className="font-medium text-gray-900">Email</div>
                  <a href="mailto:support@muskancare.com" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
                    support@muskancare.com
                  </a>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Phone</div>
                  <p>+92 300 1234567</p>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Business Hours</div>
                  <p>Monday - Saturday: 9:00 AM - 6:00 PM</p>
                  <p>Sunday: Closed</p>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Response Time</div>
                  <p>We typically respond within 1-2 business days.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h2>
              <div className="space-y-2 text-sm">
                <Link href="/shipping" className="block hover:underline" style={{ color: 'var(--color-accent)' }}>
                  Shipping Info & Returns
                </Link>
                <Link href="/track-order" className="block hover:underline" style={{ color: 'var(--color-accent)' }}>
                  Track Your Order
                </Link>
                <Link href="/account" className="block hover:underline" style={{ color: 'var(--color-accent)' }}>
                  My Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
