'use client';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase';
import { FREE_ACCESS, type Access, type Plan } from './types';

type Ctx = {
  ready: boolean; // false until we know whether someone is signed in
  session: Session | null;
  email: string | null;
  access: Access;
  plans: Plan[];
  refreshAccess: () => Promise<Access>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<Ctx | null>(null);

/** Premium access comes from the database's my_access(), the single rule shared with the mobile app. */
async function fetchAccess(): Promise<Access> {
  const { data, error } = await getSupabase().rpc('my_access');
  if (error) return FREE_ACCESS;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return FREE_ACCESS;
  return { active: !!row.active, status: row.status, plan: row.plan, currentPeriodEnd: row.current_period_end, accessUntil: row.access_until, inGrace: !!row.in_grace };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<Access>(FREE_ACCESS);
  const [plans, setPlans] = useState<Plan[]>([]);

  const refreshAccess = useCallback(async () => {
    const a = await fetchAccess();
    setAccess(a);
    return a;
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    let live = true;
    sb.from('plans').select('id, name, tagline, price_minor, currency, billing_interval, paystack_plan_code, features, sort_order').eq('active', true).order('sort_order')
      .then(({ data }) => { if (live && data) setPlans(data as Plan[]); });
    sb.auth.getSession().then(async ({ data }) => {
      if (!live) return;
      setSession(data.session);
      if (data.session) setAccess(await fetchAccess());
      if (live) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      setAccess(s ? await fetchAccess() : FREE_ACCESS);
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<Ctx>(() => ({
    ready, session, email: session?.user.email ?? null, access, plans, refreshAccess,
    signOut: async () => { await getSupabase().auth.signOut(); },
  }), [ready, session, access, plans, refreshAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
