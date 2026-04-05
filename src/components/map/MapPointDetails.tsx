import type { Warehouse, DeliveryRequest } from '../../types';
import StatusBadge from '../shared/StatusBadge';

interface WarehouseDetailsProps {
  type: 'warehouse';
  data: Warehouse;
}

interface RequestDetailsProps {
  type: 'request';
  data: DeliveryRequest;
}

type MapPointDetailsProps = WarehouseDetailsProps | RequestDetailsProps;

export default function MapPointDetails(props: MapPointDetailsProps) {
  if (props.type === 'warehouse') {
    const w = props.data;
    return (
      <div className="min-w-[220px]">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{w.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            w.type === 'main' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {w.type === 'main' ? 'Головний' : 'Регіональний'}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{w.address}</p>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Товари:</p>
          {w.products.map((p) => (
            <div key={p.productNumber} className="flex justify-between text-xs text-gray-600 dark:text-gray-400 py-0.5">
              <span>{p.name}</span>
              <span className="font-medium">{p.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const r = props.data;
  return (
    <div className="min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{r.id}</h3>
        <StatusBadge status={r.status} />
      </div>
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <p><span className="font-medium">Товар:</span> {r.productNumber}</p>
        <p><span className="font-medium">Кількість:</span> {r.quantity}</p>
        <p><span className="font-medium">Адреса:</span> {r.address}</p>
        {r.comment && <p><span className="font-medium">Коментар:</span> {r.comment}</p>}
      </div>
    </div>
  );
}
