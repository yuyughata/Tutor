import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { PIN_LENGTH, PinPad } from '../components/PinPad';
import { Tap } from '../components/Tap';
import { useReducedMotion } from '../lib/a11y';
import { colors, fonts, radius, shadow, space, type, themed } from '../theme';
import { usePasscode } from './passcode';
import { useTheme } from './theme';

// Parental gate guarding anything meant for grown-ups (switching profiles, settings, links to the web).
// - A parent with an account uses their own 4-digit passcode.
// - Without an account (or before a passcode exists) it is a short number-word challenge pre-readers can't solve.
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
// A grown-up who just passed the gate isn't asked again straight away (e.g. unlock -> Grown-ups tab).
const GRACE_MS = 30_000;
const MAX_TRIES = 5;
const LOCK_MS = 60_000;
const makeChallenge = () => Array.from({ length: 3 }, () => 1 + Math.floor(Math.random() * 9));

type AskOptions = { /** Ignore the 30-second grace period (used for leaving kiosk mode). */ fresh?: boolean };
type Ctx = { ask: (opts?: AskOptions) => Promise<boolean> };
const GateContext = createContext<Ctx | null>(null);
type Mode = 'words' | 'pin' | 'forgot' | 'reset';

export function GateProvider({ children }: { children: ReactNode }) {
  useTheme();
  const reduceMotion = useReducedMotion();
  const passcode = usePasscode();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('words');
  const [challenge, setChallenge] = useState<number[]>(makeChallenge());
  const [entered, setEntered] = useState<number[]>([]);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const tries = useRef(0);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const passedAt = useRef(0);
  const hasPasscode = useRef(passcode.hasPasscode);
  hasPasscode.current = passcode.hasPasscode;
  const ready = useRef(passcode.ready);
  ready.current = passcode.ready;

  const locked = lockedUntil > now;
  useEffect(() => {
    if (!open || !lockedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open, lockedUntil]);

  const finish = useCallback((ok: boolean) => {
    setOpen(false);
    if (ok) { passedAt.current = Date.now(); tries.current = 0; }
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  const ask = useCallback(
    (opts?: AskOptions) =>
      new Promise<boolean>((resolve) => {
        if (!opts?.fresh && Date.now() - passedAt.current < GRACE_MS) return resolve(true);
        // Right after launch we may not know yet whether the parent has a passcode: wait a moment rather than show the easier puzzle.
        const started = Date.now();
        const open = () => {
        if (!ready.current && Date.now() - started < 4000) { setTimeout(open, 100); return; }
        resolver.current?.(false);
        resolver.current = resolve;
        setChallenge(makeChallenge());
        setEntered([]); setPin(''); setFirstPin(null); setPassword(''); setMessage(null); setBusy(false);
        setMode(hasPasscode.current ? 'pin' : 'words');
        setNow(Date.now());
        setOpen(true);
        };
        open();
      }),
    [],
  );

  const wrongPin = () => {
    tries.current += 1;
    setPin('');
    if (tries.current >= MAX_TRIES) { tries.current = 0; setLockedUntil(Date.now() + LOCK_MS); setNow(Date.now()); setMessage('Too many tries. Please wait a minute.'); }
    else setMessage('Not quite. Try again.');
  };

  const onPin = async (v: string) => {
    setPin(v); setMessage(null);
    if (v.length < PIN_LENGTH) return;
    if (mode === 'pin') {
      setBusy(true);
      const ok = await passcode.verify(v);
      setBusy(false);
      if (ok) finish(true); else wrongPin();
    } else if (mode === 'reset') {
      if (firstPin === null) { setFirstPin(v); setPin(''); return; }
      if (firstPin !== v) { setFirstPin(null); setPin(''); setMessage('The two passcodes did not match. Start again.'); return; }
      setBusy(true);
      const err = await passcode.set(v);
      setBusy(false);
      if (err) { setMessage(err); setPin(''); setFirstPin(null); } else finish(true);
    }
  };

  const onWord = (n: number) => {
    const next = [...entered, n];
    setMessage(null);
    if (next.length < challenge.length) return setEntered(next);
    if (next.every((v, i) => v === challenge[i])) return finish(true);
    setEntered([]); setMessage('Not quite. Try again.'); setChallenge(makeChallenge());
  };

  const checkPassword = async () => {
    setBusy(true); setMessage(null);
    const ok = await passcode.verifyAccountPassword(password);
    setBusy(false);
    if (!ok) return setMessage('That password is not right.');
    setPassword(''); setPin(''); setFirstPin(null); setMode('reset');
  };

  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  return (
    <GateContext.Provider value={{ ask }}>
      {children}
      <Modal visible={open} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => finish(false)}>
        <View style={styles.scrim}>
          <View style={[styles.card, shadow.lift]} accessibilityViewIsModal role="dialog" aria-label="Grown-ups only">
            <Text style={styles.kicker}>GROWN-UPS ONLY</Text>

            {mode === 'words' && (
              <>
                <Text style={styles.title}>Tap these numbers in order</Text>
                <Text style={styles.words}>{challenge.map((n) => WORDS[n]).join(', ')}</Text>
                <View style={styles.dots}>{challenge.map((_, i) => <View key={i} style={[styles.dot, i < entered.length && styles.dotOn]} />)}</View>
                <Text style={styles.err} accessibilityLiveRegion="polite">{message ?? ''}</Text>
                <View style={styles.pad}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <Tap key={n} accessibilityRole="button" accessibilityLabel={WORDS[n]} onPress={() => onWord(n)} style={styles.key}><Text style={styles.keyText}>{n}</Text></Tap>
                  ))}
                </View>
              </>
            )}

            {(mode === 'pin' || mode === 'reset') && (
              <>
                <Text style={styles.title}>
                  {mode === 'pin' ? 'Enter your passcode' : firstPin === null ? 'Choose a new passcode' : 'Repeat the new passcode'}
                </Text>
                <Text style={styles.sub}>{mode === 'pin' ? 'Your 4-digit grown-up passcode.' : '4 digits you will remember.'}</Text>
                <PinPad value={pin} onChange={onPin} disabled={busy || locked} />
                <Text style={styles.err} accessibilityLiveRegion="polite">{locked ? `Try again in ${secondsLeft}s.` : (message ?? '')}</Text>
                {mode === 'pin' && <Button label="Forgot passcode?" variant="ghost" onPress={() => { setMode('forgot'); setMessage(null); }} />}
              </>
            )}

            {mode === 'forgot' && (
              <>
                <Text style={styles.title}>Confirm it is you</Text>
                <Text style={styles.sub}>Enter the password for your Genova account, then choose a new passcode.</Text>
                <TextInput
                  value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password"
                  accessibilityLabel="Account password" placeholder="Account password" placeholderTextColor={colors.lock} style={styles.input}
                  onSubmitEditing={checkPassword}
                />
                <Text style={styles.err} accessibilityLiveRegion="polite">{message ?? ''}</Text>
                <Button label="Continue" loading={busy} disabled={!password} onPress={checkPassword} />
              </>
            )}

            <Button label="Cancel" variant="ghost" onPress={() => finish(false)} />
          </View>
        </View>
      </Modal>
    </GateContext.Provider>
  );
}

/** `const ask = useGate(); if (await ask()) ...` */
export function useGate() {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error('useGate must be used inside GateProvider');
  return ctx.ask;
}

const styles = themed(() => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(35,35,35,0.55)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, alignItems: 'center' },
  kicker: { ...type.label, color: colors.primaryDeep },
  title: { ...type.title, color: colors.ink, textAlign: 'center', marginTop: 6 },
  sub: { ...type.small, color: colors.muted, textAlign: 'center', marginTop: 4 },
  words: { fontFamily: fonts.black, fontSize: 24, color: colors.primaryDeep, marginTop: 10, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.secondary },
  err: { ...type.small, color: colors.danger, marginTop: 8, minHeight: 18, textAlign: 'center' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 8, width: 3 * 80 + 2 * 10 },
  key: { width: 80, height: 60, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: fonts.black, fontSize: 26, color: colors.primaryDeep },
  input: { alignSelf: 'stretch', marginTop: 14, minHeight: 52, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 18, fontFamily: fonts.bold, fontSize: 16, color: colors.ink, backgroundColor: colors.surface },
}));
