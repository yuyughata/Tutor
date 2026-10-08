import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Art } from '../types';

type Props = { uri?: string; art?: Art; style?: StyleProp<ViewStyle> };

const SPOTS = [
  { left: '8%', top: '10%', scale: 0.26 },
  { right: '8%', top: '16%', scale: 0.22 },
  { left: '14%', bottom: '10%', scale: 0.24 },
] as const;

/** A story illustration: the real image when there is one, otherwise a branded emoji scene. */
export function Picture({ uri, art, style }: Props) {
  const [w, setW] = useState(0);
  const [failed, setFailed] = useState(false);
  const useImage = !!uri && !failed;
  const fallback = art ?? { emoji: '📖', colors: ['#ab46d2', '#10a19c'] as [string, string] };

  return (
    // Illustrations are decorative here: the card or page text around them carries the meaning for screen readers.
    <View style={[styles.box, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)} aria-hidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={fallback.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {!useImage && w > 0 && (
        <>
          {(fallback.extras ?? []).slice(0, 3).map((e, i) => (
            <Text key={i} style={[styles.extra, SPOTS[i], { fontSize: w * SPOTS[i].scale, opacity: 0.9 }]}>{e}</Text>
          ))}
          <Text style={[styles.main, { fontSize: w * 0.46 }]}>{fallback.emoji}</Text>
        </>
      )}
      {useImage && <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} onError={() => setFailed(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  main: { textAlign: 'center', includeFontPadding: false },
  extra: { position: 'absolute', includeFontPadding: false },
});
