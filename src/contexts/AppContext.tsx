import { createContext, useContext, useCallback, type ReactNode } from 'react';
import type { DeliveryRequest, Truck, Supply, Shipment, Warehouse, SupplyDistributionEntry } from '../types';
import {
  warehouses as initialWarehouses,
  deliveryRequests as initialRequests,
  trucks as initialTrucks,
  supplies as initialSupplies,
  shipments as initialShipments,
} from '../data/mockData';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useNotifications } from './NotificationContext';
import { calculateSmartSupplyDistribution } from '../utils/distribution';

interface AppContextValue {
  warehouses: Warehouse[];
  requests: DeliveryRequest[];
  trucks: Truck[];
  supplies: Supply[];
  shipments: Shipment[];

  // Request mutations
  addRequest: (data: Omit<DeliveryRequest, 'id' | 'createdAt' | 'status'>) => DeliveryRequest;
  updateRequest: (id: string, updates: Partial<DeliveryRequest>) => void;
  approveRequest: (id: string, warehouseId?: string, truckId?: string) => void;
  rejectRequest: (id: string) => void;
  startDelivery: (id: string) => void;
  markDelivered: (id: string) => void;
  setRequests: (requests: DeliveryRequest[]) => void;

  // Truck mutations
  addTruck: (data: Omit<Truck, 'id'>) => void;
  updateTruck: (id: string, data: Partial<Truck>) => void;
  deleteTruck: (id: string) => void;

  // Supply mutations
  addSupply: (data: { productNumber: string; quantity: number }) => void;

