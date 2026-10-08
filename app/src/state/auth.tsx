import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Story } from '../types';

type Entitlement = { active: boolean; until?: string };

type Ctx = {
  configured: boolean; // Supabase credentials present
  session: Session | null;
  entitlement: Entitlement;
  canRead: (story: Story) => boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement>({ active: false });

  const loadEntitlement = useCallback(async (s: Session | null) => {
    if (!supabase || !s) return setEntitlement((prev) => (prev.active || prev.until ? { active: false } : prev));
    const { data } = await supabase.from('entitlements').select('status, current_period_end').eq('parent_id', s.user.id).maybeSingle();
    const until = data?.current_period_end ?? undefined;
    const live = !!data && ['active', 'trialing'].includes(data.status) && (!until || new Date(until) > new Date());
    // Avoid a new object (and a context update) when nothing changed.
    setEntitlement((prev) => (prev.active === live && prev.until === until ? prev : { active: live, until }));
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
      refresh: async () => {
        const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        await loadEntitlement(data.session);
      },
    }),
    [session, entitlement, loadEntitlement],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
