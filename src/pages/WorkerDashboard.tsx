import Header from '../components/layout/Header';
import { warehouses, trucks, supplies, shipments } from '../data/mockData';
import DataTable from '../components/shared/DataTable';
import type { Column } from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import type { Supply, Shipment, Truck } from '../types';

const assignedWarehouse = warehouses.find((w) => w.id === 'wh-lviv')!;

const warehouseTrucks = trucks.filter((t) => t.warehouseId === assignedWarehouse.id);

const currentSupplies = supplies.filter((s) => s.status === 'in_transit');
const upcomingSupplies = supplies.filter((s) => s.status === 'pending');
const currentShipments = shipments.filter((s) => s.status === 'in_transit');
const upcomingShipments = shipments.filter((s) => s.status === 'pending');

const supplyColumns: Column<Supply>[] = [
  { key: 'id', header: 'ID', render: (s) => <span className="font-mono text-xs">{s.id}</span> },
  { key: 'product', header: 'Product #', render: (s) => s.productNumber },
  { key: 'qty', header: 'Qty', render: (s) => s.quantity },
  { key: 'date', header: 'Created', render: (s) => new Date(s.createdAt).toLocaleDateString() },
  { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
];

const shipmentColumns: Column<Shipment>[] = [
  { key: 'id', header: 'ID', render: (s) => <span className="font-mono text-xs">{s.id}</span> },
  { key: 'product', header: 'Product #', render: (s) => s.productNumber },
  { key: 'qty', header: 'Qty', render: (s) => s.quantity },
  { key: 'dest', header: 'Destination', render: (s) => s.destinationLabel },
  { key: 'date', header: 'Created', render: (s) => new Date(s.createdAt).toLocaleDateString() },
  { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
];

const truckColumns: Column<Truck>[] = [
  { key: 'id', header: 'ID', render: (t) => <span className="font-mono text-xs">{t.id}</span> },
  { key: 'driver', header: 'Driver', render: (t) => t.driverName },
  { key: 'location', header: 'Location', render: (t) => t.location },
  { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
];

export default function WorkerDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header role="worker" />

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Warehouse Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-gray-900">{assignedWarehouse.name}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  assignedWarehouse.type === 'main' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {assignedWarehouse.type === 'main' ? 'Main Warehouse' : 'Regular Warehouse'}
                </span>
              </div>
              <p className="text-sm text-gray-500">{assignedWarehouse.address}</p>
              <p className="text-sm text-gray-500 mt-1">{assignedWarehouse.description}</p>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Inventory</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {assignedWarehouse.products.map((p) => (
                <div key={p.productNumber} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{p.productNumber}</p>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-lg font-bold text-indigo-600 mt-1">{p.quantity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Supplies & Shipments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Current Supplies" subtitle="In transit to this warehouse">
            <DataTable columns={supplyColumns} data={currentSupplies} keyExtractor={(s) => s.id} emptyMessage="No current supplies" />
          </Section>

          <Section title="Current Shipments" subtitle="Outgoing shipments in transit">
            <DataTable columns={shipmentColumns} data={currentShipments} keyExtractor={(s) => s.id} emptyMessage="No current shipments" />
          </Section>

          <Section title="Upcoming Supplies" subtitle="Pending supply deliveries">
            <DataTable columns={supplyColumns} data={upcomingSupplies} keyExtractor={(s) => s.id} emptyMessage="No upcoming supplies" />
          </Section>

          <Section title="Upcoming Shipments" subtitle="Pending outgoing shipments">
            <DataTable columns={shipmentColumns} data={upcomingShipments} keyExtractor={(s) => s.id} emptyMessage="No upcoming shipments" />
          </Section>
        </div>

        {/* Trucks */}
        <Section title="Available Trucks" subtitle="Trucks assigned to this warehouse">
          <DataTable columns={truckColumns} data={warehouseTrucks} keyExtractor={(t) => t.id} emptyMessage="No trucks assigned" />
        </Section>
      </main>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
