import type { Warehouse, DeliveryRequest, DistributionPlan, Priority, DemandForecast, WeeklyDemandAnalysis, WarehouseSupplyRecommendation, DeliveryZone, DeliverySource, AdvancedDistributionPlan } from '../types';
import { productCatalog } from '../data/mockData';

const PRIORITY_WEIGHTS: Record<Priority, number> = {
  urgent: 100,
  critical: 75,
  elevated: 50,
  normal: 25,
};

// Haversine — відстань між двома точками (км)
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Найближчі склади з потрібним товаром
export function findNearestStock(
  lat: number,
  lon: number,
  productNumber: string,
  warehouses: Warehouse[],
  minQuantity = 1
): Array<{ warehouse: Warehouse; distance: number; available: number }> {
  return warehouses
    .map((wh) => {
      const product = wh.products.find((p) => p.productNumber === productNumber);
      const available = product?.quantity ?? 0;
      const distance = haversineDistance(lat, lon, wh.latitude, wh.longitude);
      return { warehouse: wh, distance, available };
    })
    .filter((entry) => entry.available >= minQuantity)
    .sort((a, b) => a.distance - b.distance);
}

// Розподіл заявок по складах: пріоритет × відстань × наявність
export function calculateDistributionPlan(
  requests: DeliveryRequest[],
  warehouses: Warehouse[]
): DistributionPlan[] {
  const pendingRequests = requests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]);

  const plans: DistributionPlan[] = [];
  const allocated = new Map<string, number>();

  for (const request of pendingRequests) {
    let bestPlan: DistributionPlan | null = null;
    let bestScore = -1;

    for (const wh of warehouses) {
      const product = wh.products.find((p) => p.productNumber === request.productNumber);
      if (!product) continue;

      const allocKey = `${wh.id}-${request.productNumber}`;
      const alreadyAllocated = allocated.get(allocKey) ?? 0;
      const availableStock = product.quantity - alreadyAllocated;

      if (availableStock < request.quantity) continue;

      const distance = haversineDistance(
        request.latitude, request.longitude,
        wh.latitude, wh.longitude
      );

      const priorityWeight = PRIORITY_WEIGHTS[request.priority];
      const distanceFactor = 1 / (1 + distance / 100);
      const stockFactor = Math.min(availableStock / request.quantity, 2);
      const score = priorityWeight * distanceFactor * stockFactor;

      if (score > bestScore) {
        bestScore = score;
        bestPlan = {
          requestId: request.id,
          sourceWarehouseId: wh.id,
          sourceWarehouseName: wh.name,
          productNumber: request.productNumber,
          quantity: request.quantity,
          distance: Math.round(distance),
          priority: request.priority,
          score: Math.round(score * 100) / 100,
        };
      }
    }

    if (bestPlan) {
      const allocKey = `${bestPlan.sourceWarehouseId}-${bestPlan.productNumber}`;
      allocated.set(allocKey, (allocated.get(allocKey) ?? 0) + bestPlan.quantity);
      plans.push(bestPlan);
    }
  }

  return plans;
}

