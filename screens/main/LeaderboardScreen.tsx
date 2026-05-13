import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard } from '@/services/userApi';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function LeaderboardScreen() {
  const [range, setRange] = useState<'week' | 'month' | 'all'>('week');
  const userId = useStore((s) => s.user?.id);

  const q = useQuery({
    queryKey: ['leaderboard', range],
    queryFn: () => fetchLeaderboard(range),
  });

  const rows = q.data?.leaderboard || [];
  const you = q.data?.you;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.sub}>Top contributors helping Abuja shoppers.</Text>
      </View>

      <View style={styles.tabs}>
        {(['week', 'month', 'all'] as const).map((r) => {
          const active = range === r;
          return (
            <TouchableOpacity key={r} style={[styles.tab, active && styles.tabActive]} onPress={() => setRange(r)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {r === 'week' ? 'This week' : r === 'month' ? 'This month' : 'All-time'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : q.isError ? (
        <View style={styles.center}>
          <Text style={styles.err}>Could not load leaderboard.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
          data={rows}
          keyExtractor={(item) => String(item.user.id)}
          ListHeaderComponent={
            you ? (
              <View style={styles.youCard}>
                <Text style={styles.youLabel}>Your rank</Text>
                <Text style={styles.youRank}>#{you.rank}</Text>
                <Text style={styles.youPoints}>{you.points.toLocaleString()} pts</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isYou = userId && String(item.user.id) === String(userId);
            return (
              <View style={[styles.row, isYou && styles.rowYou]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{item.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.user.name}</Text>
                  <Text style={styles.meta}>{item.submission_count} submissions</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.points}>{item.user.points.toLocaleString()} pts</Text>
                  <MaterialCommunityIcons name="star-four-points" size={16} color={Colors.primary.deepBlue} />
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
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: Colors.primary.deepBlue, borderColor: Colors.primary.deepBlue },
  tabText: { color: '#6B7280', fontWeight: '800', fontSize: 12 },
  tabTextActive: { color: '#FFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { color: '#6B7280' },
  youCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  youLabel: { color: '#6B7280', fontWeight: '800', fontSize: 12 },
  youRank: { marginTop: 6, fontSize: 28, fontWeight: '900', color: Colors.primary.deepBlue },
  youPoints: { marginTop: 4, color: '#111827', fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: Spacing.md,
    marginBottom: 10,
    gap: 12,
  },
  rowYou: { borderColor: 'rgba(30, 58, 95, 0.25)', backgroundColor: '#F8FAFC' },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontWeight: '900', color: '#111827' },
  name: { fontWeight: '900', color: '#111827' },
  meta: { marginTop: 2, color: '#6B7280', fontSize: 12, fontWeight: '600' },
  points: { fontWeight: '900', color: Colors.primary.deepBlue },
});
