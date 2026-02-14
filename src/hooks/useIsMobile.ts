// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Mobile Detection Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // Matches Tailwind's `md:` breakpoint

/**
 * Detects whether the viewport is below the mobile breakpoint (768px).
 * Uses `window.matchMedia` for performance — no resize debouncing needed.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
