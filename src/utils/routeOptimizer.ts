import type { DeliveryRequest, Warehouse, Priority } from '../types';
import { haversineDistance } from './distribution';

export interface RouteStop {
  requestId: string;
  address: string;
  latitude: number;
  longitude: number;
  quantity: number;
  productNumber: string;
  priority: Priority;
  stopNumber: number;
  distanceFromPrev: number;
  cumulativeDistance: number;
}

export interface OptimizedRoute {
  warehouseId: string;
  warehouseName: string;
  warehouseLat: number;
  warehouseLon: number;
  stops: RouteStop[];
  totalDistance: number;
  totalDistanceOneWay: number;
  estimatedDuration: number;
  improvement: number;
  stopCount: number;
}

interface Point {
  lat: number;
  lon: number;
}

function dist(a: Point, b: Point): number {
  return haversineDistance(a.lat, a.lon, b.lat, b.lon);
}

/**
 * Compute total route distance for a given order of indices.
 * Route: warehouse -> stops[order[0]] -> ... -> stops[order[n-1]] -> warehouse
 */
function totalRouteDistance(
  warehouse: Point,
  points: Point[],
  order: number[]
): number {
  if (order.length === 0) return 0;

  let total = dist(warehouse, points[order[0]]);
  for (let i = 1; i < order.length; i++) {
    total += dist(points[order[i - 1]], points[order[i]]);
  }
  total += dist(points[order[order.length - 1]], warehouse);
  return total;
}

/**
 * Nearest-neighbor heuristic: greedily pick the closest unvisited stop.
 */
