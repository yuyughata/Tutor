import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';
import Native from '../../modules/genova-kiosk';
import { useAuth } from './auth';
import { usePasscode } from './passcode';
import { load, save } from './storage';

// Kiosk mode keeps a child inside Genova.
//  - Android: Lock Task Mode (startLockTask) through the local GenovaKiosk module.
//  - Everywhere: the back button no longer leaves the app. Leaving kiosk mode always needs the parent's
//    4-digit passcode (the parental gate), asked in the Grown-ups area.
const KEY = 'genova.kiosk.v1';

type Ctx = {
  /** The parent switched kiosk mode on. */
  enabled: boolean;
  /** Android Lock Task Mode is available in this build. */
  nativeSupported: boolean;
  /** Genova is the device owner: no system prompt and no exit gesture. */
  deviceOwner: boolean;
  /** The system reports that the app is currently locked. */
  locked: boolean;
  /** Turn kiosk mode on or off. Returns an error message or null. The caller must have passed the gate already. */
  setEnabled: (on: boolean) => Promise<string | null>;
};
const KioskContext = createContext<Ctx | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const { session, accessReady, configured } = useAuth();
  const passcode = usePasscode();
  const [enabled, setEnabledState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(false);
  const nativeSupported = Platform.OS === 'android' && !!Native;
  const deviceOwner = nativeSupported ? safe(() => Native!.isDeviceOwner(), false) : false;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => { load<boolean>(KEY, false).then((v) => { setEnabledState(v); setLoaded(true); }); }, []);

  const lock = useCallback(async () => {
    if (!nativeSupported) return;
    try { await Native!.start(); } catch { /* the in-app lock still applies */ }
    setLocked(safe(() => Native!.isLocked(), false));
  }, [nativeSupported]);
  const unlock = useCallback(async () => {
    if (!nativeSupported) return;
    try { await Native!.stop(); } catch { /* ignore */ }
    setLocked(false);
  }, [nativeSupported]);

  // While kiosk mode is on, lock whenever the app comes to the foreground.
  useEffect(() => {
    if (!loaded) return;
    if (enabled) void lock(); else void unlock();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active' && enabledRef.current) void lock(); });
    return () => sub.remove();
  }, [enabled, loaded, lock, unlock]);

  // The hardware back button must not leave the app while kiosk mode is on.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => enabledRef.current && !router.canGoBack());
    return () => sub.remove();
  }, []);

  // Kiosk mode depends on the parent's account (the passcode is how it is left), so signing out turns it off.
  useEffect(() => {
    if (configured && accessReady && !session && enabledRef.current) { setEnabledState(false); save(KEY, false); }
  }, [configured, accessReady, session]);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on) {
      if (!session) return 'Sign in with your parent account first.';
      if (!passcode.hasPasscode) return 'Create your 4-digit passcode first. It is how you leave kiosk mode.';
    }
    setEnabledState(on); save(KEY, on);
    return null;
  }, [session, passcode.hasPasscode]);

  const value = useMemo(() => ({ enabled, nativeSupported, deviceOwner, locked, setEnabled }), [enabled, nativeSupported, deviceOwner, locked, setEnabled]);
  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

function safe<T>(fn: () => T, fallback: T): T { try { return fn(); } catch { return fallback; } }

export function useKiosk() {
  const ctx = useContext(KioskContext);
  if (!ctx) throw new Error('useKiosk must be used inside KioskProvider');
  return ctx;
}
