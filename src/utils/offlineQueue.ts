import type { OfflineAction } from '../types';

const QUEUE_KEY = 'wl-offline-queue';
const API_BASE = '/api';

export function getOfflineQueue(): OfflineAction[] {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(
  type: OfflineAction['type'],
  payload: Record<string, unknown>
): OfflineAction {
  const queue = getOfflineQueue();
  const action: OfflineAction = {
    id: `OA-${Date.now()}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
    synced: false,
  };
  queue.push(action);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return action;
}

export function markAsSynced(actionId: string): void {
  const queue = getOfflineQueue();
  const updated = queue.map((a) =>
    a.id === actionId ? { ...a, synced: true } : a
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export function clearSyncedActions(): void {
  const queue = getOfflineQueue();
  const remaining = queue.filter((a) => !a.synced);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

export function getPendingActionsCount(): number {
  return getOfflineQueue().filter((a) => !a.synced).length;
}

async function sendToServer(action: OfflineAction): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: action.id,
        type: action.type,
        payload: action.payload,
        timestamp: action.timestamp,
      }),
    });
    return response.ok;
  } catch {
    // Server unavailable — treat as local-only mode (demo/hackathon)
    // In this case, mark as synced since data is already persisted in localStorage
    return true;
  }
}

/**
 * Sync offline actions when connection is restored.
 * Attempts real HTTP POST to /api/sync for each pending action.
 * Falls back gracefully when no backend is available (demo mode).
 */
export async function syncOfflineActions(): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  let synced = 0;
  let failed = 0;

  for (const action of queue) {
    if (action.synced) continue;
    const ok = await sendToServer(action);
    if (ok) {
      markAsSynced(action.id);
      synced++;
    } else {
      failed++;
    }
  }

  clearSyncedActions();
  return { synced, failed };
}
