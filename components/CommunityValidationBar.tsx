import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Spacing, Typography } from '@/constants/colors';
import { validateCommunityPrice, type CommunityValidationResponse } from '@/services/pricesApi';
import { useStore } from '@/store/useStore';

interface CommunityValidationBarProps {
  productId: number;
  productName: string;
  marketId: number;
  marketName: string;
  avgPrice: number;
  minPrice?: number;
  maxPrice?: number;
  confidenceScore?: number;
  confidenceLevel?: 'high' | 'medium' | 'low' | 'needs_review' | 'stale';
  confirmationsCount?: number;
  disputesCount?: number;
  observationsCount?: number;
  lastObservedAgo?: string;
  verdict?: string;
  userAction?: 'CONFIRM' | 'DISPUTE' | null;
  signals?: {
    recency_score?: number;
    community_score?: number;
    contributor_score?: number;
    geo_score?: number;
    dispersion_score?: number;
    is_geoverified?: boolean;
  };
  compact?: boolean;
}

export function CommunityValidationBar({
  productId,
  productName,
  marketId,
  marketName,
  avgPrice,
  minPrice,
  maxPrice,
  confidenceScore = 75,
  confidenceLevel = 'medium',
  confirmationsCount = 0,
  disputesCount = 0,
  observationsCount = 1,
  lastObservedAgo,
  verdict,
  userAction = null,
  signals,
  compact = false,
}: CommunityValidationBarProps) {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  const [currentScore, setCurrentScore] = useState(confidenceScore);
  const [currentLevel, setCurrentLevel] = useState(confidenceLevel);
  const [confirms, setConfirms] = useState(confirmationsCount);
  const [disputes, setDisputes] = useState(disputesCount);
  const [activeAction, setActiveAction] = useState<'CONFIRM' | 'DISPUTE' | null>(userAction);
  const [loadingAction, setLoadingAction] = useState<'confirm' | 'dispute' | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const handleVote = async (action: 'confirm' | 'dispute') => {
    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Please sign in to confirm or dispute market prices and earn reputation points.');
      return;
    }

    if (loadingAction) return;

    const previousAction = activeAction;
    const isSwitch = previousAction && previousAction !== action.toUpperCase();

    // Optimistic UI updates
    if (action === 'confirm') {
      if (activeAction === 'CONFIRM') return; // already confirmed
      setConfirms((c) => c + 1);
      if (isSwitch) setDisputes((d) => Math.max(0, d - 1));
      setActiveAction('CONFIRM');
      setCurrentScore((s) => Math.min(100, s + 6));
    } else {
      if (activeAction === 'DISPUTE') return; // already disputed
      setDisputes((d) => d + 1);
      if (isSwitch) setConfirms((c) => Math.max(0, c - 1));
      setActiveAction('DISPUTE');
      setCurrentScore((s) => Math.max(15, s - 12));
    }

    setLoadingAction(action);

    try {
      let lat: number | null = null;
      let lng: number | null = null;

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {
        // Continue without coordinates
      }

      const res = await validateCommunityPrice({
        product_id: productId,
        market_id: marketId,
        action,
        latitude: lat,
        longitude: lng,
      });

      // Update store user points
      if (user && res.points_earned) {
        setUser({
          ...user,
          points: (user.points || 0) + res.points_earned,
        });
      }

      if (res.confidence) {
        setCurrentScore(res.confidence.score);
        setCurrentLevel(res.confidence.level as any);
        setConfirms(res.confidence.confirmations_count);
        setDisputes(res.confidence.disputes_count);
      }
    } catch (e: any) {
      // Rollback on complete network failure
      setActiveAction(previousAction);
      const msg = e?.response?.data?.message || 'Could not record your vote. Try again.';
      Alert.alert('Validation error', msg);
    } finally {
      setLoadingAction(null);
    }
  };

  const getBadgeStyle = () => {
    if (currentLevel === 'high' || currentScore >= 80) {
      return { bg: '#DCFCE7', border: '#86EFAC', text: '#15803D', icon: 'check-decagram' as const, label: `${currentScore}% High Confidence` };
    }
    if (currentLevel === 'medium' || currentScore >= 60) {
      return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', icon: 'shield-check-outline' as const, label: `${currentScore}% Moderate` };
    }
    if (currentLevel === 'needs_review' || disputes > 0) {
      return { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C', icon: 'alert-octagon-outline' as const, label: `${currentScore}% Disputed` };
    }
    if (currentLevel === 'stale') {
      return { bg: '#F1F5F9', border: '#CBD5E1', text: '#64748B', icon: 'clock-outline' as const, label: `${currentScore}% Stale` };
    }
    return { bg: '#FFEDD5', border: '#FED7AA', text: '#C2410C', icon: 'alert-circle-outline' as const, label: `${currentScore}% Low Confidence` };
  };

  const badge = getBadgeStyle();
  const hasRange = minPrice && maxPrice && minPrice !== maxPrice;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Top Header: Confidence Pill + Relative Age */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.confidencePill, { backgroundColor: badge.bg, borderColor: badge.border }]}
          onPress={() => setInfoModalOpen(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name={badge.icon} size={14} color={badge.text} />
          <Text style={[styles.confidenceText, { color: badge.text }]}>{badge.label}</Text>
          <MaterialCommunityIcons name="information-outline" size={12} color={badge.text} style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        {lastObservedAgo ? (
          <Text style={styles.timeAgoText}>Observed {lastObservedAgo}</Text>
        ) : null}
      </View>

      {/* Observed Price Dispersion Range (Waze Model) */}
      {!compact && hasRange ? (
        <View style={styles.rangeRow}>
          <Text style={styles.rangeLabel}>Observed stall range:</Text>
          <Text style={styles.rangeValue}>
            ₦{Number(minPrice).toLocaleString()} – ₦{Number(maxPrice).toLocaleString()}
          </Text>
        </View>
      ) : null}

      {/* Interactive Confirm / Dispute Validation Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.voteBtn,
            styles.confirmBtn,
            activeAction === 'CONFIRM' && styles.confirmBtnActive,
          ]}
          onPress={() => handleVote('confirm')}
          disabled={loadingAction !== null}
          activeOpacity={0.8}
        >
          {loadingAction === 'confirm' ? (
            <ActivityIndicator size="small" color="#15803D" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={activeAction === 'CONFIRM' ? 'thumb-up' : 'thumb-up-outline'}
                size={15}
                color={activeAction === 'CONFIRM' ? '#FFF' : '#15803D'}
              />
              <Text
                style={[
                  styles.voteBtnText,
                  styles.confirmBtnText,
                  activeAction === 'CONFIRM' && styles.voteBtnTextActive,
                ]}
              >
                I saw this price {confirms > 0 ? `(${confirms})` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.voteBtn,
            styles.disputeBtn,
            activeAction === 'DISPUTE' && styles.disputeBtnActive,
          ]}
          onPress={() => handleVote('dispute')}
          disabled={loadingAction !== null}
          activeOpacity={0.8}
        >
          {loadingAction === 'dispute' ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={activeAction === 'DISPUTE' ? 'thumb-down' : 'thumb-down-outline'}
                size={15}
                color={activeAction === 'DISPUTE' ? '#FFF' : '#DC2626'}
              />
              <Text
                style={[
                  styles.voteBtnText,
                  styles.disputeBtnText,
                  activeAction === 'DISPUTE' && styles.voteBtnTextActive,
                ]}
              >
                Different {disputes > 0 ? `(${disputes})` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Breakdown Explanation Modal */}
      <Modal visible={infoModalOpen} transparent animationType="fade" onRequestClose={() => setInfoModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Price Authenticity Score</Text>
                <Text style={styles.modalSubtitle}>{productName} @ {marketName}</Text>
              </View>
              <TouchableOpacity onPress={() => setInfoModalOpen(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={[styles.scoreBanner, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <MaterialCommunityIcons name={badge.icon} size={28} color={badge.text} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.scoreBannerTitle, { color: badge.text }]}>{badge.label}</Text>
                <Text style={styles.scoreBannerSub}>{verdict || 'Continuously verified by multiple community signals.'}</Text>
              </View>
            </View>

            <Text style={styles.breakdownHeader}>How this score is calculated (Waze-style):</Text>

            <View style={styles.signalList}>
              <View style={styles.signalRow}>
                <MaterialCommunityIcons name="clock-check-outline" size={18} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.signalName}>Recency & Observations</Text>
                  <Text style={styles.signalDesc}>{observationsCount} crowdsourced reports recently submitted.</Text>
                </View>
              </View>

              <View style={styles.signalRow}>
                <MaterialCommunityIcons name="account-group-outline" size={18} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.signalName}>Community Confirmations</Text>
                  <Text style={styles.signalDesc}>{confirms} shoppers confirmed this price ({disputes} disputes).</Text>
                </View>
              </View>

              <View style={styles.signalRow}>
                <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.signalName}>In-Market Geoverification</Text>
                  <Text style={styles.signalDesc}>
                    {signals?.is_geoverified
                      ? 'GPS confirmed within 750m of market premises.'
                      : 'Standard community submission.'}
                  </Text>
                </View>
              </View>

              <View style={styles.signalRow}>
                <MaterialCommunityIcons name="shield-account-outline" size={18} color="#7C3AED" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.signalName}>Contributor Trust Weight</Text>
                  <Text style={styles.signalDesc}>Weighted dynamically by historical accuracy & streak.</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setInfoModalOpen(false)}>
              <Text style={styles.modalDoneBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  containerCompact: {
    marginTop: 4,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '800',
  },
  timeAgoText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rangeLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  rangeValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  confirmBtnActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  disputeBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  disputeBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  voteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmBtnText: {
    color: '#15803D',
  },
  disputeBtnText: {
    color: '#DC2626',
  },
  voteBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  scoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  scoreBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  scoreBannerSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  breakdownHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  signalList: {
    gap: 10,
    marginBottom: Spacing.lg,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  signalName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  signalDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  modalDoneBtn: {
    backgroundColor: Colors.primary.deepBlue,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
