'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Shipment {
  id: string;
  order_id: string;
  status: string;
  carrier: string;
  tracking_number: string | null;
  tracking_url: string | null;
  estimated_delivery: string | null;
  shipped_date: string | null;
  delivered_date: string | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  order_number: string;
  guest_email: string | null;
}

interface ShipmentWithOrder extends Shipment {
  order?: Order;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-orange-100 text-orange-800',
  lost: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  returned: 'Returned',
  lost: 'Lost in Transit',
};

export function ShipmentsDashboard() {
  const [shipments, setShipments] = useState<ShipmentWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selected, setSelected] = useState<ShipmentWithOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function fetchShipments() {
    setLoading(true);
    try {
      const url = new URL('/api/admin/shipments', window.location.origin);
      if (filter) {
        url.searchParams.append('status', filter);
      }
      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.shipments) {
        setShipments(data.shipments);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(shipmentId: string, newStatus: string, notes?: string) {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/shipments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId,
          status: newStatus,
          notes,
        }),
      });

      const data = await res.json();
      if (data.shipment) {
        setShipments(
          shipments.map((s) =>
            s.id === shipmentId ? { ...s, ...data.shipment } : s
          )
        );
        setSelected(data.shipment);
      }
    } catch (error) {
      console.error('Failed to update shipment:', error);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            filter === ''
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Shipments list */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900">
                Shipments ({shipments.length})
              </h3>
            </div>
            <div className="max-h-[600px] space-y-1 overflow-y-auto p-2">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : shipments.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No shipments</div>
              ) : (
                shipments.map((shipment) => (
                  <button
                    key={shipment.id}
                    onClick={() => setSelected(shipment)}
                    className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                      selected?.id === shipment.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">Order #{shipment.order_id.slice(0, 8)}</div>
                    <div className="text-xs text-gray-600">
                      {shipment.carrier} - {shipment.tracking_number || 'No tracking'}
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          statusColors[shipment.status] || statusColors.pending
                        }`}
                      >
                        {statusLabels[shipment.status] || shipment.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Details panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Shipment Details
              </h3>

              <div className="space-y-4">
                {/* Order info */}
                <div>
                  <div className="text-sm font-medium text-gray-600">Order</div>
                  <div className="mt-1 text-base text-gray-900">
                    {selected.order_id}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <div className="text-sm font-medium text-gray-600">Current Status</div>
                  <div className="mt-1">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                        statusColors[selected.status] || statusColors.pending
                      }`}
                    >
                      {statusLabels[selected.status] || selected.status}
                    </span>
                  </div>
                </div>

                {/* Carrier info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Carrier</div>
                    <div className="mt-1 text-base text-gray-900">{selected.carrier}</div>
                  </div>
                  {selected.tracking_number && (
                    <div>
                      <div className="text-sm font-medium text-gray-600">Tracking</div>
                      <div className="mt-1 font-mono text-sm text-gray-900">
                        {selected.tracking_number}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {selected.shipped_date && (
                    <div>
                      <div className="text-sm font-medium text-gray-600">Shipped</div>
                      <div className="mt-1 text-sm text-gray-900">
                        {format(new Date(selected.shipped_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                  {selected.estimated_delivery && (
                    <div>
                      <div className="text-sm font-medium text-gray-600">Est. Delivery</div>
                      <div className="mt-1 text-sm text-gray-900">
                        {format(new Date(selected.estimated_delivery), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status actions */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">Update Status</div>
                  <div className="space-y-2">
                    {selected.status !== 'shipped' && (
                      <button
                        onClick={() => updateStatus(selected.id, 'shipped')}
                        disabled={isUpdating}
                        className="w-full rounded-lg bg-purple-600 text-white px-3 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {selected.status !== 'delivered' && selected.status !== 'returned' && (
                      <button
                        onClick={() => updateStatus(selected.id, 'delivered')}
                        disabled={isUpdating}
                        className="w-full rounded-lg bg-green-600 text-white px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Mark as Delivered
                      </button>
                    )}
                    {selected.status !== 'returned' && (
                      <button
                        onClick={() => updateStatus(selected.id, 'returned')}
                        disabled={isUpdating}
                        className="w-full rounded-lg bg-orange-600 text-white px-3 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                      >
                        Mark as Returned
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-gray-600">Select a shipment to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
