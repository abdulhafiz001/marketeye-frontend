import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ADMIN_PANEL_URL } from '@/constants/config';
import { Spacing, Typography } from '@/constants/colors';

export default function AdminWebViewScreen() {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(true);
  const uri = useMemo(() => ADMIN_PANEL_URL, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {visible ? (
        <View style={styles.banner}>
          <MaterialCommunityIcons name="shield-alert" size={18} color="#F59E0B" />
          <Text style={styles.bannerText}>You are in Admin Mode</Text>
          <TouchableOpacity onPress={() => setVisible(false)} accessibilityLabel="Dismiss admin banner">
            <MaterialCommunityIcons name="close" size={20} color="#E2E8F0" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolbarBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#E2E8F0" />
          <Text style={styles.toolbarText}>Close</Text>
        </TouchableOpacity>
      </View>

      <WebView source={{ uri }} style={styles.web} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  bannerText: { flex: 1, color: '#E2E8F0', ...Typography.caption, fontWeight: '700' },
  toolbar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  toolbarText: { color: '#E2E8F0', ...Typography.caption, fontWeight: '700' },
  web: { flex: 1, backgroundColor: '#0B1220' },
});
