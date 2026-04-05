import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import type { Priority, AdvancedDistributionPlan, DeliveryZone } from '../../types';
import DataTable from '../../components/shared/DataTable';
import type { Column } from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import PriorityBadge from '../../components/shared/PriorityBadge';
import Modal from '../../components/shared/Modal';
import { calculateAdvancedDistributionPlan, findNearestStock, getWarehouseZones, getZoneLabel, getZoneColor } from '../../utils/distribution';
import type { DeliveryRequest } from '../../types';
import { productCatalog } from '../../data/mockData';
import { exportRequestsReport, exportDistributionReport, exportDeliveryManifest } from '../../utils/pdfExport';

function ZoneBadge({ zone }: { zone: DeliveryZone }) {
  const colors: Record<DeliveryZone, string> = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[zone]}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getZoneColor(zone) }} />
      {getZoneLabel(zone)}
    </span>
  );
}

function SplitBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      Комбінована
    </span>
  );
}

export default function AdminRequestsPage() {
  const { requests, warehouses, trucks, approveRequest, rejectRequest, startDelivery, markDelivered, setRequests, updateRequest } = useApp();
  const [filter, setFilter] = useState<'all' | Priority>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);

  const filtered = requests.filter((r) => {
    if (filter !== 'all' && r.priority !== filter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const priorityOrder: Record<Priority, number> = { urgent: 0, critical: 1, elevated: 2, normal: 3 };
  const sorted = [...filtered].sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const urgentCount = requests.filter((r) => r.priority === 'urgent' && r.status === 'pending').length;
  const criticalCount = requests.filter((r) => r.priority === 'critical' && r.status === 'pending').length;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const advancedPlan = calculateAdvancedDistributionPlan(requests, warehouses);

  const handleApprove = (id: string) => {
    const request = requests.find((r) => r.id === id);
    if (!request) return;
    // Use advanced plan if available for this request
    const plan = advancedPlan.find((p) => p.requestId === id);
    if (plan && plan.sources.length > 0) {
      if (plan.isSplit && plan.sources.length > 1) {
        // Split delivery — assign multiple warehouses
        const primaryWarehouse = plan.sources[0].warehouseId;
        const availableTruck = trucks.find((t) => t.status === 'available' && t.warehouseId === primaryWarehouse);
        updateRequest(id, {
          status: 'approved',
          approvedAt: new Date().toISOString(),
          assignedWarehouseId: primaryWarehouse,
          assignedTruckId: availableTruck?.id,
          assignedWarehouses: plan.sources.map((s) => ({ warehouseId: s.warehouseId, quantity: s.quantity })),
        });
      } else {
        const whId = plan.sources[0].warehouseId;
        const availableTruck = trucks.find((t) => t.status === 'available' && t.warehouseId === whId);
        approveRequest(id, whId, availableTruck?.id);
      }
    } else {
      // Fallback to nearest stock
      const nearest = findNearestStock(request.latitude, request.longitude, request.productNumber, warehouses, request.quantity);
      const assignedWarehouse = nearest.length > 0 ? nearest[0].warehouse.id : undefined;
      const availableTruck = trucks.find((t) => t.status === 'available' && t.warehouseId === assignedWarehouse);
      approveRequest(id, assignedWarehouse, availableTruck?.id);
    }
  };

  const handleAutoDistribute = () => {
    let updated = [...requests];
    for (const plan of advancedPlan) {
      if (plan.sources.length === 0) continue;
      const primaryWarehouse = plan.sources[0].warehouseId;
      const availableTruck = trucks.find((t) => t.status === 'available' && t.warehouseId === primaryWarehouse);
      updated = updated.map((r) =>
        r.id === plan.requestId
          ? {
              ...r,
              status: 'approved' as const,
              approvedAt: new Date().toISOString(),
              assignedWarehouseId: primaryWarehouse,
              assignedTruckId: availableTruck?.id,
              assignedWarehouses: plan.isSplit
                ? plan.sources.map((s) => ({ warehouseId: s.warehouseId, quantity: s.quantity }))
                : undefined,
            }
          : r
      );
    }
    setRequests(updated);
    setShowDistribution(false);
  };

  // Stats for the plan
  const splitCount = advancedPlan.filter((p) => p.isSplit).length;
  const totalSavings = advancedPlan.reduce((s, p) => s + p.savings, 0);
  const unfulfilled = advancedPlan.filter((p) => p.sources.length === 0).length;
  const zoneStats = advancedPlan.reduce((acc, p) => {
    for (const src of p.sources) {
      acc[src.zone] = (acc[src.zone] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<DeliveryZone, number>);

  const columns: Column<DeliveryRequest>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: 'priority', header: 'Пріоритет', render: (r) => <PriorityBadge priority={r.priority} /> },
    { key: 'product', header: 'Товар', render: (r) => <span className="text-xs">{productCatalog[r.productNumber] ?? r.productNumber}</span> },
    { key: 'qty', header: 'К-сть', render: (r) => r.quantity },
    { key: 'address', header: 'Адреса', render: (r) => <span className="text-xs">{r.address}</span> },
    {
      key: 'warehouse', header: 'Склад(и)', render: (r) => {
        if (r.assignedWarehouses && r.assignedWarehouses.length > 1) {
          return (
            <div className="space-y-0.5">
              {r.assignedWarehouses.map((aw) => {
                const wh = warehouses.find((w) => w.id === aw.warehouseId);
                return (
                  <div key={aw.warehouseId} className="text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {wh?.name ?? aw.warehouseId} <span className="text-gray-400">x{aw.quantity}</span>
                  </div>
                );
              })}
            </div>
          );
        }
        if (!r.assignedWarehouseId) return <span className="text-gray-400">—</span>;
        const wh = warehouses.find((w) => w.id === r.assignedWarehouseId);
        return <span className="text-xs">{wh?.name ?? r.assignedWarehouseId}</span>;
      }
    },
    { key: 'date', header: 'Дата', render: (r) => new Date(r.createdAt).toLocaleDateString('uk-UA') },
    { key: 'status', header: 'Статус', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Дії',
      render: (r) => (
        <div className="flex gap-1.5">
          {r.status === 'pending' && (
            <>
              <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Підтвердити</button>
              <button onClick={() => rejectRequest(r.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Відхилити</button>
            </>
          )}
          {r.status === 'approved' && (
            <button onClick={() => startDelivery(r.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Відправити</button>
          )}
          {r.status === 'in_transit' && (
            <button onClick={() => markDelivered(r.id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Доставлено</button>
          )}
          <button onClick={() => setSelectedRequest(r)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Деталі</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {urgentCount > 0 && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{urgentCount} термінов{urgentCount > 1 ? 'их' : 'а'} заяв{urgentCount > 1 ? 'ок' : 'ка'} очікує!</p>
            <p className="text-xs text-red-600 dark:text-red-400">Потрібна негайна обробка</p>
          </div>
        </div>
      )}

      {criticalCount > 0 && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
            </svg>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-300"><span className="font-semibold">{criticalCount} критичн{criticalCount > 1 ? 'их' : 'а'}</span> заяв{criticalCount > 1 ? 'ок' : 'ка'} потребує дії</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Заявки на доставку</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{pendingCount} очікують з {requests.length} загалом</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportRequestsReport(requests, warehouses)}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            PDF
          </button>
          <button
            onClick={() => exportDistributionReport(advancedPlan, warehouses)}
            disabled={advancedPlan.length === 0}
            className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Розподіл PDF
          </button>
        <button
          onClick={() => setShowDistribution(true)}
          disabled={pendingCount === 0}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Авто-розподіл
        </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          {(['all', 'urgent', 'critical', 'elevated', 'normal'] as const).map((p) => {
            const labels: Record<string, string> = { all: 'Всі', urgent: 'Терміново', critical: 'Критично', elevated: 'Підвищений', normal: 'Звичайний' };
            return (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === p ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          {(['all', 'pending', 'approved', 'in_transit', 'delivered', 'rejected'] as const).map((s) => {
            const labels: Record<string, string> = { all: 'Всі статуси', pending: 'Очікує', approved: 'Підтверджено', in_transit: 'В дорозі', delivered: 'Доставлено', rejected: 'Відхилено' };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <DataTable columns={columns} data={sorted} keyExtractor={(r) => r.id} emptyMessage="Немає заявок за обраними фільтрами" />
      </div>

      {/* Request details modal */}
      <Modal open={!!selectedRequest} onClose={() => setSelectedRequest(null)} title={`Заявка ${selectedRequest?.id ?? ''}`}>
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Пріоритет</p>
                <PriorityBadge priority={selectedRequest.priority} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Статус</p>
                <StatusBadge status={selectedRequest.status} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Товар</p>
                <p className="text-sm font-medium">{productCatalog[selectedRequest.productNumber] ?? selectedRequest.productNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Кількість</p>
                <p className="text-sm font-medium">{selectedRequest.quantity}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Адреса</p>
                <p className="text-sm font-medium">{selectedRequest.address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Координати</p>
                <p className="text-sm font-mono">{selectedRequest.latitude}, {selectedRequest.longitude}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Створено</p>
                <p className="text-sm">{new Date(selectedRequest.createdAt).toLocaleString('uk-UA')}</p>
              </div>
              {selectedRequest.comment && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Коментар</p>
                  <p className="text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded">{selectedRequest.comment}</p>
                </div>
              )}
            </div>

            {/* Assigned warehouses for split delivery */}
            {selectedRequest.assignedWarehouses && selectedRequest.assignedWarehouses.length > 1 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  Комбінована доставка <SplitBadge />
                </h3>
                <div className="space-y-2">
                  {selectedRequest.assignedWarehouses.map((aw) => {
                    const wh = warehouses.find((w) => w.id === aw.warehouseId);
                    return (
                      <div key={aw.warehouseId} className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <span className="text-sm font-medium">{wh?.name ?? aw.warehouseId}</span>
                        <span className="text-sm font-bold text-purple-600">{aw.quantity} од.</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery zones */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Зони доставки складів</h3>
              <div className="space-y-2">
                {getWarehouseZones(selectedRequest.latitude, selectedRequest.longitude, warehouses).map((entry) => {
                  const product = entry.warehouse.products.find((p) => p.productNumber === selectedRequest.productNumber);
                  const available = product?.quantity ?? 0;
                  return (
                    <div key={entry.warehouse.id} className="flex items-center justify-between p-2.5 rounded-lg border" style={{
                      backgroundColor: entry.zone === 'green' ? '#f0fdf4' : entry.zone === 'yellow' ? '#fefce8' : '#fef2f2',
                      borderColor: entry.zone === 'green' ? '#bbf7d0' : entry.zone === 'yellow' ? '#fef08a' : '#fecaca',
                    }}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getZoneColor(entry.zone) }} />
                        <div>
                          <p className="text-sm font-medium">{entry.warehouse.name}</p>
                          <p className="text-xs text-gray-500">{Math.round(entry.distance)} км</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <ZoneBadge zone={entry.zone} />
                        <span className={`text-sm font-bold ${available >= selectedRequest.quantity ? 'text-green-600' : available > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          {available} од.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nearest stock (legacy) */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Рекомендований план</h3>
              {(() => {
                const plan = advancedPlan.find((p) => p.requestId === selectedRequest.id);
                if (!plan || plan.sources.length === 0) {
                  return <p className="text-sm text-gray-500">Немає доступного плану розподілу</p>;
                }
                return (
                  <div className="space-y-2">
                    {plan.isSplit && <SplitBadge />}
                    {plan.sources.map((src) => (
                      <div key={src.warehouseId} className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center gap-2">
                          <ZoneBadge zone={src.zone} />
                          <span className="text-sm font-medium">{src.warehouseName}</span>
                          <span className="text-xs text-gray-500">{src.distance} км</span>
                        </div>
                        <span className="text-sm font-bold text-indigo-600">{src.quantity} од.</span>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-1">{plan.reason}</p>
                  </div>
                );
              })()}
            </div>

            <button
              onClick={() => exportDeliveryManifest(selectedRequest, warehouses.find((w) => w.id === selectedRequest.assignedWarehouseId))}
              className="w-full mt-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Завантажити накладну PDF
            </button>
          </div>
        )}
      </Modal>

      {/* Advanced distribution modal */}
      <Modal open={showDistribution} onClose={() => setShowDistribution(false)} title="Розумний авто-розподіл">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Алгоритм враховує зони доставки (зелена до 150 км, жовта до 350 км, червона 350+ км),
            наявність товару, пріоритет та можливість комбінованої доставки з декількох складів.
          </p>

          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
              <p className="text-lg font-bold text-indigo-600">{advancedPlan.length}</p>
              <p className="text-[10px] text-gray-500">Заявок</p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
              <p className="text-lg font-bold text-purple-600">{splitCount}</p>
              <p className="text-[10px] text-gray-500">Комбінованих</p>
            </div>
            <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-lg font-bold text-green-600">{totalSavings > 0 ? totalSavings : '—'}</p>
              <p className="text-[10px] text-gray-500">Економія (у.о.)</p>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
              <p className="text-lg font-bold text-red-600">{unfulfilled}</p>
              <p className="text-[10px] text-gray-500">Не забезпечено</p>
            </div>
          </div>

          {/* Zone distribution */}
          <div className="flex gap-3 text-xs">
            {(['green', 'yellow', 'red'] as const).map((z) => (
              <div key={z} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getZoneColor(z) }} />
                <span className="text-gray-600 dark:text-gray-400">{getZoneLabel(z)}: {zoneStats[z] ?? 0}</span>
              </div>
            ))}
          </div>

          {/* Plan items */}
          {advancedPlan.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              Немає заявок для розподілу.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {advancedPlan.map((plan) => (
                <div key={plan.requestId} className={`p-3 rounded-lg border ${
                  plan.sources.length === 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : plan.isSplit
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{plan.requestId}</span>
                      <PriorityBadge priority={plan.priority} />
                      {plan.isSplit && <SplitBadge />}
                    </div>
                    <span className="text-xs text-gray-500">{productCatalog[plan.productNumber] ?? plan.productNumber} x{plan.totalQuantity}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{plan.requestAddress}</p>

                  {plan.sources.length === 0 ? (
                    <p className="text-xs text-red-600 font-medium">{plan.reason}</p>
                  ) : (
                    <div className="space-y-1">
                      {plan.sources.map((src) => (
                        <div key={src.warehouseId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getZoneColor(src.zone) }} />
                            <span className="font-medium">{src.warehouseName}</span>
                            <span className="text-xs text-gray-400">{src.distance} км</span>
                          </div>
                          <span className="text-xs font-medium">{src.quantity} од.</span>
                        </div>
                      ))}
                      {plan.savings > 0 && (
                        <p className="text-xs text-green-600 font-medium mt-1">Економія: {plan.savings} у.о.</p>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">{plan.reason}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleAutoDistribute} disabled={advancedPlan.filter((p) => p.sources.length > 0).length === 0}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              Застосувати розподіл
            </button>
            <button onClick={() => setShowDistribution(false)}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
              Скасувати
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
