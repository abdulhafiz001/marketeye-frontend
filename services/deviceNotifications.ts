import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushTokens } from '@/services/alertsApi';

type NotificationsModule = typeof import('expo-notifications');

export const PRICE_ALERT_CHANNEL_ID = 'price-alerts';

let notificationsModule: NotificationsModule | null = null;
let handlerReady = false;
let channelReady = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  // Expo Go cannot receive remote FCM/Expo push on modern Android — use a dev build.
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
  }

  if (!handlerReady) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerReady = true;
  }

  if (!channelReady && Platform.OS === 'android') {
    await notificationsModule.setNotificationChannelAsync(PRICE_ALERT_CHANNEL_ID, {
      name: 'Price alerts',
      importance: notificationsModule.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E3A5F',
      sound: 'default',
    });
    channelReady = true;
  }

  return notificationsModule;
}

export async function requestDeviceNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return false;
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function showPriceDeviceNotification(title: string, body: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return;
  }

  const ok = await requestDeviceNotificationPermission();
  if (!ok) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: PRICE_ALERT_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

/**
 * Register FCM device token (preferred) + Expo push token with Laravel.
 * Requires google-services.json + a development/production build (not Expo Go).
 */
export async function syncExpoPushTokenWithServer(): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return null;
  }

  const ok = await requestDeviceNotificationPermission();
  if (!ok) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;

  let expoToken: string | null = null;
  let fcmToken: string | null = null;

  try {
    if (projectId) {
      const expo = await Notifications.getExpoPushTokenAsync({ projectId });
      expoToken = expo.data ?? null;
    }
  } catch (error) {
    console.warn('[MarketEye] Expo push token failed', error);
  }

  try {
    const device = await Notifications.getDevicePushTokenAsync();
    if (device?.data && typeof device.data === 'string') {
      fcmToken = device.data;
    }
  } catch (error) {
    console.warn('[MarketEye] FCM device token failed — is google-services.json in the build?', error);
  }

  if (!expoToken && !fcmToken) {
    return null;
  }

  try {
    await registerPushTokens({
      expo_push_token: expoToken,
      fcm_token: fcmToken,
    });
  } catch (error) {
    console.warn('[MarketEye] Failed to save push tokens to API', error);
  }

  return fcmToken || expoToken;
}

export function pushSupportedOnThisBuild(): boolean {
  return Constants.appOwnership !== 'expo' && Platform.OS !== 'web';
}
