// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Game Engine
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  GameState,
  Player,
  Captain,
  CardInstance,
  Card,
  PowerState,
  PowerAllocation,
  SystemType,
  GameAction,
  LogEntry,
  MissionInstance,
  TrackMission,
  MarketStacks,
  MissionPools,
  ActionCard,
  HazardCard,
} from '@/types';

import {
  VICTORY_THRESHOLD,
  HAND_SIZE,
  MAX_POWER,
  STARTING_POWER,
  SYSTEMS,
  ZONE_MAP,
  SYSTEM_CONFIG,
} from '@/data/constants';

import { STARTING_CARDS, TIER_1_CARDS, TIER_2_CARDS, TIER_3_CARDS, HAZARD_CARDS } from '@/data/cards';
import { NEAR_MISSIONS, MID_MISSIONS, DEEP_MISSIONS } from '@/data/missions';

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

let instanceIdCounter = 0;

export function generateInstanceId(): string {
  return `inst_${++instanceIdCounter}_${Date.now()}`;
}

export function resetInstanceIdCounter(): void {
  instanceIdCounter = 0;
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createCardInstance(card: Card): CardInstance {
  return {
    ...card,
    instanceId: generateInstanceId(),
  };
}

export function createMissionInstance(mission: typeof NEAR_MISSIONS[0]): MissionInstance {
  return {
    ...mission,
    instanceId: generateInstanceId(),
  };
}

export function createEmptyPowerState(): PowerState {
  return { weapons: 0, computers: 0, engines: 0, logistics: 0 };
}

export function createStartingPowerState(captain: Captain): PowerState {
  const base: PowerState = {
    weapons: STARTING_POWER,
    computers: STARTING_POWER,
    engines: STARTING_POWER,
    logistics: STARTING_POWER,
  };

  // Apply captain start bonuses
  if (captain.ability.startBonus) {
    for (const system of SYSTEMS) {
      base[system] += captain.ability.startBonus[system] ?? 0;
    }
  }

  // Apply captain start penalty (Ghost)
  if (captain.ability.startPenalty) {
    for (const system of SYSTEMS) {
      base[system] = Math.max(0, base[system] - captain.ability.startPenalty);
    }
  }

  return base;
}

export function createMaxPowerState(): PowerState {
  return {
    weapons: MAX_POWER,
    computers: MAX_POWER,
    engines: MAX_POWER,
    logistics: MAX_POWER,
  };
}

export function clampPower(power: PowerState): PowerState {
  return {
    weapons: Math.min(MAX_POWER, Math.max(0, power.weapons)),
    computers: Math.min(MAX_POWER, Math.max(0, power.computers)),
    engines: Math.min(MAX_POWER, Math.max(0, power.engines)),
    logistics: Math.min(MAX_POWER, Math.max(0, power.logistics)),
  };
}

export function getTotalPower(power: PowerState): number {
  return power.weapons + power.computers + power.engines + power.logistics;
}

export function getHighestSystem(power: PowerState): SystemType {
  let highest: SystemType = 'weapons';
  let max = power.weapons;

  for (const system of SYSTEMS) {
    if (power[system] > max) {
      max = power[system];
      highest = system;
    }
  }

  return highest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Creation
// ─────────────────────────────────────────────────────────────────────────────

export function createPlayer(id: number, name: string, captain: Captain, isAI = false): Player {
  // Build starting deck
  const deck: CardInstance[] = [];
  for (const card of STARTING_CARDS) {
    for (let i = 0; i < card.copies; i++) {
      deck.push(createCardInstance(card));
    }
  }

  const startingPower = createStartingPowerState(captain);

  return {
    id,
    name,
    captain,
    isAI,

    // Cards - start with shuffled deck, draw initial hand later
    deck: shuffle(deck),
    hand: [],
    discard: [],
    played: [],
    installations: {
      weapons: null,
      computers: null,
      engines: null,
      logistics: null,
    },
    gearInstallations: {
      weapons: null,
      computers: null,
      engines: null,
      logistics: null,
    },

    // Progress
    completedMissions: [],
    trophies: [],

    // Resources
    credits: 0,
    fame: 0,
    location: 1,

    // Power
    maxPower: createMaxPowerState(),
    startingPower,
    currentPower: { ...startingPower },

    // Turn state
    movesRemaining: 0,
    cardsPlayedThisTurn: 0,
    movesThisTurn: 0,
    powerGainedFromCardsThisTurn: 0,
    usedCaptainAbility: false,
    usedOneTimeCards: [],
    usedSystemAbilities: {
      weapons: [false, false],
      computers: [false, false],
      engines: [false],
      logistics: [false, false],
    },

    // Discounts
    buyDiscount: 0,
    installDiscount: 0,
    missionDiscount: 0,
    extraPlays: 0,

    // Stats
    hazardsInDeck: 0,

    // Turn tracking for reveals
    revealedStacksThisTurn: { 1: false, 3: false, 5: false },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Setup
// ─────────────────────────────────────────────────────────────────────────────

export function setupMarket(): MarketStacks {
  // Station 1 - Tier 1: 5 stacks of 4 identical cards each (always revealed)
  // Shuffle the tier 1 card types first, take 5 of them
  const shuffledTier1Types = shuffle([...TIER_1_CARDS]).slice(0, 5);
  const station1 = shuffledTier1Types.map(card => ({
    cards: Array.from({ length: 4 }, () => createCardInstance(card)),
    revealed: true, // T1 always face-up
  }));

  // Station 3 - Tier 2: 4 stacks of 4 cards (shuffled, face-down initially)
  const tier2Pool: CardInstance[] = [];
  for (const card of TIER_2_CARDS) {
    for (let i = 0; i < (card.copies || 2); i++) {
      tier2Pool.push(createCardInstance(card));
    }
  }
  const shuffledTier2 = shuffle(tier2Pool);
  const station3 = [];
  for (let i = 0; i < 4; i++) {
    const stackStart = i * 4;
    const stackCards = shuffledTier2.slice(stackStart, stackStart + 4);
    if (stackCards.length > 0) {
      station3.push({
        cards: stackCards,
        revealed: false, // T2 starts face-down
      });
    }
  }

  // Station 5 - Tier 3: 3 stacks of 3 cards (shuffled, face-down initially)
  const tier3Pool: CardInstance[] = [];
  for (const card of TIER_3_CARDS) {
    for (let i = 0; i < (card.copies || 2); i++) {
      tier3Pool.push(createCardInstance(card));
    }
  }
  const shuffledTier3 = shuffle(tier3Pool);
  const station5 = [];
  for (let i = 0; i < 3; i++) {
    const stackStart = i * 3;
    const stackCards = shuffledTier3.slice(stackStart, stackStart + 3);
    if (stackCards.length > 0) {
      station5.push({
        cards: stackCards,
        revealed: false, // T3 starts face-down
      });
    }
  }

  return {
    1: station1,
    3: station3,
    5: station5,
  };
}

export function setupMissions(): { pools: MissionPools; track: Record<number, TrackMission | null> } {
  // Create instance pools for each zone
  const nearPool = shuffle(NEAR_MISSIONS.map(createMissionInstance));
  const midPool = shuffle(MID_MISSIONS.map(createMissionInstance));
  const deepPool = shuffle(DEEP_MISSIONS.map(createMissionInstance));

  // Place one mission at each location
  // Per rules: Only location 1 starts revealed, others are face-down
  const track: Record<number, TrackMission | null> = {};

  // Locations 1-2: Near space (only location 1 revealed)
  track[1] = nearPool.length > 0 ? { mission: nearPool.pop()!, revealed: true } : null;
  track[2] = nearPool.length > 0 ? { mission: nearPool.pop()!, revealed: false } : null;

  // Locations 3-4: Mid space (face-down)
  track[3] = midPool.length > 0 ? { mission: midPool.pop()!, revealed: false } : null;
  track[4] = midPool.length > 0 ? { mission: midPool.pop()!, revealed: false } : null;

  // Locations 5-6: Deep space (face-down)
  track[5] = deepPool.length > 0 ? { mission: deepPool.pop()!, revealed: false } : null;
  track[6] = deepPool.length > 0 ? { mission: deepPool.pop()!, revealed: false } : null;

  return {
    pools: { near: nearPool, mid: midPool, deep: deepPool },
    track,
  };
}

export function setupHazardDeck(): CardInstance[] {
  const deck: CardInstance[] = [];
  for (const hazard of HAZARD_CARDS) {
    for (let i = 0; i < hazard.copies; i++) {
      deck.push(createCardInstance(hazard));
    }
  }
  return shuffle(deck);
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Engine Class
// ─────────────────────────────────────────────────────────────────────────────

export class GameEngine {
  private state: GameState;

  constructor(players: Array<{ name: string; captain: Captain; isAI?: boolean }>) {
    resetInstanceIdCounter();

    // Create players
    const gamePlayers = players.map((p, i) => createPlayer(i, p.name, p.captain, p.isAI ?? false));

    // Setup market
    const marketStacks = setupMarket();

    // Setup missions
    const { pools, track } = setupMissions();

    // Setup hazard deck
    const hazardDeck = setupHazardDeck();

    // Initialize game state
    this.state = {
      players: gamePlayers,
      currentPlayerIndex: 0,
      turn: 1,
      phase: 'setup',
      trackMissions: track,
      missionPools: pools,
      marketStacks,
      hazardDeck,
      pendingMissionReplacements: [],
      log: [],
      pendingAction: null,
      hasRevealedInfo: false,
      turnStartSnapshot: null,
      actionHistory: [],
      extraTurnQueued: false,
      gameOver: false,
      winner: null,
      endGameTriggeredBy: null,
    };

    // Draw initial hands
    for (const player of this.state.players) {
      this.drawCards(player, HAND_SIZE);
    }

    // Transition to action phase
    this.state.phase = 'action';
    this.startTurn();

    this.log('Game started!', 'info');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // State Access
  // ─────────────────────────────────────────────────────────────────────────

  getState(): GameState {
    return this.state;
  }

  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getPlayer(playerId: number): Player | undefined {
    return this.state.players.find(p => p.id === playerId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Logging
  // ─────────────────────────────────────────────────────────────────────────

  private log(message: string, type: LogEntry['type'] = 'info'): void {
    this.state.log.push({
      turn: this.state.turn,
      message,
      type,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Card Operations
  // ─────────────────────────────────────────────────────────────────────────

  drawCards(player: Player, count: number): CardInstance[] {
    const drawn: CardInstance[] = [];

    for (let i = 0; i < count; i++) {
      // If deck is empty, shuffle discard into deck
      if (player.deck.length === 0) {
        if (player.discard.length === 0) {
          break; // No cards left to draw
        }
        // Count hazards in discard before shuffle for debugging
        const hazardsInDiscard = player.discard.filter(c => c.type === 'hazard').length;
        if (hazardsInDiscard > 0) {
          this.log(`Shuffling ${player.discard.length} cards including ${hazardsInDiscard} hazard(s)`, 'info');
        }
        player.deck = shuffle(player.discard);
        player.discard = [];
        this.log(`${player.name} shuffled their discard pile into deck`, 'info');
      }

      const card = player.deck.pop()!;
      drawn.push(card);
      player.hand.push(card);
    }

    return drawn;
  }

  discardCard(player: Player, cardInstanceId: string): boolean {
    const cardIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);
    if (cardIndex === -1) return false;

    const [card] = player.hand.splice(cardIndex, 1);
    player.discard.push(card);
    return true;
  }

  trashCard(player: Player, cardInstanceId: string, from: 'hand' | 'discard' | 'played'): boolean {
    let source: CardInstance[];
    switch (from) {
      case 'hand':
        source = player.hand;
        break;
      case 'discard':
        source = player.discard;
        break;
      case 'played':
        source = player.played;
        break;
    }

    const cardIndex = source.findIndex(c => c.instanceId === cardInstanceId);
    if (cardIndex === -1) return false;

    const [card] = source.splice(cardIndex, 1);

    // Track hazard removal
    if (card.type === 'hazard') {
      player.hazardsInDeck = Math.max(0, player.hazardsInDeck - 1);
    }

    this.log(`${player.name} trashed ${card.title}`, 'action');
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Turn Management - 3 Phase Structure (Initial → Action → Cleanup)
  // ─────────────────────────────────────────────────────────────────────────

  private startTurn(): void {
    const player = this.getCurrentPlayer();

    // Reset turn state
    player.movesRemaining = 0;
    player.cardsPlayedThisTurn = 0;
    player.movesThisTurn = 0;
    player.powerGainedFromCardsThisTurn = 0;
    player.usedCaptainAbility = false;
    player.buyDiscount = 0;
    player.installDiscount = 0;
    player.missionDiscount = 0;
    player.extraPlays = 0;
    player.credits = 0; // Credits don't carry over between turns!

    // Reset system ability usage tracking
    player.usedSystemAbilities = {
      weapons: [false, false],
      computers: [false, false],
      engines: [false],
      logistics: [false, false],
    };

    // Reset stack reveal tracking
    player.revealedStacksThisTurn = { 1: false, 3: false, 5: false };

    // Reset power to starting values
    player.currentPower = { ...player.startingPower };

    // Reset info reveal tracking for new turn
    this.state.hasRevealedInfo = false;

    this.log(`Turn ${this.state.turn}: ${player.name}'s turn`, 'info');

    // Start with Initial Phase
    this.enterInitialPhase();
  }

  // Create a snapshot of the current state for restart functionality
  private createTurnSnapshot(): void {
    // Only create snapshot right before action phase begins
    // We exclude log and turn-start effects that shouldn't be replayed
    this.state.turnStartSnapshot = JSON.stringify({
      players: this.state.players,
      currentPlayerIndex: this.state.currentPlayerIndex,
      turn: this.state.turn,
      phase: this.state.phase,
      trackMissions: this.state.trackMissions,
      missionPools: this.state.missionPools,
      marketStacks: this.state.marketStacks,
      hazardDeck: this.state.hazardDeck,
      pendingMissionReplacements: this.state.pendingMissionReplacements,
    });
    // Also clear action history at start of turn
    this.state.actionHistory = [];
  }

  // Push a snapshot before each action for granular undo
  private pushActionSnapshot(): void {
    if (this.state.hasRevealedInfo) return; // Can't undo after info revealed
    this.state.actionHistory.push(JSON.stringify({
      players: this.state.players,
      currentPlayerIndex: this.state.currentPlayerIndex,
      turn: this.state.turn,
      phase: this.state.phase,
      trackMissions: this.state.trackMissions,
      missionPools: this.state.missionPools,
      marketStacks: this.state.marketStacks,
      hazardDeck: this.state.hazardDeck,
      pendingMissionReplacements: this.state.pendingMissionReplacements,
    }));
  }

  // Undo the last action (granular) or restart turn if no actions taken
  restartTurn(): boolean {
    // If we have action history, undo the last action
    if (this.state.actionHistory.length > 0 && !this.state.hasRevealedInfo) {
      const snapshot = JSON.parse(this.state.actionHistory.pop()!);
      this.state.players = snapshot.players;
      this.state.currentPlayerIndex = snapshot.currentPlayerIndex;
      this.state.turn = snapshot.turn;
      this.state.phase = snapshot.phase;
      this.state.trackMissions = snapshot.trackMissions;
      this.state.missionPools = snapshot.missionPools;
      this.state.marketStacks = snapshot.marketStacks;
      this.state.hazardDeck = snapshot.hazardDeck;
      this.state.pendingMissionReplacements = snapshot.pendingMissionReplacements;
      this.state.pendingAction = null;

      this.log(`${this.getCurrentPlayer().name} undid their last action`, 'info');
      return true;
    }

    // Fallback to turn start snapshot
    if (!this.state.hasRevealedInfo && this.state.turnStartSnapshot) {
      const snapshot = JSON.parse(this.state.turnStartSnapshot);
      this.state.players = snapshot.players;
      this.state.currentPlayerIndex = snapshot.currentPlayerIndex;
      this.state.turn = snapshot.turn;
      this.state.phase = snapshot.phase;
      this.state.trackMissions = snapshot.trackMissions;
      this.state.missionPools = snapshot.missionPools;
      this.state.marketStacks = snapshot.marketStacks;
      this.state.hazardDeck = snapshot.hazardDeck;
      this.state.pendingMissionReplacements = snapshot.pendingMissionReplacements;
      this.state.pendingAction = null;
      this.state.actionHistory = [];

      this.log(`${this.getCurrentPlayer().name} restarted their turn`, 'info');
      return true;
    }

    return false;
  }

  // Check if undo is allowed
  canRestartTurn(): boolean {
    if (this.state.hasRevealedInfo) return false;
    return this.state.actionHistory.length > 0 || this.state.turnStartSnapshot !== null;
  }

  private enterInitialPhase(): void {
    const player = this.getCurrentPlayer();
    this.state.phase = 'initial';

    // 1. Resolve start-of-turn card effects FIRST (installations give power)
    this.applyInstallationEffects(player);

    // 2. Apply captain turn-start abilities
    if (player.captain.ability.turnStart === 'credit') {
      player.credits += 1;
      this.log(`${player.name}'s Tycoon ability: +1 Credit`, 'action');
    } else if (player.captain.ability.turnStart === 'powerToHighest') {
      const highest = getHighestSystem(player.currentPower);
      if (player.currentPower[highest] <= 2) {
        player.currentPower[highest] = Math.min(MAX_POWER, player.currentPower[highest] + 1);
        this.log(`${player.name}'s Veteran ability: +1 ${highest} power`, 'action');
      } else {
        this.log(`${player.name}'s Veteran ability: skipped (${highest} already at ${player.currentPower[highest]})`, 'info');
      }
    }

    // Navigator free move
    if (player.captain.ability.freeMove) {
      player.movesRemaining += player.captain.ability.freeMove;
    }

    // 3. Reveal Hazard Cards in hand (AFTER installations/captains have given power)
    const hazardsInHand = player.hand.filter(c => c.type === 'hazard');

    if (hazardsInHand.length > 0) {
      // Set pending action to show hazards to player
      this.state.pendingAction = {
        type: 'revealHazards',
        playerId: player.id,
        data: {
          hazards: hazardsInHand,
        },
      };

      // Log each hazard and apply immediate effects
      for (const hazard of hazardsInHand) {
        const hazardCard = hazard as HazardCard & { instanceId: string };
        this.log(`${player.name} reveals: ${hazardCard.title} - ${hazardCard.effect}`, 'hazard');

        // Apply immediate hazard effects (e.g., Static Overload: -1⚡ from a system)
        this.applyHazardRevealEffect(player, hazardCard);

        // Ghost captain ability: draw a card and gain a credit when revealing hazard
        if (player.captain.ability.trigger === 'onDrawHazard') {
          this.drawCards(player, 1);
          this.log(`${player.name}'s Ghost ability: +1 card`, 'action');
        }
      }
    }

    // If no hazards to reveal, go directly to action phase
    if (hazardsInHand.length === 0) {
      this.enterActionPhase();
    }
    // Otherwise, wait for player to acknowledge hazards (resolved via dispatch)
  }

  enterActionPhase(): void {
    this.state.phase = 'action';
    this.state.pendingAction = null;

    // Take snapshot for restart functionality after initial phase effects have been applied
    this.createTurnSnapshot();

    this.log(`Action Phase begins`, 'info');
  }

  private enterCleanupPhase(): void {
    const player = this.getCurrentPlayer();
    this.state.phase = 'cleanup';

    // Replace completed missions — new missions fill in at end of turn
    for (const location of this.state.pendingMissionReplacements) {
      this.replaceMission(location);
    }
    this.state.pendingMissionReplacements = [];

    // Discard played cards
    player.discard.push(...player.played);
    player.played = [];

    // Discard remaining hand (including hazards)
    player.discard.push(...player.hand);
    player.hand = [];

    // Draw new hand
    this.drawCards(player, HAND_SIZE);

    // Check victory condition
    if (player.fame >= VICTORY_THRESHOLD && !this.state.endGameTriggeredBy) {
      this.state.endGameTriggeredBy = player;
      this.log(`${player.name} reached ${VICTORY_THRESHOLD} Fame! Finishing round...`, 'victory');
    }

    // Check for extra turn (Temporal Jump)
    if (this.state.extraTurnQueued) {
      this.state.extraTurnQueued = false;
      this.log(`${player.name} takes an extra turn!`, 'action');
      // Same player goes again - don't advance currentPlayerIndex
    } else {
      // Move to next player
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

      // Check if round is complete (back to first player)
      if (this.state.currentPlayerIndex === 0) {
        this.state.turn++;

        // Check for game end
        if (this.state.endGameTriggeredBy) {
          this.endGame();
          return;
        }
      }
    }

    // Start next player's turn
    if (!this.state.gameOver) {
      this.startTurn();
    }
  }

  private applyInstallationEffects(player: Player): void {
    // Apply card installation effects
    for (const system of SYSTEMS) {
      const installation = player.installations[system];
      if (!installation) continue;

      const card = installation as ActionCard & { instanceId: string };
      if (!card.installData) continue;

      const data = card.installData;
      const effects: string[] = [];

      // Power bonuses
      if (data.power) {
        for (const sys of SYSTEMS) {
          if (data.power[sys]) {
            player.currentPower[sys] = Math.min(MAX_POWER, player.currentPower[sys] + data.power[sys]!);
            effects.push(`+${data.power[sys]}⚡ ${sys}`);
          }
        }
      }

      // Power choice (player will need to allocate)
      if (data.powerChoice) {
        // For now, apply to the same system as the installation
        player.currentPower[system] = Math.min(MAX_POWER, player.currentPower[system] + data.powerChoice);
        effects.push(`+${data.powerChoice}⚡ ${system}`);
      }

      // Movement
      if (data.moves) {
        player.movesRemaining += data.moves;
        effects.push(`+${data.moves} move`);
      }

      // Card draw
      if (data.draw) {
        this.drawCards(player, data.draw);
        effects.push(`+${data.draw} card${data.draw > 1 ? 's' : ''}`);
      }

      // Credits
      if (data.credits) {
        player.credits += data.credits;
        effects.push(`+${data.credits} credit${data.credits > 1 ? 's' : ''}`);
      }

      // Discounts
      if (data.buyDiscount) {
        player.buyDiscount += data.buyDiscount;
        effects.push(`-${data.buyDiscount} buy cost`);
      }
      if (data.installDiscount) {
        player.installDiscount += data.installDiscount;
        effects.push(`-${data.installDiscount} install cost`);
      }

      // Log all effects from this installation
      if (effects.length > 0) {
        this.log(`${card.title} (installed): ${effects.join(', ')}`, 'reward');
      }
    }

    // Apply gear installation effects (mission cards installed to systems)
    for (const system of SYSTEMS) {
      const gearInstall = player.gearInstallations[system];
      if (!gearInstall) continue;

      const data = gearInstall.rewardData;
      const effects: string[] = [];

      // Gear with direct credits per turn (e.g., "Orbital Delivery: +1 Credit/turn")
      if (data.credits && !data.conditionalCredits && !data.passive) {
        player.credits += data.credits;
        effects.push(`+${data.credits} Credit${data.credits > 1 ? 's' : ''}`);
      }

      // Conditional power based on game state
      if (data.conditionalPower) {
        const trigger = data.conditionalPower.trigger;
        let triggered = false;

        switch (trigger) {
          case 'missions3plus':
            triggered = player.completedMissions.length >= 3;
            break;
          case 'cards2plus':
            // Can't check this at turn start - will need different handling
            // For now skip
            break;
          case 'cards5plus':
            // Similarly, can't check at turn start
            break;
          case 'hazards2plus':
            triggered = player.hazardsInDeck >= 2;
            break;
          case 'trophies2plus':
            triggered = player.trophies.length >= 2;
            break;
        }

        if (triggered) {
          player.currentPower[system] = Math.min(MAX_POWER, player.currentPower[system] + data.conditionalPower.amount);
          effects.push(`+${data.conditionalPower.amount}⚡ (${trigger})`);
        }
      }

      // Log gear effects
      if (effects.length > 0) {
        this.log(`${gearInstall.title} (gear): ${effects.join(', ')}`, 'reward');
      }
    }

    // Trophy passives that trigger at turn start
    const isAtStation = [1, 3, 5].includes(player.location);
    const isAlone = !this.state.players.some(p => p.id !== player.id && p.location === player.location);

    if (isAtStation) {
      this.checkTrophyPassives(player, 'atStation');
    }
    if (isAlone) {
      this.checkTrophyPassives(player, 'ifAlone');
    }

    player.currentPower = clampPower(player.currentPower);
  }

  endTurn(): void {
    // Transition to cleanup phase which handles end-of-turn logic
    this.enterCleanupPhase();
  }

  private endGame(): void {
    this.state.gameOver = true;
    this.state.phase = 'gameOver';

    // Apply end-game hazard penalty: -1 Fame per hazard in deck
    for (const player of this.state.players) {
      const totalHazards = this.countPlayerHazards(player);
      if (totalHazards > 0) {
        player.fame = Math.max(0, player.fame - totalHazards);
        this.log(`${player.name} loses ${totalHazards} Fame from ${totalHazards} hazard${totalHazards > 1 ? 's' : ''} in deck`, 'hazard');
      }
    }

    // Find winner with tiebreakers:
    // 1) Highest fame, 2) Most hazards (risk/reward — braver player wins), 3) Most missions, 4) Most credits
    const ranked = [...this.state.players].sort((a, b) => {
      if (b.fame !== a.fame) return b.fame - a.fame;
      const aHazards = this.countPlayerHazards(a);
      const bHazards = this.countPlayerHazards(b);
      if (bHazards !== aHazards) return bHazards - aHazards; // More hazards wins (braver)
      if (b.completedMissions.length !== a.completedMissions.length) {
        return b.completedMissions.length - a.completedMissions.length;
      }
      return b.credits - a.credits;
    });

    const winner = ranked[0];
    this.state.winner = winner;
    this.log(`Game Over! ${winner.name} wins with ${winner.fame} Fame!`, 'victory');
  }

  private countPlayerHazards(player: Player): number {
    // Count hazards in deck, hand, discard, and played piles
    const allCards = [...player.deck, ...player.hand, ...player.discard, ...player.played];
    return allCards.filter(c => c.type === 'hazard').length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Power Operations
  // ─────────────────────────────────────────────────────────────────────────

  spendPower(player: Player, cost: Partial<PowerState>): boolean {
    // Check if player has enough power
    for (const system of SYSTEMS) {
      const required = cost[system] ?? 0;
      if (player.currentPower[system] < required) {
        return false;
      }
    }

    // Spend the power
    for (const system of SYSTEMS) {
      const required = cost[system] ?? 0;
      player.currentPower[system] -= required;
    }

    return true;
  }

  addPower(player: Player, amount: Partial<PowerState>): void {
    for (const system of SYSTEMS) {
      const add = amount[system] ?? 0;
      player.currentPower[system] = Math.min(MAX_POWER, player.currentPower[system] + add);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Movement
  // ─────────────────────────────────────────────────────────────────────────

  canMove(player: Player, direction: -1 | 1): boolean {
    const newLocation = player.location + direction;
    return newLocation >= 1 && newLocation <= 6;
  }

  move(player: Player, direction: -1 | 1): boolean {
    if (!this.canMove(player, direction)) return false;

    // Check for Thruster Jam hazard: Can't move more than 1 space per turn
    if (this.playerHasActiveHazard(player, 'thruster-jam') && player.movesThisTurn >= 1) {
      this.log(`Thruster Jam: Cannot move more than 1 space this turn`, 'hazard');
      return false;
    }

    player.location = (player.location + direction) as 1 | 2 | 3 | 4 | 5 | 6;
    player.movesThisTurn++;
    this.log(`${player.name} moved to location ${player.location}`, 'action');

    // Reveal mission at this location if it's face-down
    this.revealMissionAtLocation(player.location);

    return true;
  }

  private revealMissionAtLocation(location: number): void {
    const trackMission = this.state.trackMissions[location];
    if (trackMission && !trackMission.revealed) {
      trackMission.revealed = true;
      // Mark that info has been revealed - can't restart/undo anymore
      this.state.hasRevealedInfo = true;
      this.log(`Mission revealed at location ${location}: "${trackMission.mission.title}"`, 'info');
    }
  }

  private playerHasActiveHazard(player: Player, hazardId: string): boolean {
    // Hazards are only "active" when in the player's hand (not buried in deck/discard)
    return player.hand.some(c => c.type === 'hazard' && c.id === hazardId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Card Playing
  // ─────────────────────────────────────────────────────────────────────────

  canPlayCard(player: Player, cardInstanceId: string): boolean {
    const card = player.hand.find(c => c.instanceId === cardInstanceId);
    if (!card) return false;
    if (card.type === 'hazard') return false; // Can't play hazards

    // Check for Failsafe Lockdown: Max 2 cards this turn
    if (this.playerHasActiveHazard(player, 'failsafe-lockdown') && player.cardsPlayedThisTurn >= 2) {
      return false;
    }

    return true;
  }

  playCard(player: Player, cardInstanceId: string, powerAllocation?: PowerAllocation): boolean {
    if (!this.canPlayCard(player, cardInstanceId)) return false;

    const cardIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);
    const [card] = player.hand.splice(cardIndex, 1);
    player.played.push(card);
    player.cardsPlayedThisTurn++;

    this.log(`${player.name} played ${card.title}`, 'action');

    // Apply card effects
    this.applyCardEffects(player, card, powerAllocation);

    return true;
  }

  private applyCardEffects(player: Player, card: CardInstance, powerAllocation?: PowerAllocation): void {
    if (card.type === 'hazard') return;

    const effectData = card.type === 'starter'
      ? (card as typeof STARTING_CARDS[0] & { instanceId: string }).effectData
      : (card as ActionCard & { instanceId: string }).effectData;

    if (!effectData) return;

    // Check Overloaded Circuits hazard: max +2 power from cards this turn
    const hasOverloadedCircuits = this.playerHasActiveHazard(player, 'overloaded-circuits');

    // Credits
    if (effectData.credits) {
      player.credits += effectData.credits;
      this.log(`  +${effectData.credits} Credits`, 'reward');
      this.checkTrophyPassives(player, 'onGainCredits');
    }

    // Direct power (capped by Overloaded Circuits if active)
    if (effectData.power) {
      if (hasOverloadedCircuits) {
        const cappedPower: Partial<PowerState> = {};
        for (const sys of SYSTEMS) {
          if (effectData.power[sys]) {
            const remaining = Math.max(0, 2 - player.powerGainedFromCardsThisTurn);
            const capped = Math.min(effectData.power[sys]!, remaining);
            if (capped > 0) {
              cappedPower[sys] = capped;
              player.powerGainedFromCardsThisTurn += capped;
            }
          }
        }
        if (Object.keys(cappedPower).length > 0) {
          this.addPower(player, cappedPower);
        }
        if (player.powerGainedFromCardsThisTurn >= 2) {
          this.log(`  Overloaded Circuits: power from cards capped at 2`, 'hazard');
        }
      } else {
        this.addPower(player, effectData.power);
      }
      const powerStr = SYSTEMS.filter(s => effectData.power![s])
        .map(s => `+${effectData.power![s]} ${s}`)
        .join(', ');
      this.log(`  ${powerStr}`, 'reward');
    }

    // Power choice - use allocation if provided, otherwise prompt needed
    if (effectData.powerChoice && powerAllocation) {
      let total = getTotalPower(powerAllocation);
      if (hasOverloadedCircuits) {
        const remaining = Math.max(0, 2 - player.powerGainedFromCardsThisTurn);
        total = Math.min(total, remaining);
        player.powerGainedFromCardsThisTurn += total;
      }
      if (total === effectData.powerChoice || (hasOverloadedCircuits && total >= 0)) {
        // Cap each system proportionally if overloaded
        if (hasOverloadedCircuits && total < effectData.powerChoice) {
          const ratio = total / effectData.powerChoice;
          const capped: PowerAllocation = { weapons: 0, computers: 0, engines: 0, logistics: 0 };
          let allocated = 0;
          for (const sys of SYSTEMS) {
            const amount = Math.floor(powerAllocation[sys] * ratio);
            capped[sys] = amount;
            allocated += amount;
          }
          // Distribute remaining
          if (allocated < total) {
            for (const sys of SYSTEMS) {
              if (powerAllocation[sys] > 0 && allocated < total) {
                capped[sys]++;
                allocated++;
              }
            }
          }
          this.addPower(player, capped);
          this.log(`  Overloaded Circuits: power from cards capped at 2`, 'hazard');
        } else {
          this.addPower(player, powerAllocation);
        }
      }
    }

    // Movement
    if (effectData.moves) {
      player.movesRemaining += effectData.moves;
      this.log(`  +${effectData.moves} moves`, 'reward');
    }

    // Card draw
    if (effectData.draw) {
      this.drawCards(player, effectData.draw);
      this.log(`  Drew ${effectData.draw} cards`, 'reward');
    }

    // Discounts
    if (effectData.buyDiscount) {
      player.buyDiscount += effectData.buyDiscount;
    }
    if (effectData.installDiscount) {
      player.installDiscount += effectData.installDiscount;
    }
    if (effectData.missionDiscount) {
      player.missionDiscount += effectData.missionDiscount;
    }

    // Extra plays
    if (effectData.extraPlay) {
      player.extraPlays += effectData.extraPlay;
    }

    // One-time use: trash the card after playing (remove from played pile entirely)
    if (effectData.oneTimeUse) {
      const playedIdx = player.played.findIndex(c => c.instanceId === card.instanceId);
      if (playedIdx >= 0) {
        player.played.splice(playedIdx, 1);
        this.log(`  ${card.title} is consumed (one-time use)`, 'info');
      }
    }

    // Must trash: mandatory trash before deferred effects apply
    if (effectData.mustTrash) {
      this.state.pendingAction = {
        type: 'trashCard',
        playerId: player.id,
        data: {
          amount: effectData.mustTrash,
          source: 'hand',
          cardTitle: card.title,
          mandatory: true,
          deferredEffects: effectData, // Power etc. will be applied after trash resolves
        },
      };
      return; // Skip remaining effects until trash resolves
    }

    // Power per installation (Synced Loop: +N per installation on ship)
    if (effectData.powerPerInstallation) {
      const installCount = SYSTEMS.filter(s => player.installations[s] !== null).length;
      const bonus = effectData.powerPerInstallation * installCount;
      if (bonus > 0) {
        // Add to highest-power system
        const targetSys = getHighestSystem(player.currentPower);
        player.currentPower[targetSys] = Math.min(MAX_POWER, player.currentPower[targetSys] + bonus);
        this.log(`  +${bonus}⚡ to ${targetSys} (${installCount} installations)`, 'reward');
      }
    }

    // Fame if hazards (Scorch Protocol: +N fame if M+ hazards in deck)
    if (effectData.fameIfHazards) {
      const { count, fame } = effectData.fameIfHazards;
      const totalHazards = this.countPlayerHazards(player);
      if (totalHazards >= count) {
        player.fame += fame;
        this.log(`  +${fame} Fame (${totalHazards} hazards in deck)`, 'reward');
      }
    }

    // Extra turn (Temporal Jump)
    if (effectData.extraTurn) {
      this.state.extraTurnQueued = true;
      this.log(`  Extra turn activated!`, 'reward');
    }

    // Play from discard (Echo Engine: play top card of discard pile)
    if (effectData.playFromDiscard) {
      if (player.discard.length > 0) {
        const topCard = player.discard[player.discard.length - 1];
        if (topCard.type !== 'hazard') {
          player.discard.pop();
          this.log(`  Replaying ${topCard.title} from discard`, 'reward');
          player.played.push(topCard);
          this.applyCardEffects(player, topCard);
        } else {
          this.log(`  Top of discard is a hazard (${topCard.title}), cannot replay`, 'info');
        }
      } else {
        this.log(`  Discard pile is empty, nothing to replay`, 'info');
      }
    }

    // Hazard to all players at same location (Pulse Grenade)
    if (effectData.hazardAllAtLocation) {
      const targets = this.state.players.filter(p => p.id !== player.id && p.location === player.location);
      let hazardsGiven = 0;
      for (const target of targets) {
        if (this.giveHazard(player, target)) {
          hazardsGiven++;
        }
      }
      if (targets.length === 0) {
        this.log(`  No other players at location ${player.location}`, 'info');
      }
    }

    // Hazard to all players (Chain Reaction, Detonator Relay)
    if (effectData.hazardAll) {
      const targets = this.state.players.filter(p => p.id !== player.id);
      let hazardsGiven = 0;
      for (const target of targets) {
        if (this.giveHazard(player, target)) {
          hazardsGiven++;
        }
      }
      // Power per hazard bonus (Chain Reaction)
      if (effectData.powerPerHazard && hazardsGiven > 0) {
        const bonus = effectData.powerPerHazard * hazardsGiven;
        const targetSys = getHighestSystem(player.currentPower);
        player.currentPower[targetSys] = Math.min(MAX_POWER, player.currentPower[targetSys] + bonus);
        this.log(`  +${bonus}⚡ to ${targetSys} (${hazardsGiven} hazards given)`, 'reward');
      }
    }

    // Give hazard (single target - needs player selection)
    if (effectData.giveHazard) {
      // Store bonus data for resolution
      this.state.pendingAction = {
        type: 'targetPlayer',
        playerId: player.id,
        data: {
          cardTitle: card.title,
          bonusIfHadHazard: effectData.bonusIfHadHazard,
          moveOther: effectData.moveOther,
        },
      };
    }

    // Move other player (Mag-Leash: when no giveHazard, standalone moveOther)
    if (effectData.moveOther && !effectData.giveHazard) {
      const validTargets = this.state.players.filter(p => p.id !== player.id);
      if (validTargets.length > 0) {
        this.state.pendingAction = {
          type: 'moveOtherPlayer',
          playerId: player.id,
          data: {
            cardTitle: card.title,
            amount: effectData.moveOther,
            targetPlayerIds: validTargets.map(p => p.id),
          },
        };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Hazards
  // ─────────────────────────────────────────────────────────────────────────

  giveHazard(fromPlayer: Player, toPlayer: Player): boolean {
    if (this.state.hazardDeck.length === 0) return false;

    // Check target's hand for reaction cards before giving hazard
    const reactionCards = toPlayer.hand.filter(c => {
      if (c.type !== 'action') return false;
      const ac = c as ActionCard & { instanceId: string };
      return ac.reaction?.trigger === 'onReceiveHazard';
    });
    if (reactionCards.length > 0) {
      for (const rc of reactionCards) {
        const reaction = (rc as ActionCard & { instanceId: string }).reaction!;
        if (reaction.bonus) {
          if (reaction.bonus.power) {
            this.addPower(toPlayer, reaction.bonus.power);
          }
          if (reaction.bonus.credits) {
            toPlayer.credits += reaction.bonus.credits;
          }
          if (reaction.bonus.draw) {
            this.drawCards(toPlayer, reaction.bonus.draw);
          }
          this.log(`${toPlayer.name}'s ${rc.title} reacts to hazard!`, 'action');
        }
      }
    }

    const hazard = this.state.hazardDeck.pop()!;
    toPlayer.discard.push(hazard);
    toPlayer.hazardsInDeck++;

    this.log(`${fromPlayer.name} gave ${toPlayer.name} a hazard: ${hazard.title}`, 'hazard');

    // Mercenary captain ability
    if (fromPlayer.captain.ability.trigger === 'onGiveHazard') {
      fromPlayer.credits += 1;
      this.log(`${fromPlayer.name}'s Mercenary ability: +1 Credit`, 'action');
    }

    // Trophy passive: onGiveHazard
    this.checkTrophyPassives(fromPlayer, 'onGiveHazard');

    return true;
  }

  // Check and apply trophy passive effects
  private checkTrophyPassives(player: Player, trigger: string): void {
    for (const trophy of player.trophies) {
      const passive = trophy.rewardData.passive;
      if (passive && passive.trigger === trigger) {
        if (passive.power) {
          const sys = getHighestSystem(player.currentPower);
          player.currentPower[sys] = Math.min(MAX_POWER, player.currentPower[sys] + passive.power);
          this.log(`  ${trophy.title} trophy: +${passive.power}⚡ to ${sys}`, 'reward');
        }
        if (passive.credits) {
          player.credits += passive.credits;
          this.log(`  ${trophy.title} trophy: +${passive.credits} Credits`, 'reward');
        }
      }
    }
  }

  // Apply immediate effects when hazard is revealed in hand
  private applyHazardRevealEffect(player: Player, hazard: HazardCard & { instanceId: string }): void {
    switch (hazard.id) {
      case 'static-overload':
        // "Lose 1⚡ from a system" - reduce lowest system with power
        // Find a system with power > 0 and reduce it
        for (const system of SYSTEMS) {
          if (player.currentPower[system] > 0) {
            player.currentPower[system] -= 1;
            this.log(`  Static Overload: -1⚡ from ${system}`, 'hazard');
            break;
          }
        }
        break;

      // Most hazards are ongoing effects that just need to be in hand
      // and checked during relevant actions (moving, playing cards, etc.)
      // These don't need immediate application:
      // - scrambled-controls: "System abilities cost +1⚡"
      // - thruster-jam: "Can't move more than 1 space"
      // - corrupted-nav-chip: "Can't complete missions"
      // - warrant-issued: "Missions cost +2 Credits"
      // - rogue-ai-fragment: "Can't install cards"
      // - failsafe-lockdown: "Max 2 cards this turn"
      // - overloaded-circuits: "Max +2⚡ from cards this turn"
      // - corrosive-spores: "Can't install cards"
      // - smuggled-parasite: Reveal on draw (handled separately)
    }
  }

  canClearHazard(player: Player, hazardInstanceId: string): boolean {
    const hazard = player.hand.find(c => c.instanceId === hazardInstanceId && c.type === 'hazard');
    if (!hazard) return false;

    const hazardCard = hazard as HazardCard & { instanceId: string };
    const cost = hazardCard.clearCost;

    // Check credits
    if (cost.credits && player.credits < cost.credits) return false;

    // Check power requirements
    if (cost.power) {
      for (const system of SYSTEMS) {
        if (cost.power[system] && player.currentPower[system] < cost.power[system]!) {
          return false;
        }
      }
    }

    // Check spend all (with minimum)
    if (cost.spendAll) {
      const available = player.currentPower[cost.spendAll];
      if (cost.min && available < cost.min) return false;
    }

    // Check power from different systems
    if (cost.powerFromDifferent) {
      const systemsWithPower = SYSTEMS.filter(s => player.currentPower[s] >= 1);
      if (systemsWithPower.length < cost.powerFromDifferent) return false;
    }

    return true;
  }

  clearHazard(player: Player, hazardInstanceId: string, discardCardIds?: string[]): boolean {
    if (!this.canClearHazard(player, hazardInstanceId)) return false;

    const hazardIndex = player.hand.findIndex(c => c.instanceId === hazardInstanceId);
    const [hazard] = player.hand.splice(hazardIndex, 1);
    const hazardCard = hazard as HazardCard & { instanceId: string };
    const cost = hazardCard.clearCost;

    // Pay costs
    if (cost.credits) {
      player.credits -= cost.credits;
    }

    if (cost.power) {
      this.spendPower(player, cost.power);
    }

    if (cost.spendAll) {
      player.currentPower[cost.spendAll] = 0;
    }

    if (cost.discard && discardCardIds) {
      for (const cardId of discardCardIds.slice(0, cost.discard)) {
        this.discardCard(player, cardId);
      }
    }

    if (cost.powerFromDifferent) {
      // This needs UI selection - for now just spend from first N systems
      let remaining = cost.powerFromDifferent;
      for (const system of SYSTEMS) {
        if (remaining <= 0) break;
        if (player.currentPower[system] >= 1) {
          player.currentPower[system] -= 1;
          remaining--;
        }
      }
    }

    player.hazardsInDeck--;
    this.log(`${player.name} cleared ${hazard.title}`, 'action');

    // Pass on clear
    if (hazardCard.passOnClear) {
      // Need to select target - set pending action
      this.state.pendingAction = {
        type: 'targetPlayer',
        playerId: player.id,
        data: { cardTitle: hazard.title, card: hazard },
      };
      // The hazard goes back to deck instead of being removed
      this.state.hazardDeck.unshift(hazard);
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Market / Buying Cards
  // ─────────────────────────────────────────────────────────────────────────

  getAvailableMarketStacks(player: Player): { station: 1 | 3 | 5; stacks: CardInstance[][] }[] {
    const result: { station: 1 | 3 | 5; stacks: CardInstance[][] }[] = [];

    // Can only buy from station at current location
    const stations = [1, 3, 5] as const;
    for (const station of stations) {
      if (player.location === station) {
        // Only return revealed stacks with cards
        const stacks = this.state.marketStacks[station]
          .filter(s => s.revealed && s.cards.length > 0)
          .map(s => s.cards);
        if (stacks.length > 0) {
          result.push({ station, stacks });
        }
      }
    }

    return result;
  }

  // Check if player can reveal a stack this turn (one per tier per turn)
  canRevealMarketStack(player: Player, station: 1 | 3 | 5, stackIndex: number): boolean {
    const stackInfo = this.state.marketStacks[station][stackIndex];
    // Can't reveal if already revealed
    if (!stackInfo || stackInfo.revealed) return false;
    // T1 is always revealed, so this shouldn't apply
    if (station === 1) return true;
    // Can only reveal one stack per tier per turn
    return player.revealedStacksThisTurn[station] === false;
  }

  // Reveal a market stack when a player browses it
  revealMarketStack(station: 1 | 3 | 5, stackIndex: number): boolean {
    const player = this.getCurrentPlayer();
    const stackInfo = this.state.marketStacks[station][stackIndex];

    if (!stackInfo || stackInfo.revealed) return false;

    // Check tier reveal limit for T2/T3
    if (station !== 1 && player.revealedStacksThisTurn[station] !== false) {
      this.log(`Cannot reveal another Tier ${station === 3 ? 2 : 3} stack this turn`, 'info');
      return false;
    }

    stackInfo.revealed = true;
    this.state.hasRevealedInfo = true;

    // Mark which stack was revealed at this tier this turn
    if (station !== 1) {
      player.revealedStacksThisTurn[station] = stackIndex;
    }

    this.log(`Market stack at station ${station} was revealed`, 'info');
    return true;
  }

  canBuyCard(player: Player, station: 1 | 3 | 5, stackIndex: number, cardIndex?: number): boolean {
    // Must be at the station
    if (player.location !== station) return false;

    // Must have cards in stack
    const stacks = this.state.marketStacks[station];
    if (stackIndex >= stacks.length || stacks[stackIndex].cards.length === 0) return false;

    // Stack must be revealed (T2/T3 start face-down)
    if (!stacks[stackIndex].revealed) return false;

    // Get the card to buy (default to top card if not specified)
    const actualIndex = cardIndex ?? stacks[stackIndex].cards.length - 1;
    if (actualIndex < 0 || actualIndex >= stacks[stackIndex].cards.length) return false;

    const card = stacks[stackIndex].cards[actualIndex];
    if (card.type !== 'action') return false;

    const actionCard = card as ActionCard & { instanceId: string };
    const cost = Math.max(0, actionCard.cost - player.buyDiscount);

    return player.credits >= cost;
  }

  buyCard(player: Player, station: 1 | 3 | 5, stackIndex: number, cardIndex?: number): boolean {
    if (!this.canBuyCard(player, station, stackIndex, cardIndex)) return false;

    const stackInfo = this.state.marketStacks[station][stackIndex];
    const actualIndex = cardIndex ?? stackInfo.cards.length - 1;

    // Remove the card from the stack (splice removes by index, not pop)
    const [card] = stackInfo.cards.splice(actualIndex, 1);
    const actionCard = card as ActionCard & { instanceId: string };

    const cost = Math.max(0, actionCard.cost - player.buyDiscount);
    player.credits -= cost;
    player.discard.push(card);

    // Buying from a stack reveals info - mark info revealed
    this.state.hasRevealedInfo = true;

    // Reset buy discount after use
    player.buyDiscount = 0;

    this.log(`${player.name} bought ${card.title} for ${cost} credits`, 'action');

    return true;
  }

  canBuyAndInstall(player: Player, station: 1 | 3 | 5, stackIndex: number, _targetSystem: SystemType, cardIndex?: number): boolean {
    // Must be at the station
    if (player.location !== station) return false;

    // Must have cards in stack
    const stacks = this.state.marketStacks[station];
    if (stackIndex >= stacks.length || stacks[stackIndex].cards.length === 0) return false;

    // Stack must be revealed
    if (!stacks[stackIndex].revealed) return false;

    // Get the card to buy (default to top card if not specified)
    const actualIndex = cardIndex ?? stacks[stackIndex].cards.length - 1;
    if (actualIndex < 0 || actualIndex >= stacks[stackIndex].cards.length) return false;

    const card = stacks[stackIndex].cards[actualIndex];
    if (card.type !== 'action') return false;

    const actionCard = card as ActionCard & { instanceId: string };

    // Must be installable
    if (!actionCard.installCost) return false;

    // Check for hazards that prevent installation
    if (this.playerHasActiveHazard(player, 'rogue-ai-fragment')) return false;
    if (this.playerHasActiveHazard(player, 'corrosive-spores')) return false;

    // Calculate total cost (buy + install, with discounts)
    const buyCost = Math.max(0, actionCard.cost - player.buyDiscount);
    const installCost = Math.max(0, actionCard.installCost - player.installDiscount);
    const totalCost = buyCost + installCost;

    return player.credits >= totalCost;
  }

  buyAndInstall(player: Player, station: 1 | 3 | 5, stackIndex: number, targetSystem: SystemType, cardIndex?: number): boolean {
    if (!this.canBuyAndInstall(player, station, stackIndex, targetSystem, cardIndex)) return false;

    const stackInfo = this.state.marketStacks[station][stackIndex];
    const actualIndex = cardIndex ?? stackInfo.cards.length - 1;

    // Remove the card from the stack
    const [card] = stackInfo.cards.splice(actualIndex, 1);
    const actionCard = card as ActionCard & { instanceId: string };

    // Calculate costs
    const buyCost = Math.max(0, actionCard.cost - player.buyDiscount);
    const installCost = Math.max(0, actionCard.installCost! - player.installDiscount);
    const totalCost = buyCost + installCost;

    // Pay total cost
    player.credits -= totalCost;

    // Buying from a stack reveals info - mark info revealed
    this.state.hasRevealedInfo = true;

    // Reset discounts
    player.buyDiscount = 0;
    player.installDiscount = 0;

    // Remove old installation if present - goes to discard pile
    const oldInstallation = player.installations[targetSystem];
    if (oldInstallation) {
      player.discard.push(oldInstallation);
      this.log(`  ${oldInstallation.title} returned to discard`, 'info');
    }

    // Install the new card directly
    player.installations[targetSystem] = card;

    // Apply immediate install bonuses
    this.applyImmediateInstallBonus(player, actionCard, targetSystem);

    this.log(`${player.name} bought and installed ${card.title} for ${totalCost} credits`, 'action');

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Missions
  // ─────────────────────────────────────────────────────────────────────────

  getMissionAtLocation(location: number): TrackMission | null {
    return this.state.trackMissions[location] ?? null;
  }

  canCompleteMission(player: Player, verbose = false): boolean {
    const trackMission = this.getMissionAtLocation(player.location);
    if (!trackMission || !trackMission.revealed) {
      if (verbose) this.log(`Mission check: No revealed mission at location ${player.location}`, 'info');
      return false;
    }

    // Check for Corrupted Nav Chip hazard
    if (this.playerHasActiveHazard(player, 'corrupted-nav-chip')) {
      if (verbose) this.log(`Mission check: Blocked by Corrupted Nav Chip in hand`, 'info');
      return false;
    }

    const mission = trackMission.mission;
    const requirements = mission.requirements;

    // Check power requirements (with mission discount distributed as total budget)
    let discountRemaining = player.missionDiscount;
    let totalDeficit = 0;
    for (const system of SYSTEMS) {
      const base = requirements[system] ?? 0;
      if (base <= 0) continue;
      const discountForThis = Math.min(base, discountRemaining);
      discountRemaining -= discountForThis;
      const required = base - discountForThis;
      if (required > 0 && player.currentPower[system] < required) {
        totalDeficit += required - player.currentPower[system];
      }
    }
    if (totalDeficit > 0) {
      if (verbose) this.log(`Mission check: Not enough power (deficit: ${totalDeficit})`, 'info');
      return false;
    }

    // Check for Warrant Issued hazard (missions cost +2 credits)
    if (this.playerHasActiveHazard(player, 'warrant-issued')) {
      if (player.credits < 2) {
        if (verbose) this.log(`Mission check: Warrant Issued requires 2 credits, have ${player.credits}`, 'info');
        return false;
      }
    }

    return true;
  }

  completeMission(player: Player): boolean {
    if (!this.canCompleteMission(player)) return false;

    const trackMission = this.getMissionAtLocation(player.location)!;
    const mission = trackMission.mission;
    const requirements = mission.requirements;

    // Spend power (with discount distributed as total budget across systems)
    let spendDiscountRemaining = player.missionDiscount;
    for (const system of SYSTEMS) {
      const base = requirements[system] ?? 0;
      if (base <= 0) continue;
      const discountForThis = Math.min(base, spendDiscountRemaining);
      spendDiscountRemaining -= discountForThis;
      const required = Math.max(0, base - discountForThis);
      if (required > 0) {
        player.currentPower[system] -= required;
      }
    }

    // Reset mission discount
    player.missionDiscount = 0;

    // Warrant Issued hazard: pay 2 extra credits
    if (this.playerHasActiveHazard(player, 'warrant-issued')) {
      player.credits -= 2;
      this.log(`  Warrant Issued: -2 Credits`, 'hazard');
    }

    // Grant fame
    player.fame += mission.fame;
    this.log(`${player.name} completed "${mission.title}" (+${mission.fame} Fame)`, 'action');

    // Apply rewards
    this.applyMissionRewards(player, mission);

    // Move mission to completed
    player.completedMissions.push(mission);
    if (mission.rewardType === 'trophy') {
      player.trophies.push(mission);
    }

    // Clear mission slot — replacement happens at end of turn
    this.state.trackMissions[player.location] = null;
    this.state.pendingMissionReplacements.push(player.location);

    // Infiltrator captain ability
    if (player.captain.ability.trigger === 'onWeaponsMission' && requirements.weapons) {
      // Give hazard to another player
      this.state.pendingAction = {
        type: 'targetPlayer',
        playerId: player.id,
        data: { cardTitle: 'Infiltrator ability' },
      };
    }

    return true;
  }

  private applyMissionRewards(player: Player, mission: MissionInstance): void {
    const data = mission.rewardData;

    // Handle choice rewards first (e.g., "+2⚡ or +3 Credits")
    if (data.choice && data.choice.length > 0) {
      this.state.pendingAction = {
        type: 'missionRewardChoice',
        playerId: player.id,
        data: {
          mission,
          rewardType: mission.rewardType,
        },
      };
      this.log(`  Choose your reward!`, 'reward');
      return; // Wait for player choice
    }

    // Instant credits (all reward types can have this)
    if (data.credits) {
      player.credits += data.credits;
      this.log(`  +${data.credits} Credits`, 'reward');
    }

    // Handle based on reward type
    switch (mission.rewardType) {
      case 'bolt':
        // Instant reward - power goes directly to player's choice
        if (data.powerChoice) {
          // Set pending action to let player choose where to allocate power
          this.state.pendingAction = {
            type: 'missionReward',
            playerId: player.id,
            data: {
              mission,
              powerAmount: data.powerChoice,
              rewardType: 'bolt',
            },
          };
          this.log(`  Choose where to allocate +${data.powerChoice}⚡`, 'reward');
        }
        break;

      case 'gear':
        // Gear reward - the mission card itself gets installed to a system slot!
        // Player must choose which system to install it to
        this.state.pendingAction = {
          type: 'missionReward',
          playerId: player.id,
          data: {
            mission,
            powerAmount: data.powerChoice ?? 0,
            rewardType: 'gear',
          },
        };
        this.log(`  Choose a system to install this gear!`, 'reward');
        break;

      case 'trophy':
        // Trophy - passive effect, automatically tracked via trophies array
        // Trophies do NOT get installed to a system - they go to the trophies list only
        // Any immediate power still goes to player's choice
        if (data.powerChoice) {
          this.state.pendingAction = {
            type: 'missionReward',
            playerId: player.id,
            data: {
              mission,
              powerAmount: data.powerChoice,
              rewardType: 'trophy',
            },
          };
        }
        this.log(`  Trophy acquired: ${mission.reward} (passive effect)`, 'reward');
        break;
    }

    // Handle mayTrash (can happen with any reward type)
    if (data.mayTrash && !this.state.pendingAction) {
      this.state.pendingAction = {
        type: 'trashCard',
        playerId: player.id,
        data: { amount: data.mayTrash, source: 'both' },
      };
    }

    // Handle trashHazard
    if (data.trashHazard) {
      const hazardsInHand = player.hand.filter(c => c.type === 'hazard');
      if (hazardsInHand.length > 0) {
        this.trashCard(player, hazardsInHand[0].instanceId, 'hand');
      }
    }
  }

  private replaceMission(location: number): void {
    const zone = ZONE_MAP[location];
    const pool = this.state.missionPools[zone];

    if (pool.length > 0) {
      const newMission = pool.pop()!;
      this.state.trackMissions[location] = {
        mission: newMission,
        revealed: true,
      };
    } else {
      this.state.trackMissions[location] = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // System Activation
  // ─────────────────────────────────────────────────────────────────────────

  canActivateSystem(player: Player, system: SystemType, abilityIndex: number): boolean {
    const abilities = SYSTEM_CONFIG[system].abilities;
    if (abilityIndex >= abilities.length) return false;

    // Check if already used this turn (each ability can only be used once per turn)
    if (player.usedSystemAbilities[system][abilityIndex]) {
      // Broker captain ability: can use one ability twice per turn
      if (player.captain.ability.doubleActivate && !player.usedCaptainAbility) {
        // Allow it - will mark captain ability as used in activateSystem
      } else {
        return false;
      }
    }

    const ability = abilities[abilityIndex];

    // Check for Scrambled Controls hazard (abilities cost +1)
    let cost = ability.cost;
    if (this.playerHasActiveHazard(player, 'scrambled-controls')) {
      cost += 1;
    }

    return player.currentPower[system] >= cost;
  }

  activateSystem(player: Player, system: SystemType, abilityIndex: number, targetPlayerId?: number): boolean {
    if (!this.canActivateSystem(player, system, abilityIndex)) return false;

    const ability = SYSTEM_CONFIG[system].abilities[abilityIndex];

    // Calculate cost (with hazard modifier)
    let cost = ability.cost;
    if (this.playerHasActiveHazard(player, 'scrambled-controls')) {
      cost += 1;
    }

    // Broker captain ability: if ability was already used, this is the double-activate
    if (player.usedSystemAbilities[system][abilityIndex] &&
        player.captain.ability.doubleActivate && !player.usedCaptainAbility) {
      player.usedCaptainAbility = true;
      this.log(`${player.name}'s Broker ability: double activate!`, 'action');
    }

    // Mark ability as used this turn
    player.usedSystemAbilities[system][abilityIndex] = true;

    // Spend power
    player.currentPower[system] -= cost;

    this.log(`${player.name} activated ${system}: ${ability.description}`, 'action');

    // Apply effect
    switch (ability.effect) {
      case 'giveHazardAtLocation':
        if (targetPlayerId !== undefined) {
          const target = this.getPlayer(targetPlayerId);
          if (target && target.location === player.location) {
            this.giveHazard(player, target);
          }
        } else {
          // Need to select a target - set pending action
          // Check if there are any valid targets first
          const validTargets = this.state.players.filter(p =>
            p.id !== player.id && p.location === player.location
          );
          if (validTargets.length > 0) {
            this.state.pendingAction = {
              type: 'targetPlayer',
              playerId: player.id,
              data: {
                cardTitle: `Weapons ${cost}⚡ (at location)`,
                source: 'giveHazardAtLocation'
              },
            };
          } else {
            this.log(`No valid targets at location ${player.location}`, 'info');
          }
        }
        break;

      case 'giveHazardAnywhere':
        if (targetPlayerId !== undefined) {
          const target = this.getPlayer(targetPlayerId);
          if (target) {
            this.giveHazard(player, target);
          }
        } else {
          // Need to select a target - set pending action
          const validTargets = this.state.players.filter(p => p.id !== player.id);
          if (validTargets.length > 0) {
            this.state.pendingAction = {
              type: 'targetPlayer',
              playerId: player.id,
              data: {
                cardTitle: `Weapons ${cost}⚡ (any player)`,
                source: 'giveHazardAnywhere'
              },
            };
          } else {
            this.log(`No valid targets available`, 'info');
          }
        }
        break;

      case 'draw1':
        this.drawCards(player, 1);
        break;

      case 'draw3keep1':
        // Draw 3, keep 1, discard 2 - needs UI
        // This reveals card information
        this.state.hasRevealedInfo = true;
        const drawn = this.drawCards(player, 3);
        this.state.pendingAction = {
          type: 'draw3keep1',
          playerId: player.id,
          data: { cards: drawn },
        };
        break;

      case 'move1':
        player.movesRemaining += 1;
        break;

      case 'gain1Credit':
        player.credits += 1;
        break;

      case 'trashCard':
        this.state.pendingAction = {
          type: 'trashCard',
          playerId: player.id,
          data: { amount: 1, source: 'both' },
        };
        break;
    }

    // Broker's double-activate is handled above (before marking ability as used)

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Installation
  // ─────────────────────────────────────────────────────────────────────────

  canInstallCard(player: Player, cardInstanceId: string, _targetSystem: SystemType): boolean {
    const card = player.hand.find(c => c.instanceId === cardInstanceId);
    if (!card || card.type !== 'action') return false;

    const actionCard = card as ActionCard & { instanceId: string };
    if (!actionCard.installCost) return false;

    // Check for hazards that prevent installation
    if (this.playerHasActiveHazard(player, 'rogue-ai-fragment')) return false;
    if (this.playerHasActiveHazard(player, 'corrosive-spores')) return false;

    // Check cost
    const cost = Math.max(0, actionCard.installCost - player.installDiscount);
    return player.credits >= cost;
  }

  installCard(player: Player, cardInstanceId: string, targetSystem: SystemType): boolean {
    if (!this.canInstallCard(player, cardInstanceId, targetSystem)) return false;

    const cardIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);
    if (cardIndex === -1) {
      this.log(`Card ${cardInstanceId} not found in hand for installation`, 'info');
      return false;
    }

    const [card] = player.hand.splice(cardIndex, 1);
    const actionCard = card as ActionCard & { instanceId: string };

    // Pay cost
    const cost = Math.max(0, actionCard.installCost! - player.installDiscount);
    player.credits -= cost;
    player.installDiscount = 0;

    // Remove old installation if present - goes to discard pile
    const oldInstallation = player.installations[targetSystem];
    if (oldInstallation) {
      player.discard.push(oldInstallation);
      this.log(`  ${oldInstallation.title} returned to discard`, 'info');
    }

    // Install new card
    player.installations[targetSystem] = card;

    // Apply immediate install bonuses
    this.applyImmediateInstallBonus(player, actionCard, targetSystem);

    this.log(`${player.name} installed ${card.title} in ${targetSystem}`, 'action');

    return true;
  }

  // Apply install bonuses immediately when installing (not just at turn start)
  private applyImmediateInstallBonus(player: Player, card: ActionCard, targetSystem: SystemType): void {
    if (!card.installData) return;

    const data = card.installData;
    const effects: string[] = [];

    // Power bonuses
    if (data.power) {
      for (const sys of SYSTEMS) {
        if (data.power[sys]) {
          player.currentPower[sys] = Math.min(MAX_POWER, player.currentPower[sys] + data.power[sys]!);
          effects.push(`+${data.power[sys]}⚡ ${sys}`);
        }
      }
    }

    // Power choice - apply to the same system as the installation
    if (data.powerChoice) {
      player.currentPower[targetSystem] = Math.min(MAX_POWER, player.currentPower[targetSystem] + data.powerChoice);
      effects.push(`+${data.powerChoice}⚡ ${targetSystem}`);
    }

    // Movement
    if (data.moves) {
      player.movesRemaining += data.moves;
      effects.push(`+${data.moves} move`);
    }

    // Card draw
    if (data.draw) {
      this.drawCards(player, data.draw);
      effects.push(`+${data.draw} card${data.draw > 1 ? 's' : ''}`);
    }

    // Credits
    if (data.credits) {
      player.credits += data.credits;
      effects.push(`+${data.credits} credit${data.credits > 1 ? 's' : ''}`);
    }

    // Discounts
    if (data.buyDiscount) {
      player.buyDiscount += data.buyDiscount;
      effects.push(`-${data.buyDiscount} buy cost`);
    }
    if (data.installDiscount) {
      player.installDiscount += data.installDiscount;
      effects.push(`-${data.installDiscount} install cost`);
    }

    player.currentPower = clampPower(player.currentPower);

    // Log all immediate effects
    if (effects.length > 0) {
      this.log(`  Install bonus: ${effects.join(', ')}`, 'reward');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Action Dispatch
  // ─────────────────────────────────────────────────────────────────────────

  dispatch(action: GameAction): boolean {
    const player = this.getCurrentPlayer();

    // Save snapshot before each action for granular undo
    // (skip END_TURN and RESTART_TURN since those change turns)
    if (action.type !== 'END_TURN' && action.type !== 'RESTART_TURN') {
      this.pushActionSnapshot();
    }

    switch (action.type) {
      case 'PLAY_CARD':
        return this.playCard(player, action.cardInstanceId, action.powerAllocation);

      case 'INSTALL_CARD':
        return this.installCard(player, action.cardInstanceId, action.targetSystem);

      case 'ACTIVATE_SYSTEM':
        return this.activateSystem(player, action.system, action.abilityIndex, action.targetPlayerId);

      case 'MOVE':
        if (player.movesRemaining > 0) {
          // Use free move
          player.movesRemaining--;
          return this.move(player, action.direction);
        } else if (this.canActivateSystem(player, 'engines', 0)) {
          // Spend engine power to move - directly move without adding to movesRemaining
          const ability = SYSTEM_CONFIG['engines'].abilities[0];
          let cost = ability.cost;
          if (this.playerHasActiveHazard(player, 'scrambled-controls')) {
            cost += 1;
          }
          player.currentPower.engines -= cost;
          this.log(`${player.name} spent ${cost}⚡ Engines to move`, 'action');
          return this.move(player, action.direction);
        }
        return false;

      case 'COMPLETE_MISSION':
        return this.completeMission(player);

      case 'BUY_CARD':
        // Determine which station based on player location
        if (player.location === 1 || player.location === 3 || player.location === 5) {
          return this.buyCard(player, player.location as 1 | 3 | 5, action.stackIndex, action.cardIndex);
        }
        return false;

      case 'BUY_AND_INSTALL':
        // Buy a card and immediately install it
        if (player.location === 1 || player.location === 3 || player.location === 5) {
          return this.buyAndInstall(player, player.location as 1 | 3 | 5, action.stackIndex, action.targetSystem, action.cardIndex);
        }
        return false;

      case 'END_TURN':
        this.endTurn();
        return true;

      case 'CLEAR_HAZARD':
        return this.clearHazard(player, action.hazardInstanceId);

      case 'RESOLVE_PENDING':
        return this.resolvePendingAction(action.choice);

      case 'REVEAL_STACK':
        if (player.location === action.station || action.station === 1) {
          this.revealMarketStack(action.station, action.stackIndex);
          return true;
        }
        return false;

      case 'RESTART_TURN':
        return this.restartTurn();

      default:
        return false;
    }
  }

  private resolvePendingAction(choice: unknown): boolean {
    if (!this.state.pendingAction) return false;

    const pending = this.state.pendingAction;
    const player = this.getPlayer(pending.playerId)!;

    switch (pending.type) {
      case 'revealHazards':
        // Player acknowledged hazards, move to action phase
        this.enterActionPhase();
        return true;

      case 'targetPlayer':
        const targetId = choice as number;
        if (targetId >= 0) {
          const target = this.getPlayer(targetId);
          if (target) {
            // Check bonusIfHadHazard before giving (Scrap Shot)
            const targetHadHazard = target.hand.some(c => c.type === 'hazard');

            this.giveHazard(player, target);

            // Apply bonus if target already had a hazard (Scrap Shot)
            if (pending.data?.bonusIfHadHazard && targetHadHazard) {
              if (pending.data.bonusIfHadHazard.power) {
                const sys = getHighestSystem(player.currentPower);
                player.currentPower[sys] = Math.min(MAX_POWER, player.currentPower[sys] + pending.data.bonusIfHadHazard.power);
                this.log(`  +${pending.data.bonusIfHadHazard.power}⚡ (target had hazard)`, 'reward');
              }
              if (pending.data.bonusIfHadHazard.credits) {
                player.credits += pending.data.bonusIfHadHazard.credits;
                this.log(`  +${pending.data.bonusIfHadHazard.credits} Credits (target had hazard)`, 'reward');
              }
            }

            // Chain moveOther after giveHazard (Mag-Leash)
            if (pending.data?.moveOther) {
              this.state.pendingAction = {
                type: 'moveOtherPlayer',
                playerId: player.id,
                data: {
                  cardTitle: pending.data.cardTitle,
                  amount: pending.data.moveOther,
                  targetPlayerIds: this.state.players.filter(p => p.id !== player.id).map(p => p.id),
                },
              };
              return true; // Don't clear pending - chained into moveOtherPlayer
            }
          }
        } else {
          // Cancelled - no target selected
          this.log(`${player.name} cancelled the ability`, 'info');
        }
        break;

      case 'draw3keep1':
        const keepIndex = choice as number;
        const cards = pending.data?.cards ?? [];
        for (let i = 0; i < cards.length; i++) {
          if (i !== keepIndex) {
            player.discard.push(cards[i]);
          }
        }
        // The kept card is already in hand from drawCards
        break;

      case 'trashCard':
        const cardId = choice as string;
        if (cardId) {
          // Try hand first, then played, then discard
          if (!this.trashCard(player, cardId, 'hand')) {
            if (!this.trashCard(player, cardId, 'played')) {
              this.trashCard(player, cardId, 'discard');
            }
          }
        }

        // Apply deferred effects after mandatory trash (Cargo Jettison: trash then get power)
        if (pending.data?.deferredEffects) {
          const deferred = pending.data.deferredEffects;
          if (deferred.powerChoice) {
            // Need power allocation UI
            this.state.pendingAction = {
              type: 'powerAllocation',
              playerId: player.id,
              data: { powerAmount: deferred.powerChoice, cardTitle: pending.data.cardTitle || '' },
            };
            return true; // Don't clear pending - chained into powerAllocation
          }
          if (deferred.power) {
            this.addPower(player, deferred.power);
          }
          if (deferred.credits) {
            player.credits += deferred.credits;
          }
        }
        break;

      case 'moveOtherPlayer':
        // Player chose a target to move (Mag-Leash)
        const moveChoice = choice as { targetId: number; direction: -1 | 1 };
        if (moveChoice && moveChoice.targetId >= 0) {
          const moveTarget = this.getPlayer(moveChoice.targetId);
          if (moveTarget) {
            const newLoc = moveTarget.location + moveChoice.direction;
            if (newLoc >= 1 && newLoc <= 6) {
              moveTarget.location = newLoc as 1 | 2 | 3 | 4 | 5 | 6;
              this.log(`${player.name} moved ${moveTarget.name} to location ${moveTarget.location}`, 'action');
              this.revealMissionAtLocation(moveTarget.location);
            }
          }
        }
        break;

      case 'powerAllocation':
        const allocation = choice as PowerAllocation;
        this.addPower(player, allocation);
        break;

      case 'missionReward':
        // Choice is the system to apply power/gear to
        const targetSystem = choice as SystemType;
        const rewardData = pending.data;

        // If this is a gear reward, install the mission to the system slot
        // (Trophy rewards do NOT get installed - they only go to trophies array)
        if (rewardData?.rewardType === 'gear' && rewardData.mission) {
          // Remove any existing gear installation - it goes to completed missions
          const oldGear = player.gearInstallations[targetSystem];
          if (oldGear) {
            // Add the old gear to completed missions (it was already earned)
            if (!player.completedMissions.find(m => m.instanceId === oldGear.instanceId)) {
              player.completedMissions.push(oldGear);
            }
            this.log(`  Replaced ${oldGear.title} gear in ${targetSystem} (moved to completed)`, 'info');
          }

          // Install the gear mission to this system
          player.gearInstallations[targetSystem] = rewardData.mission;
          this.log(`  Installed ${rewardData.mission.title} gear in ${targetSystem}`, 'reward');

          // Apply immediate bonuses from the gear's rewardData
          const gearData = rewardData.mission.rewardData;
          if (gearData) {
            if (gearData.credits && !gearData.conditionalCredits && !gearData.passive) {
              player.credits += gearData.credits;
              this.log(`  Gear bonus: +${gearData.credits} credit${gearData.credits > 1 ? 's' : ''}`, 'reward');
            }
            if (gearData.draw) {
              this.drawCards(player, gearData.draw);
              this.log(`  Gear bonus: +${gearData.draw} card${gearData.draw > 1 ? 's' : ''}`, 'reward');
            }
          }
        }

        // Apply any immediate power bonus (for both gear and trophy rewards)
        if (rewardData?.powerAmount && rewardData.powerAmount > 0) {
          player.currentPower[targetSystem] = Math.min(
            MAX_POWER,
            player.currentPower[targetSystem] + rewardData.powerAmount
          );
          this.log(`  +${rewardData.powerAmount}⚡ to ${targetSystem}`, 'reward');
        }
        break;

      case 'missionRewardChoice':
        // Player chose one of the reward options (e.g., "+2⚡ or +3 Credits")
        const choiceIdx = choice as number;
        const missionData = pending.data?.mission?.rewardData;
        if (missionData?.choice && missionData.choice[choiceIdx]) {
          const chosenReward = missionData.choice[choiceIdx];

          // Apply the chosen reward
          if (chosenReward.credits) {
            player.credits += chosenReward.credits;
            this.log(`  +${chosenReward.credits} Credits (chosen)`, 'reward');
          }

          if (chosenReward.powerChoice) {
            // Need to ask which system
            this.state.pendingAction = {
              type: 'missionReward',
              playerId: player.id,
              data: {
                mission: pending.data?.mission,
                powerAmount: chosenReward.powerChoice,
                rewardType: 'bolt',
              },
            };
            return true; // Don't clear pending action yet
          }
        }
        break;
    }

    this.state.pendingAction = null;
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default GameEngine;
