import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
        // Fail fast when offline: screens fall back to the cached catalogue instead of waiting on retries.
        db: { retry: false },
      })
    : null;

/**
 * The sign-in that supabase-js keeps on the device. getSession() returns null when the access token has expired and
 * cannot be refreshed (for example with no connection), even though the sign-in is still safely stored. The app reads
 * the stored copy as a fallback so a signed-in parent is not sent back to "Sign in" just because they are offline.
 * Same key supabase-js derives from the project URL.
 */
export async function storedSession(): Promise<Session | null> {
  if (!url) return null;
  try {
    const key = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session> | null;
    return s?.user?.id && s.refresh_token ? (s as Session) : null;
  } catch {
    return null;
  }
}
