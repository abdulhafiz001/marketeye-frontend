/**
 * Onboarding Screen 2: AI-Powered Forecasts
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
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function OnboardingScreen2() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="brain"
            size={120}
            color={Colors.primary.vibrantGreen}
          />
        </View>

        <Text style={styles.title}>AI-Powered Forecasts</Text>
        <Text style={styles.description}>
          Leverage advanced AI to predict price trends and make smarter buying
          decisions. Know when to buy and save money.
        </Text>

        <View style={styles.indicatorContainer}>
          <View style={styles.indicator} />
          <View style={[styles.indicator, styles.indicatorActive]} />
          <View style={styles.indicator} />
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
          style={styles.nextButton}
          onPress={() => navigation.navigate('Onboarding3' as never)}
        >
          <Text style={styles.nextText}>Next</Text>
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
    backgroundColor: '#E8F8F5',
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
  nextButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nextText: {
    ...Typography.body,
    color: Colors.primary.white,
    fontWeight: '600',
  },
});

