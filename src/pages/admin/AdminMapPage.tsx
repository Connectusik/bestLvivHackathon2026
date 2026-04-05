import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '../../contexts/AppContext';
import MapPointDetails from '../../components/map/MapPointDetails';
import PriorityBadge from '../../components/shared/PriorityBadge';
import StatusBadge from '../../components/shared/StatusBadge';
import { useState, useEffect, useMemo } from 'react';
import { GREEN_ZONE_RADIUS, YELLOW_ZONE_RADIUS, getWarehouseZones, getZoneLabel, getZoneColor } from '../../utils/distribution';
import type { DeliveryRequest, DeliveryZone } from '../../types';
import { productCatalog } from '../../data/mockData';

const mainWarehouseIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const regularWarehouseIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const requestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const urgentRequestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const selectedRequestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface RouteData {
  id: string;
  coordinates: [number, number][];
  color: string;
  distance: number;
  duration: number;
}

const osrmRouteCache = new Map<string, { coordinates: [number, number][]; distance: number; duration: number }>();

function makeOSRMCacheKey(from: [number, number], to: [number, number]): string {
  return `${from[0]},${from[1]}->${to[0]},${to[1]}`;
}

async function fetchOSRMRoute(
  from: [number, number],
  to: [number, number],
): Promise<{ coordinates: [number, number][]; distance: number; duration: number } | null> {
  const cacheKey = makeOSRMCacheKey(from, to);
  const cached = osrmRouteCache.get(cacheKey);
  if (cached) return cached;

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) {
        continue;
      }
      if (!res.ok) return null;
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) return null;
      const route = data.routes[0];
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
      const result = {
        coordinates,
        distance: Math.round(route.distance / 1000),
        duration: Math.round(route.duration / 60),
      };
      osrmRouteCache.set(cacheKey, result);
      return result;
    } catch {
      if (attempt === maxRetries - 1) return null;
    }
  }
  return null;
}

