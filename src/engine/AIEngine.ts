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
} from '@/types';

import { SYSTEMS, SYSTEM_CONFIG } from '@/data/constants';

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
        // Choose a target for hazard
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

      case 'missionRewardChoice':
        // Choose the better reward option
        return this.chooseMissionReward(pending.data?.mission);

      default:
        // Unknown pending action, try to resolve it
        return { type: 'RESOLVE_PENDING', choice: null };
    }
  }

  private chooseHazardTarget(state: GameState, player: Player): GameAction {
    // Find the player with the highest fame (most threatening)
    const opponents = state.players.filter(p => p.id !== player.id);

    // Check if this is location-restricted
    const isLocationRestricted = state.pendingAction?.data?.source === 'giveHazardAtLocation';
    const validTargets = isLocationRestricted
      ? opponents.filter(p => p.location === player.location)
      : opponents;

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

    if (card.type === 'starter') {
      const starter = card as CardInstance & { effectData?: { credits?: number; power?: Partial<PowerState>; powerChoice?: number } };
      if (starter.effectData?.credits) {
        score += starter.effectData.credits * 2 * this.weights.creditValue;
      }
      if (starter.effectData?.power) {
        const totalPower = Object.values(starter.effectData.power).reduce((sum, v) => sum + (v ?? 0), 0);
        score += totalPower * powerMultiplier * this.weights.powerValue;
      }
      if (starter.effectData?.powerChoice) {
        score += starter.effectData.powerChoice * powerMultiplier * this.weights.powerValue;
      }
    }

    if (card.type === 'action') {
      const action = card as ActionCard & { instanceId: string };
      const data = action.effectData;
      if (data) {
        if (data.credits) score += data.credits * 2 * this.weights.creditValue;
        if (data.powerChoice) score += data.powerChoice * powerMultiplier * this.weights.powerValue;
        if (data.power) {
          const totalPower = Object.values(data.power).reduce((sum, v) => sum + (v ?? 0), 0);
          score += totalPower * powerMultiplier * this.weights.powerValue;
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
          const score = (cardValue - cost * 0.5) * this.weights.buyPriority;

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
                const installBonus = this.scoreInstallValue(actionCard, player);
                const installScore = (cardValue + installBonus - totalCost * 0.5) * this.weights.installPriority;

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

  private scoreInstallActions(_state: GameState, player: Player): ScoredAction[] {
    const actions: ScoredAction[] = [];

    for (const card of player.hand) {
      if (card.type !== 'action') continue;

      const actionCard = card as ActionCard & { instanceId: string };
      if (actionCard.installCost === undefined) continue;

      const cost = Math.max(0, actionCard.installCost - player.installDiscount);
      if (player.credits < cost) continue;

      const installValue = this.scoreInstallValue(actionCard, player);
      const score = (installValue - cost * 0.5) * this.weights.installPriority;

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
    for (const sys of SYSTEMS) {
      const required = mission.requirements[sys] ?? 0;
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

  private scoreInstallValue(card: ActionCard, player: Player): number {
    if (!card.installData) return 0;

    let value = 0;
    const data = card.installData;

    // Value persistent effects highly (they trigger every turn)
    const turnsRemaining = Math.max(1, 10 - (player.fame / 2)); // Rough estimate

    if (data.power) {
      const totalPower = Object.values(data.power).reduce((sum, v) => sum + (v ?? 0), 0);
      value += totalPower * turnsRemaining * 0.5;
    }
    if (data.powerChoice) value += data.powerChoice * turnsRemaining * 0.5;
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
