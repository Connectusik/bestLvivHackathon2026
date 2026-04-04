import { useState } from 'react';

interface RequestFormData {
  productNumber: string;
  quantity: number;
  address: string;
  latitude: number;
  longitude: number;
  comment: string;
}

interface RequestFormProps {
  onSubmit: (data: RequestFormData) => void;
}

export default function RequestForm({ onSubmit }: RequestFormProps) {
  const [form, setForm] = useState({
    productNumber: '',
    quantity: '',
    address: '',
    latitude: '',
    longitude: '',
    comment: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      productNumber: form.productNumber,
      quantity: Number(form.quantity),
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      comment: form.comment,
    });
    setForm({ productNumber: '', quantity: '', address: '', latitude: '', longitude: '', comment: '' });
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Number</label>
        <input
          type="text"
          required
          value={form.productNumber}
          onChange={(e) => setForm({ ...form, productNumber: e.target.value })}
          placeholder="e.g. P001"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input
          type="number"
          required
          min="1"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          placeholder="Enter quantity"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input
          type="text"
          required
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Delivery address"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
          <input
            type="number"
            required
            step="any"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            placeholder="e.g. 49.84"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
          <input
            type="number"
            required
            step="any"
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            placeholder="e.g. 24.03"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
        <textarea
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          placeholder="Any additional notes..."
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="w-full bg-amber-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
      >
        Submit Delivery Request
      </button>
    </form>
  );
}
