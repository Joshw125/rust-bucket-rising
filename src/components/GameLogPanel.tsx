// =============================================================================
// RUST BUCKET RISING - Game Log Panel
// Always-visible floating live feed in bottom-right corner
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useGameLog } from '@/hooks';

const LOG_TYPE_STYLES = {
  info: 'text-slate-400',
  action: 'text-amber-300',
  reward: 'text-green-400',
  hazard: 'text-red-400',
  victory: 'text-purple-400',
} as const;

export function GameLogPanel() {
  const log = useGameLog();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length, autoScroll, minimized]);

  // Detect if user has scrolled up (disable auto-scroll)
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  };

  // Show last N entries for the live feed
  const recentLog = log.slice(-50);

  // Group entries by turn
  let lastTurn = -1;

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setMinimized(false)}
          className="bg-slate-900/90 border border-amber-900/30 rounded-lg px-3 py-1.5 text-amber-400 text-xs font-semibold hover:bg-slate-800/90 transition-colors shadow-lg backdrop-blur-sm"
        >
          Log
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col bg-slate-950/90 border border-amber-900/30 rounded-lg shadow-xl backdrop-blur-sm"
      style={{ width: 300, maxHeight: 220 }}
    >
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-2.5 py-1.5 border-b border-amber-900/20">
        <span className="text-amber-400 font-bold text-xs">Game Log</span>
        <button
          onClick={() => setMinimized(true)}
          className="text-slate-500 hover:text-slate-300 text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
          title="Minimize"
        >
          _
        </button>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0"
        onScroll={handleScroll}
        style={{ maxHeight: 180 }}
      >
        {recentLog.length === 0 && (
          <div className="text-slate-600 text-[10px] text-center py-2">No log entries yet</div>
        )}
        {recentLog.map((entry, idx) => {
          const showTurnDivider = entry.turn !== lastTurn;
          lastTurn = entry.turn;

          return (
            <div key={idx}>
              {showTurnDivider && (
                <div className="flex items-center gap-1.5 py-0.5 mt-0.5">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[9px] text-slate-600 font-semibold uppercase">T{entry.turn}</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
              )}
              <div className={clsx('text-[11px] leading-tight py-px', LOG_TYPE_STYLES[entry.type || 'info'])}>
                {entry.message}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll to bottom indicator */}
      {!autoScroll && (
        <button
          className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-amber-500/80 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-bold shadow hover:bg-amber-400 transition-colors"
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              setAutoScroll(true);
            }
          }}
        >
          New entries
        </button>
      )}
    </div>
  );
}

export default GameLogPanel;
