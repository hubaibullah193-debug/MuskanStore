'use server';

import { supabaseAdmin } from '@/lib/supabase/client';
import { logAudit } from './audit';

interface CreateShipmentInput {
  orderId: string;
  carrier: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  weightKg?: number;
  dimensionsCm?: string;
}

interface UpdateShipmentInput {
  shipmentId: string;
  status?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shippedDate?: string;
  deliveredDate?: string;
  notes?: string;
}

export async function createShipment(input: CreateShipmentInput) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, payment_status, payment_method')
    .eq('id', input.orderId)
    .single();

  if (orderError || !order) {
    return { error: 'Order not found' };
  }

  const canShip = order.payment_status === 'paid' ||
    (order.payment_method === 'cod' && order.payment_status === 'awaiting_cod');

  if (!canShip) {
    return { error: 'Can only create shipment for paid or COD orders' };
  }

  const { data: shipment, error } = await supabaseAdmin
    .from('shipments')
    .insert({
      order_id: input.orderId,
      carrier: input.carrier || 'standard',
      tracking_number: input.trackingNumber || null,
      tracking_url: input.trackingUrl || null,
      estimated_delivery: input.estimatedDelivery || null,
      weight_kg: input.weightKg || null,
      dimensions_cm: input.dimensionsCm || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Log audit
  await logAudit({
    action: 'create_shipment',
    entityType: 'shipment',
    entityId: shipment.id,
    changes: {
      carrier: input.carrier,
      tracking_number: input.trackingNumber,
    },
  });

  return { shipment };
}

export async function updateShipment(input: UpdateShipmentInput) {
  // Get current shipment
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('id', input.shipmentId)
    .single();

  if (fetchError || !current) {
    return { error: 'Shipment not found' };
  }

  // Build update payload
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) {
    updates.status = input.status;
  }
  if (input.trackingNumber !== undefined) {
    updates.tracking_number = input.trackingNumber;
  }
  if (input.trackingUrl !== undefined) {
    updates.tracking_url = input.trackingUrl;
  }
  if (input.estimatedDelivery !== undefined) {
    updates.estimated_delivery = input.estimatedDelivery;
  }
  if (input.shippedDate !== undefined) {
    updates.shipped_date = input.shippedDate;
  }
  if (input.deliveredDate !== undefined) {
    updates.delivered_date = input.deliveredDate;
  }
  if (input.notes !== undefined) {
    updates.notes = input.notes;
  }

  // Update shipment
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('shipments')
    .update(updates)
    .eq('id', input.shipmentId)
    .select()
    .single();

  if (updateError) {
    return { error: updateError.message };
  }

  // Log audit with changes
  const changes: Record<string, any> = {};
  Object.keys(updates).forEach((key) => {
    if (key !== 'updated_at' && current[key] !== updates[key]) {
      changes[key] = {
        from: current[key],
        to: updates[key],
      };
    }
  });

  await logAudit({
    action: 'update_shipment',
    entityType: 'shipment',
    entityId: input.shipmentId,
    changes,
  });

  return { shipment: updated };
}

export async function getShipmentsForOrder(orderId: string) {
  const { data: shipments, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { shipments: shipments || [] };
}

export async function getShipment(shipmentId: string) {
  const { data: shipment, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { shipment };
}
