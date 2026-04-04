import { Routes, Route, Navigate } from 'react-router-dom';
import RoleSelectionPage from './pages/RoleSelectionPage';
import AdminLayout from './components/layout/AdminLayout';
import AdminMapPage from './pages/admin/AdminMapPage';
import AdminStatisticsPage from './pages/admin/AdminStatisticsPage';
import AdminTrucksPage from './pages/admin/AdminTrucksPage';
import AdminSuppliesPage from './pages/admin/AdminSuppliesPage';
import WorkerDashboard from './pages/WorkerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import OfflineBanner from './components/shared/OfflineBanner';

export default function App() {
  return (
    <>
    <OfflineBanner />
    <Routes>
      <Route path="/" element={<RoleSelectionPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="map" replace />} />
        <Route path="map" element={<AdminMapPage />} />
        <Route path="statistics" element={<AdminStatisticsPage />} />
        <Route path="trucks" element={<AdminTrucksPage />} />
        <Route path="supplies" element={<AdminSuppliesPage />} />
      </Route>

      <Route path="/worker" element={<WorkerDashboard />} />
      <Route path="/client" element={<ClientDashboard />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
