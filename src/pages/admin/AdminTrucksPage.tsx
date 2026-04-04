import { useState } from 'react';
import { trucks as initialTrucks, warehouses } from '../../data/mockData';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { Truck } from '../../types';
import DataTable from '../../components/shared/DataTable';
import type { Column } from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import Modal from '../../components/shared/Modal';
import TruckForm from '../../components/trucks/TruckForm';

export default function AdminTrucksPage() {
  const [trucks, setTrucks] = useLocalStorage<Truck[]>('trucks', initialTrucks);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);

  const handleAdd = () => {
    setEditingTruck(null);
    setModalOpen(true);
  };

  const handleEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setTrucks(trucks.filter((t) => t.id !== id));
  };

  const handleSubmit = (data: Omit<Truck, 'id'> & { id?: string }) => {
    if (data.id) {
      setTrucks(trucks.map((t) => (t.id === data.id ? { ...t, ...data } as Truck : t)));
    } else {
      const newTruck: Truck = {
        ...data,
        id: `T-${String(Date.now()).slice(-4)}`,
      };
      setTrucks([...trucks, newTruck]);
    }
    setModalOpen(false);
    setEditingTruck(null);
  };

  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w.name]));

  const columns: Column<Truck>[] = [
    { key: 'id', header: 'ID', render: (t) => <span className="font-mono text-xs">{t.id}</span> },
    { key: 'driver', header: 'Driver', render: (t) => t.driverName },
    { key: 'phone', header: 'Phone', render: (t) => t.phone },
    { key: 'location', header: 'Location', render: (t) => t.location },
    { key: 'warehouse', header: 'Warehouse', render: (t) => warehouseMap[t.warehouseId] ?? '—' },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(t)}
            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(t.id)}
            className="text-red-600 hover:text-red-800 text-xs font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trucks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fleet vehicles and drivers</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Truck
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <DataTable columns={columns} data={trucks} keyExtractor={(t) => t.id} emptyMessage="No trucks found" />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTruck(null); }}
        title={editingTruck ? 'Edit Truck' : 'Add New Truck'}
      >
        <TruckForm
          truck={editingTruck}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditingTruck(null); }}
        />
      </Modal>
    </div>
  );
}
