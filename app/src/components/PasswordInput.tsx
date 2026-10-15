import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';
import { colors } from '../theme';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  /** The same look as the app's other text boxes; the box is drawn around the field and the eye button. */
  style?: StyleProp<TextStyle>;
};

/**
 * Password field with a show/hide (eye) button, so a parent can check what they typed.
 * Hidden by default; the choice is not remembered.
 */
export function PasswordInput({ style, onFocus, onBlur, ...rest }: Props) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontFamily, fontSize, color, ...box } = flat;
  return (
    <View style={[box, styles.row, { paddingHorizontal: 0 }, focused && { borderColor: colors.primary }]}>
      <TextInput
        {...rest}
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[styles.input, { fontFamily, fontSize, color, paddingLeft: (flat.paddingHorizontal as number) ?? 18 }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? 'Hide password' : 'Show password'}
        hitSlop={6}
        onPress={() => setShown((v) => !v)}
        style={styles.eye}
      >
        <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.primaryDeep} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  input: { flex: 1, alignSelf: 'stretch', paddingRight: 4, paddingVertical: 0 },
  eye: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
