import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '@/constants/colors';

/**
 * Gate screen before the secret admin WebView.
 * Admins authenticate on the web panel (/admin) — separate from mobile app users.
 */
export default function AdminLoginScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="shield-lock" size={28} color="#F59E0B" />
          <Text style={styles.badgeText}>OFFICIAL</Text>
        </View>
        <Text style={styles.title}>Market Eye Admin</Text>
        <Text style={styles.subtitle}>
          Admin accounts are separate from app users. Sign in on the secure web panel.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AdminWebView')}
        >
          <Text style={styles.buttonText}>Open admin panel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back to app</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  inner: { flex: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
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
  button: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#0B1220', ...Typography.body, fontWeight: '800' },
  back: { marginTop: Spacing.lg, alignItems: 'center' },
  backText: { color: '#94A3B8', ...Typography.caption },
});
