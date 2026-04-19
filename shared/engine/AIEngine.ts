// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - AI Engine
// Decision-making logic for AI opponents
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  GameState,
  Player,
  CardInstance,
  ActionCard,
  SystemType,
  GameAction,
  MissionInstance,
  AIStrategy,
  PowerState,
} from '../types/index.js';

import { SYSTEMS, SYSTEM_CONFIG } from '../data/constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ScoredAction {
  action: GameAction;
  score: number;
  reason: string;
}

interface StrategyWeights {
  missionPriority: number;    // How much to prioritize completing missions
  buyPriority: number;        // How much to prioritize buying cards
  installPriority: number;    // How much to prioritize installations
  hazardPriority: number;     // How much to prioritize giving hazards
  movementPriority: number;   // How much to prioritize movement
  creditValue: number;        // How valuable credits are
  powerValue: number;         // How valuable power is
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Weights
// ─────────────────────────────────────────────────────────────────────────────

const STRATEGY_WEIGHTS: Record<AIStrategy, StrategyWeights> = {
  balanced: {
    missionPriority: 2.0,      // Increased - missions are how you win!
    buyPriority: 1.0,
    installPriority: 1.0,
    hazardPriority: 0.6,
    movementPriority: 1.5,     // Increased - need to move to missions
    creditValue: 1.0,
    powerValue: 1.5,           // Increased - power completes missions
  },
  aggressive: {
    missionPriority: 1.8,
    buyPriority: 0.7,
    installPriority: 0.6,
    hazardPriority: 1.2,
    movementPriority: 1.4,
    creditValue: 0.8,
    powerValue: 1.8,           // Power-focused for missions
  },
  economic: {
    missionPriority: 1.6,
    buyPriority: 1.4,
    installPriority: 1.3,
    hazardPriority: 0.4,
    movementPriority: 1.2,
    creditValue: 1.5,
    powerValue: 1.2,
  },
  explorer: {
    missionPriority: 2.5,      // Highest mission priority
    buyPriority: 0.8,
    installPriority: 0.9,
    hazardPriority: 0.4,
    movementPriority: 2.0,     // Highest movement priority
    creditValue: 0.9,
    powerValue: 1.4,
  },
  rush: {
    missionPriority: 3.0,      // Rush to complete missions fast
    buyPriority: 0.5,
    installPriority: 0.4,
    hazardPriority: 0.3,
    movementPriority: 2.0,
    creditValue: 0.6,
    powerValue: 1.5,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Engine Class
// ─────────────────────────────────────────────────────────────────────────────

export class AIEngine {
  private weights: StrategyWeights;

  constructor(strategy: AIStrategy = 'balanced') {
    this.weights = STRATEGY_WEIGHTS[strategy];
  }

  // Mirrors the engine's own check: a hazard is "active" when it's in hand.
  // Used by the scorers to avoid proposing actions the engine would reject,
  // which previously caused infinite dispatch loops (AI kept proposing the
  // same MOVE / COMPLETE_MISSION, engine kept returning false).
  private playerHasActiveHazard(player: Player, hazardId: string): boolean {
    return player.hand.some(c => c.type === 'hazard' && c.id === hazardId);
  }

  // Per-system power shortfall for a specific mission — e.g. "needs 1 more
  // computers". Only positive deficits are included. Respects missionDiscount
  // by distributing it across the systems that need the most (greedy — not
  // optimal, but close enough for scoring).
  private getMissionPowerDeficit(player: Player, mission: MissionInstance): Partial<PowerState> {
    const deficit: Partial<PowerState> = {};
    let discount = player.missionDiscount ?? 0;
    // Greedily apply discount to largest gap first
    const gaps = SYSTEMS
      .map(sys => ({ sys, gap: Math.max(0, (mission.requirements[sys] ?? 0) - player.currentPower[sys]) }))
      .filter(g => g.gap > 0)
      .sort((a, b) => b.gap - a.gap);
    for (const g of gaps) {
      const applied = Math.min(g.gap, discount);
      discount -= applied;
      const remaining = g.gap - applied;
      if (remaining > 0) deficit[g.sys] = remaining;
    }
    return deficit;
  }

  // Aggregate deficit across the best mission target (current location or
  // a close one). Returns an empty object if nothing is targetable.
  // Used by scorers to boost actions that fill specific shortfalls.
  private getActiveDeficit(state: GameState, player: Player): Partial<PowerState> {
    const here = this.getMissionAtLocation(state, player.location);
    if (here && !this.canCompleteMission(player, here)) {
      return this.getMissionPowerDeficit(player, here);
    }
    const target = this.findBestMissionTarget(state, player);
    if (target && !this.canCompleteMission(player, target.mission)) {
      return this.getMissionPowerDeficit(player, target.mission);
    }
    return {};
  }

  // How many units of a card's fixed power allocation actually CLOSE a
  // deficit we care about. Each unit of "right" power is worth more than a
  // unit of generic power.
  private powerMatchBonus(power: Partial<PowerState> | undefined, deficit: Partial<PowerState>): number {
    if (!power) return 0;
    let matched = 0;
    for (const sys of SYSTEMS) {
      const provided = power[sys] ?? 0;
      const needed = deficit[sys] ?? 0;
      if (provided > 0 && needed > 0) {
        matched += Math.min(provided, needed);
      }
    }
    return matched;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main Decision Method
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the best action for the current game state
   * Returns null if the AI should end their turn
   */
  decideAction(state: GameState, player: Player): GameAction | null {
    // Handle pending actions first (hazard reveals, target selection, etc.)
    if (state.pendingAction) {
      return this.handlePendingAction(state, player);
    }

    // Generate all possible actions and score them
    const scoredActions = this.generateAndScoreActions(state, player);

    // If no valuable actions remain, end turn
    if (scoredActions.length === 0 || scoredActions[0].score <= 0) {
      return { type: 'END_TURN' };
    }

    // Return the highest-scoring action
    return scoredActions[0].action;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pending Action Handlers
  // ─────────────────────────────────────────────────────────────────────────

  private handlePendingAction(state: GameState, player: Player): GameAction | null {
    const pending = state.pendingAction!;

    switch (pending.type) {
      case 'revealHazards':
        // Just acknowledge hazards
        return { type: 'RESOLVE_PENDING', choice: null };

      case 'targetPlayer':
        // Choose a target (hazard or interaction)
        return this.chooseHazardTarget(state, player);

      case 'draw3keep1':
        // Keep the best card
        return this.chooseBestCardToKeep(pending.data?.cards ?? [], player);

      case 'trashCard':
        // Trash the worst card
        return this.chooseCardToTrash(player);

      case 'missionReward':
      case 'powerAllocation':
        // Choose the best system for power
        return this.chooseBestSystemForPower(state, player, pending.data?.powerAmount ?? 1);

      case 'hazardClearPower': {
        // Pick N systems to spend 1 power each from (prefer systems with most power)
        const count = pending.data?.powerAmount ?? 2;
        const systemsByPower = (['weapons', 'computers', 'engines', 'logistics'] as const)
          .filter(s => player.currentPower[s] >= 1)
          .sort((a, b) => player.currentPower[b] - player.currentPower[a])
          .slice(0, count);
        const alloc: Record<string, number> = { weapons: 0, computers: 0, engines: 0, logistics: 0 };
        for (const s of systemsByPower) alloc[s] = 1;
        return { type: 'RESOLVE_PENDING', choice: alloc };
      }

      case 'missionRewardChoice':
        // Choose the better reward option
        return this.chooseMissionReward(pending.data?.mission);

      case 'moveOtherPlayer': {
        // Move the leading opponent backward if possible
        const moveTargetIds = pending.data?.targetPlayerIds ?? [];
        const moveTargets = state.players.filter(p => moveTargetIds.includes(p.id));
        if (moveTargets.length === 0) return { type: 'RESOLVE_PENDING', choice: { targetId: -1, direction: 1 } };
        const target = moveTargets.reduce((best, p) => p.fame > best.fame ? p : best);
        const dir = target.location > 1 ? -1 : 1;
        return { type: 'RESOLVE_PENDING', choice: { targetId: target.id, direction: dir } };
      }

      // ── Interaction pending actions ──────────────────────────────────

      case 'forceDiscard': {
        // Discard lowest-value card(s) from hand
        const amount = pending.data?.amount ?? 1;
        const hand = player.hand.filter(c => c.type !== 'hazard');
        if (hand.length === 0) return { type: 'RESOLVE_PENDING', choice: amount === 1 ? null : [] };
        const sorted = [...hand].sort((a, b) => this.scoreCardValue(a, player) - this.scoreCardValue(b, player));
        const toDiscard = sorted.slice(0, Math.min(amount, sorted.length));
        if (amount === 1) return { type: 'RESOLVE_PENDING', choice: toDiscard[0].instanceId };
        return { type: 'RESOLVE_PENDING', choice: toDiscard.map(c => c.instanceId) };
      }

      case 'chooseOpponentDiscard': {
        // Pick opponent's best card (highest value)
        const opponentHand = pending.data?.opponentHand ?? [];
        if (opponentHand.length === 0) return { type: 'RESOLVE_PENDING', choice: null };
        const best = opponentHand.reduce((b, c) =>
          this.scoreCardValue(c, player) > this.scoreCardValue(b, player) ? c : b
        );
        return { type: 'RESOLVE_PENDING', choice: best.instanceId };
      }

      case 'choosePowerLoss': {
        // Lose power from system with most power (least impactful)
        const systems = (['weapons', 'computers', 'engines', 'logistics'] as const)
          .filter(s => player.currentPower[s] > 0)
          .sort((a, b) => player.currentPower[b] - player.currentPower[a]);
        return { type: 'RESOLVE_PENDING', choice: systems[0] ?? 'weapons' };
      }

      case 'forceUninstall': {
        // Return least valuable installation
        const installed = (['weapons', 'computers', 'engines', 'logistics'] as const)
          .filter(s => player.installations[s] !== null);
        if (installed.length === 0) return { type: 'RESOLVE_PENDING', choice: 'weapons' };
        // Pick the one with lowest-tier card
        const worst = installed.reduce((w, s) => {
          const wCard = player.installations[w] as any;
          const sCard = player.installations[s] as any;
          return (sCard?.tier ?? 0) < (wCard?.tier ?? 0) ? s : w;
        });
        return { type: 'RESOLVE_PENDING', choice: worst };
      }

      case 'interactionChoice': {
        // Prefer uninstall if opponent has installations, otherwise discard
        const tid = pending.data?.targetPlayerId;
        const opponent = tid !== undefined ? state.players.find(p => p.id === tid) : undefined;
        const hasInstalls = opponent && (['weapons', 'computers', 'engines', 'logistics'] as const).some(s => opponent.installations[s] !== null);
        return { type: 'RESOLVE_PENDING', choice: hasInstalls ? 'uninstall' : 'discard' };
      }

      case 'chooseOpponentInstall': {
        // Pick opponent's best (highest tier) installation
        const opId = pending.data?.targetPlayerId;
        const op = opId !== undefined ? state.players.find(p => p.id === opId) : undefined;
        if (!op) return { type: 'RESOLVE_PENDING', choice: 'weapons' };
        const opInstalled = (['weapons', 'computers', 'engines', 'logistics'] as const)
          .filter(s => op.installations[s] !== null);
        if (opInstalled.length === 0) return { type: 'RESOLVE_PENDING', choice: 'weapons' };
        const bestSys = opInstalled.reduce((b, s) => {
          const bCard = op.installations[b] as any;
          const sCard = op.installations[s] as any;
          return (sCard?.tier ?? 0) > (bCard?.tier ?? 0) ? s : b;
        });
        return { type: 'RESOLVE_PENDING', choice: bestSys };
      }

      case 'mayDiscardToDraw':
        // AI: yes if we have starter cards or hazards in hand
        return { type: 'RESOLVE_PENDING', choice: player.hand.some(c => c.type === 'starter') };

      case 'maySwapHandDiscard':
        // AI: usually skip (simpler)
        return { type: 'RESOLVE_PENDING', choice: false };

      case 'selectSwapDiscard':
        // If somehow AI gets here, just pick first card
        if (pending.data?.source === 'hand') {
          const nonHazard = player.hand.filter(c => c.type !== 'hazard');
          return { type: 'RESOLVE_PENDING', choice: nonHazard[0]?.instanceId ?? null };
        } else {
          return { type: 'RESOLVE_PENDING', choice: player.discard[0]?.instanceId ?? null };
        }

      default:
        // Unknown pending action, try to resolve it
        return { type: 'RESOLVE_PENDING', choice: null };
    }
  }

  private chooseHazardTarget(state: GameState, player: Player): GameAction {
    const pending = state.pendingAction;

    // If targetPlayerIds is specified, use those
    const targetIds = pending?.data?.targetPlayerIds;
    let validTargets: Player[];

    if (targetIds && targetIds.length > 0) {
      validTargets = state.players.filter(p => targetIds.includes(p.id));
    } else {
      const opponents = state.players.filter(p => p.id !== player.id);
      const isLocationRestricted = pending?.data?.source === 'giveHazardAtLocation';
      validTargets = isLocationRestricted
        ? opponents.filter(p => p.location === player.location)
        : opponents;
    }

    if (validTargets.length === 0) {
      return { type: 'RESOLVE_PENDING', choice: -1 }; // Cancel
    }

    // Target the leader
    const target = validTargets.reduce((best, p) => p.fame > best.fame ? p : best);
    return { type: 'RESOLVE_PENDING', choice: target.id };
  }

  private chooseBestCardToKeep(cards: CardInstance[], player: Player): GameAction {
    if (cards.length === 0) {
      return { type: 'RESOLVE_PENDING', choice: 0 };
    }

    // Score each card
    let bestIndex = 0;
    let bestScore = -Infinity;

    cards.forEach((card, idx) => {
      const score = this.scoreCardValue(card, player);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = idx;
      }
    });

    return { type: 'RESOLVE_PENDING', choice: bestIndex };
  }

  private chooseCardToTrash(player: Player): GameAction {
    // Combine hand and discard, find the worst card
    const trashable = [...player.hand, ...player.discard].filter(c => c.type !== 'hazard');

    if (trashable.length === 0) {
      // Try to trash a hazard if that's all we have
      const hazards = [...player.hand, ...player.discard].filter(c => c.type === 'hazard');
      if (hazards.length > 0) {
        return { type: 'RESOLVE_PENDING', choice: hazards[0].instanceId };
      }
      return { type: 'RESOLVE_PENDING', choice: null };
    }

    // Find the worst card (lowest value)
    let worstCard = trashable[0];
    let worstScore = this.scoreCardValue(worstCard, player);

    for (const card of trashable) {
      const score = this.scoreCardValue(card, player);
      if (score < worstScore) {
        worstScore = score;
        worstCard = card;
      }
    }

    return { type: 'RESOLVE_PENDING', choice: worstCard.instanceId };
  }

  private chooseBestSystemForPower(state: GameState, player: Player, _amount: number): GameAction {
    // Find the system that would benefit most from power
    const mission = this.getMissionAtLocation(state, player.location);

    // If there's a mission, prioritize systems we need for it
    if (mission) {
      for (const sys of SYSTEMS) {
        const required = mission.requirements[sys] ?? 0;
        if (required > 0 && player.currentPower[sys] < required) {
          return { type: 'RESOLVE_PENDING', choice: sys };
        }
      }
    }

    // Otherwise, put power in the system with the best abilities we can use
    // Prioritize: engines (movement) > logistics (credits) > computers (draw) > weapons
    const priorities: SystemType[] = ['engines', 'logistics', 'computers', 'weapons'];
    for (const sys of priorities) {
      if (player.currentPower[sys] < 6) {
        return { type: 'RESOLVE_PENDING', choice: sys };
      }
    }

    return { type: 'RESOLVE_PENDING', choice: 'engines' };
  }

  private chooseMissionReward(mission: MissionInstance | undefined): GameAction {
    if (!mission?.rewardData?.choice) {
      return { type: 'RESOLVE_PENDING', choice: 0 };
    }

    // Generally prefer power over credits for flexibility
    const choices = mission.rewardData.choice;
    let bestIdx = 0;
    let bestValue = 0;

    choices.forEach((choice, idx) => {
      let value = 0;
      if (choice.powerChoice) value += choice.powerChoice * 1.5 * this.weights.powerValue;
      if (choice.credits) value += choice.credits * this.weights.creditValue;
      if (value > bestValue) {
        bestValue = value;
        bestIdx = idx;
      }
    });

    return { type: 'RESOLVE_PENDING', choice: bestIdx };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Action Generation & Scoring
  // ─────────────────────────────────────────────────────────────────────────

  private generateAndScoreActions(state: GameState, player: Player): ScoredAction[] {
    const actions: ScoredAction[] = [];

    // 1. Score playing cards from hand
    actions.push(...this.scorePlayCardActions(state, player));

    // 2. Score completing missions
    actions.push(...this.scoreMissionActions(state, player));

    // 3. Score movement
    actions.push(...this.scoreMovementActions(state, player));

    // 4. Score buying cards
    actions.push(...this.scoreBuyActions(state, player));

    // 5. Score system abilities
    actions.push(...this.scoreSystemAbilities(state, player));

    // 6. Score installing cards from hand
    actions.push(...this.scoreInstallActions(state, player));

    // Sort by score descending
    actions.sort((a, b) => b.score - a.score);

    return actions;
  }

  private scorePlayCardActions(state: GameState, player: Player): ScoredAction[] {
    const actions: ScoredAction[] = [];

    // Failsafe Lockdown: max 2 cards played per turn.
    if (this.playerHasActiveHazard(player, 'failsafe-lockdown') && player.cardsPlayedThisTurn >= 2) {
      return actions;
    }

    for (const card of player.hand) {
      if (card.type === 'hazard') continue; // Can't play hazards

      const score = this.scorePlayingCard(card, state, player);
      if (score > 0) {
        // Determine if we need power allocation
        const needsAllocation = this.cardNeedsPowerChoice(card);
        const allocation = needsAllocation ? this.getBestPowerAllocation(card, state, player) : undefined;

        actions.push({
          action: {
            type: 'PLAY_CARD',
            cardInstanceId: card.instanceId,
            powerAllocation: allocation,
          },
          score,
          reason: `Play ${card.title}`,
        });
      }
    }

    return actions;
  }

  private scorePlayingCard(card: CardInstance, state: GameState, player: Player): number {
    let score = 0;

    // Check if we're close to completing a mission - power is more valuable then
    const missionHere = this.getMissionAtLocation(state, player.location);
    const bestTarget = this.findBestMissionTarget(state, player);
    const nearMission = missionHere || (bestTarget && Math.abs(player.location - bestTarget.location) <= 2);
    const powerMultiplier = nearMission ? 3 : 1.5; // Triple power value when near a mission

    // What specific systems are we short on for our current target mission?
    // Used to boost cards that fill the exact gap rather than adding generic
    // power.  E.g. if we're 1 computers short, a card giving `computers: 1`
    // should score far higher than one giving `weapons: 1`.
    const deficit = this.getActiveDeficit(state, player);
    // Each unit of "right" power beyond generic scoring is worth this much.
    // Large bonus — closing a deficit enables completing a mission (big fame).
    const DEFICIT_BONUS_PER_MATCH = 15;

    if (card.type === 'starter') {
      const starter = card as CardInstance & { effectData?: { credits?: number; power?: Partial<PowerState>; powerChoice?: number } };
      if (starter.effectData?.credits) {
        score += starter.effectData.credits * 2 * this.weights.creditValue;
      }
      if (starter.effectData?.power) {
        const totalPower = Object.values(starter.effectData.power).reduce((sum, v) => sum + (v ?? 0), 0);
        score += totalPower * powerMultiplier * this.weights.powerValue;
        score += this.powerMatchBonus(starter.effectData.power, deficit) * DEFICIT_BONUS_PER_MATCH;
      }
      if (starter.effectData?.powerChoice) {
        // powerChoice can be allocated to the deficit systems directly via
        // getBestPowerAllocation(), so any unit of it is worth the match
        // bonus up to the total deficit size.
        const totalDeficit = Object.values(deficit).reduce((a, b) => a + (b ?? 0), 0);
        const matchable = Math.min(starter.effectData.powerChoice, totalDeficit);
        score += starter.effectData.powerChoice * powerMultiplier * this.weights.powerValue;
        score += matchable * DEFICIT_BONUS_PER_MATCH;
      }
    }

    if (card.type === 'action') {
      const action = card as ActionCard & { instanceId: string };
      const data = action.effectData;
      if (data) {
        if (data.credits) score += data.credits * 2 * this.weights.creditValue;
        if (data.powerChoice) {
          const totalDeficit = Object.values(deficit).reduce((a, b) => a + (b ?? 0), 0);
          const matchable = Math.min(data.powerChoice, totalDeficit);
          score += data.powerChoice * powerMultiplier * this.weights.powerValue;
          score += matchable * DEFICIT_BONUS_PER_MATCH;
        }
        if (data.power) {
          const totalPower = Object.values(data.power).reduce((sum, v) => sum + (v ?? 0), 0);
          score += totalPower * powerMultiplier * this.weights.powerValue;
          score += this.powerMatchBonus(data.power, deficit) * DEFICIT_BONUS_PER_MATCH;
        }
        if (data.moves) score += data.moves * 3 * this.weights.movementPriority;
        if (data.draw) score += data.draw * 2;
        if (data.giveHazard) score += 2 * this.weights.hazardPriority;
        if (data.buyDiscount) score += data.buyDiscount * this.weights.buyPriority;
        if (data.installDiscount) score += data.installDiscount * this.weights.installPriority;
      }
    }

    return score;
  }

  private cardNeedsPowerChoice(card: CardInstance): boolean {
    if (card.type === 'starter') {
      const starter = card as CardInstance & { effectData?: { powerChoice?: number } };
      return !!starter.effectData?.powerChoice;
    }
    if (card.type === 'action') {
      const action = card as ActionCard & { instanceId: string };
      return !!action.effectData?.powerChoice;
    }
    return false;
  }

  private getBestPowerAllocation(card: CardInstance, state: GameState, player: Player): PowerState {
    const allocation: PowerState = { weapons: 0, computers: 0, engines: 0, logistics: 0 };

    let amount = 0;
    if (card.type === 'starter') {
      const starter = card as CardInstance & { effectData?: { powerChoice?: number } };
      amount = starter.effectData?.powerChoice ?? 0;
    } else if (card.type === 'action') {
      const action = card as ActionCard & { instanceId: string };
      amount = action.effectData?.powerChoice ?? 0;
    }

    if (amount === 0) return allocation;

    // First check mission at current location
    const missionHere = this.getMissionAtLocation(state, player.location);
    if (missionHere) {
      for (const sys of SYSTEMS) {
        const needed = (missionHere.requirements[sys] ?? 0) - player.currentPower[sys];
        if (needed > 0 && amount > 0) {
          const toAllocate = Math.min(needed, amount);
          allocation[sys] = toAllocate;
          amount -= toAllocate;
        }
      }
    }

    // If still have power left, look at best target mission
    if (amount > 0) {
      const bestTarget = this.findBestMissionTarget(state, player);
      if (bestTarget) {
        for (const sys of SYSTEMS) {
          const needed = (bestTarget.mission.requirements[sys] ?? 0) - player.currentPower[sys] - allocation[sys];
          if (needed > 0 && amount > 0) {
            const toAllocate = Math.min(needed, amount);
            allocation[sys] = toAllocate;
            amount -= toAllocate;
          }
        }
      }
    }

    // Put remaining power in engines for movement flexibility
    if (amount > 0) {
      allocation.engines += amount;
    }

    return allocation;
  }

  private scoreMissionActions(state: GameState, player: Player): ScoredAction[] {
    const actions: ScoredAction[] = [];

    const mission = this.getMissionAtLocation(state, player.location);
    if (mission && this.canCompleteMission(player, mission)) {
      // VERY HIGH score for completing missions - this is how you win!
      // Base score of 100 ensures mission completion is always top priority
      const score = 100 + mission.fame * 20 * this.weights.missionPriority;
      actions.push({
        action: { type: 'COMPLETE_MISSION' },
        score,
        reason: `Complete "${mission.title}" for ${mission.fame} fame`,
      });
    }

    return actions;
  }

  private scoreMovementActions(state: GameState, player: Player): ScoredAction[] {
    const actions: ScoredAction[] = [];

    // Thruster Jam: max 1 move per turn — engine rejects additional moves,
    // which would loop if we kept proposing them.
    if (this.playerHasActiveHazard(player, 'thruster-jam') && player.movesThisTurn >= 1) {
      return actions;
    }

    // Check if we have free moves or can spend engine power
    const canMoveForward = player.location < 6;
    const canMoveBackward = player.location > 1;
    const hasFreeMove = player.movesRemaining > 0;
    const hasEnginePower = player.currentPower.engines >= 1;

    if (!hasFreeMove && !hasEnginePower) return actions;

    // Find the best mission to pursue
    const bestTarget = this.findBestMissionTarget(state, player);

    // Score moving toward valuable missions
    if (canMoveForward) {
      let score = this.scoreMovingTo(state, player, player.location + 1);

      // Big bonus if moving toward our target mission
      if (bestTarget && player.location + 1 <= bestTarget.location) {
        score += 15 * this.weights.missionPriority;
      }

      if (score > 0 || hasFreeMove) {
        actions.push({
          action: { type: 'MOVE', direction: 1 },
          score: Math.max(score, hasFreeMove ? 5 : 0) * this.weights.movementPriority,
          reason: `Move forward to location ${player.location + 1}`,
        });
      }
    }

    if (canMoveBackward) {
      let score = this.scoreMovingTo(state, player, player.location - 1);

      // Bonus if moving toward our target mission (that's behind us)
      if (bestTarget && player.location - 1 >= bestTarget.location) {
        score += 10 * this.weights.missionPriority;
      }

      if (score > 0 || hasFreeMove) {
        actions.push({
          action: { type: 'MOVE', direction: -1 },
          score: Math.max(score, hasFreeMove ? 2 : 0) * this.weights.movementPriority,
          reason: `Move backward to location ${player.location - 1}`,
        });
      }
    }

    return actions;
  }

  private findBestMissionTarget(state: GameState, player: Player): { location: number; mission: MissionInstance; score: number } | null {
    let bestTarget: { location: number; mission: MissionInstance; score: number } | null = null;

    for (let loc = 1; loc <= 6; loc++) {
      const trackMission = state.trackMissions[loc];
      if (!trackMission?.revealed || !trackMission.mission) continue;

      const mission = trackMission.mission;
      const completionPercent = this.getMissionCompletionPercent(player, mission);
      const distance = Math.abs(player.location - loc);

      // Score based on: completion readiness, fame value, and distance
      // Heavily favor missions we can complete or are close to completing
      let score = completionPercent * 50 + mission.fame * 5 - distance * 3;

      // Huge bonus if we can complete it right now
      if (this.canCompleteMission(player, mission)) {
        score += 100;
      }

      // Bonus for being close
      if (distance <= 1) {
        score += 20;
      }

      if (!bestTarget || score > bestTarget.score) {
        bestTarget = { location: loc, mission, score };
      }
    }

    return bestTarget;
  }

  private scoreMovingTo(state: GameState, player: Player, location: number): number {
    let score = 0;

    // Check if there's a completable mission at the destination
    const trackMission = state.trackMissions[location];
    if (trackMission?.revealed && trackMission.mission) {
      const mission = trackMission.mission;

      // HUGE bonus if we can complete the mission
      if (this.canCompleteMission(player, mission)) {
        score += 50 + mission.fame * 10;
      } else {
        // Score based on how close we are to completing it
        const completionPercent = this.getMissionCompletionPercent(player, mission);
        score += completionPercent * mission.fame * 5;

        // Good bonus if we're over 70% ready
        if (completionPercent >= 0.7) {
          score += 15;
        }
      }
    }

    // Small bonus for stations (buying opportunities) - but missions are more important
    if (location === 1 || location === 3 || location === 5) {
      score += 3 * this.weights.buyPriority;
    }

    return score;
  }

  private scoreBuyActions(state: GameState, player: Player): ScoredAction[] {
    const actions: ScoredAction[] = [];

    // Can only buy at stations
    const station = player.location as 1 | 3 | 5;
    if (station !== 1 && station !== 3 && station !== 5) return actions;

    const stacks = state.marketStacks[station];

    // Deficit we want to fix across current or target missions — used to
    // prefer cards whose system matches the gap.
    const deficit = this.getActiveDeficit(state, player);
    if (!stacks) return actions;

    for (let stackIdx = 0; stackIdx < stacks.length; stackIdx++) {
      const stack = stacks[stackIdx];
      if (!stack.revealed || stack.cards.length === 0) continue;

      // Score each card in the stack
      for (let cardIdx = 0; cardIdx < stack.cards.length; cardIdx++) {
        const card = stack.cards[cardIdx];
        if (card.type !== 'action') continue;

        const actionCard = card as ActionCard & { instanceId: string };
        const cost = Math.max(0, actionCard.cost - player.buyDiscount);

        if (player.credits >= cost) {
          const cardValue = this.scoreCardValue(card, player);
          // Boost for deficit-matching: if this card's native system is one
          // we're short on for a mission, it's much more valuable to buy.
          const systemMatch = actionCard.system && (deficit[actionCard.system] ?? 0) > 0 ? 4 : 0;
          const score = (cardValue + systemMatch - cost * 0.5) * this.weights.buyPriority;

          if (score > 0) {
            actions.push({
              action: { type: 'BUY_CARD', stackIndex: stackIdx, cardIndex: cardIdx },
              score,
              reason: `Buy ${card.title} for ${cost} credits`,
            });

            // Also consider buy + install if applicable
            if (actionCard.installCost !== undefined) {
              const installCost = Math.max(0, actionCard.installCost - player.installDiscount);
              const totalCost = cost + installCost;

              if (player.credits >= totalCost) {
                const installBonus = this.scoreInstallValue(actionCard, player, deficit);
                // Same system-match boost, stronger since installs are
                // persistent (they pay off every turn).
                const systemMatchInstall = actionCard.system && (deficit[actionCard.system] ?? 0) > 0 ? 8 : 0;
                const installScore = (cardValue + installBonus + systemMatchInstall - totalCost * 0.5) * this.weights.installPriority;

                if (installScore > score) {
                  // Find best system to install to
                  const bestSystem = this.getBestInstallSystem(actionCard, player);
                  actions.push({
                    action: {
                      type: 'BUY_AND_INSTALL',
                      stackIndex: stackIdx,
                      cardIndex: cardIdx,
                      targetSystem: bestSystem,
                    },
                    score: installScore,
                    reason: `Buy and install ${card.title} to ${bestSystem}`,
                  });
                }
              }
            }
          }
        }
      }
    }

    return actions;
  }

  private scoreSystemAbilities(state: GameState, player: Player): ScoredAction[] {
    const actions: ScoredAction[] = [];

    for (const system of SYSTEMS) {
      const config = SYSTEM_CONFIG[system];

      for (let abilityIdx = 0; abilityIdx < config.abilities.length; abilityIdx++) {
        // Skip if already used this turn
        if (player.usedSystemAbilities[system][abilityIdx]) continue;

        const ability = config.abilities[abilityIdx];
        if (player.currentPower[system] < ability.cost) continue;

        let score = 0;

        switch (ability.effect) {
          case 'draw1':
            score = 2; // Drawing is always useful
            break;
          case 'draw3keep1':
            score = 4; // Better draw
            break;
          case 'move1':
            // Only score movement if we have somewhere useful to go
            score = this.scoreMovingTo(state, player, player.location + 1) * 0.5;
            break;
          case 'gain1Credit':
            score = 1.5 * this.weights.creditValue;
            break;
          case 'trashCard':
            // Score based on whether we have weak cards
            score = this.hasWeakCards(player) ? 3 : 0;
            break;
          case 'giveHazardAtLocation':
            const opponentsHere = state.players.filter(p => p.id !== player.id && p.location === player.location);
            score = opponentsHere.length > 0 ? 3 * this.weights.hazardPriority : 0;
            break;
          case 'giveHazardAnywhere':
            score = state.players.length > 1 ? 4 * this.weights.hazardPriority : 0;
            break;
        }

        if (score > ability.cost) { // Only if benefit outweighs power cost
          actions.push({
            action: { type: 'ACTIVATE_SYSTEM', system, abilityIndex: abilityIdx },
            score: score - ability.cost * 0.5,
            reason: `Use ${system} ability: ${ability.description}`,
          });
        }
      }
    }

    return actions;
  }

  private scoreInstallActions(state: GameState, player: Player): ScoredAction[] {
    const actions: ScoredAction[] = [];

    // Rogue AI Fragment / Corrosive Spores: can't install while active.
    if (
      this.playerHasActiveHazard(player, 'rogue-ai-fragment') ||
      this.playerHasActiveHazard(player, 'corrosive-spores')
    ) {
      return actions;
    }

    const deficit = this.getActiveDeficit(state, player);

    for (const card of player.hand) {
      if (card.type !== 'action') continue;

      const actionCard = card as ActionCard & { instanceId: string };
      if (actionCard.installCost === undefined) continue;

      const cost = Math.max(0, actionCard.installCost - player.installDiscount);
      if (player.credits < cost) continue;

      const installValue = this.scoreInstallValue(actionCard, player, deficit);
      const systemMatch = actionCard.system && (deficit[actionCard.system] ?? 0) > 0 ? 8 : 0;
      const score = (installValue + systemMatch - cost * 0.5) * this.weights.installPriority;

      if (score > 0) {
        const bestSystem = this.getBestInstallSystem(actionCard, player);
        actions.push({
          action: {
            type: 'INSTALL_CARD',
            cardInstanceId: card.instanceId,
            targetSystem: bestSystem,
          },
          score,
          reason: `Install ${card.title} to ${bestSystem}`,
        });
      }
    }

    return actions;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────

  private getMissionAtLocation(state: GameState, location: number): MissionInstance | null {
    const trackMission = state.trackMissions[location];
    if (!trackMission || !trackMission.revealed) return null;
    return trackMission.mission;
  }

  private canCompleteMission(player: Player, mission: MissionInstance): boolean {
    // Corrupted Nav Chip: missions blocked entirely while this is in hand.
    if (this.playerHasActiveHazard(player, 'corrupted-nav-chip')) return false;

    // Warrant Issued: missions cost +2 credits to complete.
    if (this.playerHasActiveHazard(player, 'warrant-issued') && player.credits < 2) {
      return false;
    }

    // Power requirements, distributing missionDiscount as a total-budget credit.
    let discountRemaining = player.missionDiscount ?? 0;
    for (const sys of SYSTEMS) {
      const base = mission.requirements[sys] ?? 0;
      if (base <= 0) continue;
      const discountForThis = Math.min(base, discountRemaining);
      discountRemaining -= discountForThis;
      const required = base - discountForThis;
      if (required > 0 && player.currentPower[sys] < required) {
        return false;
      }
    }
    return true;
  }

  private getMissionCompletionPercent(player: Player, mission: MissionInstance): number {
    let totalRequired = 0;
    let totalHave = 0;

    for (const sys of SYSTEMS) {
      const required = mission.requirements[sys] ?? 0;
      if (required > 0) {
        totalRequired += required;
        totalHave += Math.min(player.currentPower[sys], required);
      }
    }

    return totalRequired > 0 ? totalHave / totalRequired : 1;
  }

  private scoreCardValue(card: CardInstance, _player: Player): number {
    let value = 0;

    if (card.type === 'hazard') {
      return -5; // Hazards are bad
    }

    if (card.type === 'starter') {
      // Starters are worth less as game progresses
      value = 2;
    }

    if (card.type === 'action') {
      const action = card as ActionCard & { instanceId: string };
      value = action.tier * 3; // Higher tier = more valuable

      // Bonus for installable cards
      if (action.installCost !== undefined) {
        value += 2;
      }
    }

    return value;
  }

  private scoreInstallValue(card: ActionCard, player: Player, deficit?: Partial<PowerState>): number {
    if (!card.installData) return 0;

    let value = 0;
    const data = card.installData;

    // Value persistent effects highly (they trigger every turn)
    const turnsRemaining = Math.max(1, 10 - (player.fame / 2)); // Rough estimate

    if (data.power) {
      const totalPower = Object.values(data.power).reduce((sum, v) => sum + (v ?? 0), 0);
      value += totalPower * turnsRemaining * 0.5;
      // Persistent power that matches our mission deficit is worth extra —
      // every turn for the rest of the game, we'll have the power we need.
      if (deficit) {
        value += this.powerMatchBonus(data.power, deficit) * turnsRemaining * 1.0;
      }
    }
    if (data.powerChoice) {
      value += data.powerChoice * turnsRemaining * 0.5;
      // Install-time power-choice can be allocated to the deficit system,
      // then persistently provides that power.
      if (deficit) {
        const totalDeficit = Object.values(deficit).reduce((a, b) => a + (b ?? 0), 0);
        const matchable = Math.min(data.powerChoice, totalDeficit);
        value += matchable * turnsRemaining * 1.0;
      }
    }
    if (data.credits) value += data.credits * turnsRemaining * 0.3;
    if (data.draw) value += data.draw * turnsRemaining * 0.4;
    if (data.moves) value += data.moves * turnsRemaining * 0.3;
    if (data.buyDiscount) value += data.buyDiscount * turnsRemaining * 0.2;
    if (data.installDiscount) value += data.installDiscount * turnsRemaining * 0.2;

    return value;
  }

  private getBestInstallSystem(card: ActionCard, player: Player): SystemType {
    // Prefer the card's native system, or the one with lowest current installation value
    if (card.system) return card.system;

    // Find system with no installation or weakest installation
    for (const sys of SYSTEMS) {
      if (!player.installations[sys]) {
        return sys;
      }
    }

    // All systems have installations - replace the weakest
    let weakestSys: SystemType = 'weapons';
    let weakestValue = Infinity;

    for (const sys of SYSTEMS) {
      const installation = player.installations[sys];
      if (installation) {
        const value = this.scoreCardValue(installation, player);
        if (value < weakestValue) {
          weakestValue = value;
          weakestSys = sys;
        }
      }
    }

    return weakestSys;
  }

  private hasWeakCards(player: Player): boolean {
    // Check if player has starter cards (weak) in hand or discard
    const allCards = [...player.hand, ...player.discard];
    return allCards.some(c => c.type === 'starter');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default AIEngine;
