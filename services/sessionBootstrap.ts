import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { loadStoredToken, persistToken } from '@/services/apiClient';
import { mapAuthUserToAppUser, meRequest } from '@/services/authApi';
import { fetchMarketWatches } from '@/services/userApi';
import { hydratePreferences, setStoreState } from '@/store/useStore';

export const REMEMBER_LOGIN_KEY = 'market-eye.remember-login.v1';
const INSTALL_STAMP_KEY = 'marketeye.install_stamp.v1';

async function currentInstallStamp(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      const installTime = await Application.getInstallationTimeAsync();
      if (installTime) {
        return `android:${installTime.getTime()}`;
      }
    }
    if (Platform.OS === 'ios') {
      const idfv = await Application.getIosIdForVendorAsync();
      if (idfv) {
        return `ios:${idfv}`;
      }
    }
  } catch {
    // Fall back to default local platform string
  }
  return `local:${Platform.OS}`;
}

/**
 * Android Auto Backup can restore AsyncStorage (including the auth token)
 * after uninstall + reinstall. Compare this install to the last one we saw
 * and wipe the session when it is a new install.
 */
export async function resetSessionIfNewInstall(): Promise<void> {
  const stamp = await currentInstallStamp();
  const stored = await AsyncStorage.getItem(INSTALL_STAMP_KEY);

  if (stored === stamp) {
    return;
  }

  if (!stored) {
    // First launch of this check on an existing install — keep the session.
    await AsyncStorage.setItem(INSTALL_STAMP_KEY, stamp);
    return;
  }

  await persistToken(null);
  await AsyncStorage.multiRemove([REMEMBER_LOGIN_KEY]);
  setStoreState({
    user: null,
    isAuthenticated: false,
    authToken: null,
  });
  await AsyncStorage.setItem(INSTALL_STAMP_KEY, stamp);
}

export async function bootstrapSession(): Promise<void> {
  try {
    await resetSessionIfNewInstall();
    await hydratePreferences();

    const token = await loadStoredToken();
    if (!token) {
      setStoreState({
        authToken: null,
        isAuthenticated: false,
        user: null,
        prefsHydrated: true,
      });
      return;
    }

    setStoreState({ authToken: token });

    try {
      const user = await meRequest();
      const nextState: Parameters<typeof setStoreState>[0] = {
        user: mapAuthUserToAppUser(user),
        isAuthenticated: true,
        authToken: token,
        prefsHydrated: true,
      };

      try {
        nextState.marketWatchlist = await fetchMarketWatches();
      } catch {
        // Keep locally saved watches if the account sync is unavailable.
      }

      setStoreState(nextState);
    } catch {
      await persistToken(null);
      setStoreState({
        user: null,
        isAuthenticated: false,
        authToken: null,
        prefsHydrated: true,
      });
    }
  } catch {
    setStoreState({
      user: null,
      isAuthenticated: false,
      authToken: null,
      prefsHydrated: true,
    });
  }
}
