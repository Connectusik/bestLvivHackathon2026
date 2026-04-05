import { useState } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { productCatalog } from '../data/mockData';
import DataTable from '../components/shared/DataTable';
import type { Column } from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PriorityBadge from '../components/shared/PriorityBadge';
import type { Supply, Shipment, Truck, DeliveryRequest } from '../types';
import { findNearestStock } from '../utils/distribution';
import { syncOfflineActions, getPendingActionsCount } from '../utils/offlineQueue';

const supplyColumns: Column<Supply>[] = [
  { key: 'id', header: 'ID', render: (s) => <span className="font-mono text-xs">{s.id}</span> },
  { key: 'product', header: 'Товар', render: (s) => s.productNumber },
  { key: 'qty', header: 'К-сть', render: (s) => s.quantity },
  { key: 'distribution', header: 'Розподіл', render: (s) => (
    <div className="space-y-0.5">
      {s.distribution.map((d) => (
        <div key={d.warehouseId} className="text-xs">
          <span className="text-gray-600 dark:text-gray-400">{d.warehouseName}</span>{' '}
          <span className="font-medium text-indigo-600 dark:text-indigo-400">×{d.quantity}</span>
        </div>
      ))}
    </div>
  ) },
  { key: 'date', header: 'Дата', render: (s) => new Date(s.createdAt).toLocaleDateString('uk-UA') },
];

const shipmentColumns: Column<Shipment>[] = [
  { key: 'id', header: 'ID', render: (s) => <span className="font-mono text-xs">{s.id}</span> },
  { key: 'product', header: 'Товар', render: (s) => s.productNumber },
  { key: 'qty', header: 'К-сть', render: (s) => s.quantity },
  { key: 'dest', header: 'Призначення', render: (s) => s.destinationLabel },
  { key: 'date', header: 'Дата', render: (s) => new Date(s.createdAt).toLocaleDateString('uk-UA') },
];

const truckColumns: Column<Truck>[] = [
  { key: 'id', header: 'ID', render: (t) => <span className="font-mono text-xs">{t.id}</span> },
  { key: 'driver', header: 'Водій', render: (t) => t.driverName },
  { key: 'location', header: 'Місце', render: (t) => t.location },
  { key: 'status', header: 'Статус', render: (t) => <StatusBadge status={t.status} /> },
];

