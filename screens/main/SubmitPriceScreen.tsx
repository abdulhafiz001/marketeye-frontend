import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { getCurrentUserLocation, calculateHaversineDistanceKm } from '@/services/locationService';

import { fetchMarkets } from '@/services/marketsApi';
import { fetchProducts } from '@/services/catalogApi';
import { submitPrice } from '@/services/userApi';
import {
  enqueueOfflineSubmission,
  flushOfflineQueue,
  getOfflineQueueCount,
  subscribeOfflineQueue,
} from '@/services/offlineQueue';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function SubmitPriceScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const setUser = useStore((s) => s.setUser);
  const user = useStore((s) => s.user);

  const [marketId, setMarketId] = useState<number | null>(
    route.params?.marketId != null ? Number(route.params.marketId) : null
  );
  const [productId, setProductId] = useState<number | null>(
    route.params?.productId != null ? Number(route.params.productId) : null
  );
  const [price, setPrice] = useState('');
  const [quantityValue, setQuantityValue] = useState('1');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [q, setQ] = useState('');
  const [success, setSuccess] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const scale = React.useRef(new Animated.Value(0)).current;

  // Track offline queue count
  useEffect(() => {
    void getOfflineQueueCount().then(setPendingCount);
    return subscribeOfflineQueue(setPendingCount);
  }, []);

  // Request device GPS location for Geofence verification
  useEffect(() => {
    (async () => {
      try {
        const coords = await getCurrentUserLocation();
        if (coords) {
          setUserLoc({ lat: coords.latitude, lng: coords.longitude });
        }
      } catch {
        // Location optional
      }
    })();
  }, []);

  useEffect(() => {
    if (route.params?.productId != null) {
      setProductId(Number(route.params.productId));
    }
    if (route.params?.marketId != null) {
      setMarketId(Number(route.params.marketId));
    }
  }, [route.params?.productId, route.params?.marketId]);

  const marketsQ = useQuery({ queryKey: ['markets'], queryFn: fetchMarkets });
  const productsQ = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

  const filteredProducts = useMemo(() => {
    const list = productsQ.data || [];
    if (!q.trim()) return list.slice(0, 40);
    const s = q.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 60);
  }, [productsQ.data, q]);
  const visibleProducts = useMemo(() => filteredProducts.slice(0, q.trim() ? 20 : 8), [filteredProducts, q]);

  const selectedMarket = (marketsQ.data?.markets || []).find((m) => m.id === marketId);
  const selectedProduct = (productsQ.data || []).find((p) => p.id === productId);

  // Compute geofence proximity (within 750m)
  const isGeoverified = useMemo(() => {
    if (!userLoc || !selectedMarket?.lat || !selectedMarket?.lng) return false;
    const dist = calculateHaversineDistanceKm(userLoc.lat, userLoc.lng, selectedMarket.lat, selectedMarket.lng);
    return dist <= 0.75;
  }, [userLoc, selectedMarket]);

  const unitOptions = useMemo(() => {
    const base = selectedProduct?.unit ? [selectedProduct.unit] : [];
    return Array.from(new Set([...base, 'modu', 'kg', 'bag', 'custom']));
  }, [selectedProduct?.unit]);

  useEffect(() => {
    if (selectedProduct?.unit && !quantityUnit) {
      setQuantityUnit(selectedProduct.unit);
    }
  }, [quantityUnit, selectedProduct?.unit]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!marketId || !productId) throw new Error('Pick market and product');
      const p = Number(price.replace(/,/g, ''));
      if (!Number.isFinite(p) || p <= 0) throw new Error('Enter a valid price');
      const qty = Number(quantityValue.replace(/,/g, ''));
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Enter a valid quantity');
      const unit = quantityUnit === 'custom' ? customUnit.trim() : quantityUnit;
      if (!unit) throw new Error('Choose the quantity unit');

      const payload = {
        market_id: marketId,
        product_id: productId,
        price: p,
        quantity_value: qty,
        quantity_unit: unit,
        notes: notes.trim() || undefined,
        is_geoverified: isGeoverified,
        latitude: userLoc?.lat,
        longitude: userLoc?.lng,
      };

      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        await enqueueOfflineSubmission({
          ...payload,
          product_name: selectedProduct?.name,
          market_name: selectedMarket?.name,
        });
        return { offline: true as const };
      }

      try {
        const data = await submitPrice(payload);
        return { offline: false as const, data };
      } catch (err: any) {
        const status = err?.response?.status;
        const noNetwork = !err?.response || status === 0;
        if (noNetwork) {
          await enqueueOfflineSubmission({
            ...payload,
            product_name: selectedProduct?.name,
            market_name: selectedMarket?.name,
          });
          return { offline: true as const };
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      setSuccess(true);
      setQueuedOffline(result.offline);
      if (!result.offline && result.data) {
        setSubmissionResult(result.data.submission);
        if (user) {
          setUser({
            ...user,
            points: result.data.user.points,
            walletBalance: result.data.user.wallet_balance ?? user.walletBalance,
          });
        }
      }

      // Invalidate queries so prices immediately appear across market detail, product detail, and dashboard
      queryClient.invalidateQueries({ queryKey: ['market-prices'] });
      queryClient.invalidateQueries({ queryKey: ['product-detail'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });

      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
      void flushOfflineQueue();
    },
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="lock-outline" size={44} color={Colors.primary.deepBlue} />
          <Text style={styles.blockTitle}>Sign in to submit prices</Text>
          <Text style={styles.blockSub}>
            Earn ₦1 per verified submission, boost your community ranking, and help keep Abuja prices accurate.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              const nav: any = navigation;
              nav.getParent()?.getParent()?.getParent()?.navigate('Auth');
            }}
          >
            <Text style={styles.primaryBtnText}>Register / Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: Spacing.md }}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialCommunityIcons name="check-decagram" size={72} color={Colors.primary.vibrantGreen} />
          </Animated.View>
          <Text style={styles.blockTitle}>{queuedOffline ? 'Saved Offline' : 'Price Submitted!'}</Text>

          {submissionResult?.is_geoverified ? (
            <View style={styles.successGeoBadge}>
              <MaterialCommunityIcons name="map-marker-check" size={16} color="#166534" />
              <Text style={styles.successGeoText}>📍 GPS Verified On-Site (+10 Points Awarded)</Text>
            </View>
          ) : null}

          <Text style={styles.blockSub}>
            {queuedOffline
              ? 'No signal right now — this price is safely queued locally and will upload automatically when you reconnect.'
              : submissionResult?.auto_approved
              ? 'Your high trust reputation auto-verified this report! ₦1 added to your airtime wallet.'
              : 'Your price report has been recorded for community verification. Thanks for keeping Abuja markets transparent!'}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const errorMessage = mutation.isError
    ? (mutation.error as any)?.response?.data?.message ||
      ((mutation.error as any)?.response?.data?.errors &&
        Object.values((mutation.error as any).response.data.errors).flat().join(' ')) ||
      (mutation.error as any)?.message ||
      'Could not submit this price. Please check the details and try again.'
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.primary.deepBlue} />
          </TouchableOpacity>
          <Text style={styles.title}>Submit Market Price</Text>
          {marketId != null ? (
            <TouchableOpacity onPress={() => setMarketId(null)} style={styles.clearChip}>
              <Text style={styles.clearChipText}>Change</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {pendingCount > 0 ? (
          <TouchableOpacity style={styles.pendingBanner} onPress={() => void flushOfflineQueue()}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#92400E" />
            <Text style={styles.pendingBannerText}>
              Pending uploads ({pendingCount}) — tap to sync when online
            </Text>
          </TouchableOpacity>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Market Selection */}
          <Text style={styles.label}>1. Select Market</Text>
          {marketsQ.isLoading ? (
            <ActivityIndicator style={styles.inlineLoader} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.marketChips}
              style={styles.marketScroller}
            >
              {(marketsQ.data?.markets || []).map((item) => {
                const active = item.id === marketId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setMarketId(item.id)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item.name.replace(' Market', '')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selectedMarket ? (
            <View style={styles.marketStatusWrap}>
              <Text style={styles.selected}>Selected: {selectedMarket.name}</Text>
              {isGeoverified ? (
                <View style={styles.geoVerifiedPill}>
                  <MaterialCommunityIcons name="map-marker-check" size={14} color="#166534" />
                  <Text style={styles.geoVerifiedPillText}>📍 Verified In-Market (+10 Pts)</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.hint}>Pick the Abuja market you are reporting from</Text>
          )}

          {/* Product Selection */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>2. Select Commodity</Text>
          {selectedProduct ? (
            <View style={styles.prefillBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{selectedProduct.name}</Text>
                <Text style={styles.productMeta}>{selectedProduct.unit}</Text>
              </View>
              <TouchableOpacity onPress={() => setProductId(null)}>
                <Text style={styles.clearChipText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.search}>
                <MaterialCommunityIcons name="magnify" size={22} color="#64748B" />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search commodity (e.g. Rice, Beans, Garri...)"
                  placeholderTextColor="#64748B"
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>
              <ScrollView
                style={styles.productList}
                contentContainerStyle={styles.productListContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {productsQ.isLoading ? (
                  <ActivityIndicator />
                ) : filteredProducts.length ? (
                  visibleProducts.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.productRow, productId === item.id && styles.productRowActive]}
                      onPress={() => setProductId(item.id)}
                    >
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productMeta}>{item.unit}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ color: '#6B7280' }}>No matching products found.</Text>
                )}
              </ScrollView>
              <Text style={styles.hint}>Select the product</Text>
            </>
          )}

          {/* Price & Quantity Fields */}
          <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.sm }}>
            <Text style={styles.labelNoPad}>3. Total Price (₦)</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="e.g. 3500"
              style={styles.input}
            />

            <Text style={styles.labelNoPad}>4. Quantity this price covers</Text>
            <View style={styles.quantityRow}>
              <TextInput
                value={quantityValue}
                onChangeText={setQuantityValue}
                keyboardType="numeric"
                placeholder="1"
                style={[styles.input, styles.quantityInput]}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitChips}>
                {unitOptions.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitChip, quantityUnit === unit && styles.unitChipActive]}
                    onPress={() => setQuantityUnit(unit)}
                  >
                    <Text style={[styles.unitChipText, quantityUnit === unit && styles.unitChipTextActive]}>
                      {unit === 'custom' ? 'Other' : unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {quantityUnit === 'custom' ? (
              <TextInput
                value={customUnit}
                onChangeText={setCustomUnit}
                placeholder="Enter custom unit, e.g. basket, paint rubber"
                style={styles.input}
              />
            ) : null}

            <Text style={styles.labelNoPad}>Stall / Variety Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Stall B12, Derica measure, foreign variety"
              style={styles.input}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, mutation.isPending && { opacity: 0.6 }]}
              disabled={mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              <Text style={styles.primaryBtnText}>{mutation.isPending ? 'Submitting…' : 'Submit Market Price'}</Text>
            </TouchableOpacity>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { ...Typography.h2, color: '#0F172A', fontSize: 20, flex: 1, fontWeight: '900' },
  pendingBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBannerText: { flex: 1, color: '#92400E', fontWeight: '800', fontSize: 13 },
  clearChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  clearChipText: { color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 12 },
  formScroll: { paddingBottom: Spacing.xl * 2 },
  label: { paddingHorizontal: Spacing.lg, marginBottom: 8, fontWeight: '800', color: '#0F172A', fontSize: 14 },
  labelNoPad: { marginBottom: 8, fontWeight: '800', color: '#0F172A', fontSize: 13 },
  inlineLoader: { alignSelf: 'flex-start', marginLeft: Spacing.lg, marginVertical: Spacing.sm },
  marketScroller: { minHeight: 48, maxHeight: 56 },
  marketChips: { paddingHorizontal: Spacing.lg, gap: 10, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 220,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  chipText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#FFF' },
  marketStatusWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selected: { color: '#0F172A', fontWeight: '800', fontSize: 13 },
  geoVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  geoVerifiedPillText: { color: '#166534', fontWeight: '900', fontSize: 11 },
  hint: { paddingHorizontal: Spacing.lg, marginTop: 8, color: '#94A3B8', fontWeight: '600', fontSize: 12 },
  prefillBox: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    minHeight: 52,
    marginBottom: Spacing.sm,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    color: '#0F172A',
    fontWeight: '600',
    minHeight: 44,
  },
  productList: {
    maxHeight: 200,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  productListContent: { paddingBottom: 4 },
  productRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 10,
  },
  productRowActive: { backgroundColor: '#EFF6FF' },
  productName: { fontWeight: '800', color: '#0F172A' },
  productMeta: { marginTop: 2, color: '#64748B', fontSize: 12 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.md,
    color: '#0F172A',
    fontWeight: '600',
  },
  quantityRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: Spacing.md },
  quantityInput: { width: 88, marginBottom: 0 },
  unitChips: { gap: 8, alignItems: 'center', paddingRight: Spacing.md },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitChipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  unitChipText: { color: '#64748B', fontWeight: '800' },
  unitChipTextActive: { color: '#FFF' },
  primaryBtn: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryBtnText: { color: '#FFF', ...Typography.body, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  blockTitle: { ...Typography.h2, color: '#0F172A', marginTop: Spacing.md, textAlign: 'center', fontWeight: '900' },
  blockSub: { ...Typography.body, color: '#64748B', marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20 },
  successGeoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
  },
  successGeoText: { color: '#166534', fontWeight: '900', fontSize: 12 },
  link: { color: Colors.primary.deepBlue, fontWeight: '800' },
  errorText: { marginTop: Spacing.md, color: '#DC2626', fontWeight: '700' },
});
