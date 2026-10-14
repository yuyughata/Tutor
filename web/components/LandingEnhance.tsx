'use client';
import { useEffect } from 'react';
import { BASE_PATH, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';

declare global { interface Window { genovaLanding?: { init: () => () => void }; GENOVA_FORMS?: { url: string; key: string } } }

/** Wires up the landing page's plain-JavaScript behaviour (scroll reveal, catalog dialog, request forms) each time it is shown. */
export function LandingEnhance() {
  useEffect(() => {
    // The two request forms save to the Genova database with the public anon key (see public/landing.js).
    window.GENOVA_FORMS = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
    let stop: (() => void) | undefined;
    let cancelled = false;
    const start = () => { if (!cancelled && window.genovaLanding) stop = window.genovaLanding.init(); };
    if (window.genovaLanding) start();
    else {
      const s = document.createElement('script');
      (window as unknown as { GENOVA_BASE?: string }).GENOVA_BASE = BASE_PATH;
      s.src = `${BASE_PATH}/landing.js`;
      s.async = true;
      s.onload = start;
      document.body.appendChild(s);
    }
    return () => { cancelled = true; stop?.(); };
  }, []);
  return null;
}
