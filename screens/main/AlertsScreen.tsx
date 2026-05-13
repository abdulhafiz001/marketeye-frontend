import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  FlatList,
  Animated,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import type { InboxNotification } from '@/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AlertsScreen() {
  const navigation = useNavigation();
  const notifications = useStore((state) => state.notifications);
  const alertsEnabled = useStore((state) => state.alertsEnabled);
  const setAlertsEnabled = useStore((state) => state.setAlertsEnabled);
  const removeNotification = useStore((state) => state.removeNotification);
  const markNotificationRead = useStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useStore((state) => state.markAllNotificationsRead);

  const listOpacity = useRef(new Animated.Value(0)).current;
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    Animated.timing(listOpacity, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [listOpacity]);

  const renderItem = ({ item }: { item: InboxNotification }) => (
    <TouchableOpacity
      style={[styles.card, item.read ? styles.cardRead : styles.cardUnread]}
      activeOpacity={0.88}
      onPress={() => {
        if (!item.read) markNotificationRead(item.id);
      }}
    >
      <View style={[styles.strip, item.read ? styles.stripRead : styles.stripNew]} />
      <View style={styles.cardInner}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.cardText, item.read && styles.cardTextMuted]}>{item.message}</Text>
          <Text style={styles.time}>
            {new Date(item.createdAt).toLocaleString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
        <TouchableOpacity hitSlop={10} onPress={() => removeNotification(item.id)} style={styles.trashTap}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary.deepBlue} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Updates</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.length === 0
              ? 'Nothing new yet'
              : unread > 0
                ? `${unread} unread`
                : 'You’re caught up'}
          </Text>
        </View>

        <Switch
          value={alertsEnabled}
          onValueChange={setAlertsEnabled}
          trackColor={{ false: '#E5E7EB', true: Colors.primary.deepBlue }}
          thumbColor={'#FFF'}
          style={{ transform: [{ scale: 0.9 }] }}
        />
      </View>

      {notifications.length > 0 && unread > 0 ? (
        <View style={styles.banner}>
          <TouchableOpacity onPress={markAllNotificationsRead} style={styles.markAllWrap}>
            <Text style={styles.markAll}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={52} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>You’re all clear</Text>
          <Text style={styles.emptyDesc}>
            We’ll drop notes here when the prices you picked move, or when a watched item shifts a lot.
            Set alerts from your profile under Notifications.
          </Text>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => (navigation as any).navigate('Profile', { screen: 'NotificationSettings' })}
          >
            <Text style={styles.outlineBtnText}>Notifications in profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.FlatList
          style={{ opacity: listOpacity }}
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Typography.h2, fontSize: 21, fontWeight: '900', color: Colors.primary.deepBlue },
  headerSubtitle: { color: '#6B7280', fontSize: 13, marginTop: 4, fontWeight: '600' },
  banner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  markAllWrap: { alignSelf: 'flex-end' },
  markAll: { color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 14 },
  list: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUnread: { borderWidth: 1, borderColor: '#DBEAFE' },
  cardRead: { opacity: 0.92 },
  strip: { width: 6 },
  stripNew: { backgroundColor: Colors.primary.deepBlue },
  stripRead: { backgroundColor: '#E5E7EB' },
  cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  cardText: { fontWeight: '700', color: '#111827', fontSize: 15, lineHeight: 21 },
  cardTextMuted: { color: '#4B5563', fontWeight: '600' },
  time: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  trashTap: { paddingLeft: 4, paddingVertical: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, marginTop: 24 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: { ...Typography.h3, fontWeight: '900', color: '#111827', marginBottom: Spacing.xs },
  emptyDesc: { textAlign: 'center', color: '#6B7280', lineHeight: 22, fontWeight: '600' },
  outlineBtn: {
    marginTop: Spacing.xl,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary.deepBlue,
  },
  outlineBtnText: { color: Colors.primary.deepBlue, fontWeight: '900' },
});
