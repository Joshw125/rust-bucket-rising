// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────────────────────

export type SystemType = 'weapons' | 'computers' | 'engines' | 'logistics';

export type ZoneType = 'near' | 'mid' | 'deep';

export type MissionType = 
  | 'Trade' 
  | 'Combat' 
  | 'Exploration' 
  | 'Diplomacy' 
  | 'Smuggling' 
  | 'Maintenance'
  | 'Research';

export type RewardType = 'bolt' | 'gear' | 'trophy';

export type CardType = 'starter' | 'action' | 'hazard';

export type GamePhase = 'setup' | 'initial' | 'action' | 'cleanup' | 'gameOver';

// ─────────────────────────────────────────────────────────────────────────────
// System Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemAbility {
  cost: number;
  effect: string;
  description: string;
  requiresTarget?: boolean;
  targetType?: 'playerAtLocation' | 'anyPlayer' | 'card';
}

export interface SystemConfig {
  name: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  gradient: string;
  abilities: SystemAbility[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Power & Resources
// ─────────────────────────────────────────────────────────────────────────────

export interface PowerState {
  weapons: number;
  computers: number;
  engines: number;
  logistics: number;
}

export interface PowerRequirement {
  weapons?: number;
  computers?: number;
  engines?: number;
  logistics?: number;
}

export interface PowerAllocation {
  weapons: number;
  computers: number;
  engines: number;
  logistics: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Effects
// ─────────────────────────────────────────────────────────────────────────────

export interface CardEffectData {
  // Resource generation
  credits?: number;
  fame?: number;
  power?: Partial<PowerState>;
  powerChoice?: number; // Player chooses which system(s)
  powerToTwo?: number; // Add to two different systems
  powerPerInstallation?: number; // +N⚡ per installation on ship

  // Movement
  moves?: number;
  moveOther?: number; // Move another player

  // Card manipulation
  draw?: number;
  mayTrash?: number;
  mustTrash?: number;
  extraPlay?: number;
  playFromDiscard?: boolean;

  // Discounts
  buyDiscount?: number;
  installDiscount?: number;
  missionDiscount?: number;

  // Hazards
  giveHazard?: boolean;
  giveHazardAnywhere?: boolean;
  hazardAllAtLocation?: boolean;
  hazardAll?: boolean;
  powerPerHazard?: number;
  trashHazard?: number;

  // Conditional effects
  conditionalPower?: {
    trigger: string;
    amount: number;
  };
  conditionalCredits?: {
    trigger: string;
    amount: number;
  };
  bonusIfHadHazard?: {
    power?: number;
    credits?: number;
  };

  // Special
  oneTimeUse?: boolean;
  extraTurn?: boolean;
  fameIfHazards?: {
    count: number;
    fame: number;
  };
}

export interface InstallEffectData extends CardEffectData {
  trigger?: string;
  reallocate?: number;
  cardPowerDiscount?: number;
  mayPlayFromDiscard?: boolean;
  endGameFame?: number; // +N Fame at end of game
  onGiveHazard?: {
    targetDiscard?: number; // Target discards N cards when you give hazard
    credits?: number; // Gain N credits when you give hazard
  };
}

export interface ReactionData {
  trigger: string;
  effect: string;
  bonus?: Partial<CardEffectData>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseCard {
  id: string;
  title: string;
  type: CardType;
  flavor?: string;
  copies: number;
}

export interface StarterCard extends BaseCard {
  type: 'starter';
  effect: string;
  effectData: CardEffectData;
}

export interface ActionCard extends BaseCard {
  type: 'action';
  tier: 1 | 2 | 3;
  cost: number;
  system?: SystemType;
  effect: string;
  effectData: CardEffectData;
  
  // Installation
  installCost?: number;
  installEffect?: string;
  installData?: InstallEffectData;
  
  // Reaction
  reaction?: ReactionData;
}

export interface HazardCard extends BaseCard {
  type: 'hazard';
  effect: string;
  clearCondition: string;
  clearCost: {
    credits?: number;
    discard?: number;
    power?: Partial<PowerState>;
    spendAll?: SystemType;
    min?: number;
    powerFromDifferent?: number;
  };
  passOnClear?: boolean;
  revealOnDraw?: boolean;
}

export type Card = StarterCard | ActionCard | HazardCard;

export type CardInstance = Card & {
  instanceId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Missions
// ─────────────────────────────────────────────────────────────────────────────

export interface MissionRewardData extends CardEffectData {
  choice?: CardEffectData[];
  passive?: {
    trigger: string;
    power?: number;
    credits?: number;
  };
  endGamePenalty?: {
    fame?: number;
    credits?: number;
  };
  conditionalFame?: {
    trigger: string;
    amount: number;
  };
  conditionalReward?: {
    trigger: string;
    power?: number;
    fame?: number;
  };
}

export interface Mission {
  id: string;
  zone: 'near' | 'mid' | 'deep';
  title: string;
  requirements: PowerRequirement;
  fame: number;
  type: MissionType;
  rewardType: RewardType;
  reward: string;
  rewardData: MissionRewardData;
  flavor?: string;
}

export interface MissionInstance extends Mission {
  instanceId: string;
}

export interface TrackMission {
  mission: MissionInstance;
  revealed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Captains
// ─────────────────────────────────────────────────────────────────────────────

export interface CaptainAbility {
  // Start of game bonuses
  startBonus?: Partial<PowerState>;
  startPenalty?: number;
  
  // Turn start effects
  turnStart?: 'credit' | 'powerToHighest';
  
  // Passive abilities
  freeMove?: number;
  doubleActivate?: boolean;
  
  // Triggered abilities
  trigger?: string;
  reward?: 'credit' | 'draw' | 'giveHazard';
}

export interface Captain {
  id: string;
  name: string;
  effect: string;
  ability: CaptainAbility;
  flavor?: string;
  image?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player
// ─────────────────────────────────────────────────────────────────────────────

export interface Installations {
  weapons: CardInstance | null;
  computers: CardInstance | null;
  engines: CardInstance | null;
  logistics: CardInstance | null;
}

// Gear from completed missions installed to systems
export interface GearInstallations {
  weapons: MissionInstance | null;
  computers: MissionInstance | null;
  engines: MissionInstance | null;
  logistics: MissionInstance | null;
}

export interface Player {
  id: number;
  name: string;
  captain: Captain;
  isAI: boolean;
  aiStrategy?: AIStrategy;
  
  // Cards
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  played: CardInstance[];
  installations: Installations;
  gearInstallations: GearInstallations; // Gear rewards from missions installed to systems

  // Progress
  completedMissions: MissionInstance[];
  trophies: MissionInstance[];
  
  // Resources
  credits: number;
  fame: number;
  location: 1 | 2 | 3 | 4 | 5 | 6;
  
  // Power (d6 tracking)
  maxPower: PowerState; // Always 6 for each
  startingPower: PowerState; // 1 + captain bonuses
  currentPower: PowerState; // Available this turn
  
  // Turn state
  movesRemaining: number;
  cardsPlayedThisTurn: number;
  movesThisTurn: number; // Tracks actual spaces moved (for Thruster Jam)
  powerGainedFromCardsThisTurn: number; // Tracks power from cards (for Overloaded Circuits)
  usedCaptainAbility: boolean;
  usedOneTimeCards: string[];
  usedSystemAbilities: Record<SystemType, boolean[]>; // Track which abilities used this turn

  // Discounts (reset each turn)
  buyDiscount: number;
  installDiscount: number;
  missionDiscount: number;
  extraPlays: number;
  
  // Stats
  hazardsInDeck: number;

  // Turn tracking for reveals
  revealedStacksThisTurn: Record<1 | 3 | 5, number | false>; // Tracks which stack index was revealed per tier this turn (false = none)
}

// ─────────────────────────────────────────────────────────────────────────────
// Market
// ─────────────────────────────────────────────────────────────────────────────

export type MarketStack = CardInstance[];

export interface MarketStackInfo {
  cards: CardInstance[];
  revealed: boolean; // T1 always revealed, T2/T3 start face-down until browsed
}

export interface MarketStacks {
  1: MarketStackInfo[]; // Station 1 - Tier 1 (5 stacks of 4, always revealed)
  3: MarketStackInfo[]; // Station 3 - Tier 2 (4 stacks of 4, face-down initially)
  5: MarketStackInfo[]; // Station 5 - Tier 3 (3 stacks of 3, face-down initially)
}

// ─────────────────────────────────────────────────────────────────────────────
// Game State
// ─────────────────────────────────────────────────────────────────────────────

export interface MissionPools {
  near: MissionInstance[];
  mid: MissionInstance[];
  deep: MissionInstance[];
}

export interface LogEntry {
  turn: number;
  message: string;
  type?: 'info' | 'action' | 'reward' | 'hazard' | 'victory';
}

export interface PendingAction {
  type: 'powerAllocation' | 'targetPlayer' | 'selectCard' | 'draw3keep1' | 'trashCard' | 'installChoice' | 'revealHazards' | 'missionReward' | 'missionRewardChoice' | 'moveOtherPlayer';
  playerId: number;
  data?: {
    amount?: number;
    cardTitle?: string;
    card?: CardInstance;
    cards?: CardInstance[];
    source?: 'hand' | 'discard' | 'both' | 'giveHazardAtLocation' | 'giveHazardAnywhere';
    hazards?: CardInstance[];
    mission?: MissionInstance;
    powerAmount?: number;
    rewardType?: 'bolt' | 'gear' | 'trophy';
    choiceIndex?: number;
    mandatory?: boolean; // For mustTrash: can't skip
    deferredEffects?: CardEffectData; // Effects to apply after pending action resolves
    bonusIfHadHazard?: { power?: number; credits?: number }; // For Scrap Shot
    moveOther?: number; // Chain moveOther after giveHazard
    targetPlayerIds?: number[]; // Valid target player IDs for moveOtherPlayer
  };
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  turn: number;
  phase: GamePhase;

  // Board state
  trackMissions: Record<number, TrackMission | null>;
  missionPools: MissionPools;
  marketStacks: MarketStacks;
  hazardDeck: CardInstance[];
  pendingMissionReplacements: number[]; // Locations that need new missions at end of turn

  // UI state
  log: LogEntry[];
  pendingAction: PendingAction | null;

  // Undo/Restart tracking
  hasRevealedInfo: boolean; // True if mission flipped, card revealed from stack, etc.
  turnStartSnapshot: string | null; // JSON snapshot of state at turn start (for restart)

  // Extra turn tracking (Temporal Jump)
  extraTurnQueued: boolean;

  // Game end
  gameOver: boolean;
  winner: Player | null;
  endGameTriggeredBy: Player | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

export type AIStrategy = 'balanced' | 'aggressive' | 'economic' | 'explorer' | 'rush';

export interface AIDecision {
  action: string;
  target?: unknown;
  priority: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Actions
// ─────────────────────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'PLAY_CARD'; cardInstanceId: string; powerAllocation?: PowerAllocation }
  | { type: 'INSTALL_CARD'; cardInstanceId: string; targetSystem: SystemType }
  | { type: 'ACTIVATE_SYSTEM'; system: SystemType; abilityIndex: number; targetPlayerId?: number }
  | { type: 'MOVE'; direction: -1 | 1 }
  | { type: 'COMPLETE_MISSION' }
  | { type: 'BUY_CARD'; stackIndex: number; cardIndex: number }
  | { type: 'BUY_AND_INSTALL'; stackIndex: number; targetSystem: SystemType; cardIndex?: number }
  | { type: 'END_TURN' }
  | { type: 'RESOLVE_PENDING'; choice: unknown }
  | { type: 'CLEAR_HAZARD'; hazardInstanceId: string }
  | { type: 'RESTART_TURN' };

// ─────────────────────────────────────────────────────────────────────────────
// Simulation
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationResults {
  gamesPlayed: number;
  avgTurns: number;
  strategyWinRates: Record<string, number>;
  strategyAvgFame: Record<string, number>;
  captainWinRates: Record<string, number>;
  captainAvgFame: Record<string, number>;
  durationMs: number;
}

export interface SimulationConfig {
  gamesCount: number;
  playerCount: number;
  strategies: AIStrategy[];
  captains: string[];
  randomizeCaptains: boolean;
  maxTurns: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────────────────────────────────────

export interface CardProps {
  card: CardInstance;
  size?: 'tiny' | 'small' | 'normal' | 'large';
  selected?: boolean;
  disabled?: boolean;
  showBack?: boolean;
  onClick?: () => void;
}

export interface PlayerBoardProps {
  player: Player;
  isCurrentPlayer: boolean;
  onPlayCard: (card: CardInstance) => void;
  onInstallCard: (card: CardInstance, system: SystemType) => void;
  onActivateSystem: (system: SystemType, abilityIndex: number) => void;
}

export interface SpaceTrackProps {
  state: GameState;
  currentPlayerId: number;
  onMove: (direction: -1 | 1) => void;
  onSelectLocation: (location: number) => void;
}

export interface MarketBrowserProps {
  stacks: MarketStack[];
  player: Player;
  onBuy: (stackIndex: number, cardIndex: number) => void;
  onClose: () => void;
}

export interface PowerAllocationModalProps {
  amount: number;
  cardTitle: string;
  player: Player;
  onAllocate: (allocation: PowerAllocation) => void;
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiplayer Types (re-exported)
// ─────────────────────────────────────────────────────────────────────────────

export * from './multiplayer';
