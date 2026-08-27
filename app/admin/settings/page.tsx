'use client';

/**
 * Admin Settings Page
 * Store configuration: tax, fees, email, delivery, low stock thresholds
 */

import { useState, useEffect } from 'react';
import { getSettings, updateSettingsAction } from '@/server/actions/admin-settings';

interface Settings {
  support_email?: string;
  support_phone?: string;
  website_url?: string;
  tax_rate?: number;
  delivery_fee?: number;
  low_stock_threshold?: number;
  email_provider?: 'resend' | 'sendgrid';
  [key: string]: any;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSettings();
      setSettings(data || {});
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate before saving
      if (settings.tax_rate !== undefined && (settings.tax_rate < 0 || settings.tax_rate > 100)) {
        setError('Tax rate must be between 0 and 100');
        return;
      }

      if (settings.delivery_fee !== undefined && settings.delivery_fee < 0) {
        setError('Delivery fee cannot be negative');
        return;
      }

      if (settings.low_stock_threshold !== undefined && settings.low_stock_threshold < 0) {
        setError('Low stock threshold cannot be negative');
        return;
      }

      await updateSettingsAction({
        support_email: settings.support_email,
        support_phone: settings.support_phone,
        website_url: settings.website_url,
        tax_rate: settings.tax_rate,
        delivery_fee: settings.delivery_fee,
        low_stock_threshold: settings.low_stock_threshold,
        email_provider: settings.email_provider,
      });

      setSuccess('Settings saved successfully');
      loadSettings();
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
        return <div className="text-center text-text-tertiary py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Store Settings</h1>
        <p className="text-text-secondary mt-1">Configure global store settings and integrations</p>
      </div>

      {/* Messages */}
      {error && (
          <div className="p-4 bg-[color-mix(in_oklch,var(--color-error)_12%,white)] border border-[color-mix(in_oklch,var(--color-error)_35%,transparent)] text-error rounded-lg">
          {error}
        </div>
      )}
      {success && (
          <div className="p-4 bg-[color-mix(in_oklch,var(--color-success)_12%,white)] border border-[color-mix(in_oklch,var(--color-success)_35%,transparent)] text-success rounded-lg">
          {success}
        </div>
      )}

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Contact Settings */}
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4 text-foreground">Contact Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={settings.support_email || ''}
                onChange={(e) => handleChange('support_email', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="support@example.com"
              />
              <p className="text-xs text-text-tertiary mt-1">Email for customer support inquiries</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Support Phone
              </label>
              <input
                type="tel"
                value={settings.support_phone || ''}
                onChange={(e) => handleChange('support_phone', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="+92 300 1234567"
              />
              <p className="text-xs text-text-tertiary mt-1">Customer support phone number</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={settings.website_url || ''}
                onChange={(e) => handleChange('website_url', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="https://example.com"
              />
              <p className="text-xs text-text-tertiary mt-1">Used in email templates and redirects</p>
            </div>
          </div>
        </div>

        {/* Pricing Settings */}
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4 text-foreground">Pricing & Fees</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={settings.tax_rate || 17}
                onChange={(e) =>
                  handleChange('tax_rate', e.target.value ? parseFloat(e.target.value) : 0)
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="17"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-text-tertiary mt-1">Applied to all orders</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Delivery Fee (₨)
              </label>
              <input
                type="number"
                value={settings.delivery_fee || 0}
                onChange={(e) =>
                  handleChange('delivery_fee', e.target.value ? parseFloat(e.target.value) : 0)
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-text-tertiary mt-1">Added to checkout total</p>
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4 text-foreground">Inventory Management</h2>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Default Low Stock Threshold
            </label>
            <input
              type="number"
              value={settings.low_stock_threshold || 5}
              onChange={(e) =>
                handleChange('low_stock_threshold', e.target.value ? parseInt(e.target.value) : 0)
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="5"
              min="0"
              step="1"
            />
            <p className="text-xs text-text-tertiary mt-1">Applied to new products by default</p>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4 text-foreground">Email Configuration</h2>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Email Provider
            </label>
            <select
              value={settings.email_provider || 'resend'}
              onChange={(e) => handleChange('email_provider', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="resend">Resend</option>
              <option value="sendgrid">SendGrid</option>
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              Configure API keys in environment variables
            </p>
          </div>

          <div className="mt-4 p-3 bg-[color-mix(in_oklch,var(--color-info)_12%,white)] border border-[color-mix(in_oklch,var(--color-info)_35%,transparent)] rounded-lg">
            <p className="text-sm text-info">
              <strong>API Keys:</strong> Set environment variables for email provider:
            </p>
            {settings.email_provider === 'resend' ? (
              <p className="text-xs text-info mt-2">
                <code>EMAIL_PROVIDER_KEY=your_resend_api_key</code>
              </p>
            ) : (
              <p className="text-xs text-info mt-2">
                <code>EMAIL_PROVIDER_KEY=your_sendgrid_api_key</code>
              </p>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-paper-2 p-6 rounded-lg border border-border">
          <h2 className="text-lg font-bold mb-4 text-foreground">System Information</h2>
          <div className="space-y-2 text-sm text-text-secondary">
            <div>
              <span className="font-medium">Environment:</span> {process.env.NODE_ENV || 'development'}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
