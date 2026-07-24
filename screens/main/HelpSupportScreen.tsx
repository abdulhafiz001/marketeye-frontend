import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '@/constants/colors';

export default function HelpSupportScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.primary.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Market Eye helps you check live Abuja market prices before you leave home, and rewards verified
          price submissions with ₦1 wallet credit.
        </Text>

        <Text style={styles.h}>How do I submit a price?</Text>
        <Text style={styles.p}>
          Open Submit a price, pick the market and product, enter what you paid and the quantity that price
          covers, then submit. After an admin verifies it, you earn ₦1 in your wallet.
        </Text>

        <Text style={styles.h}>When can I claim airtime?</Text>
        <Text style={styles.p}>
          Once your wallet reaches ₦200, claim from Profile. An admin sends the airtime and marks the claim
          paid.
        </Text>

        <Text style={styles.h}>Price watches</Text>
        <Text style={styles.p}>
          On a product page you can watch prices and set alerts for when a price goes above or below a
          target. Those watches appear on your dashboard.
        </Text>

        <Text style={styles.h}>Contact</Text>
        <TouchableOpacity
          style={styles.contact}
          onPress={() => Linking.openURL('mailto:support@marketeye.app')}
        >
          <MaterialCommunityIcons name="email-outline" size={20} color={Colors.primary.deepBlue} />
          <Text style={styles.contactText}>support@marketeye.app</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h2, color: '#111827', fontSize: 22, flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  lead: { ...Typography.body, color: '#4B5563', marginBottom: Spacing.lg, lineHeight: 22 },
  h: { fontWeight: '800', color: '#111827', marginBottom: 6, marginTop: Spacing.md },
  p: { color: '#6B7280', lineHeight: 21, marginBottom: 4 },
  contact: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: Spacing.md,
  },
  contactText: { color: Colors.primary.deepBlue, fontWeight: '700' },
});
