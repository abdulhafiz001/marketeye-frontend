import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

export function getGoogleClientIds() {
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, string | undefined>;
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || extra.googleWebClientId || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || extra.googleAndroidClientId || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || extra.googleIosClientId || '',
  };
}

export function useGoogleAuthRequest() {
  const ids = getGoogleClientIds();
  return Google.useIdTokenAuthRequest({
    clientId: ids.webClientId || undefined,
    webClientId: ids.webClientId || undefined,
    androidClientId: ids.androidClientId || ids.webClientId || undefined,
    iosClientId: ids.iosClientId || ids.webClientId || undefined,
  });
}

export function isGoogleConfigured() {
  const ids = getGoogleClientIds();
  return Boolean(ids.webClientId || ids.androidClientId || ids.iosClientId);
}
