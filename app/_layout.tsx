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
