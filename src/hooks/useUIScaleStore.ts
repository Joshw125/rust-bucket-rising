// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - UI Scale Store
// Independent section scaling with localStorage persistence
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SectionScales {
  hand: number;
  spaceTrack: number;
  market: number;
  sidebar: number;
}

interface UIScaleStore {
  scales: SectionScales;
  showScalePanel: boolean;
  setScale: (section: keyof SectionScales, value: number) => void;
  resetScales: () => void;
  toggleScalePanel: () => void;
}

const DEFAULT_SCALES: SectionScales = {
  hand: 1.0,
  spaceTrack: 1.0,
  market: 1.0,
  sidebar: 1.0,
};

export const useUIScaleStore = create<UIScaleStore>()(
  persist(
    (set) => ({
      scales: { ...DEFAULT_SCALES },
      showScalePanel: false,
      setScale: (section, value) =>
        set((state) => ({
          scales: { ...state.scales, [section]: Math.round(value * 100) / 100 },
        })),
      resetScales: () => set({ scales: { ...DEFAULT_SCALES } }),
      toggleScalePanel: () =>
        set((state) => ({ showScalePanel: !state.showScalePanel })),
    }),
    {
      name: 'rbr-ui-scale',
      version: 1,
    }
  )
);