// Прогноз потреб: попит vs залишки
export function calculateDemandForecast(
  requests: DeliveryRequest[],
  warehouses: Warehouse[]
): DemandForecast[] {
  const productDemand = new Map<string, number>();
  const pendingByProduct = new Map<string, number>();

  for (const req of requests) {
    if (req.status === 'pending' || req.status === 'approved') {
      const current = productDemand.get(req.productNumber) ?? 0;
      productDemand.set(req.productNumber, current + req.quantity);
      pendingByProduct.set(req.productNumber, (pendingByProduct.get(req.productNumber) ?? 0) + 1);
    }
  }

  const totalStock = new Map<string, number>();
  for (const wh of warehouses) {
    for (const p of wh.products) {
      totalStock.set(p.productNumber, (totalStock.get(p.productNumber) ?? 0) + p.quantity);
    }
  }

  const forecasts: DemandForecast[] = [];
  const allProducts = new Set([...productDemand.keys(), ...totalStock.keys()]);

  for (const pn of allProducts) {
    const demand = productDemand.get(pn) ?? 0;
    const stock = totalStock.get(pn) ?? 0;
    const deficit = Math.max(0, demand - stock);
    const ratio = stock > 0 ? demand / stock : demand > 0 ? Infinity : 0;

    let demandLevel: Priority = 'normal';
    if (ratio > 0.8 || deficit > 0) demandLevel = 'critical';
    else if (ratio > 0.5) demandLevel = 'elevated';
    else if (ratio > 0.3) demandLevel = 'elevated';

    const hasUrgent = requests.some(
      (r) => r.productNumber === pn && r.priority === 'urgent' && r.status === 'pending'
    );
    if (hasUrgent) demandLevel = 'urgent';

    forecasts.push({
      productNumber: pn,
      productName: productCatalog[pn] ?? pn,
      currentDemand: demand,
      pendingRequests: pendingByProduct.get(pn) ?? 0,
      availableStock: stock,
      deficit,
      demandLevel,
    });
  }

  return forecasts.sort((a, b) => PRIORITY_WEIGHTS[b.demandLevel] - PRIORITY_WEIGHTS[a.demandLevel]);
}

// Ребалансування: трансфери між складами для вирівнювання запасів
export function calculateRebalancingPlan(
  warehouses: Warehouse[]
): Array<{
  from: string;
  fromName: string;
  to: string;
  toName: string;
  productNumber: string;
  productName: string;
  quantity: number;
  reason: string;
}> {
  const transfers: Array<{
    from: string;
    fromName: string;
    to: string;
    toName: string;
    productNumber: string;
    productName: string;
    quantity: number;
    reason: string;
  }> = [];

  const allProducts = new Set<string>();
  for (const wh of warehouses) {
    for (const p of wh.products) {
      allProducts.add(p.productNumber);
    }
  }

  for (const pn of allProducts) {
    const whStocks = warehouses.map((wh) => {
      const product = wh.products.find((p) => p.productNumber === pn);
      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        quantity: product?.quantity ?? 0,
        minThreshold: product?.minThreshold ?? 0,
      };
    });

    const deficitWarehouses = whStocks.filter(
      (ws) => ws.minThreshold > 0 && ws.quantity < ws.minThreshold
    );

    const surplusWarehouses = whStocks.filter(
      (ws) => ws.minThreshold > 0 && ws.quantity > ws.minThreshold * 2
    );

    for (const deficit of deficitWarehouses) {
      for (const surplus of surplusWarehouses) {
        const needed = deficit.minThreshold - deficit.quantity;
        const canShare = Math.floor((surplus.quantity - surplus.minThreshold * 1.5));
        if (canShare > 0 && needed > 0) {
          const transferQty = Math.min(needed, canShare);
          transfers.push({
            from: surplus.warehouseId,
            fromName: surplus.warehouseName,
            to: deficit.warehouseId,
            toName: deficit.warehouseName,
            productNumber: pn,
            productName: productCatalog[pn] ?? pn,
            quantity: transferQty,
            reason: `${deficit.warehouseName} is below minimum threshold (${deficit.quantity}/${deficit.minThreshold})`,
          });
        }
      }
    }
  }

  return transfers;
}

const PRIORITY_URGENCY: Record<Priority, number> = {
  urgent: 1.5,
  critical: 1.3,
  elevated: 1.15,
  normal: 1.0,
};

