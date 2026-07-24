/**
 * Sign Up Screen
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
import { googleLoginRequest, mapAuthUserToAppUser, registerRequest } from '@/services/authApi';
import { fetchMarketWatches } from '@/services/userApi';
import { isGoogleConfigured, useGoogleAuthRequest } from '@/services/googleAuth';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const setAuthenticated = useStore((state) => state.setAuthenticated);
  const setUser = useStore((state) => state.setUser);
  const setMarketWatchlist = useStore((state) => state.setMarketWatchlist);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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

  const handleSignUp = async () => {
    setError(null);
    if (!name?.trim() || !email?.trim() || !password) {
      setError('Please enter your name, email, and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await registerRequest({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      setUser(mapAuthUserToAppUser(res.user));
      setMarketWatchlist([]);
      setAuthenticated(true);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(' ')) ||
        e?.message ||
        'Could not create account. Check your internet and API URL (same Wi‑Fi as your computer).';
      setError(typeof msg === 'string' ? msg : 'Could not create account.');
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to start tracking prices
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={Colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.text.secondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={Colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.text.secondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={20}
                color={Colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor={Colors.text.secondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
              style={[
                styles.signUpButton,
                (!name?.trim() || !email?.trim() || !password || loading) && styles.signUpButtonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={!name?.trim() || !email?.trim() || !password || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? 'Creating account…' : 'Create Account'}
              </Text>
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

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                <Text style={styles.loginLink}>Sign In</Text>
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
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary.deepBlue,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  form: {
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    ...Typography.caption,
    fontWeight: '600',
    lineHeight: 20,
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
  signUpButton: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  signUpButtonDisabled: {
    backgroundColor: Colors.secondary.grayDark,
    opacity: 0.5,
  },
  signUpButtonText: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  loginText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  loginLink: {
    ...Typography.body,
    color: Colors.primary.deepBlue,
    fontWeight: '600',
  },
});

