import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import { warehouses } from '../data/mockData';

const DEMO_USERS = [
  { name: 'Олександр Петренко', role: 'admin' as UserRole, login: 'admin', password: 'admin' },
  { name: 'Іван Шевченко', role: 'worker' as UserRole, login: 'worker', password: 'worker', warehouseId: 'wh-lviv' },
  { name: 'Марія Коваленко', role: 'client' as UserRole, login: 'client', password: 'client' },
];

const roleRoutes: Record<UserRole, string> = {
  admin: '/admin/map',
  worker: '/worker',
  client: '/client',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ login: '', password: '', warehouseId: '' });
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const demoUser = DEMO_USERS.find(
      (u) => u.login === form.login && u.password === form.password
    );

    if (!demoUser) {
      setError('Невірний логін або пароль');
      return;
    }

    const warehouseId = demoUser.role === 'worker'
      ? (form.warehouseId || demoUser.warehouseId)
      : undefined;

    login({
      name: demoUser.name,
      role: demoUser.role,
      warehouseId,
    });

    navigate(roleRoutes[demoUser.role]);
  };

  const handleQuickLogin = (user: typeof DEMO_USERS[number]) => {
    login({
      name: user.name,
      role: user.role,
      warehouseId: user.warehouseId,
    });
    navigate(roleRoutes[user.role]);
  };

  const selectedUser = DEMO_USERS.find((u) => u.login === form.login);
  const isWorker = selectedUser?.role === 'worker';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Warehouse Logistics</h1>
        <p className="text-gray-500 dark:text-gray-400">Система управління складською логістикою</p>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Вхід у систему</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Логін</label>
              <input
                id="login-input"
                type="text"
                required
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="Введіть логін"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Пароль</label>
              <input
                id="password-input"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Введіть пароль"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {isWorker && (
              <div>
                <label htmlFor="warehouse-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Склад</label>
                <select
                  id="warehouse-select"
                  value={form.warehouseId}
                  onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Увійти
            </button>
          </form>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {showDemo ? 'Сховати' : 'Показати'} демо-доступи
          </button>

          {showDemo && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.login}
                  onClick={() => handleQuickLogin(user)}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-left hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                    user.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' :
                    user.role === 'worker' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400' :
                    'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.role === 'admin' ? 'Адмін' : user.role === 'worker' ? 'Працівник' : 'Клієнт'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{user.login} / {user.password}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
