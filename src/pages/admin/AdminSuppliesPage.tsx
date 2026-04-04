import { supplies as initialSupplies } from '../../data/mockData';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { Supply } from '../../types';
import DataTable from '../../components/shared/DataTable';
import type { Column } from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import SupplyForm from '../../components/supplies/SupplyForm';

export default function AdminSuppliesPage() {
  const [supplies, setSupplies] = useLocalStorage<Supply[]>('supplies', initialSupplies);

  const handleCreate = (data: { productNumber: string; quantity: number }) => {
    const newSupply: Supply = {
      id: `S-${String(Date.now()).slice(-4)}`,
      productNumber: data.productNumber,
      quantity: data.quantity,
      destinationWarehouseId: 'wh-main',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setSupplies([newSupply, ...supplies]);
  };

  const columns: Column<Supply>[] = [
    { key: 'id', header: 'ID', render: (s) => <span className="font-mono text-xs">{s.id}</span> },
    { key: 'product', header: 'Product #', render: (s) => s.productNumber },
    { key: 'qty', header: 'Quantity', render: (s) => s.quantity },
    { key: 'dest', header: 'Destination', render: () => 'Main Warehouse' },
    { key: 'date', header: 'Created', render: (s) => new Date(s.createdAt).toLocaleDateString() },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Supplies</h1>
        <p className="text-sm text-gray-500 mt-1">Create and manage supply deliveries to the main warehouse</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">New Supply</h2>
            <SupplyForm onSubmit={handleCreate} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Supply History</h2>
            </div>
            <DataTable columns={columns} data={supplies} keyExtractor={(s) => s.id} emptyMessage="No supplies yet" />
          </div>
        </div>
      </div>
    </div>
  );
}
