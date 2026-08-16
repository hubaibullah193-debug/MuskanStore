import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShipmentTracker } from '../../../components/shipment-tracker';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Order Shipments',
  description: 'Track your order shipment',
};

export default async function ShipmentsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, user_id, payment_status')
    .eq('id', id)
    .single();

  if (orderError || !order) {
    notFound();
  }

  // Get shipments
  const { data: shipments, error: shipmentsError } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  if (shipmentsError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load shipments. Please try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Order Shipments
        </h1>
        <p className="mt-2 text-gray-600">
          Order #{order.order_number}
        </p>
      </div>

      <ShipmentTracker shipments={shipments || []} />
    </div>
  );
}
