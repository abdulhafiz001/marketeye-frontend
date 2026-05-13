/**
 * Watchlist Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function WatchlistScreen() {
  const navigation = useNavigation<any>();
  const watchlist = useStore((state) => state.watchlist);
  const commodities = useStore((state) => state.commodities);
  const removeFromWatchlist = useStore((state) => state.removeFromWatchlist);

  const watchedCommodities = commodities.filter((c) =>
    watchlist.includes(c.id)
  );

  if (watchedCommodities.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="star-outline"
            size={64}
            color={Colors.text.secondary}
          />
          <Text style={styles.emptyTitle}>No Watched Commodities</Text>
          <Text style={styles.emptyText}>
            Add commodities to your watchlist to track their prices easily
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {watchedCommodities.map((commodity) => (
          <TouchableOpacity
            key={commodity.id}
            style={styles.commodityCard}
            onPress={() =>
              navigation.navigate('Markets', {
                screen: 'CommodityDetail',
                params: { commodityId: commodity.id },
              })
            }
          >
            <View style={styles.commodityLeft}>
              <Text style={styles.commodityIcon}>{commodity.icon}</Text>
              <View style={styles.commodityInfo}>
                <Text style={styles.commodityName}>{commodity.name}</Text>
                <Text style={styles.commodityUnit}>{commodity.unit}</Text>
              </View>
            </View>
            <View style={styles.commodityRight}>
              <Text style={styles.commodityPrice}>
                ₦{commodity.currentPrice.toLocaleString()}
              </Text>
              <View
                style={[
                  styles.commodityTrend,
                  commodity.trendDirection === 'up' && styles.commodityTrendUp,
                  commodity.trendDirection === 'down' &&
                    styles.commodityTrendDown,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    commodity.trendDirection === 'up' ? 'arrow-up' : 'arrow-down'
                  }
                  size={14}
                  color={
                    commodity.trendDirection === 'up'
                      ? Colors.trend.up
                      : Colors.trend.down
                  }
                />
                <Text
                  style={[
                    styles.commodityTrendText,
                    commodity.trendDirection === 'up' &&
                      styles.commodityTrendTextUp,
                    commodity.trendDirection === 'down' &&
                      styles.commodityTrendTextDown,
                  ]}
                >
                  {Math.abs(commodity.trend).toFixed(1)}%
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFromWatchlist(commodity.id)}
            >
              <MaterialCommunityIcons
                name="star"
                size={24}
                color={Colors.primary.sunriseOrange}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  commodityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary.lightGray,
  },
  commodityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commodityIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  commodityInfo: {
    flex: 1,
  },
  commodityName: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  commodityUnit: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  commodityRight: {
    alignItems: 'flex-end',
    marginRight: Spacing.md,
  },
  commodityPrice: {
    ...Typography.h3,
    color: Colors.primary.deepBlue,
    marginBottom: Spacing.xs,
  },
  commodityTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  commodityTrendUp: {},
  commodityTrendDown: {},
  commodityTrendText: {
    ...Typography.small,
    fontWeight: '600',
  },
  commodityTrendTextUp: {
    color: Colors.trend.up,
  },
  commodityTrendTextDown: {
    color: Colors.trend.down,
  },
  removeButton: {
    padding: Spacing.xs,
  },
});

