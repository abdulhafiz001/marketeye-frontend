/**
 * Notification preferences — price alerts only (managed in Price Watch).
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import {
  requestDeviceNotificationPermission,
  syncExpoPushTokenWithServer,
} from '@/services/deviceNotifications';

export default function NotificationSettingsScreen() {
  const navigation = useNavigation<any>();
  const alertsEnabled = useStore((state) => state.alertsEnabled);
  const setAlertsEnabled = useStore((state) => state.setAlertsEnabled);

  const onTogglePriceAlerts = async (value: boolean) => {
    setAlertsEnabled(value);
    if (value) {
      await requestDeviceNotificationPermission();
      await syncExpoPushTokenWithServer();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Control how Market Eye notifies you. Target rules and stalls are set on the Price Watch tab.
        </Text>

        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="bell-ring-outline" size={22} color={Colors.primary.deepBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Price alerts</Text>
                <Text style={styles.settingDescription}>
                  Push notifications when a product hits your target price at a chosen Abuja market stall.
                </Text>
              </View>
            </View>
            <Switch
              value={alertsEnabled}
              onValueChange={onTogglePriceAlerts}
              trackColor={{ false: Colors.secondary.lightGray, true: Colors.primary.deepBlue }}
              thumbColor={Colors.primary.white}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.linkCard}
          activeOpacity={0.85}
          onPress={() => {
            const stack = navigation.getParent();
            const state = stack?.getState?.();
            if (state?.routeNames?.includes('PriceWatchMain')) {
              stack?.navigate('PriceWatchMain' as never);
              return;
            }
            stack?.getParent()?.navigate('PriceWatch' as never);
          }}
        >
          <MaterialCommunityIcons name="chart-line" size={24} color={Colors.primary.deepBlue} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.linkTitle}>Manage price watches</Text>
            <Text style={styles.linkSub}>Create, edit, or remove target alerts</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    gap: Spacing.md,
  },
  lead: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  section: {
    backgroundColor: Colors.primary.white,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.white,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.secondary.lightGray,
  },
  linkTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: Colors.primary.deepBlue,
  },
  linkSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
