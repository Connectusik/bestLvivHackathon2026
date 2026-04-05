import { useApp } from '../../contexts/AppContext';
import type { Supply } from '../../types';
import DataTable from '../../components/shared/DataTable';
import type { Column } from '../../components/shared/DataTable';
import SupplyForm from '../../components/supplies/SupplyForm';

export default function AdminSuppliesPage() {
  const { supplies, addSupply } = useApp();

  const handleCreate = (data: { productNumber: string; quantity: number }) => {
    addSupply(data);
  };

  const columns: Column<Supply>[] = [
    { key: 'id', header: 'ID', render: (s) => <span className="font-mono text-xs">{s.id}</span> },
    { key: 'product', header: 'Товар', render: (s) => s.productNumber },
    { key: 'qty', header: 'Кількість', render: (s) => s.quantity },
    {
      key: 'distribution',
      header: 'Розподіл по складах',
      render: (s) => (
        <div className="space-y-0.5">
          {(s.distribution ?? []).map((d) => (
            <div key={d.warehouseId} className="flex items-center gap-2 text-xs">
              <span className="text-gray-700 dark:text-gray-300">{d.warehouseName}</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">×{d.quantity}</span>
            </div>
          ))}
        </div>
      ),
    },
    { key: 'date', header: 'Створено', render: (s) => new Date(s.createdAt).toLocaleDateString('uk-UA') },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Постачання</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Товар одразу розподіляється по складах згідно з попитом</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Нове постачання</h2>
            <SupplyForm onSubmit={handleCreate} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Історія постачання</h2>
            </div>
            <DataTable columns={columns} data={supplies} keyExtractor={(s) => s.id} emptyMessage="Постачань ще немає" />
          </div>
        </div>
      </div>
    </div>
  );
}
