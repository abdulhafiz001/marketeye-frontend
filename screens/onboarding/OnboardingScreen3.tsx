/**
 * Onboarding Screen 3: Save Money
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function OnboardingScreen3() {
  const navigation = useNavigation();
  const completeOnboarding = useStore((state) => state.completeOnboarding);

  const handleGetStarted = () => {
    completeOnboarding();
    navigation.navigate('Auth' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="wallet"
            size={120}
            color={Colors.primary.sunriseOrange}
          />
        </View>

        <Text style={styles.title}>Save Money</Text>
        <Text style={styles.description}>
          Set price alerts and get notified when prices drop. Make informed
          decisions and maximize your savings on every purchase.
        </Text>

        <View style={styles.indicatorContainer}>
          <View style={styles.indicator} />
          <View style={styles.indicator} />
          <View style={[styles.indicator, styles.indicatorActive]} />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color={Colors.primary.deepBlue}
          />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={Colors.primary.white}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFF4F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary.deepBlue,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  indicatorContainer: {
    flexDirection: 'row',
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary.lightGray,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: Colors.primary.deepBlue,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backText: {
    ...Typography.body,
    color: Colors.primary.deepBlue,
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.vibrantGreen,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  getStartedText: {
    ...Typography.body,
    color: Colors.primary.white,
    fontWeight: '600',
  },
});

