// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Mobile View State
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';

export type MobileView = 'hand' | 'track' | 'systems' | 'market';

interface MobileViewStore {
  activeView: MobileView;
  setView: (view: MobileView) => void;
}

export const useMobileViewStore = create<MobileViewStore>((set) => ({
  activeView: 'hand',
  setView: (view) => set({ activeView: view }),
}));
