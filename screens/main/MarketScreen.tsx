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
import { fetchMarkets } from '@/services/marketsApi';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function MarketScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const categorySlug = route.params?.categorySlug as string | undefined;
  const categoryName = route.params?.categoryName as string | undefined;
  const [searchQuery, setSearchQuery] = useState('');

  const marketsQ = useQuery({ queryKey: ['markets'], queryFn: fetchMarkets, staleTime: 5 * 60 * 1000 });

  const rows = useMemo(() => {
    const list = marketsQ.data?.markets || [];
    if (!searchQuery.trim()) return list;
    const s = searchQuery.toLowerCase();
    return list.filter((m) => m.name.toLowerCase().includes(s) || (m.area || '').toLowerCase().includes(s));
  }, [marketsQ.data?.markets, searchQuery]);

  const clearCategory = () => {
    (navigation as any).setParams({ categorySlug: undefined, categoryName: undefined });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Abuja markets</Text>
          <Text style={styles.headerSubtitle}>
            {categoryName
              ? `Pick a market to browse ${categoryName}`
              : 'Tap a market to see live prices'}
          </Text>
        </View>
        {categorySlug ? (
          <TouchableOpacity onPress={clearCategory} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Wuse, Utako…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {marketsQ.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator />
        </View>
      ) : marketsQ.isError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Could not load markets</Text>
          <Text style={styles.emptyDesc}>Check your connection and API base URL.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={rows}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() =>
                (navigation as any).navigate('MarketDetail', {
                  marketId: item.id,
                  marketName: item.name,
                  categorySlug,
                })
              }
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="storefront-outline" size={22} color={Colors.primary.deepBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nameText}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.areaText}>{item.area || 'Abuja'}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#D1D5DB" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No markets found</Text>
              <Text style={styles.emptyDesc}>Try a different search.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    ...Typography.h2,
    fontSize: 24,
    color: '#111827',
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  clearText: { color: Colors.primary.deepBlue, fontWeight: '800', fontSize: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  areaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
