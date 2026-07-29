const fs = require('fs');
const path = require('path');

/**
 * eas-cli does NOT load `.env` by itself. Without this, EXPO_PUBLIC_* is empty
 * during `eas credentials` / `eas build` and the owner projectId always wins.
 */
function loadDotEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Do not override vars already set in the shell.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile();

const googleServicesPath = path.join(__dirname, 'google-services.json');
const hasGoogleServices = fs.existsSync(googleServicesPath);

/**
 * EAS project id comes ONLY from `.env` → EXPO_PUBLIC_EAS_PROJECT_ID.
 * No hardcoded owner id in git (that blocked collaborators with "Entity not authorized").
 *
 * - unset / `new` / `-` → omit projectId → run `npx eas-cli init` to create your own
 * - uuid → use that Expo project
 */
function resolveEasProjectId() {
  const fromEnv = (process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim();
  if (!fromEnv || fromEnv === 'new' || fromEnv === '-') {
    return undefined;
  }
  return fromEnv;
}

const easProjectId = resolveEasProjectId();

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'Market Eye',
  slug: 'market-eye',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/naija-price-img.png',
  scheme: 'marketeye',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.marketeye.app',
  },
  android: {
    package: 'com.marketeye.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/naija-price-img.png',
      backgroundImage: './assets/images/naija-price-img.png',
      monochromeImage: './assets/images/naija-price-img.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
    ],
    // Required for FCM on Android — place google-services.json from Firebase here.
    ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
  },
  web: {
    output: 'static',
    favicon: './assets/images/naija-price-img.png',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/images/naija-price-img.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Market Eye uses your location to estimate distance to markets when comparing prices.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#1E3A5F',
        defaultChannel: 'price-alerts',
        // Android notification icon should be white-on-transparent 96x96 when you add one.
        // icon: './assets/images/notification-icon.png',
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    ...(easProjectId
      ? {
          eas: {
            projectId: easProjectId,
          },
        }
      : {}),
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

module.exports = { expo: config };
