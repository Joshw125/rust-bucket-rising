// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Mobile Tab Bar
// Bottom navigation for switching between game views on mobile
// ═══════════════════════════════════════════════════════════════════════════════

import { clsx } from 'clsx';
import { useMobileViewStore, type MobileView } from '@/hooks/useMobileViewStore';

const TABS: { view: MobileView; icon: string; label: string }[] = [
  { view: 'hand', icon: '🃏', label: 'Hand' },
  { view: 'track', icon: '🗺️', label: 'Track' },
  { view: 'systems', icon: '⚙️', label: 'Ship' },
  { view: 'market', icon: '🏪', label: 'Market' },
];

export function MobileTabBar() {
  const activeView = useMobileViewStore((s) => s.activeView);
  const setView = useMobileViewStore((s) => s.setView);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch
                     bg-slate-950/95 border-t border-amber-900/40 safe-area-bottom">
      {TABS.map(({ view, icon, label }) => (
        <button
          key={view}
          className={clsx(
            'flex-1 flex flex-col items-center justify-center py-2 gap-0.5',
            'min-h-[56px] transition-colors',
            activeView === view
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-slate-500 active:bg-slate-800',
          )}
          onClick={() => setView(view)}
        >
          <span className="text-lg leading-none">{icon}</span>
          <span className="text-[10px] font-semibold">{label}</span>
        </button>
      ))}
    </nav>
  );
}
