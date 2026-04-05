import { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import type { Priority } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

const COLORS = ['#3191a5', '#22c55e', '#f1a92e', '#ef4444', '#5bc5d9', '#06b6d4'];
const PRIORITY_COLORS: Record<Priority, string> = {
  normal: '#22c55e',
  elevated: '#eab308',
  critical: '#f97316',
  urgent: '#ef4444',
};

export default function AdminStatisticsPage() {
  const { requests, trucks, supplies, warehouses } = useApp();

  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === 'pending').length;
  const deliveredRequests = requests.filter((r) => r.status === 'delivered').length;
  const inTransitRequests = requests.filter((r) => r.status === 'in_transit').length;

  const totalTrucks = trucks.length;
  const availableTrucks = trucks.filter((t) => t.status === 'available').length;
  const onRouteTrucks = trucks.filter((t) => t.status === 'on_route').length;

  const totalStock = warehouses.reduce(
    (sum, wh) => sum + wh.products.reduce((s, p) => s + p.quantity, 0), 0
  );

  const statusData = [
    { name: 'Очікує', value: requests.filter((r) => r.status === 'pending').length },
    { name: 'Підтверджено', value: requests.filter((r) => r.status === 'approved').length },
    { name: 'В дорозі', value: requests.filter((r) => r.status === 'in_transit').length },
    { name: 'Доставлено', value: requests.filter((r) => r.status === 'delivered').length },
    { name: 'Відхилено', value: requests.filter((r) => r.status === 'rejected').length },
  ].filter((d) => d.value > 0);

  const priorityData = [
    { name: 'Звичайний', value: requests.filter((r) => r.priority === 'normal').length, color: PRIORITY_COLORS.normal },
    { name: 'Підвищений', value: requests.filter((r) => r.priority === 'elevated').length, color: PRIORITY_COLORS.elevated },
    { name: 'Критичний', value: requests.filter((r) => r.priority === 'critical').length, color: PRIORITY_COLORS.critical },
    { name: 'Терміновий', value: requests.filter((r) => r.priority === 'urgent').length, color: PRIORITY_COLORS.urgent },
  ].filter((d) => d.value > 0);

  const warehouseStockData = warehouses.map((wh) => ({
    name: wh.name.replace('Склад ', '').replace('Центральний склад ', ''),
    stock: wh.products.reduce((s, p) => s + p.quantity, 0),
  }));

  const productDemandData = Object.entries(
    requests.reduce<Record<string, number>>((acc, r) => {
      if (r.status !== 'delivered' && r.status !== 'rejected') {
        acc[r.productNumber] = (acc[r.productNumber] ?? 0) + r.quantity;
      }
      return acc;
    }, {})
  ).map(([product, demand]) => ({ product, demand }));

  // Dynamic trend data based on actual request dates
  const trendData = useMemo(() => {
    const days = new Map<string, { requests: number; delivered: number }>();
    const sorted = [...requests].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const r of sorted) {
      const day = new Date(r.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
      const entry = days.get(day) ?? { requests: 0, delivered: 0 };
      entry.requests++;
      if (r.status === 'delivered') entry.delivered++;
      days.set(day, entry);
    }
    let cumReq = 0;
    let cumDel = 0;
    return Array.from(days.entries()).map(([day, { requests: req, delivered }]) => {
      cumReq += req;
      cumDel += delivered;
      return { day, requests: cumReq, delivered: cumDel };
    });
  }, [requests]);

  const supplyStatusData = [
    { name: 'Очікує', value: supplies.filter((s) => s.status === 'pending').length },
    { name: 'В дорозі', value: supplies.filter((s) => s.status === 'in_transit').length },
    { name: 'Доставлено', value: supplies.filter((s) => s.status === 'delivered').length },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Статистика та аналітика</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Огляд логістичних операцій та ефективності</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Всього заявок" value={totalRequests} sub={`${pendingRequests} очікують`} color="indigo" />
        <KpiCard label="Доставлено" value={deliveredRequests} sub={`${inTransitRequests} в дорозі`} color="green" />
        <KpiCard label="Автопарк" value={totalTrucks} sub={`${availableTrucks} вільних, ${onRouteTrucks} в дорозі`} color="blue" />
        <KpiCard label="Загальний запас" value={totalStock.toLocaleString()} sub={`на ${warehouses.length} складах`} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Розподіл за статусами">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Розподіл за пріоритетами">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {priorityData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Запаси по складах">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={warehouseStockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="stock" name="Запас" fill="#3191a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Активний попит по товарах">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={productDemandData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="product" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="demand" name="Попит (од.)" fill="#f1a92e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Динаміка заявок">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="requests" name="Всього заявок" stroke="#3191a5" fill="#3191a5" fillOpacity={0.15} />
              <Area type="monotone" dataKey="delivered" name="Доставлено" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Стан постачання">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={supplyStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {supplyStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Деталі запасів по складах</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Склад</th>
                <th className="px-4 py-3 text-left font-medium">Тип</th>
                <th className="px-4 py-3 text-right font-medium">Товарів</th>
                <th className="px-4 py-3 text-right font-medium">Загальний запас</th>
                <th className="px-4 py-3 text-left font-medium">Стан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {warehouses.map((wh) => {
                const stock = wh.products.reduce((s, p) => s + p.quantity, 0);
                const hasLow = wh.products.some((p) => p.minThreshold && p.quantity < p.minThreshold);
                return (
                  <tr key={wh.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium">{wh.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${wh.type === 'main' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                        {wh.type === 'main' ? 'Головний' : 'Регіональний'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{wh.products.length}</td>
                    <td className="px-4 py-3 text-right font-medium">{stock.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {hasLow ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Низький запас</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Норма</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.indigo}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs opacity-70 mt-1">{sub}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}
