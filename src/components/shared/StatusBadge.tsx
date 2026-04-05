const colorMap: Record<string, { bg: string; label: string }> = {
  available: { bg: 'bg-green-100 text-green-800', label: 'Доступний' },
  on_route: { bg: 'bg-blue-100 text-blue-800', label: 'В дорозі' },
  inactive: { bg: 'bg-gray-100 text-gray-600', label: 'Неактивний' },
  pending: { bg: 'bg-yellow-100 text-yellow-800', label: 'Очікує' },
  approved: { bg: 'bg-indigo-100 text-indigo-800', label: 'Підтверджено' },
  in_transit: { bg: 'bg-blue-100 text-blue-800', label: 'В дорозі' },
  delivered: { bg: 'bg-green-100 text-green-800', label: 'Доставлено' },
  rejected: { bg: 'bg-red-100 text-red-800', label: 'Відхилено' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = colorMap[status];
  const colors = config?.bg ?? 'bg-gray-100 text-gray-800';
  const label = config?.label ?? status.replace(/_/g, ' ');

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}
