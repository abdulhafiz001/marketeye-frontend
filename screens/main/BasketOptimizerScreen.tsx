import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCurrentUserLocation } from '@/services/locationService';

import { Colors, Spacing, Typography } from '@/constants/colors';
import { fetchProducts } from '@/services/catalogApi';
import { compareBasket, type BasketMarketResult, type BasketCompareResponse } from '@/services/pricesApi';

interface BasketItem {
  productId: number;
  productName: string;
  unit: string;
  quantity: number;
}

export default function BasketOptimizerScreen() {
  const navigation = useNavigation<any>();

  const [basket, setBasket] = useState<BasketItem[]>([
    { productId: 1, productName: 'Rice (Foreign/Local)', unit: '50kg Bag', quantity: 1 },
    { productId: 2, productName: 'Beans (Oloyin)', unit: 'Modu', quantity: 4 },
  ]);

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const productsQ = useQuery({ queryKey: ['products'], queryFn: fetchProducts, staleTime: 5 * 60 * 1000 });

  // Fetch current GPS location for distance-aware transit cost calculation
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

  const compareMutation = useMutation<BasketCompareResponse, Error>({
    mutationFn: () =>
      compareBasket({
        items: basket.map((b) => ({ product_id: b.productId, quantity: b.quantity })),
        latitude: userLoc?.lat,
        longitude: userLoc?.lng,
      }),
  });

  // Auto-run comparison when basket changes
  useEffect(() => {
    if (basket.length > 0) {
      compareMutation.mutate();
    }
  }, [basket, userLoc]);

  const filteredProducts = useMemo(() => {
    const list = productsQ.data || [];
    const s = productSearch.trim().toLowerCase();
    const existingIds = new Set(basket.map((b) => b.productId));
    const available = list.filter((p) => !existingIds.has(p.id));
    if (!s) return available.slice(0, 30);
    return available.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 30);
  }, [productsQ.data, productSearch, basket]);

  const addItem = (product: any) => {
    setBasket((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        unit: product.unit || 'unit',
        quantity: 1,
      },
    ]);
    setModalOpen(false);
    setProductSearch('');
  };

  const updateQuantity = (productId: number, delta: number) => {
    setBasket((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = Math.max(0.5, Math.round((item.quantity + delta) * 10) / 10);
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: number) => {
    setBasket((prev) => prev.filter((item) => item.productId !== productId));
  };

  const results = compareMutation.data;
  const optimalMarket = results?.optimal_market;
  const otherMarkets = results?.markets?.filter((m) => m.market.id !== optimalMarket?.market.id) || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Smart Grocery Basket</Text>
          <Text style={styles.headerSubtitle}>Find the cheapest market in Abuja for your full list</Text>
        </View>
        <TouchableOpacity style={styles.addItemBtn} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
          <Text style={styles.addItemBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Basket List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Shopping List ({basket.length})</Text>
          {basket.length > 0 ? (
            <TouchableOpacity onPress={() => setBasket([])}>
              <Text style={styles.clearText}>Clear List</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {basket.length === 0 ? (
          <View style={styles.emptyBasketCard}>
            <MaterialCommunityIcons name="cart-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyBasketTitle}>Your basket is empty</Text>
            <Text style={styles.emptyBasketDesc}>
              Add commodities (Rice, Beans, Garri, Tomatoes) to see which Abuja market will save you the most money.
            </Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setModalOpen(true)}>
              <Text style={styles.addFirstBtnText}>+ Add Commodities</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.basketList}>
            {basket.map((item) => (
              <View key={item.productId} style={styles.basketItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.basketItemName}>{item.productName}</Text>
                  <Text style={styles.basketItemUnit}>Unit: {item.unit}</Text>
                </View>

                {/* Quantity Stepper */}
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => updateQuantity(item.productId, -1)}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color="#334155" />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => updateQuantity(item.productId, 1)}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color="#334155" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.productId)} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Results Section */}
        {basket.length > 0 ? (
          <View style={styles.resultsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Market Cost Comparison</Text>
              {userLoc ? (
                <View style={styles.gpsBadge}>
                  <MaterialCommunityIcons name="crosshairs-gps" size={12} color="#16A34A" />
                  <Text style={styles.gpsText}>GPS Aware</Text>
                </View>
              ) : null}
            </View>

            {compareMutation.isPending ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={Colors.primary.deepBlue} size="large" />
                <Text style={styles.loadingText}>Calculating best market prices across Abuja...</Text>
              </View>
            ) : optimalMarket ? (
              <>
                {/* Winner Card */}
                <View style={styles.winnerCard}>
                  <View style={styles.winnerBadge}>
                    <MaterialCommunityIcons name="crown" size={16} color="#FFF" />
                    <Text style={styles.winnerBadgeText}>CHEAPEST OPTION</Text>
                  </View>

                  <Text style={styles.winnerMarketName}>{optimalMarket.market.name}</Text>
                  <Text style={styles.winnerMarketArea}>
                    {optimalMarket.market.area}
                    {optimalMarket.distance_km ? ` • ${optimalMarket.distance_km} km away` : ''}
                  </Text>

                  <View style={styles.winnerPriceRow}>
                    <View>
                      <Text style={styles.winnerPriceLabel}>Total Basket Cost</Text>
                      <Text style={styles.winnerPriceValue}>₦{optimalMarket.basket_cost.toLocaleString()}</Text>
                    </View>
                    {results?.potential_savings && results.potential_savings > 0 ? (
                      <View style={styles.savingsBox}>
                        <Text style={styles.savingsLabel}>You Save</Text>
                        <Text style={styles.savingsValue}>+₦{results.potential_savings.toLocaleString()}</Text>
                      </View>
                    ) : null}
                  </View>

                  {optimalMarket.estimated_transit_cost > 0 ? (
                    <Text style={styles.transitHint}>
                      Est. Transit (~₦{optimalMarket.estimated_transit_cost.toLocaleString()}) • Total: ₦
                      {optimalMarket.total_with_transit.toLocaleString()}
                    </Text>
                  ) : null}

                  {/* Item breakdown */}
                  <View style={styles.breakdownList}>
                    {optimalMarket.breakdown.map((b) => (
                      <View key={b.product_id} style={styles.breakdownRow}>
                        <Text style={styles.breakdownProduct}>
                          {b.product_name} (x{b.quantity})
                        </Text>
                        <Text style={styles.breakdownPrice}>
                          {b.subtotal ? `₦${b.subtotal.toLocaleString()}` : 'Not reported'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.viewMarketBtn}
                    onPress={() =>
                      navigation.navigate('Markets', {
                        screen: 'MarketDetail',
                        params: {
                          marketId: optimalMarket.market.id,
                          marketName: optimalMarket.market.name,
                        },
                      })
                    }
                  >
                    <Text style={styles.viewMarketText}>View Market Stalls</Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Other Markets List */}
                {otherMarkets.length > 0 ? (
                  <View style={styles.otherMarketsWrap}>
                    <Text style={styles.otherTitle}>Other Abuja Markets</Text>
                    {otherMarkets.map((m) => (
                      <View key={m.market.id} style={styles.otherMarketCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.otherMarketName}>{m.market.name}</Text>
                          <Text style={styles.otherMarketMeta}>
                            {m.market.area}
                            {m.distance_km ? ` • ${m.distance_km} km` : ''}
                            {m.missing_items.length ? ` • (${m.missing_items.length} items unpriced)` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.otherMarketPrice}>₦{m.basket_cost.toLocaleString()}</Text>
                          {m.basket_cost > optimalMarket.basket_cost ? (
                            <Text style={styles.diffText}>
                              +₦{(m.basket_cost - optimalMarket.basket_cost).toLocaleString()}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add to Grocery Basket</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={22} color="#64748B" />
              <TextInput
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search commodities (e.g. Rice, Beans, Garri...)"
                placeholderTextColor="#64748B"
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => String(item.id)}
              style={{ maxHeight: 350 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.productRow} onPress={() => addItem(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prodName}>{item.name}</Text>
                    <Text style={styles.prodMeta}>{item.unit}</Text>
                  </View>
                  <MaterialCommunityIcons name="plus-circle" size={24} color={Colors.primary.deepBlue} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 20 }}>
                  No available items found.
                </Text>
              }
            />
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
  addItemBtn: {
    backgroundColor: Colors.primary.deepBlue,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addItemBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 120 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.h3, fontSize: 16, fontWeight: '900', color: '#0F172A' },
  clearText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  emptyBasketCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  emptyBasketTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  emptyBasketDesc: { textAlign: 'center', color: '#64748B', lineHeight: 20, fontSize: 13, fontWeight: '500' },
  addFirstBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFirstBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  basketList: { gap: 10, marginBottom: Spacing.lg },
  basketItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  basketItemName: { fontWeight: '800', fontSize: 15, color: '#0F172A' },
  basketItemUnit: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    gap: 6,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepValue: { fontSize: 14, fontWeight: '900', color: '#0F172A', minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 4 },
  resultsSection: { marginTop: Spacing.sm },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  gpsText: { color: '#166534', fontWeight: '800', fontSize: 11 },
  loadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  loadingText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  winnerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  winnerBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  winnerMarketName: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  winnerMarketArea: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginTop: 2 },
  winnerPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  winnerPriceLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  winnerPriceValue: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 2 },
  savingsBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  savingsLabel: { color: '#86EFAC', fontSize: 11, fontWeight: '800' },
  savingsValue: { color: '#22C55E', fontSize: 16, fontWeight: '900' },
  transitHint: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  breakdownList: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: Spacing.md,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownProduct: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  breakdownPrice: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  viewMarketBtn: {
    backgroundColor: Colors.primary.vibrantGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  viewMarketText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  otherMarketsWrap: { gap: 10 },
  otherTitle: { ...Typography.h3, fontSize: 15, fontWeight: '800', color: '#475569', marginBottom: 4 },
  otherMarketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  otherMarketName: { fontWeight: '800', fontSize: 14, color: '#0F172A' },
  otherMarketMeta: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  otherMarketPrice: { fontWeight: '900', fontSize: 16, color: '#0F172A' },
  diffText: { color: '#EF4444', fontSize: 11, fontWeight: '800', marginTop: 2 },
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
    maxHeight: '80%',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 52,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    color: '#0F172A',
    fontWeight: '600',
    minHeight: 44,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  prodName: { fontWeight: '800', fontSize: 15, color: '#0F172A' },
  prodMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
