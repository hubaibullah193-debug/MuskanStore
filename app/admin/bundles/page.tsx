'use client';

/**
 * Admin Bundles Page
 * Manage bundle offers: create, edit, enable/disable bundles
 */

import { useState, useEffect } from 'react';
import {
  getAllBundles,
  createBundle,
  updateBundle,
  deleteBundle,
} from '@/server/actions/admin-bundles';
import { getAllProducts } from '@/server/actions/admin-products';
import { statusTint } from '@/lib/ui/status-colors';

interface BundleItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  bundle_price: number;
  regular_price: number;
  discount_percent: number;
  is_active: boolean;
  active_from: string | null;
  active_to: string | null;
  created_at: string;
  bundle_items: Array<{
    id: string;
    product_id: string;
    variant_id: string | null;
    quantity: number;
    products: { id: string; name: string; base_price: number }[] | null;
    product_variants: { variant_name: string; price_adjustment: number }[] | null;
  }>;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  is_active: boolean;
}

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [bundleName, setBundleName] = useState('');
  const [bundleDesc, setBundleDesc] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [items, setItems] = useState<BundleItem[]>([
    { product_id: '', quantity: 1 },
    { product_id: '', quantity: 1 },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bundlesData, productsData] = await Promise.all([
        getAllBundles(),
        getAllProducts({ is_active: true }),
      ]);
      setBundles(bundlesData);
      setProducts(productsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!bundleName || !bundlePrice) {
        setError('Name and price are required');
        return;
      }

      const validItems = items.filter((it) => it.product_id);
      if (validItems.length < 2) {
        setError('Bundle must have at least 2 products');
        return;
      }

      const price = parseFloat(bundlePrice);
      if (isNaN(price) || price <= 0) {
        setError('Price must be a positive number');
        return;
      }

      await createBundle({
        name: bundleName,
        description: bundleDesc || undefined,
        bundle_price: price,
        items: validItems,
      });

      setSuccess('Bundle created successfully');
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create bundle');
    }
  };

  const handleToggleActive = async (bundleId: string, isActive: boolean) => {
    try {
      setError(null);
      await updateBundle(bundleId, { is_active: !isActive });
      setSuccess(`Bundle ${isActive ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update bundle');
    }
  };

  const handleDelete = async (bundleId: string) => {
    if (!confirm('Deactivate this bundle?')) return;
    try {
      setError(null);
      await deleteBundle(bundleId);
      setSuccess('Bundle deactivated');
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete bundle');
    }
  };

  const resetForm = () => {
    setBundleName('');
    setBundleDesc('');
    setBundlePrice('');
    setItems([
      { product_id: '', quantity: 1 },
      { product_id: '', quantity: 1 },
    ]);
    setShowForm(false);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 2) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BundleItem, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  // Preview regular price
  const previewRegularPrice = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) return sum;
    return sum + product.base_price * item.quantity;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bundle Offers</h1>
          <p className="text-text-secondary mt-1">Create and manage product bundles</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-dark"
        >
          {showForm ? 'Cancel' : '+ Create Bundle'}
        </button>
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

      {/* Create Form */}
      {showForm && (
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-bold mb-4 text-foreground">Create New Bundle</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Bundle Name *
                </label>
                <input
                  type="text"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="e.g., Hair Care Starter Kit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Bundle Price (PKR) *
                </label>
                <input
                  type="number"
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                />
                {previewRegularPrice > 0 && bundlePrice && (
                  <p className="text-sm text-text-tertiary mt-1">
                    Regular: Rs. {previewRegularPrice.toFixed(0)} &middot; Save{' '}
                    {previewRegularPrice > 0
                      ? Math.round(((previewRegularPrice - parseFloat(bundlePrice || '0')) / previewRegularPrice) * 100)
                      : 0}
                    %
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                value={bundleDesc}
                onChange={(e) => setBundleDesc(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Bundle description..."
                rows={2}
              />
            </div>

            {/* Bundle Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-secondary">
                  Products in Bundle *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-accent hover:text-accent-dark font-medium"
                >
                  + Add Product
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent"
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Rs. {p.base_price})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-20 px-3 py-2 border border-border rounded-lg text-sm text-center focus:ring-2 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 2}
                      className="text-error hover:opacity-80 text-sm disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-foreground border border-border rounded-lg hover:bg-paper-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-dark"
              >
                Create Bundle
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Bundles List */}
      {loading ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-text-tertiary">
          Loading bundles...
        </div>
      ) : bundles.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-text-tertiary">
          No bundles yet. Create your first bundle offer to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`bg-card rounded-lg border p-6 ${
                bundle.is_active ? 'border-border' : 'border-border opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-foreground">{bundle.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        bundle.is_active
                          ? statusTint.success
                          : statusTint.neutral
                      }`}
                    >
                      {bundle.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {bundle.discount_percent > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusTint.error}`}>
                        -{bundle.discount_percent}%
                      </span>
                    )}
                  </div>
                  {bundle.description && (
                    <p className="text-sm text-text-secondary mt-1">{bundle.description}</p>
                  )}
                  <div className="flex gap-6 mt-3 text-sm">
                    <div>
                      <span className="text-text-tertiary">Bundle Price: </span>
                      <span className="font-bold text-foreground">
                        Rs. {Number(bundle.bundle_price).toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Regular: </span>
                      <span className="text-text-secondary line-through">
                        Rs. {Number(bundle.regular_price).toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Items: </span>
                      <span className="text-text-secondary">{bundle.bundle_items.length}</span>
                    </div>
                    {bundle.active_from && (
                      <div>
                        <span className="text-text-tertiary">From: </span>
                        <span className="text-text-secondary">
                          {new Date(bundle.active_from).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {bundle.active_to && (
                      <div>
                        <span className="text-text-tertiary">To: </span>
                        <span className="text-text-secondary">
                          {new Date(bundle.active_to).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Items list */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bundle.bundle_items.map((bi) => (
                      <span
                        key={bi.id}
                        className="text-xs bg-paper-2 text-text-secondary px-2 py-1 rounded"
                      >
                        {bi.products?.[0]?.name || 'Unknown'} x{bi.quantity}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(bundle.id, bundle.is_active)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg ${statusTint.warning} hover:opacity-80`}
                  >
                    {bundle.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(bundle.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg ${statusTint.error} hover:opacity-80`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
