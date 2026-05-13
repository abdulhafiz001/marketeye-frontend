/**
 * Main App Navigator
 * Handles navigation between Onboarding, Auth, and Main App
 */

import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import OnboardingNavigator from './OnboardingNavigator';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import AdminWebViewScreen from '../screens/admin/AdminWebViewScreen';

const Stack = createStackNavigator();

export default function AppNavigator({ navigationRef }: { navigationRef: React.RefObject<any> }) {
  const hasCompletedOnboarding = useStore((state) => state.hasCompletedOnboarding);
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  // Determine initial route based on state
  const getInitialRoute = () => {
    if (!hasCompletedOnboarding) return 'Onboarding';
    if (!isAuthenticated) return 'Auth';
    return 'Main';
  };

  // Navigate when auth state changes
  useEffect(() => {
    if (navigationRef?.current && hasCompletedOnboarding) {
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
            routes: [{ name: 'Auth' }],
          })
        );
      }
    }
  }, [isAuthenticated, hasCompletedOnboarding, navigationRef]);

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={getInitialRoute()}
    >
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen
        name="AdminLogin"
        component={AdminLoginScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="AdminWebView"
        component={AdminWebViewScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

