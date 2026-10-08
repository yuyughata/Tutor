import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; haptic?: boolean; scaleTo?: number };

/**
 * Pressable with a springy press-in and a light haptic: the basis of every tappable surface.
 * The scale is applied to the Pressable itself, so layout styles (flex, width) behave normally.
 */
export function Tap({ style, children, haptic = true, scaleTo = 0.96, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 6 }).start();
  return (
    <AnimatedPressable
      {...rest}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => { to(scaleTo); onPressIn?.(e); }}
      onPressOut={(e) => { to(1); onPressOut?.(e); }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
