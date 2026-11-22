import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const SUGGESTED_UNIT_PRESETS = ['per kg', 'per mudu', 'per bundle', '50kg bag', 'per paint', 'per tuber'];

export default function SubmitPriceScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
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
  const [refreshingGps, setRefreshingGps] = useState(false);
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

  const scale = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  // Track offline queue count
  useEffect(() => {
    void getOfflineQueueCount().then(setPendingCount);
    return subscribeOfflineQueue(setPendingCount);
  }, []);

  const refreshLocation = async () => {
    setRefreshingGps(true);
    try {
      const coords = await getCurrentUserLocation(true);
      if (coords) {
        setUserLoc({ lat: coords.latitude, lng: coords.longitude });
        setAttemptedMarket(null);
      }
    } catch {
      // Location optional
    } finally {
      setRefreshingGps(false);
    }
  };

  // Request device GPS location for Geofence verification
  useEffect(() => {
    void refreshLocation();
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

  // Compute geofence proximity (uses market's configured geofence_radius_m, default 10,000m / 10km)
  const distanceToMarket = (market: { lat: number | null; lng: number | null }) => {
    if (!userLoc || market.lat == null || market.lng == null) return null;
    return calculateHaversineDistanceKm(userLoc.lat, userLoc.lng, market.lat, market.lng);
  };

  const marketRadiusMeters = (market: { geofence_radius_m?: number | null }) =>
    Math.max(100, Number(market.geofence_radius_m || 10000));

  const marketRadiusKm = (market: { geofence_radius_m?: number | null }) =>
    marketRadiusMeters(market) / 1000;

  const formatRadiusLabel = (meters: number) =>
    meters >= 1000 ? `${+(meters / 1000).toFixed(1)} km` : `${meters} m`;

  const normalizeUnitKey = (u?: string | null) => {
    const clean = (u || '')
      .toLowerCase()
      .trim()
      .replace(/^(per\s+|1\s+|a\s+)/i, '');
    if (['modu', 'mudu', 'mudus', 'modus'].includes(clean)) return 'mudu';
    if (['kg', 'kgs', 'kilo', 'kilogram', 'kilograms'].includes(clean)) return 'kg';
    if (['cup', 'cups'].includes(clean)) return 'cup';
    if (['paint', 'paints', 'paint rubber', 'paint bucket'].includes(clean)) return 'paint';
    if (['bag', 'bags'].includes(clean)) return 'bag';
    if (['bundle', 'bundles', 'bunch'].includes(clean)) return 'bundle';
    return clean;
  };

  const unitOptions = useMemo(() => {
    const base = selectedProduct?.unit ? [selectedProduct.unit] : [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const candidate of [...base, 'mudu', 'cup', 'paint', 'kg', 'bag', 'bundle', 'custom']) {
      const key = candidate === 'custom' ? 'custom' : normalizeUnitKey(candidate);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(candidate);
      }
    }
    return list;
  }, [selectedProduct?.unit]);

  useEffect(() => {
    if (selectedProduct?.unit) {
      setQuantityUnit(selectedProduct.unit);
    }
  }, [selectedProduct?.id, selectedProduct?.unit]);

  const effectiveChosenUnit = quantityUnit === 'custom' ? customUnit.trim() : quantityUnit;
  const isDifferentUnitSelected = Boolean(
    selectedProduct?.unit &&
      effectiveChosenUnit &&
      normalizeUnitKey(effectiveChosenUnit) !== normalizeUnitKey(selectedProduct.unit)
  );

  const handleToggleMarket = (item: {
    id: number;
    name: string;
    lat: number | null;
    lng: number | null;
    geofence_radius_m?: number | null;
  }) => {
    const active = marketIds.includes(item.id);
    if (active) {
      setMarketIds((current) => current.filter((id) => id !== item.id));
      setAttemptedMarket(null);
      return;
    }
    if (!userLoc) {
      setAttemptedMarket('Turn on location access so we can verify your distance to this market.');
      return;
    }
    const distance = distanceToMarket(item);
    const radiusMeters = marketRadiusMeters(item);
    const nearby = distance != null && distance <= marketRadiusKm(item);
    if (!nearby) {
      setAttemptedMarket(
        distance == null
          ? `${item.name} does not have a verified map pin yet. Please ask an admin to set its location on the map.`
          : `You are ${distance.toFixed(1)} km away from ${item.name}. You need to be within ${formatRadiusLabel(radiusMeters)} to report prices for this market.`
      );
      return;
    }
    setAttemptedMarket(null);
    setFormError(null);
    setMarketIds((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]));
  };

  const mutation = useMutation({
    onMutate: () => setFormError(null),
    mutationFn: async () => {
      if (!marketIds.length) throw new Error('Please select at least one market near you in Step 1.');
      const coords = await getCurrentUserLocation(true);
      if (!coords) throw new Error('Please turn on device location and allow GPS access to submit market prices.');
      setUserLoc({ lat: coords.latitude, lng: coords.longitude });
      const markets = (marketsQ.data?.markets || []).filter((market) => marketIds.includes(market.id));
      for (const market of markets) {
        const radiusMeters = marketRadiusMeters(market);
        const radiusKm = marketRadiusKm(market);
        const distance =
          market.lat == null || market.lng == null
            ? null
            : calculateHaversineDistanceKm(coords.latitude, coords.longitude, market.lat, market.lng);
        if (distance === null || distance > radiusKm) {
          throw new Error(
            distance === null
              ? `${market.name} does not have a verified map location yet.`
              : `You are ${distance.toFixed(1)} km from ${market.name}. You must be within ${formatRadiusLabel(radiusMeters)} to submit a price for this market.`
          );
        }
      }
      const priceFor = (id: number) => Number((marketPrices[id] ?? '').replace(/,/g, ''));
      for (const market of markets) {
        if (!Number.isFinite(priceFor(market.id)) || priceFor(market.id) <= 0) {
          throw new Error(`Enter a valid price in Naira (₦) for ${market.name}.`);
        }
      }
      if (suggestingProduct) {
        if (newProductName.trim().length < 3) {
          throw new Error('Enter a product name with at least 3 characters (e.g. Ugu leaves).');
        }
        if (newProductUnit.trim().length < 2) {
          throw new Error('Enter how the item is sold (e.g. per kg, per mudu, per bundle).');
        }
        if (!categoryId && newCategoryName.trim().length < 3) {
          throw new Error('Select an existing category or enter a new category name.');
        }
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
        return {
          offline: false as const,
          suggestion: response.suggestion,
          product: response.product,
          data: {
            accepted: response.accepted ?? markets.length,
            failed: response.failed ?? 0,
            points_awarded: response.points_awarded ?? markets.length * 10,
            wallet_awarded: response.wallet_awarded ?? markets.length,
            results: (response.results ?? []) as any[],
            user: response.user ?? {
              points: (user?.points ?? 0) + markets.length * 10,
              wallet_balance: (user?.walletBalance ?? 0) + markets.length,
            },
          },
        };
      }

      if (!productId) throw new Error('Select a commodity in Step 2, or tap "Suggest a New Product".');
      const qty = Number(quantityValue.replace(/,/g, ''));
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Enter a valid quantity (e.g. 1).');
      const unit = quantityUnit === 'custom' ? customUnit.trim() : quantityUnit;
      if (!unit) throw new Error('Select or enter the measurement unit for this price.');
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
      setSuggestingProduct(false);
      setQueuedOffline(result.offline);
      if ('suggestion' in result && result.suggestion) {
        setSuggestionSent(true);
        setSuccess(true);
      }
      if (!result.offline && result.data) {
        const successful =
          result.data.results?.length > 0
            ? result.data.results.filter((row: any) => row.ok).length
            : (result.data.accepted ?? 1);
        if (successful === 0) {
          setFormError(
            result.data.results?.find((row: any) => !row.ok)?.message ||
              'No prices were accepted. Check the selected market location and try again.'
          );
          mutation.reset();
          return;
        }
        const computedWallet =
          result.data.wallet_awarded ??
          result.data.results?.reduce((sum: number, r: any) => sum + (r.submission?.wallet_awarded ?? (r.submission?.auto_approved ? 1 : 0)), 0) ??
          successful;
        const computedPoints =
          result.data.points_awarded ??
          result.data.results?.reduce((sum: number, r: any) => sum + (r.submission?.points_awarded ?? 10), 0) ??
          successful * 10;

        setSubmissionResult({
          accepted: successful,
          total: (result.data.accepted ?? successful) + (result.data.failed ?? 0),
          failed: result.data.failed ?? 0,
          walletAwarded: computedWallet,
          pointsAwarded: computedPoints,
          productName: ('product' in result && result.product?.name) || selectedProduct?.name || newProductName.trim(),
          failureMessage: result.data.results?.find((row: any) => !row.ok)?.message,
        });
        setSuccess(true);
        if (user && result.data.user) {
          setUser({
            ...user,
            points: result.data.user.points,
            walletBalance: result.data.user.wallet_balance ?? user.walletBalance,
          });
        }
      }
      if (result.offline) setSuccess(true);

      // Invalidate queries so prices and new products immediately appear across market detail, product detail, and dashboard
      queryClient.invalidateQueries({ queryKey: ['market-prices'] });
      queryClient.invalidateQueries({ queryKey: ['product-detail'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });

      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
      void flushOfflineQueue();
    },
  });

  const errorMessage =
    formError ||
    (mutation.isError
      ? ((mutation.error as any)?.response?.data?.errors &&
          Object.values((mutation.error as any).response.data.errors).flat().join(' ')) ||
        (mutation.error as any)?.response?.data?.message ||
        (mutation.error as any)?.message ||
        'Could not submit this price. Please check the highlighted fields and try again.'
      : null);

  const dismissError = () => {
    setFormError(null);
    if (mutation.isError) {
      mutation.reset();
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={() => navigation.goBack()} />
        <View style={[styles.sheetCard, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.centerBox}>
            <View style={styles.stateIconCircle}>
              <MaterialCommunityIcons name="lock-outline" size={36} color={Colors.primary.deepBlue} />
            </View>
            <Text style={styles.blockTitle}>Sign in to submit prices</Text>
            <Text style={styles.blockSub}>
              Earn ₦1 per verified submission, boost your community ranking, and help keep Abuja market prices accurate.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { alignSelf: 'stretch', marginTop: Spacing.lg }]}
              onPress={() => {
                const nav: any = navigation;
                nav.getParent()?.getParent()?.getParent()?.navigate('Auth');
              }}
            >
              <Text style={styles.primaryBtnText}>Register / Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: Spacing.md, padding: 8 }}>
              <Text style={styles.link}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={() => navigation.goBack()} />
        <View style={[styles.sheetCard, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.centerBox}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <MaterialCommunityIcons name="check-decagram" size={72} color={Colors.primary.vibrantGreen} />
            </Animated.View>
            <Text style={styles.blockTitle}>
              {queuedOffline ? 'Saved Offline' : suggestionSent ? 'Product & Price Published!' : 'Price Submitted!'}
            </Text>

            {!queuedOffline && submissionResult ? (
              <>
                <View style={styles.successGeoBadge}>
                  <MaterialCommunityIcons name="map-marker-check" size={16} color="#166534" />
                  <Text style={styles.successGeoText}>
                    GPS verified for {submissionResult.accepted} market report(s)
                  </Text>
                </View>

                <View style={styles.rewardSuccessCard}>
                  <View style={styles.rewardSuccessRow}>
                    <View style={styles.rewardPillIcon}>
                      <MaterialCommunityIcons name="wallet-plus-outline" size={20} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardEarnedTitle}>
                        +₦{submissionResult.walletAwarded ?? submissionResult.accepted ?? 1} Airtime Added to Wallet
                      </Text>
                      <Text style={styles.rewardEarnedSub}>
                        +{submissionResult.pointsAwarded ?? (submissionResult.accepted ?? 1) * 10} Community Points • Wallet Balance: ₦{user?.walletBalance ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            <Text style={styles.blockSub}>
              {queuedOffline
                ? 'No signal right now — this price is safely queued on your phone and will upload automatically when you reconnect.'
                : suggestionSent
                  ? `"${submissionResult?.productName || newProductName}" and its market price are now live in the app and visible in Manage Submissions.`
                  : `${submissionResult?.accepted ?? 1} price report(s) published live to the market catalog.${
                      submissionResult?.failed
                        ? ` ${submissionResult.failed} report(s) were not accepted: ${submissionResult.failureMessage || 'check the selected market location.'}`
                        : ''
                    } Thanks for keeping market prices accurate!`}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { alignSelf: 'stretch', marginTop: Spacing.lg }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropTap} onPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheetCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Drag Handle */}
          <View style={styles.sheetHandle} />

          {/* Sheet Header */}
          <View style={styles.topBar}>
            <View style={styles.headerIconBadge}>
              <MaterialCommunityIcons name="tag-plus-outline" size={20} color={Colors.primary.deepBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Submit Market Price</Text>
              <Text style={styles.subtitle}>Report live prices within 10 km of your market</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeBtn}
              accessibilityLabel="Close modal"
            >
              <MaterialCommunityIcons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {pendingCount > 0 ? (
            <TouchableOpacity style={styles.pendingBanner} onPress={() => void flushOfflineQueue()}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#92400E" />
              <Text style={styles.pendingBannerText}>
                Pending offline uploads ({pendingCount}) — tap to sync
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Mobile-Friendly Error Alert Card */}
          {errorMessage && !suggestingProduct ? (
            <View style={styles.alertCardError}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertCardTitle}>Check your entry</Text>
                <Text style={styles.alertCardBody}>{errorMessage}</Text>
              </View>
              <TouchableOpacity onPress={dismissError} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={18} color="#991B1B" />
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView
            ref={mainScrollRef}
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* STEP 1: Market Selection */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.stepLabel}>1. Select Market</Text>
                {marketIds.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => {
                      setMarketIds([]);
                      setAttemptedMarket(null);
                    }}
                    style={styles.clearChip}
                  >
                    <Text style={styles.clearChipText}>Clear ({marketIds.length})</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => void refreshLocation()} style={styles.gpsPill}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={13} color={Colors.primary.deepBlue} />
                    <Text style={styles.gpsPillText}>{refreshingGps ? 'Locating…' : userLoc ? 'GPS Ready' : 'Enable GPS'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {marketsQ.isLoading ? (
                <ActivityIndicator style={styles.inlineLoader} color={Colors.primary.deepBlue} />
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
                    const nearby = distance != null && distance <= marketRadiusKm(item);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.chip, !nearby && styles.chipDistant, active && styles.chipActive]}
                        onPress={() => handleToggleMarket(item)}
                      >
                        <MaterialCommunityIcons
                          name={active ? 'check-circle' : nearby ? 'map-marker-check-outline' : 'map-marker-off-outline'}
                          size={15}
                          color={active ? '#FFF' : nearby ? '#16A34A' : '#DC2626'}
                        />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {item.name.replace(' Market', '')}{' '}
                          {distance == null
                            ? '· no pin'
                            : `· ${distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {selectedMarkets.length ? (
                <View style={styles.selectedMarketBanner}>
                  <MaterialCommunityIcons name="check-decagram" size={16} color="#166534" />
                  <Text style={styles.selectedMarketText} numberOfLines={2}>
                    Reporting for: {selectedMarkets.map((market) => market.name).join(', ')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.hint}>Tap one or more markets within 10 km of your location.</Text>
              )}

              {/* Mobile-Friendly Location / Market Warning Banner */}
              {attemptedMarket ? (
                <View style={styles.alertCardWarning}>
                  <MaterialCommunityIcons name="map-marker-alert-outline" size={20} color="#B45309" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertWarningTitle}>Market cannot be selected</Text>
                    <Text style={styles.alertWarningBody}>{attemptedMarket}</Text>
                    <View style={styles.alertActionRow}>
                      <TouchableOpacity style={styles.alertMiniBtn} onPress={() => void refreshLocation()}>
                        <MaterialCommunityIcons name="refresh" size={14} color="#92400E" />
                        <Text style={styles.alertMiniBtnText}>{refreshingGps ? 'Checking GPS…' : 'Refresh my GPS'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setAttemptedMarket(null)} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={18} color="#92400E" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* STEP 2: Product Selection */}
            <View style={styles.sectionBlock}>
              <Text style={styles.stepLabel}>2. Select Commodity</Text>
              {selectedProduct ? (
                <View style={styles.prefillBox}>
                  <View style={styles.prefillIcon}>
                    <MaterialCommunityIcons name="basket-check-outline" size={20} color={Colors.primary.deepBlue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{selectedProduct.name}</Text>
                    <Text style={styles.productMeta}>Standard unit: {selectedProduct.unit}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setProductId(null)} style={styles.clearChip}>
                    <Text style={styles.clearChipText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.inputBoxRow}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
                    <TextInput
                      value={q}
                      onChangeText={setQ}
                      placeholder="Search commodity (e.g. Rice, Beans, Garri...)"
                      placeholderTextColor="#64748B"
                      style={styles.textInputField}
                      returnKeyType="search"
                    />
                    {q.trim() ? (
                      <TouchableOpacity onPress={() => setQ('')} hitSlop={8}>
                        <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <ScrollView
                    style={styles.productList}
                    contentContainerStyle={styles.productListContent}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {productsQ.isLoading ? (
                      <ActivityIndicator style={{ marginVertical: 14 }} color={Colors.primary.deepBlue} />
                    ) : filteredProducts.length ? (
                      visibleProducts.map((item) => {
                        const isSelected = productId === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.productRow, isSelected && styles.productRowActive]}
                            onPress={() => {
                              setProductId(item.id);
                              setFormError(null);
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.productName}>{item.name}</Text>
                              <Text style={styles.productMeta}>{item.unit}</Text>
                            </View>
                            <MaterialCommunityIcons
                              name={isSelected ? 'check-circle' : 'chevron-right'}
                              size={20}
                              color={isSelected ? Colors.primary.deepBlue : '#94A3B8'}
                            />
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptyProductSearch}>
                        <Text style={styles.emptyProductText}>No matching commodity found for “{q}”.</Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Suggest New Product Callout Button -> Opens Dedicated Bottom-Up Modal */}
                  <TouchableOpacity
                    style={styles.suggestTriggerCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      setFormError(null);
                      if (q.trim() && !newProductName.trim()) {
                        setNewProductName(q.trim());
                      }
                      setSuggestingProduct(true);
                    }}
                  >
                    <View style={styles.suggestTriggerIcon}>
                      <MaterialCommunityIcons name="plus-box-outline" size={20} color={Colors.primary.deepBlue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestTriggerTitle}>Can’t find the product?</Text>
                      <Text style={styles.suggestTriggerSub}>Tap to suggest a new commodity & submit its price</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.primary.deepBlue} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* STEP 3: Price per Selected Market */}
            <View style={styles.sectionBlock}>
              <Text style={styles.stepLabel}>3. Price at Selected Market (₦)</Text>
              {selectedMarkets.length === 0 ? (
                <View style={styles.placeholderStepCard}>
                  <MaterialCommunityIcons name="store-marker-outline" size={18} color="#64748B" />
                  <Text style={styles.placeholderStepText}>Select a market in Step 1 above to enter its price.</Text>
                </View>
              ) : (
                selectedMarkets.map((market) => (
                  <View key={market.id} style={{ marginBottom: 12 }}>
                    <Text style={styles.fieldSubLabel}>{market.name}</Text>
                    <View style={styles.inputBoxRow}>
                      <View style={styles.nairaPrefix}>
                        <Text style={styles.nairaPrefixText}>₦</Text>
                      </View>
                      <TextInput
                        value={marketPrices[market.id] || ''}
                        onChangeText={(value) => setMarketPrices((current) => ({ ...current, [market.id]: value }))}
                        keyboardType="numeric"
                        placeholder="Enter observed price (e.g. 3500)"
                        placeholderTextColor="#64748B"
                        style={styles.textInputField}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* STEP 4: Quantity & Notes */}
            <View style={styles.sectionBlock}>
              <Text style={styles.stepLabel}>4. Quantity & Unit</Text>
              <View style={styles.quantityRow}>
                <View style={[styles.inputBoxRow, styles.quantityInputWrap]}>
                  <TextInput
                    value={quantityValue}
                    onChangeText={setQuantityValue}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#64748B"
                    style={[styles.textInputField, { textAlign: 'center' }]}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitChips}>
                  {unitOptions.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.unitChip, quantityUnit === unit && styles.unitChipActive]}
                      onPress={() => setQuantityUnit(unit)}
                    >
                      <Text style={[styles.unitChipText, quantityUnit === unit && styles.unitChipTextActive]}>
                        {unit === 'custom' ? 'Other unit' : unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {quantityUnit === 'custom' ? (
                <View style={[styles.inputBoxRow, { marginBottom: 12 }]}>
                  <MaterialCommunityIcons name="scale-balance" size={18} color="#64748B" />
                  <TextInput
                    value={customUnit}
                    onChangeText={setCustomUnit}
                    placeholder="Enter custom unit (e.g. basket, paint rubber)"
                    placeholderTextColor="#64748B"
                    style={styles.textInputField}
                  />
                </View>
              ) : null}

              {isDifferentUnitSelected && selectedProduct ? (
                <View style={styles.unitVariantNotice}>
                  <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary.deepBlue} style={{ marginTop: 1 }} />
                  <Text style={styles.unitVariantNoticeText}>
                    You picked <Text style={{ fontWeight: '900' }}>{effectiveChosenUnit}</Text> instead of{' '}
                    <Text style={{ fontWeight: '900' }}>{selectedProduct.unit}</Text>. This will be saved separately as{' '}
                    <Text style={{ fontWeight: '900' }}>
                      {selectedProduct.name} ({effectiveChosenUnit})
                    </Text>{' '}
                    so it doesn’t alter the {selectedProduct.unit} price.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.fieldSubLabel}>Stall / Variety Notes (optional)</Text>
              <View style={styles.inputBoxRow}>
                <MaterialCommunityIcons name="note-text-outline" size={18} color="#64748B" />
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Stall B12, Derica measure, local variety"
                  placeholderTextColor="#64748B"
                  style={styles.textInputField}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, mutation.isPending && { opacity: 0.65 }]}
              disabled={mutation.isPending}
              onPress={() => {
                setSuggestingProduct(false);
                mutation.mutate();
              }}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>
                {mutation.isPending ? 'Submitting Price…' : 'Submit Market Price'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Dedicated Bottom-Up Modal for Suggesting a New Unrecorded Product */}
      <Modal
        visible={suggestingProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setSuggestingProduct(false)}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={() => setSuggestingProduct(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrapper}
          >
            <View style={[styles.sheetCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetHandle} />

              <View style={styles.topBar}>
                <View style={[styles.headerIconBadge, { backgroundColor: '#ECFDF5' }]}>
                  <MaterialCommunityIcons name="basket-plus-outline" size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Suggest a New Product</Text>
                  <Text style={styles.subtitle}>Add a missing item & its current market price</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSuggestingProduct(false);
                    dismissError();
                  }}
                  style={styles.closeBtn}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              {errorMessage ? (
                <View style={styles.alertCardError}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertCardTitle}>Missing or invalid details</Text>
                    <Text style={styles.alertCardBody}>{errorMessage}</Text>
                  </View>
                  <TouchableOpacity onPress={dismissError} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={18} color="#991B1B" />
                  </TouchableOpacity>
                </View>
              ) : null}

              <ScrollView
                contentContainerStyle={styles.formScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Market selection inside new product modal if not selected yet */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.stepLabel}>Market Location *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.marketChips}
                    style={styles.marketScroller}
                  >
                    {(marketsQ.data?.markets || []).map((item) => {
                      const active = marketIds.includes(item.id);
                      const distance = distanceToMarket(item);
                      const nearby = distance != null && distance <= marketRadiusKm(item);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.chip, !nearby && styles.chipDistant, active && styles.chipActive]}
                          onPress={() => handleToggleMarket(item)}
                        >
                          <MaterialCommunityIcons
                            name={active ? 'check-circle' : nearby ? 'map-marker-check-outline' : 'map-marker-off-outline'}
                            size={15}
                            color={active ? '#FFF' : nearby ? '#16A34A' : '#DC2626'}
                          />
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {item.name.replace(' Market', '')}{' '}
                            {distance == null
                              ? '· no pin'
                              : `· ${distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {attemptedMarket ? (
                    <View style={styles.alertCardWarning}>
                      <MaterialCommunityIcons name="map-marker-alert-outline" size={18} color="#B45309" />
                      <Text style={[styles.alertWarningBody, { flex: 1, marginTop: 0 }]}>{attemptedMarket}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Product Name */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.stepLabel}>Product Name *</Text>
                  <View style={styles.inputBoxRow}>
                    <MaterialCommunityIcons name="tag-text-outline" size={20} color="#64748B" />
                    <TextInput
                      value={newProductName}
                      onChangeText={setNewProductName}
                      placeholder="e.g. Ugu leaves, Yellow Garri, Plantain"
                      placeholderTextColor="#64748B"
                      style={styles.textInputField}
                    />
                  </View>
                </View>

                {/* Selling Unit */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.stepLabel}>How It Is Sold (Unit) *</Text>
                  <View style={styles.inputBoxRow}>
                    <MaterialCommunityIcons name="scale-balance" size={20} color="#64748B" />
                    <TextInput
                      value={newProductUnit}
                      onChangeText={setNewProductUnit}
                      placeholder="e.g. per bundle, per mudu, 50kg bag"
                      placeholderTextColor="#64748B"
                      style={styles.textInputField}
                    />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.unitChips, { marginTop: 8 }]}
                  >
                    {SUGGESTED_UNIT_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.unitChip, newProductUnit === preset && styles.unitChipActive]}
                        onPress={() => setNewProductUnit(preset)}
                      >
                        <Text style={[styles.unitChipText, newProductUnit === preset && styles.unitChipTextActive]}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Category Selection */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.stepLabel}>Category *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.unitChips, { marginBottom: 10 }]}
                  >
                    {(categoriesQ.data || []).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[styles.unitChip, categoryId === category.id && styles.unitChipActive]}
                        onPress={() => {
                          setCategoryId(category.id);
                          setNewCategoryName('');
                        }}
                      >
                        <Text style={[styles.unitChipText, categoryId === category.id && styles.unitChipTextActive]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.inputBoxRow}>
                    <MaterialCommunityIcons name="folder-plus-outline" size={20} color="#64748B" />
                    <TextInput
                      value={newCategoryName}
                      onChangeText={(value) => {
                        setNewCategoryName(value);
                        if (value.trim()) setCategoryId(null);
                      }}
                      placeholder="Or type a new category (e.g. Leafy Vegetables)"
                      placeholderTextColor="#64748B"
                      style={styles.textInputField}
                    />
                  </View>
                </View>

                {/* Price at Selected Market(s) */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.stepLabel}>Price Observed (₦) *</Text>
                  {selectedMarkets.length === 0 ? (
                    <View style={styles.placeholderStepCard}>
                      <MaterialCommunityIcons name="store-marker-outline" size={18} color="#64748B" />
                      <Text style={styles.placeholderStepText}>Select a market at the top to enter its price.</Text>
                    </View>
                  ) : (
                    selectedMarkets.map((market) => (
                      <View key={market.id} style={{ marginBottom: 10 }}>
                        <Text style={styles.fieldSubLabel}>{market.name}</Text>
                        <View style={styles.inputBoxRow}>
                          <View style={styles.nairaPrefix}>
                            <Text style={styles.nairaPrefixText}>₦</Text>
                          </View>
                          <TextInput
                            value={marketPrices[market.id] || ''}
                            onChangeText={(value) => setMarketPrices((current) => ({ ...current, [market.id]: value }))}
                            keyboardType="numeric"
                            placeholder="Enter price in Naira (e.g. 2500)"
                            placeholderTextColor="#64748B"
                            style={styles.textInputField}
                          />
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Optional Note */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.stepLabel}>Short Note (optional)</Text>
                  <View style={styles.inputBoxRow}>
                    <MaterialCommunityIcons name="note-text-outline" size={20} color="#64748B" />
                    <TextInput
                      value={newItemReason}
                      onChangeText={setNewItemReason}
                      placeholder="e.g. Fresh harvest bundle, wholesale price"
                      placeholderTextColor="#64748B"
                      style={styles.textInputField}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, mutation.isPending && { opacity: 0.65 }]}
                  disabled={mutation.isPending}
                  onPress={() => mutation.mutate()}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>
                    {mutation.isPending ? 'Publishing…' : 'Publish Product & Price'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backToCatalogBtn}
                  onPress={() => {
                    setSuggestingProduct(false);
                    dismissError();
                  }}
                >
                  <Text style={styles.backToCatalogText}>← Back to existing products</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheetWrapper: {
    width: '100%',
    maxHeight: '92%',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    maxHeight: '100%',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h2,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: 10,
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
  pendingBannerText: { flex: 1, color: '#92400E', fontWeight: '800', fontSize: 12 },
  alertCardError: {
    marginHorizontal: Spacing.lg,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  alertCardTitle: {
    color: '#991B1B',
    fontWeight: '900',
    fontSize: 13,
  },
  alertCardBody: {
    color: '#B91C1C',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  alertCardWarning: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  alertWarningTitle: {
    color: '#92400E',
    fontWeight: '900',
    fontSize: 13,
  },
  alertWarningBody: {
    color: '#B45309',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  alertActionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  alertMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  alertMiniBtnText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 11,
  },
  formScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 14,
    paddingBottom: Spacing.xl,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepLabel: {
    fontWeight: '900',
    color: '#0F172A',
    fontSize: 14,
    marginBottom: 8,
  },
  fieldSubLabel: {
    marginBottom: 6,
    color: '#334155',
    fontWeight: '800',
    fontSize: 12,
  },
  clearChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  clearChipText: { color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 12 },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsPillText: {
    color: Colors.primary.deepBlue,
    fontWeight: '800',
    fontSize: 11,
  },
  inlineLoader: { alignSelf: 'flex-start', marginVertical: Spacing.sm },
  marketScroller: { minHeight: 44 },
  marketChips: { gap: 8, alignItems: 'center', paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 40,
  },
  chipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  chipText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#FFF' },
  chipDistant: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  selectedMarketBanner: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedMarketText: { flex: 1, color: '#166534', fontWeight: '800', fontSize: 12 },
  hint: { marginTop: 6, color: '#64748B', fontWeight: '600', fontSize: 12 },
  inputBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 8,
  },
  textInputField: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
  },
  nairaPrefix: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nairaPrefixText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 14,
  },
  prefillBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prefillIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productList: {
    maxHeight: 185,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  productListContent: { paddingVertical: 4 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  productRowActive: { backgroundColor: '#EFF6FF' },
  productName: { fontWeight: '800', color: '#0F172A', fontSize: 14 },
  productMeta: { marginTop: 2, color: '#64748B', fontSize: 12, fontWeight: '600' },
  emptyProductSearch: {
    padding: 14,
    alignItems: 'center',
  },
  emptyProductText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestTriggerCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestTriggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestTriggerTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  suggestTriggerSub: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 11,
    marginTop: 1,
  },
  placeholderStepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderStepText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  quantityRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  quantityInputWrap: { width: 84 },
  unitChips: { gap: 8, alignItems: 'center', paddingRight: Spacing.md },
  unitChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  unitChipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  unitChipText: { color: '#334155', fontWeight: '800', fontSize: 12 },
  unitChipTextActive: { color: '#FFF' },
  primaryBtn: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFF', ...Typography.body, fontWeight: '900', fontSize: 15 },
  backToCatalogBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  backToCatalogText: {
    color: Colors.primary.deepBlue,
    fontWeight: '800',
    fontSize: 13,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  stateIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: { ...Typography.h2, color: '#0F172A', marginTop: Spacing.md, textAlign: 'center', fontWeight: '900' },
  blockSub: { ...Typography.body, color: '#64748B', marginTop: Spacing.sm, textAlign: 'center', lineHeight: 20, fontSize: 14 },
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
  rewardSuccessCard: {
    alignSelf: 'stretch',
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  rewardSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardPillIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardEarnedTitle: {
    color: '#14532D',
    fontWeight: '900',
    fontSize: 15,
  },
  rewardEarnedSub: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
  unitVariantNotice: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  unitVariantNoticeText: {
    flex: 1,
    color: '#1E3A8A',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  link: { color: Colors.primary.deepBlue, fontWeight: '800' },
});
