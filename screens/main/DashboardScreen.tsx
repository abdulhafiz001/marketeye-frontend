import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { fetchCategories, fetchProducts } from '@/services/catalogApi';
import { fetchMarkets } from '@/services/marketsApi';
import { fetchTrending } from '@/services/pricesApi';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useStore((state) => state.user);
  const marketWatchlist = useStore((state) => state.marketWatchlist);
  const notifications = useStore((state) => state.notifications);
  const unreadBellCount = notifications.filter((n) => !n.read).length;

  const [selectedMarketId, setSelectedMarketId] = React.useState<number | 'all'>('all');
  const [search, setSearch] = React.useState('');

  const logoTapRef = React.useRef({ count: 0, lastTs: 0 });

  const marketsQ = useQuery({ queryKey: ['markets'], queryFn: fetchMarkets, staleTime: 5 * 60 * 1000 });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: 5 * 60 * 1000 });
  const productsQ = useQuery({ queryKey: ['products'], queryFn: fetchProducts, staleTime: 5 * 60 * 1000 });
  const trendingQ = useQuery({ queryKey: ['trending'], queryFn: fetchTrending, staleTime: 2 * 60 * 1000 });

  const markets = marketsQ.data?.markets || [];
  const lastUpdate = marketsQ.data?.meta?.last_price_update as string | null | undefined;

  const staleDays = React.useMemo(() => {
    if (!lastUpdate) return null;
    const d0 = new Date(lastUpdate);
    const d1 = new Date();
    const ms = d1.getTime() - d0.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }, [lastUpdate]);

  const onLogoPress = () => {
    const now = Date.now();
    if (now - logoTapRef.current.lastTs > 2000) {
      logoTapRef.current.count = 0;
    }
    logoTapRef.current.lastTs = now;
    logoTapRef.current.count += 1;
    if (logoTapRef.current.count >= 6) {
      logoTapRef.current.count = 0;
      navigation.getParent()?.getParent()?.navigate('AdminLogin');
    }
  };

  const goMarket = (marketId: number, marketName: string) => {
    navigation.navigate('Markets' as never, {
      screen: 'MarketDetail',
      params: { marketId, marketName },
    } as never);
  };

  const productResults = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return [];
    return (productsQ.data || [])
      .filter((product) => product.name.toLowerCase().includes(s))
      .slice(0, 6);
  }, [productsQ.data, search]);

  const openProduct = (productId: number) => {
    setSearch('');
    navigation.navigate('CommodityDetail' as never, { productId } as never);
  };

  const submitSearch = () => {
    const first = productResults[0];
    if (first) {
      openProduct(first.id);
    }
  };

  const submitCta = () => {
    navigation.navigate('SubmitPrice' as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity activeOpacity={0.9} onPress={onLogoPress} style={styles.logoBtn} accessibilityLabel="Market Eye logo">
              <Image source={require('@/assets/images/naija-price-img.png')} style={styles.logoImg} contentFit="contain" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>
                Hello, <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Trader'}</Text>
              </Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>

            <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Alerts' as never)}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.primary.deepBlue} />
              {unreadBellCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadBellCount > 9 ? '9+' : unreadBellCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile' as never)}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{(user?.name?.[0] || 'U').toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search for any product…"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={submitSearch}
            />
            <TouchableOpacity style={styles.filterButton} onPress={() => navigation.navigate('Compare' as never)}>
              <MaterialCommunityIcons name="compare" size={20} color={Colors.primary.white} />
            </TouchableOpacity>
          </View>
          {search.trim() ? (
            <View style={styles.searchResults}>
              {productsQ.isLoading ? (
                <Text style={styles.searchResultText}>Searching...</Text>
              ) : productResults.length ? (
                productResults.map((product) => (
                  <TouchableOpacity key={product.id} style={styles.searchResultRow} onPress={() => openProduct(product.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultName}>{product.name}</Text>
                      <Text style={styles.searchResultMeta}>{product.unit}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.searchResultText}>No matching products found.</Text>
              )}
            </View>
          ) : null}
        </View>

        {staleDays !== null && staleDays >= 3 ? (
          <View style={styles.staleBanner}>
            <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#B45309" />
            <Text style={styles.staleText}>
              Prices last updated {staleDays} day{staleDays === 1 ? '' : 's'} ago — be the first to update!
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Markets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.chip, selectedMarketId === 'all' && styles.chipActive]}
              onPress={() => setSelectedMarketId('all')}
            >
              <Text style={[styles.chipText, selectedMarketId === 'all' && styles.chipTextActive]}>All Markets</Text>
            </TouchableOpacity>
            {markets.slice(0, 12).map((m) => {
              const active = selectedMarketId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    setSelectedMarketId(m.id);
                    goMarket(m.id, m.name);
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {m.name.replace(' Market', '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Markets' as never)}>
              <Text style={styles.seeAllText}>Browse</Text>
            </TouchableOpacity>
          </View>

          {categoriesQ.isLoading ? (
            <ActivityIndicator />
          ) : (
            <View style={styles.catGrid}>
              {(categoriesQ.data || []).slice(0, 6).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.catCard}
                  onPress={() =>
                    navigation.navigate('Markets' as never, {
                      screen: 'MarketDetail',
                      params: { marketId: selectedMarketId === 'all' ? markets[0]?.id : selectedMarketId, marketName: 'Market' },
                    } as never)
                  }
                >
                  <View style={styles.catIcon}>
                    <MaterialCommunityIcons
                      name={(c.icon as any) || 'shape-outline'}
                      size={22}
                      color={Colors.primary.deepBlue}
                    />
                  </View>
                  <Text style={styles.catName} numberOfLines={2}>
                    {c.name}
                  </Text>
                  <Text style={styles.catCount}>{c.product_count} items</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending</Text>
            <Text style={styles.sectionHint}>Biggest moves vs yesterday</Text>
          </View>

          {trendingQ.isLoading ? (
            <ActivityIndicator />
          ) : (
            <View style={{ gap: 10 }}>
              {(trendingQ.data || []).slice(0, 6).map((t: any, idx: number) => (
                <View key={idx} style={styles.trendRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trendName}>{t.product?.name}</Text>
                    <Text style={styles.trendUnit}>{t.product?.unit}</Text>
                  </View>
                  <View
                    style={[
                      styles.trendPill,
                      { backgroundColor: t.change_percent >= 0 ? '#FEE2E2' : '#DCFCE7' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={t.change_percent >= 0 ? 'trending-up' : 'trending-down'}
                      size={16}
                      color={t.change_percent >= 0 ? '#DC2626' : '#16A34A'}
                    />
                    <Text
                      style={[
                        styles.trendPct,
                        { color: t.change_percent >= 0 ? '#DC2626' : '#16A34A' },
                      ]}
                    >
                      {t.change_percent > 0 ? '+' : ''}
                      {t.change_percent}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {marketWatchlist.length ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your watchlist</Text>
              <Text style={styles.sectionHint}>Market products you follow</Text>
            </View>
            <View style={{ gap: 10 }}>
              {marketWatchlist.slice(0, 6).map((watch) => (
                <TouchableOpacity
                  key={watch.id}
                  style={styles.watchRow}
                  onPress={() =>
                    navigation.navigate('CommodityDetail' as never, {
                      productId: watch.productId,
                      marketId: watch.marketId,
                      marketName: watch.marketName,
                    } as never)
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trendName}>{watch.productName}</Text>
                    <Text style={styles.trendUnit}>{watch.marketName} • {watch.unit}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.watchPrice}>
                      {watch.lastPrice ? `₦${watch.lastPrice.toLocaleString()}` : 'No price yet'}
                    </Text>
                    <MaterialCommunityIcons name="chart-line" size={18} color={Colors.primary.deepBlue} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionContainer}>
          <TouchableOpacity style={styles.ctaCard} activeOpacity={0.85} onPress={submitCta}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Submit a price</Text>
              <Text style={styles.ctaSub}>Earn points and keep Abuja markets honest.</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: 12,
  },
  logoBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: 34, height: 34 },
  greetingText: {
    ...Typography.h2,
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '400',
  },
  userName: { color: '#111827', fontWeight: '800' },
  dateText: {
    ...Typography.caption,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  profileButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: '#1F2937',
    height: 40,
  },
  filterButton: {
    backgroundColor: Colors.primary.deepBlue,
    padding: 8,
    borderRadius: 8,
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultName: { color: '#111827', fontWeight: '900' },
  searchResultText: { color: '#6B7280', fontWeight: '700', fontSize: 12, padding: Spacing.md },
  searchResultMeta: { color: '#6B7280', fontWeight: '700', fontSize: 12, marginTop: 2 },
  staleBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  staleText: { flex: 1, color: '#92400E', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  sectionContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h3, color: '#111827', fontSize: 18, fontWeight: '900' },
  sectionHint: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  seeAllText: { ...Typography.body, color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: 200,
  },
  chipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  chipText: { color: '#6B7280', fontWeight: '800', fontSize: 13 },
  chipTextActive: { color: '#FFF' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  catCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  catName: { fontWeight: '900', color: '#111827' },
  catCount: { marginTop: 6, color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
  },
  trendName: { fontWeight: '900', color: '#111827' },
  trendUnit: { marginTop: 2, color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  trendPct: { fontWeight: '900' },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
  },
  watchPrice: { color: Colors.primary.deepBlue, fontWeight: '900', marginBottom: 4 },
  ctaCard: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 18,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ctaTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  ctaSub: { marginTop: 4, color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 13 },
});
