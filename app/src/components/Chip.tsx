import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Tap } from './Tap';

export function Chip({ label, icon, active, onPress }: { label: string; icon?: string; active: boolean; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active ? styles.on : styles.off]}
    >
      {icon && <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={active ? colors.onPurple : colors.purpleDeep} />}
      <Text style={[styles.text, { color: active ? colors.onPurple : colors.ink }]}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 42, borderRadius: radius.pill, borderWidth: 1.5 },
  on: { backgroundColor: colors.purple, borderColor: colors.purple },
  off: { backgroundColor: colors.surface, borderColor: colors.border },
  text: { fontFamily: fonts.bold, fontSize: 15 },
});
