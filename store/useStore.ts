/**
 * Zustand Store for NaijaPrice Pulse
 * Using vanilla store to avoid React Native devtools issues
 */

import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Commodity, Alert, MarketWatchItem, InboxNotification } from '@/types';

const PREFERENCES_KEY = 'market-eye.prefs.v1';
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(getState: () => AppState) {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const s = getState();
    AsyncStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        marketWatchlist: s.marketWatchlist,
        alerts: s.alerts,
        notifications: s.notifications,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
      })
    ).catch(() => {});
  }, 400);
}

interface AppState {
  // User
  user: User | null;
  isAuthenticated: boolean;
  authToken: string | null;
  hasCompletedOnboarding: boolean;
  prefsHydrated: boolean;
  
  // Commodities
  commodities: Commodity[];
  watchlist: string[]; // commodity IDs
  
  // Alerts & inbox
  alerts: Alert[];
  notifications: InboxNotification[];
  alertsEnabled: boolean;
  marketWatchlist: MarketWatchItem[];
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setAuthToken: (token: string | null) => void;
  completeOnboarding: () => void;
  addToWatchlist: (commodityId: string) => void;
  removeFromWatchlist: (commodityId: string) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (alertId: string) => void;
  toggleAlert: (alertId: string) => void;
  patchAlert: (alertId: string, partial: Partial<Alert>) => void;
  setAlertsEnabled: (enabled: boolean) => void;
  addNotification: (item: InboxNotification) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setMarketWatchlist: (items: MarketWatchItem[]) => void;
  addMarketWatch: (item: MarketWatchItem) => void;
  removeMarketWatch: (id: string) => void;
  updateMarketWatchPrice: (id: string, price: number | null) => void;
  getCommodityById: (id: string) => Commodity | undefined;
}

// Create a simple store implementation
const createSimpleStore = <T extends object>(initialState: T) => {
  let state = initialState;
  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState = (partial: Partial<T> | ((prev: T) => Partial<T>)) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener());
    schedulePersist(() => store.getState() as unknown as AppState);
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { getState, setState, subscribe };
};

// Create the store
const store: ReturnType<typeof createSimpleStore<AppState>> = createSimpleStore<AppState>({
  // Initial state
  user: null,
  isAuthenticated: false,
  authToken: null,
  hasCompletedOnboarding: false,
  prefsHydrated: false,
  commodities: [],
  watchlist: [],
  alerts: [],
  notifications: [],
  alertsEnabled: true,
  marketWatchlist: [],
  
  // Actions
  setUser: (user) => {
    store.setState({ user });
  },
  
  setAuthenticated: (value) => {
    store.setState({ isAuthenticated: value });
  },

  setAuthToken: (token) => {
    store.setState({ authToken: token });
  },
  
  completeOnboarding: () => {
    store.setState({ hasCompletedOnboarding: true });
  },
  
  addToWatchlist: (commodityId) => {
    const state = store.getState();
    if (!state.watchlist.includes(commodityId)) {
      store.setState({
        watchlist: [...state.watchlist, commodityId],
      });
    }
  },
  
  removeFromWatchlist: (commodityId: string) => {
    const state = store.getState();
    store.setState({
      watchlist: state.watchlist.filter((id: string) => id !== commodityId),
    });
  },
  
  addAlert: (alert: Alert) => {
    const state = store.getState();
    store.setState({
      alerts: [...state.alerts, alert],
    });
  },
  
  removeAlert: (alertId: string) => {
    const state = store.getState();
    store.setState({
      alerts: state.alerts.filter((alert: Alert) => alert.id !== alertId),
    });
  },
  
  toggleAlert: (alertId: string) => {
    const state = store.getState();
    store.setState({
      alerts: state.alerts.map((alert: Alert) =>
        alert.id === alertId ? { ...alert, isActive: !alert.isActive } : alert
      ),
    });
  },

  patchAlert: (alertId: string, partial: Partial<Alert>) => {
    const state = store.getState();
    store.setState({
      alerts: state.alerts.map((alert: Alert) =>
        alert.id === alertId ? { ...alert, ...partial } : alert
      ),
    });
  },
  
  setAlertsEnabled: (enabled) => {
    store.setState({ alertsEnabled: enabled });
  },

  addNotification: (item: InboxNotification) => {
    const state = store.getState();
    store.setState({ notifications: [item, ...state.notifications] });
  },

  removeNotification: (id: string) => {
    const state = store.getState();
    store.setState({ notifications: state.notifications.filter((n) => n.id !== id) });
  },

  markNotificationRead: (id: string) => {
    const state = store.getState();
    store.setState({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    });
  },

  markAllNotificationsRead: () => {
    const state = store.getState();
    store.setState({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    });
  },

  setMarketWatchlist: (items: MarketWatchItem[]) => {
    store.setState({ marketWatchlist: items });
  },

  addMarketWatch: (item: MarketWatchItem) => {
    const state = store.getState();
    if (state.marketWatchlist.some((watch) => watch.id === item.id)) {
      return;
    }
    store.setState({ marketWatchlist: [...state.marketWatchlist, item] });
  },

  removeMarketWatch: (id: string) => {
    const state = store.getState();
    store.setState({ marketWatchlist: state.marketWatchlist.filter((watch) => watch.id !== id) });
  },

  updateMarketWatchPrice: (id: string, price: number | null) => {
    const state = store.getState();
    store.setState({
      marketWatchlist: state.marketWatchlist.map((watch) =>
        watch.id === id ? { ...watch, lastPrice: price, lastCheckedAt: new Date().toISOString() } : watch
      ),
    });
  },
  
  getCommodityById: (id: string): Commodity | undefined => {
    return store.getState().commodities.find((c: Commodity) => c.id === id);
  },
});

// React hook using useSyncExternalStore
export const useStore = <T = AppState>(
  selector: (state: AppState) => T = (state) => state as unknown as T
): T => {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
};

// Export store methods for direct access
export const getStoreState = () => store.getState();
export const setStoreState = (partial: Partial<AppState>) => store.setState(partial);

export async function hydratePreferences(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      setStoreState({ prefsHydrated: true });
      return;
    }
    const p = JSON.parse(raw) as {
      marketWatchlist?: MarketWatchItem[];
      alerts?: Alert[];
      notifications?: InboxNotification[];
      hasCompletedOnboarding?: boolean;
    };
    setStoreState({
      marketWatchlist: Array.isArray(p.marketWatchlist) ? p.marketWatchlist : [],
      alerts: Array.isArray(p.alerts) ? p.alerts : [],
      notifications: Array.isArray(p.notifications) ? p.notifications : [],
      hasCompletedOnboarding: Boolean(p.hasCompletedOnboarding),
      prefsHydrated: true,
    });
  } catch {
    setStoreState({ prefsHydrated: true });
  }
}

