import { useState } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../contexts/AppContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { DeliveryRequest, Priority } from '../types';
import { productCatalog } from '../data/mockData';
import DataTable from '../components/shared/DataTable';
import type { Column } from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import PriorityBadge from '../components/shared/PriorityBadge';
import RequestForm from '../components/client/RequestForm';
import { encryptData } from '../utils/security';
import { addToOfflineQueue, getPendingActionsCount } from '../utils/offlineQueue';
import { findNearestStock } from '../utils/distribution';

export default function ClientDashboard() {
  const { requests, warehouses, addRequest } = useApp();
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const isOnline = useOnlineStatus();
  const offlinePending = getPendingActionsCount();

  const handleCreate = async (data: {
    productNumber: string;
    quantity: number;
    address: string;
    latitude: number;
    longitude: number;
    comment: string;
    priority: Priority;
  }) => {
    const encryptedPayload = await encryptData(
      JSON.stringify({ address: data.address, comment: data.comment })
    );

    const requestData = {
      productNumber: data.productNumber,
      quantity: data.quantity,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      comment: data.comment || undefined,
      priority: data.priority,
      encryptedPayload,
    };

    if (!isOnline) {
      addToOfflineQueue('create_request', requestData as unknown as Record<string, unknown>);
      setSuccessMsg('Заявку збережено офлайн. Буде синхронізовано після відновлення зв\'язку.');
    } else {
      setSuccessMsg('Заявку на доставку створено та зашифровано!');
    }

    addRequest(requestData);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const nearestStockResults = selectedProduct
    ? findNearestStock(50.0, 30.0, selectedProduct, warehouses, 1)
    : [];

  const columns: Column<DeliveryRequest>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: 'priority', header: 'Пріоритет', render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'product', header: 'Товар', render: (r) => r.productNumber },
    { key: 'qty', header: 'К-сть', render: (r) => r.quantity },
    { key: 'address', header: 'Адреса', render: (r) => <span className="text-xs">{r.address}</span> },
    { key: 'date', header: 'Дата', render: (r) => new Date(r.createdAt).toLocaleDateString('uk-UA') },
    { key: 'status', header: 'Статус', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header role="client" />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {!isOnline && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center gap-3" role="alert">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Ви офлайн</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">Заявки зберігатимуться локально та синхронізуються після відновлення зв'язку. {offlinePending > 0 && `(${offlinePending} в очікуванні)`}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Заявки на доставку</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Створення та відстеження заявок на доставку</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Нова заявка</h2>
              {successMsg && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400" role="status">
                  {successMsg}
                </div>
              )}
              <RequestForm onSubmit={handleCreate} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Пошук найближчого запасу</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Перевірте, на яких складах є потрібний товар</p>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                aria-label="Оберіть товар для пошуку"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Оберіть товар...</option>
                {Object.entries(productCatalog).map(([code, name]) => (
                  <option key={code} value={code}>{code} — {name}</option>
                ))}
              </select>
              {nearestStockResults.length > 0 && (
                <div className="space-y-2">
                  {nearestStockResults.map((entry, i) => (
                    <div key={entry.warehouse.id} className={`p-3 rounded-lg ${i === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium dark:text-white">{entry.warehouse.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(entry.distance)} км</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{entry.available}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">од.</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedProduct && nearestStockResults.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">Жоден склад не має цього товару в наявності</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Мої заявки</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{requests.length} заявок загалом</p>
              </div>
              <DataTable columns={columns} data={requests} keyExtractor={(r) => r.id} emptyMessage="Заявок ще немає" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
