import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { requestLocationPermission, getCurrentUserLocation } from '@/services/locationService';
import {
  requestDeviceNotificationPermission,
  syncExpoPushTokenWithServer,
} from '@/services/deviceNotifications';

/**
 * Coordinates Location and Notification permission requests:
 * - Does NOT prompt on cold start or before user is logged in/registered.
 * - Prompts 5 seconds AFTER user has successfully logged in or registered.
 */
export function PostLoginPermissionsCoordinator() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      promptedRef.current = false;
      return;
    }

    if (promptedRef.current) {
      return;
    }

    // 5-second delay after successful login / registration before prompting permissions
    const timer = setTimeout(async () => {
      promptedRef.current = true;

      try {
        // 1. Request notification permission & sync push token with backend
        await requestDeviceNotificationPermission();
        await syncExpoPushTokenWithServer();
      } catch {
        // Notification permission is optional
      }

      try {
        // 2. Request location permission & warmup GPS
        await requestLocationPermission();
        await getCurrentUserLocation();
      } catch {
        // Location permission is optional
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [isAuthenticated]);

  return null;
}
