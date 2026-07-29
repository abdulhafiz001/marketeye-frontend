import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { fetchInsights } from '@/services/insightsApi';

function formatNaira(value: number) {
  return `₦${Number(value).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export default function InsightsScreen() {
  const insightsQ = useQuery({
    queryKey: ['insights'],
    queryFn: fetchInsights,
    staleTime: 60_000,
  });

  const data = insightsQ.data;
  const heatmap = data?.submission_heatmap_30d || [];
  const maxHeat = Math.max(1, ...heatmap.map((d) => d.count));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.sub}>Crowd-verified market movement across Abuja</Text>
      </View>

      {insightsQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading community insights…</Text>
        </View>
      ) : insightsQ.isError || !data ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={42} color="#DC2626" />
          <Text style={styles.emptyTitle}>Could not load insights</Text>
          <Text style={styles.muted}>Check your connection and pull to refresh.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={insightsQ.isRefetching} onRefresh={() => insightsQ.refetch()} />
          }
        >
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Products</Text>
              <Text style={styles.statValue}>{data.community.products_tracked}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Submissions (30d)</Text>
              <Text style={styles.statValue}>{data.community.submissions_30d}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Verified (30d)</Text>
              <Text style={styles.statValue}>{data.community.approved_30d}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Price movers (30 days)</Text>
            <Text style={styles.sectionSub}>Biggest % changes by product + market</Text>
            {data.inflation_30d.length ? (
              data.inflation_30d.map((row) => (
                <View key={`${row.product_id}-${row.market_id}`} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{row.product_name}</Text>
                    <Text style={styles.muted}>{row.market_name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.change,
                        { color: row.change_percent >= 0 ? '#DC2626' : '#16A34A' },
                      ]}
                    >
                      {row.change_percent > 0 ? '+' : ''}
                      {row.change_percent}%
                    </Text>
                    <Text style={styles.muted}>{formatNaira(row.current_avg)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.muted}>Not enough history yet. Keep submitting prices.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Submission activity</Text>
            <Text style={styles.sectionSub}>Last 30 days — darker means more reports</Text>
            <View style={styles.heatmap}>
              {heatmap.map((day) => {
                const ratio = day.count / maxHeat;
                const level =
                  day.count === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
                const heatColors = ['#F3F4F6', '#BBF7D0', '#86EFAC', '#4ADE80', '#16A34A'];
                return (
                  <View
                    key={day.date}
                    style={[styles.heatCell, { backgroundColor: heatColors[level] }]}
                    accessibilityLabel={`${day.date}: ${day.count} submissions`}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top contributors</Text>
            {data.top_contributors.map((user, index) => (
              <View key={user.id} style={styles.row}>
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{user.name}</Text>
                  <Text style={styles.muted}>{user.approved_count} verified prices</Text>
                </View>
                <Text style={styles.points}>{user.points} pts</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { ...Typography.h1, fontSize: 28, color: Colors.primary.deepBlue },
  sub: { color: '#6B7280', fontWeight: '600', marginTop: 4 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
  },
  statLabel: { color: '#6B7280', fontSize: 11, fontWeight: '800' },
  statValue: { color: '#111827', fontSize: 20, fontWeight: '900', marginTop: 6 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: { color: '#111827', fontSize: 17, fontWeight: '900' },
  sectionSub: { color: '#6B7280', fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowTitle: { color: '#111827', fontWeight: '900' },
  change: { fontWeight: '900', fontSize: 15 },
  muted: { color: '#6B7280', fontWeight: '600', lineHeight: 20 },
  emptyTitle: { color: '#111827', fontSize: 18, fontWeight: '900' },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatCell: { width: 14, height: 14, borderRadius: 3 },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: Colors.primary.deepBlue, fontWeight: '900' },
  points: { color: Colors.primary.deepBlue, fontWeight: '900' },
});