async function fetchOSRMRoutesThrottled(
  pairs: { id: string; from: [number, number]; to: [number, number]; color: string }[],
): Promise<RouteData[]> {
  const results: RouteData[] = [];
  const failed: typeof pairs = [];

  // Process one at a time with delay to avoid rate limiting
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const route = await fetchOSRMRoute(pair.from, pair.to);
    if (route) {
      results.push({ id: pair.id, coordinates: route.coordinates, color: pair.color, distance: route.distance, duration: route.duration });
    } else {
      failed.push(pair);
    }
    if (i < pairs.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Retry failed routes after a longer pause
  if (failed.length > 0) {
    await new Promise((r) => setTimeout(r, 2000));
    for (let i = 0; i < failed.length; i++) {
      const pair = failed[i];
      const route = await fetchOSRMRoute(pair.from, pair.to);
      if (route) {
        results.push({ id: pair.id, coordinates: route.coordinates, color: pair.color, distance: route.distance, duration: route.duration });
      } else {
        // Final fallback: straight line
        results.push({ id: pair.id, coordinates: [pair.from, pair.to], color: pair.color, distance: 0, duration: 0 });
      }
      if (i < failed.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  return results;
}

function ZoneDot({ zone }: { zone: DeliveryZone }) {
  return <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: getZoneColor(zone) }} />;
}

export default function AdminMapPage() {
  const { requests, warehouses, approveRequest, trucks, updateRequest } = useApp();
  const [showWarehouses, setShowWarehouses] = useState(true);
  const [showRequests, setShowRequests] = useState(true);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [realRoutes, setRealRoutes] = useState<RouteData[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const activeRequests = requests.filter((r) => r.status !== 'delivered' && r.status !== 'rejected');
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const selectedRequest = selectedRequestId ? requests.find((r) => r.id === selectedRequestId) ?? null : null;

  // Zone analysis for selected request
  const selectedZones = useMemo(() => {
    if (!selectedRequest) return [];
    return getWarehouseZones(selectedRequest.latitude, selectedRequest.longitude, warehouses);
  }, [selectedRequest, warehouses]);

  const handleAssignWarehouse = (requestId: string, warehouseId: string) => {
    const availableTruck = trucks.find((t) => t.status === 'available' && t.warehouseId === warehouseId);
    approveRequest(requestId, warehouseId, availableTruck?.id);
    setSelectedRequestId(null);
  };

  const handleAssignWithoutApproval = (requestId: string, warehouseId: string) => {
    updateRequest(requestId, { assignedWarehouseId: warehouseId });
  };

  // Build route data
  const routePairs = activeRequests
    .filter((r) => r.assignedWarehouseId)
    .map((r) => {
      const wh = warehouses.find((w) => w.id === r.assignedWarehouseId);
      if (!wh) return null;
      const color = r.status === 'in_transit' ? '#3b82f6' : r.priority === 'urgent' ? '#ef4444' : '#6366f1';
      return { id: r.id, from: [wh.latitude, wh.longitude] as [number, number], to: [r.latitude, r.longitude] as [number, number], color };
    })
    .filter(Boolean) as { id: string; from: [number, number]; to: [number, number]; color: string }[];

  useEffect(() => {
    if (!showRoutes || routePairs.length === 0) {
      setRealRoutes([]);
      return;
    }
    let cancelled = false;
    setRoutesLoading(true);
    fetchOSRMRoutesThrottled(routePairs).then((routes) => {
      if (!cancelled) { setRealRoutes(routes); setRoutesLoading(false); }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRoutes, routePairs.map((p) => p.id).join(',')]);

  const routeInfoMap = new Map(realRoutes.map((r) => [r.id, r]));

  const getRequestIcon = (dr: DeliveryRequest) => {
    if (dr.id === selectedRequestId) return selectedRequestIcon;
    if (dr.priority === 'urgent' || dr.priority === 'critical') return urgentRequestIcon;
    return requestIcon;
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Логістична карта</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Огляд складів, заявок та інтерактивне призначення</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Головний склад</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Регіональний склад</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">Заявка</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Обрана заявка</span>
          </div>
          {showCoverage && (
            <>
              <div className="flex items-center gap-1.5">
                <ZoneDot zone="green" />
                <span className="text-gray-600 dark:text-gray-400">{GREEN_ZONE_RADIUS} км</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ZoneDot zone="yellow" />
                <span className="text-gray-600 dark:text-gray-400">{YELLOW_ZONE_RADIUS} км</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ZoneDot zone="red" />
                <span className="text-gray-600 dark:text-gray-400">350+ км</span>
              </div>
            </>
          )}
          {routesLoading && (
            <div className="flex items-center gap-1.5 text-indigo-600">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Маршрути...</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {[
            { label: 'Склади', checked: showWarehouses, onChange: setShowWarehouses },
            { label: 'Заявки', checked: showRequests, onChange: setShowRequests },
            { label: 'Маршрути', checked: showRoutes, onChange: setShowRoutes },
            { label: 'Зони доставки', checked: showCoverage, onChange: setShowCoverage },
          ].map(({ label, checked, onChange }) => (
            <label key={label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Map */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${selectedRequest ? 'flex-1' : 'w-full'}`}
          style={{ height: 'calc(100vh - 260px)' }}>
          <MapContainer center={[49.0, 31.0]} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {showWarehouses && warehouses.map((wh) => (
              <Marker key={wh.id} position={[wh.latitude, wh.longitude]}
                icon={wh.type === 'main' ? mainWarehouseIcon : regularWarehouseIcon}>
                <Popup><MapPointDetails type="warehouse" data={wh} /></Popup>
              </Marker>
            ))}

            {showCoverage && warehouses.map((wh) => (
              <span key={`zones-${wh.id}`}>
                <Circle center={[wh.latitude, wh.longitude]}
                  radius={YELLOW_ZONE_RADIUS * 1000}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.04, weight: 1, dashArray: '6 4' }}
                />
                <Circle center={[wh.latitude, wh.longitude]}
                  radius={YELLOW_ZONE_RADIUS * 1000}
                  pathOptions={{ color: '#eab308', fillColor: '#eab308', fillOpacity: 0.06, weight: 1.5, dashArray: '4 3' }}
                />
                <Circle center={[wh.latitude, wh.longitude]}
                  radius={GREEN_ZONE_RADIUS * 1000}
                  pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.08, weight: 2 }}
                />
              </span>
            ))}

            {/* Show zone circles around selected request */}
            {selectedRequest && (
              <>
                <Circle center={[selectedRequest.latitude, selectedRequest.longitude]}
                  radius={GREEN_ZONE_RADIUS * 1000}
                  pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.05, weight: 2, dashArray: '8 4' }}
                />
                <Circle center={[selectedRequest.latitude, selectedRequest.longitude]}
                  radius={YELLOW_ZONE_RADIUS * 1000}
                  pathOptions={{ color: '#eab308', fillColor: '#eab308', fillOpacity: 0.03, weight: 1.5, dashArray: '6 4' }}
                />
              </>
            )}

            {/* Lines from selected request to warehouses */}
            {selectedRequest && selectedZones.map((entry) => (
              <Polyline
                key={`assign-line-${entry.warehouse.id}`}
                positions={[
                  [selectedRequest.latitude, selectedRequest.longitude],
                  [entry.warehouse.latitude, entry.warehouse.longitude],
                ]}
                pathOptions={{
                  color: getZoneColor(entry.zone),
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '6 6',
                }}
              />
            ))}

            {showRoutes && realRoutes.map((route) => (
              <Polyline key={`route-${route.id}`} positions={route.coordinates}
                pathOptions={{ color: route.color, weight: 3, opacity: 0.8 }}>
                {route.distance > 0 && (
                  <Popup>
                    <div className="text-xs">
                      <p className="font-semibold">Маршрут {route.id}</p>
                      <p className="text-gray-600 mt-1">
                        <span className="font-medium">{route.distance} км</span>
                        {' · '}
                        <span className="font-medium">
                          {route.duration >= 60 ? `${Math.floor(route.duration / 60)} год ${route.duration % 60} хв` : `${route.duration} хв`}
                        </span>
                      </p>
                    </div>
                  </Popup>
                )}
              </Polyline>
            ))}

            {showRequests && activeRequests.map((dr) => {
              const routeInfo = routeInfoMap.get(dr.id);
              return (
                <Marker key={dr.id} position={[dr.latitude, dr.longitude]} icon={getRequestIcon(dr)}
                  eventHandlers={{ click: () => { if (dr.status === 'pending') setSelectedRequestId(dr.id); } }}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-gray-500">{dr.id}</span>
                        <PriorityBadge priority={dr.priority} />
                      </div>
                      <p className="text-sm font-medium mb-1">{dr.address}</p>
                      <p className="text-xs text-gray-600">{productCatalog[dr.productNumber] ?? dr.productNumber} x {dr.quantity}</p>
                      <div className="mt-2"><StatusBadge status={dr.status} /></div>
                      {dr.comment && <p className="text-xs text-gray-500 mt-2 italic">{dr.comment}</p>}
                      {dr.assignedWarehouseId && (
                        <p className="text-xs text-indigo-600 mt-1">
                          Склад: {warehouses.find((w) => w.id === dr.assignedWarehouseId)?.name}
                        </p>
                      )}
                      {routeInfo && routeInfo.distance > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-700">
                          {routeInfo.distance} км · {routeInfo.duration >= 60 ? `${Math.floor(routeInfo.duration / 60)} год ${routeInfo.duration % 60} хв` : `${routeInfo.duration} хв`}
                        </div>
                      )}
                      {dr.status === 'pending' && (
                        <button
                          onClick={() => setSelectedRequestId(dr.id)}
                          className="mt-2 w-full text-xs bg-indigo-600 text-white py-1.5 rounded font-medium hover:bg-indigo-700"
                        >
                          Призначити склад
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Assignment sidebar */}
        {selectedRequest && (
          <div className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            style={{ height: 'calc(100vh - 260px)' }}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-gray-500">{selectedRequest.id}</span>
                <button onClick={() => setSelectedRequestId(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <PriorityBadge priority={selectedRequest.priority} />
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">{selectedRequest.address}</p>
              <p className="text-xs text-gray-500 mt-1">{productCatalog[selectedRequest.productNumber] ?? selectedRequest.productNumber} x {selectedRequest.quantity}</p>
              {selectedRequest.comment && (
                <p className="text-xs text-gray-400 italic mt-1">{selectedRequest.comment}</p>
              )}
            </div>

            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Призначити склад</p>
              <p className="text-[10px] text-gray-400">Оберіть склад для обробки заявки</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedZones.map((entry) => {
                const product = entry.warehouse.products.find((p) => p.productNumber === selectedRequest.productNumber);
                const available = product?.quantity ?? 0;
                const enough = available >= selectedRequest.quantity;
                const dist = Math.round(entry.distance);

                return (
                  <div key={entry.warehouse.id}
                    className="p-3 rounded-lg border transition-all"
                    style={{
                      backgroundColor: entry.zone === 'green' ? '#f0fdf4' : entry.zone === 'yellow' ? '#fefce8' : '#fef2f2',
                      borderColor: entry.zone === 'green' ? '#bbf7d0' : entry.zone === 'yellow' ? '#fef08a' : '#fecaca',
                    }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <ZoneDot zone={entry.zone} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.warehouse.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{dist} км</span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-500">
                        {getZoneLabel(entry.zone)}
                      </span>
                      <span className={`font-medium ${enough ? 'text-green-600' : available > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {available} од. {enough ? '✓' : available > 0 ? '(мало)' : '(немає)'}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAssignWarehouse(selectedRequest.id, entry.warehouse.id)}
                        disabled={available === 0}
                        className="flex-1 text-xs bg-indigo-600 text-white py-1.5 rounded font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Підтвердити
                      </button>
                      <button
                        onClick={() => { handleAssignWithoutApproval(selectedRequest.id, entry.warehouse.id); setSelectedRequestId(null); }}
                        disabled={available === 0}
                        className="flex-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-1.5 rounded font-medium hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Лише призначити
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pending requests quick list */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="p-2 bg-gray-50 dark:bg-gray-900">
                <p className="text-[10px] font-semibold text-gray-500 uppercase">Інші заявки ({pendingRequests.length})</p>
              </div>
              <div className="max-h-32 overflow-y-auto">
                {pendingRequests.filter((r) => r.id !== selectedRequestId).slice(0, 8).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRequestId(r.id)}
                    className="w-full px-3 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-gray-400">{r.id}</span>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <span className="text-[10px] text-gray-400">{r.quantity} од.</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-800">
          <p className="text-xs text-red-600">Термінові</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-400">{activeRequests.filter((r) => r.priority === 'urgent').length}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-100 dark:border-orange-800">
          <p className="text-xs text-orange-600">Критичні</p>
          <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{activeRequests.filter((r) => r.priority === 'critical').length}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-100 dark:border-yellow-800">
          <p className="text-xs text-yellow-600">Підвищені</p>
          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{activeRequests.filter((r) => r.priority === 'elevated').length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-800">
          <p className="text-xs text-green-600">Звичайні</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-400">{activeRequests.filter((r) => r.priority === 'normal').length}</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-100 dark:border-indigo-800">
          <p className="text-xs text-indigo-600">Очікують</p>
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{pendingRequests.length}</p>
        </div>
      </div>
    </div>
  );
}
