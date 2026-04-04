import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 z-50">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
      </svg>
      Offline mode — data is saved locally and will sync when connection is restored
    </div>
  );
}
