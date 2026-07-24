/**
 * Main Tab Navigator
 * Dashboard, Markets, Compare, Leaderboard, Profile
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Colors } from '../constants/colors';
import AccountSettingsScreen from '../screens/main/AccountSettingsScreen';
import AlertsScreen from '../screens/main/AlertsScreen';
import CommodityDetailScreen from '../screens/main/CommodityDetailScreen';
import CompareScreen from '../screens/main/CompareScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import MarketDetailScreen from '../screens/main/MarketDetailScreen';
import MarketScreen from '../screens/main/MarketScreen';
import NotificationSettingsScreen from '../screens/main/NotificationSettingsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import HelpSupportScreen from '../screens/main/HelpSupportScreen';
import AboutAppScreen from '../screens/main/AboutAppScreen';
import SubmitPriceScreen from '../screens/main/SubmitPriceScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const HomeStackNav = createStackNavigator();

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeMain" component={DashboardScreen} />
      <HomeStackNav.Screen name="Alerts" component={AlertsScreen} />
      <HomeStackNav.Screen name="CommodityDetail" component={CommodityDetailScreen} />
      <HomeStackNav.Screen
        name="SubmitPrice"
        component={SubmitPriceScreen}
        options={{ presentation: 'modal' }}
      />
    </HomeStackNav.Navigator>
  );
}

function MarketStack() {
  return (
    <Stack.Navigator initialRouteName="MarketList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MarketList" component={MarketScreen} />
      <Stack.Screen name="MarketDetail" component={MarketDetailScreen} />
      <Stack.Screen
        name="CommodityDetail"
        component={CommodityDetailScreen}
        options={{
          title: 'Commodity Details',
          headerStyle: { backgroundColor: Colors.primary.deepBlue },
          headerTintColor: Colors.primary.white,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="SubmitPrice"
        component={SubmitPriceScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CommodityDetail" component={CommodityDetailScreen} />
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{
          title: 'Account Settings',
          headerStyle: { backgroundColor: Colors.primary.deepBlue },
          headerTintColor: Colors.primary.white,
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: 'Notification Settings',
          headerStyle: { backgroundColor: Colors.primary.deepBlue },
          headerTintColor: Colors.primary.white,
        }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AboutApp"
        component={AboutAppScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SubmitPrice"
        component={SubmitPriceScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary.deepBlue,
        tabBarInactiveTintColor: Colors.secondary.grayDark,
        tabBarStyle: {
          backgroundColor: Colors.primary.white,
          borderTopColor: Colors.primary.lightGray,
          paddingBottom: 20,
          paddingTop: 8,
          height: 72,
        },
        tabBarLabelStyle: {
          marginBottom: 4,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Markets"
        component={MarketStack}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const state = navigation.getState();
            const marketTab = state.routes.find((r) => r.name === 'Markets');
            if (marketTab?.state) {
              const marketStackState = marketTab.state;
              const currentIndex = marketStackState.index;
              if (currentIndex !== undefined && marketStackState.routes[currentIndex]) {
                const currentRoute = marketStackState.routes[currentIndex];
                if (currentRoute.name !== 'MarketList') {
                  e.preventDefault();
                  navigation.navigate('Markets', {
                    screen: 'MarketList',
                  });
                }
              }
            }
          },
        })}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'store' : 'store-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Compare"
        component={CompareScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'scale-balance' : 'scale-balance'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'trophy' : 'trophy-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'account' : 'account-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
