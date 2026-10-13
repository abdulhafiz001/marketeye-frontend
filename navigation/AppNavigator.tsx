/**
 * Main App Navigator
 * Handles navigation between Onboarding, Auth, and Main App
 */

import React, { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import OnboardingNavigator from './OnboardingNavigator';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import AdminWebViewScreen from '../screens/admin/AdminWebViewScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import { Colors } from '../constants/colors';
import {
  FULL_SCREEN_SAFE_EDGES,
  ScreenSafeArea,
  TAB_STACK_SAFE_EDGES,
  withScreenSafeArea,
} from './screenSafeArea';

const NotificationsSafe = withScreenSafeArea(NotificationsScreen, TAB_STACK_SAFE_EDGES);
const AdminLoginSafe = withScreenSafeArea(AdminLoginScreen, FULL_SCREEN_SAFE_EDGES);
const AdminWebViewSafe = withScreenSafeArea(AdminWebViewScreen, TAB_STACK_SAFE_EDGES);

const Stack = createStackNavigator();

export default function AppNavigator({ navigationRef }: { navigationRef: React.RefObject<any> }) {
  const hasCompletedOnboarding = useStore((state) => state.hasCompletedOnboarding);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const prefsHydrated = useStore((state) => state.prefsHydrated);

  const getInitialRoute = () => {
    if (!hasCompletedOnboarding) return 'Onboarding';
    if (!isAuthenticated) return 'Auth';
    return 'Main';
  };

  useEffect(() => {
    if (!prefsHydrated || !navigationRef?.current || !hasCompletedOnboarding) return;

    if (isAuthenticated) {
      navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    } else {
      navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Auth',
              state: {
                index: 0,
                routes: [{ name: 'Login' }],
              },
            },
          ],
        })
      );
    }
  }, [isAuthenticated, hasCompletedOnboarding, prefsHydrated, navigationRef]);

  if (!prefsHydrated) {
    return (
      <ScreenSafeArea edges={TAB_STACK_SAFE_EDGES} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary.deepBlue} />
      </ScreenSafeArea>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={getInitialRoute()}>
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="Notifications" component={NotificationsSafe} />
      <Stack.Screen
        name="AdminLogin"
        component={AdminLoginSafe}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="AdminWebView" component={AdminWebViewSafe} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
