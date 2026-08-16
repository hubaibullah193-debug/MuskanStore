'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

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

export function ShipmentTracker({ shipments }: ShipmentTrackerProps) {
  const [selected, setSelected] = useState<Shipment | null>(
    shipments.length > 0 ? shipments[0] : null
  );

  if (!shipments || shipments.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No shipments found for this order yet.</p>
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
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {shipment.carrier.charAt(0).toUpperCase() +
                    shipment.carrier.slice(1)}
                </div>
                <div className="text-sm text-gray-600">
                  {shipment.tracking_number && `Tracking: ${shipment.tracking_number}`}
                </div>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  statusColors[shipment.status] || statusColors.pending
                }`}
              >
                {statusLabels[shipment.status] || shipment.status}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Details for selected shipment */}
      {selected && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Shipment Details
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-gray-600">Carrier</div>
              <div className="mt-1 text-base text-gray-900">
                {selected.carrier.charAt(0).toUpperCase() + selected.carrier.slice(1)}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-600">Status</div>
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

            {selected.tracking_number && (
              <div>
                <div className="text-sm font-medium text-gray-600">Tracking Number</div>
                <div className="mt-1 font-mono text-base text-gray-900">
                  {selected.tracking_number}
                </div>
              </div>
            )}

            {selected.tracking_url && (
              <div>
                <div className="text-sm font-medium text-gray-600">Track Online</div>
                <div className="mt-1">
                  <a
                    href={selected.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    View tracking →
                  </a>
                </div>
              </div>
            )}

            {selected.shipped_date && (
              <div>
                <div className="text-sm font-medium text-gray-600">Shipped Date</div>
                <div className="mt-1 text-base text-gray-900">
                  {format(new Date(selected.shipped_date), 'MMM d, yyyy')}
                </div>
              </div>
            )}

            {selected.estimated_delivery && (
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Estimated Delivery
                </div>
                <div className="mt-1 text-base text-gray-900">
                  {format(new Date(selected.estimated_delivery), 'MMM d, yyyy')}
                </div>
              </div>
            )}

            {selected.delivered_date && (
              <div>
                <div className="text-sm font-medium text-gray-600">Delivered Date</div>
                <div className="mt-1 text-base text-gray-900">
                  {format(new Date(selected.delivered_date), 'MMM d, yyyy')}
                </div>
              </div>
            )}

            {selected.weight_kg && (
              <div>
                <div className="text-sm font-medium text-gray-600">Weight</div>
                <div className="mt-1 text-base text-gray-900">
                  {selected.weight_kg} kg
                </div>
              </div>
            )}

            {selected.dimensions_cm && (
              <div>
                <div className="text-sm font-medium text-gray-600">Dimensions</div>
                <div className="mt-1 text-base text-gray-900">
                  {selected.dimensions_cm}
                </div>
              </div>
            )}
          </div>

          {selected.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <div className="text-sm font-medium text-gray-600">Notes</div>
              <div className="mt-1 text-sm text-gray-700">{selected.notes}</div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500">
            Last updated {format(new Date(selected.updated_at), 'MMM d, yyyy HH:mm')}
          </div>
        </div>
      )}
    </div>
  );
}
