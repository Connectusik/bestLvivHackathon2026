import { useState } from 'react';
import { productCatalog } from '../../data/mockData';

interface SupplyFormProps {
  onSubmit: (data: { productNumber: string; quantity: number }) => void;
}

interface ValidationErrors {
  productNumber?: string;
  quantity?: string;
}

export default function SupplyForm({ onSubmit }: SupplyFormProps) {
  const [productNumber, setProductNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!productNumber) {
      newErrors.productNumber = 'Оберіть товар';
    }

    const qty = Number(quantity);
    if (!quantity || qty <= 0) {
      newErrors.quantity = 'Кількість має бути більше 0';
    } else if (qty > 10000) {
      newErrors.quantity = 'Максимальна кількість: 10 000';
    } else if (!Number.isInteger(qty)) {
      newErrors.quantity = 'Кількість має бути цілим числом';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ productNumber, quantity: Number(quantity) });
    setProductNumber('');
    setQuantity('');
    setErrors({});
  };

  const inputClass = (field: keyof ValidationErrors) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
      errors[field] ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600' : 'border-gray-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Товар</label>
        <select value={productNumber} onChange={(e) => { setProductNumber(e.target.value); setErrors({ ...errors, productNumber: undefined }); }} className={inputClass('productNumber')}>
          <option value="">Оберіть товар...</option>
          {Object.entries(productCatalog).map(([code, name]) => (
            <option key={code} value={code}>{code} — {name}</option>
          ))}
        </select>
        {errors.productNumber && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.productNumber}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Кількість</label>
        <input type="number" min="1" max="10000" value={quantity}
          onChange={(e) => { setQuantity(e.target.value); setErrors({ ...errors, quantity: undefined }); }}
          placeholder="Введіть кількість" className={inputClass('quantity')} />
        {errors.quantity && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.quantity}</p>}
      </div>
      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          Товар буде автоматично розподілено по складах згідно з поточним попитом та потребами кожного регіону.
        </p>
      </div>
      <button type="submit"
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
        Створити постачання
      </button>
    </form>
  );
}
