import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  findNearestStock,
  calculateDistributionPlan,
  calculateDemandForecast,
  calculateRebalancingPlan,
} from './distribution';
import type { Warehouse, DeliveryRequest } from '../types';

// --- Test Warehouses ---
const testWarehouses: Warehouse[] = [
  {
    id: 'wh-1',
    name: 'Kyiv',
    type: 'main',
    latitude: 50.4501,
    longitude: 30.5234,
    address: 'Kyiv',
    description: '',
    products: [
      { productNumber: 'P001', name: 'A', quantity: 500, minThreshold: 100 },
      { productNumber: 'P002', name: 'B', quantity: 50, minThreshold: 80 },
    ],
  },
  {
    id: 'wh-2',
    name: 'Lviv',
    type: 'regular',
    latitude: 49.8397,
    longitude: 24.0297,
    address: 'Lviv',
    description: '',
    products: [
      { productNumber: 'P001', name: 'A', quantity: 100, minThreshold: 30 },
      { productNumber: 'P002', name: 'B', quantity: 200, minThreshold: 50 },
    ],
  },
  {
    id: 'wh-3',
    name: 'Odesa',
    type: 'regular',
    latitude: 46.4825,
    longitude: 30.7233,
    address: 'Odesa',
    description: '',
    products: [
      { productNumber: 'P001', name: 'A', quantity: 10, minThreshold: 20 },
      { productNumber: 'P002', name: 'B', quantity: 300, minThreshold: 50 },
    ],
  },
];

// --- Haversine Distance ---
describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(50.0, 30.0, 50.0, 30.0)).toBe(0);
  });

  it('calculates Kyiv-Lviv distance (~470 km)', () => {
    const d = haversineDistance(50.4501, 30.5234, 49.8397, 24.0297);
    expect(d).toBeGreaterThan(450);
    expect(d).toBeLessThan(500);
  });

  it('calculates Kyiv-Odesa distance (~440 km)', () => {
    const d = haversineDistance(50.4501, 30.5234, 46.4825, 30.7233);
    expect(d).toBeGreaterThan(430);
    expect(d).toBeLessThan(450);
  });

  it('is symmetric', () => {
    const d1 = haversineDistance(50.0, 30.0, 48.0, 25.0);
    const d2 = haversineDistance(48.0, 25.0, 50.0, 30.0);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });
});

// --- findNearestStock ---
describe('findNearestStock', () => {
  it('returns warehouses sorted by distance', () => {
    // Point near Lviv
    const results = findNearestStock(49.8, 24.0, 'P001', testWarehouses, 1);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].warehouse.id).toBe('wh-2'); // Lviv is closest
  });

  it('filters by minimum quantity', () => {
    // P001: Odesa only has 10
    const results = findNearestStock(46.5, 30.7, 'P001', testWarehouses, 50);
    const idsInResults = results.map((r) => r.warehouse.id);
    expect(idsInResults).not.toContain('wh-3'); // Odesa has only 10
    expect(idsInResults).toContain('wh-1'); // Kyiv has 500
  });

  it('returns empty for non-existent product', () => {
    const results = findNearestStock(50.0, 30.0, 'P999', testWarehouses, 1);
    expect(results).toHaveLength(0);
  });
});

