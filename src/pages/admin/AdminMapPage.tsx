import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { warehouses, deliveryRequests } from '../../data/mockData';
import MapPointDetails from '../../components/map/MapPointDetails';

const mainWarehouseIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const regularWarehouseIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const requestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function AdminMapPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Logistics Map</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of warehouses and delivery requests across Ukraine</p>
      </div>

      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Main Warehouse</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600">Regular Warehouse</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-gray-600">Delivery Request</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
        <MapContainer
          center={[49.0, 31.0]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {warehouses.map((wh) => (
            <Marker
              key={wh.id}
              position={[wh.latitude, wh.longitude]}
              icon={wh.type === 'main' ? mainWarehouseIcon : regularWarehouseIcon}
            >
              <Popup>
                <MapPointDetails type="warehouse" data={wh} />
              </Popup>
            </Marker>
          ))}

          {deliveryRequests.map((dr) => (
            <Marker
              key={dr.id}
              position={[dr.latitude, dr.longitude]}
              icon={requestIcon}
            >
              <Popup>
                <MapPointDetails type="request" data={dr} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
