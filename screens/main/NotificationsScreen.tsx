import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useStore, getStoreState } from '@/store/useStore';
import { Colors, Spacing } from '@/constants/colors';
import { acknowledgeServerAlert } from '@/services/alertsApi';
import type { InboxNotification } from '@/types';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();

  const notifications = useStore((state) => state.notifications);
  const markNotificationRead = useStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useStore((state) => state.markAllNotificationsRead);
  const acknowledgeNotification = useStore((state) => state.acknowledgeNotification);
  const acknowledgeAlert = useStore((state) => state.acknowledgeAlert);
  const removeNotification = useStore((state) => state.removeNotification);
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleGotIt = async (item: InboxNotification) => {
    acknowledgeNotification(item.id);
    if (item.alertId) {
      acknowledgeAlert(item.alertId);
      if (isAuthenticated && /^\d+$/.test(item.alertId)) {
        try {
          await acknowledgeServerAlert(item.alertId);
        } catch {
          // Keep local state acknowledged
        }
      }
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('HomeMain');
    }
  };

  const renderItem = ({ item }: { item: InboxNotification }) => {
    const isAcknowledged = item.acknowledged || (item.read && !item.alertId);

    return (
      <View style={[styles.inboxCard, item.read ? styles.inboxCardRead : styles.inboxCardUnread]}>
        <View style={[styles.strip, item.read ? styles.stripRead : styles.stripNew]} />
        <View style={styles.inboxInner}>
          <TouchableOpacity
            style={{ flex: 1, paddingRight: 8 }}
            activeOpacity={0.88}
            onPress={() => {
              if (!item.read) markNotificationRead(item.id);
            }}
          >
            <View style={styles.inboxHeaderRow}>
              <View style={styles.tagWrap}>
                <MaterialCommunityIcons name="bell-ring-outline" size={13} color={Colors.primary.deepBlue} />
                <Text style={styles.inboxCategoryTag}>Price Target Alert</Text>
              </View>
              <Text style={styles.inboxTime}>
                {new Date(item.createdAt).toLocaleString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>

            <Text style={[styles.inboxText, item.read && styles.inboxTextMuted]}>{item.message}</Text>

            <View style={styles.inboxActionRow}>
              {!isAcknowledged ? (
                <TouchableOpacity
                  style={styles.gotItBtn}
                  onPress={() => handleGotIt(item)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.gotItBtnText}>Got it · Mute repeats</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.acknowledgedBadge}>
                  <MaterialCommunityIcons name="check" size={13} color="#059669" />
                  <Text style={styles.acknowledgedText}>Acknowledged</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity hitSlop={10} onPress={() => removeNotification(item.id)} style={styles.trashBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary.deepBlue} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </Text>
        </View>
        {notifications.length > 0 && unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllNotificationsRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List / Empty State */}
      {notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={48} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Notifications Yet</Text>
          <Text style={styles.emptyDesc}>
            When prices drop to your target prices or major Abuja market updates occur, you will receive notifications here.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate('PriceWatch')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="bell-plus-outline" size={18} color="#FFF" />
            <Text style={styles.exploreBtnText}>Go to Price Watch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  markAllText: {
    color: Colors.primary.deepBlue,
    fontWeight: '800',
    fontSize: 12,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  inboxCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inboxCardUnread: {
    borderColor: '#93C5FD',
    backgroundColor: '#F0F7FF',
  },
  inboxCardRead: {
    opacity: 0.9,
  },
  strip: {
    width: 5,
  },
  stripNew: {
    backgroundColor: Colors.primary.deepBlue,
  },
  stripRead: {
    backgroundColor: '#CBD5E1',
  },
  inboxInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  inboxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inboxCategoryTag: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary.deepBlue,
  },
  inboxText: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
  },
  inboxTextMuted: {
    color: '#64748B',
    fontWeight: '500',
  },
  inboxTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  inboxActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  gotItBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: Colors.primary.deepBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  gotItBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  acknowledgedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  acknowledgedText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 11,
  },
  trashBtn: {
    padding: 6,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
    gap: 14,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1E293B',
  },
  emptyDesc: {
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 290,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  exploreBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
