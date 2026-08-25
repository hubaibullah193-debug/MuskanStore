// app/api/cron/email-retry/route.ts
// Retries failed/pending emails recorded in email_logs.
// GET /api/cron/email-retry?secret=CRON_SECRET
// Wire to the same external scheduler that triggers low-stock-digest.

import { NextRequest, NextResponse } from 'next/server';
import { retryFailedEmails } from '@/lib/email/delivery';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await retryFailedEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('email-retry cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
