import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { storedSession, supabase } from '../lib/supabase';
import { load, save } from './storage';
import type { Story } from '../types';

type Entitlement = { active: boolean; until?: string | null; status?: string; plan?: string | null; inGrace?: boolean };
const ACCESS_KEY = 'genova.access.v1';
type CachedAccess = Entitlement & { userId: string };

type Ctx = {
  configured: boolean; // Supabase credentials present
  session: Session | null;
  entitlement: Entitlement;
  /** False until the first access check has finished (so screens don't flash "locked"). */
  accessReady: boolean;
  canRead: (story: Story) => boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Password reset by emailed code: request -> verify -> set. Each returns an error message or null. */
  requestReset: (email: string) => Promise<string | null>;
  verifyReset: (email: string, code: string) => Promise<string | null>;
  setNewPassword: (password: string) => Promise<string | null>;
};

const AuthContext = createContext<Ctx | null>(null);

/** Turn technical auth errors into something a parent can act on. */
function friendly(message: string): string {
  if (/expired|invalid/i.test(message) && /token|otp|code/i.test(message)) return 'That code is not right or has expired. Request a new one.';
  if (/rate|too many|seconds/i.test(message)) return 'Please wait a minute before trying again.';
  if (/password/i.test(message) && /(6|8|short|weak|least)/i.test(message)) return 'Choose a longer password (at least 8 characters).';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement>({ active: false });
  const [accessReady, setAccessReady] = useState(!supabase);

  // Premium access comes from the database's my_access(), the single source of truth for the 5-day grace rule.
  // The last answer is remembered so saved premium stories keep working offline until access would have lapsed.
  const loadEntitlement = useCallback(async (s: Session | null) => {
    const free: Entitlement = { active: false };
    const apply = (next: Entitlement) => setEntitlement((prev) => (prev.active === next.active && prev.until === next.until && prev.status === next.status && prev.inGrace === next.inGrace ? prev : next));
    if (!supabase || !s) { save(ACCESS_KEY, null); apply(free); setAccessReady(true); return; }
    const fromCache = async () => {
      const cached = await load<CachedAccess | null>(ACCESS_KEY, null);
      const stillValid = cached && cached.userId === s.user.id && cached.active && (!cached.until || new Date(cached.until) > new Date());
      apply(stillValid ? { active: true, until: cached.until, status: cached.status, plan: cached.plan, inGrace: cached.inGrace } : free);
      setAccessReady(true);
    };
    // With no connection the request can take a long time to fail (supabase-js retries an expired token for ~30 s),
    // so after a few seconds the remembered answer is used; a late real answer still replaces it.
    const ask = (async () => {
      const { data, error } = await supabase!.rpc('my_access');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const next: Entitlement = row ? { active: !!row.active, until: row.access_until ?? null, status: row.status, plan: row.plan, inGrace: !!row.in_grace } : free;
      save(ACCESS_KEY, { ...next, userId: s.user.id } satisfies CachedAccess);
      apply(next);
      setAccessReady(true);
    })();
    let answered = false;
    ask.then(() => { answered = true; }, () => { answered = true; fromCache(); });
    await Promise.race([ask.catch(() => {}), new Promise((r) => setTimeout(r, 4000))]);
    if (!answered) await fromCache();
  }, []);

  // The signed-in session, also when offline. supabase-js returns no session once the access token has expired and
  // the refresh cannot reach the server; a parent who is still signed in stays signed in on the stored copy until
  // they sign out or the server really rejects the sign-in. Queries then fall back to cached data, and the token
  // refreshes by itself when the connection returns.
  const currentSession = useCallback(async (): Promise<Session | null> => {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    return data.session ?? (await storedSession());
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const apply = (s: Session | null) => { setSession(s); loadEntitlement(s); };
    // The stored sign-in shows at once; getSession() then confirms it (offline with an expired token it can take a
    // while to give up, and it returns nothing even though the sign-in is still stored).
    let settled = false;
    storedSession().then((s) => { if (s && !settled) apply(s); });
    currentSession().then((s) => { settled = true; apply(s); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // A null session that is not an explicit sign-out (or a rejected sign-in, which clears the stored copy) is
      // usually just "offline": keep the stored sign-in.
      if (s || event === 'SIGNED_OUT') apply(s);
      else currentSession().then(apply);
    });
    // Subscriptions are bought on the web: re-check access whenever the app comes back to the foreground.
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') { supabase!.auth.startAutoRefresh(); currentSession().then((s) => loadEntitlement(s)); }
      else supabase!.auth.stopAutoRefresh();
    });
    // ...and as soon as the connection comes back (refreshes the token and the access check).
    const net = Network.addNetworkStateListener((n) => {
      if (n.isConnected !== false && n.isInternetReachable !== false) {
        supabase!.auth.getSession().then(({ data }) => { if (data.session) setSession((prev) => (prev?.access_token === data.session!.access_token ? prev : data.session)); });
        currentSession().then((s) => loadEntitlement(s));
      }
    });
    return () => {
      sub.subscription.unsubscribe();
      app.remove();
      net.remove();
    };
  }, [loadEntitlement, currentSession]);

  const value = useMemo<Ctx>(
    () => ({
      configured: !!supabase,
      session,
      entitlement,
      accessReady,
      canRead: (story) => story.isFree || entitlement.active,
      signIn: async (email, password) => {
        if (!supabase) return 'Sign-in is not set up in this build.';
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      signUp: async (email, password) => {
        if (!supabase) return 'Sign-in is not set up in this build.';
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return error.message;
        return data.session ? null : 'Check your email to confirm your account, then sign in.';
      },
      signOut: async () => {
        // Offline the server call can fail: still sign out on this device.
        const { error } = (await supabase?.auth.signOut()) ?? { error: null };
        if (error) await supabase?.auth.signOut({ scope: 'local' });
      },
      requestReset: async (email) => {
        if (!supabase) return 'Sign-in is not set up in this build.';
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return error ? friendly(error.message) : null;
      },
      verifyReset: async (email, code) => {
        if (!supabase) return 'Sign-in is not set up in this build.';
        const { error } = await supabase.auth.verifyOtp({ email, token: code.replace(/\s/g, ''), type: 'recovery' });
        return error ? friendly(error.message) : null;
      },
      setNewPassword: async (password) => {
        if (!supabase) return 'Sign-in is not set up in this build.';
        const { error } = await supabase.auth.updateUser({ password });
        return error ? friendly(error.message) : null;
      },
      refresh: async () => {
        await loadEntitlement(await currentSession());
      },
    }),
    [session, entitlement, accessReady, loadEntitlement, currentSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
