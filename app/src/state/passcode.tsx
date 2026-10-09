import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';
import { load, save } from './storage';

// The parent's 4-digit passcode. Only a salted hash is stored: on the device (so the gate works offline) and in
// Supabase (table parent_passcodes, readable only by that parent) so a new device or a re-install keeps it.
const KEY = 'genova.passcode.v1';
type Stored = { userId: string; salt: string; hash: string };

async function hashPin(pin: string, salt: string): Promise<string> {
  let h = `${salt}:${pin}`;
  for (let i = 0; i < 50; i++) h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${h}${salt}`);
  return h;
}

type Ctx = {
  /** The parent is signed in and has a passcode on this device. */
  hasPasscode: boolean;
  /** False until we know whether there is one (so screens don't flash "create a passcode"). */
  ready: boolean;
  verify: (pin: string) => Promise<boolean>;
  /** Save a new passcode. Returns an error message or null. */
  set: (pin: string) => Promise<string | null>;
  /** Re-check the parent's account password (used when the passcode is forgotten). */
  verifyAccountPassword: (password: string) => Promise<boolean>;
};
const PasscodeContext = createContext<Ctx | null>(null);

export function PasscodeProvider({ children }: { children: ReactNode }) {
  const { session, accessReady } = useAuth(); // accessReady: the first sign-in check has finished
  const userId = session?.user.id ?? null;
  const [stored, setStored] = useState<Stored | null>(null);
  const [loaded, setLoaded] = useState(false);
  const storedRef = useRef(stored);
  storedRef.current = stored;

  useEffect(() => { load<Stored | null>(KEY, null).then((s) => { setStored(s); setLoaded(true); }); }, []);

  // Sync with the account: take the server's passcode, or push one that was set while offline.
  useEffect(() => {
    if (!loaded) return;
    if (!supabase || !userId) return;
    let live = true;
    (async () => {
      try {
        const { data, error } = await supabase!.from('parent_passcodes').select('salt, hash').maybeSingle();
        if (error) throw error;
        if (!live) return;
        if (data) {
          const next = { userId, salt: data.salt, hash: data.hash };
          setStored(next); save(KEY, next);
        } else if (storedRef.current?.userId === userId) {
          await supabase!.from('parent_passcodes').upsert({ parent_id: userId, salt: storedRef.current.salt, hash: storedRef.current.hash });
        }
      } catch { /* offline: the copy on the device keeps working */ }
    })();
    return () => { live = false; };
  }, [loaded, userId]);

  const mine = stored && userId && stored.userId === userId ? stored : null;

  const verify = useCallback(async (pin: string) => {
    const s = storedRef.current;
    if (!s) return false;
    return (await hashPin(pin, s.salt)) === s.hash;
  }, []);

  const set = useCallback(async (pin: string) => {
    if (!userId) return 'Sign in first.';
    if (!/^\d{4}$/.test(pin)) return 'Use exactly 4 digits.';
    const salt = Crypto.randomUUID();
    const next: Stored = { userId, salt, hash: await hashPin(pin, salt) };
    setStored(next); save(KEY, next);
    if (supabase) {
      const { error } = await supabase.from('parent_passcodes').upsert({ parent_id: userId, salt: next.salt, hash: next.hash, updated_at: new Date().toISOString() });
      // keep going offline: the sync effect pushes it up next time
      if (!error) void supabase.functions.invoke('send-email', { body: { action: 'self', template: 'security_change', what: 'passcode' } }).catch(() => undefined);
    }
    return null;
  }, [userId]);

  const verifyAccountPassword = useCallback(async (password: string) => {
    const email = session?.user.email;
    if (!supabase || !email) return false;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, [session]);

  const value = useMemo<Ctx>(() => ({ hasPasscode: !!mine, ready: loaded && accessReady, verify, set, verifyAccountPassword }), [mine, loaded, accessReady, verify, set, verifyAccountPassword]);
  return <PasscodeContext.Provider value={value}>{children}</PasscodeContext.Provider>;
}

export function usePasscode() {
  const ctx = useContext(PasscodeContext);
  if (!ctx) throw new Error('usePasscode must be used inside PasscodeProvider');
  return ctx;
}
