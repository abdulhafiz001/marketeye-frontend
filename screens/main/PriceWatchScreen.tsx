import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useStore, getStoreState, setStoreState } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { fetchProducts, fetchProductDetail } from '@/services/catalogApi';
import {
  createServerAlert,
  deleteServerAlert,
  fetchServerAlerts,
  updateServerAlert,
} from '@/services/alertsApi';
import {
  requestDeviceNotificationPermission,
  syncExpoPushTokenWithServer,
} from '@/services/deviceNotifications';
import type { Alert as PriceAlertRule, InboxNotification } from '@/types';

export default function PriceWatchScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'alerts' | 'inbox'>('alerts');

  const alerts = useStore((state) => state.alerts);
  const notifications = useStore((state) => state.notifications);
  const alertsEnabled = useStore((state) => state.alertsEnabled);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const setAlertsEnabled = useStore((state) => state.setAlertsEnabled);
  const toggleAlert = useStore((state) => state.toggleAlert);
  const removeAlert = useStore((state) => state.removeAlert);
  const markNotificationRead = useStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useStore((state) => state.markAllNotificationsRead);
  const removeNotification = useStore((state) => state.removeNotification);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Sync with backend alerts
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const serverAlerts = await fetchServerAlerts();
        setStoreState({ alerts: serverAlerts });
        await syncExpoPushTokenWithServer();
      } catch {
        // Keep local cache if sync fails.
      }
    })();
  }, [isAuthenticated]);

  // Modal State for adding alert
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('below');
  const [targetPrice, setTargetPrice] = useState('');

  const productsQ = useQuery({ queryKey: ['products'], queryFn: fetchProducts, staleTime: 5 * 60 * 1000 });
  const productDetailQ = useQuery({
    queryKey: ['product-detail', selectedProductId],
    queryFn: () => fetchProductDetail(selectedProductId as number),
    enabled: modalOpen && selectedProductId !== null && selectedProductId > 0,
  });

  const filteredProducts = useMemo(() => {
    const list = productsQ.data || [];
    const s = search.trim().toLowerCase();
    if (!s) return list.slice(0, 50);
    return list.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 50);
  }, [productsQ.data, search]);

  const selectedMarketRow = useMemo(() => {
    if (!selectedProductId || selectedMarketId === null || !productDetailQ.data?.markets) {
      return null;
    }
    return productDetailQ.data.markets.find((row) => row.market.id === selectedMarketId) ?? null;
  }, [selectedMarketId, selectedProductId, productDetailQ.data]);

  const estimatePrice = selectedMarketRow?.avg_price ?? null;

  const openModal = () => {
    setModalOpen(true);
    setSearch('');
    setSelectedProductId(null);
    setSelectedMarketId(null);
    setAlertCondition('below');
    setTargetPrice('');
  };

  const submitRule = async () => {
    const product =
      filteredProducts.find((p) => p.id === selectedProductId) ??
      productsQ.data?.find((p) => p.id === selectedProductId) ??
      null;
    const marketRow =
      productDetailQ.data?.markets.find((row) => row.market.id === selectedMarketId) ?? selectedMarketRow;
    if (!product || !marketRow || !targetPrice.trim() || Number.isNaN(parseFloat(targetPrice))) return;

    await requestDeviceNotificationPermission();
    await syncExpoPushTokenWithServer();

    try {
      if (isAuthenticated) {
        const created = await createServerAlert({
          product_id: product.id,
          market_id: marketRow.market.id,
          target_price: parseFloat(targetPrice),
          condition: alertCondition,
        });
        getStoreState().addAlert({
          ...created,
          lastKnownPrice: estimatePrice !== null ? estimatePrice : created.lastKnownPrice,
        });
      } else {
        getStoreState().addAlert({
          id: `rule:${product.id}:${marketRow.market.id}:${Date.now()}`,
          commodityId: String(product.id),
          commodityName: product.name,
          marketId: marketRow.market.id,
          marketName: marketRow.market.name,
          condition: alertCondition,
          targetPrice: parseFloat(targetPrice),
          isActive: true,
          createdAt: new Date().toISOString(),
          lastKnownPrice: estimatePrice !== null ? estimatePrice : undefined,
        });
      }
    } catch {
      getStoreState().addAlert({
        id: `rule:${product.id}:${marketRow.market.id}:${Date.now()}`,
        commodityId: String(product.id),
        commodityName: product.name,
        marketId: marketRow.market.id,
        marketName: marketRow.market.name,
        condition: alertCondition,
        targetPrice: parseFloat(targetPrice),
        isActive: true,
        createdAt: new Date().toISOString(),
        lastKnownPrice: estimatePrice !== null ? estimatePrice : undefined,
      });
    }
    setModalOpen(false);
  };

  const renderRule = (item: PriceAlertRule) => {
    const when =
      item.condition === 'below'
        ? `Target: falls below ₦${item.targetPrice.toLocaleString()}`
        : `Target: rises above ₦${item.targetPrice.toLocaleString()}`;
    const px =
      typeof item.lastKnownPrice === 'number' && Number.isFinite(item.lastKnownPrice)
        ? `Current Price: ₦${item.lastKnownPrice.toLocaleString()}`
        : 'Awaiting market update';

    return (
      <View key={item.id} style={[styles.ruleCard, !item.isActive && styles.ruleCardMuted]}>
        <View style={styles.ruleLeft}>
          <View style={styles.ruleIconWrap}>
            <MaterialCommunityIcons
              name={item.condition === 'below' ? 'trending-down' : 'trending-up'}
              size={24}
              color={item.condition === 'below' ? '#16A34A' : '#DC2626'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ruleProduct}>{item.commodityName}</Text>
            <Text style={styles.ruleMarket}>{item.marketName}</Text>
            <Text style={styles.ruleHint}>{when}</Text>
            <Text style={styles.rulePx}>{px}</Text>
          </View>
        </View>

        <View style={styles.ruleRight}>
          <Switch
            value={item.isActive}
            onValueChange={async () => {
              toggleAlert(item.id);
              if (isAuthenticated && /^\d+$/.test(item.id)) {
                try {
                  await updateServerAlert(item.id, { is_active: !item.isActive });
                } catch {
                  toggleAlert(item.id);
                }
              }
            }}
            trackColor={{ false: '#E5E7EB', true: Colors.primary.deepBlue }}
            thumbColor={'#FFF'}
          />
          <TouchableOpacity
            onPress={async () => {
              removeAlert(item.id);
              if (isAuthenticated && /^\d+$/.test(item.id)) {
                try {
                  await deleteServerAlert(item.id);
                } catch {
                  getStoreState().addAlert(item);
                }
              }
            }}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInboxItem = ({ item }: { item: InboxNotification }) => (
    <TouchableOpacity
      style={[styles.inboxCard, item.read ? styles.inboxCardRead : styles.inboxCardUnread]}
      activeOpacity={0.88}
      onPress={() => {
        if (!item.read) markNotificationRead(item.id);
      }}
    >
      <View style={[styles.strip, item.read ? styles.stripRead : styles.stripNew]} />
      <View style={styles.inboxInner}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.inboxText, item.read && styles.inboxTextMuted]}>{item.message}</Text>
          <Text style={styles.inboxTime}>
            {new Date(item.createdAt).toLocaleString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
        <TouchableOpacity hitSlop={10} onPress={() => removeNotification(item.id)}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const canSubmit = Boolean(selectedMarketRow && targetPrice.trim());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Price Watch & Alerts</Text>
          <Text style={styles.headerSubtitle}>Automated price notifications for Abuja markets</Text>
        </View>
        <TouchableOpacity style={styles.createAlertBtn} onPress={openModal} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
          <Text style={styles.createAlertText}>New Alert</Text>
        </TouchableOpacity>
      </View>

      {/* Global Push Switch Banner */}
      <View style={styles.pushBanner}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.pushTitle}>Push Notifications</Text>
          <Text style={styles.pushDesc}>Receive instant background alerts when prices match your targets.</Text>
        </View>
        <Switch
          value={alertsEnabled}
          onValueChange={setAlertsEnabled}
          trackColor={{ false: '#E5E7EB', true: Colors.primary.deepBlue }}
          thumbColor={'#FFF'}
        />
      </View>

      {/* Segmented Tab Controls */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'alerts' && styles.segmentTabActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <MaterialCommunityIcons
            name="bell-ring-outline"
            size={18}
            color={activeTab === 'alerts' ? Colors.primary.deepBlue : '#6B7280'}
          />
          <Text style={[styles.segmentText, activeTab === 'alerts' && styles.segmentTextActive]}>
            Active Targets ({alerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'inbox' && styles.segmentTabActive]}
          onPress={() => setActiveTab('inbox')}
        >
          <MaterialCommunityIcons
            name="inbox"
            size={18}
            color={activeTab === 'inbox' ? Colors.primary.deepBlue : '#6B7280'}
          />
          <Text style={[styles.segmentText, activeTab === 'inbox' && styles.segmentTextActive]}>
            Alert Inbox {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content View */}
      {activeTab === 'alerts' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {alerts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="bell-plus-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Active Price Targets</Text>
              <Text style={styles.emptyDesc}>
                Set target price alerts for products in your favorite Abuja markets. We will ping your phone the moment verified submissions hit your price.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openModal}>
                <Text style={styles.emptyBtnText}>Create Your First Alert</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 12 }}>{alerts.map((a) => renderRule(a))}</View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {notifications.length > 0 && unreadCount > 0 ? (
            <View style={styles.inboxActions}>
              <TouchableOpacity onPress={markAllNotificationsRead}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Your Inbox is Clear</Text>
              <Text style={styles.emptyDesc}>
                Triggered price drops, market swings, and community updates will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderInboxItem}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* New Alert Modal Sheet */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create Price Alert</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>1. Search Product</Text>
              <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="e.g. Rice, Garri, Palm Oil..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                />
              </View>

              {!selectedProductId ? (
                <View style={styles.productPicker}>
                  {filteredProducts.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.productOption}
                      onPress={() => {
                        setSelectedProductId(item.id);
                        setSelectedMarketId(null);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>{item.name}</Text>
                        <Text style={styles.productUnit}>{item.unit}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {selectedProductId ? (
                <View style={{ gap: 12 }}>
                  <TouchableOpacity style={styles.repickRow} onPress={() => setSelectedProductId(null)}>
                    <MaterialCommunityIcons name="arrow-left" size={18} color={Colors.primary.deepBlue} />
                    <Text style={styles.repickText}>Change product selection</Text>
                  </TouchableOpacity>

                  <Text style={styles.modalLabel}>2. Select Market Stall</Text>
                  {productDetailQ.isLoading ? (
                    <ActivityIndicator style={{ marginVertical: 12 }} />
                  ) : productDetailQ.data?.markets?.length ? (
                    <View style={styles.marketOptions}>
                      {productDetailQ.data.markets.map((item) => {
                        const isSelected = selectedMarketId === item.market.id;
                        return (
                          <TouchableOpacity
                            key={item.market.id}
                            style={[styles.marketCard, isSelected && styles.marketCardActive]}
                            onPress={() => setSelectedMarketId(item.market.id)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.marketName, isSelected && styles.marketNameActive]}>
                                {item.market.name}
                              </Text>
                              <Text style={styles.marketArea}>{item.market.area || 'Abuja'}</Text>
                            </View>
                            <Text style={[styles.marketPrice, isSelected && styles.marketPriceActive]}>
                              ₦{item.avg_price.toLocaleString()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.noMarkets}>No market data recorded yet for this item.</Text>
                  )}

                  {selectedMarketRow ? (
                    <>
                      <Text style={styles.modalLabel}>3. Trigger Condition</Text>
                      <View style={styles.conditionRow}>
                        <TouchableOpacity
                          style={[styles.conditionBtn, alertCondition === 'below' && styles.conditionBtnActive]}
                          onPress={() => setAlertCondition('below')}
                        >
                          <MaterialCommunityIcons
                            name="trending-down"
                            size={18}
                            color={alertCondition === 'below' ? '#FFF' : '#16A34A'}
                          />
                          <Text style={[styles.conditionText, alertCondition === 'below' && styles.conditionTextActive]}>
                            Price Drops Below
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.conditionBtn, alertCondition === 'above' && styles.conditionBtnActive]}
                          onPress={() => setAlertCondition('above')}
                        >
                          <MaterialCommunityIcons
                            name="trending-up"
                            size={18}
                            color={alertCondition === 'above' ? '#FFF' : '#DC2626'}
                          />
                          <Text style={[styles.conditionText, alertCondition === 'above' && styles.conditionTextActive]}>
                            Price Rises Above
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.modalLabel}>4. Target Price (₦)</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="e.g. 7500"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={targetPrice}
                        onChangeText={setTargetPrice}
                      />

                      <TouchableOpacity
                        style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
                        disabled={!canSubmit}
                        onPress={submitRule}
                      >
                        <Text style={styles.saveBtnText}>Save Price Alert</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { ...Typography.h2, fontSize: 22, color: Colors.primary.deepBlue, fontWeight: '900' },
  headerSubtitle: { color: '#64748B', fontSize: 13, marginTop: 2, fontWeight: '600' },
  createAlertBtn: {
    backgroundColor: Colors.primary.deepBlue,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createAlertText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  pushBanner: {
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pushTitle: { fontWeight: '800', fontSize: 14, color: '#1E3A8A' },
  pushDesc: { color: '#3B82F6', fontSize: 12, marginTop: 2, fontWeight: '600', lineHeight: 16 },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  segmentTextActive: { color: Colors.primary.deepBlue, fontWeight: '900' },
  scrollContent: { padding: Spacing.lg, paddingBottom: 120 },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  ruleCardMuted: { opacity: 0.6 },
  ruleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  ruleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleProduct: { fontWeight: '900', fontSize: 16, color: '#0F172A' },
  ruleMarket: { color: '#64748B', fontWeight: '700', fontSize: 12, marginTop: 2 },
  ruleHint: { color: Colors.primary.deepBlue, fontWeight: '700', fontSize: 13, marginTop: 4 },
  rulePx: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 2 },
  ruleRight: { alignItems: 'flex-end', gap: 10, marginLeft: 12 },
  deleteBtn: { padding: 4 },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  emptyDesc: { textAlign: 'center', color: '#64748B', lineHeight: 20, fontSize: 13, fontWeight: '500' },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  inboxActions: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    alignItems: 'flex-end',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  markAllText: { color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 13 },
  inboxCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inboxCardUnread: { borderColor: '#93C5FD', backgroundColor: '#F8FAFC' },
  inboxCardRead: { opacity: 0.85 },
  strip: { width: 5 },
  stripNew: { backgroundColor: Colors.primary.deepBlue },
  stripRead: { backgroundColor: '#CBD5E1' },
  inboxInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  inboxText: { fontWeight: '700', color: '#0F172A', fontSize: 14, lineHeight: 20 },
  inboxTextMuted: { color: '#64748B', fontWeight: '500' },
  inboxTime: { marginTop: 6, fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  modalLabel: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 12, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: '#0F172A', fontWeight: '600' },
  productPicker: { maxHeight: 200 },
  productOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  productName: { fontWeight: '800', fontSize: 14, color: '#0F172A' },
  productUnit: { fontSize: 12, color: '#64748B', marginTop: 2 },
  repickRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  repickText: { color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 13 },
  marketOptions: { gap: 8 },
  marketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  marketCardActive: { borderColor: Colors.primary.deepBlue, backgroundColor: '#EFF6FF' },
  marketName: { fontWeight: '800', fontSize: 14, color: '#1E293B' },
  marketNameActive: { color: Colors.primary.deepBlue },
  marketArea: { fontSize: 12, color: '#64748B', marginTop: 2 },
  marketPrice: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  marketPriceActive: { color: Colors.primary.deepBlue },
  noMarkets: { color: '#64748B', fontSize: 13, marginVertical: 8 },
  conditionRow: { flexDirection: 'row', gap: 10 },
  conditionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conditionBtnActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  conditionText: { fontWeight: '800', fontSize: 12, color: '#475569' },
  conditionTextActive: { color: '#FFF' },
  priceInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  saveBtn: {
    marginTop: 14,
    backgroundColor: Colors.primary.deepBlue,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#CBD5E1' },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
});
