import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
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
    try {
      const { data, error } = await supabase.rpc('my_access');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const next: Entitlement = row ? { active: !!row.active, until: row.access_until ?? null, status: row.status, plan: row.plan, inGrace: !!row.in_grace } : free;
      save(ACCESS_KEY, { ...next, userId: s.user.id } satisfies CachedAccess);
      apply(next);
      setAccessReady(true);
    } catch {
      const cached = await load<CachedAccess | null>(ACCESS_KEY, null);
      const stillValid = cached && cached.userId === s.user.id && cached.active && (!cached.until || new Date(cached.until) > new Date());
      apply(stillValid ? { active: true, until: cached.until, status: cached.status, plan: cached.plan, inGrace: cached.inGrace } : free);
      setAccessReady(true);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadEntitlement(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadEntitlement(s);
    });
    // Subscriptions are bought on the web: re-check access whenever the app comes back to the foreground.
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') supabase!.auth.getSession().then(({ data }) => loadEntitlement(data.session));
    });
    return () => {
      sub.subscription.unsubscribe();
      app.remove();
    };
  }, [loadEntitlement]);

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
        await supabase?.auth.signOut();
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
        const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        await loadEntitlement(data.session);
      },
    }),
    [session, entitlement, accessReady, loadEntitlement],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
