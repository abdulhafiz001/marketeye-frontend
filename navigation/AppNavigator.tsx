/**
 * Main App Navigator
 * Handles navigation between Onboarding, Auth, and Main App
 */

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import OnboardingNavigator from './OnboardingNavigator';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import AdminWebViewScreen from '../screens/admin/AdminWebViewScreen';
import { Colors } from '../constants/colors';

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator color={Colors.primary.deepBlue} />
      </View>
    );
  }

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
