'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { StatusBadge } from '@/app/components/ui/status-badge';

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
              ? 'bg-accent text-accent-foreground'
              : 'bg-paper-2 text-text-secondary hover:bg-border'
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
                ? 'bg-accent text-accent-foreground'
                : 'bg-paper-2 text-text-secondary hover:bg-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Shipments list */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h3 className="font-semibold text-foreground">
                Shipments ({shipments.length})
              </h3>
            </div>
            <div className="max-h-[600px] space-y-1 overflow-y-auto p-2">
              {loading ? (
                <div className="p-4 text-center text-text-tertiary">Loading...</div>
              ) : shipments.length === 0 ? (
                <div className="p-4 text-center text-text-tertiary">No shipments</div>
              ) : (
                shipments.map((shipment) => (
                  <button
                    key={shipment.id}
                    onClick={() => setSelected(shipment)}
                    className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                      selected?.id === shipment.id
                        ? 'bg-[color-mix(in_oklch,var(--color-accent)_12%,white)] text-accent'
                        : 'hover:bg-paper-2'
                    }`}
                  >
                    <div className="font-medium">Order #{shipment.order_id.slice(0, 8)}</div>
                    <div className="text-xs text-text-secondary">
                      {shipment.carrier} - {shipment.tracking_number || 'No tracking'}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={shipment.status} />
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
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Shipment Details
              </h3>

              <div className="space-y-4">
                {/* Order info */}
                <div>
                  <div className="text-sm font-medium text-text-secondary">Order</div>
                  <div className="mt-1 text-base text-foreground">
                    {selected.order_id}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <div className="text-sm font-medium text-text-secondary">Current Status</div>
                  <div className="mt-1">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                {/* Carrier info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-text-secondary">Carrier</div>
                    <div className="mt-1 text-base text-foreground">{selected.carrier}</div>
                  </div>
                  {selected.tracking_number && (
                    <div>
                      <div className="text-sm font-medium text-text-secondary">Tracking</div>
                      <div className="mt-1 font-mono text-sm text-foreground">
                        {selected.tracking_number}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {selected.shipped_date && (
                    <div>
                      <div className="text-sm font-medium text-text-secondary">Shipped</div>
                      <div className="mt-1 text-sm text-foreground">
                        {format(new Date(selected.shipped_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                  {selected.estimated_delivery && (
                    <div>
                      <div className="text-sm font-medium text-text-secondary">Est. Delivery</div>
                      <div className="mt-1 text-sm text-foreground">
                        {format(new Date(selected.estimated_delivery), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status actions */}
                <div className="border-t border-border pt-4">
                  <div className="text-sm font-medium text-text-secondary mb-2">Update Status</div>
                  <div className="space-y-2">
                    {selected.status !== 'shipped' && (
                      <button
                        onClick={() => updateStatus(selected.id, 'shipped')}
                        disabled={isUpdating}
                        className="w-full rounded-lg bg-info text-white px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {selected.status !== 'delivered' && selected.status !== 'returned' && (
                      <button
                        onClick={() => updateStatus(selected.id, 'delivered')}
                        disabled={isUpdating}
                        className="w-full rounded-lg bg-success text-white px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Mark as Delivered
                      </button>
                    )}
                    {selected.status !== 'returned' && (
                      <button
                        onClick={() => updateStatus(selected.id, 'returned')}
                        disabled={isUpdating}
                        className="w-full rounded-lg bg-warning text-white px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Mark as Returned
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-paper-2 p-6 text-center">
              <p className="text-text-secondary">Select a shipment to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
