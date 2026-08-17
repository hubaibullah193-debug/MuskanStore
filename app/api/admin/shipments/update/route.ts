import { NextRequest, NextResponse } from 'next/server';
import { updateShipment } from '@/server/actions/shipments';
import { sendShipmentStatusEmail } from '@/server/actions/email';
import { isAdmin } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Check if user is admin
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { shipmentId, status, notes } = body;

  if (!shipmentId) {
    return NextResponse.json(
      { error: 'shipmentId is required' },
      { status: 400 }
    );
  }

  const result = await updateShipment({
    shipmentId,
    status,
    notes,
    shippedDate: status === 'shipped' ? new Date().toISOString() : undefined,
    deliveredDate: status === 'delivered' ? new Date().toISOString() : undefined,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Send notification email if status changed
  if (status && ['shipped', 'delivered', 'cancelled', 'returned'].includes(status)) {
    try {
      // Fetch order details for email
      const { data: shipment } = await supabase
        .from('shipments')
        .select('*, orders(order_number, guest_email)')
        .eq('id', shipmentId)
        .single();

      if (shipment?.orders) {
        const order = shipment.orders;
        await sendShipmentStatusEmail({
          orderNumber: order.order_number,
          customerEmail: order.guest_email,
          status,
          trackingNumber: shipment.tracking_number,
          carrier: shipment.carrier,
          estimatedDelivery: shipment.estimated_delivery,
          notes,
        });
      }
    } catch (error) {
      console.error('Failed to send shipment notification:', error);
      // Don't fail the shipment update if email fails
    }
  }

  return NextResponse.json({ shipment: result.shipment });
}
