import { useState, useMemo } from 'react';
import type { Truck, TruckStatus } from '../../types';
import { warehouses } from '../../data/mockData';

interface TruckFormProps {
  truck?: Truck | null;
  onSubmit: (truck: Omit<Truck, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

interface ValidationErrors {
  driverName?: string;
  phone?: string;
  location?: string;
  capacity?: string;
}

const defaultForm = {
  driverName: '',
  phone: '',
  location: '',
  status: 'available' as TruckStatus,
  warehouseId: warehouses[0].id,
  capacity: 3000,
};

const PHONE_REGEX = /^\+?3?8?0\d{9}$/;

export default function TruckForm({ truck, onSubmit, onCancel }: TruckFormProps) {
  const initialForm = useMemo(() => truck ? {
    driverName: truck.driverName,
    phone: truck.phone,
    location: truck.location,
    status: truck.status,
    warehouseId: truck.warehouseId,
    capacity: truck.capacity ?? 3000,
  } : defaultForm, [truck]);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [prevTruckId, setPrevTruckId] = useState(truck?.id);

  if (truck?.id !== prevTruckId) {
    setPrevTruckId(truck?.id);
    setForm(truck ? {
      driverName: truck.driverName,
      phone: truck.phone,
      location: truck.location,
      status: truck.status,
      warehouseId: truck.warehouseId,
      capacity: truck.capacity ?? 3000,
    } : defaultForm);
  }

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!form.driverName.trim() || form.driverName.trim().length < 3) {
      newErrors.driverName = "Ім'я має містити мінімум 3 символи";
    }

    const cleanPhone = form.phone.replace(/[\s\-()]/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Введіть номер телефону';
    } else if (!PHONE_REGEX.test(cleanPhone)) {
      newErrors.phone = 'Невірний формат (напр. +380XXXXXXXXX)';
    }

    if (!form.location.trim() || form.location.trim().length < 2) {
      newErrors.location = 'Вкажіть місцезнаходження';
    }

    if (form.capacity < 500) {
      newErrors.capacity = 'Мінімальна вантажність: 500 кг';
    } else if (form.capacity > 20000) {
      newErrors.capacity = 'Максимальна вантажність: 20 000 кг';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(truck ? { ...form, id: truck.id } : form);
  };

  const inputClass = (field: keyof ValidationErrors) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
      errors[field] ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600' : 'border-gray-300'
    }`;

  const baseInputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ім'я водія</label>
        <input type="text" value={form.driverName}
          onChange={(e) => { setForm({ ...form, driverName: e.target.value }); setErrors({ ...errors, driverName: undefined }); }}
          className={inputClass('driverName')} />
        {errors.driverName && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.driverName}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
        <input type="tel" value={form.phone}
          onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }}
          placeholder="+380XXXXXXXXX" className={inputClass('phone')} />
        {errors.phone && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.phone}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Місцезнаходження</label>
        <input type="text" value={form.location}
          onChange={(e) => { setForm({ ...form, location: e.target.value }); setErrors({ ...errors, location: undefined }); }}
          className={inputClass('location')} />
        {errors.location && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.location}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Вантажність (кг)</label>
        <input type="number" min="500" max="20000" value={form.capacity}
          onChange={(e) => { setForm({ ...form, capacity: Number(e.target.value) }); setErrors({ ...errors, capacity: undefined }); }}
          className={inputClass('capacity')} />
        {errors.capacity && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.capacity}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Статус</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TruckStatus })} className={baseInputClass}>
          <option value="available">Доступний</option>
          <option value="on_route">В дорозі</option>
          <option value="inactive">Неактивний</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Призначений склад</label>
        <select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} className={baseInputClass}>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          {truck ? 'Оновити' : 'Додати'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          Скасувати
        </button>
      </div>
    </form>
  );
}
