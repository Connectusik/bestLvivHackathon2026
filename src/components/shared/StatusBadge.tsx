const colorMap: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  on_route: 'bg-blue-100 text-blue-800',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = colorMap[status] ?? 'bg-gray-100 text-gray-800';
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colors}`}>
      {label}
    </span>
  );
}
