import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, currentTheme, themes, type ThemeId } from '../theme';
import { load, save } from './storage';

const KEY = 'genova.theme.v1';
type Ctx = { theme: ThemeId; setTheme: (id: ThemeId) => void };
const ThemeContext = createContext<Ctx>({ theme: 'purple', setTheme: () => {} });

/**
 * Remembers the chosen theme. Screens call `useTheme()` so they re-render (and pick up the new colours)
 * when it changes; styles are rebuilt lazily by `themed()` in theme.ts.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(currentTheme);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    load<string>(KEY, 'purple').then((t) => {
      if (t in themes) { applyTheme(t as ThemeId); setThemeState(t as ThemeId); }
      setReady(true);
    });
  }, []);
  const setTheme = useCallback((id: ThemeId) => { applyTheme(id); setThemeState(id); save(KEY, id); }, []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  if (!ready) return null; // brief: avoids a flash of the wrong colours on launch
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Call at the top of any screen or component that uses theme colours so it updates on a theme switch. */
export const useTheme = () => useContext(ThemeContext);