// Розумний розподіл постачання на основі аналізу замовлень за тиждень
export function calculateSmartSupplyDistribution(
  requests: DeliveryRequest[],
  warehouses: Warehouse[],
  referenceDate?: Date
): WeeklyDemandAnalysis[] {
  const now = referenceDate ?? new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const recentRequests = requests.filter((r) => {
    const created = new Date(r.createdAt);
    return created >= weekAgo && created <= now;
  });

  const warehouseRequests = new Map<string, Map<string, DeliveryRequest[]>>();
  for (const wh of warehouses) {
    warehouseRequests.set(wh.id, new Map());
  }

  for (const req of recentRequests) {
    let nearestWhId = warehouses[0]?.id ?? '';
    let minDist = Infinity;
    for (const wh of warehouses) {
      const d = haversineDistance(req.latitude, req.longitude, wh.latitude, wh.longitude);
      if (d < minDist) {
        minDist = d;
        nearestWhId = wh.id;
      }
    }
    const whMap = warehouseRequests.get(nearestWhId)!;
    const list = whMap.get(req.productNumber) ?? [];
    list.push(req);
    whMap.set(req.productNumber, list);
  }

  const allProducts = new Set<string>();
  for (const wh of warehouses) {
    for (const p of wh.products) allProducts.add(p.productNumber);
  }
  for (const req of recentRequests) allProducts.add(req.productNumber);

  const analyses: WeeklyDemandAnalysis[] = [];

  for (const pn of allProducts) {
    // Aggregate weekly stats for product
    const productRequests = recentRequests.filter((r) => r.productNumber === pn);
    const weeklyDemand = productRequests.reduce((sum, r) => sum + r.quantity, 0);
    const weeklyOrderCount = productRequests.length;
    const dailyRate = weeklyDemand / 7;

    // Trend: compare last 3 days vs previous 4 days
    const last3 = productRequests
      .filter((r) => new Date(r.createdAt) >= threeDaysAgo)
      .reduce((sum, r) => sum + r.quantity, 0);
    const prev4 = weeklyDemand - last3;

    const avgLast3 = last3 / 3;
    const avgPrev4 = prev4 / 4;
    const trendFactor = avgPrev4 > 0
      ? Math.min(Math.max(avgLast3 / avgPrev4, 0.5), 2.0)
      : avgLast3 > 0 ? 2.0 : 1.0;

    // Priority multiplier: weighted average of recent order priorities
    let priorityMultiplier = 1.0;
    if (productRequests.length > 0) {
      const totalQty = productRequests.reduce((s, r) => s + r.quantity, 0);
      priorityMultiplier = productRequests.reduce(
        (s, r) => s + PRIORITY_URGENCY[r.priority] * (r.quantity / totalQty),
        0
      );
    }

    const totalStock = warehouses.reduce((sum, wh) => {
      const p = wh.products.find((pr) => pr.productNumber === pn);
      return sum + (p?.quantity ?? 0);
    }, 0);

    const stockCoverageDays = dailyRate > 0 ? totalStock / dailyRate : Infinity;

    const warehouseBreakdown: WarehouseSupplyRecommendation[] = [];
    let totalRecommended = 0;

    for (const wh of warehouses) {
      const whProductReqs = warehouseRequests.get(wh.id)?.get(pn) ?? [];
      const regionalDemand = whProductReqs.reduce((s, r) => s + r.quantity, 0);
      const product = wh.products.find((p) => p.productNumber === pn);
      const currentStock = product?.quantity ?? 0;
      const minThreshold = product?.minThreshold ?? 0;

      const regionalDailyRate = regionalDemand / 7;

      const regLast3 = whProductReqs
        .filter((r) => new Date(r.createdAt) >= threeDaysAgo)
        .reduce((s, r) => s + r.quantity, 0);
      const regPrev4 = regionalDemand - regLast3;
      const regTrend = (regPrev4 / 4) > 0
        ? Math.min(Math.max((regLast3 / 3) / (regPrev4 / 4), 0.5), 2.0)
        : (regLast3 > 0 ? 2.0 : 1.0);

      let regPM = 1.0;
      if (whProductReqs.length > 0) {
        const regTotalQty = whProductReqs.reduce((s, r) => s + r.quantity, 0);
        regPM = whProductReqs.reduce(
          (s, r) => s + PRIORITY_URGENCY[r.priority] * (r.quantity / regTotalQty),
          0
        );
      }

      const safetyStock = Math.max(minThreshold, Math.ceil(regionalDailyRate * 3));

      const projectedNeed = Math.ceil(regionalDailyRate * 7 * regTrend * regPM);

      const recommended = Math.max(0, projectedNeed + safetyStock - currentStock);

      const coverageDays = regionalDailyRate > 0 ? currentStock / regionalDailyRate : 999;
      const urgencyScore = Math.min(100, Math.round(
        (coverageDays < 3 ? 80 : coverageDays < 7 ? 50 : 20) *
        regTrend * regPM
      ));

      totalRecommended += recommended;

      warehouseBreakdown.push({
        warehouseId: wh.id,
        warehouseName: wh.name,
        currentStock,
        regionalDemand,
        recommendedQuantity: recommended,
        urgencyScore,
      });
    }

    let demandLevel: Priority = 'normal';
    if (stockCoverageDays < 3 || trendFactor > 1.5) demandLevel = 'urgent';
    else if (stockCoverageDays < 7 || trendFactor > 1.2) demandLevel = 'critical';
    else if (stockCoverageDays < 14 || trendFactor > 1.0) demandLevel = 'elevated';

    if (productRequests.some((r) => r.priority === 'urgent')) {
      if (demandLevel === 'normal') demandLevel = 'elevated';
      if (demandLevel === 'elevated' && trendFactor > 1.0) demandLevel = 'critical';
    }

    analyses.push({
      productNumber: pn,
      productName: productCatalog[pn] ?? pn,
      weeklyDemand,
      weeklyOrderCount,
      dailyRate: Math.round(dailyRate * 10) / 10,
      trendFactor: Math.round(trendFactor * 100) / 100,
      priorityMultiplier: Math.round(priorityMultiplier * 100) / 100,
      totalStock,
      stockCoverageDays: stockCoverageDays === Infinity ? 999 : Math.round(stockCoverageDays),
      recommendedSupply: totalRecommended,
      warehouseBreakdown: warehouseBreakdown.sort((a, b) => b.urgencyScore - a.urgencyScore),
      demandLevel,
    });
  }

  return analyses.sort((a, b) => PRIORITY_WEIGHTS[b.demandLevel] - PRIORITY_WEIGHTS[a.demandLevel]);
}

