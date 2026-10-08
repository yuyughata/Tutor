import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the device asks for less motion (iOS Reduce Motion, Android remove animations, web prefers-reduced-motion). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduced(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { live = false; sub.remove(); };
  }, []);
  return reduced;
}

/** Screen readers announce this immediately (e.g. "Page 2 of 5"). */
export const announce = (message: string) => AccessibilityInfo.announceForAccessibility(message);
