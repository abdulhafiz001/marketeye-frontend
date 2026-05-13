import Constants from 'expo-constants';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
let handlerReady = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  // Expo Go on Android no longer supports expo-notifications native push APIs.
  // Keep the app usable there; device notifications work in dev/prod builds.
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
    },
    trigger: null,
  });
}
