export type UserRole = 'admin' | 'worker' | 'client';

export interface ProductStock {
  productNumber: string;
  name: string;
  quantity: number;
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
  status: 'pending' | 'approved' | 'in_transit' | 'delivered';
  createdAt: string;
}

export type TruckStatus = 'available' | 'on_route' | 'inactive';

export interface Truck {
  id: string;
  driverName: string;
  phone: string;
  location: string;
  status: TruckStatus;
  warehouseId: string;
}

export type SupplyStatus = 'pending' | 'in_transit' | 'delivered';

export interface Supply {
  id: string;
  productNumber: string;
  quantity: number;
  destinationWarehouseId: string;
  createdAt: string;
  status: SupplyStatus;
}

export interface Shipment {
  id: string;
  productNumber: string;
  quantity: number;
  sourceWarehouseId: string;
  destinationLabel: string;
  createdAt: string;
  status: 'pending' | 'in_transit' | 'delivered';
}
