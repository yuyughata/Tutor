import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { AgeBand, ChildProfile } from '../types';
import { useAuth } from './auth';
import { load, save } from './storage';

type Ctx = {
  ready: boolean;
  children: ChildProfile[];
  active: ChildProfile | null;
  add: (p: Omit<ChildProfile, 'id'>) => ChildProfile;
  update: (id: string, patch: Partial<Omit<ChildProfile, 'id'>>) => void;
  remove: (id: string) => void;
  select: (id: string) => void;
};

const KEY = 'genova.children.v1';
const ACTIVE_KEY = 'genova.activeChild.v1';
const ProfilesContext = createContext<Ctx | null>(null);

// Local-first: profiles always live on the device, and mirror to Supabase (child_profiles)
// when a parent is signed in. Children never get their own accounts.
export function ProfilesProvider({ children: kids }: { children: ReactNode }) {
  const { session } = useAuth();
  const [list, setList] = useState<ChildProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const listRef = useRef(list);
  listRef.current = list;

  useEffect(() => {
    (async () => {
      const [l, a] = await Promise.all([load<ChildProfile[]>(KEY, []), load<string | null>(ACTIVE_KEY, null)]);
      setList(l);
      setActiveId(a && l.some((c) => c.id === a) ? a : (l[0]?.id ?? null));
      setReady(true);
    })();
  }, []);

  // On sign-in, merge remote profiles in and push local-only ones up.
  useEffect(() => {
    if (!supabase || !session || !ready) return;
    (async () => {
      const { data } = await supabase!.from('child_profiles').select('id, name, avatar, age_band');
      const remote: ChildProfile[] = (data ?? []).map((r) => ({ id: r.id, name: r.name, avatar: r.avatar, ageBand: r.age_band }));
      const local = listRef.current;
      const merged = [...local, ...remote.filter((r) => !local.some((l) => l.id === r.id))];
      const localOnly = local.filter((l) => !remote.some((r) => r.id === l.id));
      if (localOnly.length) {
        await supabase!.from('child_profiles').upsert(
          localOnly.map((c) => ({ id: c.id, parent_id: session.user.id, name: c.name, avatar: c.avatar, age_band: c.ageBand })),
        );
      }
      setList(merged);
      save(KEY, merged);
      setActiveId((a) => a ?? merged[0]?.id ?? null);
    })().catch(() => {});
  }, [session, ready]);

  const persist = useCallback((next: ChildProfile[]) => {
    setList(next);
    save(KEY, next);
  }, []);

  const value = useMemo<Ctx>(() => {
    const push = (c: ChildProfile) => {
      if (supabase && session) {
        supabase.from('child_profiles').upsert({ id: c.id, parent_id: session.user.id, name: c.name, avatar: c.avatar, age_band: c.ageBand }).then(() => {});
      }
    };
    return {
      ready,
      children: list,
      active: list.find((c) => c.id === activeId) ?? null,
      add: (p) => {
        const child: ChildProfile = { id: Crypto.randomUUID(), ...p };
        persist([...listRef.current, child]);
        setActiveId(child.id);
        save(ACTIVE_KEY, child.id);
        push(child);
        return child;
      },
      update: (id, patch) => {
        const next = listRef.current.map((c) => (c.id === id ? { ...c, ...patch } : c));
        persist(next);
        const changed = next.find((c) => c.id === id);
        if (changed) push(changed);
      },
      remove: (id) => {
        const next = listRef.current.filter((c) => c.id !== id);
        persist(next);
        if (activeId === id) {
          const fallback = next[0]?.id ?? null;
          setActiveId(fallback);
          save(ACTIVE_KEY, fallback);
        }
        if (supabase && session) supabase.from('child_profiles').delete().eq('id', id).then(() => {});
      },
      select: (id) => {
        setActiveId(id);
        save(ACTIVE_KEY, id);
      },
    };
  }, [list, activeId, ready, session, persist]);

  return <ProfilesContext.Provider value={value}>{kids}</ProfilesContext.Provider>;
}

export function useProfiles() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('useProfiles must be used inside ProfilesProvider');
  return ctx;
}

/** The active child's age band, or a sensible default before onboarding finishes. */
export function useAgeBand(): AgeBand {
  return useProfiles().active?.ageBand ?? '5-8';
}
