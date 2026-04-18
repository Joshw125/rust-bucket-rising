// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Toast
// ═══════════════════════════════════════════════════════════════════════════════
// Fleeting top-right notification for server errors. Previously these were only
// visible on the OnlineLobby screen — if the server rejected a move mid-game
// (e.g. "not your turn") the user got silent failure. Now they see a message.

import { useEffect, useRef } from 'react';
import { useMultiplayerError, useMultiplayer } from '@/hooks';

const AUTO_DISMISS_MS = 5000;

export function Toast() {
  const error = useMultiplayerError();
  const clearError = useMultiplayer((s) => s.clearError);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error) return;
    // Reset any prior timer so the latest error gets its full 5s
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearError();
      timerRef.current = null;
    }, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [error, clearError]);

  if (!error) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-4 right-4 z-[100] max-w-sm bg-red-950/95 border border-red-500/40 rounded-lg shadow-xl backdrop-blur-sm animate-in slide-in-from-top-2"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-2 h-2 mt-1.5 rounded-full bg-red-400 shrink-0" />
        <div className="flex-1 text-sm text-red-100 leading-snug">{error}</div>
        <button
          onClick={clearError}
          aria-label="Dismiss"
          className="text-red-400 hover:text-red-200 shrink-0 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
