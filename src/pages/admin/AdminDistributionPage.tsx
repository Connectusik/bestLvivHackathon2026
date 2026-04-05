import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { calculateDemandForecast, calculateRebalancingPlan, calculateSmartSupplyDistribution } from '../../utils/distribution';
import { forecastDemand } from '../../utils/forecasting';
import { optimizeAllRoutes } from '../../utils/routeOptimizer';
import PriorityBadge from '../../components/shared/PriorityBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, Line, Area, AreaChart } from 'recharts';
import { productCatalog } from '../../data/mockData';

function TrendArrow({ factor }: { factor: number }) {
  if (factor > 1.2) return <span className="text-red-500" title={`Тренд: x${factor}`}>↑↑</span>;
  if (factor > 1.0) return <span className="text-orange-500" title={`Тренд: x${factor}`}>↑</span>;
  if (factor < 0.8) return <span className="text-green-500" title={`Тренд: x${factor}`}>↓↓</span>;
  if (factor < 1.0) return <span className="text-blue-500" title={`Тренд: x${factor}`}>↓</span>;
  return <span className="text-gray-400" title="Тренд: стабільний">→</span>;
}

export default function AdminDistributionPage() {
  const { requests, warehouses } = useApp();
  const [selectedForecastProduct, setSelectedForecastProduct] = useState<string>('P001');

  const forecast = calculateDemandForecast(requests, warehouses);
  const rebalancing = calculateRebalancingPlan(warehouses);
  const smartAnalysis = calculateSmartSupplyDistribution(requests, warehouses);
  const demandForecast = forecastDemand(requests, warehouses, 7);
  const optimizedRoutes = optimizeAllRoutes(requests, warehouses);

  const chartData = smartAnalysis.map((a) => ({
    name: productCatalog[a.productNumber] ?? a.productNumber,
    weeklyDemand: a.weeklyDemand,
    stock: a.totalStock,
    recommended: a.recommendedSupply,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Розподіл ресурсів</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Інтелектуальний аналіз попиту за останній тиждень та рекомендації з постачання</p>
      </div>

      {/* Smart Analysis Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {smartAnalysis.map((a) => (
          <div key={a.productNumber} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{a.productNumber}</span>
              <PriorityBadge priority={a.demandLevel} />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">{a.productName}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Попит за тиждень</span>
                <span className="font-medium">{a.weeklyDemand} од. ({a.weeklyOrderCount} зам.)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Середня/день</span>
                <span className="font-medium">{a.dailyRate} од.</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-500 dark:text-gray-400">Тренд попиту</span>
                <span className="font-medium flex items-center gap-1">
                  <TrendArrow factor={a.trendFactor} />
                  x{a.trendFactor}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Вага пріоритету</span>
                <span className="font-medium">x{a.priorityMultiplier}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Запас на складах</span>
                <span className="font-medium text-green-600">{a.totalStock} од.</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Покриття запасом</span>
                <span className={`font-medium ${a.stockCoverageDays < 7 ? 'text-red-600' : a.stockCoverageDays < 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {a.stockCoverageDays >= 999 ? '∞' : `${a.stockCoverageDays} днів`}
                </span>
              </div>
              {a.recommendedSupply > 0 && (
                <div className="flex justify-between text-xs pt-1 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Рекомендовано замовити</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">+{a.recommendedSupply} од.</span>
                </div>
              )}
              <div className="mt-2">
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      a.stockCoverageDays < 7 ? 'bg-red-500' : a.stockCoverageDays < 14 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((a.stockCoverageDays / 30) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart: Weekly Demand vs Stock vs Recommended */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Тижневий попит vs Запас vs Рекомендація</h2>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="stock" name="Поточний запас" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="weeklyDemand" name="Попит за тиждень" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.weeklyDemand > entry.stock ? '#ef4444' : entry.weeklyDemand / entry.stock > 0.3 ? '#eab308' : '#22c55e'}
                  />
                ))}
              </Bar>
              <Bar dataKey="recommended" name="Рекомендовано замовити" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Smart per-warehouse recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Розумний розподіл постачання по складах</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Формула: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Рекомендація = (денний_попит × 7 × тренд × пріоритет) + страховий_запас − поточний_запас</code>
        </p>
        <div className="space-y-4">
          {smartAnalysis
            .filter((a) => a.recommendedSupply > 0)
            .map((a) => (
              <div key={a.productNumber} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{a.productName}</span>
                    <PriorityBadge priority={a.demandLevel} />
                    <TrendArrow factor={a.trendFactor} />
                  </div>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    Загалом: +{a.recommendedSupply} од.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {a.warehouseBreakdown
                    .filter((wb) => wb.recommendedQuantity > 0 || wb.regionalDemand > 0)
                    .map((wb) => (
                      <div
                        key={wb.warehouseId}
                        className={`p-3 rounded-lg border text-xs ${
                          wb.urgencyScore >= 70
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : wb.urgencyScore >= 40
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-1.5">{wb.warehouseName}</div>
                        <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Регіональний попит:</span>
                            <span className="font-medium">{wb.regionalDemand} од.</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Поточний запас:</span>
                            <span className="font-medium">{wb.currentStock} од.</span>
                          </div>
                          {wb.recommendedQuantity > 0 && (
                            <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Поставити:</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">+{wb.recommendedQuantity}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">Терміновість:</span>
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  wb.urgencyScore >= 70 ? 'bg-red-500' : wb.urgencyScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${wb.urgencyScore}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-gray-400">{wb.urgencyScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Попит/день: {a.dailyRate} · Тренд: x{a.trendFactor} · Пріоритет: x{a.priorityMultiplier} · Покриття: {a.stockCoverageDays >= 999 ? '∞' : `${a.stockCoverageDays}д`}
                </div>
              </div>
            ))}
          {smartAnalysis.filter((a) => a.recommendedSupply > 0).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Всі товари мають достатній запас на основі аналізу тижневого попиту.</p>
          )}
        </div>
      </div>

      {/* ML Forecast */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Прогноз попиту (ML-lite)</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">EMA згладжування + сезонність по дням тижня + пріоритетний буст</p>
          </div>
          <select
            value={selectedForecastProduct}
            onChange={(e) => setSelectedForecastProduct(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(productCatalog).map(([code, name]) => (
              <option key={code} value={code}>{code} — {name}</option>
            ))}
          </select>
        </div>

        {(() => {
          const fc = demandForecast.find((f) => f.productNumber === selectedForecastProduct);
          if (!fc) return <p className="text-sm text-gray-500">Немає даних</p>;

          const trendIcon = fc.trend === 'rising' ? '↑' : fc.trend === 'falling' ? '↓' : '→';
          const trendColor = fc.trend === 'rising' ? 'text-red-500' : fc.trend === 'falling' ? 'text-green-500' : 'text-gray-400';

          // Build chart data: history (14 days) + forecast (7 days)
          const chartData = [];
          const now = new Date();
          for (let i = 0; i < fc.historicalDaily.length; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - (fc.historicalDaily.length - 1 - i));
            chartData.push({
              day: `${d.getDate()}.${d.getMonth() + 1}`,
              actual: fc.historicalDaily[i],
              forecast: null as number | null,
              low: null as number | null,
              high: null as number | null,
            });
          }
          for (let i = 0; i < fc.forecastDaily.length; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() + i + 1);
            chartData.push({
              day: `${d.getDate()}.${d.getMonth() + 1}`,
              actual: null as number | null,
              forecast: fc.forecastDaily[i],
              low: fc.confidenceLow[i],
              high: fc.confidenceHigh[i],
            });
          }

          return (
            <div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
                  <p className="text-lg font-bold text-indigo-600">{Math.round(fc.totalForecast)}</p>
                  <p className="text-[10px] text-gray-500">Прогноз 7д</p>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-600">{fc.avgDaily}</p>
                  <p className="text-[10px] text-gray-500">Сер./день</p>
                </div>
                <div className={`p-2.5 rounded-lg text-center ${fc.trend === 'rising' ? 'bg-red-50 dark:bg-red-900/20' : fc.trend === 'falling' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-900'}`}>
                  <p className={`text-lg font-bold ${trendColor}`}>{trendIcon}</p>
                  <p className="text-[10px] text-gray-500">Тренд</p>
                </div>
                <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                  <p className="text-lg font-bold text-yellow-600">{fc.seasonalPeak.slice(0, 3)}</p>
                  <p className="text-[10px] text-gray-500">Пік тижня</p>
                </div>
              </div>

              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="high" stackId="confidence" stroke="none" fill="#c7d2fe" name="Верхня межа" />
                    <Area type="monotone" dataKey="low" stackId="confidence2" stroke="none" fill="transparent" name="Нижня межа" />
                    <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} name="Факт" dot={{ r: 3 }} connectNulls={false} />
                    <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" name="Прогноз" dot={{ r: 3 }} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}
      </div>

      {/* TSP Route Optimization */}
      {optimizedRoutes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Оптимізація маршрутів (TSP)</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Nearest-neighbor + 2-opt локальний пошук для мінімізації відстані</p>
          <div className="space-y-3">
            {optimizedRoutes.map((route) => (
              <div key={route.warehouseId} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{route.warehouseName}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">{route.stopCount} зупинок</span>
                    <span className="font-medium text-indigo-600">{Math.round(route.totalDistance)} км</span>
                    <span className="text-gray-500">~{route.estimatedDuration >= 60 ? `${Math.floor(route.estimatedDuration / 60)} год ${route.estimatedDuration % 60} хв` : `${route.estimatedDuration} хв`}</span>
                    {route.improvement > 0 && (
                      <span className="text-green-600 font-medium">-{route.improvement}%</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded font-medium">Склад</span>
                  {route.stops.map((stop, i) => (
                    <span key={stop.requestId} className="flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className={`px-2 py-0.5 rounded ${stop.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : stop.priority === 'critical' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                        {i + 1}. {stop.address.split(',')[0]} <span className="text-gray-400 font-normal">({Math.round(stop.distanceFromPrev)} км)</span>
                      </span>
                    </span>
                  ))}
                  <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded font-medium">Склад</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Original demand cards */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Поточний попит (заявки в обробці)</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Аналіз лише активних заявок зі статусом pending/approved</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {forecast.map((f) => (
            <div key={f.productNumber} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{f.productNumber}</span>
                <PriorityBadge priority={f.demandLevel} />
              </div>
              <p className="text-xs font-medium text-gray-900 dark:text-white mb-2">{f.productName}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Попит</span>
                  <span>{f.currentDemand} од.</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Запас</span>
                  <span className="text-green-600">{f.availableStock} од.</span>
                </div>
                {f.deficit > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Дефіцит</span>
                    <span className="font-bold text-red-600">-{f.deficit}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rebalancing */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Балансування складів</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Рекомендовані міжскладські переміщення для вирівнювання запасів</p>
        {rebalancing.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Всі склади мають достатній запас. Переміщення не потрібні.</p>
        ) : (
          <div className="space-y-3">
            {rebalancing.map((t, i) => (
              <div key={i} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t.fromName}</span>
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{t.toName}</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{t.productName} x {t.quantity}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
