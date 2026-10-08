import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radius, shadow } from '../theme';
import { Tap } from './Tap';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style }: Props) {
  const v = variants[variant];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.base, v.box, variant === 'primary' && shadow.soft, disabled && { opacity: 0.5 }, style]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={20} color={v.fg} />}
          <Text style={[styles.label, { color: v.fg }]}>{label}</Text>
        </>
      )}
    </Tap>
  );
}

const variants = {
  primary: { box: { backgroundColor: colors.purple }, fg: colors.onPurple },
  secondary: { box: { backgroundColor: colors.tealSoft }, fg: '#0b6f6b' },
  ghost: { box: { backgroundColor: 'transparent' }, fg: colors.purpleDeep },
  danger: { box: { backgroundColor: '#fdeceb' }, fg: colors.danger },
} as const;

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, paddingHorizontal: 22, borderRadius: radius.pill },
  label: { fontFamily: fonts.black, fontSize: 17 },
});
