import { useNavigate } from 'react-router-dom';

const roles = [
  {
    key: 'admin',
    title: 'Administrator',
    description: 'Manage warehouses, trucks, supplies, and view the logistics map.',
    path: '/admin/map',
    color: 'from-indigo-500 to-indigo-700',
    icon: (
      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'worker',
    title: 'Warehouse Worker',
    description: 'View warehouse inventory, track supplies and shipments.',
    path: '/worker',
    color: 'from-emerald-500 to-emerald-700',
    icon: (
      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: 'client',
    title: 'Client',
    description: 'Create delivery requests and track your orders.',
    path: '/client',
    color: 'from-amber-500 to-amber-700',
    icon: (
      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
];

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Warehouse Logistics</h1>
        <p className="text-gray-500">Select your role to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {roles.map((role) => (
          <button
            key={role.key}
            onClick={() => navigate(role.path)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
              {role.icon}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{role.title}</h2>
            <p className="text-sm text-gray-500">{role.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
