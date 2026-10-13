import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useStore, getStoreState, setStoreState } from '@/store/useStore';
import { Colors, Spacing } from '@/constants/colors';
import { fetchProducts, fetchProductDetail } from '@/services/catalogApi';
import {
  createServerAlert,
  deleteServerAlert,
  fetchServerAlerts,
  updateServerAlert,
} from '@/services/alertsApi';
import type { Alert as PriceAlertRule } from '@/types';

export default function PriceWatchScreen() {
  const navigation = useNavigation<any>();

  const alerts = useStore((state) => state.alerts);
  const notifications = useStore((state) => state.notifications);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const toggleAlert = useStore((state) => state.toggleAlert);
  const removeAlert = useStore((state) => state.removeAlert);
  const patchAlert = useStore((state) => state.patchAlert);

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  // Sync with backend alerts
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const serverAlerts = await fetchServerAlerts();
        const currentLocal = getStoreState().alerts;
        const merged = serverAlerts.map((sa) => {
          const local = currentLocal.find((la) => la.id === sa.id);
          if (!local) return sa;

          let latestTriggered = sa.lastTriggeredAt;
          if (local.lastTriggeredAt) {
            if (!sa.lastTriggeredAt || new Date(local.lastTriggeredAt).getTime() > new Date(sa.lastTriggeredAt).getTime()) {
              latestTriggered = local.lastTriggeredAt;
            }
          }
          return {
            ...sa,
            lastTriggeredAt: latestTriggered,
            lastKnownPrice: sa.lastKnownPrice ?? local.lastKnownPrice,
          };
        });
        setStoreState({ alerts: merged });
      } catch {
        // Keep local cache if sync fails.
      }
    })();
  }, [isAuthenticated]);

  // Modal State for adding alert
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PriceAlertRule | null>(null);
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
    return productDetailQ.data.markets.find((m) => m.market.id === selectedMarketId) ?? null;
  }, [selectedProductId, selectedMarketId, productDetailQ.data]);

  const estimatePrice = selectedMarketRow ? selectedMarketRow.avg_price : null;

  const resetModalFields = () => {
    setSelectedProductId(null);
    setSelectedMarketId(null);
    setSearch('');
    setTargetPrice('');
    setAlertCondition('below');
    setEditingAlertId(null);
  };

  const openModal = () => {
    resetModalFields();
    setModalOpen(true);
  };

  const openEditModal = (item: PriceAlertRule) => {
    const productId = Number(item.commodityId);
    if (!Number.isFinite(productId)) return;
    setEditingAlertId(item.id);
    setSelectedProductId(productId);
    setSelectedMarketId(item.marketId ?? null);
    setSearch(item.commodityName);
    setAlertCondition(item.condition);
    setTargetPrice(String(item.targetPrice));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetModalFields();
  };

  const handleSaveAlert = async () => {
    if (!selectedProductId || !selectedMarketRow) return;
    const priceNum = parseFloat(targetPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(priceNum) || priceNum <= 0) return;

    const prod = productsQ.data?.find((p) => p.id === selectedProductId);
    const prodName = prod?.name || 'Item';
    const marketName = selectedMarketRow.market.name;

    if (editingAlertId) {
      patchAlert(editingAlertId, {
        commodityId: String(selectedProductId),
        commodityName: prodName,
        marketId: selectedMarketRow.market.id,
        marketName,
        condition: alertCondition,
        targetPrice: priceNum,
        lastKnownPrice: estimatePrice ?? undefined,
      });
      closeModal();

      if (isAuthenticated && /^\d+$/.test(editingAlertId)) {
        try {
          const updated = await updateServerAlert(editingAlertId, {
            target_price: priceNum,
            condition: alertCondition,
          });
          patchAlert(editingAlertId, updated);
        } catch {
          Alert.alert('Update failed', 'Could not save changes. Try again.');
        }
      }
      return;
    }

    const localId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newRule: PriceAlertRule = {
      id: localId,
      commodityId: String(selectedProductId),
      commodityName: prodName,
      condition: alertCondition,
      targetPrice: priceNum,
      isActive: true,
      createdAt: new Date().toISOString(),
      marketId: selectedMarketRow.market.id,
      marketName: marketName,
      lastKnownPrice: estimatePrice ?? undefined,
    };

    getStoreState().addAlert(newRule);
    closeModal();

    if (isAuthenticated) {
      try {
        const created = await createServerAlert({
          product_id: selectedProductId,
          market_id: selectedMarketRow.market.id,
          condition: alertCondition,
          target_price: priceNum,
        });
        const currentAlerts = getStoreState().alerts;
        const updated = currentAlerts.map((a) => (a.id === localId ? { ...a, id: created.id } : a));
        setStoreState({ alerts: updated });
      } catch {
        // Keep optimistic local alert
      }
    }
  };

  const confirmDeleteAlert = (item: PriceAlertRule) => {
    setDeleteTarget(item);
  };

  const performDeleteAlert = async () => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);
    removeAlert(item.id);
    if (isAuthenticated && /^\d+$/.test(item.id)) {
      try {
        await deleteServerAlert(item.id);
      } catch {
        getStoreState().addAlert(item);
        Alert.alert('Delete failed', 'Could not remove this alert. Try again.');
      }
    }
  };

  const renderRule = (item: PriceAlertRule) => {
    const isBelow = item.condition === 'below';
    const conditionText = isBelow ? 'Drops below' : 'Rises above';

    return (
      <View key={item.id} style={[styles.ruleCard, !item.isActive && styles.ruleCardInactive]}>
        <View style={styles.ruleIconWrap}>
          <MaterialCommunityIcons
            name={isBelow ? 'trending-down' : 'trending-up'}
            size={22}
            color={isBelow ? '#16A34A' : '#DC2626'}
          />
        </View>

        <View style={styles.ruleBody}>
          <Text style={styles.ruleTitle}>{item.commodityName}</Text>
          <Text style={styles.ruleMarket}>{item.marketName || 'All Markets'}</Text>

          <View style={styles.ruleDetails}>
            <Text style={styles.ruleCond}>{conditionText}</Text>
            <Text style={styles.rulePrice}>₦{item.targetPrice.toLocaleString()}</Text>
          </View>

          {item.lastKnownPrice ? (
            <Text style={styles.lastKnown}>Latest recorded price: ₦{item.lastKnownPrice.toLocaleString()}</Text>
          ) : null}
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
          <View style={styles.ruleActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} hitSlop={8} style={styles.iconActionBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.primary.deepBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDeleteAlert(item)} hitSlop={8} style={styles.iconActionBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const canSubmit = Boolean(selectedMarketRow && targetPrice.trim());

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Price Watch</Text>
          <Text style={styles.headerSubtitle}>Automated target alerts for Abuja markets</Text>
        </View>
        <TouchableOpacity style={styles.createAlertBtn} onPress={openModal} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
          <Text style={styles.createAlertText}>New Alert</Text>
        </TouchableOpacity>
      </View>

      {/* Direct Link to Dedicated Notifications Page */}
      <TouchableOpacity
        style={styles.notificationsLinkRow}
        onPress={() => navigation.navigate('Notifications')}
        activeOpacity={0.7}
      >
        <View style={styles.notificationsLinkLeft}>
          <MaterialCommunityIcons name="bell-badge-outline" size={20} color={Colors.primary.deepBlue} />
          <Text style={styles.notificationsLinkText}>View Alert Notifications</Text>
        </View>
        <View style={styles.notificationsLinkRight}>
          {unreadNotificationCount > 0 ? (
            <View style={styles.unreadCountPill}>
              <Text style={styles.unreadCountText}>{unreadNotificationCount} new</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
        </View>
      </TouchableOpacity>

      {/* Active Rules List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Target Rules ({alerts.length})</Text>
        </View>

        {alerts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="bell-plus-outline" size={48} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Active Price Targets</Text>
            <Text style={styles.emptyDesc}>
              Set target price alerts for products in your favorite Abuja markets. We will ping your phone the moment verified submissions hit your target price.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openModal} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Create Your First Alert</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>{alerts.map((a) => renderRule(a))}</View>
        )}
      </ScrollView>

      {/* New Alert Modal Sheet */}
      <Modal visible={!!deleteTarget} animationType="fade" transparent onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete price alert?</Text>
            <Text style={styles.confirmBody}>
              {deleteTarget
                ? `Remove your ${deleteTarget.commodityName} target at ${deleteTarget.marketName || 'this market'}?`
                : ''}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={performDeleteAlert}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingAlertId ? 'Edit Price Alert' : 'Create Price Alert'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* STEP 1: Search & Scrollable Products */}
              <Text style={styles.modalLabel}>1. Search Product</Text>
              <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={22} color="#64748B" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="e.g. Rice, Garri, Palm Oil, Beans..."
                  placeholderTextColor="#64748B"
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>

              {editingAlertId ? (
                <View style={styles.editingBanner}>
                  <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary.deepBlue} />
                  <Text style={styles.editingBannerText}>
                    Update target price or condition below. Product and stall stay the same unless you change them.
                  </Text>
                </View>
              ) : null}

              {!selectedProductId && !editingAlertId ? (
                <View>
                  <Text style={styles.scrollHint}>Scroll down to view all available products ({filteredProducts.length})</Text>
                  <ScrollView
                    style={styles.productPickerScroll}
                    contentContainerStyle={styles.productPickerScrollContent}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
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
                  </ScrollView>
                </View>
              ) : null}

              {/* STEP 2: Selected Product & Scrollable Market Stall Prices */}
              {selectedProductId ? (
                <View style={{ gap: 12 }}>
                  <TouchableOpacity style={styles.repickRow} onPress={() => setSelectedProductId(null)}>
                    <MaterialCommunityIcons name="arrow-left" size={18} color={Colors.primary.deepBlue} />
                    <Text style={styles.repickText}>Change product selection</Text>
                  </TouchableOpacity>

                  <Text style={styles.modalLabel}>2. Select Market Stall & Current Price</Text>
                  {productDetailQ.isLoading ? (
                    <ActivityIndicator style={{ marginVertical: 12 }} />
                  ) : productDetailQ.data?.markets?.length ? (
                    <View>
                      <Text style={styles.scrollHint}>
                        Scroll to see and compare all market stall prices ({productDetailQ.data.markets.length})
                      </Text>
                      <ScrollView
                        style={styles.marketOptionsScroll}
                        contentContainerStyle={styles.marketOptionsScrollContent}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                      >
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
                              <View style={styles.priceContainer}>
                                <Text style={[styles.marketPrice, isSelected && styles.marketPriceActive]}>
                                  ₦{item.avg_price.toLocaleString()}
                                </Text>
                                <Text style={styles.marketPriceSub}>avg price</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : (
                    <Text style={styles.noMarkets}>No market data recorded yet for this item.</Text>
                  )}

                  {/* STEP 3 & 4: Condition and Target Price */}
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
                        value={targetPrice}
                        onChangeText={setTargetPrice}
                        placeholder={estimatePrice ? `e.g. ${(estimatePrice * 0.9).toFixed(0)}` : 'Enter target price'}
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        style={styles.priceInput}
                      />

                      <TouchableOpacity
                        style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
                        disabled={!canSubmit}
                        onPress={handleSaveAlert}
                      >
                        <Text style={styles.saveBtnText}>
                          {editingAlertId ? 'Save Changes' : 'Save Target Alert'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  createAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 4,
  },
  createAlertText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  notificationsLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  notificationsLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationsLinkText: {
    color: Colors.primary.deepBlue,
    fontWeight: '800',
    fontSize: 13,
  },
  notificationsLinkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadCountPill: {
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ruleCardInactive: {
    opacity: 0.6,
  },
  ruleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ruleBody: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  ruleMarket: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  ruleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  ruleCond: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  rulePrice: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary.deepBlue,
  },
  lastKnown: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  ruleRight: {
    alignItems: 'flex-end',
    gap: 10,
    marginLeft: 12,
  },
  ruleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionBtn: {
    padding: 4,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  confirmCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 340,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  confirmBody: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontWeight: '800',
    color: '#475569',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontWeight: '800',
    color: '#DC2626',
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  editingBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  emptyDesc: {
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
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
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginTop: 14,
    marginBottom: 6,
  },
  scrollHint: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 50,
    gap: 10,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    color: '#0F172A',
    fontWeight: '600',
    minHeight: 44,
  },
  productPickerScroll: {
    maxHeight: 230,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
  },
  productPickerScrollContent: {
    paddingHorizontal: 12,
  },
  productOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  productName: {
    fontWeight: '800',
    fontSize: 14,
    color: '#0F172A',
  },
  productUnit: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  repickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  repickText: {
    color: Colors.primary.deepBlue,
    fontWeight: '800',
    fontSize: 12,
  },
  marketOptionsScroll: {
    maxHeight: 230,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
  },
  marketOptionsScrollContent: {
    padding: 10,
    gap: 8,
  },
  marketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  marketCardActive: {
    borderColor: Colors.primary.deepBlue,
    backgroundColor: '#EFF6FF',
  },
  marketName: {
    fontWeight: '800',
    fontSize: 14,
    color: '#1E293B',
  },
  marketNameActive: {
    color: Colors.primary.deepBlue,
  },
  marketArea: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  marketPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  marketPriceActive: {
    color: Colors.primary.deepBlue,
  },
  marketPriceSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  noMarkets: {
    color: '#64748B',
    fontSize: 13,
    marginVertical: 8,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 10,
  },
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
  conditionBtnActive: {
    backgroundColor: Colors.primary.deepBlue,
    borderColor: Colors.primary.deepBlue,
  },
  conditionText: {
    fontWeight: '800',
    fontSize: 12,
    color: '#475569',
  },
  conditionTextActive: {
    color: '#FFF',
  },
  priceInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    backgroundColor: '#FFF',
  },
  saveBtn: {
    marginTop: 14,
    backgroundColor: Colors.primary.deepBlue,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 15,
  },
});
