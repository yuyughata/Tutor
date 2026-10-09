import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space, themed } from '../theme';
import { Tap } from './Tap';

export const PIN_LENGTH = 4;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Four dots and a number pad. Calls onChange with the digits typed so far; the parent decides what "complete" means. */
export function PinPad({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const press = (d: string) => { if (!disabled && value.length < PIN_LENGTH) onChange(value + d); };
  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessible accessibilityRole="image" accessibilityLabel={`${value.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => <View key={i} style={[styles.dot, i < value.length && styles.dotOn]} />)}
      </View>
      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Tap key={d} accessibilityRole="button" accessibilityLabel={WORDS[Number(d)]} disabled={disabled} onPress={() => press(d)} style={styles.key}>
            <Text style={styles.keyText}>{d}</Text>
          </Tap>
        ))}
        <View style={styles.key} />
        <Tap accessibilityRole="button" accessibilityLabel="zero" disabled={disabled} onPress={() => press('0')} style={styles.key}>
          <Text style={styles.keyText}>0</Text>
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel="Delete last digit" disabled={disabled || value.length === 0} onPress={() => onChange(value.slice(0, -1))} style={[styles.key, styles.keyGhost]}>
          <Ionicons name="backspace-outline" size={26} color={colors.primaryDeep} />
        </Tap>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 14, marginVertical: space.md },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: 3 * 80 + 2 * 10 },
  key: { width: 80, height: 60, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  keyGhost: { backgroundColor: 'transparent' },
  keyText: { fontFamily: fonts.black, fontSize: 26, color: colors.primaryDeep },
}));
