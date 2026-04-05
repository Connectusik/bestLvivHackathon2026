import type { DeliveryRequest, Warehouse } from '../types';
import { productCatalog } from '../data/mockData';

export interface DemandForecastResult {
  productNumber: string;
  productName: string;
  historicalDaily: number[];
  forecastDaily: number[];
  confidenceLow: number[];
  confidenceHigh: number[];
  totalForecast: number;
  avgDaily: number;
  trend: 'rising' | 'stable' | 'falling';
  seasonalPeak: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HISTORY_DAYS = 14;
const EMA_ALPHA = 0.3;
const PRIORITY_BOOST = 1.15;
const CONFIDENCE_LOW_FACTOR = 0.7;
const CONFIDENCE_HIGH_FACTOR = 1.4;

/**
 * Exponential Moving Average over a series of values.
 * Returns an array of the same length where each element is the EMA up to that point.
 */
export function calculateEMA(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];

  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
  }
  return ema;
}

/**
 * Compute day-of-week seasonality coefficients from historical requests.
 * Returns a record keyed by day number (0=Sunday ... 6=Saturday) with a
 * multiplier relative to the overall daily average.
 */
export function getDayOfWeekCoefficients(requests: DeliveryRequest[]): Record<number, number> {
  const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayOccurrences: Record<number, Set<string>> = {
    0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(),
    4: new Set(), 5: new Set(), 6: new Set(),
  };

  for (const req of requests) {
    const date = new Date(req.createdAt);
    const dow = date.getDay();
    dayCounts[dow] += req.quantity;
    dayOccurrences[dow].add(date.toISOString().slice(0, 10));
  }

  // Average quantity per occurrence-day for each day of week
  const dayAvg: Record<number, number> = {};
  for (let d = 0; d < 7; d++) {
    const occurrences = Math.max(dayOccurrences[d].size, 1);
    dayAvg[d] = dayCounts[d] / occurrences;
  }

  const overallAvg = Object.values(dayAvg).reduce((a, b) => a + b, 0) / 7;
  if (overallAvg === 0) {
    return { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
  }

  const coefficients: Record<number, number> = {};
  for (let d = 0; d < 7; d++) {
    coefficients[d] = dayAvg[d] / overallAvg;
  }
  return coefficients;
}

/**
 * Build a daily demand time series for a specific product over the last N days.
 */
function buildDailyTimeSeries(
  requests: DeliveryRequest[],
  productNumber: string,
  days: number,
  referenceDate: Date,
): number[] {
  const series: number[] = new Array(days).fill(0);

  for (const req of requests) {
    if (req.productNumber !== productNumber) continue;

    const reqDate = new Date(req.createdAt);
    const diffMs = referenceDate.getTime() - reqDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // diffDays === 0 means today, diffDays === 1 means yesterday, etc.
    if (diffDays >= 0 && diffDays < days) {
      // Index 0 = oldest day, index (days-1) = most recent day
      series[days - 1 - diffDays] += req.quantity;
    }
  }

  return series;
}

/**
 * Determine whether a product had urgent/critical orders in the last 3 days.
 */
function hasRecentHighPriority(
  requests: DeliveryRequest[],
  productNumber: string,
  referenceDate: Date,
): boolean {
  const threeDaysAgo = new Date(referenceDate);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  return requests.some(
    (req) =>
      req.productNumber === productNumber &&
      (req.priority === 'urgent' || req.priority === 'critical') &&
      new Date(req.createdAt) >= threeDaysAgo &&
      new Date(req.createdAt) <= referenceDate,
  );
}

/**
 * Compute the coefficient of variation (stddev / mean) for a series.
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Determine trend direction by comparing the EMA of the first half vs second half.
 */
function determineTrend(ema: number[]): 'rising' | 'stable' | 'falling' {
  if (ema.length < 4) return 'stable';
  const mid = Math.floor(ema.length / 2);
  const firstHalfAvg = ema.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondHalfAvg = ema.slice(mid).reduce((a, b) => a + b, 0) / (ema.length - mid);

  if (firstHalfAvg === 0 && secondHalfAvg === 0) return 'stable';
  if (firstHalfAvg === 0) return 'rising';

  const ratio = secondHalfAvg / firstHalfAvg;
  if (ratio > 1.15) return 'rising';
  if (ratio < 0.85) return 'falling';
  return 'stable';
}

/**
 * Main forecasting function.
 * Analyzes the last 14 days of orders, applies EMA smoothing and day-of-week
 * seasonality, then projects forward for the requested number of days.
 */
export function forecastDemand(
  requests: DeliveryRequest[],
  _warehouses: Warehouse[],
  forecastDays: number,
  referenceDate: Date = new Date(),
): DemandForecastResult[] {
  const productNumbers = Object.keys(productCatalog);
  const seasonCoeffs = getDayOfWeekCoefficients(requests);

  // Find the day of week with peak demand
  let peakDay = 0;
  let peakCoeff = 0;
  for (let d = 0; d < 7; d++) {
    if (seasonCoeffs[d] > peakCoeff) {
      peakCoeff = seasonCoeffs[d];
      peakDay = d;
    }
  }
  const seasonalPeakName = DAY_NAMES[peakDay];

  const results: DemandForecastResult[] = [];

  for (const productNumber of productNumbers) {
    const historicalDaily = buildDailyTimeSeries(requests, productNumber, HISTORY_DAYS, referenceDate);
    const ema = calculateEMA(historicalDaily, EMA_ALPHA);
    const emaTrend = ema.length > 0 ? ema[ema.length - 1] : 0;

    const priorityBoost = hasRecentHighPriority(requests, productNumber, referenceDate)
      ? PRIORITY_BOOST
      : 1.0;

    const cv = coefficientOfVariation(historicalDaily);
    // Widen confidence band for high-variance products
    const varianceMultiplier = 1 + cv * 0.3;
    const lowFactor = CONFIDENCE_LOW_FACTOR / varianceMultiplier;
    const highFactor = CONFIDENCE_HIGH_FACTOR * varianceMultiplier;

    const forecastDaily: number[] = [];
    const confidenceLow: number[] = [];
    const confidenceHigh: number[] = [];

    for (let i = 0; i < forecastDays; i++) {
      const futureDate = new Date(referenceDate);
      futureDate.setDate(futureDate.getDate() + i + 1);
      const dow = futureDate.getDay();

      const dayForecast = Math.max(0, emaTrend * seasonCoeffs[dow] * priorityBoost);
      const rounded = Math.round(dayForecast * 100) / 100;

      forecastDaily.push(rounded);
      confidenceLow.push(Math.round(rounded * lowFactor * 100) / 100);
      confidenceHigh.push(Math.round(rounded * highFactor * 100) / 100);
    }

    const totalForecast = forecastDaily.reduce((a, b) => a + b, 0);
    const avgDaily = forecastDays > 0 ? totalForecast / forecastDays : 0;

    results.push({
      productNumber,
      productName: productCatalog[productNumber] ?? productNumber,
      historicalDaily,
      forecastDaily,
      confidenceLow,
      confidenceHigh,
      totalForecast: Math.round(totalForecast * 100) / 100,
      avgDaily: Math.round(avgDaily * 100) / 100,
      trend: determineTrend(ema),
      seasonalPeak: seasonalPeakName,
    });
  }

  return results;
}
