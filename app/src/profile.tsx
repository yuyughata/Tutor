import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AgeBand } from './types';

// Phase 0: a single local child profile. Real profiles come from child_profiles after auth.
type Ctx = { name: string; ageBand: AgeBand; setAgeBand: (b: AgeBand) => void };
const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [ageBand, setAgeBand] = useState<AgeBand>('9-12');
  return <ProfileContext.Provider value={{ name: 'Reader', ageBand, setAgeBand }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
