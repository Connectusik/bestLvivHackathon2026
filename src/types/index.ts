export type UserRole = 'admin' | 'worker' | 'client';

export type Priority = 'normal' | 'elevated' | 'critical' | 'urgent';

export interface ProductStock {
  productNumber: string;
  name: string;
  quantity: number;
  minThreshold?: number;
}

export interface Warehouse {
  id: string;
  name: string;
  type: 'main' | 'regular';
  latitude: number;
  longitude: number;
  address: string;
  description: string;
  products: ProductStock[];
}

export interface DeliveryRequest {
  id: string;
  productNumber: string;
  quantity: number;
  address: string;
  latitude: number;
  longitude: number;
  comment?: string;
  priority: Priority;
  status: 'pending' | 'approved' | 'in_transit' | 'delivered' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  assignedWarehouseId?: string;
  assignedTruckId?: string;
  assignedWarehouses?: WarehouseAssignment[];
  encryptedPayload?: string;
}

export type TruckStatus = 'available' | 'on_route' | 'inactive';

export interface Truck {
  id: string;
  driverName: string;
  phone: string;
  location: string;
  status: TruckStatus;
  warehouseId: string;
  capacity?: number;
}

export interface SupplyDistributionEntry {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface Supply {
  id: string;
  productNumber: string;
  quantity: number;
  distribution: SupplyDistributionEntry[];
  createdAt: string;
}

export interface Shipment {
  id: string;
  productNumber: string;
  quantity: number;
  sourceWarehouseId: string;
  destinationWarehouseId?: string;
  destinationLabel: string;
  createdAt: string;
}

export interface DistributionPlan {
  requestId: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  productNumber: string;
  quantity: number;
  distance: number;
  priority: Priority;
  score: number;
}

export type DeliveryZone = 'green' | 'yellow' | 'red';

export interface DeliverySource {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  distance: number;
  zone: DeliveryZone;
  score: number;
}

export interface AdvancedDistributionPlan {
  requestId: string;
  requestAddress: string;
  productNumber: string;
  totalQuantity: number;
  priority: Priority;
  isSplit: boolean;
  sources: DeliverySource[];
  totalScore: number;
  savings: number;
  reason: string;
}

export interface WarehouseAssignment {
  warehouseId: string;
  quantity: number;
}

export interface OfflineAction {
  id: string;
  type: 'create_request' | 'approve_request' | 'create_supply' | 'create_shipment';
  payload: Record<string, unknown>;
  timestamp: string;
  synced: boolean;
}

export interface DemandForecast {
  productNumber: string;
  productName: string;
  currentDemand: number;
  pendingRequests: number;
  availableStock: number;
  deficit: number;
  demandLevel: Priority;
}

export interface WeeklyDemandAnalysis {
  productNumber: string;
  productName: string;
  /** Total demand from last 7 days (all order statuses) */
  weeklyDemand: number;
  /** Number of orders in the last 7 days */
  weeklyOrderCount: number;
  /** Average daily demand rate */
  dailyRate: number;
  /** Trend factor: >1 means accelerating demand, <1 means decelerating */
  trendFactor: number;
  /** Priority-weighted multiplier based on recent order priorities */
  priorityMultiplier: number;
  /** Current total stock across all warehouses */
  totalStock: number;
  /** How many days of stock remain at current demand rate */
  stockCoverageDays: number;
  /** Recommended total supply quantity */
  recommendedSupply: number;
  /** Per-warehouse breakdown of recommended supply */
  warehouseBreakdown: WarehouseSupplyRecommendation[];
  demandLevel: Priority;
}

export interface WarehouseSupplyRecommendation {
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  regionalDemand: number;
  recommendedQuantity: number;
  urgencyScore: number;
}
