import React from 'react';
import { startOfflineQueueSync, stopOfflineQueueSync } from '@/services/offlineQueue';
import { useStore } from '@/store/useStore';
import { syncExpoPushTokenWithServer } from '@/services/deviceNotifications';

/** Starts NetInfo flush for offline drafts + registers Expo push token when logged in. */
export function OfflineQueueSync() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  React.useEffect(() => {
    if (!isAuthenticated) {
      stopOfflineQueueSync();
      return;
    }
    startOfflineQueueSync();
    void syncExpoPushTokenWithServer();
    return () => stopOfflineQueueSync();
  }, [isAuthenticated]);

  return null;
}
