import { useState } from 'react';
import type { Priority } from '../../types';
import { productCatalog } from '../../data/mockData';

interface RequestFormData {
  productNumber: string;
  quantity: number;
  address: string;
  latitude: number;
  longitude: number;
  comment: string;
  priority: Priority;
}

interface RequestFormProps {
  onSubmit: (data: RequestFormData) => void;
}

const priorityOptions: { value: Priority; label: string; description: string; color: string }[] = [
  { value: 'normal', label: 'Звичайний', description: 'Стандартний термін доставки', color: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30' },
  { value: 'elevated', label: 'Підвищений', description: 'Вищий за звичайний попит', color: 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/30' },
  { value: 'critical', label: 'Критичний', description: 'Значний ризик дефіциту', color: 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/30' },
  { value: 'urgent', label: 'Терміновий', description: 'Потрібна негайна дія', color: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30' },
];

interface ValidationErrors {
  productNumber?: string;
  quantity?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

export default function RequestForm({ onSubmit }: RequestFormProps) {
  const [form, setForm] = useState({
    productNumber: '',
    quantity: '',
    address: '',
    latitude: '',
    longitude: '',
    comment: '',
    priority: 'normal' as Priority,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!form.productNumber) {
      newErrors.productNumber = 'Оберіть товар';
    }

    const qty = Number(form.quantity);
    if (!form.quantity || qty <= 0) {
      newErrors.quantity = 'Кількість має бути більше 0';
    } else if (qty > 10000) {
      newErrors.quantity = 'Максимальна кількість: 10 000';
    } else if (!Number.isInteger(qty)) {
      newErrors.quantity = 'Кількість має бути цілим числом';
    }

    if (!form.address || form.address.trim().length < 5) {
      newErrors.address = 'Введіть повну адресу (мінімум 5 символів)';
    }

    const lat = Number(form.latitude);
    if (!form.latitude || isNaN(lat)) {
      newErrors.latitude = 'Введіть широту';
    } else if (lat < 44.0 || lat > 53.0) {
      newErrors.latitude = 'Широта має бути 44–53 (Україна)';
    }

    const lon = Number(form.longitude);
    if (!form.longitude || isNaN(lon)) {
      newErrors.longitude = 'Введіть довготу';
    } else if (lon < 22.0 || lon > 41.0) {
      newErrors.longitude = 'Довгота має бути 22–41 (Україна)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      productNumber: form.productNumber,
      quantity: Number(form.quantity),
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      comment: form.comment,
      priority: form.priority,
    });
    setForm({ productNumber: '', quantity: '', address: '', latitude: '', longitude: '', comment: '', priority: 'normal' });
    setErrors({});
  };

  const inputClass = (field: keyof ValidationErrors) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 ${
      errors[field] ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600' : 'border-gray-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Товар</label>
        <select
          value={form.productNumber}
          onChange={(e) => { setForm({ ...form, productNumber: e.target.value }); setErrors({ ...errors, productNumber: undefined }); }}
          className={inputClass('productNumber')}
        >
          <option value="">Оберіть товар...</option>
          {Object.entries(productCatalog).map(([code, name]) => (
            <option key={code} value={code}>{code} — {name}</option>
          ))}
        </select>
        {errors.productNumber && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.productNumber}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Кількість</label>
        <input
          type="number"
          min="1"
          max="10000"
          step="1"
          value={form.quantity}
          onChange={(e) => { setForm({ ...form, quantity: e.target.value }); setErrors({ ...errors, quantity: undefined }); }}
          placeholder="Введіть кількість"
          className={inputClass('quantity')}
        />
        {errors.quantity && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.quantity}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Пріоритет</label>
        <div className="grid grid-cols-2 gap-2">
          {priorityOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm({ ...form, priority: opt.value })}
              className={`p-2 rounded-lg border-2 text-left transition-all ${
                form.priority === opt.value
                  ? `${opt.color} ring-2 ring-offset-1 ring-amber-400 dark:ring-offset-gray-800`
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <p className="text-xs font-semibold dark:text-white">{opt.label}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адреса доставки</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: undefined }); }}
          placeholder="Місто, вулиця, будинок"
          className={inputClass('address')}
        />
        {errors.address && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Широта</label>
          <input
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => { setForm({ ...form, latitude: e.target.value }); setErrors({ ...errors, latitude: undefined }); }}
            placeholder="напр. 49.84"
            className={inputClass('latitude')}
          />
          {errors.latitude && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.latitude}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Довгота</label>
          <input
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => { setForm({ ...form, longitude: e.target.value }); setErrors({ ...errors, longitude: undefined }); }}
            placeholder="напр. 24.03"
            className={inputClass('longitude')}
          />
          {errors.longitude && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.longitude}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Коментар (необов'язково)</label>
        <textarea
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          maxLength={500}
          placeholder="Додаткові примітки..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-xs text-green-700 dark:text-green-400">Дані шифруються AES-256-GCM перед відправкою</span>
      </div>

      <button
        type="submit"
        className="w-full bg-amber-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
      >
        Створити заявку на доставку
      </button>
    </form>
  );
}
