import { useState } from 'react';

interface SupplyFormProps {
  onSubmit: (data: { productNumber: string; quantity: number }) => void;
}

export default function SupplyForm({ onSubmit }: SupplyFormProps) {
  const [productNumber, setProductNumber] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ productNumber, quantity: Number(quantity) });
    setProductNumber('');
    setQuantity('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Number</label>
        <input
          type="text"
          required
          value={productNumber}
          onChange={(e) => setProductNumber(e.target.value)}
          placeholder="e.g. P001"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input
          type="number"
          required
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
        <input
          type="text"
          readOnly
          value="Main Warehouse (Central Warehouse Kyiv)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        Create Supply
      </button>
    </form>
  );
}
