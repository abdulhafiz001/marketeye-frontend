/**
 * Email verification — 6-digit code sent after signup
 */

import React, { useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useStore, setStoreState } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { mapAuthUserToAppUser, resendVerificationRequest, verifyEmailRequest } from '@/services/authApi';
import { fetchMarketWatches } from '@/services/userApi';
import { normalizeEmail } from '@/utils/authValidation';

export default function VerifyEmailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const setAuthenticated = useStore((state) => state.setAuthenticated);
  const setUser = useStore((state) => state.setUser);
  const setMarketWatchlist = useStore((state) => state.setMarketWatchlist);

  const email = normalizeEmail(route.params?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>('We sent a 6-digit code to your email. It expires in 15 minutes.');

  const completeLogin = async (user: ReturnType<typeof mapAuthUserToAppUser>) => {
    queryClient.clear();
    setStoreState({ notifications: [], alerts: [] });
    setUser(user);
    try {
      setMarketWatchlist(await fetchMarketWatches());
    } catch {
      setMarketWatchlist([]);
    }
    setAuthenticated(true);
  };

  const handleVerify = async () => {
    if (code.trim().length !== 6 || !email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyEmailRequest(email, code.trim());
      await completeLogin(mapAuthUserToAppUser(res.user));
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.code?.[0] ||
        e?.response?.data?.message ||
        e?.message ||
        'Invalid code.';
      setError(typeof msg === 'string' ? msg : 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendVerificationRequest(email);
      setInfo(res?.message || 'A new 6-digit code has been sent to your email.');
      setCode('');
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.email?.[0] ||
        e?.response?.data?.message ||
        e?.message ||
        'Could not resend the code.';
      setError(typeof msg === 'string' ? msg : 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary.deepBlue} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="email-check-outline" size={56} color={Colors.primary.deepBlue} />
            </View>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.email}>{email || 'your email'}</Text>
            </Text>
          </View>

          {info ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{info}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="numeric" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor={Colors.text.secondary}
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (code.trim().length !== 6 || loading) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={code.trim().length !== 6 || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Checking…' : 'Verify email'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} disabled={resending || loading}>
            <Text style={styles.resend}>{resending ? 'Sending a new code…' : 'Resend code'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.white },
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  backButton: { marginTop: Spacing.md, marginBottom: Spacing.lg },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.secondary.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.h1, color: Colors.primary.deepBlue, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { ...Typography.body, color: Colors.text.secondary, textAlign: 'center', paddingHorizontal: Spacing.md },
  email: { color: Colors.primary.deepBlue, fontWeight: '700' },
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
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, ...Typography.body, color: Colors.text.primary, paddingVertical: Spacing.md, letterSpacing: 4 },
  button: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...Typography.body, color: Colors.primary.white, fontWeight: '700' },
  resend: { marginTop: Spacing.md, textAlign: 'center', color: Colors.primary.deepBlue, fontWeight: '700' },
  infoBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoText: { color: '#166534', fontWeight: '600' },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { color: '#B91C1C', fontWeight: '600' },
});
