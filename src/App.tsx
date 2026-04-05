import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import OfflineBanner from './components/shared/OfflineBanner';

// Retry lazy imports on failure (handles stale PWA cache / chunk hash mismatch)
function lazyRetry<T extends { default: React.ComponentType }>(
  factory: () => Promise<T>,
): React.LazyExoticComponent<T['default']> {
  return lazy(() =>
    factory().catch(() => {
      // Force reload once to get fresh assets
      const key = 'lazy-retry-reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      // If we already retried, surface the error
      return factory();
    }),
  );
}

const LoginPage = lazyRetry(() => import('./pages/LoginPage'));
const AdminLayout = lazyRetry(() => import('./components/layout/AdminLayout'));
const AdminMapPage = lazyRetry(() => import('./pages/admin/AdminMapPage'));
const AdminStatisticsPage = lazyRetry(() => import('./pages/admin/AdminStatisticsPage'));
const AdminTrucksPage = lazyRetry(() => import('./pages/admin/AdminTrucksPage'));
const AdminSuppliesPage = lazyRetry(() => import('./pages/admin/AdminSuppliesPage'));
const AdminWarehousesPage = lazyRetry(() => import('./pages/admin/AdminWarehousesPage'));
const AdminRequestsPage = lazyRetry(() => import('./pages/admin/AdminRequestsPage'));
const AdminDistributionPage = lazyRetry(() => import('./pages/admin/AdminDistributionPage'));
const AdminKanbanPage = lazyRetry(() => import('./pages/admin/AdminKanbanPage'));
const WorkerDashboard = lazyRetry(() => import('./pages/WorkerDashboard'));
const ClientDashboard = lazyRetry(() => import('./pages/ClientDashboard'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Завантаження...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={getRoleRoute(user.role)} replace />;
  return <>{children}</>;
}

const roleRoutes: Record<string, string> = {
  admin: '/admin/map',
  worker: '/worker',
  client: '/client',
};

function getRoleRoute(role: string): string {
  return roleRoutes[role] ?? '/login';
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleRoute(user.role)} replace />;
}

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={getRoleRoute(user.role)} replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="map" replace />} />
            <Route path="map" element={<AdminMapPage />} />
            <Route path="requests" element={<AdminRequestsPage />} />
            <Route path="kanban" element={<AdminKanbanPage />} />
            <Route path="distribution" element={<AdminDistributionPage />} />
            <Route path="statistics" element={<AdminStatisticsPage />} />
            <Route path="trucks" element={<AdminTrucksPage />} />
            <Route path="supplies" element={<AdminSuppliesPage />} />
            <Route path="warehouses" element={<AdminWarehousesPage />} />
          </Route>

          <Route path="/worker" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/client" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Suspense>
    </>
  );
}
