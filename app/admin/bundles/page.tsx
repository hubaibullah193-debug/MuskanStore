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

      await createBundle('admin', {
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
      await updateBundle('admin', bundleId, { is_active: !isActive });
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
      await deleteBundle('admin', bundleId);
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
          <h1 className="text-3xl font-bold text-gray-900">Bundle Offers</h1>
          <p className="text-gray-600 mt-1">Create and manage product bundles</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Create Bundle'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Create New Bundle</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bundle Name *
                </label>
                <input
                  type="text"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Hair Care Starter Kit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bundle Price (PKR) *
                </label>
                <input
                  type="number"
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                />
                {previewRegularPrice > 0 && bundlePrice && (
                  <p className="text-sm text-gray-500 mt-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={bundleDesc}
                onChange={(e) => setBundleDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bundle description..."
                rows={2}
              />
            </div>

            {/* Bundle Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Products in Bundle *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 2}
                      className="text-red-500 hover:text-red-700 text-sm disabled:opacity-30"
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
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Bundle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bundles List */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          Loading bundles...
        </div>
      ) : bundles.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No bundles yet. Create your first bundle offer to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`bg-white rounded-lg border p-6 ${
                bundle.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{bundle.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        bundle.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {bundle.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {bundle.discount_percent > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        -{bundle.discount_percent}%
                      </span>
                    )}
                  </div>
                  {bundle.description && (
                    <p className="text-sm text-gray-600 mt-1">{bundle.description}</p>
                  )}
                  <div className="flex gap-6 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Bundle Price: </span>
                      <span className="font-bold text-gray-900">
                        Rs. {Number(bundle.bundle_price).toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Regular: </span>
                      <span className="text-gray-600 line-through">
                        Rs. {Number(bundle.regular_price).toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Items: </span>
                      <span className="text-gray-600">{bundle.bundle_items.length}</span>
                    </div>
                    {bundle.active_from && (
                      <div>
                        <span className="text-gray-500">From: </span>
                        <span className="text-gray-600">
                          {new Date(bundle.active_from).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {bundle.active_to && (
                      <div>
                        <span className="text-gray-500">To: </span>
                        <span className="text-gray-600">
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
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {bi.products?.[0]?.name || 'Unknown'} x{bi.quantity}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(bundle.id, bundle.is_active)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                      bundle.is_active
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {bundle.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(bundle.id)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-800 hover:bg-red-200"
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
