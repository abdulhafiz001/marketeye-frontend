import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '@/constants/config';
import { getStoreState, setStoreState } from '@/store/useStore';

const TOKEN_KEY = 'marketeye_auth_token';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const fromStore = getStoreState().authToken;
  const stored = fromStore || (await AsyncStorage.getItem(TOKEN_KEY));
  if (stored) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${stored}`;
  }
  return config;
});

export async function persistToken(token: string | null) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setStoreState({ authToken: token });
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setStoreState({ authToken: null });
  }
}

export async function loadStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
