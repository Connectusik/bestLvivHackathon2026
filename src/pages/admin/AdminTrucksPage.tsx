import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import type { Truck } from '../../types';
import DataTable from '../../components/shared/DataTable';
import type { Column } from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import Modal from '../../components/shared/Modal';
import TruckForm from '../../components/trucks/TruckForm';

export default function AdminTrucksPage() {
  const { trucks, warehouses, addTruck, updateTruck, deleteTruck } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);

  const handleAdd = () => { setEditingTruck(null); setModalOpen(true); };
  const handleEdit = (truck: Truck) => { setEditingTruck(truck); setModalOpen(true); };

  const handleSubmit = (data: Omit<Truck, 'id'> & { id?: string }) => {
    if (data.id) {
      updateTruck(data.id, data);
    } else {
      addTruck(data);
    }
    setModalOpen(false);
    setEditingTruck(null);
  };

  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w.name]));

  const columns: Column<Truck>[] = [
    { key: 'id', header: 'ID', render: (t) => <span className="font-mono text-xs">{t.id}</span> },
    { key: 'driver', header: 'Водій', render: (t) => t.driverName },
    { key: 'phone', header: 'Телефон', render: (t) => t.phone },
    { key: 'location', header: 'Місцезнаходження', render: (t) => t.location },
    { key: 'capacity', header: 'Вантажність', render: (t) => t.capacity ? `${t.capacity.toLocaleString()} кг` : '—' },
    { key: 'warehouse', header: 'Склад', render: (t) => warehouseMap[t.warehouseId] ?? '—' },
    { key: 'status', header: 'Статус', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'actions', header: 'Дії', render: (t) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(t)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Редагувати</button>
          <button onClick={() => deleteTruck(t.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Видалити</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Транспорт</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управління автопарком та водіями</p>
        </div>
        <button onClick={handleAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Додати транспорт
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={trucks} keyExtractor={(t) => t.id} emptyMessage="Транспорт не знайдено" />
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingTruck(null); }}
        title={editingTruck ? 'Редагувати транспорт' : 'Додати новий транспорт'}>
        <TruckForm truck={editingTruck} onSubmit={handleSubmit} onCancel={() => { setModalOpen(false); setEditingTruck(null); }} />
      </Modal>
    </div>
  );
}
