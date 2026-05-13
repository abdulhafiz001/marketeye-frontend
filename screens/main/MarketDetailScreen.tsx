import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '@/services/catalogApi';
import { fetchMarketPrices, type MarketPriceRow } from '@/services/marketsApi';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function MarketDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const marketId: number = route.params?.marketId;
  const marketName: string | undefined = route.params?.marketName;

  const [category, setCategory] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: 5 * 60 * 1000 });
  const pricesQ = useQuery({
    queryKey: ['market-prices', marketId, category, search],
    queryFn: () => fetchMarketPrices(marketId, { category, search: search.trim() || undefined }),
    enabled: Number.isFinite(marketId),
    staleTime: search.trim() ? 30 * 1000 : 2 * 60 * 1000,
  });

  const rows = pricesQ.data?.prices ?? [];

  const confidenceLabel = (r: MarketPriceRow) => {
    if (r.confidence_level === 'stale') return { text: 'Stale', icon: 'clock-alert-outline' as const, color: '#F59E0B' };
    if (r.confidence_level === 'low') return { text: 'Low confidence', icon: 'alert-circle-outline' as const, color: '#F97316' };
    return { text: 'High confidence', icon: 'check-decagram' as const, color: '#16A34A' };
  };

  const headerMarketName = pricesQ.data?.market?.name || marketName || 'Market';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.primary.deepBlue} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{headerMarketName}</Text>
          <Text style={styles.sub}>{pricesQ.data?.market?.area || 'Abuja'}</Text>
        </View>
      </View>

      {pricesQ.data?.market?.description ? (
        <Text style={styles.desc}>{pricesQ.data.market.description}</Text>
      ) : null}

      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products…"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      <View style={{ paddingLeft: Spacing.lg, marginBottom: Spacing.sm }}>
        <FlatList
          horizontal
          data={[{ slug: undefined, name: 'All' } as any].concat((categoriesQ.data || []).map((c) => ({ slug: c.slug, name: c.name })))}
          keyExtractor={(item, idx) => String(item.slug ?? 'all') + idx}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = (item.slug || undefined) === category;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(item.slug)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {pricesQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : pricesQ.isError ? (
        <View style={styles.center}>
          <Text style={styles.err}>Could not load prices. Pull to retry.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
          data={rows}
          keyExtractor={(item) => String(item.product.id)}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const c = confidenceLabel(item);
            return (
              <View style={styles.card}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.pName}>{item.product.name}</Text>
                  <Text style={styles.pUnit}>{item.product.unit}</Text>
                  <Text style={styles.range}>
                    ₦{item.min_price.toLocaleString()} – ₦{item.max_price.toLocaleString()}
                  </Text>
                  <View style={styles.confRow}>
                    <MaterialCommunityIcons name={c.icon} size={16} color={c.color} />
                    <Text style={[styles.confText, { color: c.color }]}>{c.text}</Text>
                    {item.is_stale ? <Text style={styles.stale}> • Stale</Text> : null}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.avg}>₦{item.avg_price.toLocaleString()}</Text>
                  <Text style={styles.avgLbl}>avg</Text>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() =>
                      navigation.navigate('CommodityDetail', {
                        productId: item.product.id,
                        marketId,
                        marketName: headerMarketName,
                      })
                    }
                  >
                    <Text style={styles.submitBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
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
  title: { ...Typography.h2, color: '#111827', fontSize: 22 },
  sub: { color: '#6B7280', marginTop: 2 },
  desc: { paddingHorizontal: Spacing.lg, color: '#6B7280', marginBottom: Spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: '#111827' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  chipText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { color: '#6B7280' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
  },
  pName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  pUnit: { marginTop: 2, color: '#6B7280', fontSize: 12 },
  range: { marginTop: 8, color: '#6B7280', fontSize: 12 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  confText: { fontSize: 12, fontWeight: '700' },
  stale: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  avg: { fontSize: 20, fontWeight: '900', color: Colors.primary.deepBlue },
  avgLbl: { marginTop: 2, fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  submitBtn: {
    marginTop: 10,
    backgroundColor: Colors.primary.deepBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
});
