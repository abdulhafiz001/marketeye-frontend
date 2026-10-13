import React from 'react';
import { startOfflineQueueSync, stopOfflineQueueSync } from '@/services/offlineQueue';
import { useStore } from '@/store/useStore';

/** Starts NetInfo flush for offline drafts when logged in. */
export function OfflineQueueSync() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  React.useEffect(() => {
    if (!isAuthenticated) {
      stopOfflineQueueSync();
      return;
    }
    startOfflineQueueSync();
    return () => stopOfflineQueueSync();
  }, [isAuthenticated]);

  return null;
}
