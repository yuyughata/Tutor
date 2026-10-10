'use client';
import { useEffect } from 'react';

declare global { interface Window { genovaLanding?: { init: () => () => void } } }

/** Wires up the landing page's plain-JavaScript behaviour (scroll reveal, catalog dialog, request forms) each time it is shown. */
export function LandingEnhance() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    const start = () => { if (!cancelled && window.genovaLanding) stop = window.genovaLanding.init(); };
    if (window.genovaLanding) start();
    else {
      const s = document.createElement('script');
      s.src = '/landing.js';
      s.async = true;
      s.onload = start;
      document.body.appendChild(s);
    }
    return () => { cancelled = true; stop?.(); };
  }, []);
  return null;
}
