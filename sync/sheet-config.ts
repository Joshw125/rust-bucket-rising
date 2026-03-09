/**
 * Google Sheets configuration for Rust Bucket Rising sync tooling.
 * Maps sheet tab names to their types and expected column schemas.
 */

export const SPREADSHEET_ID = '1wkwNEjC75ph0bmO6p5omltYcFbUC7eoBeFFVmZblqiA';

export interface SheetDef {
  tabName: string;
  cacheFile: string;
  type: 'action' | 'captain' | 'hazard' | 'starter' | 'mission' | 'meta';
  tier?: 1 | 2 | 3;
  zone?: 'near' | 'mid' | 'deep';
}

export const SHEETS: Record<string, SheetDef> = {
  tier1: {
    tabName: 'v3 Core Action Cards',
    cacheFile: 'tier1-core-action-cards.json',
    type: 'action',
    tier: 1,
  },
  tier2: {
    tabName: 'v3 Tier 2 Market Cards',
    cacheFile: 'tier2-market-cards.json',
    type: 'action',
    tier: 2,
  },
  tier3: {
    tabName: 'v3 Tier 3 Market Cards',
    cacheFile: 'tier3-market-cards.json',
    type: 'action',
    tier: 3,
  },
  captains: {
    tabName: 'Captains',
    cacheFile: 'captains.json',
    type: 'captain',
  },
  hazards: {
    tabName: 'Hazard Cards',
    cacheFile: 'hazard-cards.json',
    type: 'hazard',
  },
  starters: {
    tabName: 'Starting Cards',
    cacheFile: 'starting-cards.json',
    type: 'starter',
  },
  missionsNear: {
    tabName: 'v2 Missions Near',
    cacheFile: 'missions-near.json',
    type: 'mission',
    zone: 'near',
  },
  missionsMid: {
    tabName: 'v2 Missions Middle',
    cacheFile: 'missions-middle.json',
    type: 'mission',
    zone: 'mid',
  },
  missionsDeep: {
    tabName: 'v2 Missions Deep',
    cacheFile: 'missions-deep.json',
    type: 'mission',
    zone: 'deep',
  },
  marketTokens: {
    tabName: 'Market Tokens',
    cacheFile: 'market-tokens.json',
    type: 'meta',
  },
  playerShips: {
    tabName: 'Player Ships',
    cacheFile: 'player-ships.json',
    type: 'meta',
  },
  missionZones: {
    tabName: 'mission zones',
    cacheFile: 'mission-zones.json',
    type: 'meta',
  },
};

/**
 * Fields owned by the Google Sheet (source of truth for these).
 * Sync direction: Sheets → App
 */
export const SHEET_OWNED_FIELDS = {
  action: ['title', 'cost', 'installCost', 'copies', 'system'] as const,
  hazard: ['title', 'copies'] as const,
  captain: [] as const, // App is source of truth for captains
  mission: ['title', 'requirements', 'fame', 'type', 'rewardType'] as const,
  starter: ['title', 'copies'] as const,
};

/**
 * Fields owned by the app code (never overwritten by sheet sync).
 * These encode game logic that sheets can't represent.
 */
export const CODE_OWNED_FIELDS = {
  action: ['effectData', 'installData', 'reaction', 'effect', 'installEffect'] as const,
  hazard: ['clearCost', 'passOnClear', 'revealOnDraw', 'effect', 'clearCondition'] as const,
  captain: ['ability', 'effect'] as const,
  mission: ['rewardData', 'reward'] as const,
  starter: ['effectData', 'effect'] as const,
};
