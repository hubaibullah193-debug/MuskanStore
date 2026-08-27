// app/admin/refunds/page.tsx
'use client';

import { RefundsDashboard } from '../../components/admin/refunds-dashboard';

export default function AdminRefundsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">Refunds</h1>
        <p className="text-text-secondary mt-2">Manage refund requests and customer returns</p>
      </div>

      <RefundsDashboard />
    </div>
  );
}
