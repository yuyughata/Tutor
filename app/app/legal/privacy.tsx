import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { LegalText } from '../../src/components/LegalText';
import { getPrivacyPolicy, type LegalDoc } from '../../src/data/legal';
import { colors, space, type, themed } from '../../src/theme';
import { useTheme } from '../../src/state/theme';

export default function PrivacyPolicy() {
  useTheme(); // re-render when the theme changes
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  useEffect(() => { getPrivacyPolicy().then(setDoc); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.badge}><Ionicons name="shield-checkmark" size={26} color={colors.primary} /></View>
        {!doc ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
          <>
            <Text accessibilityRole="header" style={styles.title}>{doc.title}</Text>
            <Text style={styles.meta}>
              {doc.version ? `Version ${doc.version}` : 'Summary'}{doc.updatedAt ? ` · updated ${new Date(doc.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
              {doc.source !== 'live' ? ' · saved copy' : ''}
            </Text>
            <LegalText text={doc.body} />
          </>
        )}
        <View style={{ marginTop: space.lg }}><Button label="Close" onPress={() => router.back()} /></View>
      </ScrollView>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  badge: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { ...type.display, color: colors.ink },
  meta: { ...type.small, color: colors.muted, marginTop: 4, marginBottom: 4 },
}));