function nearestNeighborOrder(warehouse: Point, points: Point[]): number[] {
  const n = points.length;
  if (n === 0) return [];

  const visited = new Set<number>();
  const order: number[] = [];
  let current = warehouse;

  for (let step = 0; step < n; step++) {
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      const d = dist(current, points[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    order.push(bestIdx);
    visited.add(bestIdx);
    current = points[bestIdx];
  }

  return order;
}

/**
 * 2-opt local search: repeatedly reverse segments to reduce total distance.
 * Stops after no improvement is found or after maxIterations.
 */
function twoOptImprove(
  warehouse: Point,
  points: Point[],
  order: number[],
  maxIterations: number = 100
): number[] {
  const route = [...order];
  const n = route.length;
  if (n < 3) return route;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let improved = false;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const prevI = i === 0 ? warehouse : points[route[i - 1]];
        const stopI = points[route[i]];
        const stopJ = points[route[j]];
        const nextJ = j === n - 1 ? warehouse : points[route[j + 1]];

        const currentCost = dist(prevI, stopI) + dist(stopJ, nextJ);
        const newCost = dist(prevI, stopJ) + dist(stopI, nextJ);

        if (newCost < currentCost - 1e-10) {
          // Reverse the segment between i and j
          let left = i;
          let right = j;
          while (left < right) {
            const tmp = route[left];
            route[left] = route[right];
            route[right] = tmp;
            left++;
            right--;
          }
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return route;
}

/**
 * Build RouteStop array from an ordered list of indices.
 */
function buildStops(
  warehouse: Point,
  requests: DeliveryRequest[],
  order: number[]
): RouteStop[] {
  const stops: RouteStop[] = [];
  let prev = warehouse;
  let cumulative = 0;

  for (let i = 0; i < order.length; i++) {
    const req = requests[order[i]];
    const current: Point = { lat: req.latitude, lon: req.longitude };
    const segmentDist = dist(prev, current);
    cumulative += segmentDist;

    stops.push({
      requestId: req.id,
      address: req.address,
      latitude: req.latitude,
      longitude: req.longitude,
      quantity: req.quantity,
      productNumber: req.productNumber,
      priority: req.priority,
      stopNumber: i + 1,
      distanceFromPrev: Math.round(segmentDist * 100) / 100,
      cumulativeDistance: Math.round(cumulative * 100) / 100,
    });

    prev = current;
  }

  return stops;
}

/**
 * Optimize the delivery route for a single warehouse using nearest-neighbor + 2-opt.
 */
export function optimizeRoute(
  warehouseId: string,
  requests: DeliveryRequest[],
  warehouses: Warehouse[]
): OptimizedRoute {
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  if (!warehouse) {
    return {
      warehouseId,
      warehouseName: 'Unknown',
      warehouseLat: 0,
      warehouseLon: 0,
      stops: [],
      totalDistance: 0,
      totalDistanceOneWay: 0,
      estimatedDuration: 0,
      improvement: 0,
      stopCount: 0,
    };
  }

  const origin: Point = { lat: warehouse.latitude, lon: warehouse.longitude };

  if (requests.length === 0) {
    return {
      warehouseId,
      warehouseName: warehouse.name,
      warehouseLat: warehouse.latitude,
      warehouseLon: warehouse.longitude,
      stops: [],
      totalDistance: 0,
      totalDistanceOneWay: 0,
      estimatedDuration: 0,
      improvement: 0,
      stopCount: 0,
    };
  }

  const points: Point[] = requests.map((r) => ({
    lat: r.latitude,
    lon: r.longitude,
  }));

  // Naive order: requests as-is (indices 0..n-1)
  const naiveOrder = requests.map((_, i) => i);
  const naiveDistance = totalRouteDistance(origin, points, naiveOrder);

  // Nearest-neighbor heuristic
  const nnOrder = nearestNeighborOrder(origin, points);

  // 2-opt improvement
  const optimizedOrder = twoOptImprove(origin, points, nnOrder);
  const optimizedDistance = totalRouteDistance(origin, points, optimizedOrder);

  const stops = buildStops(origin, requests, optimizedOrder);

  const totalDistanceOneWay =
    stops.length > 0 ? stops[stops.length - 1].cumulativeDistance : 0;

  const returnLeg =
    stops.length > 0
      ? dist(
          { lat: stops[stops.length - 1].latitude, lon: stops[stops.length - 1].longitude },
          origin
        )
      : 0;

  const totalDistance =
    Math.round((totalDistanceOneWay + returnLeg) * 100) / 100;

  // Average speed 60 km/h + 15 min per stop
  const drivingMinutes = (totalDistance / 60) * 60;
  const stopMinutes = stops.length * 15;
  const estimatedDuration = Math.round(drivingMinutes + stopMinutes);

  const improvement =
    naiveDistance > 0
      ? Math.round(((naiveDistance - optimizedDistance) / naiveDistance) * 10000) / 100
      : 0;

  return {
    warehouseId,
    warehouseName: warehouse.name,
    warehouseLat: warehouse.latitude,
    warehouseLon: warehouse.longitude,
    stops,
    totalDistance,
    totalDistanceOneWay,
    estimatedDuration,
    improvement,
    stopCount: stops.length,
  };
}

/**
 * Optimize routes for all warehouses that have assigned delivery requests.
 * Only considers requests with status 'approved' or 'in_transit'.
 */
export function optimizeAllRoutes(
  requests: DeliveryRequest[],
  warehouses: Warehouse[]
): OptimizedRoute[] {
  const eligible = requests.filter(
    (r) =>
      (r.status === 'approved' || r.status === 'in_transit') &&
      r.assignedWarehouseId
  );

  const grouped = new Map<string, DeliveryRequest[]>();
  for (const req of eligible) {
    const wId = req.assignedWarehouseId!;
    const group = grouped.get(wId);
    if (group) {
      group.push(req);
    } else {
      grouped.set(wId, [req]);
    }
  }

  const routes: OptimizedRoute[] = [];
  for (const [warehouseId, group] of grouped) {
    routes.push(optimizeRoute(warehouseId, group, warehouses));
  }

  // Sort by total distance descending
  routes.sort((a, b) => b.totalDistance - a.totalDistance);

  return routes;
}
