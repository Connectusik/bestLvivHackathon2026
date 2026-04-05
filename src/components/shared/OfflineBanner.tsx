import { useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { syncOfflineActions, getPendingActionsCount } from '../../utils/offlineQueue';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [syncMsg, setSyncMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const pendingCount = getPendingActionsCount();

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncOfflineActions();
    setSyncMsg(`Синхронізовано ${result.synced} дій`);
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 3000);
  };

  if (isOnline && pendingCount === 0) return null;

  if (isOnline && pendingCount > 0) {
    return (
      <div className="bg-blue-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-3 z-50" role="status">
        <span>{pendingCount} офлайн-{pendingCount > 1 ? 'дій' : 'дія'} готові до синхронізації</span>
        <button onClick={handleSync} disabled={syncing} className="bg-white text-blue-600 px-3 py-0.5 rounded text-xs font-semibold hover:bg-blue-50 disabled:opacity-50">
          {syncing ? 'Синхронізація...' : 'Синхронізувати'}
        </button>
        {syncMsg && <span className="text-xs">{syncMsg}</span>}
      </div>
    );
  }

  return (
    <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 z-50" role="alert">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
      </svg>
      Офлайн-режим — дані зберігаються локально та будуть синхронізовані після відновлення зв'язку
      {pendingCount > 0 && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-xs">{pendingCount} в черзі</span>}
    </div>
  );
}
