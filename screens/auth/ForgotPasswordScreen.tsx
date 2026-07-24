/**
 * Forgot Password Screen — email → 6-digit OTP → new password
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '@/constants/colors';
import {
  forgotPasswordRequest,
  resetPasswordRequest,
  verifyResetCodeRequest,
} from '@/services/authApi';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const secretTapRef = useRef({ count: 0, lastTs: 0 });

  const onSecretIconPress = () => {
    const now = Date.now();
    if (now - secretTapRef.current.lastTs > 2500) {
      secretTapRef.current.count = 0;
    }
    secretTapRef.current.lastTs = now;
    secretTapRef.current.count += 1;
    if (secretTapRef.current.count >= 8) {
      secretTapRef.current.count = 0;
      // Climb out of Auth stack to the root App stack.
      let root = navigation;
      while (root.getParent?.()) {
        root = root.getParent();
      }
      root.dispatch(CommonActions.navigate({ name: 'AdminWebView' }));
    }
  };

  const sendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await forgotPasswordRequest(email.trim().toLowerCase());
      setStep('otp');
      Alert.alert(
        'Check your email',
        res?.message || 'A 6-digit code has been sent. It expires in 15 minutes.'
      );
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.email?.[0] ||
        e?.response?.data?.message ||
        e?.message ||
        'Could not send code.';
      setError(typeof msg === 'string' ? msg : 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await verifyResetCodeRequest(email.trim().toLowerCase(), code.trim());
      setStep('password');
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.code?.[0] ||
        e?.response?.data?.message ||
        e?.message ||
        'Invalid code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (password.length < 8 || password !== passwordConfirmation) {
      setError(password !== passwordConfirmation ? 'Passwords do not match.' : 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPasswordRequest(email.trim().toLowerCase(), code.trim(), password, passwordConfirmation);
      Alert.alert('Password updated', 'You can sign in with your new password.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary.deepBlue} />
          </TouchableOpacity>

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.iconContainer}
              activeOpacity={0.85}
              onPress={onSecretIconPress}
              accessibilityLabel="Reset icon"
            >
              <MaterialCommunityIcons name="lock-reset" size={60} color={Colors.primary.deepBlue} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {step === 'email' ? 'Forgot Password?' : step === 'otp' ? 'Enter code' : 'New password'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Enter your email and we will send a 6-digit reset code.'
                : step === 'otp'
                  ? 'Type the 6-digit code from your email. It expires in 15 minutes.'
                  : 'Choose a new password for your Market Eye account.'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {step === 'email' ? (
              <>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="email-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
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
                <TouchableOpacity
                  style={[styles.button, (!email.trim() || loading) && styles.buttonDisabled]}
                  onPress={sendCode}
                  disabled={!email.trim() || loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send code'}</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {step === 'otp' ? (
              <>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="numeric" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit code"
                    placeholderTextColor={Colors.text.secondary}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, (code.trim().length !== 6 || loading) && styles.buttonDisabled]}
                  onPress={verifyCode}
                  disabled={code.trim().length !== 6 || loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Checking…' : 'Verify code'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={sendCode} disabled={loading}>
                  <Text style={styles.resend}>Resend code</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {step === 'password' ? (
              <>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={Colors.text.secondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={Colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="lock-check-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.text.secondary}
                    value={passwordConfirmation}
                    onChangeText={setPasswordConfirmation}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={10}>
                    <MaterialCommunityIcons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={Colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={resetPassword}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Reset password'}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
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
  form: { flex: 1 },
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
  input: { flex: 1, ...Typography.body, color: Colors.text.primary, paddingVertical: Spacing.md },
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
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { color: '#B91C1C', fontWeight: '600' },
});
