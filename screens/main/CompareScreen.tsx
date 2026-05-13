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
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { fetchProducts } from '@/services/catalogApi';
import { fetchCompare } from '@/services/pricesApi';
import { Colors, Spacing, Typography } from '@/constants/colors';

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export default function CompareScreen() {
  const [q, setQ] = useState('');
  const [productId, setProductId] = useState<number | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const productsQ = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

  React.useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  const filtered = useMemo(() => {
    const list = productsQ.data || [];
    if (!q.trim()) return list.slice(0, 30);
    const s = q.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(s)).slice(0, 40);
  }, [productsQ.data, q]);

  const compareQ = useQuery({
    queryKey: ['compare', productId],
    queryFn: () => fetchCompare(productId as number),
    enabled: !!productId,
  });

  const markets = compareQ.data?.markets || [];
  const cheapestId = useMemo(() => {
    if (!markets.length) return null;
    const sorted = [...markets].sort((a, b) => a.avg_price - b.avg_price);
    return sorted[0]?.market?.id ?? null;
  }, [markets]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Compare prices</Text>
        <Text style={styles.sub}>Find the cheapest market for a product.</Text>
      </View>

      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search products…"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        style={{ maxHeight: 220 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.productRow, productId === item.id && styles.productRowActive]}
            onPress={() => setProductId(item.id)}
          >
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>{item.unit}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          productsQ.isLoading ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: '#6B7280', paddingHorizontal: Spacing.lg }}>No matches.</Text>
          )
        }
      />

      {compareQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : compareQ.isError ? (
        <View style={styles.center}>
          <Text style={styles.err}>Could not load comparison.</Text>
        </View>
      ) : !productId ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Select a product to compare markets.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
          data={markets}
          keyExtractor={(item) => String(item.market.id)}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const isBest = item.market.id === cheapestId;
            let distLabel: string | null = null;
            if (
              userLoc &&
              item.market.lat != null &&
              item.market.lng != null &&
              typeof item.market.lat === 'number' &&
              typeof item.market.lng === 'number'
            ) {
              const km = distanceKm(userLoc, { lat: item.market.lat, lng: item.market.lng });
              distLabel = `${km.toFixed(1)} km away`;
            }

            return (
              <View style={[styles.row, isBest && styles.rowBest]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mName}>{item.market.name}</Text>
                  <Text style={styles.mArea}>{item.market.area || 'Abuja'}</Text>
                  {distLabel ? <Text style={styles.dist}>{distLabel}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {isBest ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Cheapest</Text>
                    </View>
                  ) : null}
                  <Text style={styles.price}>₦{item.avg_price.toLocaleString()}</Text>
                  <Text style={styles.date}>{item.snapshot_date}</Text>
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
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { ...Typography.h2, color: '#111827', fontSize: 24 },
  sub: { marginTop: 4, color: '#6B7280' },
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
  productRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  productRowActive: { backgroundColor: '#EEF2FF' },
  productName: { fontWeight: '800', color: '#111827' },
  productMeta: { marginTop: 2, color: '#6B7280', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { color: '#6B7280' },
  hint: { color: '#6B7280' },
  row: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
  },
  rowBest: { borderColor: 'rgba(22, 163, 74, 0.35)', backgroundColor: '#F0FDF4' },
  mName: { fontWeight: '900', color: '#111827' },
  mArea: { marginTop: 2, color: '#6B7280', fontSize: 12 },
  dist: { marginTop: 6, color: '#6B7280', fontSize: 12, fontWeight: '700' },
  badge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  badgeText: { color: '#166534', fontWeight: '900', fontSize: 11 },
  price: { fontSize: 18, fontWeight: '900', color: Colors.primary.deepBlue },
  date: { marginTop: 2, fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
});
