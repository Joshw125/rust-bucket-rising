// =============================================================================
// RUST BUCKET RISING - Game Log Panel
// Activity log showing game events (like Board Game Arena)
// =============================================================================

import { useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useGameLog } from '@/hooks';

type LogFilter = 'all' | 'action' | 'hazard';

const LOG_TYPE_STYLES = {
  info: 'text-slate-400',
  action: 'text-amber-300',
  reward: 'text-green-400',
  hazard: 'text-red-400',
  victory: 'text-purple-400',
} as const;

export function GameLogPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const log = useGameLog();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length, autoScroll, isOpen]);

  // Detect if user has scrolled up (disable auto-scroll)
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  };

  const filteredLog = log.filter(entry => {
    if (filter === 'all') return true;
    if (filter === 'action') return entry.type === 'action' || entry.type === 'reward' || entry.type === 'victory';
    if (filter === 'hazard') return entry.type === 'hazard';
    return true;
  });

  // Group entries by turn
  let lastTurn = -1;

  return (
    <div
      className={clsx(
        'fixed right-0 top-0 bottom-0 w-80 bg-slate-950/95 border-l border-amber-900/30 z-40 transition-transform duration-200 flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-3 py-2 border-b border-amber-900/20">
        <h3 className="text-amber-400 font-bold text-sm">Game Log</h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-sm px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          X
        </button>
      </div>

      {/* Filters */}
      <div className="flex-none flex gap-1 px-3 py-2 border-b border-slate-800">
        {(['all', 'action', 'hazard'] as LogFilter[]).map(f => (
          <button
            key={f}
            className={clsx(
              'px-2 py-0.5 rounded text-xs font-semibold transition-colors capitalize',
              filter === f
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            )}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'action' ? 'Actions' : 'Hazards'}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5"
        onScroll={handleScroll}
      >
        {filteredLog.length === 0 && (
          <div className="text-slate-600 text-sm text-center py-4">No log entries yet</div>
        )}
        {filteredLog.map((entry, idx) => {
          const showTurnDivider = entry.turn !== lastTurn;
          lastTurn = entry.turn;

          return (
            <div key={idx}>
              {showTurnDivider && (
                <div className="flex items-center gap-2 py-1 mt-1">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[10px] text-slate-600 font-semibold uppercase">Turn {entry.turn}</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
              )}
              <div className={clsx('text-xs py-0.5', LOG_TYPE_STYLES[entry.type || 'info'])}>
                {entry.message}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          className="absolute bottom-4 right-4 bg-amber-500/90 text-slate-900 text-xs px-3 py-1.5 rounded-full font-bold shadow-lg hover:bg-amber-400 transition-colors"
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
