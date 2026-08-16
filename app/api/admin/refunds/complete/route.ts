// app/api/admin/refunds/complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { completeRefund } from '@/server/actions/refunds';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refundId } = body;

    if (!refundId) {
      return NextResponse.json(
        { error: 'Refund ID is required' },
        { status: 400 }
      );
    }

    const result = await completeRefund({
      refundId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/admin/refunds/complete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