  // Warehouse mutations
  addWarehouse: (data: Omit<Warehouse, 'id'>) => void;
  updateWarehouseStock: (warehouseId: string, productNumber: string, quantityDelta: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [warehouses, setWarehouses] = useLocalStorage<Warehouse[]>('warehouses', initialWarehouses);
  const [requests, setRequests] = useLocalStorage<DeliveryRequest[]>('deliveryRequests', initialRequests);
  const [trucks, setTrucks] = useLocalStorage<Truck[]>('trucks', initialTrucks);
  const [supplies, setSupplies] = useLocalStorage<Supply[]>('supplies', initialSupplies);
  const [shipments] = useLocalStorage<Shipment[]>('shipments', initialShipments);
  const { addNotification } = useNotifications();

  const addRequest = useCallback((data: Omit<DeliveryRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: DeliveryRequest = {
      ...data,
      id: `DR-${String(Date.now()).slice(-4)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newRequest, ...prev]);
    addNotification('info', `Нова заявка ${newRequest.id} на ${data.productNumber} x${data.quantity}`);
    return newRequest;
  }, [setRequests, addNotification]);

  const updateRequest = useCallback((id: string, updates: Partial<DeliveryRequest>) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  }, [setRequests]);

  const approveRequest = useCallback((id: string, warehouseId?: string, truckId?: string) => {
    setRequests((prev) => prev.map((r) =>
      r.id === id ? {
        ...r,
        status: 'approved' as const,
        approvedAt: new Date().toISOString(),
        assignedWarehouseId: warehouseId ?? r.assignedWarehouseId,
        assignedTruckId: truckId ?? r.assignedTruckId,
      } : r
    ));
    addNotification('success', `Заявку ${id} підтверджено`);
  }, [setRequests, addNotification]);

  const rejectRequest = useCallback((id: string) => {
    updateRequest(id, { status: 'rejected' });
    addNotification('warning', `Заявку ${id} відхилено`);
  }, [updateRequest, addNotification]);

  const startDelivery = useCallback((id: string) => {
    updateRequest(id, { status: 'in_transit' });
    addNotification('info', `Заявку ${id} відправлено в доставку`);
  }, [updateRequest, addNotification]);

  const markDelivered = useCallback((id: string) => {
    updateRequest(id, { status: 'delivered' });
    addNotification('success', `Заявку ${id} успішно доставлено!`);
  }, [updateRequest, addNotification]);

  const addTruck = useCallback((data: Omit<Truck, 'id'>) => {
    const newTruck: Truck = { ...data, id: `T-${String(Date.now()).slice(-4)}` };
    setTrucks((prev) => [...prev, newTruck]);
    addNotification('info', `Додано транспорт: ${data.driverName}`);
  }, [setTrucks, addNotification]);

  const updateTruck = useCallback((id: string, data: Partial<Truck>) => {
    setTrucks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }, [setTrucks]);

  const deleteTruck = useCallback((id: string) => {
    setTrucks((prev) => prev.filter((t) => t.id !== id));
    addNotification('warning', `Транспорт ${id} видалено`);
  }, [setTrucks, addNotification]);

  const addSupply = useCallback((data: { productNumber: string; quantity: number }) => {
    let distribution: SupplyDistributionEntry[] = [];
    let remaining = data.quantity;

    try {
      // Calculate smart distribution across warehouses based on demand
      const analysis = calculateSmartSupplyDistribution(requests, warehouses);
      const productAnalysis = analysis.find((a) => a.productNumber === data.productNumber);

      if (productAnalysis && productAnalysis.warehouseBreakdown.length > 0) {
        const breakdown = productAnalysis.warehouseBreakdown
          .filter((wb) => wb.recommendedQuantity > 0 || wb.urgencyScore > 0)
          .sort((a, b) => b.urgencyScore - a.urgencyScore);

        if (breakdown.length > 0) {
          const totalRecommended = breakdown.reduce((s, wb) => s + Math.max(wb.recommendedQuantity, 1), 0);

          for (const wb of breakdown) {
            if (remaining <= 0) break;
            const share = Math.ceil((Math.max(wb.recommendedQuantity, 1) / totalRecommended) * data.quantity);
            const qty = Math.min(share, remaining);
            if (qty > 0) {
              distribution.push({ warehouseId: wb.warehouseId, warehouseName: wb.warehouseName, quantity: qty });
              remaining -= qty;
            }
          }
        }
      }
    } catch {
      // fallback to even distribution below
    }

    // If no smart distribution or remaining qty, spread evenly across all warehouses
    if (distribution.length === 0) {
      const perWarehouse = Math.floor(data.quantity / warehouses.length);
      let leftover = data.quantity - perWarehouse * warehouses.length;
      distribution = warehouses.map((wh) => {
        const qty = perWarehouse + (leftover > 0 ? 1 : 0);
        if (leftover > 0) leftover--;
        return { warehouseId: wh.id, warehouseName: wh.name, quantity: qty };
      }).filter((d) => d.quantity > 0);
    }

    const newSupply: Supply = {
      id: `S-${String(Date.now()).slice(-4)}`,
      productNumber: data.productNumber,
      quantity: data.quantity,
      distribution,
      createdAt: new Date().toISOString(),
    };

    setSupplies((prev) => [newSupply, ...prev]);

    // Immediately update warehouse stock
    setWarehouses((prev) => prev.map((wh) => {
      const entry = distribution.find((d) => d.warehouseId === wh.id);
      if (!entry) return wh;
      const hasProduct = wh.products.some((p) => p.productNumber === data.productNumber);
      return {
        ...wh,
        products: hasProduct
          ? wh.products.map((p) =>
              p.productNumber === data.productNumber
                ? { ...p, quantity: p.quantity + entry.quantity }
                : p
            )
          : [...wh.products, { productNumber: data.productNumber, name: data.productNumber, quantity: entry.quantity }],
      };
    }));

    const summary = distribution.map((d) => `${d.warehouseName}: ${d.quantity}`).join(', ');
    addNotification('success', `Постачання ${newSupply.id} розподілено: ${summary}`);
  }, [setSupplies, setWarehouses, addNotification, requests, warehouses]);

  const addWarehouse = useCallback((data: Omit<Warehouse, 'id'>) => {
    const newWarehouse: Warehouse = { ...data, id: `wh-${String(Date.now()).slice(-6)}` };
    setWarehouses((prev) => [...prev, newWarehouse]);
    addNotification('info', `Додано склад: ${data.name}`);
  }, [setWarehouses, addNotification]);

  const updateWarehouseStock = useCallback((warehouseId: string, productNumber: string, quantityDelta: number) => {
    setWarehouses((prev) => prev.map((wh) => {
      if (wh.id !== warehouseId) return wh;
      return {
        ...wh,
        products: wh.products.map((p) =>
          p.productNumber === productNumber
            ? { ...p, quantity: Math.max(0, p.quantity + quantityDelta) }
            : p
        ),
      };
    }));
  }, [setWarehouses]);

  return (
    <AppContext.Provider value={{
      warehouses, requests, trucks, supplies, shipments,
      addRequest, updateRequest, approveRequest, rejectRequest,
      startDelivery, markDelivered, setRequests,
      addTruck, updateTruck, deleteTruck,
      addSupply, addWarehouse, updateWarehouseStock,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
