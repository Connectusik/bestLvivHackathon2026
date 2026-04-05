import { useApp } from '../../contexts/AppContext';
import type { Supply } from '../../types';
import DataTable from '../../components/shared/DataTable';
import type { Column } from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import SupplyForm from '../../components/supplies/SupplyForm';

export default function AdminSuppliesPage() {
  const { supplies, warehouses, addSupply } = useApp();

  const handleCreate = (data: { productNumber: string; quantity: number }) => {
    addSupply(data);
  };

  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w.name]));

  const columns: Column<Supply>[] = [
    { key: 'id', header: 'ID', render: (s) => <span className="font-mono text-xs">{s.id}</span> },
    { key: 'product', header: 'Товар', render: (s) => s.productNumber },
    { key: 'qty', header: 'Кількість', render: (s) => s.quantity },
    { key: 'dest', header: 'Призначення', render: (s) => warehouseMap[s.destinationWarehouseId] ?? 'Головний склад' },
    { key: 'date', header: 'Створено', render: (s) => new Date(s.createdAt).toLocaleDateString('uk-UA') },
    { key: 'status', header: 'Статус', render: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Постачання</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Створення та управління поставками на склади</p>
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
