import { useNavigate } from 'react-router-dom';
import type { UserRole } from '../../types';

interface HeaderProps {
  role: UserRole;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  worker: 'Warehouse Worker',
  client: 'Client',
};

export default function Header({ role }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900 text-lg">Warehouse Logistics</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          Logged in as <span className="font-medium text-gray-700">{roleLabels[role]}</span>
        </span>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          Switch Role
        </button>
      </div>
    </header>
  );
}
