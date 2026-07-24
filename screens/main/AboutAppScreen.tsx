import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function AboutAppScreen() {
  const navigation = useNavigation();
  const version =
    Constants.expoConfig?.version ||
    (Constants as any).nativeAppVersion ||
    '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.primary.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.title}>About App</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <MaterialCommunityIcons name="eye-outline" size={40} color={Colors.primary.deepBlue} />
          <Text style={styles.brand}>Market Eye</Text>
          <Text style={styles.version}>Version {version}</Text>
        </View>

        <Text style={styles.p}>
          Market Eye is a crowd-sourced live market price app for Abuja. Check prices before you visit a
          market, compare stalls, watch products, and earn ₦1 wallet credit for every verified submission.
        </Text>
        <Text style={styles.p}>
          Built for shoppers, traders, and researchers who want honest, timely food price data — not
          guesswork at the stall.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h2, color: '#111827', fontSize: 22, flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  hero: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  brand: { ...Typography.h1, color: Colors.primary.deepBlue, marginTop: Spacing.sm },
  version: { color: '#9CA3AF', marginTop: 4, fontWeight: '600' },
  p: { color: '#4B5563', lineHeight: 22, marginBottom: Spacing.md },
});