// --- calculateDistributionPlan ---
describe('calculateDistributionPlan', () => {
  const requests: DeliveryRequest[] = [
    {
      id: 'DR-1', productNumber: 'P001', quantity: 20,
      address: 'Lviv', latitude: 49.84, longitude: 24.03,
      priority: 'urgent', status: 'pending', createdAt: '2026-04-01T00:00:00Z',
    },
    {
      id: 'DR-2', productNumber: 'P001', quantity: 10,
      address: 'Kyiv', latitude: 50.45, longitude: 30.52,
      priority: 'normal', status: 'pending', createdAt: '2026-04-01T01:00:00Z',
    },
    {
      id: 'DR-3', productNumber: 'P001', quantity: 5,
      address: 'Kyiv', latitude: 50.45, longitude: 30.52,
      priority: 'normal', status: 'delivered', createdAt: '2026-04-01T02:00:00Z',
    },
  ];

  it('only processes pending requests', () => {
    const plans = calculateDistributionPlan(requests, testWarehouses);
    const ids = plans.map((p) => p.requestId);
    expect(ids).toContain('DR-1');
    expect(ids).toContain('DR-2');
    expect(ids).not.toContain('DR-3'); // delivered
  });

  it('prioritizes urgent requests first', () => {
    const plans = calculateDistributionPlan(requests, testWarehouses);
    expect(plans[0].requestId).toBe('DR-1'); // urgent
  });

  it('assigns closest warehouse with sufficient stock', () => {
    const plans = calculateDistributionPlan(requests, testWarehouses);
    const urgentPlan = plans.find((p) => p.requestId === 'DR-1');
    expect(urgentPlan?.sourceWarehouseId).toBe('wh-2'); // Lviv is closest to Lviv
  });

  it('prevents over-allocation', () => {
    const bigRequests: DeliveryRequest[] = [
      {
        id: 'DR-A', productNumber: 'P001', quantity: 90,
        address: 'Lviv', latitude: 49.84, longitude: 24.03,
        priority: 'urgent', status: 'pending', createdAt: '2026-04-01T00:00:00Z',
      },
      {
        id: 'DR-B', productNumber: 'P001', quantity: 50,
        address: 'Lviv', latitude: 49.84, longitude: 24.03,
        priority: 'critical', status: 'pending', createdAt: '2026-04-01T01:00:00Z',
      },
    ];
    const plans = calculateDistributionPlan(bigRequests, testWarehouses);
    // DR-A takes 90 from Lviv (has 100), DR-B can't take 50 from Lviv (only 10 left)
    const planA = plans.find((p) => p.requestId === 'DR-A');
    const planB = plans.find((p) => p.requestId === 'DR-B');
    expect(planA?.sourceWarehouseId).toBe('wh-2');
    if (planB) {
      expect(planB.sourceWarehouseId).not.toBe('wh-2');
    }
  });
});

// --- calculateDemandForecast ---
describe('calculateDemandForecast', () => {
  const requests: DeliveryRequest[] = [
    {
      id: 'DR-1', productNumber: 'P001', quantity: 400,
      address: '', latitude: 0, longitude: 0,
      priority: 'urgent', status: 'pending', createdAt: '2026-04-01T00:00:00Z',
    },
    {
      id: 'DR-2', productNumber: 'P002', quantity: 10,
      address: '', latitude: 0, longitude: 0,
      priority: 'normal', status: 'pending', createdAt: '2026-04-01T00:00:00Z',
    },
  ];

  it('identifies products with deficit', () => {
    const forecast = calculateDemandForecast(requests, testWarehouses);
    const p001 = forecast.find((f) => f.productNumber === 'P001');
    // Total P001 stock = 500 + 100 + 10 = 610, demand = 400, no deficit
    expect(p001?.deficit).toBe(0);
  });

  it('escalates priority for urgent products', () => {
    const forecast = calculateDemandForecast(requests, testWarehouses);
    const p001 = forecast.find((f) => f.productNumber === 'P001');
    expect(p001?.demandLevel).toBe('urgent');
  });

  it('correctly sums demand from pending and approved requests', () => {
    const forecast = calculateDemandForecast(requests, testWarehouses);
    const p001 = forecast.find((f) => f.productNumber === 'P001');
    expect(p001?.currentDemand).toBe(400);
    expect(p001?.pendingRequests).toBe(1);
  });
});

// --- calculateRebalancingPlan ---
describe('calculateRebalancingPlan', () => {
  it('identifies warehouses below threshold', () => {
    // wh-3 (Odesa) has P001 qty=10, threshold=20 => below
    // wh-1 (Kyiv) has P001 qty=500, threshold=100 => surplus (>2x)
    const transfers = calculateRebalancingPlan(testWarehouses);
    const p001Transfer = transfers.find((t) => t.productNumber === 'P001' && t.to === 'wh-3');
    expect(p001Transfer).toBeDefined();
    expect(p001Transfer?.from).toBe('wh-1');
  });

  it('also identifies wh-2 P002 surplus => wh-1 P002 deficit', () => {
    // wh-1 has P002 qty=50, threshold=80 => below threshold
    // wh-2 has P002 qty=200, threshold=50 => surplus (>2x)
    const transfers = calculateRebalancingPlan(testWarehouses);
    const p002Transfer = transfers.find((t) => t.productNumber === 'P002' && t.to === 'wh-1');
    expect(p002Transfer).toBeDefined();
  });

  it('returns empty if all warehouses balanced', () => {
    const balanced: Warehouse[] = [{
      id: 'wh-a', name: 'A', type: 'main', latitude: 0, longitude: 0, address: '', description: '',
      products: [{ productNumber: 'P001', name: 'A', quantity: 100, minThreshold: 50 }],
    }];
    const transfers = calculateRebalancingPlan(balanced);
    expect(transfers).toHaveLength(0);
  });
});
