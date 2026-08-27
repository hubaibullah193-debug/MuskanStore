'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { submitContactForm } from '@/server/actions/contact';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Alert } from '@/app/components/ui/alert';

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
      <div className="min-h-screen bg-paper py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="bg-card border border-border rounded-lg shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[color-mix(in_oklch,var(--color-success)_12%,white)] flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Message Sent!</h1>
            <p className="text-text-secondary mb-6">
              Thank you for reaching out. We&apos;ll get back to you within 1-2 business days.
            </p>
            <Button href="/">Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Contact Us</h1>
        <p className="text-text-secondary mb-8">
          Have a question or need help? Fill out the form below and we&apos;ll get back to you.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg shadow-sm p-6 space-y-4">
              {error && (
                <Alert variant="error">{error}</Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Name *
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Subject *
                  </label>
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent bg-card text-foreground"
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
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Order ID (optional)
                  </label>
                  <Input
                    type="text"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    placeholder="e.g. ORD-12345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us how we can help..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent resize-y bg-card text-foreground"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>

          {/* Contact Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Get in Touch</h2>
              <div className="space-y-4 text-sm text-text-secondary">
                <div>
                  <div className="font-medium text-foreground">Email</div>
                  <a href="mailto:support@muskancare.com" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
                    support@muskancare.com
                  </a>
                </div>
                <div>
                  <div className="font-medium text-foreground">Phone</div>
                  <p>+92 300 1234567</p>
                </div>
                <div>
                  <div className="font-medium text-foreground">Business Hours</div>
                  <p>Monday - Saturday: 9:00 AM - 6:00 PM</p>
                  <p>Sunday: Closed</p>
                </div>
                <div>
                  <div className="font-medium text-foreground">Response Time</div>
                  <p>We typically respond within 1-2 business days.</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Quick Links</h2>
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
