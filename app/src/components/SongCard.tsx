import { Ionicons } from '@expo/vector-icons';
import type { AudioPlayer, AudioStatus } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../lib/a11y';
import { clock } from '../lib/story';
import { useTheme } from '../state/theme';
import { colors, fonts, radius, shadow, space, themed, type } from '../theme';
import type { SongSource } from '../types';
import { Tap } from './Tap';

/** The reward at The End: the story's song, ready to play when the reader taps. Never plays by itself. */
export function SongCard({ song, player, status }: { song: SongSource; player: AudioPlayer; status: AudioStatus }) {
  useTheme();
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(reduced ? 1 : 0.9)).current;
  useEffect(() => {
    if (reduced) { pop.setValue(1); return; }
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [pop, reduced]);

  const ready = status.isLoaded;
  const total = status.duration > 0 ? status.duration : song.seconds ?? 0;
  const at = Math.min(status.currentTime, total || status.currentTime);
  const pct = total > 0 ? Math.max(0, Math.min(1, at / total)) : 0;

  // after the last note, go back to the start so the next tap plays it again
  const finished = useRef(false);
  useEffect(() => {
    if (status.didJustFinish && !finished.current) { finished.current = true; try { player.pause(); player.seekTo(0); } catch { /* released */ } }
    if (!status.didJustFinish) finished.current = false;
  }, [status.didJustFinish, player]);

  const toggle = () => {
    try {
      if (status.playing) player.pause();
      else { if (total > 0 && status.currentTime >= total - 0.25) player.seekTo(0); player.play(); }
    } catch { /* the player was released */ }
  };

  return (
    <View style={styles.outer}>
    <Animated.View style={[styles.card, shadow.soft, { transform: [{ scale: pop }] }]} accessibilityLabel={`Song unlocked: ${song.title}`}>
      <Text style={styles.kicker}>SONG UNLOCKED!</Text>
      <View style={styles.row}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={status.playing ? `Pause the song ${song.title}` : `Play the song ${song.title}`}
          accessibilityState={{ disabled: !ready, busy: !ready }}
          disabled={!ready}
          onPress={toggle}
          style={[styles.play, !ready && { opacity: 0.6 }]}
        >
          {ready ? <Ionicons name={status.playing ? 'pause' : 'play'} size={30} color={colors.onAction} style={status.playing ? undefined : { marginLeft: 3 }} /> : <ActivityIndicator color={colors.onAction} />}
        </Tap>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{song.title}</Text>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityLabel="Song progress"
            accessibilityValue={{ min: 0, max: Math.round(total) || 100, now: Math.round(at) }}
          >
            <View style={[styles.fill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.time}>{ready ? `${clock(at)} / ${clock(total)}` : 'Getting your song ready…'}</Text>
        </View>
      </View>
    </Animated.View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  outer: { alignSelf: 'stretch', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.md },
  card: { padding: 16, borderRadius: radius.lg, backgroundColor: colors.primarySoft, gap: 10, maxWidth: 560, width: '100%' },
  kicker: { ...type.label, color: colors.primaryDeep, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  play: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.black, fontSize: 18, lineHeight: 23, color: colors.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surface, marginTop: 8, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.actionDeep },
  time: { ...type.small, color: colors.ink, marginTop: 6 },
}));
