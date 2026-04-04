import { useState, useEffect } from 'react';
import type { Truck, TruckStatus } from '../../types';
import { warehouses } from '../../data/mockData';

interface TruckFormProps {
  truck?: Truck | null;
  onSubmit: (truck: Omit<Truck, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

const defaultForm = {
  driverName: '',
  phone: '',
  location: '',
  status: 'available' as TruckStatus,
  warehouseId: warehouses[0].id,
};

export default function TruckForm({ truck, onSubmit, onCancel }: TruckFormProps) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (truck) {
      setForm({
        driverName: truck.driverName,
        phone: truck.phone,
        location: truck.location,
        status: truck.status,
        warehouseId: truck.warehouseId,
      });
    } else {
      setForm(defaultForm);
    }
  }, [truck]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(truck ? { ...form, id: truck.id } : form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
        <input
          type="text"
          required
          value={form.driverName}
          onChange={(e) => setForm({ ...form, driverName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          required
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as TruckStatus })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="available">Available</option>
          <option value="on_route">On Route</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Warehouse</label>
        <select
          value={form.warehouseId}
          onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {truck ? 'Update Truck' : 'Add Truck'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