const GREEN_ZONE_RADIUS = 150;
const YELLOW_ZONE_RADIUS = 350;

const ZONE_COST_MULTIPLIER: Record<DeliveryZone, number> = {
  green: 1.0,
  yellow: 1.8,
  red: 3.0,
};

const ZONE_SCORE_BONUS: Record<DeliveryZone, number> = {
  green: 1.5,
  yellow: 1.0,
  red: 0.5,
};

// Cost per km per unit (abstract cost units)
const BASE_COST_PER_KM = 0.05;
// Fixed cost for each additional warehouse in a split delivery
const SPLIT_FIXED_COST = 15;

export function getDeliveryZone(distance: number): DeliveryZone {
  if (distance <= GREEN_ZONE_RADIUS) return 'green';
  if (distance <= YELLOW_ZONE_RADIUS) return 'yellow';
  return 'red';
}

export function getZoneColor(zone: DeliveryZone): string {
  switch (zone) {
    case 'green': return '#22c55e';
    case 'yellow': return '#eab308';
    case 'red': return '#ef4444';
  }
}

export function getZoneLabel(zone: DeliveryZone): string {
  switch (zone) {
    case 'green': return 'Зелена зона';
    case 'yellow': return 'Жовта зона';
    case 'red': return 'Червона зона';
  }
}

export { GREEN_ZONE_RADIUS, YELLOW_ZONE_RADIUS };

interface WarehouseCandidate {
  warehouse: Warehouse;
  distance: number;
  zone: DeliveryZone;
  available: number;
  score: number;
  costPerUnit: number;
}

