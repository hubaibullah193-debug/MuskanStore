// app/admin/refunds/page.tsx
'use client';

import { RefundsDashboard } from '../../components/admin/refunds-dashboard';

export default function AdminRefundsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Refunds</h1>
        <p className="text-gray-600 mt-2">Manage refund requests and customer returns</p>
      </div>

      <RefundsDashboard />
    </div>
  );
}
