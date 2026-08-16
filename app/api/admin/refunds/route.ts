// app/api/admin/refunds/route.ts
// GET refunds with filtering by status

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify admin access
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: adminLog } = await supabase
      .from('admin_audit_logs')
      .select('id')
      .eq('admin_id', user.id)
      .limit(1)
      .single();

    if (!adminLog) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get status filter from query params
    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('refunds')
      .select(`
        id,
        order_id,
        status,
        refund_amount,
        reason,
        admin_notes,
        rejection_reason,
        requested_by,
        admin_id,
        created_at,
        approved_at,
        rejected_at,
        completed_at,
        orders:order_id (
          order_number,
          guest_email,
          user_id,
          auth.users!orders_user_id_fkey (email)
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: refunds, error } = await query;

    if (error) {
      console.error('Error fetching refunds:', error);
      return NextResponse.json(
        { error: 'Failed to fetch refunds' },
        { status: 500 }
      );
    }

    return NextResponse.json({ refunds: refunds || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/refunds:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
