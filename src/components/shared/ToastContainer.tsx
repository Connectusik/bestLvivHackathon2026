import { useNotifications, type NotificationType } from '../../contexts/NotificationContext';

const typeStyles: Record<NotificationType, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/40',
    border: 'border-green-200 dark:border-green-800',
    icon: 'M5 13l4 4L19 7',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/40',
    border: 'border-red-200 dark:border-red-800',
    icon: 'M6 18L18 6M6 6l12 12',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/40',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/40',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

const typeIconColors: Record<NotificationType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const style = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`${style.bg} ${style.border} border rounded-lg shadow-lg p-3 flex items-start gap-3 animate-slide-in`}
          >
            <svg className={`w-5 h-5 ${typeIconColors[toast.type]} shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
            </svg>
            <p className="text-sm text-gray-800 dark:text-gray-200 flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Закрити сповіщення"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
