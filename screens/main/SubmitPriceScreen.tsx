import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchMarkets } from '@/services/marketsApi';
import { fetchProducts } from '@/services/catalogApi';
import { submitPrice } from '@/services/userApi';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function SubmitPriceScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const setUser = useStore((s) => s.setUser);
  const user = useStore((s) => s.user);

  const initialMarketId = route.params?.marketId as number | undefined;
  const initialProductId = route.params?.productId as number | undefined;

  const [marketId, setMarketId] = useState<number | null>(initialMarketId ?? null);
  const [productId, setProductId] = useState<number | null>(initialProductId ?? null);
  const [price, setPrice] = useState('');
  const [quantityValue, setQuantityValue] = useState('1');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [q, setQ] = useState('');
  const [success, setSuccess] = useState(false);
  const scale = React.useRef(new Animated.Value(0)).current;

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
  const unitOptions = useMemo(() => {
    const base = selectedProduct?.unit ? [selectedProduct.unit] : [];
    return Array.from(new Set([...base, 'modu', 'kg', 'bag', 'custom']));
  }, [selectedProduct?.unit]);

  React.useEffect(() => {
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
      return submitPrice({
        market_id: marketId,
        product_id: productId,
        price: p,
        quantity_value: qty,
        quantity_unit: unit,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      setSuccess(true);
      if (user) {
        setUser({ ...user, points: data.user.points });
      }
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    },
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="lock-outline" size={44} color={Colors.primary.deepBlue} />
          <Text style={styles.blockTitle}>Sign in to submit prices</Text>
          <Text style={styles.blockSub}>Earn points and help your community keep Abuja prices accurate.</Text>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialCommunityIcons name="check-decagram" size={72} color={Colors.primary.vibrantGreen} />
          </Animated.View>
          <Text style={styles.blockTitle}>Submitted</Text>
          <Text style={styles.blockSub}>You earned +5 points. Thanks for helping Market Eye.</Text>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.primary.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.title}>Submit a price</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Market</Text>
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
              <TouchableOpacity key={item.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setMarketId(item.id)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name.replace(' Market', '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {selectedMarket ? (
        <Text style={styles.selected}>Selected: {selectedMarket.name}</Text>
      ) : (
        <Text style={styles.hint}>Select a market</Text>
      )}

      <Text style={[styles.label, { marginTop: Spacing.md }]}>Product</Text>
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
        <TextInput value={q} onChangeText={setQ} placeholder="Search products…" style={styles.searchInput} />
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
          <Text style={{ color: '#6B7280' }}>No products.</Text>
        )}
      </ScrollView>
      {selectedProduct ? (
        <Text style={styles.selected}>Selected: {selectedProduct.name}</Text>
      ) : (
        <Text style={styles.hint}>Select a product</Text>
      )}

      <View style={{ paddingHorizontal: Spacing.lg }}>
        <Text style={styles.label}>Price (₦)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="e.g. 3500"
          style={styles.input}
        />

        <Text style={styles.labelNoPad}>Quantity this price covers</Text>
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
            placeholder="Enter unit, e.g. basket"
            style={styles.input}
          />
        ) : null}

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Variety, stall location…" style={styles.input} />

        <TouchableOpacity
          style={[styles.primaryBtn, mutation.isPending && { opacity: 0.6 }]}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate()}
        >
          <Text style={styles.primaryBtnText}>{mutation.isPending ? 'Submitting…' : 'Submit price'}</Text>
        </TouchableOpacity>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { ...Typography.h2, color: '#111827', fontSize: 22, flex: 1 },
  formScroll: { paddingBottom: Spacing.xl },
  label: { paddingHorizontal: Spacing.lg, marginBottom: 8, fontWeight: '800', color: '#111827' },
  labelNoPad: { marginBottom: 8, fontWeight: '800', color: '#111827' },
  inlineLoader: { alignSelf: 'flex-start', marginLeft: Spacing.lg, marginVertical: Spacing.sm },
  marketScroller: { minHeight: 48, maxHeight: 56 },
  marketChips: { paddingHorizontal: Spacing.lg, gap: 12, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: 220,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  chipText: { color: '#6B7280', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#FFF' },
  selected: { paddingHorizontal: Spacing.lg, marginTop: 8, color: '#111827', fontWeight: '700' },
  hint: { paddingHorizontal: Spacing.lg, marginTop: 8, color: '#9CA3AF', fontWeight: '600' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: '#111827' },
  productList: {
    maxHeight: 220,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  productListContent: { paddingBottom: 4 },
  productRow: { paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#EEF2F7', borderRadius: 10 },
  productRowActive: { backgroundColor: '#EEF2FF' },
  productName: { fontWeight: '900', color: '#111827' },
  productMeta: { marginTop: 2, color: '#6B7280', fontSize: 12 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.md,
    color: '#111827',
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
    borderColor: '#E5E7EB',
  },
  unitChipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  unitChipText: { color: '#6B7280', fontWeight: '800' },
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
  blockTitle: { ...Typography.h2, color: '#111827', marginTop: Spacing.md, textAlign: 'center' },
  blockSub: { ...Typography.body, color: '#6B7280', marginTop: Spacing.sm, textAlign: 'center' },
  link: { color: Colors.primary.deepBlue, fontWeight: '800' },
  errorText: { marginTop: Spacing.md, color: '#DC2626', fontWeight: '700' },
});
