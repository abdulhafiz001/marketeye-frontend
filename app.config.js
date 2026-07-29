const fs = require('fs');
const path = require('path');

const googleServicesPath = path.join(__dirname, 'google-services.json');
const hasGoogleServices = fs.existsSync(googleServicesPath);

/** Owner's EAS project. Collaborators override via EXPO_PUBLIC_EAS_PROJECT_ID. */
const OWNER_EAS_PROJECT_ID = '05f71ac9-5001-4077-b954-38187c2151cf';

/**
 * - unset → owner project id
 * - uuid → that project
 * - `new` / `-` → omit projectId so `eas init` can create a project on the logged-in account
 */
function resolveEasProjectId() {
  const fromEnv = (process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim();
  if (fromEnv === 'new' || fromEnv === '-') {
    return undefined;
  }
  if (fromEnv) {
    return fromEnv;
  }
  return OWNER_EAS_PROJECT_ID;
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
