// app/api/admin/email-logs/route.ts
// Admin visibility of email delivery status for a given reference (order).
// GET /api/admin/email-logs?referenceId=<uuid>

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { verifyAdminAccess } from '@/server/actions/auth';

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const referenceId = request.nextUrl.searchParams.get('referenceId');
  if (!referenceId) {
    return NextResponse.json({ error: 'referenceId required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('email_logs')
    .select(
      'id, email_type, recipient_email, subject, status, retry_count, max_retries, created_at, sent_at, error_message'
    )
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data });
}
