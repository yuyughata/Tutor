import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useOnline } from '../lib/net';
import { colors, radius, space, type, themed } from '../theme';

/** Shown only while the device is offline. Announced politely to screen readers. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.bar}>
      <Ionicons name="cloud-offline" size={20} color={colors.amberDeep} />
      <Text style={styles.text}>You're offline. Saved stories are still here to read.</Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: space.md, marginBottom: space.md, padding: 12, borderRadius: radius.md, backgroundColor: colors.amberSoft },
  text: { ...type.small, flex: 1, color: colors.amberDeep, fontFamily: 'Nunito_800ExtraBold' },
}));
