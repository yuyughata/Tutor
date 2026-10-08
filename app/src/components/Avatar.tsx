import { StyleSheet, Text, View } from 'react-native';
import { avatars } from '../theme';

export function Avatar({ id, size = 44, ring }: { id: string; size?: number; ring?: string }) {
  const a = avatars.find((x) => x.id === id) ?? avatars[0];
  return (
    <View
      accessibilityElementsHidden
      style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: a.bg }, ring ? { borderWidth: 3, borderColor: ring } : null]}
    >
      <Text style={{ fontSize: size * 0.55, includeFontPadding: false }}>{a.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center' } });
