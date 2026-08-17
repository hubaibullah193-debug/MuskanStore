// app/api/cron/low-stock-digest/route.ts
// Daily low-stock digest email — triggered by cron (Vercel Cron, GitHub Actions, etc.)
// GET /api/cron/low-stock-digest?secret=CRON_SECRET

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/email/service';
import { lowStockDigestTemplate } from '@/lib/email/templates';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch products with low stock (quantity <= threshold)
    const { data: inventory, error: invError } = await supabaseAdmin
      .from('product_inventory')
      .select('quantity, low_stock_threshold, product_id')
      .not('quantity', 'is', null);

    if (invError) {
      throw new Error(`Inventory query failed: ${invError.message}`);
    }

    if (!inventory || inventory.length === 0) {
      return NextResponse.json({ message: 'No inventory data found' });
    }

    // Separate out-of-stock and low-stock
    const outOfStock: string[] = [];
    const lowStock: string[] = [];

    for (const item of inventory) {
      if (item.quantity === 0) {
        outOfStock.push(item.product_id);
      } else if (item.quantity <= (item.low_stock_threshold || 5)) {
        lowStock.push(item.product_id);
      }
    }

    if (outOfStock.length === 0 && lowStock.length === 0) {
      return NextResponse.json({ message: 'All products well stocked' });
    }

    // Fetch product details
    const allIds = [...new Set([...outOfStock, ...lowStock])];
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, sku')
      .in('id', allIds);

    const productMap = new Map((products || []).map((p) => [p.id, p]));

    // Build digest data
    const outOfStockItems = outOfStock
      .map((id) => productMap.get(id))
      .filter(Boolean)
      .map((p) => ({ productName: p!.name, sku: p!.sku }));

    const lowStockItems = inventory
      .filter((inv) => lowStock.includes(inv.product_id))
      .map((inv) => {
        const p = productMap.get(inv.product_id);
        return p
          ? {
              productName: p.name,
              sku: p.sku,
              quantity: inv.quantity,
              threshold: inv.low_stock_threshold || 5,
            }
          : null;
      })
      .filter(Boolean) as Array<{
      productName: string;
      sku: string;
      quantity: number;
      threshold: number;
    }>;

    if (outOfStockItems.length === 0 && lowStockItems.length === 0) {
      return NextResponse.json({ message: 'No alerts after filtering' });
    }

    // Send digest email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mstore.com';
    const html = lowStockDigestTemplate({ lowStockItems, outOfStockItems });

    const result = await sendEmail({
      to: adminEmail,
      subject: `[MStore] Low Stock Alert — ${outOfStockItems.length + lowStockItems.length} products need attention`,
      html,
    });

    return NextResponse.json({
      message: 'Low stock digest sent',
      sent: result.success,
      outOfStock: outOfStockItems.length,
      lowStock: lowStockItems.length,
      emailError: result.error || null,
    });
  } catch (error) {
    console.error('Low stock digest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
