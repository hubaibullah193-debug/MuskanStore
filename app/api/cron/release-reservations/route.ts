// app/api/cron/release-reservations/route.ts
// Releases inventory reservations that have expired without being finalized.
// Prevents abandoned (never-paid, never-cancelled) orders from holding stock
// indefinitely. Reservations are created with expires_at = now() + 30m at order
// time; once expired they are marked 'expired' so finalizeInventory (which only
// acts on 'reserved') can no longer decrement stock for them.
//
// GET /api/cron/release-reservations?secret=CRON_SECRET

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const nowIso = new Date().toISOString();

    const { count, error } = await supabaseAdmin
      .from('inventory_reservations')
      .update({ status: 'expired', released_at: nowIso })
      .eq('status', 'reserved')
      .lte('expires_at', nowIso)
      .is('released_at', null);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, released: count ?? 0 });
  } catch (error) {
    console.error('release-reservations cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
