import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Tap } from '../components/Tap';
import { useReducedMotion } from '../lib/a11y';
import { colors, fonts, radius, shadow, space, type } from '../theme';

// Parental gate: a short number-word challenge that pre-readers can't solve, guarding
// anything meant for grown-ups (switching profiles, settings, links to the web).
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
// A grown-up who just passed the gate isn't asked again straight away (e.g. unlock -> Grown-ups tab).
const GRACE_MS = 30_000;
const makeChallenge = () => Array.from({ length: 3 }, () => 1 + Math.floor(Math.random() * 9));

type Ctx = { ask: () => Promise<boolean> };
const GateContext = createContext<Ctx | null>(null);

export function GateProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [challenge, setChallenge] = useState<number[]>(makeChallenge());
  const [entered, setEntered] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const passedAt = useRef(0);

  const finish = useCallback((ok: boolean) => {
    setOpen(false);
    if (ok) passedAt.current = Date.now();
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  const ask = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (Date.now() - passedAt.current < GRACE_MS) return resolve(true);
        resolver.current?.(false);
        resolver.current = resolve;
        setChallenge(makeChallenge());
        setEntered([]);
        setWrong(false);
        setOpen(true);
      }),
    [],
  );

  const press = (n: number) => {
    const next = [...entered, n];
    setWrong(false);
    if (next.length < challenge.length) return setEntered(next);
    if (next.every((v, i) => v === challenge[i])) return finish(true);
    setEntered([]);
    setWrong(true);
    setChallenge(makeChallenge());
  };

  return (
    <GateContext.Provider value={{ ask }}>
      {children}
      <Modal visible={open} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => finish(false)}>
        <View style={styles.scrim}>
          <View style={[styles.card, shadow.lift]} accessibilityViewIsModal>
            <Text style={styles.kicker}>GROWN-UPS ONLY</Text>
            <Text style={styles.title}>Tap these numbers in order</Text>
            <Text style={styles.words}>{challenge.map((n) => WORDS[n]).join(', ')}</Text>
            <View style={styles.dots}>
              {challenge.map((_, i) => (
                <View key={i} style={[styles.dot, i < entered.length && styles.dotOn]} />
              ))}
            </View>
            <Text style={[styles.err, { opacity: wrong ? 1 : 0 }]} accessibilityLiveRegion="polite">Not quite. Try again.</Text>
            <View style={styles.pad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <Tap key={n} accessibilityRole="button" accessibilityLabel={WORDS[n]} onPress={() => press(n)} style={styles.key}>
                  <Text style={styles.keyText}>{n}</Text>
                </Tap>
              ))}
            </View>
            <Button label="Cancel" variant="ghost" onPress={() => finish(false)} />
          </View>
        </View>
      </Modal>
    </GateContext.Provider>
  );
}

export function useGate() {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error('useGate must be used inside GateProvider');
  return ctx.ask;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(35,35,35,0.55)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, alignItems: 'center' },
  kicker: { ...type.label, color: colors.purpleDeep },
  title: { ...type.title, color: colors.ink, textAlign: 'center', marginTop: 6 },
  words: { fontFamily: fonts.black, fontSize: 24, color: colors.purpleDeep, marginTop: 10, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.teal },
  err: { ...type.small, color: colors.danger, marginTop: 8, height: 18 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 8, width: 3 * 80 + 2 * 10 },
  key: { width: 80, height: 60, borderRadius: radius.md, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: fonts.black, fontSize: 26, color: colors.purpleDeep },
});
