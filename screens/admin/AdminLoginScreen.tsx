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
import { useNavigation } from '@react-navigation/native';
import { loginRequest, mapAuthUserToAppUser } from '@/services/authApi';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function AdminLoginScreen() {
  const navigation = useNavigation();
  const setUser = useStore((s) => s.setUser);
  const setAuthenticated = useStore((s) => s.setAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginRequest(email.trim(), password);
      const role = res.user.role;
      if (role !== 'admin' && role !== 'moderator') {
        setError('This account is not authorized for admin access.');
        return;
      }
      setUser(mapAuthUserToAppUser(res.user));
      setAuthenticated(true);
      navigation.navigate('AdminWebView' as never);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.badge}>
            <MaterialCommunityIcons name="shield-lock" size={28} color="#F59E0B" />
            <Text style={styles.badgeText}>OFFICIAL</Text>
          </View>
          <Text style={styles.title}>Market Eye Admin</Text>
          <Text style={styles.subtitle}>Secure access for moderators and administrators.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#94A3B8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Work email"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#94A3B8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!email || !password || loading) && styles.buttonDisabled]}
            disabled={!email || !password || loading}
            onPress={onSubmit}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Continue'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back to app</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    marginBottom: Spacing.lg,
  },
  badgeText: { color: '#F59E0B', fontWeight: '800', letterSpacing: 1.2, fontSize: 12 },
  title: { ...Typography.h1, color: '#F8FAFC', marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: '#94A3B8', marginBottom: Spacing.xl },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  errorText: { color: '#FCA5A5', ...Typography.caption },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, color: '#F8FAFC', paddingVertical: Spacing.md, ...Typography.body },
  button: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#0B1220', ...Typography.body, fontWeight: '800' },
  back: { marginTop: Spacing.lg, alignItems: 'center' },
  backText: { color: '#94A3B8', ...Typography.caption },
});
