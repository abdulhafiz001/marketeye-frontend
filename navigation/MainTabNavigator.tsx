/**
 * Main Tab Navigator (4 Modern Ergonomic Tabs)
 * 1. Dashboard (Abuja Market Pulse, KPIs, Ticker, Categories, Recent)
 * 2. Markets (Directory, Stall Views, Price Cards)
 * 3. PriceWatch (Active Target Alert Rules & Notification History)
 * 4. Basket (Multi-Item Shopping List Cost Optimizer & Arbitrage Compare)
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Colors } from '../constants/colors';

import AboutAppScreen from '../screens/main/AboutAppScreen';
import AccountSettingsScreen from '../screens/main/AccountSettingsScreen';
import BasketOptimizerScreen from '../screens/main/BasketOptimizerScreen';
import CommodityDetailScreen from '../screens/main/CommodityDetailScreen';
import CompareScreen from '../screens/main/CompareScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import HelpSupportScreen from '../screens/main/HelpSupportScreen';
import InsightsScreen from '../screens/main/InsightsScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import MarketDetailScreen from '../screens/main/MarketDetailScreen';
import MarketScreen from '../screens/main/MarketScreen';
import NotificationSettingsScreen from '../screens/main/NotificationSettingsScreen';
import PriceWatchScreen from '../screens/main/PriceWatchScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SubmitPriceScreen from '../screens/main/SubmitPriceScreen';

const Tab = createBottomTabNavigator();
const HomeStackNav = createStackNavigator();
const MarketStackNav = createStackNavigator();
const PriceWatchStackNav = createStackNavigator();
const BasketStackNav = createStackNavigator();
const ProfileStackNav = createStackNavigator();

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeMain" component={DashboardScreen} />
      <HomeStackNav.Screen name="CommodityDetail" component={CommodityDetailScreen} />
      <HomeStackNav.Screen name="Profile" component={ProfileStack} />
      <HomeStackNav.Screen name="PriceWatch" component={PriceWatchScreen} />
      <HomeStackNav.Screen name="Insights" component={InsightsScreen} />
      <HomeStackNav.Screen name="Leaderboard" component={LeaderboardScreen} />
      <HomeStackNav.Screen name="Compare" component={CompareScreen} />
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
    <MarketStackNav.Navigator initialRouteName="MarketList" screenOptions={{ headerShown: false }}>
      <MarketStackNav.Screen name="MarketList" component={MarketScreen} />
      <MarketStackNav.Screen name="MarketDetail" component={MarketDetailScreen} />
      <MarketStackNav.Screen
        name="CommodityDetail"
        component={CommodityDetailScreen}
        options={{
          title: 'Commodity Details',
          headerStyle: { backgroundColor: Colors.primary.deepBlue },
          headerTintColor: Colors.primary.white,
          headerShown: true,
        }}
      />
      <MarketStackNav.Screen
        name="SubmitPrice"
        component={SubmitPriceScreen}
        options={{ presentation: 'modal' }}
      />
    </MarketStackNav.Navigator>
  );
}

function PriceWatchStack() {
  return (
    <PriceWatchStackNav.Navigator screenOptions={{ headerShown: false }}>
      <PriceWatchStackNav.Screen name="PriceWatchMain" component={PriceWatchScreen} />
      <PriceWatchStackNav.Screen name="CommodityDetail" component={CommodityDetailScreen} />
      <PriceWatchStackNav.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <PriceWatchStackNav.Screen
        name="SubmitPrice"
        component={SubmitPriceScreen}
        options={{ presentation: 'modal' }}
      />
    </PriceWatchStackNav.Navigator>
  );
}

function BasketStack() {
  return (
    <BasketStackNav.Navigator screenOptions={{ headerShown: false }}>
      <BasketStackNav.Screen name="BasketMain" component={BasketOptimizerScreen} />
      <BasketStackNav.Screen name="Compare" component={CompareScreen} />
      <BasketStackNav.Screen name="MarketDetail" component={MarketDetailScreen} />
      <BasketStackNav.Screen name="CommodityDetail" component={CommodityDetailScreen} />
      <BasketStackNav.Screen
        name="SubmitPrice"
        component={SubmitPriceScreen}
        options={{ presentation: 'modal' }}
      />
    </BasketStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <ProfileStackNav.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
      <ProfileStackNav.Screen name="Insights" component={InsightsScreen} options={{ title: 'Market Insights' }} />
      <ProfileStackNav.Screen name="CommodityDetail" component={CommodityDetailScreen} />
      <ProfileStackNav.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{
          title: 'Account Settings',
          headerStyle: { backgroundColor: Colors.primary.deepBlue },
          headerTintColor: Colors.primary.white,
        }}
      />
      <ProfileStackNav.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: 'Notification Settings',
          headerStyle: { backgroundColor: Colors.primary.deepBlue },
          headerTintColor: Colors.primary.white,
        }}
      />
      <ProfileStackNav.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="AboutApp"
        component={AboutAppScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="SubmitPrice"
        component={SubmitPriceScreen}
        options={{ presentation: 'modal' }}
      />
    </ProfileStackNav.Navigator>
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
          fontWeight: '700',
          fontSize: 11,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
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
        listeners={({ navigation }) => ({
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
          tabBarLabel: 'Markets',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'store' : 'store-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="PriceWatch"
        component={PriceWatchStack}
        options={{
          tabBarLabel: 'Price Watch',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'bell-ring' : 'bell-ring-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Basket"
        component={BasketStack}
        options={{
          tabBarLabel: 'Smart Basket',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'cart' : 'cart-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
