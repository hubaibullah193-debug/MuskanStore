'use client';

/**
 * Admin Products Page
 * Manage product catalog: list, create, edit, enable/disable, bulk upload
 */

import { useState, useEffect, useRef } from 'react';
import { disableProductAction, enableProductAction, getAllProducts, addProductAction, updateProductAction, getCategories, uploadProductImageAction, removeProductImageAction, getProductImages, bulkUploadProducts } from '@/server/actions/admin-products';
import { statusTint } from '@/lib/ui/status-colors';

interface Product {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  is_active: boolean;
  created_at: string;
}

interface FormData {
  name: string;
  sku: string;
  price: string;
  description: string;
  categoryId: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sku: '',
    price: '',
    description: '',
    categoryId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [productImages, setProductImages] = useState<Record<string, Array<{ id: string; image_url: string }>>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ success: number; errors: Array<{ rowNumber: number; sku: string; error: string }> } | null>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
      // Load images for all products
      const imagesMap: Record<string, Array<{ id: string; image_url: string }>> = {};
      await Promise.all(
        data.map(async (p) => {
          try {
            const imgs = await getProductImages(p.id);
            if (imgs.length > 0) imagesMap[p.id] = imgs;
          } catch {
            // Non-critical
          }
        })
      );
      setProductImages(imagesMap);
    } catch (err: any) {
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch {
      // Non-critical, dropdown will just be empty
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBulkUploading(true);
      setBulkResults(null);
      setError(null);

      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        setError('CSV must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const requiredHeaders = ['name', 'sku', 'category', 'base_price', 'stock'];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        setError(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return {
          name: row.name,
          sku: row.sku,
          category: row.category,
          base_price: parseFloat(row.base_price) || 0,
          stock: parseInt(row.stock) || 0,
        };
      });

      const result = await bulkUploadProducts(rows);
      setBulkResults({
        success: result.successCount,
        errors: result.errors,
      });
      loadProducts();
    } catch (err: any) {
      setError(err?.message || 'Failed to process CSV');
    } finally {
      setBulkUploading(false);
      if (csvFileRef.current) csvFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!formData.name || !formData.sku || !formData.price) {
        setError('Name, SKU, and price are required');
        return;
      }

      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        setError('Price must be a positive number');
        return;
      }

      if (editingId) {
        await updateProductAction(editingId, {
          name: formData.name,
          sku: formData.sku,
          base_price: price,
          description: formData.description || undefined,
          category_id: formData.categoryId || undefined,
        });
        setSuccess('Product updated successfully');
      } else {
        if (!formData.categoryId) {
          setError('Category is required');
          return;
        }
        await addProductAction(
          formData.name,
          formData.description || undefined,
          formData.sku,
          price,
          formData.categoryId
        );
        setSuccess('Product created successfully');
      }

      setFormData({ name: '', sku: '', price: '', description: '', categoryId: '' });
      setShowForm(false);
      setEditingId(null);
      loadProducts();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product');
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.base_price.toString(),
      description: '',
      categoryId: '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleToggleActive = async (productId: string, isActive: boolean) => {
    try {
      setError(null);
      // Call appropriate action
      if (isActive) {
        await disableProductAction(productId);
      } else {
        await enableProductAction(productId);
      }
      setSuccess(`Product ${isActive ? 'disabled' : 'enabled'} successfully`);
      loadProducts();
    } catch (err) {
      setError('Failed to update product status');
    }
  };

  const handleUploadImage = async (productId: string, file: File) => {
    try {
      setError(null);
      setUploading(productId);
      const formData = new FormData();
      formData.append('file', file);
      await uploadProductImageAction(productId, formData);
      setSuccess('Image uploaded successfully');
      // Reload images for this product
      const imgs = await getProductImages(productId);
      setProductImages((prev) => ({ ...prev, [productId]: imgs }));
    } catch (err: any) {
      setError(err?.message || 'Failed to upload image');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async (productId: string, imageId: string) => {
    try {
      setError(null);
      await removeProductImageAction(imageId);
      setSuccess('Image removed');
      const imgs = await getProductImages(productId);
      setProductImages((prev) => ({ ...prev, [productId]: imgs }));
    } catch (err: any) {
      setError(err?.message || 'Failed to remove image');
    }
  };

  const filteredProducts = products.filter((p) => {
    if (filter === 'active') return p.is_active;
    if (filter === 'inactive') return !p.is_active;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-secondary mt-1">Manage your product catalog</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowBulkUpload(!showBulkUpload);
              setBulkResults(null);
            }}
            className="px-4 py-2 border border-border text-text-secondary rounded-lg hover:bg-paper-2 font-medium text-sm"
          >
            {showBulkUpload ? 'Cancel Upload' : 'Bulk Upload CSV'}
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ name: '', sku: '', price: '', description: '', categoryId: '' });
            }}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-dark"
          >
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
        </div>
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

      {/* Bulk Upload Section */}
      {showBulkUpload && (
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-bold mb-2 text-foreground">Bulk Upload Products via CSV</h2>
          <p className="text-sm text-text-secondary mb-4">
            CSV must include columns: <code className="bg-paper-2 px-1 rounded">name</code>,{' '}
            <code className="bg-paper-2 px-1 rounded">sku</code>,{' '}
            <code className="bg-paper-2 px-1 rounded">category</code>,{' '}
            <code className="bg-paper-2 px-1 rounded">base_price</code>,{' '}
            <code className="bg-paper-2 px-1 rounded">stock</code>.
            Existing SKUs will be skipped.
          </p>
          <div className="flex items-center gap-4">
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv"
              onChange={handleBulkUpload}
              disabled={bulkUploading}
              className="block text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent file:text-accent-foreground hover:file:bg-accent-dark file:cursor-pointer disabled:opacity-50"
            />
            {bulkUploading && <span className="text-sm text-text-tertiary">Uploading…</span>}
          </div>

          {/* Bulk upload results */}
          {bulkResults && (
            <div className="mt-4 p-4 rounded-lg bg-paper-2 border border-border">
              <p className="font-medium text-foreground mb-1">
                {bulkResults.success} product{bulkResults.success !== 1 ? 's' : ''} uploaded
              </p>
              {bulkResults.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-error font-medium mb-1">
                    {bulkResults.errors.length} row{bulkResults.errors.length !== 1 ? 's' : ''} failed:
                  </p>
                  <ul className="text-sm text-error space-y-1">
                    {bulkResults.errors.map((err, i) => (
                      <li key={i}>Row {err.rowNumber} ({err.sku}): {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sample CSV */}
          <details className="mt-4">
            <summary className="text-sm text-accent cursor-pointer hover:underline">
              View sample CSV format
            </summary>
            <pre className="mt-2 p-3 bg-paper-2 rounded text-xs text-text-secondary overflow-x-auto">
{`name,sku,category,base_price,stock
Herbal Shampoo,HC-SHP-001,Hair Care,450,50
Aloe Vera Face Wash,SC-FW-002,Skin Care,320,75
Moisturizing Lotion,BC-ML-003,Body Care,550,30`}
            </pre>
          </details>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-bold mb-4 text-foreground">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., Herbal Shampoo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., HC-SHP-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Price (PKR) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Product description..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: '', sku: '', price: '', description: '', categoryId: '' });
                }}
                className="px-4 py-2 text-foreground border border-border rounded-lg hover:bg-paper-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-dark"
              >
                {editingId ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-accent text-accent-foreground'
                : 'bg-paper-2 text-text-secondary hover:bg-border'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({filteredProducts.length})
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-tertiary">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary">
            {products.length === 0 ? 'No products yet. Create your first product to get started.' : 'No products match the selected filter.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-paper-2">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Image</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">SKU</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-border hover:bg-paper-2">
                  <td className="px-6 py-4">
                    {productImages[product.id]?.length > 0 ? (
                      <div className="relative group">
                        <img
                          src={productImages[product.id][0].image_url}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <button
                          onClick={() => handleRemoveImage(product.id, productImages[product.id][0].id)}
                          className="absolute -top-1 -right-1 bg-error text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          x
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/jpeg,image/png,image/webp,image/gif';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleUploadImage(product.id, file);
                          };
                          input.click();
                        }}
                        disabled={uploading === product.id}
                        className="w-12 h-12 border-2 border-dashed border-border rounded flex items-center justify-center text-text-tertiary hover:border-accent hover:text-accent transition-colors text-xs"
                      >
                        {uploading === product.id ? '...' : '+'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-foreground">₨{product.base_price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        product.is_active
                          ? statusTint.success
                          : statusTint.neutral
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {new Date(product.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-accent hover:text-accent-dark text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(product.id, product.is_active)}
                      className="text-warning hover:opacity-80 text-sm font-medium"
                    >
                      {product.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-sm text-text-secondary">Total Products</div>
          <div className="text-2xl font-bold text-foreground">{products.length}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-sm text-text-secondary">Active</div>
          <div className="text-2xl font-bold text-success">{products.filter((p) => p.is_active).length}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-sm text-text-secondary">Inactive</div>
          <div className="text-2xl font-bold text-text-secondary">{products.filter((p) => !p.is_active).length}</div>
        </div>
      </div>
    </div>
  );
}