function estimateDeliveryCost(distance: number, quantity: number, zone: DeliveryZone): number {
  return distance * quantity * BASE_COST_PER_KM * ZONE_COST_MULTIPLIER[zone];
}

// Розподіл з урахуванням зон доставки та можливості split-доставки
export function calculateAdvancedDistributionPlan(
  requests: DeliveryRequest[],
  warehouses: Warehouse[]
): AdvancedDistributionPlan[] {
  const pendingRequests = requests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]);

  const plans: AdvancedDistributionPlan[] = [];
  const allocated = new Map<string, number>();

  const getAvailable = (whId: string, pn: string, wh: Warehouse): number => {
    const product = wh.products.find((p) => p.productNumber === pn);
    if (!product) return 0;
    const allocKey = `${whId}-${pn}`;
    return product.quantity - (allocated.get(allocKey) ?? 0);
  };

  const commitAllocation = (whId: string, pn: string, qty: number) => {
    const key = `${whId}-${pn}`;
    allocated.set(key, (allocated.get(key) ?? 0) + qty);
  };

  for (const request of pendingRequests) {
    // Evaluate all warehouses for this request
    const candidates: WarehouseCandidate[] = warehouses
      .map((wh) => {
        const distance = haversineDistance(request.latitude, request.longitude, wh.latitude, wh.longitude);
        const zone = getDeliveryZone(distance);
        const available = getAvailable(wh.id, request.productNumber, wh);
        const distanceFactor = 1 / (1 + distance / 200);
        const stockFactor = available > 0 ? Math.min(available / request.quantity, 2) : 0;
        const score = PRIORITY_WEIGHTS[request.priority] * ZONE_SCORE_BONUS[zone] * distanceFactor * stockFactor;
        const costPerUnit = distance * BASE_COST_PER_KM * ZONE_COST_MULTIPLIER[zone];
        return { warehouse: wh, distance, zone, available, score, costPerUnit };
      })
      .filter((c) => c.available > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      plans.push({
        requestId: request.id,
        requestAddress: request.address,
        productNumber: request.productNumber,
        totalQuantity: request.quantity,
        priority: request.priority,
        isSplit: false,
        sources: [],
        totalScore: 0,
        savings: 0,
        reason: 'Немає складів з достатнім запасом товару',
      });
      continue;
    }

    // === Option A: Best single warehouse that can fulfill entirely ===
    const singleCandidates = candidates.filter((c) => c.available >= request.quantity);
    const bestSingle = singleCandidates.length > 0 ? singleCandidates[0] : null;

    const singleCost = bestSingle
      ? estimateDeliveryCost(bestSingle.distance, request.quantity, bestSingle.zone)
      : Infinity;

    // === Option B: Split delivery — greedy fill from cheapest sources ===
    let splitSources: DeliverySource[] = [];
    let splitCost = 0;
    let splitScore = 0;
    let remaining = request.quantity;

    // Sort by cost per unit for split (prefer cheap + close)
    const sortedByCost = [...candidates].sort((a, b) => a.costPerUnit - b.costPerUnit);

    for (const c of sortedByCost) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, c.available);
      splitSources.push({
        warehouseId: c.warehouse.id,
        warehouseName: c.warehouse.name,
        quantity: take,
        distance: Math.round(c.distance),
        zone: c.zone,
        score: Math.round(c.score * 100) / 100,
      });
      splitCost += estimateDeliveryCost(c.distance, take, c.zone);
      splitScore += c.score * (take / request.quantity);
      remaining -= take;
    }

    // Add fixed cost penalty per additional warehouse
    if (splitSources.length > 1) {
      splitCost += SPLIT_FIXED_COST * (splitSources.length - 1);
    }

    const splitFulfilled = remaining <= 0;

    // === Decision: single vs split ===
    // Prefer split only if:
    // 1. Single can't fulfill at all, OR
    // 2. Split is cheaper AND fully fulfills AND single is in yellow/red zone
    const preferSplit = !bestSingle || (
      splitFulfilled &&
      splitSources.length > 1 &&
      splitCost < singleCost * 0.85 &&
      bestSingle.zone !== 'green'
    );

    if (preferSplit && splitFulfilled && splitSources.length > 1) {
      // Commit split allocations
      for (const src of splitSources) {
        commitAllocation(src.warehouseId, request.productNumber, src.quantity);
      }
      const savings = bestSingle ? Math.round(singleCost - splitCost) : 0;
      plans.push({
        requestId: request.id,
        requestAddress: request.address,
        productNumber: request.productNumber,
        totalQuantity: request.quantity,
        priority: request.priority,
        isSplit: true,
        sources: splitSources,
        totalScore: Math.round(splitScore * 100) / 100,
        savings,
        reason: bestSingle
          ? `Комбінована доставка з ${splitSources.length} складів дешевша на ${savings} у.о. ніж з одного (${bestSingle.warehouse.name}, ${getZoneLabel(bestSingle.zone)})`
          : `Жоден склад не має ${request.quantity} од. — комбінована доставка з ${splitSources.length} складів`,
      });
    } else if (bestSingle) {
      // Single warehouse delivery
      commitAllocation(bestSingle.warehouse.id, request.productNumber, request.quantity);
      plans.push({
        requestId: request.id,
        requestAddress: request.address,
        productNumber: request.productNumber,
        totalQuantity: request.quantity,
        priority: request.priority,
        isSplit: false,
        sources: [{
          warehouseId: bestSingle.warehouse.id,
          warehouseName: bestSingle.warehouse.name,
          quantity: request.quantity,
          distance: Math.round(bestSingle.distance),
          zone: bestSingle.zone,
          score: Math.round(bestSingle.score * 100) / 100,
        }],
        totalScore: Math.round(bestSingle.score * 100) / 100,
        savings: 0,
        reason: `Доставка з ${bestSingle.warehouse.name} (${getZoneLabel(bestSingle.zone)}, ${Math.round(bestSingle.distance)} км)`,
      });
    } else if (splitFulfilled) {
      // Only split option works (single warehouse can't fulfill)
      for (const src of splitSources) {
        commitAllocation(src.warehouseId, request.productNumber, src.quantity);
      }
      plans.push({
        requestId: request.id,
        requestAddress: request.address,
        productNumber: request.productNumber,
        totalQuantity: request.quantity,
        priority: request.priority,
        isSplit: true,
        sources: splitSources,
        totalScore: Math.round(splitScore * 100) / 100,
        savings: 0,
        reason: `Жоден склад не має ${request.quantity} од. — комбінована доставка з ${splitSources.length} складів`,
      });
    } else {
      // Can't fulfill at all (not enough stock globally)
      const partialSources = splitSources.filter((s) => s.quantity > 0);
      const fulfilled = request.quantity - remaining;
      plans.push({
        requestId: request.id,
        requestAddress: request.address,
        productNumber: request.productNumber,
        totalQuantity: request.quantity,
        priority: request.priority,
        isSplit: partialSources.length > 1,
        sources: partialSources,
        totalScore: Math.round(splitScore * 100) / 100,
        savings: 0,
        reason: `Глобальний дефіцит: доступно лише ${fulfilled} з ${request.quantity} од.`,
      });
    }
  }

  return plans;
}

// Зони доставки всіх складів відносно точки
export function getWarehouseZones(
  lat: number,
  lon: number,
  warehouses: Warehouse[]
): Array<{ warehouse: Warehouse; distance: number; zone: DeliveryZone }> {
  return warehouses
    .map((wh) => {
      const distance = haversineDistance(lat, lon, wh.latitude, wh.longitude);
      return { warehouse: wh, distance, zone: getDeliveryZone(distance) };
    })
    .sort((a, b) => a.distance - b.distance);
}
