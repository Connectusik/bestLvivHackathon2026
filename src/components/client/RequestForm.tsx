import { useState, useRef, useCallback, useEffect } from 'react';
import type { Priority } from '../../types';
import { productCatalog } from '../../data/mockData';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

function useDebounce<T extends (...args: never[]) => void>(fn: T, delay: number): T {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return useCallback((...args: Parameters<T>) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]) as T;
}

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
  const [geocoding, setGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const geocodeAddress = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ua&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'uk' } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setGeocoding(false);
    }
  }, []);

  const debouncedGeocode = useDebounce(geocodeAddress, 500);

  const handleAddressChange = (value: string) => {
    setForm({ ...form, address: value, latitude: '', longitude: '' });
    setErrors({ ...errors, address: undefined, latitude: undefined, longitude: undefined });
    debouncedGeocode(value);
  };

  const handleSelectSuggestion = (result: NominatimResult) => {
    setForm({
      ...form,
      address: result.display_name,
      latitude: parseFloat(result.lat).toFixed(4),
      longitude: parseFloat(result.lon).toFixed(4),
    });
    setErrors({ ...errors, address: undefined, latitude: undefined, longitude: undefined });
    setSuggestions([]);
    setShowSuggestions(false);
  };

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

      <div className="relative" ref={suggestionsRef}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адреса доставки</label>
        <div className="relative">
          <input
            type="text"
            value={form.address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Почніть вводити адресу..."
            className={inputClass('address')}
          />
          {geocoding && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="animate-spin h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 border-b last:border-b-0 border-gray-100 dark:border-gray-600 transition-colors"
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
        {errors.address && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.address}</p>}
      </div>

      {form.latitude && form.longitude && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs text-blue-700 dark:text-blue-400">
            Координати визначено: {form.latitude}, {form.longitude}
          </span>
        </div>
      )}
      {(errors.latitude || errors.longitude) && !form.latitude && (
        <p className="text-xs text-red-600 dark:text-red-400">Оберіть адресу зі списку для автоматичного визначення координат</p>
      )}

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
