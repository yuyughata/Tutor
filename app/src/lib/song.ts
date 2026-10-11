import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { SongSource } from '../types';

/**
 * One song for the reader screen. The player is created with the screen and starts loading as soon as the song's link
 * is known (when reading starts), so it is ready, with no wait, by the time the reader reaches The End.
 * It never plays by itself, stops when the screen closes, and pauses if the app leaves the foreground.
 */
export function useSongPlayer(song: SongSource | null) {
  const player = useAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const url = song?.url;

  useEffect(() => { if (url) player.replace({ uri: url }); }, [player, url]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s !== 'active') { try { player.pause(); } catch { /* released */ } } });
    return () => sub.remove();
  }, [player]);

  return { player, status };
}
