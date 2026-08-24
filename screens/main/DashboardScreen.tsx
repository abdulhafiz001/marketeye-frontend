import React, { useMemo, useState } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { fetchCategories, fetchProducts } from '@/services/catalogApi';
import { fetchMarkets } from '@/services/marketsApi';
import { fetchDashboardSummary, fetchTrending } from '@/services/pricesApi';
import { resolveCategoryIcon } from '@/utils/categoryIcon';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useStore((state) => state.user);
  const notifications = useStore((state) => state.notifications);
  const alerts = useStore((state) => state.alerts);
  const unreadBellCount = notifications.filter((n) => !n.read).length;

  const [search, setSearch] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState<number | 'all'>('all');

  const summaryQ = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 60 * 1000,
  });

  const marketsQ = useQuery({ queryKey: ['markets'], queryFn: fetchMarkets, staleTime: 5 * 60 * 1000 });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: 5 * 60 * 1000 });
  const productsQ = useQuery({ queryKey: ['products'], queryFn: fetchProducts, staleTime: 5 * 60 * 1000 });
  const trendingQ = useQuery({ queryKey: ['trending'], queryFn: fetchTrending, staleTime: 2 * 60 * 1000 });

  const markets = marketsQ.data?.markets || [];
  const summary = summaryQ.data;
  const kpis = summary?.kpis;
  const ticker = summary?.live_ticker || [];
  const recentActivity = summary?.recent_activity || [];

  const onRefresh = () => {
    void summaryQ.refetch();
    void marketsQ.refetch();
    void categoriesQ.refetch();
    void productsQ.refetch();
    void trendingQ.refetch();
  };

  const productResults = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return [];
    return (productsQ.data || [])
      .filter((product) => product.name.toLowerCase().includes(s))
      .slice(0, 6);
  }, [productsQ.data, search]);

  const openProduct = (productId: number) => {
    setSearch('');
    navigation.navigate('CommodityDetail', { productId });
  };

  const submitSearch = () => {
    const first = productResults[0];
    if (first) {
      openProduct(first.id);
    }
  };

  const userBalance = user?.walletBalance ?? 0;
  const progressPercent = Math.min(100, Math.round((userBalance / 200) * 100));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={summaryQ.isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.primary.deepBlue}
          />
        }
      >
        {/* Top Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>
                Hello, <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Trader'}</Text>
              </Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })} • Abuja
              </Text>
            </View>

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('PriceWatch')}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.primary.deepBlue} />
              {unreadBellCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadBellCount > 9 ? '9+' : unreadBellCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{(user?.name?.[0] || 'U').toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={22} color="#64748B" />
            <TextInput
              placeholder="Search commodities (e.g. Rice, Garri, Meat...)"
              placeholderTextColor="#64748B"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.filterButton} onPress={() => navigation.navigate('Basket')}>
              <MaterialCommunityIcons name="cart-outline" size={20} color={Colors.primary.white} />
            </TouchableOpacity>
          </View>

          {/* Search Autocomplete Results */}
          {search.trim() ? (
            <View style={styles.searchResults}>
              {productsQ.isLoading ? (
                <Text style={styles.searchResultText}>Searching...</Text>
              ) : productResults.length ? (
                productResults.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.searchResultRow}
                    onPress={() => openProduct(product.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultName}>{product.name}</Text>
                      <Text style={styles.searchResultMeta}>{product.unit}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.searchResultText}>No matching commodities found.</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* Live Commodity Ticker Marquee */}
        {ticker.length > 0 ? (
          <View style={styles.tickerWrapper}>
            <View style={styles.tickerTag}>
              <View style={styles.pulseDot} />
              <Text style={styles.tickerTagText}>LIVE</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerScroll}>
              {ticker.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.product_id}-${idx}`}
                  style={styles.tickerItem}
                  onPress={() => openProduct(item.product_id)}
                >
                  <Text style={styles.tickerName}>{item.product_name}:</Text>
                  <Text style={styles.tickerPrice}>₦{item.avg_price.toLocaleString()}</Text>
                  <View
                    style={[
                      styles.tickerPill,
                      { backgroundColor: item.change_percent <= 0 ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.change_percent <= 0 ? 'arrow-down' : 'arrow-up'}
                      size={12}
                      color={item.change_percent <= 0 ? '#16A34A' : '#DC2626'}
                    />
                    <Text
                      style={[
                        styles.tickerPillText,
                        { color: item.change_percent <= 0 ? '#16A34A' : '#DC2626' },
                      ]}
                    >
                      {Math.abs(item.change_percent)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Real-time Market KPI Metrics Carousel */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Abuja Market Pulse</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kpiCarousel}
          >
            {/* KPI Card 1: Today's Submissions */}
            <View style={[styles.kpiCard, { backgroundColor: '#0F172A' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiLabelLight}>Today's Updates</Text>
                <MaterialCommunityIcons name="broadcast" size={18} color="#22C55E" />
              </View>
              <Text style={styles.kpiValueLight}>{kpis?.today_submissions_count ?? 0}</Text>
              <Text style={styles.kpiSubLight}>Verified crowd reports today</Text>
            </View>

            {/* KPI Card 2: 7-Day Inflation */}
            <View style={[styles.kpiCard, { backgroundColor: '#FFF' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiLabel}>Food Index (7d)</Text>
                <MaterialCommunityIcons
                  name={(kpis?.weekly_inflation_rate ?? 0) >= 0 ? 'trending-up' : 'trending-down'}
                  size={18}
                  color={(kpis?.weekly_inflation_rate ?? 0) >= 0 ? '#DC2626' : '#16A34A'}
                />
              </View>
              <Text
                style={[
                  styles.kpiValue,
                  { color: (kpis?.weekly_inflation_rate ?? 0) >= 0 ? '#DC2626' : '#16A34A' },
                ]}
              >
                {(kpis?.weekly_inflation_rate ?? 0) > 0 ? '+' : ''}
                {kpis?.weekly_inflation_rate ?? 0}%
              </Text>
              <Text style={styles.kpiSub}>Staple commodity shift</Text>
            </View>

            {/* KPI Card 3: Top Price Drop Bargain */}
            {kpis?.top_price_drop ? (
              <TouchableOpacity
                style={[styles.kpiCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                onPress={() => openProduct(kpis.top_price_drop!.product_id)}
              >
                <View style={styles.kpiTopRow}>
                  <Text style={[styles.kpiLabel, { color: '#166534' }]}>Top Deal of the Day</Text>
                  <MaterialCommunityIcons name="tag-outline" size={18} color="#16A34A" />
                </View>
                <Text style={styles.kpiBargainName} numberOfLines={1}>
                  {kpis.top_price_drop.product_name}
                </Text>
                <Text style={styles.kpiBargainDiscount}>
                  {kpis.top_price_drop.change_percent}% at {kpis.top_price_drop.market_name}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* KPI Card 4: Active Markets */}
            <View style={[styles.kpiCard, { backgroundColor: '#FFF' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiLabel}>Monitored Markets</Text>
                <MaterialCommunityIcons name="storefront-outline" size={18} color={Colors.primary.deepBlue} />
              </View>
              <Text style={styles.kpiValue}>{kpis?.active_markets_count ?? markets.length}</Text>
              <Text style={styles.kpiSub}>Wuse, Utako, Garki & more</Text>
            </View>
          </ScrollView>
        </View>

        {/* Quick Actions 4-Grid */}
        <View style={styles.sectionContainer}>
          <View style={styles.quickActionGrid}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Basket')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <MaterialCommunityIcons name="cart-percent" size={24} color={Colors.primary.deepBlue} />
              </View>
              <Text style={styles.actionBtnText}>Smart Basket</Text>
              <Text style={styles.actionBtnSub}>Save on list</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('PriceWatch')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="bell-ring-outline" size={24} color="#D97706" />
              </View>
              <Text style={styles.actionBtnText}>Price Watch</Text>
              <Text style={styles.actionBtnSub}>{alerts.length} active alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Markets')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <MaterialCommunityIcons name="map-marker-radius-outline" size={24} color="#7E22CE" />
              </View>
              <Text style={styles.actionBtnText}>All Markets</Text>
              <Text style={styles.actionBtnSub}>Live stalls</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SubmitPrice')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <MaterialCommunityIcons name="plus-circle" size={24} color="#16A34A" />
              </View>
              <Text style={styles.actionBtnText}>Report Price</Text>
              <Text style={styles.actionBtnSub}>Earn +10 Pts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Arbitrage Opportunity Card */}
        {kpis?.top_arbitrage ? (
          <View style={styles.sectionContainer}>
            <View style={styles.arbitrageCard}>
              <View style={styles.arbitrageHeader}>
                <MaterialCommunityIcons name="scale-balance" size={22} color="#F59E0B" />
                <Text style={styles.arbitrageTitle}>Market Price Gap Alert</Text>
              </View>
              <Text style={styles.arbitrageBody}>
                You can save <Text style={styles.arbitrageBold}>₦{kpis.top_arbitrage.price_gap.toLocaleString()}</Text> on{' '}
                <Text style={styles.arbitrageBold}>{kpis.top_arbitrage.product_name}</Text> by shopping at the cheapest market (₦{kpis.top_arbitrage.min_price.toLocaleString()} vs ₦{kpis.top_arbitrage.max_price.toLocaleString()}).
              </Text>
              <TouchableOpacity
                style={styles.arbitrageBtn}
                onPress={() => navigation.navigate('Basket', { screen: 'Compare' })}
              >
                <Text style={styles.arbitrageBtnText}>Compare Markets Now</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* User Rewards & Airtime Progress */}
        {user ? (
          <View style={styles.sectionContainer}>
            <View style={styles.rewardCard}>
              <View style={styles.rewardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardTitle}>Airtime Earnings & Streak</Text>
                  <Text style={styles.rewardSub}>
                    Streak: {user.submission_streak ?? 0} days 🔥 • {user.points ?? 0} Community Pts
                  </Text>
                </View>
                <Text style={styles.rewardBalance}>₦{userBalance}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` as any }]} />
              </View>
              <View style={styles.rewardFooter}>
                <Text style={styles.rewardHint}>
                  {userBalance >= 200 ? '₦200 Minimum claim reached!' : `₦${Math.max(0, 200 - userBalance)} more to claim airtime`}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                  <Text style={styles.claimLink}>View Wallet →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        {/* Abuja Markets Quick Filter */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Abuja Markets</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Markets')}>
              <Text style={styles.seeAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.chip, selectedMarketId === 'all' && styles.chipActive]}
              onPress={() => setSelectedMarketId('all')}
            >
              <Text style={[styles.chipText, selectedMarketId === 'all' && styles.chipTextActive]}>All Markets</Text>
            </TouchableOpacity>
            {markets.slice(0, 10).map((m) => {
              const active = selectedMarketId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    setSelectedMarketId(m.id);
                    navigation.navigate('Markets', {
                      screen: 'MarketDetail',
                      params: { marketId: m.id, marketName: m.name },
                    });
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

        {/* Commodity Categories Grid */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Markets')}>
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
                  onPress={() => {
                    navigation.navigate('Markets', {
                      screen: 'MarketList',
                      params: { categorySlug: c.slug, categoryName: c.name },
                    });
                  }}
                >
                  <View style={styles.catIcon}>
                    <MaterialCommunityIcons
                      name={resolveCategoryIcon(c.icon, c.name, c.slug)}
                      size={24}
                      color={Colors.primary.deepBlue}
                    />
                  </View>
                  <Text style={styles.catName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.catCount}>{c.product_count} items</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Real-time Verified Community Feed */}
        {recentActivity.length > 0 ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Verified Prices</Text>
              <Text style={styles.sectionHint}>Live reports</Text>
            </View>
            <View style={styles.recentList}>
              {recentActivity.map((act) => (
                <View key={act.id} style={styles.recentRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.recentTitleRow}>
                      <Text style={styles.recentProduct}>{act.product_name}</Text>
                      {act.is_geoverified ? (
                        <View style={styles.geoBadge}>
                          <MaterialCommunityIcons name="map-marker-check" size={12} color="#16A34A" />
                          <Text style={styles.geoBadgeText}>On-Site</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.recentMeta}>
                      {act.market_name} • {act.submitted_at}
                    </Text>
                  </View>
                  <Text style={styles.recentPrice}>₦{act.price_per_unit.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Bottom CTA Card */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.ctaCard}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('SubmitPrice')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Are you in an Abuja market right now?</Text>
              <Text style={styles.ctaSub}>Report prices with GPS location to earn double community points.</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right-circle" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl * 2 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 12,
  },
  greetingText: { ...Typography.h2, color: '#64748B', fontSize: 16, fontWeight: '500' },
  userName: { color: '#0F172A', fontWeight: '900' },
  dateText: { ...Typography.caption, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  profileButton: { elevation: 2 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    minHeight: 44,
  },
  filterButton: { backgroundColor: Colors.primary.deepBlue, padding: 8, borderRadius: 10 },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultName: { color: '#0F172A', fontWeight: '900' },
  searchResultText: { color: '#64748B', fontWeight: '700', fontSize: 13, padding: Spacing.md },
  searchResultMeta: { color: '#64748B', fontWeight: '600', fontSize: 12, marginTop: 2 },
  tickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  tickerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginRight: 8,
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  tickerTagText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  tickerScroll: { alignItems: 'center', gap: 16 },
  tickerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tickerName: { fontWeight: '700', color: '#334155', fontSize: 12 },
  tickerPrice: { fontWeight: '900', color: '#0F172A', fontSize: 12 },
  tickerPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  tickerPillText: { fontSize: 10, fontWeight: '800' },
  sectionContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.h3, color: '#0F172A', fontSize: 17, fontWeight: '900' },
  sectionHint: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  seeAllText: { color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 13 },
  kpiCarousel: { gap: 12, paddingRight: Spacing.lg },
  kpiCard: {
    width: 160,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  kpiLabelLight: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  kpiValue: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 8 },
  kpiValueLight: { fontSize: 24, fontWeight: '900', color: '#FFF', marginTop: 8 },
  kpiSub: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 4 },
  kpiSubLight: { fontSize: 11, color: '#CBD5E1', fontWeight: '600', marginTop: 4 },
  kpiBargainName: { fontSize: 15, fontWeight: '900', color: '#166534', marginTop: 8 },
  kpiBargainDiscount: { fontSize: 12, color: '#16A34A', fontWeight: '800', marginTop: 4 },
  quickActionGrid: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  actionBtnSub: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  arbitrageCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  arbitrageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arbitrageTitle: { fontSize: 14, fontWeight: '900', color: '#92400E' },
  arbitrageBody: { fontSize: 13, color: '#78350F', lineHeight: 18, fontWeight: '500' },
  arbitrageBold: { fontWeight: '900', color: '#92400E' },
  arbitrageBtn: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  arbitrageBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  rewardCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  rewardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardTitle: { fontWeight: '900', fontSize: 14, color: '#0F172A' },
  rewardSub: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 },
  rewardBalance: { fontSize: 22, fontWeight: '900', color: '#16A34A' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#16A34A', borderRadius: 3 },
  rewardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardHint: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  claimLink: { color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  chipText: { color: '#64748B', fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: '#FFF' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catName: { fontWeight: '900', color: '#0F172A', fontSize: 13 },
  catCount: { marginTop: 4, color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  recentList: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentProduct: { fontWeight: '800', color: '#0F172A', fontSize: 14 },
  geoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  geoBadgeText: { fontSize: 10, fontWeight: '900', color: '#166534' },
  recentMeta: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  recentPrice: { fontWeight: '900', color: Colors.primary.deepBlue, fontSize: 15 },
  ctaCard: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ctaTitle: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  ctaSub: { marginTop: 4, color: 'rgba(255,255,255,0.82)', fontWeight: '500', fontSize: 12, lineHeight: 16 },
});
