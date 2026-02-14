// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Game Constants
// ═══════════════════════════════════════════════════════════════════════════════

import type { SystemConfig, SystemType } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Game Settings
// ─────────────────────────────────────────────────────────────────────────────

export const VICTORY_THRESHOLD = 20;
export const HAND_SIZE = 5;
export const MAX_POWER = 6;
export const STARTING_POWER = 1;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Locations & Zones
// ─────────────────────────────────────────────────────────────────────────────

export const LOCATIONS = [1, 2, 3, 4, 5, 6] as const;
export const STATION_LOCATIONS = [1, 3, 5] as const;

export const ZONE_MAP: Record<number, 'near' | 'mid' | 'deep'> = {
  1: 'near',
  2: 'near',
  3: 'mid',
  4: 'mid',
  5: 'deep',
  6: 'deep',
};

export const ZONE_FAME_RANGES = {
  near: { min: 2, max: 2 },
  mid: { min: 3, max: 4 },
  deep: { min: 5, max: 6 },
};

// ─────────────────────────────────────────────────────────────────────────────
// System Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEMS: SystemType[] = ['weapons', 'computers', 'engines', 'logistics'];

export const SYSTEM_CONFIG: Record<SystemType, SystemConfig> = {
  weapons: {
    name: 'Weapons',
    color: '#e53e3e',
    bgClass: 'bg-weapons',
    borderClass: 'border-weapons',
    textClass: 'text-weapons-light',
    gradient: 'from-weapons-dark to-weapons',
    abilities: [
      {
        cost: 1,
        effect: 'giveHazardAtLocation',
        description: 'Give 1 hazard to player at your location',
        requiresTarget: true,
        targetType: 'playerAtLocation',
      },
      {
        cost: 3,
        effect: 'giveHazardAnywhere',
        description: 'Give 1 hazard to any player',
        requiresTarget: true,
        targetType: 'anyPlayer',
      },
    ],
  },
  computers: {
    name: 'Computers',
    color: '#3b82f6',
    bgClass: 'bg-computers',
    borderClass: 'border-computers',
    textClass: 'text-computers-light',
    gradient: 'from-computers-dark to-computers',
    abilities: [
      {
        cost: 1,
        effect: 'draw1',
        description: 'Draw 1 card',
      },
      {
        cost: 3,
        effect: 'draw3keep1',
        description: 'Draw 3 cards, keep 1, discard others',
      },
    ],
  },
  engines: {
    name: 'Engines',
    color: '#ed8936',
    bgClass: 'bg-engines',
    borderClass: 'border-engines',
    textClass: 'text-engines-light',
    gradient: 'from-engines-dark to-engines',
    abilities: [
      {
        cost: 1, 
        effect: 'move1', 
        description: 'Move 1 space',
      },
    ],
  },
  logistics: {
    name: 'Logistics',
    color: '#48bb78',
    bgClass: 'bg-logistics',
    borderClass: 'border-logistics',
    textClass: 'text-logistics-light',
    gradient: 'from-logistics-dark to-logistics',
    abilities: [
      {
        cost: 1,
        effect: 'gain1Credit',
        description: 'Gain 1 credit',
      },
      {
        cost: 3,
        effect: 'trashCard',
        description: 'Trash 1 card from hand or discard',
        requiresTarget: true,
        targetType: 'card',
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Market Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const MARKET_CONFIG = {
  1: { // Station 1 - Tier 1 (Core Cards)
    tier: 1,
    stackSetup: 'identical', // 5 stacks of 4 identical cards
    stackCount: 5,
    cardsPerStack: 4,
  },
  3: { // Station 3 - Tier 2
    tier: 2,
    stackSetup: 'shuffled', // Cards shuffled into random stacks of 4
    cardsPerStack: 4,
  },
  5: { // Station 5 - Tier 3
    tier: 3,
    stackSetup: 'shuffled',
    cardsPerStack: 4,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Balance Baselines
// ─────────────────────────────────────────────────────────────────────────────

export const BALANCE_BASELINES = {
  // Card costs
  powerPerCredit: 0.67, // 2 power for 3 credits
  creditsPerCredit: 0.67, // 2 credits for 3 credits
  drawValue: 1.5, // Draw 1 card worth ~1.5 credits
  moveValue: 1.0, // 1 move worth ~1 credit
  hazardValue: 1.5, // Giving 1 hazard worth ~1.5 credits
  
  // Installation value
  installMultiplier: 1.5, // Persistent effects worth 1.5x over game
  avgGameTurns: 10,
  
  // Mission balance
  famePerPower: 0.5, // ~0.5-0.67 fame per power spent
};

// ─────────────────────────────────────────────────────────────────────────────
// UI Constants
// ─────────────────────────────────────────────────────────────────────────────

export const CARD_SIZES = {
  tiny: { width: 64, height: 88 },
  small: { width: 80, height: 112 },
  normal: { width: 128, height: 176 },
  large: { width: 160, height: 224 },
  xlarge: { width: 180, height: 252 }, // For hand display
  huge: { width: 320, height: 440 }, // For card viewer modal (2.5x normal)
};

// ─────────────────────────────────────────────────────────────────────────────
// Layout Constants (1920x1080 target)
// ─────────────────────────────────────────────────────────────────────────────

export const LAYOUT = {
  headerHeight: 56,
  spaceTrackHeight: 200,
  tableauHeight: 320,
  handHeight: 300,
  actionBarHeight: 64,
  marketWidth: 600,
};

// Station icon paths
export const STATION_ICONS: Record<1 | 3 | 5, string> = {
  1: '/cards/station/Station1.png',
  3: '/cards/station/Station2.png',
  5: '/cards/station/Station3.png',
};

// Ship board image paths (assigned per player)
export const SHIP_IMAGES = [1, 2, 3, 4] as const;

// Player tableau overlay positions (percentages for absolute positioning)
// These match the regions on the Ship PNG boards
export const TABLEAU_POSITIONS = {
  // Fame track along the top
  fameTrack: {
    top: '2%',
    left: '8%',
    width: '60%',
    height: '14%'
  },
  // Engines on the left side
  engines: {
    top: '18%',
    left: '1%',
    width: '12%',
    height: '48%'
  },
  // Captain card slot on the right
  captain: {
    top: '12%',
    right: '1%',
    width: '22%',
    height: '58%'
  },
  // Bottom systems row
  computers: {
    bottom: '4%',
    left: '14%',
    width: '22%',
    height: '30%'
  },
  logistics: {
    bottom: '4%',
    left: '38%',
    width: '22%',
    height: '30%'
  },
  weapons: {
    bottom: '4%',
    left: '62%',
    width: '22%',
    height: '30%'
  },
};

export const ZONE_COLORS = {
  near: {
    bg: 'bg-near',
    text: 'text-near-light',
    border: 'border-near',
    gradient: 'from-near-dark to-near',
  },
  mid: {
    bg: 'bg-mid',
    text: 'text-mid-light',
    border: 'border-mid',
    gradient: 'from-mid-dark to-mid',
  },
  deep: {
    bg: 'bg-deep',
    text: 'text-deep-light',
    border: 'border-deep',
    gradient: 'from-deep-dark to-deep',
  },
};
