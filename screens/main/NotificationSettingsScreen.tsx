/**
 * Notifications: preferences & price-alert setup (targets by product + market).
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useStore, getStoreState } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { fetchProducts, fetchProductDetail } from '@/services/catalogApi';
import { requestDeviceNotificationPermission } from '@/services/deviceNotifications';
import type { Alert as PriceAlertRule } from '@/types';

export default function NotificationSettingsScreen() {
  const alertsEnabled = useStore((state) => state.alertsEnabled);
  const alerts = useStore((state) => state.alerts);
  const setAlertsEnabled = useStore((state) => state.setAlertsEnabled);
  const toggleAlert = useStore((state) => state.toggleAlert);
  const removeAlert = useStore((state) => state.removeAlert);

  const [priceAlerts, setPriceAlerts] = React.useState(true);
  const [forecastUpdates, setForecastUpdates] = React.useState(true);
  const [marketNews, setMarketNews] = React.useState(false);
  const [weeklyDigest, setWeeklyDigest] = React.useState(true);

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
    if (!s) return list.slice(0, 80);
    return list.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 80);
  }, [productsQ.data, search]);

  const selectedMarketRow = React.useMemo(() => {
    if (!selectedProductId || selectedMarketId === null || !productDetailQ.data?.markets) {
      return null;
    }
    return productDetailQ.data.markets.find((row) => row.market.id === selectedMarketId) ?? null;
  }, [selectedMarketId, selectedProductId, productDetailQ.data]);

  const estimatePrice =
    selectedMarketRow?.avg_price !== undefined && selectedMarketRow?.avg_price !== null
      ? selectedMarketRow.avg_price
      : null;

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

    const newRule: PriceAlertRule = {
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
    };
    await requestDeviceNotificationPermission();
    getStoreState().addAlert(newRule);
    setModalOpen(false);
  };

  const renderRule = (item: PriceAlertRule) => {
    const when =
      item.condition === 'below'
        ? `When it goes lower than ₦${item.targetPrice.toLocaleString()}`
        : `When it goes higher than ₦${item.targetPrice.toLocaleString()}`;
    const px =
      typeof item.lastKnownPrice === 'number' && Number.isFinite(item.lastKnownPrice)
        ? `Last checked ₦${item.lastKnownPrice.toLocaleString()}`
        : 'We’ll refresh the price quietly in the background.';

    return (
      <View key={item.id} style={[styles.ruleRow, !item.isActive && styles.ruleRowMuted]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ruleProduct}>{item.commodityName}</Text>
          <Text style={styles.ruleMarket}>{item.marketName}</Text>
          <Text style={styles.ruleHint}>{when}</Text>
          <Text style={styles.rulePx}>{px}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Switch
            value={item.isActive}
            onValueChange={() => toggleAlert(item.id)}
            trackColor={{ false: Colors.secondary.lightGray, true: Colors.primary.vibrantGreen }}
            thumbColor={Colors.primary.white}
          />
          <TouchableOpacity onPress={() => removeAlert(item.id)} hitSlop={8}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.status.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const canSubmit = Boolean(selectedMarketRow && targetPrice.trim());

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionHead}>Alerts & updates</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Price alerts</Text>
              <Text style={styles.settingDescription}>We’ll ping you when markets hit what you chose.</Text>
            </View>
            <Switch
              value={alertsEnabled && priceAlerts}
              onValueChange={(value) => {
                setPriceAlerts(value);
                setAlertsEnabled(value);
              }}
              trackColor={{ false: Colors.secondary.lightGray, true: Colors.primary.vibrantGreen }}
              thumbColor={Colors.primary.white}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Forecast tips</Text>
              <Text style={styles.settingDescription}>Gentle notes when trends look interesting.</Text>
            </View>
            <Switch
              value={forecastUpdates}
              onValueChange={setForecastUpdates}
              trackColor={{ false: Colors.secondary.lightGray, true: Colors.primary.vibrantGreen }}
              thumbColor={Colors.primary.white}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Market chatter</Text>
              <Text style={styles.settingDescription}>Short reads about what’s moving.</Text>
            </View>
            <Switch
              value={marketNews}
              onValueChange={setMarketNews}
              trackColor={{ false: Colors.secondary.lightGray, true: Colors.primary.vibrantGreen }}
              thumbColor={Colors.primary.white}
            />
          </View>

          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Weekly roundup</Text>
              <Text style={styles.settingDescription}>A simple weekly summary.</Text>
            </View>
            <Switch
              value={weeklyDigest}
              onValueChange={setWeeklyDigest}
              trackColor={{ false: Colors.secondary.lightGray, true: Colors.primary.vibrantGreen }}
              thumbColor={Colors.primary.white}
            />
          </View>
        </View>

        <View style={styles.sectionDivider} />

        <View style={[styles.section, { gap: Spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionHead}>Your price watches</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openModal} activeOpacity={0.85}>
              <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>New alert</Text>
            </TouchableOpacity>
          </View>
          {!alerts.length ? <Text style={styles.emptyHint}>Add one with “New alert”.</Text> : null}
          {alerts.map((a) => renderRule(a))}
        </View>
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetBar} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>New price alert</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Text style={styles.cancel}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetScrollContent}
            >
              <Text style={styles.fieldLabel}>Search a product</Text>
              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Try “rice”, “beans”…"
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                />
              </View>

              {!selectedProductId ? (
                <View style={styles.pickList}>
                  {filteredProducts.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.pickRow}
                      onPress={() => {
                        setSelectedProductId(item.id);
                        setSelectedMarketId(null);
                      }}
                    >
                      <Text style={styles.pickName}>{item.name}</Text>
                      <Text style={styles.pickMeta}>{item.unit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {selectedProductId ? (
                <View style={{ gap: Spacing.sm }}>
                  <TouchableOpacity style={styles.repick} onPress={() => setSelectedProductId(null)}>
                    <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.primary.deepBlue} />
                    <Text style={styles.repickTxt}>Pick another product</Text>
                  </TouchableOpacity>
                  {selectedMarketRow ? (
                    <View style={styles.selectedMarketCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.currentLabel}>Selected stall</Text>
                        <Text style={styles.selectedMarketName}>{selectedMarketRow.market.name}</Text>
                        <Text style={styles.pickMeta}>{selectedMarketRow.market.area || 'Local'}</Text>
                      </View>
                      <TouchableOpacity style={styles.changeBtn} onPress={() => setSelectedMarketId(null)}>
                        <Text style={styles.changeBtnText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.fieldLabel}>Choose a stall</Text>
                      {productDetailQ.isLoading ? (
                        <Text style={styles.soft}>Loading stalls…</Text>
                      ) : productDetailQ.isError || !productDetailQ.data?.markets?.length ? (
                        <Text style={styles.soft}>No prices linked yet — try another product.</Text>
                      ) : (
                        <View style={styles.pickListCompact}>
                          {productDetailQ.data.markets.map((item) => (
                            <TouchableOpacity
                              key={item.market.id}
                              style={styles.pickRow}
                              onPress={() => setSelectedMarketId(item.market.id)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.pickName}>{item.market.name}</Text>
                                <Text style={styles.pickMeta}>{item.market.area || 'Local'}</Text>
                              </View>
                              <Text style={styles.priceTag}>₦{item.avg_price.toLocaleString()}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {selectedMarketRow ? (
                    <>
                      <View style={styles.currentBox}>
                        <Text style={styles.currentLabel}>Latest price</Text>
                        <Text style={styles.currentValue}>
                          {estimatePrice !== null ? `₦${estimatePrice.toLocaleString()}` : 'Not available yet'}
                        </Text>
                      </View>

                      <Text style={styles.fieldLabel}>Tell me when the price goes</Text>
                      <View style={styles.condRow}>
                        <TouchableOpacity
                          style={[styles.condBtn, alertCondition === 'below' && styles.condBtnOn]}
                          onPress={() => setAlertCondition('below')}
                        >
                          <Text style={[styles.condTxt, alertCondition === 'below' && styles.condTxtOn]}>Lower than</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.condBtn, alertCondition === 'above' && styles.condBtnOn]}
                          onPress={() => setAlertCondition('above')}
                        >
                          <Text style={[styles.condTxt, alertCondition === 'above' && styles.condTxtOn]}>Higher than</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.fieldLabel}>Your level (₦)</Text>
                      <TextInput
                        style={styles.priceField}
                        placeholder="Example: 7000"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={targetPrice}
                        onChangeText={setTargetPrice}
                      />

                      <TouchableOpacity
                        style={[styles.saveBtn, !canSubmit && styles.saveBtnOff]}
                        disabled={!canSubmit}
                        onPress={submitRule}
                      >
                        <Text style={styles.saveBtnText}>Save alert</Text>
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
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  section: {
    backgroundColor: Colors.primary.white,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  sectionHead: {
    ...Typography.h3,
    color: Colors.primary.deepBlue,
    marginBottom: Spacing.sm,
    fontWeight: '800',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary.lightGray,
  },
  settingItemLast: { borderBottomWidth: 0 },
  settingLeft: { flex: 1, marginRight: Spacing.md },
  settingTitle: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  sectionDivider: { height: Spacing.lg },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  emptyHint: { ...Typography.caption, color: Colors.text.secondary, marginBottom: Spacing.sm },
  ruleRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ruleRowMuted: { opacity: 0.55 },
  ruleProduct: { fontWeight: '900', fontSize: 16, color: '#111827' },
  ruleMarket: { marginTop: 2, fontWeight: '700', color: '#6B7280', fontSize: 13 },
  ruleHint: { marginTop: 6, fontWeight: '600', color: '#374151', fontSize: 13 },
  rulePx: { marginTop: 4, fontWeight: '700', fontSize: 12, color: Colors.primary.deepBlue },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: Spacing.lg,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 42 : Spacing.xl,
  },
  sheetScrollContent: {
    paddingBottom: Spacing.xl,
  },
  sheetBar: {
    width: 42,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sheetTitle: { ...Typography.h3, fontSize: 18, fontWeight: '900', color: '#111827' },
  cancel: { color: '#6B7280', fontWeight: '700', fontSize: 16 },
  fieldLabel: { fontWeight: '800', fontSize: 13, color: '#374151', marginBottom: 8, marginTop: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: '#111827', fontWeight: '600' },
  pickRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickList: {
    maxHeight: 220,
    overflow: 'hidden',
  },
  pickListCompact: {
    maxHeight: 260,
    overflow: 'hidden',
  },
  selectedMarketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  selectedMarketName: { marginTop: 4, fontWeight: '900', fontSize: 16, color: '#111827' },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  changeBtnText: { color: Colors.primary.deepBlue, fontWeight: '900', fontSize: 12 },
  pickRowActive: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  pickName: { fontWeight: '800', fontSize: 15, color: '#111827' },
  pickMeta: { fontWeight: '600', fontSize: 12, color: '#6B7280', marginTop: 4 },
  priceTag: { fontWeight: '900', color: Colors.primary.deepBlue, fontSize: 15 },
  repick: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginVertical: 4 },
  repickTxt: { color: Colors.primary.deepBlue, fontWeight: '800' },
  soft: { color: '#6B7280', fontWeight: '600' },
  currentBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  currentLabel: { fontWeight: '700', color: '#6B7280', fontSize: 12 },
  currentValue: { fontWeight: '900', fontSize: 22, color: '#111827', marginTop: 6 },
  condRow: { flexDirection: 'row', gap: 12 },
  condBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  condBtnOn: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  condTxt: { fontWeight: '800', color: '#6B7280' },
  condTxtOn: { color: '#FFF' },
  priceField: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  saveBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary.deepBlue,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnOff: { backgroundColor: '#D1D5DB' },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});
