import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { logoutRequest } from '@/services/authApi';
import { fetchMySubmissions } from '@/services/userApi';

// --- Types ---
interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  screen?: string;
  color: string; // Added color for icon background
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const user = useStore((state) => state.user);
  const marketWatchlist = useStore((state) => state.marketWatchlist);
  const setAuthenticated = useStore((state) => state.setAuthenticated);
  const setUser = useStore((state) => state.setUser);
  const setAuthToken = useStore((state) => state.setAuthToken);
  const setMarketWatchlist = useStore((state) => state.setMarketWatchlist);

  const submissionsQ = useQuery({
    queryKey: ['my-submissions'],
    queryFn: fetchMySubmissions,
    enabled: !!user,
  });

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutRequest();
          } finally {
            setAuthenticated(false);
            setUser(null);
            setAuthToken(null);
            setMarketWatchlist([]);
          }
        },
      },
    ]);
  };

  // Grouping items makes the UI much cleaner
  const sections: MenuSection[] = [
    {
      title: 'Settings',
      items: [
        {
          id: '2',
          title: 'Account',
          icon: 'account-cog',
          screen: 'AccountSettings',
          color: Colors.primary.deepBlue,
        },
        {
          id: '3',
          title: 'Notifications',
          icon: 'bell',
          screen: 'NotificationSettings',
          color: '#FF4B55', // Red/Pinkish
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: '4',
          title: 'Help & Support',
          icon: 'lifebuoy',
          color: '#4CAF50', // Green
        },
        {
          id: '5',
          title: 'About App',
          icon: 'information',
          color: '#2196F3', // Blue
        },
      ],
    },
  ];

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.screen) {
      navigation.navigate(item.screen as never);
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Header Section --- */}
        <View style={styles.headerContainer}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {getInitials(user?.name || 'User')}
              </Text>
            </View>
            {/* Edit Badge (Optional Visual) */}
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name="pencil" size={12} color="#FFF" />
            </View>
          </View>

          <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'Sign in to sync data'}</Text>

          <View style={styles.pointsCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pointsLabel}>Community points</Text>
              <Text style={styles.pointsHint}>Earned from accurate price submissions</Text>
            </View>
            <Text style={styles.pointsValue}>{(user?.points ?? 0).toLocaleString()}</Text>
          </View>
        </View>

        {user ? (
          <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
            <Text style={styles.sectionTitle}>Recent submissions</Text>
            <View style={styles.submissionsBox}>
              {(submissionsQ.data || []).slice(0, 5).map((s: any) => (
                <View key={String(s.id)} style={styles.submissionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.submissionTitle}>{s.product?.name}</Text>
                    <Text style={styles.submissionMeta}>{s.market?.name}</Text>
                  </View>
                  <View style={[styles.statusPill, s.status === 'approved' && styles.statusOk]}>
                    <Text style={styles.statusText}>{s.status}</Text>
                  </View>
                </View>
              ))}
              {!submissionsQ.data?.length ? (
                <Text style={{ color: '#6B7280' }}>No submissions yet.</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
          <Text style={styles.sectionTitle}>Watched products</Text>
          <View style={styles.submissionsBox}>
            {marketWatchlist.slice(0, 6).map((watch) => (
              <TouchableOpacity
                key={watch.id}
                style={styles.submissionRow}
                onPress={() =>
                  (navigation as any).navigate('CommodityDetail', {
                    productId: watch.productId,
                    marketId: watch.marketId,
                    marketName: watch.marketName,
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.submissionTitle}>{watch.productName}</Text>
                  <Text style={styles.submissionMeta}>{watch.marketName} • {watch.unit}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.watchPrice}>
                    {watch.lastPrice ? `₦${watch.lastPrice.toLocaleString()}` : 'No price yet'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
            {!marketWatchlist.length ? (
              <Text style={{ color: '#6B7280' }}>No watched products yet.</Text>
            ) : null}
          </View>
        </View>

        {/* --- Menu Sections --- */}
        <View style={styles.sectionsContainer}>
          {sections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionBody}>
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.row,
                      // Remove border for the last item in the group
                      index === section.items.length - 1 && styles.rowNoBorder,
                    ]}
                    onPress={() => handleMenuItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowLeft}>
                      {/* Icon Container with soft background */}
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: `${item.color}20` }, // 20% opacity
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={20}
                          color={item.color}
                        />
                      </View>
                      <Text style={styles.rowLabel}>{item.title}</Text>
                    </View>

                    <MaterialCommunityIcons
                      name="chevron-right"
                      color={Colors.secondary.lightGray || '#C7C7CC'}
                      size={22}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* --- Logout Section --- */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="logout"
              size={20}
              color={Colors.status.error}
            />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}> Market Eye v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Standard iOS grouped background gray
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  // Header
  headerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.primary.white,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    ...Typography.h2,
    fontSize: 32,
    color: Colors.primary.white,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary.deepBlue,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary.white,
  },
  userName: {
    ...Typography.h2,
    fontSize: 22,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  userEmail: {
    ...Typography.body,
    color: '#8E8E93',
    fontSize: 14,
  },
  pointsCard: {
    marginTop: Spacing.lg,
    width: '100%',
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: Spacing.md,
  },
  pointsLabel: { fontWeight: '900', color: '#111827' },
  pointsHint: { marginTop: 4, color: '#6B7280', fontSize: 12, fontWeight: '600' },
  pointsValue: { fontSize: 22, fontWeight: '900', color: Colors.primary.deepBlue },
  submissionsBox: {
    marginTop: Spacing.sm,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: Spacing.md,
    gap: 10,
  },
  submissionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submissionTitle: { fontWeight: '800', color: '#111827' },
  submissionMeta: { marginTop: 2, color: '#6B7280', fontSize: 12, fontWeight: '600' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  statusOk: { backgroundColor: '#DCFCE7' },
  statusText: { fontSize: 11, fontWeight: '900', color: '#111827', textTransform: 'capitalize' },
  watchPrice: { color: Colors.primary.deepBlue, fontWeight: '900', marginBottom: 2 },
  // Sections
  sectionsContainer: {
    paddingHorizontal: Spacing.lg, // Add spacing on sides so cards don't touch edges
    gap: Spacing.lg,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    ...Typography.caption,
    color: '#8E8E93',
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  sectionBody: {
    backgroundColor: Colors.primary.white,
    borderRadius: 12,
    overflow: 'hidden',
    // Subtle shadow for the card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7', // Very light separator
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    ...Typography.body,
    fontSize: 16,
    color: '#1C1C1E',
  },
  // Logout
  logoutContainer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5', // Very light red
    paddingVertical: 12,
    width: '100%',
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    ...Typography.body,
    color: Colors.status.error,
    fontWeight: '600',
  },
  versionText: {
    ...Typography.caption,
    color: '#C7C7CC',
  },
});