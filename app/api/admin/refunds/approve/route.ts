// app/api/admin/refunds/approve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { approveRefund } from '@/server/actions/refunds';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refundId, notes } = body;

    if (!refundId) {
      return NextResponse.json(
        { error: 'Refund ID is required' },
        { status: 400 }
      );
    }

    const result = await approveRefund({
      refundId,
      notes,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/admin/refunds/approve:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