const requestColumns: Column<DeliveryRequest>[] = [
  { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { key: 'priority', header: 'Пріоритет', render: (r) => <PriorityBadge priority={r.priority} /> },
  { key: 'product', header: 'Товар', render: (r) => `${r.productNumber} x${r.quantity}` },
  { key: 'address', header: 'Адреса', render: (r) => <span className="text-xs">{r.address}</span> },
  { key: 'status', header: 'Статус', render: (r) => <StatusBadge status={r.status} /> },
];

export default function WorkerDashboard() {
  const { warehouses, trucks, supplies, shipments, requests } = useApp();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [syncMsg, setSyncMsg] = useState('');
  const [searchProduct, setSearchProduct] = useState('');

  const assignedWarehouse = warehouses.find((w) => w.id === user?.warehouseId) ?? warehouses[0];

  const warehouseTrucks = trucks.filter((t) => t.warehouseId === assignedWarehouse.id);
  // Show supplies that have distribution entries for this warehouse
  const warehouseSupplies = supplies.filter((s) =>
    s.distribution.some((d) => d.warehouseId === assignedWarehouse.id)
  );
  const warehouseShipments = shipments.filter((s) => s.sourceWarehouseId === assignedWarehouse.id);

  const warehouseRequests = requests.filter(
    (r) => r.assignedWarehouseId === assignedWarehouse.id && r.status !== 'delivered' && r.status !== 'rejected'
  );

  const urgentForWarehouse = requests.filter(
    (r) => (r.priority === 'urgent' || r.priority === 'critical') && r.status === 'pending'
  );

  const pendingOffline = getPendingActionsCount();

  const handleSync = async () => {
    const result = await syncOfflineActions();
    setSyncMsg(`Синхронізовано ${result.synced} дій${result.failed > 0 ? `, ${result.failed} з помилками` : ''}`);
    setTimeout(() => setSyncMsg(''), 3000);
  };

  const nearestResults = searchProduct
    ? findNearestStock(assignedWarehouse.latitude, assignedWarehouse.longitude, searchProduct, warehouses, 1)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header role="worker" />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Connection status */}
        <div className={`flex items-center justify-between p-3 rounded-xl border ${isOnline ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}`} role="status">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className={`text-sm font-medium ${isOnline ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
              {isOnline ? 'Онлайн' : 'Офлайн — робота в локальному режимі'}
            </span>
          </div>
          {pendingOffline > 0 && (
            <button onClick={handleSync} className="text-xs bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
              Синхронізувати {pendingOffline} дій
            </button>
          )}
          {syncMsg && <span className="text-xs text-green-600 dark:text-green-400">{syncMsg}</span>}
        </div>

        {/* Urgent alerts */}
        {urgentForWarehouse.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4" role="alert">
            <h3 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Термінові заявки, що потребують уваги
            </h3>
            <div className="space-y-2">
              {urgentForWarehouse.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs dark:text-gray-300">{r.id}</span>
                    <PriorityBadge priority={r.priority} />
                    <span className="text-sm dark:text-gray-300">{r.productNumber} x{r.quantity}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{r.address}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warehouse Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{assignedWarehouse.name}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  assignedWarehouse.type === 'main' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {assignedWarehouse.type === 'main' ? 'Головний склад' : 'Регіональний склад'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{assignedWarehouse.address}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{assignedWarehouse.description}</p>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Запаси</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {assignedWarehouse.products.map((p) => {
                const isLow = p.minThreshold && p.quantity < p.minThreshold;
                return (
                  <div key={p.productNumber} className={`rounded-lg p-3 ${isLow ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.productNumber}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                    <p className={`text-lg font-bold mt-1 ${isLow ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{p.quantity}</p>
                    {p.minThreshold && (
                      <div className="mt-1">
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((p.quantity / (p.minThreshold * 3)) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Мін: {p.minThreshold}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Assigned requests */}
        {warehouseRequests.length > 0 && (
          <Section title="Заявки для цього складу" subtitle="Заявки, призначені для обробки">
            <DataTable columns={requestColumns} data={warehouseRequests} keyExtractor={(r) => r.id} emptyMessage="Немає призначених заявок" />
          </Section>
        )}

        {/* Nearest Stock Finder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Пошук товару на інших складах</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Перевірте наявність товару на всіх складах</p>
          <div className="flex gap-3">
            <select value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)}
              aria-label="Оберіть товар для пошуку"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">Оберіть товар для пошуку...</option>
              {Object.entries(productCatalog).map(([code, name]) => (
                <option key={code} value={code}>{code} — {name}</option>
              ))}
            </select>
          </div>
          {nearestResults.length > 0 && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {nearestResults.map((entry, i) => (
                <div key={entry.warehouse.id} className={`p-3 rounded-lg ${i === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium dark:text-white">{entry.warehouse.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(entry.distance)} км</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{entry.available}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">в наявності</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supplies & Shipments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Постачання на склад" subtitle="Товари, розподілені на цей склад">
            <DataTable columns={supplyColumns} data={warehouseSupplies} keyExtractor={(s) => s.id} emptyMessage="Немає постачань" />
          </Section>
          <Section title="Відправки зі складу" subtitle="Міжскладські переміщення">
            <DataTable columns={shipmentColumns} data={warehouseShipments} keyExtractor={(s) => s.id} emptyMessage="Немає відправок" />
          </Section>
        </div>

        {/* Trucks */}
        <Section title="Транспорт складу" subtitle="Вантажівки, призначені до цього складу">
          <DataTable columns={truckColumns} data={warehouseTrucks} keyExtractor={(t) => t.id} emptyMessage="Транспорт не призначено" />
        </Section>
      </main>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
