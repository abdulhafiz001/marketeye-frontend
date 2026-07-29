import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { Colors, Spacing, Typography } from '@/constants/colors';
import { fetchProductDetail } from '@/services/catalogApi';
import { deleteMarketWatch, saveMarketWatch } from '@/services/userApi';
import { getStoreState, useStore } from '@/store/useStore';

const { width } = Dimensions.get('window');

function formatNaira(value: number | null | undefined) {
  if (value === null || value === undefined) return 'No price yet';
  return `₦${Number(value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export default function CommodityDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const productId = Number(route.params?.productId ?? route.params?.commodityId);
  const marketId = route.params?.marketId ? Number(route.params.marketId) : null;
  const routeMarketName = route.params?.marketName as string | undefined;
  const marketWatchlist = useStore((state) => state.marketWatchlist);
  const addMarketWatch = useStore((state) => state.addMarketWatch);
  const removeMarketWatch = useStore((state) => state.removeMarketWatch);
  const updateMarketWatchPrice = useStore((state) => state.updateMarketWatchPrice);
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  const productQ = useQuery({
    queryKey: ['product-detail', productId, marketId],
    queryFn: () => fetchProductDetail(productId, marketId),
    enabled: Number.isFinite(productId) && productId > 0,
  });

  const data = productQ.data;
  const product = data?.product;
  const averagePrice = data?.stats.average_price ?? null;
  const cheapest = data?.stats.cheapest_market;
  const selectedMarket = marketId ? data?.markets.find((row) => row.market.id === marketId) : null;
  const focusMarketName = selectedMarket?.market.name || routeMarketName;
  const focusPrice = selectedMarket?.avg_price ?? averagePrice;
  const watchId = marketId ? `${marketId}:${productId}` : null;
  const watched = watchId ? marketWatchlist.find((item) => item.id === watchId) : null;
  const history = data?.history || [];
  const priceChanges = data?.price_changes || [];
  const chartValues = history.length ? history.map((point) => point.avg_price) : [0];
  const chartLabels = history.length
    ? history.map((point, index) => {
        const d = new Date(point.date);
        return index % Math.max(1, Math.floor(history.length / 5)) === 0
          ? `${d.getDate()}/${d.getMonth() + 1}`
          : '';
      })
    : [''];

  React.useEffect(() => {
    if (!watchId || !watched || !product || focusPrice === null || focusPrice === undefined) {
      return;
    }

    if (watched.lastPrice && watched.lastPrice > 0 && watched.lastPrice !== focusPrice) {
      const percentChange = ((focusPrice - watched.lastPrice) / watched.lastPrice) * 100;
      if (Math.abs(percentChange) >= 1) {
        const direction = percentChange > 0 ? 'higher' : 'lower';
        const message = `${product.name} is ${Math.abs(percentChange).toFixed(1)}% ${direction} in ${focusMarketName || 'this market'} than the last update.`;
        getStoreState().addNotification({
          id: `watch:${watchId}:${Date.now()}`,
          message,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (watched.lastPrice !== focusPrice) {
      updateMarketWatchPrice(watchId, focusPrice);
    }
  }, [focusMarketName, focusPrice, marketId, product, updateMarketWatchPrice, watchId, watched]);

  const toggleWatch = async () => {
    if (!watchId || !product || !marketId) {
      return;
    }
    if (watched) {
      removeMarketWatch(watchId);
      if (isAuthenticated) {
        try {
          await deleteMarketWatch(product.id, marketId);
        } catch {
          addMarketWatch(watched);
        }
      }
      return;
    }
    const nextWatch = {
      id: watchId,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      marketId,
      marketName: focusMarketName || 'Market',
      lastPrice: focusPrice ?? null,
      lastCheckedAt: new Date().toISOString(),
    };
    addMarketWatch(nextWatch);
    if (isAuthenticated) {
      try {
        const synced = await saveMarketWatch({
          productId: product.id,
          marketId,
          lastPrice: focusPrice ?? null,
        });
        updateMarketWatchPrice(synced.id, synced.lastPrice);
      } catch {
        // Keep the local watch so the UI still feels instant.
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.primary.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product?.name || 'Product details'}
        </Text>
        {product && marketId ? (
          <TouchableOpacity style={[styles.iconBtn, watched && styles.iconBtnActive]} onPress={toggleWatch}>
            <MaterialCommunityIcons
              name={watched ? 'heart' : 'heart-outline'}
              size={22}
              color={watched ? '#FFF' : Colors.primary.deepBlue}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {productQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading product details...</Text>
        </View>
      ) : productQ.isError || !product ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="alert-circle-outline" size={42} color="#DC2626" />
          <Text style={styles.emptyTitle}>Could not load this product</Text>
          <Text style={styles.muted}>Please check your connection and try again.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.categoryText}>{product.category?.name || 'Product'}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.avgPrice}>{formatNaira(averagePrice)}</Text>
            <Text style={styles.unitText}>Average price per {product.unit}</Text>
            {focusMarketName ? (
              <Text style={styles.marketWatchHint}>
                {watched ? `Watching ${focusMarketName}` : `Tap the heart to watch prices in ${focusMarketName}`}
              </Text>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Cheapest market</Text>
              <Text style={styles.statValue} numberOfLines={2}>
                {cheapest?.market?.name || 'Not available yet'}
              </Text>
              {cheapest ? <Text style={styles.statSub}>{formatNaira(cheapest.avg_price)}</Text> : null}
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Markets tracked</Text>
              <Text style={styles.statValue}>{data.stats.market_count}</Text>
              <Text style={styles.statSub}>with recent prices</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Price history</Text>
              <Text style={styles.sectionSub}>
                {marketId ? focusMarketName || 'Selected market' : 'All markets avg'}
              </Text>
            </View>
            {history.length ? (
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: chartValues }],
                }}
                width={width - Spacing.lg * 4}
                height={220}
                yAxisLabel="₦"
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(11, 18, 32, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  propsForBackgroundLines: { stroke: '#EEF2F7' },
                  propsForDots: { r: '3', strokeWidth: '1', stroke: Colors.primary.deepBlue },
                }}
                bezier
                withInnerLines
                withOuterLines={false}
                style={styles.chart}
              />
            ) : (
              <Text style={styles.muted}>No chart data yet. Approved submissions will appear here.</Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>When prices changed</Text>
              <Text style={styles.sectionSub}>Date-stamped updates</Text>
            </View>
            {priceChanges.length ? (
              priceChanges.slice(0, 12).map((change) => {
                const up = change.direction === 'up';
                const down = change.direction === 'down';
                return (
                  <View key={`${change.date}-${change.price}`} style={styles.changeRow}>
                    <View
                      style={[
                        styles.changeDot,
                        up && styles.changeDotUp,
                        down && styles.changeDotDown,
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.changeDate}>{change.label}</Text>
                      <Text style={styles.muted}>{change.note}</Text>
                      {change.previous_price != null ? (
                        <Text style={styles.muted}>
                          Was {formatNaira(change.previous_price)} → now {formatNaira(change.price)}
                        </Text>
                      ) : (
                        <Text style={styles.muted}>Recorded at {formatNaira(change.price)}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.marketPrice}>{formatNaira(change.price)}</Text>
                      {change.change_percent != null ? (
                        <Text style={{ color: up ? '#DC2626' : '#16A34A', fontWeight: '900', fontSize: 12 }}>
                          {up ? '+' : ''}
                          {change.change_percent}%
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.muted}>
                Price changes appear here with the date once verified submissions update the market.
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Market prices</Text>
            {data.markets.length ? (
              data.markets.map((row, index) => (
                <View key={`${row.market.id}-${row.snapshot_date}`} style={styles.marketRow}>
                  <View style={styles.marketIcon}>
                    <MaterialCommunityIcons name="storefront-outline" size={20} color={Colors.primary.deepBlue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.marketName}>{row.market.name}</Text>
                    <Text style={styles.muted}>
                      {row.market.area || 'Abuja'}
                      {row.as_of || row.snapshot_date
                        ? ` · as of ${row.as_of || row.snapshot_date}`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.marketPriceBox}>
                    <Text style={styles.marketPrice}>{formatNaira(row.avg_price)}</Text>
                    {index === 0 ? <Text style={styles.bestText}>Best price</Text> : null}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.muted}>No market prices yet.</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() =>
              navigation.navigate('SubmitPrice', {
                productId: product.id,
                marketId: marketId || undefined,
                marketName: routeMarketName,
              })
            }
          >
            <Text style={styles.submitText}>Submit a price for this product</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  headerTitle: { flex: 1, ...Typography.h2, fontSize: 20, color: '#111827' },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: 10 },
  heroCard: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 22,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  categoryText: { color: 'rgba(255,255,255,0.72)', fontWeight: '800', marginBottom: 8 },
  productName: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  avgPrice: { color: '#FFF', fontSize: 38, fontWeight: '900', marginTop: Spacing.md },
  unitText: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', marginTop: 4 },
  marketWatchHint: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', marginTop: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
  },
  statLabel: { color: '#6B7280', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  statValue: { color: '#111827', fontSize: 16, fontWeight: '900' },
  statSub: { color: Colors.primary.deepBlue, fontWeight: '800', marginTop: 4, fontSize: 12 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '900' },
  sectionSub: { color: '#6B7280', fontSize: 12, fontWeight: '800' },
  chart: { borderRadius: 16, marginLeft: -10 },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  changeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: Colors.primary.deepBlue,
  },
  changeDotUp: { backgroundColor: '#DC2626' },
  changeDotDown: { backgroundColor: '#16A34A' },
  changeDate: { color: '#111827', fontWeight: '900', marginBottom: 2 },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  marketIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  marketName: { color: '#111827', fontWeight: '900' },
  marketPriceBox: { alignItems: 'flex-end' },
  marketPrice: { color: Colors.primary.deepBlue, fontWeight: '900' },
  bestText: { color: '#16A34A', fontSize: 11, fontWeight: '900', marginTop: 2 },
  muted: { color: '#6B7280', fontWeight: '600', lineHeight: 20 },
  emptyTitle: { color: '#111827', fontSize: 18, fontWeight: '900' },
  submitBtn: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Platform.OS === 'ios' ? Spacing.lg : 0,
  },
  submitText: { color: '#FFF', fontWeight: '900' },
});
