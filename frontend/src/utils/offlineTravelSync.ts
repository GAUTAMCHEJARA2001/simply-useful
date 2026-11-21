import { travelService, DailyTravelLogItem, TourPlanStopItem } from '@/api/services/travel.service';

export interface OfflineTravelAction {
  id: string;
  type: 'START_TRIP' | 'PUNCH_VISIT' | 'ADD_STOP' | 'SAVE_PLAN' | 'END_TRIP';
  payload: any;
  label: string;
  timestamp: number;
  date: string;
  retryCount?: number;
  lastError?: string;
}

const OUTBOX_STORAGE_KEY = 'offline_travel_outbox_v1';
const PARTIES_STORAGE_KEY = 'offline_travel_parties_v1';
const TRIP_CACHE_PREFIX = 'offline_travel_trip_v1_';

export const isNetworkOfflineError = (err: any): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (!err) return false;
  if (!err.response) return true; // No response from server (network drop, DNS failure, timeout)
  const code = String(err.code || '').toUpperCase();
  if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return true;
  }
  const status = err.response?.status;
  if (status === 502 || status === 503 || status === 504) {
    return true; // Gateway / proxy down while in weak connectivity
  }
  return false;
};

export const getOfflineOutbox = (): OfflineTravelAction[] => {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading offline travel outbox:', e);
    return [];
  }
};

export const saveOfflineOutbox = (items: OfflineTravelAction[]): void => {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('offline-outbox-updated', { detail: { count: items.length } }));
  } catch (e) {
    console.error('Error saving offline travel outbox:', e);
  }
};

export const enqueueOfflineAction = (
  type: OfflineTravelAction['type'],
  payload: any,
  label: string,
  date: string
): OfflineTravelAction => {
  const existing = getOfflineOutbox();
  const newAction: OfflineTravelAction = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    label,
    timestamp: Date.now(),
    date,
    retryCount: 0,
  };
  const updated = [...existing, newAction];
  saveOfflineOutbox(updated);
  return newAction;
};

export const removeOfflineAction = (id: string): void => {
  const existing = getOfflineOutbox();
  const filtered = existing.filter(item => item.id !== id);
  saveOfflineOutbox(filtered);
};

export const clearCompletedOfflineActions = (ids: string[]): void => {
  const existing = getOfflineOutbox();
  const idSet = new Set(ids);
  const remaining = existing.filter(item => !idSet.has(item.id));
  saveOfflineOutbox(remaining);
};

// Caching today's trip locally for offline retrieval
export const cacheTodayTrip = (userId: string, date: string, data: DailyTravelLogItem | null, stops: TourPlanStopItem[]): void => {
  try {
    const key = `${TRIP_CACHE_PREFIX}${userId || 'anon'}_${date}`;
    localStorage.setItem(key, JSON.stringify({
      log: data,
      stops,
      savedAt: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to cache today trip:', e);
  }
};

export const getCachedTodayTrip = (userId: string, date: string): { log: DailyTravelLogItem | null; stops: TourPlanStopItem[]; savedAt: number } | null => {
  try {
    const key = `${TRIP_CACHE_PREFIX}${userId || 'anon'}_${date}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get cached today trip:', e);
    return null;
  }
};

// Cache party list (dealers, distributors, leads) for offline selector
export const cacheOfflineParties = (parties: any[]): void => {
  try {
    localStorage.setItem(PARTIES_STORAGE_KEY, JSON.stringify({
      parties,
      savedAt: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to cache offline parties:', e);
  }
};

export const getCachedOfflineParties = (): any[] => {
  try {
    const raw = localStorage.getItem(PARTIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.parties) ? parsed.parties : [];
  } catch (e) {
    console.error('Failed to get cached offline parties:', e);
    return [];
  }
};

// Auto-Sync Outbox Engine
export const syncOfflineOutbox = async (
  onProgress?: (synced: number, total: number, currentItem: OfflineTravelAction) => void
): Promise<{ success: boolean; syncedCount: number; remainingCount: number; errors: string[] }> => {
  const outbox = getOfflineOutbox();
  if (outbox.length === 0) {
    return { success: true, syncedCount: 0, remainingCount: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors: string[] = [];
  const successfulIds: string[] = [];

  for (let i = 0; i < outbox.length; i++) {
    const item = outbox[i];
    if (onProgress) {
      onProgress(i, outbox.length, item);
    }

    try {
      if (item.type === 'START_TRIP') {
        await travelService.startTrip(item.payload);
      } else if (item.type === 'ADD_STOP') {
        await travelService.addUnplannedStop(item.payload);
      } else if (item.type === 'PUNCH_VISIT') {
        await travelService.punchStopVisit(item.payload);
      } else if (item.type === 'SAVE_PLAN') {
        await travelService.savePlan(item.payload);
      } else if (item.type === 'END_TRIP') {
        await travelService.endTrip(item.payload);
      }

      successfulIds.push(item.id);
      syncedCount++;
    } catch (err: any) {
      console.warn(`[OFFLINE_SYNC] Failed to sync item ${item.id} (${item.label}):`, err);
      // If error is network drop, stop loop so remaining items stay queued for next reconnect
      if (isNetworkOfflineError(err)) {
        errors.push(`Network interrupted while syncing "${item.label}". Remaining items kept in outbox.`);
        break;
      } else {
        // Validation / 400 error on this item
        const msg = err.response?.data?.message || err.message || 'Validation error';
        errors.push(`"${item.label}": ${msg}`);
        // If it's a permanent 400 (e.g. invalid KM), record error but don't infinitely block other entries
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = msg;
        if (item.retryCount >= 3) {
          successfulIds.push(item.id); // Evict poisoned item after 3 tries to unstick queue
        }
      }
    }
  }

  // Remove processed items
  if (successfulIds.length > 0) {
    clearCompletedOfflineActions(successfulIds);
  }

  const remaining = getOfflineOutbox();
  return {
    success: errors.length === 0 && remaining.length === 0,
    syncedCount,
    remainingCount: remaining.length,
    errors,
  };
};
