// app/api/webhooks/email/route.ts
// Provider delivery webhook (Resend). Tracks bounces/complaints so the system
// can mark recipients invalid after repeated failures (spec: 3 bounces => invalid).
//
// Only the provider actually configured for this project (Resend) is handled.
// Payload shape follows Resend's documented webhook contract:
//   { "type": "email.bounced" | "email.complained" | "email.delivered" | ...,
//     "data": { "email": string, "message_id": string, ... } }
//
// Signature: Resend sends `Resend-Signature` = HMAC-SHA256(rawBody, secret) (hex).

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/client';
import { recordBounce } from '@/lib/email/delivery';

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // No signing secret configured (e.g. local dev): accept unverified.
    return true;
  }
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const provided = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(provided)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get('Resend-Signature'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  const type: string | undefined = payload?.type;
  const data: Record<string, any> = payload?.data ?? {};

  try {
    if (type === 'email.bounced' || type === 'email.complained') {
      const res = await recordBounce(data.email, data.message_id ?? null);
      return NextResponse.json({ ok: true, markedInvalid: res.markedInvalid });
    }

    if (type === 'email.delivered') {
      if (data.message_id) {
        await supabaseAdmin
          .from('email_logs')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('message_id', data.message_id)
          .in('status', ['pending', 'failed']);
      }
      return NextResponse.json({ ok: true });
    }

    // Other event types (opened, clicked, etc.) are ignored but acknowledged.
    return NextResponse.json({ ok: true, ignored: type });
  } catch (error) {
    console.error('email webhook error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
