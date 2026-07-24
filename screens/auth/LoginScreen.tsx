/**
 * Login Screen
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { loginRequest, mapAuthUserToAppUser, googleLoginRequest } from '@/services/authApi';
import { fetchMarketWatches } from '@/services/userApi';
import { isGoogleConfigured, useGoogleAuthRequest } from '@/services/googleAuth';

export default function LoginScreen() {
  const navigation = useNavigation();
  const setAuthenticated = useStore((state) => state.setAuthenticated);
  const setUser = useStore((state) => state.setUser);
  const setMarketWatchlist = useStore((state) => state.setMarketWatchlist);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleReady = isGoogleConfigured();
  const [googleRequest, googleResponse, promptGoogle] = useGoogleAuthRequest();

  useEffect(() => {
    const run = async () => {
      const idToken = googleResponse?.type === 'success' ? googleResponse.params?.id_token : null;
      if (!idToken) return;
      setLoading(true);
      setError(null);
      try {
        const res = await googleLoginRequest(idToken);
        setUser(mapAuthUserToAppUser(res.user));
        try {
          setMarketWatchlist(await fetchMarketWatches());
        } catch {
          setMarketWatchlist([]);
        }
        setAuthenticated(true);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Google sign-in failed.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [googleResponse]);

  const handleLogin = async () => {
    if (!login.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loginRequest(login.trim(), password);
      setUser(mapAuthUserToAppUser(res.user));
      try {
        setMarketWatchlist(await fetchMarketWatches());
      } catch {
        setMarketWatchlist([]);
      }
      setAuthenticated(true);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(' ')) ||
        e?.message ||
        'Could not sign in. Please check your connection and try again.';
      setError(typeof msg === 'string' ? msg : 'Could not sign in. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>💰</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to Market Eye</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={Colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email or Phone"
                placeholderTextColor={Colors.text.secondary}
                value={login}
                onChangeText={setLogin}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={Colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.text.secondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword' as never)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, (!login.trim() || !password || loading) && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={!login.trim() || !password || loading}
            >
              <Text style={styles.loginButtonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.socialButton, (!googleReady || !googleRequest || loading) && { opacity: 0.5 }]}
              disabled={!googleReady || !googleRequest || loading}
              onPress={() => promptGoogle()}
            >
              <MaterialCommunityIcons
                name="google"
                size={20}
                color={Colors.text.primary}
              />
              <Text style={styles.socialButtonText}>
                {googleReady ? 'Continue with Google' : 'Google (set client ID in .env)'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp' as never)}
              >
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary.deepBlue,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary.grayLight,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary.lightGray,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    paddingVertical: Spacing.md,
  },
  eyeIcon: {
    padding: Spacing.xs,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    ...Typography.caption,
    color: Colors.primary.deepBlue,
  },
  loginButton: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.secondary.grayDark,
    opacity: 0.5,
  },
  loginButtonText: {
    ...Typography.body,
    color: Colors.primary.white,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.secondary.lightGray,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginHorizontal: Spacing.md,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.white,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary.lightGray,
    gap: Spacing.sm,
  },
  socialButtonText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  signUpText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  signUpLink: {
    ...Typography.body,
    color: Colors.primary.deepBlue,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  errorText: { color: '#B91C1C', ...Typography.caption, fontWeight: '700' },
});

