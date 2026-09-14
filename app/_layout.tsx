/**
 * Main App Entry Point
 */

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from '@/navigation/AppNavigator';
import QueryProvider from '@/providers/QueryProvider';
import { mapAuthUserToAppUser, meRequest } from '@/services/authApi';
import { loadStoredToken, persistToken } from '@/services/apiClient';
import { fetchMarketWatches } from '@/services/userApi';
import { hydratePreferences, setStoreState } from '@/store/useStore';
import { AlertThresholdEvaluator } from '@/components/AlertThresholdEvaluator';
import { OfflineQueueSync } from '@/components/OfflineQueueSync';
import { getCurrentUserLocation, requestLocationPermission } from '@/services/locationService';

export default function RootLayout() {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await hydratePreferences();
      const token = await loadStoredToken();
      if (!token) {
        return;
      }

      setStoreState({ authToken: token });

      try {
        const u = await meRequest();
        if (cancelled) return;
        setStoreState({
          user: mapAuthUserToAppUser(u),
          isAuthenticated: true,
          authToken: token,
        });
        try {
          const watches = await fetchMarketWatches();
          if (!cancelled) {
            setStoreState({ marketWatchlist: watches });
          }
        } catch {
          // Keep locally saved watches if the account sync is unavailable.
        }
      } catch {
        await persistToken(null);
        if (!cancelled) {
          setStoreState({ user: null, isAuthenticated: false, authToken: null });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Request location permission and warmup GPS on initial app launch
  useEffect(() => {
    void (async () => {
      try {
        await requestLocationPermission();
        await getCurrentUserLocation();
      } catch {
        // Location is optional
      }
    })();
  }, []);

  // Deep-link to Notification screen when a push notification is tapped
  useEffect(() => {
    let subResponse: { remove: () => void } | null = null;
    let isMounted = true;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (!isMounted) return;

        subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          if (navigationRef.current) {
            try {
              navigationRef.current.navigate('Main', {
                screen: 'PriceWatch',
                params: { initialTab: 'inbox', alertId: data?.alertId || data?.alert_id },
              });
            } catch {
              try {
                navigationRef.current.navigate('PriceWatch', { initialTab: 'inbox' });
              } catch {}
            }
          }
        });

        const lastResp = await Notifications.getLastNotificationResponseAsync();
        if (lastResp && isMounted && navigationRef.current) {
          setTimeout(() => {
            try {
              navigationRef.current?.navigate('Main', {
                screen: 'PriceWatch',
                params: { initialTab: 'inbox' },
              });
            } catch {}
          }, 800);
        }
      } catch {
        // Ignored if expo-notifications is unavailable
      }
    })();

    return () => {
      isMounted = false;
      subResponse?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <NavigationContainer ref={navigationRef}>
            <AlertThresholdEvaluator />
            <OfflineQueueSync />
            <AppNavigator navigationRef={navigationRef} />
            <StatusBar style="auto" />
          </NavigationContainer>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
