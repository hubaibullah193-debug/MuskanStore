// app/api/admin/refunds/reject/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { rejectRefund } from '@/server/actions/refunds';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refundId, rejectionReason } = body;

    if (!refundId || !rejectionReason) {
      return NextResponse.json(
        { error: 'Refund ID and rejection reason are required' },
        { status: 400 }
      );
    }

    const result = await rejectRefund({
      refundId,
      rejectionReason,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/admin/refunds/reject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
