'use client';

/**
 * Admin Products Page
 * Manage product catalog: list, create, edit, enable/disable, bulk upload
 */

import { useState, useEffect, useRef } from 'react';
import { disableProductAction, enableProductAction, getAllProducts, addProductAction, updateProductAction, getCategories, uploadProductImageAction, removeProductImageAction, getProductImages } from '@/server/actions/admin-products';

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
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', sku: '', price: '', description: '', categoryId: '' });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Product'}
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

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Herbal Shampoo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., HC-SHP-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (PKR) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({filteredProducts.length})
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {products.length === 0 ? 'No products yet. Create your first product to get started.' : 'No products match the selected filter.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Image</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
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
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                        className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-xs"
                      >
                        {uploading === product.id ? '...' : '+'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">₨{product.base_price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        product.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(product.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(product.id, product.is_active)}
                      className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
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
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Products</div>
          <div className="text-2xl font-bold text-gray-900">{products.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">{products.filter((p) => p.is_active).length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Inactive</div>
          <div className="text-2xl font-bold text-gray-600">{products.filter((p) => !p.is_active).length}</div>
        </div>
      </div>
    </div>
  );
}
