import Constants from 'expo-constants';

/**
 * Laravel JSON API lives under `/api/v1`. If `.env` only has `http://IP:8000`,
 * axios was calling `http://IP:8000/auth/register` → **404**. This always ends with `/api/v1`.
 */
export function normalizeApiBaseUrl(raw: string): string {
  const base = raw.trim().replace(/\/+$/, '');
  if (!base) {
    return 'http://127.0.0.1:8000/api/v1';
  }
  if (/\/api\/v1$/i.test(base)) {
    return base;
  }
  if (/\/api$/i.test(base)) {
    return `${base}/v1`;
  }
  return `${base}/api/v1`;
}

function normalizeAdminPanelUrl(explicit: string | undefined, apiBase: string): string {
  if (explicit?.trim()) {
    let u = explicit.trim().replace(/\/+$/, '');
    if (/\/admin$/i.test(u)) {
      return u;
    }
    return `${u}/admin`;
  }
  const root = apiBase.replace(/\/api\/v1$/i, '');
  return `${root}/admin`;
}

/**
 * Set EXPO_PUBLIC_API_URL in `.env` (restart Expo after changes).
 * Host-only is OK: `http://192.168.1.10:8000` → normalized to `.../api/v1`.
 */
const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || extra?.apiUrl || 'http://127.0.0.1:8000';

export const API_BASE_URL = normalizeApiBaseUrl(rawApiUrl);

export const ADMIN_PANEL_URL = normalizeAdminPanelUrl(
  process.env.EXPO_PUBLIC_ADMIN_PANEL_URL,
  API_BASE_URL
);

if (__DEV__) {
  console.log('[Market Eye] API_BASE_URL =', API_BASE_URL);
}
