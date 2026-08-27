import { ShipmentsDashboard } from '../../components/admin/shipments-dashboard';

export const metadata = {
  title: 'Shipments Management',
  description: 'Manage order shipments and tracking',
};

export default function ShipmentsAdminPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Shipments
        </h1>
        <p className="mt-2 text-text-secondary">
          Manage orders and shipment tracking
        </p>
      </div>

      <ShipmentsDashboard />
    </div>
  );
}
