// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Animation Event Store
// Lightweight event bus for coordinating UI animations
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { CardInstance, SystemType } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Animation Event Types
// ─────────────────────────────────────────────────────────────────────────────

export type AnimationEventData =
  | { type: 'card-play'; card: CardInstance; fromRect: DOMRect; target: 'played' | 'discard' }
  | { type: 'card-install'; card: CardInstance; fromRect: DOMRect; targetSystem: SystemType }
  | { type: 'card-trash'; card: CardInstance; fromRect: DOMRect }
  | { type: 'card-buy'; card: CardInstance; fromRect: DOMRect }
  | { type: 'credits-change'; delta: number }
  | { type: 'fame-change'; delta: number }
  | { type: 'hazard-reveal' }
  | { type: 'mission-complete' }
  | { type: 'turn-start'; playerName: string; playerIndex: number };

export type AnimationEvent = AnimationEventData & { id: string };

// ─────────────────────────────────────────────────────────────────────────────
// Ref Registry (DOM positions for animation targets)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnimationRefs {
  deckPile: HTMLElement | null;
  playedPile: HTMLElement | null;
  discardPile: HTMLElement | null;
  creditCounter: HTMLElement | null;
  fameCounter: HTMLElement | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

let eventCounter = 0;

interface AnimationStore {
  events: AnimationEvent[];
  refs: AnimationRefs;

  // Emit an animation event (auto-generates ID)
  emit: (event: AnimationEventData) => string;

  // Dismiss a completed animation
  dismiss: (id: string) => void;

  // Clear all events
  clear: () => void;

  // Register a DOM element ref
  setRef: (key: keyof AnimationRefs, el: HTMLElement | null) => void;

  // Get a ref's bounding rect (returns null if not registered)
  getRefRect: (key: keyof AnimationRefs) => DOMRect | null;
}

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  events: [],
  refs: {
    deckPile: null,
    playedPile: null,
    discardPile: null,
    creditCounter: null,
    fameCounter: null,
  },

  emit: (event) => {
    const id = `anim-${++eventCounter}`;
    const fullEvent = { ...event, id } as AnimationEvent;
    set((state) => ({ events: [...state.events, fullEvent] }));

    // Auto-dismiss after 1 second (safety net)
    setTimeout(() => get().dismiss(id), 1000);

    return id;
  },

  dismiss: (id) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
  },

  clear: () => set({ events: [] }),

  setRef: (key, el) => {
    set((state) => ({
      refs: { ...state.refs, [key]: el },
    }));
  },

  getRefRect: (key) => {
    const el = get().refs[key];
    return el ? el.getBoundingClientRect() : null;
  },
}));
