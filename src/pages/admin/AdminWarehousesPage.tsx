import { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { productCatalog } from '../../data/mockData';
import Modal from '../../components/shared/Modal';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type ChartType = 'bar' | 'line' | 'area';

const PRODUCT_COLORS: Record<string, string> = {
  'P001': '#6366f1', 'P002': '#f59e0b', 'P003': '#10b981',
  'P004': '#ef4444', 'P005': '#8b5cf6', 'P006': '#06b6d4',
};

function generateWeeklyData(productNumber: string, warehouses: { id: string; name: string; products: { productNumber: string; quantity: number }[] }[]) {
  const today = new Date('2026-04-05');
  const days: { date: string;[key: string]: string | number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
    const entry: { date: string;[key: string]: string | number } = { date: label };
    for (const wh of warehouses) {
      const stock = wh.products.find((p) => p.productNumber === productNumber);
      if (stock) {
        const base = stock.quantity;
        const variance = Math.round(base * 0.15);
        const offset = i === 0 ? 0 : Math.round((Math.random() - 0.3) * variance);
        entry[wh.name] = Math.max(0, base + offset);
      }
    }
    days.push(entry);
  }
  return days;
}

const emptyForm = {
  name: '',
  type: 'regular' as 'main' | 'regular',
  address: '',
  description: '',
  latitude: '',
  longitude: '',
};

export default function AdminWarehousesPage() {
  const { warehouses, addWarehouse } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const handleAddWarehouse = () => {
    if (!form.name.trim() || !form.address.trim() || !form.latitude || !form.longitude) {
      setFormError('Заповніть усі обов\'язкові поля');
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng) || lat < 44 || lat > 53 || lng < 22 || lng > 41) {
      setFormError('Невірні координати (Україна: 44-53°N, 22-41°E)');
      return;
    }
    const products = Object.entries(productCatalog).map(([num, name]) => ({
      productNumber: num,
      name,
      quantity: 0,
      minThreshold: 0,
    }));
    addWarehouse({
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim(),
      description: form.description.trim(),
      latitude: lat,
      longitude: lng,
      products,
    });
    setForm(emptyForm);
    setFormError('');
    setShowModal(false);
  };

  const allProducts = useMemo(() =>
    Array.from(new Map(warehouses.flatMap((w) => w.products).map((p) => [p.productNumber, p])).values()),
    [warehouses]
  );

  const [selectedProduct, setSelectedProduct] = useState(allProducts[0]?.productNumber ?? '');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

  const weeklyData = useMemo(() => generateWeeklyData(selectedProduct, warehouses), [selectedProduct, warehouses]);

  const warehousesForChart = selectedWarehouse === 'all'
    ? warehouses.filter((w) => w.products.some((p) => p.productNumber === selectedProduct))
    : warehouses.filter((w) => w.id === selectedWarehouse && w.products.some((p) => p.productNumber === selectedProduct));

  const totalByProduct = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const p of allProducts) {
      totals[p.productNumber] = warehouses.reduce((sum, w) => {
        const stock = w.products.find((s) => s.productNumber === p.productNumber);
        return sum + (stock?.quantity ?? 0);
      }, 0);
    }
    return totals;
  }, [allProducts, warehouses]);

  const selectedProductName = allProducts.find((p) => p.productNumber === selectedProduct)?.name ?? '';

  const renderChart = () => {
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
    const lines = warehousesForChart.map((wh, idx) => {
      const color = colors[idx % colors.length];
      if (chartType === 'bar') return <Bar key={wh.id} dataKey={wh.name} fill={color} radius={[4, 4, 0, 0]} />;
      if (chartType === 'area') return <Area key={wh.id} type="monotone" dataKey={wh.name} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />;
      return <Line key={wh.id} type="monotone" dataKey={wh.name} stroke={color} strokeWidth={2} dot={{ r: 4 }} />;
    });
    const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'area' ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height={350}>
        <ChartComponent data={weeklyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
          <Legend />
          {lines}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Склади</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Огляд запасів та статистика по товарах</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Додати склад
        </button>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setFormError(''); }} title="Новий склад">
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Назва *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Склад Запоріжжя"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'main' | 'regular' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="regular">Звичайний</option>
              <option value="main">Головний</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адреса *</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Запоріжжя, пр. Соборний, 100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Широта *</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="47.8388"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Довгота *</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="35.1396"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Опис</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Розподільчий центр регіону"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddWarehouse}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Додати
            </button>
            <button
              onClick={() => { setShowModal(false); setFormError(''); }}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Скасувати
            </button>
          </div>
        </div>
      </Modal>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Поточні запаси</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 text-left">
                <th className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Склад</th>
                {allProducts.map((p) => (
                  <th key={p.productNumber} className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{p.productNumber}</span>
                      <span>{p.name}</span>
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300 text-center">Всього</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {warehouses.map((wh) => {
                const whTotal = wh.products.reduce((s, p) => s + p.quantity, 0);
                return (
                  <tr key={wh.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${wh.type === 'main' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="font-medium text-gray-900 dark:text-white">{wh.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{wh.address}</span>
                    </td>
                    {allProducts.map((p) => {
                      const stock = wh.products.find((s) => s.productNumber === p.productNumber);
                      const qty = stock?.quantity ?? 0;
                      const isLow = stock?.minThreshold && qty < stock.minThreshold;
                      return (
                        <td key={p.productNumber} className="px-5 py-3 text-center">
                          {qty > 0 ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isLow ? 'bg-red-100 text-red-700' : ''
                              }`}
                              style={!isLow ? {
                                backgroundColor: `${PRODUCT_COLORS[p.productNumber]}15`,
                                color: PRODUCT_COLORS[p.productNumber],
                              } : undefined}
                            >
                              {qty}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">&mdash;</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">{whTotal}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-900 font-semibold">
                <td className="px-5 py-3 text-gray-700 dark:text-gray-300">Всього</td>
                {allProducts.map((p) => (
                  <td key={p.productNumber} className="px-5 py-3 text-center text-gray-700 dark:text-gray-300">
                    {totalByProduct[p.productNumber]}
                  </td>
                ))}
                <td className="px-5 py-3 text-center text-gray-900 dark:text-white">
                  {Object.values(totalByProduct).reduce((s, v) => s + v, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Тижнева статистика: <span className="text-indigo-600">{selectedProductName}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white">
              {allProducts.map((p) => (
                <option key={p.productNumber} value={p.productNumber}>{p.productNumber} — {p.name}</option>
              ))}
            </select>
            <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white">
              <option value="all">Всі склади</option>
              {warehouses
                .filter((w) => w.products.some((p) => p.productNumber === selectedProduct))
                .map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              {([['bar', 'Стовпчик'], ['line', 'Лінія'], ['area', 'Область']] as [ChartType, string][]).map(([type, label]) => (
                <button key={type} onClick={() => setChartType(type)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    chartType === type ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5">{renderChart()}</div>
      </div>
    </div>
  );
}
