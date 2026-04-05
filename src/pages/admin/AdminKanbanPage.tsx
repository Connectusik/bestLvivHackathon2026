import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import PriorityBadge from '../../components/shared/PriorityBadge';
import type { DeliveryRequest, Priority } from '../../types';

type KanbanStatus = 'pending' | 'approved' | 'in_transit' | 'delivered';

const COLUMNS: { id: KanbanStatus; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { id: 'pending', label: 'Очікує', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { id: 'approved', label: 'Підтверджено', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'in_transit', label: 'В дорозі', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  { id: 'delivered', label: 'Доставлено', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
];

const priorityColors: Record<Priority, string> = {
  urgent: 'border-l-red-500',
  critical: 'border-l-orange-500',
  elevated: 'border-l-yellow-500',
  normal: 'border-l-green-500',
};

function KanbanCard({ request, isDragging }: { request: DeliveryRequest; isDragging?: boolean }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${priorityColors[request.priority]} p-3 shadow-sm ${
        isDragging ? 'shadow-lg ring-2 ring-indigo-300 opacity-90' : 'hover:shadow-md'
      } transition-shadow`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{request.id}</span>
        <PriorityBadge priority={request.priority} />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{request.productNumber} &times; {request.quantity}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{request.address}</p>
      {request.assignedWarehouseId && (
        <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {request.assignedWarehouseId}
        </p>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(request.createdAt).toLocaleDateString('uk-UA')}</p>
    </div>
  );
}

function SortableCard({ request }: { request: DeliveryRequest }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: request.id,
    data: { request },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <KanbanCard request={request} />
    </div>
  );
}

function KanbanColumn({ column, requests }: {
  column: typeof COLUMNS[number];
  requests: DeliveryRequest[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border ${column.borderColor} ${column.bgColor} ${
        isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''
      } transition-all min-h-0`}
    >
      <div className={`px-4 py-3 border-b ${column.borderColor}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${column.color}`}>{column.label}</h3>
          <span className={`text-xs font-bold ${column.color} bg-white/60 px-2 py-0.5 rounded-full`}>
            {requests.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[100px]">
        <SortableContext items={requests.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {requests.map((request) => (
            <SortableCard key={request.id} request={request} />
          ))}
        </SortableContext>
        {requests.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            Перетягніть сюди
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminKanbanPage() {
  const { requests, updateRequest, approveRequest, startDelivery, markDelivered } = useApp();
  const { addNotification } = useNotifications();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const nonRejected = requests.filter((r) => r.status !== 'rejected');

  const columns = COLUMNS.map((col) => ({
    ...col,
    requests: nonRejected
      .filter((r) => r.status === col.id)
      .sort((a, b) => {
        const po: Record<Priority, number> = { urgent: 0, critical: 1, elevated: 2, normal: 3 };
        return po[a.priority] - po[b.priority];
      }),
  }));

  const activeRequest = activeId ? requests.find((r) => r.id === activeId) : null;

  const statusLabels: Record<KanbanStatus, string> = {
    pending: 'Очікує',
    approved: 'Підтверджено',
    in_transit: 'В дорозі',
    delivered: 'Доставлено',
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent): void => { void _event;
    // Visual feedback handled by isOver in columns
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const requestId = active.id as string;
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    // Determine the target column
    let targetStatus: KanbanStatus | null = null;

    // Check if dropped on a column directly
    if (COLUMNS.some((c) => c.id === over.id)) {
      targetStatus = over.id as KanbanStatus;
    } else {
      // Dropped on another card — find its column
      const targetRequest = requests.find((r) => r.id === over.id);
      if (targetRequest && targetRequest.status !== 'rejected') {
        targetStatus = targetRequest.status as KanbanStatus;
      }
    }

    if (!targetStatus || targetStatus === request.status) return;

    // Validate transitions: only allow forward movement or back to pending
    const statusOrder: KanbanStatus[] = ['pending', 'approved', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(request.status as KanbanStatus);
    const targetIndex = statusOrder.indexOf(targetStatus);

    if (targetIndex < currentIndex && targetStatus !== 'pending') return;

    // Apply the status change
    switch (targetStatus) {
      case 'approved':
        if (request.status === 'pending') {
          approveRequest(requestId);
          addNotification('success', `Заявку ${requestId} підтверджено`);
        }
        break;
      case 'in_transit':
        if (request.status === 'approved') {
          startDelivery(requestId);
          addNotification('info', `Заявку ${requestId} відправлено в доставку`);
        }
        break;
      case 'delivered':
        if (request.status === 'in_transit') {
          markDelivered(requestId);
          addNotification('success', `Заявку ${requestId} доставлено!`);
        }
        break;
      case 'pending':
        updateRequest(requestId, { status: 'pending', approvedAt: undefined, assignedWarehouseId: undefined, assignedTruckId: undefined });
        addNotification('warning', `Заявку ${requestId} повернено в очікування`);
        break;
    }
  };

  const totalActive = nonRejected.filter((r) => r.status !== 'delivered').length;
  const urgentPending = nonRejected.filter((r) => r.status === 'pending' && r.priority === 'urgent').length;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban-дошка</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Перетягуйте заявки між колонками для зміни статусу</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Активних</p>
              <p className="text-lg font-bold text-indigo-600">{totalActive}</p>
            </div>
            {urgentPending > 0 && (
              <div className="bg-red-50 rounded-lg border border-red-200 px-3 py-2 text-center">
                <p className="text-xs text-red-600">Терміново</p>
                <p className="text-lg font-bold text-red-700 animate-pulse">{urgentPending}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Перетягніть карточку вправо для просування статусу
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Терміново
            <span className="w-2 h-2 rounded-full bg-orange-500 ml-2" /> Критично
            <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2" /> Підвищений
            <span className="w-2 h-2 rounded-full bg-green-500 ml-2" /> Звичайний
          </span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-4 flex-1 min-h-0" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {columns.map((col) => (
            <KanbanColumn key={col.id} column={col} requests={col.requests} />
          ))}
        </div>

        <DragOverlay>
          {activeRequest ? <KanbanCard request={activeRequest} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Правила переміщення:</span>{' '}
          {statusLabels.pending} → {statusLabels.approved} → {statusLabels.in_transit} → {statusLabels.delivered}.
          Можна повернути заявку в "{statusLabels.pending}".
        </p>
      </div>
    </div>
  );
}
