'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { StatusBadge } from '@/app/components/ui/status-badge';

interface Shipment {
  id: string;
  status: string;
  carrier: string;
  tracking_number: string | null;
  tracking_url: string | null;
  estimated_delivery: string | null;
  shipped_date: string | null;
  delivered_date: string | null;
  weight_kg: number | null;
  dimensions_cm: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ShipmentTrackerProps {
  shipments: Shipment[];
}

export function ShipmentTracker({ shipments }: ShipmentTrackerProps) {
  const [selected, setSelected] = useState<Shipment | null>(
    shipments.length > 0 ? shipments[0] : null
  );

  if (!shipments || shipments.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-paper-2 p-6 text-center">
        <p className="text-secondary">No shipments found for this order yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shipment list */}
      <div className="space-y-2">
        {shipments.map((shipment) => (
          <button
            key={shipment.id}
            onClick={() => setSelected(shipment)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              selected?.id === shipment.id
                ? 'border-accent bg-paper-2'
                : 'border-border hover:border-border-strong'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">
                  {shipment.carrier.charAt(0).toUpperCase() +
                    shipment.carrier.slice(1)}
                </div>
                <div className="text-sm text-secondary">
                  {shipment.tracking_number && `Tracking: ${shipment.tracking_number}`}
                </div>
              </div>
              <StatusBadge status={shipment.status} />
            </div>
          </button>
        ))}
      </div>

      {/* Details for selected shipment */}
      {selected && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Shipment Details
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-secondary">Carrier</div>
              <div className="mt-1 text-base text-foreground">
                {selected.carrier.charAt(0).toUpperCase() + selected.carrier.slice(1)}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-secondary">Status</div>
              <div className="mt-1">
                <StatusBadge status={selected.status} />
              </div>
            </div>

            {selected.tracking_number && (
              <div>
                <div className="text-sm font-medium text-secondary">Tracking Number</div>
                <div className="mt-1 font-mono text-base text-foreground">
                  {selected.tracking_number}
                </div>
              </div>
            )}

            {selected.tracking_url && (
              <div>
                <div className="text-sm font-medium text-secondary">Track Online</div>
                <div className="mt-1">
                  <a
                    href={selected.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline hover:opacity-80"
                  >
                    View tracking →
                  </a>
                </div>
              </div>
            )}

            {selected.shipped_date && (
              <div>
                <div className="text-sm font-medium text-secondary">Shipped Date</div>
                <div className="mt-1 text-base text-foreground">
                  {format(new Date(selected.shipped_date), 'MMM d, yyyy')}
                </div>
              </div>
            )}

            {selected.estimated_delivery && (
              <div>
                <div className="text-sm font-medium text-secondary">
                  Estimated Delivery
                </div>
                <div className="mt-1 text-base text-foreground">
                  {format(new Date(selected.estimated_delivery), 'MMM d, yyyy')}
                </div>
              </div>
            )}

            {selected.delivered_date && (
              <div>
                <div className="text-sm font-medium text-secondary">Delivered Date</div>
                <div className="mt-1 text-base text-foreground">
                  {format(new Date(selected.delivered_date), 'MMM d, yyyy')}
                </div>
              </div>
            )}

            {selected.weight_kg && (
              <div>
                <div className="text-sm font-medium text-secondary">Weight</div>
                <div className="mt-1 text-base text-foreground">
                  {selected.weight_kg} kg
                </div>
              </div>
            )}

            {selected.dimensions_cm && (
              <div>
                <div className="text-sm font-medium text-secondary">Dimensions</div>
                <div className="mt-1 text-base text-foreground">
                  {selected.dimensions_cm}
                </div>
              </div>
            )}
          </div>

          {selected.notes && (
            <div className="mt-4 rounded-lg bg-paper-2 p-3">
              <div className="text-sm font-medium text-secondary">Notes</div>
              <div className="mt-1 text-sm text-foreground">{selected.notes}</div>
            </div>
          )}

          <div className="mt-4 text-xs text-secondary">
            Last updated {format(new Date(selected.updated_at), 'MMM d, yyyy HH:mm')}
          </div>
        </div>
      )}
    </div>
  );
}
