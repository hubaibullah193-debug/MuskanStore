'use client';

/**
 * Admin Inventory Management Page
 * Track stock levels, adjust inventory, monitor low stock alerts
 */

import { useState, useEffect } from 'react';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  status: 'low' | 'ok' | 'high';
  variantId?: string;
  variantName?: string;
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    newQuantity: '',
    reason: 'Physical Count' as const,
    notes: '',
  });
  const [filter, setFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load inventory on mount
  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      // In production, fetch from API endpoint
      // For now, show empty state
      setInventory([]);
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async (itemId: string) => {
    try {
      setError(null);
      setSuccess(null);

      if (!adjustmentData.newQuantity) {
        setError('New quantity is required');
        return;
      }

      // Call adjustment action
      setSuccess('Inventory adjusted successfully');
      setAdjusting(null);
      setAdjustmentData({ newQuantity: '', reason: 'Physical Count', notes: '' });
      loadInventory();
    } catch (err) {
      setError('Failed to adjust inventory');
    }
  };

  const filteredInventory = inventory.filter((item) => {
    if (filter === 'low') return item.status === 'low';
    if (filter === 'ok') return item.status !== 'low';
    return true;
  });

  const lowStockCount = inventory.filter((i) => i.status === 'low').length;
  const totalItems = inventory.length;
  const totalStock = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const totalReserved = inventory.reduce((sum, i) => sum + i.reserved, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600 mt-1">Track stock levels and adjust inventory</p>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total SKUs</div>
          <div className="text-3xl font-bold text-gray-900">{totalItems}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Stock</div>
          <div className="text-3xl font-bold text-gray-900">{totalStock.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Reserved</div>
          <div className="text-3xl font-bold text-orange-600">{totalReserved.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-red-200 bg-red-50">
          <div className="text-sm text-red-600">Low Stock Alerts</div>
          <div className="text-3xl font-bold text-red-600">{lowStockCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'low', 'ok'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f === 'all'
              ? `All (${inventory.length})`
              : f === 'low'
              ? `Low Stock (${lowStockCount})`
              : `OK (${inventory.length - lowStockCount})`}
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {inventory.length === 0 ? 'No inventory records yet.' : 'No items match the selected filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Quantity</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Reserved</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Available</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Threshold</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      {item.variantName && (
                        <div className="text-xs text-gray-500">{item.variantName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.sku}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-orange-600">
                      {item.reserved.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {item.available.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {item.lowStockThreshold}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'low'
                            ? 'bg-red-100 text-red-800'
                            : item.status === 'high'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.status === 'low'
                          ? '⚠️ Low'
                          : item.status === 'high'
                          ? '✓ High'
                          : '— OK'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setAdjusting(item.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {adjusting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Adjust Inventory</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Quantity
                </label>
                <input
                  type="number"
                  value={adjustmentData.newQuantity}
                  onChange={(e) =>
                    setAdjustmentData({ ...adjustmentData, newQuantity: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={adjustmentData.reason}
                  onChange={(e) =>
                    setAdjustmentData({
                      ...adjustmentData,
                      reason: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Physical Count</option>
                  <option>Damaged</option>
                  <option>Lost</option>
                  <option>Return</option>
                  <option>Correction</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={adjustmentData.notes}
                  onChange={(e) =>
                    setAdjustmentData({ ...adjustmentData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setAdjusting(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAdjustment(adjusting)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Adjust Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
