import type { Priority } from '../../types';

const config: Record<Priority, { bg: string; text: string; label: string; dot: string }> = {
  urgent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Терміново', dot: 'bg-red-500 animate-pulse' },
  critical: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Критично', dot: 'bg-orange-500' },
  elevated: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Підвищений', dot: 'bg-yellow-500' },
  normal: { bg: 'bg-green-100', text: 'text-green-800', label: 'Звичайний', dot: 'bg-green-500' },
};

interface PriorityBadgeProps {
  priority: Priority;
  showDot?: boolean;
}

export default function PriorityBadge({ priority, showDot = true }: PriorityBadgeProps) {
  const c = config[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
      {c.label}
    </span>
  );
}
