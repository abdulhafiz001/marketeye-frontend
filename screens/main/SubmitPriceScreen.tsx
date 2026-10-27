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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { getCurrentUserLocation, calculateHaversineDistanceKm } from '@/services/locationService';

import { fetchMarkets } from '@/services/marketsApi';
import { fetchCategories, fetchProducts } from '@/services/catalogApi';
import { submitPriceBatch, suggestCatalogProduct } from '@/services/userApi';
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

  const [marketIds, setMarketIds] = useState<number[]>(
    route.params?.marketId != null ? [Number(route.params.marketId)] : []
  );
  const [productId, setProductId] = useState<number | null>(
    route.params?.productId != null ? Number(route.params.productId) : null
  );
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
  const [marketPrices, setMarketPrices] = useState<Record<number, string>>({});
  const [attemptedMarket, setAttemptedMarket] = useState<string | null>(null);
  const [suggestingProduct, setSuggestingProduct] = useState(false);
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemReason, setNewItemReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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
      const coords = await getCurrentUserLocation(true);
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
      setMarketIds([Number(route.params.marketId)]);
    }
  }, [route.params?.productId, route.params?.marketId]);

  const marketsQ = useQuery({ queryKey: ['markets'], queryFn: fetchMarkets });
  const productsQ = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const filteredProducts = useMemo(() => {
    const list = productsQ.data || [];
    if (!q.trim()) return list.slice(0, 40);
    const s = q.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 60);
  }, [productsQ.data, q]);
  const visibleProducts = useMemo(() => filteredProducts.slice(0, q.trim() ? 20 : 8), [filteredProducts, q]);

  const selectedMarkets = (marketsQ.data?.markets || []).filter((m) => marketIds.includes(m.id));
  const selectedProduct = (productsQ.data || []).find((p) => p.id === productId);

  // Compute geofence proximity (within 750m)
  const distanceToMarket = (market: { lat: number | null; lng: number | null }) => {
    if (!userLoc || market.lat == null || market.lng == null) return null;
    return calculateHaversineDistanceKm(userLoc.lat, userLoc.lng, market.lat, market.lng);
  };

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
    onMutate: () => setFormError(null),
    mutationFn: async () => {
      if (!marketIds.length) throw new Error('Select at least one market near you.');
      const coords = await getCurrentUserLocation(true);
      if (!coords) throw new Error('Turn on location and allow access to submit prices at a market.');
      setUserLoc({ lat: coords.latitude, lng: coords.longitude });
      const markets = (marketsQ.data?.markets || []).filter((market) => marketIds.includes(market.id));
      for (const market of markets) {
        const distance = market.lat == null || market.lng == null
          ? null
          : calculateHaversineDistanceKm(coords.latitude, coords.longitude, market.lat, market.lng);
        if (distance === null || distance > 0.75) {
          throw new Error(distance === null
            ? `${market.name} does not have a verified map location.`
            : `You are ${distance.toFixed(1)} km from ${market.name}. You must be within 750 m to submit a price for this market.`);
        }
      }
      const priceFor = (id: number) => Number((marketPrices[id] ?? '').replace(/,/g, ''));
      for (const market of markets) {
        if (!Number.isFinite(priceFor(market.id)) || priceFor(market.id) <= 0) {
          throw new Error(`Enter a valid price for ${market.name}.`);
        }
      }
      if (suggestingProduct) {
        if (newProductName.trim().length < 3) throw new Error('Enter a real product name with at least 3 characters.');
        if (newProductUnit.trim().length < 2) throw new Error('Enter a valid unit, such as per kg or per basket.');
        if (!categoryId && newCategoryName.trim().length < 3) throw new Error('Select a category or enter a new category name.');
        const response = await suggestCatalogProduct({
          product_name: newProductName.trim(),
          unit: newProductUnit.trim(),
          category_id: categoryId ?? undefined,
          category_name: categoryId ? undefined : newCategoryName.trim(),
          reason: newItemReason.trim() || undefined,
          market_prices: markets.map((market) => ({
            market_id: market.id,
            price: priceFor(market.id),
            latitude: coords.latitude,
            longitude: coords.longitude,
          })),
        });
        return { offline: false as const, suggestion: response.suggestion };
      }

      if (!productId) throw new Error('Select a product or suggest a new one.');
      const qty = Number(quantityValue.replace(/,/g, ''));
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Enter a valid quantity');
      const unit = quantityUnit === 'custom' ? customUnit.trim() : quantityUnit;
      if (!unit) throw new Error('Choose the quantity unit');
      const payload = markets.map((market) => ({
        product_id: productId,
        market_id: market.id,
        price: priceFor(market.id),
        quantity_value: qty,
        quantity_unit: unit,
        notes: notes.trim() || undefined,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        for (const report of payload) {
          const market = markets.find((item) => item.id === report.market_id);
          await enqueueOfflineSubmission({ ...report, product_name: selectedProduct?.name, market_name: market?.name });
        }
        return { offline: true as const };
      }
      const data = await submitPriceBatch(payload);
      return { offline: false as const, data };
    },
    onSuccess: (result) => {
      setQueuedOffline(result.offline);
      if ('suggestion' in result && result.suggestion) {
        setSuggestionSent(true);
        setSuccess(true);
      }
      if (!result.offline && result.data) {
        const successful = result.data.results.filter((row) => row.ok).length;
        if (successful === 0) {
          setFormError(result.data.results.find((row) => !row.ok)?.message || 'No prices were accepted. Check the market location and try again.');
          mutation.reset();
          return;
        }
        setSubmissionResult({
          accepted: successful,
          total: result.data.accepted + result.data.failed,
          failed: result.data.failed,
          failureMessage: result.data.results.find((row) => !row.ok)?.message,
        });
        setSuccess(true);
        if (user) {
          setUser({
            ...user,
            points: result.data.user.points,
            walletBalance: result.data.user.wallet_balance ?? user.walletBalance,
          });
        }
      }
      if (result.offline) setSuccess(true);

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
      <View style={styles.container}>
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
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialCommunityIcons name="check-decagram" size={72} color={Colors.primary.vibrantGreen} />
          </Animated.View>
          <Text style={styles.blockTitle}>{queuedOffline ? 'Saved Offline' : 'Price Submitted!'}</Text>

          {!suggestionSent ? submissionResult ? (
            <View style={styles.successGeoBadge}>
              <MaterialCommunityIcons name="map-marker-check" size={16} color="#166534" />
              <Text style={styles.successGeoText}>GPS checked for {submissionResult.accepted} market price(s)</Text>
            </View>
          ) : null : null}

          <Text style={styles.blockSub}>
            {queuedOffline
              ? 'No signal right now — this price is safely queued locally and will upload automatically when you reconnect.'
              : suggestionSent
                ? 'Your product, category, and market prices were sent to the team for review. They will appear in the catalog after approval.'
                : `${submissionResult?.accepted ?? 1} price report(s) were recorded for community verification.${submissionResult?.failed ? ` ${submissionResult.failed} report(s) were not accepted: ${submissionResult.failureMessage || 'check the selected market location.'}` : ''} Thanks for keeping market prices accurate!`}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const errorMessage = formError || (mutation.isError
    ? ((mutation.error as any)?.response?.data?.errors &&
        Object.values((mutation.error as any).response.data.errors).flat().join(' ')) ||
      (mutation.error as any)?.response?.data?.message ||
      (mutation.error as any)?.message ||
      'Could not submit this price. Please check the details and try again.'
    : null);

  return (
    <View style={styles.container}>
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
          {marketIds.length > 0 ? (
            <TouchableOpacity onPress={() => setMarketIds([])} style={styles.clearChip}>
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
                const active = marketIds.includes(item.id);
                const distance = distanceToMarket(item);
                const nearby = distance != null && distance <= 0.75;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, !nearby && styles.chipDistant, active && styles.chipActive]}
                    onPress={() => {
                      if (active) {
                        setMarketIds((current) => current.filter((id) => id !== item.id));
                        setAttemptedMarket(null);
                        return;
                      }
                      if (!userLoc) {
                        setAttemptedMarket('Allow location access so we can check whether you are at this market.');
                        return;
                      }
                      if (!nearby) {
                        setAttemptedMarket(distance == null
                          ? `${item.name} has no verified map location and cannot be selected.`
                          : `You are ${distance.toFixed(1)} km from ${item.name}. You must be within 750 m to report prices there.`);
                        return;
                      }
                      setAttemptedMarket(null);
                      setMarketIds((current) => current.includes(item.id)
                        ? current.filter((id) => id !== item.id)
                        : [...current, item.id]);
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item.name.replace(' Market', '')} {distance == null ? '· location off' : `· ${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selectedMarkets.length ? (
            <View style={styles.marketStatusWrap}>
              <Text style={styles.selected}>Selected: {selectedMarkets.map((market) => market.name).join(', ')}</Text>
            </View>
          ) : (
            <Text style={styles.hint}>Select one or more markets within 750 m of your current location.</Text>
          )}
          {attemptedMarket ? <Text style={styles.errorText}>{attemptedMarket}</Text> : null}

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
              <Text style={styles.hint}>Select a product or suggest a new one. New items are reviewed before publishing.</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSuggestingProduct((current) => !current)}>
                <Text style={styles.secondaryBtnText}>{suggestingProduct ? 'Choose an existing product' : 'Can’t find it? Suggest a product'}</Text>
              </TouchableOpacity>
            </>
          )}

          {suggestingProduct ? (
            <View style={styles.suggestionBox}>
              <Text style={styles.labelNoPad}>New product details</Text>
              <TextInput value={newProductName} onChangeText={setNewProductName} placeholder="Product name (e.g. Ugu leaves)" style={styles.input} />
              <TextInput value={newProductUnit} onChangeText={setNewProductUnit} placeholder="How it is sold (e.g. per bundle)" style={styles.input} />
              <Text style={styles.labelNoPad}>Choose an existing category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.marketChips}>
                {(categoriesQ.data || []).map((category) => (
                  <TouchableOpacity key={category.id} style={[styles.chip, categoryId === category.id && styles.chipActive]} onPress={() => { setCategoryId(category.id); setNewCategoryName(''); }}>
                    <Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput value={newCategoryName} onChangeText={(value) => { setNewCategoryName(value); setCategoryId(null); }} placeholder="Or suggest a new category" style={styles.input} />
              <TextInput value={newItemReason} onChangeText={setNewItemReason} placeholder="Add a short note (optional)" style={styles.input} />
            </View>
          ) : null}

          {/* Price & Quantity Fields */}
          <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.sm }}>
            <Text style={styles.labelNoPad}>3. Price at each selected market (₦)</Text>
            {selectedMarkets.map((market) => (
              <View key={market.id}>
                <Text style={styles.marketPriceLabel}>{market.name}</Text>
                <TextInput
                  value={marketPrices[market.id] || ''}
                  onChangeText={(value) => setMarketPrices((current) => ({ ...current, [market.id]: value }))}
                  keyboardType="numeric"
                  placeholder="e.g. 3500"
                  style={styles.input}
                />
              </View>
            ))}

            {!suggestingProduct ? <>
            <Text style={styles.labelNoPad}>4. Quantity each price covers</Text>
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
            </> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, mutation.isPending && { opacity: 0.6 }]}
              disabled={mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              <Text style={styles.primaryBtnText}>{mutation.isPending ? 'Submitting…' : suggestingProduct ? 'Send Product for Review' : 'Submit Market Prices'}</Text>
            </TouchableOpacity>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  chipDistant: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
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
  suggestionBox: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 14,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  secondaryBtn: {
    marginHorizontal: Spacing.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.primary.deepBlue, fontWeight: '800' },
  marketPriceLabel: { marginBottom: 6, color: '#334155', fontWeight: '800' },
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
