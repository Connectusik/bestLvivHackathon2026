import { useState } from 'react';
import Header from '../components/layout/Header';
import { deliveryRequests as initialRequests } from '../data/mockData';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { DeliveryRequest } from '../types';
import DataTable from '../components/shared/DataTable';
import type { Column } from '../components/shared/DataTable';
import StatusBadge from '../components/shared/StatusBadge';
import RequestForm from '../components/client/RequestForm';

export default function ClientDashboard() {
  const [requests, setRequests] = useLocalStorage<DeliveryRequest[]>('deliveryRequests', initialRequests);
  const [successMsg, setSuccessMsg] = useState('');

  const handleCreate = (data: {
    productNumber: string;
    quantity: number;
    address: string;
    latitude: number;
    longitude: number;
    comment: string;
  }) => {
    const newRequest: DeliveryRequest = {
      id: `DR-${String(Date.now()).slice(-4)}`,
      productNumber: data.productNumber,
      quantity: data.quantity,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      comment: data.comment || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setRequests([newRequest, ...requests]);
    setSuccessMsg('Delivery request created successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const columns: Column<DeliveryRequest>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: 'product', header: 'Product #', render: (r) => r.productNumber },
    { key: 'qty', header: 'Qty', render: (r) => r.quantity },
    { key: 'address', header: 'Address', render: (r) => r.address },
    { key: 'date', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header role="client" />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Create and track your delivery requests</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">New Request</h2>

              {successMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  {successMsg}
                </div>
              )}

              <RequestForm onSubmit={handleCreate} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">My Requests</h2>
                <p className="text-xs text-gray-500 mt-0.5">{requests.length} total requests</p>
              </div>
              <DataTable columns={columns} data={requests} keyExtractor={(r) => r.id} emptyMessage="No requests yet" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
