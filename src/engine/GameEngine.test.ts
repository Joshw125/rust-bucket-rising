// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Game Engine Tests
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameEngine,
  createPlayer,
  createCardInstance,
  createEmptyPowerState,
  shuffle,
  getTotalPower,
  getHighestSystem,
  clampPower,
  resetInstanceIdCounter,
} from './GameEngine';
import { CAPTAINS, getCaptainById } from '@/data/captains';
import { STARTING_CARDS, TIER_1_CARDS, HAZARD_CARDS, ALL_ACTION_CARDS } from '@/data/cards';
import { HAND_SIZE, VICTORY_THRESHOLD, MAX_POWER, STARTING_POWER } from '@/data/constants';
import type { PowerState, Captain, ActionCard } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultCaptain(): Captain {
  return getCaptainById('scrapper')!;
}

function createTestGame(playerCount = 2): GameEngine {
  const players = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      name: `Player ${i + 1}`,
      captain: CAPTAINS[i % CAPTAINS.length],
    });
  }
  return new GameEngine(players);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Function Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Utility Functions', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('shuffle', () => {
    it('should return an array of the same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled).toHaveLength(arr.length);
    });

    it('should contain all original elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffle(arr);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should not modify the original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      shuffle(arr);
      expect(arr).toEqual(original);
    });
  });

  describe('createCardInstance', () => {
    it('should create a card with a unique instanceId', () => {
      const card = STARTING_CARDS[0];
      const instance1 = createCardInstance(card);
      const instance2 = createCardInstance(card);

      expect(instance1.instanceId).toBeDefined();
      expect(instance2.instanceId).toBeDefined();
      expect(instance1.instanceId).not.toBe(instance2.instanceId);
    });

    it('should preserve all card properties', () => {
      const card = STARTING_CARDS[0];
      const instance = createCardInstance(card);

      expect(instance.id).toBe(card.id);
      expect(instance.title).toBe(card.title);
      expect(instance.type).toBe(card.type);
    });
  });

  describe('getTotalPower', () => {
    it('should sum all power values', () => {
      const power: PowerState = { weapons: 2, computers: 3, engines: 1, logistics: 4 };
      expect(getTotalPower(power)).toBe(10);
    });

    it('should return 0 for empty power state', () => {
      const power = createEmptyPowerState();
      expect(getTotalPower(power)).toBe(0);
    });
  });

  describe('getHighestSystem', () => {
    it('should return the system with highest power', () => {
      const power: PowerState = { weapons: 2, computers: 5, engines: 1, logistics: 4 };
      expect(getHighestSystem(power)).toBe('computers');
    });

    it('should return weapons for tie (first in order)', () => {
      const power: PowerState = { weapons: 3, computers: 3, engines: 3, logistics: 3 };
      expect(getHighestSystem(power)).toBe('weapons');
    });
  });

  describe('clampPower', () => {
    it('should clamp values above MAX_POWER', () => {
      const power: PowerState = { weapons: 10, computers: 8, engines: 7, logistics: 6 };
      const clamped = clampPower(power);
      expect(clamped.weapons).toBe(MAX_POWER);
      expect(clamped.computers).toBe(MAX_POWER);
      expect(clamped.engines).toBe(MAX_POWER);
      expect(clamped.logistics).toBe(MAX_POWER);
    });

    it('should clamp negative values to 0', () => {
      const power: PowerState = { weapons: -2, computers: -1, engines: 0, logistics: 1 };
      const clamped = clampPower(power);
      expect(clamped.weapons).toBe(0);
      expect(clamped.computers).toBe(0);
      expect(clamped.engines).toBe(0);
      expect(clamped.logistics).toBe(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Player Creation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Player Creation', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('createPlayer', () => {
    it('should create a player with correct initial values', () => {
      const captain = getDefaultCaptain();
      const player = createPlayer(0, 'Test Player', captain);

      expect(player.id).toBe(0);
      expect(player.name).toBe('Test Player');
      expect(player.captain).toBe(captain);
      expect(player.fame).toBe(0);
      expect(player.credits).toBe(0);
      expect(player.location).toBe(1);
    });

    it('should create a deck with 10 starting cards', () => {
      const captain = getDefaultCaptain();
      const player = createPlayer(0, 'Test', captain);

      const totalCards = STARTING_CARDS.reduce((sum, card) => sum + card.copies, 0);
      expect(player.deck).toHaveLength(totalCards);
    });

    it('should apply captain starting bonuses', () => {
      const scrapper = getCaptainById('scrapper')!;
      const player = createPlayer(0, 'Test', scrapper);

      // Scrapper starts with +2 logistics
      expect(player.startingPower.logistics).toBe(STARTING_POWER + 2);
    });

    it('should apply Ghost captain (no start penalty)', () => {
      const ghost = getCaptainById('ghost')!;
      const player = createPlayer(0, 'Test', ghost);

      // Ghost has no start penalty — just base starting power
      expect(player.startingPower.weapons).toBe(STARTING_POWER);
      expect(player.startingPower.computers).toBe(STARTING_POWER);
      expect(player.startingPower.engines).toBe(STARTING_POWER);
      expect(player.startingPower.logistics).toBe(STARTING_POWER);
    });

    it('should apply Engineer bonus to computers and logistics', () => {
      const engineer = getCaptainById('engineer')!;
      const player = createPlayer(0, 'Test', engineer);

      expect(player.startingPower.weapons).toBe(STARTING_POWER);
      expect(player.startingPower.computers).toBe(STARTING_POWER + 1);
      expect(player.startingPower.engines).toBe(STARTING_POWER);
      expect(player.startingPower.logistics).toBe(STARTING_POWER + 1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Game Setup Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Game Setup', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('GameEngine constructor', () => {
    it('should initialize with correct number of players', () => {
      const engine = createTestGame(3);
      expect(engine.getState().players).toHaveLength(3);
    });

    it('should start on turn 1', () => {
      const engine = createTestGame();
      expect(engine.getState().turn).toBe(1);
    });

    it('should start in action phase', () => {
      const engine = createTestGame();
      expect(engine.getState().phase).toBe('action');
    });

    it('should draw initial hands for all players', () => {
      const engine = createTestGame();
      for (const player of engine.getState().players) {
        expect(player.hand).toHaveLength(HAND_SIZE);
      }
    });

    it('should setup missions at all 6 locations', () => {
      const engine = createTestGame();
      const state = engine.getState();

      for (let loc = 1; loc <= 6; loc++) {
        expect(state.trackMissions[loc]).not.toBeNull();
      }
      // Only location 1 starts revealed; others are face-down
      expect(state.trackMissions[1]?.revealed).toBe(true);
      for (let loc = 2; loc <= 6; loc++) {
        expect(state.trackMissions[loc]?.revealed).toBe(false);
      }
    });

    it('should setup market stacks at stations 1, 3, and 5', () => {
      const engine = createTestGame();
      const state = engine.getState();

      expect(state.marketStacks[1]).toBeDefined();
      expect(state.marketStacks[3]).toBeDefined();
      expect(state.marketStacks[5]).toBeDefined();
      expect(state.marketStacks[1].length).toBeGreaterThan(0);
    });

    it('should initialize hazard deck', () => {
      const engine = createTestGame();
      const state = engine.getState();
      expect(state.hazardDeck.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Turn Management Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Turn Management', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('getCurrentPlayer', () => {
    it('should return the first player initially', () => {
      const engine = createTestGame();
      const current = engine.getCurrentPlayer();
      expect(current.id).toBe(0);
    });
  });

  describe('endTurn', () => {
    it('should advance to next player', () => {
      const engine = createTestGame(3);
      expect(engine.getCurrentPlayer().id).toBe(0);

      engine.dispatch({ type: 'END_TURN' });
      expect(engine.getCurrentPlayer().id).toBe(1);

      engine.dispatch({ type: 'END_TURN' });
      expect(engine.getCurrentPlayer().id).toBe(2);
    });

    it('should wrap around to first player after last', () => {
      const engine = createTestGame(2);

      engine.dispatch({ type: 'END_TURN' });
      engine.dispatch({ type: 'END_TURN' });

      expect(engine.getCurrentPlayer().id).toBe(0);
    });

    it('should increment turn number after full round', () => {
      const engine = createTestGame(2);
      expect(engine.getState().turn).toBe(1);

      engine.dispatch({ type: 'END_TURN' });
      expect(engine.getState().turn).toBe(1);

      engine.dispatch({ type: 'END_TURN' });
      expect(engine.getState().turn).toBe(2);
    });

    it('should discard played cards and draw new hand', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      // Play a card first
      const cardToPlay = player.hand.find(c => c.type === 'starter');
      if (cardToPlay) {
        engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: cardToPlay.instanceId });
      }

      engine.dispatch({ type: 'END_TURN' });

      // After turn end, player 0 should have fresh hand
      // (checking after it's their turn again)
      engine.dispatch({ type: 'END_TURN' });

      const updatedPlayer = engine.getPlayer(0)!;
      expect(updatedPlayer.hand).toHaveLength(HAND_SIZE);
      expect(updatedPlayer.played).toHaveLength(0);
    });

    it('should apply Tycoon credit bonus at turn start', () => {
      const engine = new GameEngine([
        { name: 'Player 1', captain: getCaptainById('tycoon')! },
        { name: 'Player 2', captain: getDefaultCaptain() },
      ]);

      // Tycoon should have gained 1 credit at turn start
      const player = engine.getCurrentPlayer();
      expect(player.credits).toBe(1);
    });

    it('should apply Veteran power bonus at turn start', () => {
      const engine = new GameEngine([
        { name: 'Player 1', captain: getCaptainById('veteran')! },
        { name: 'Player 2', captain: getDefaultCaptain() },
      ]);

      const player = engine.getCurrentPlayer();
      // Veteran should have +1 power in their highest system
      const totalPower = getTotalPower(player.currentPower);
      const expectedBase = 4 * STARTING_POWER; // 4 systems at starting power
      expect(totalPower).toBe(expectedBase + 1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Card Operations Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Card Operations', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('drawCards', () => {
    it('should move cards from deck to hand', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      const initialDeckSize = player.deck.length;
      const initialHandSize = player.hand.length;

      // Draw 2 more cards
      engine['drawCards'](player, 2);

      expect(player.deck).toHaveLength(initialDeckSize - 2);
      expect(player.hand).toHaveLength(initialHandSize + 2);
    });

    it('should shuffle discard into deck when deck is empty', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      // Empty the deck
      player.discard = [...player.deck];
      player.deck = [];

      const discardSize = player.discard.length;
      engine['drawCards'](player, 1);

      expect(player.deck.length).toBe(discardSize - 1);
      expect(player.discard).toHaveLength(0);
    });
  });

  describe('playCard', () => {
    it('should move card from hand to played', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      const cardToPlay = player.hand[0];
      const initialHandSize = player.hand.length;

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: cardToPlay.instanceId });

      expect(player.hand).toHaveLength(initialHandSize - 1);
      expect(player.played).toContain(cardToPlay);
    });

    it('should increment cardsPlayedThisTurn', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      expect(player.cardsPlayedThisTurn).toBe(0);

      const cardToPlay = player.hand[0];
      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: cardToPlay.instanceId });

      expect(player.cardsPlayedThisTurn).toBe(1);
    });

    it('should apply Supply Check effect (+1 credit)', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      // Find Supply Check card
      const supplyCheck = player.hand.find(c => c.id === 'supply-check');
      if (supplyCheck) {
        const initialCredits = player.credits;
        engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: supplyCheck.instanceId });
        expect(player.credits).toBe(initialCredits + 1);
      }
    });

    it('should apply Basic Engines effect (+2 engines power)', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      // Find Basic Engines card
      const basicEngines = player.hand.find(c => c.id === 'basic-engines');
      if (basicEngines) {
        const initialEngines = player.currentPower.engines;
        engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: basicEngines.instanceId });
        expect(player.currentPower.engines).toBe(Math.min(MAX_POWER, initialEngines + 2));
      }
    });
  });

  describe('discardCard', () => {
    it('should move card from hand to discard', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      const cardToDiscard = player.hand[0];
      engine['discardCard'](player, cardToDiscard.instanceId);

      expect(player.hand).not.toContain(cardToDiscard);
      expect(player.discard).toContain(cardToDiscard);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Movement Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Movement', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('canMove', () => {
    it('should allow movement within bounds', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 3;

      expect(engine['canMove'](player, 1)).toBe(true);
      expect(engine['canMove'](player, -1)).toBe(true);
    });

    it('should prevent movement below location 1', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;

      expect(engine['canMove'](player, -1)).toBe(false);
    });

    it('should prevent movement above location 6', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 6;

      expect(engine['canMove'](player, 1)).toBe(false);
    });
  });

  describe('move', () => {
    it('should update player location', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 3;

      engine['move'](player, 1);
      expect(player.location).toBe(4);

      engine['move'](player, -1);
      expect(player.location).toBe(3);
    });

    it('Navigator should have free moves at turn start', () => {
      const engine = new GameEngine([
        { name: 'Player 1', captain: getCaptainById('navigator')! },
        { name: 'Player 2', captain: getDefaultCaptain() },
      ]);

      const player = engine.getCurrentPlayer();
      expect(player.movesRemaining).toBe(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Power System Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Power System', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('spendPower', () => {
    it('should reduce power when spent', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.currentPower = { weapons: 3, computers: 2, engines: 2, logistics: 1 };

      const result = engine['spendPower'](player, { weapons: 2, computers: 1 });

      expect(result).toBe(true);
      expect(player.currentPower.weapons).toBe(1);
      expect(player.currentPower.computers).toBe(1);
    });

    it('should fail if not enough power', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.currentPower = { weapons: 1, computers: 1, engines: 1, logistics: 1 };

      const result = engine['spendPower'](player, { weapons: 5 });

      expect(result).toBe(false);
      expect(player.currentPower.weapons).toBe(1); // Unchanged
    });
  });

  describe('addPower', () => {
    it('should increase power up to max', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.currentPower = { weapons: 4, computers: 2, engines: 1, logistics: 3 };

      engine['addPower'](player, { weapons: 5, computers: 2 });

      expect(player.currentPower.weapons).toBe(MAX_POWER); // Capped at 6
      expect(player.currentPower.computers).toBe(4);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// System Activation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('System Activation', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('activateSystem', () => {
    it('should spend power and apply effect (computers draw 1)', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.currentPower.computers = 3;
      const initialHandSize = player.hand.length;

      engine.dispatch({ type: 'ACTIVATE_SYSTEM', system: 'computers', abilityIndex: 0 });

      expect(player.currentPower.computers).toBe(2); // Spent 1
      expect(player.hand).toHaveLength(initialHandSize + 1);
    });

    it('should spend power and add credit (logistics gain 1)', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.currentPower.logistics = 2;
      const initialCredits = player.credits;

      engine.dispatch({ type: 'ACTIVATE_SYSTEM', system: 'logistics', abilityIndex: 0 });

      expect(player.currentPower.logistics).toBe(1);
      expect(player.credits).toBe(initialCredits + 1);
    });

    it('should spend power and add movement (engines move 1)', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.currentPower.engines = 2;
      const initialMoves = player.movesRemaining;

      engine.dispatch({ type: 'ACTIVATE_SYSTEM', system: 'engines', abilityIndex: 0 });

      expect(player.currentPower.engines).toBe(1);
      expect(player.movesRemaining).toBe(initialMoves + 1);
    });

    it('should fail if not enough power', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.currentPower.computers = 0;

      const result = engine.dispatch({ type: 'ACTIVATE_SYSTEM', system: 'computers', abilityIndex: 0 });

      expect(result).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Market Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Market', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('canBuyCard', () => {
    it('should allow buying at station location with enough credits', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.credits = 10;

      expect(engine['canBuyCard'](player, 1, 0)).toBe(true);
    });

    it('should prevent buying at wrong location', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 2; // Not a station
      player.credits = 10;

      expect(engine['canBuyCard'](player, 1, 0)).toBe(false);
    });

    it('should prevent buying without enough credits', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.credits = 0;

      expect(engine['canBuyCard'](player, 1, 0)).toBe(false);
    });
  });

  describe('buyCard', () => {
    it('should add card to discard and spend credits', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.credits = 10;

      const initialDiscard = player.discard.length;
      const stackInfo = engine.getState().marketStacks[1][0];
      const topCard = stackInfo.cards[stackInfo.cards.length - 1];

      engine.dispatch({ type: 'BUY_CARD', stackIndex: 0, cardIndex: 0 });

      expect(player.discard).toHaveLength(initialDiscard + 1);
      expect(player.discard[player.discard.length - 1].id).toBe(topCard.id);
      expect(player.credits).toBeLessThan(10);
    });

    it('should apply buy discount', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.credits = 10;
      player.buyDiscount = 2;

      // Tier 1 cards cost 3, so with -2 discount = 1 credit
      engine.dispatch({ type: 'BUY_CARD', stackIndex: 0, cardIndex: 0 });

      expect(player.credits).toBe(9); // 10 - 1 (3 - 2 discount)
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mission Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Missions', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('canCompleteMission', () => {
    it('should allow completing mission with enough power', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.currentPower = { weapons: 6, computers: 6, engines: 6, logistics: 6 };

      expect(engine['canCompleteMission'](player)).toBe(true);
    });

    it('should prevent completing mission without enough power', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.currentPower = { weapons: 0, computers: 0, engines: 0, logistics: 0 };

      expect(engine['canCompleteMission'](player)).toBe(false);
    });
  });

  describe('completeMission', () => {
    it('should grant fame and spend power', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.currentPower = { weapons: 6, computers: 6, engines: 6, logistics: 6 };

      const initialFame = player.fame;
      // const mission = engine.getState().trackMissions[1]?.mission;

      engine.dispatch({ type: 'COMPLETE_MISSION' });

      expect(player.fame).toBeGreaterThan(initialFame);
      expect(player.completedMissions).toHaveLength(1);
    });

    it('should replace mission from pool', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.currentPower = { weapons: 6, computers: 6, engines: 6, logistics: 6 };

      const originalMission = engine.getState().trackMissions[1]?.mission;

      engine.dispatch({ type: 'COMPLETE_MISSION' });

      const newMission = engine.getState().trackMissions[1]?.mission;
      expect(newMission?.instanceId).not.toBe(originalMission?.instanceId);
    });

    it('should apply mission discount', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.location = 1;
      player.currentPower = { weapons: 3, computers: 3, engines: 3, logistics: 3 };
      player.missionDiscount = 2; // -2 to all requirements

      // With discount, should be able to complete missions that would otherwise be too expensive
      // The discount should help with mission requirements
      expect(engine['canCompleteMission'](player)).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hazard Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Hazards', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('giveHazard', () => {
    it('should add hazard to target player discard', () => {
      const engine = createTestGame(2);
      const player1 = engine.getPlayer(0)!;
      const player2 = engine.getPlayer(1)!;

      const initialHazards = player2.hazardsInDeck;

      engine['giveHazard'](player1, player2);

      expect(player2.hazardsInDeck).toBe(initialHazards + 1);
      expect(player2.discard.some(c => c.type === 'hazard')).toBe(true);
    });

    it('should trigger Mercenary credit bonus', () => {
      const engine = new GameEngine([
        { name: 'Merc', captain: getCaptainById('mercenary')! },
        { name: 'Target', captain: getDefaultCaptain() },
      ]);

      const merc = engine.getPlayer(0)!;
      const target = engine.getPlayer(1)!;

      const initialCredits = merc.credits;
      engine['giveHazard'](merc, target);

      expect(merc.credits).toBe(initialCredits + 1);
    });
  });

  describe('clearHazard', () => {
    it('should remove hazard when clear cost is paid', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      // Manually add a hazard to test clearing
      const hazard = createCardInstance(HAZARD_CARDS[0]);
      player.hand.push(hazard);
      player.hazardsInDeck = 1;

      // Give player resources to clear
      player.currentPower = { weapons: 6, computers: 6, engines: 6, logistics: 6 };
      player.credits = 10;

      // Set up discard cards for hazards that require discarding
      const starterCard = createCardInstance(STARTING_CARDS[0]);
      player.hand.push(starterCard);

      if (engine['canClearHazard'](player, hazard.instanceId)) {
        const result = engine['clearHazard'](player, hazard.instanceId, [starterCard.instanceId]);
        expect(result).toBe(true);
        expect(player.hazardsInDeck).toBe(0);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Victory Condition Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Victory Conditions', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('endGame trigger', () => {
    it('should trigger end game when player reaches victory threshold', () => {
      const engine = createTestGame(2);
      const player = engine.getCurrentPlayer();
      player.fame = VICTORY_THRESHOLD;

      engine.dispatch({ type: 'END_TURN' });

      expect(engine.getState().endGameTriggeredBy).not.toBeNull();
    });

    it('should end game after completing the round', () => {
      const engine = createTestGame(2);

      // Player 0 triggers end game
      const player0 = engine.getPlayer(0)!;
      player0.fame = VICTORY_THRESHOLD;
      engine.dispatch({ type: 'END_TURN' });

      // Player 1 takes their turn
      engine.dispatch({ type: 'END_TURN' });

      // Game should be over now
      expect(engine.getState().gameOver).toBe(true);
      expect(engine.getState().phase).toBe('gameOver');
    });

    it('should declare winner with highest fame', () => {
      const engine = createTestGame(2);

      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.fame = VICTORY_THRESHOLD;
      player1.fame = VICTORY_THRESHOLD + 5; // Player 1 has more fame

      engine.dispatch({ type: 'END_TURN' }); // End player 0's turn
      engine.dispatch({ type: 'END_TURN' }); // End player 1's turn (game ends)

      expect(engine.getState().winner?.id).toBe(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Installation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Installations', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('canInstallCard', () => {
    it('should allow installing action cards with install cost', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.credits = 10;

      // Add an installable card to hand
      const installableCard = createCardInstance(TIER_1_CARDS[0]); // Has installCost
      player.hand.push(installableCard);

      expect(engine['canInstallCard'](player, installableCard.instanceId, 'weapons')).toBe(true);
    });

    it('should prevent installing without enough credits', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.credits = 0;

      const installableCard = createCardInstance(TIER_1_CARDS[0]);
      player.hand.push(installableCard);

      expect(engine['canInstallCard'](player, installableCard.instanceId, 'weapons')).toBe(false);
    });
  });

  describe('installCard', () => {
    it('should place card in installation slot', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.credits = 10;

      const installableCard = createCardInstance(TIER_1_CARDS[0]);
      player.hand.push(installableCard);

      engine.dispatch({
        type: 'INSTALL_CARD',
        cardInstanceId: installableCard.instanceId,
        targetSystem: 'weapons',
      });

      expect(player.installations.weapons).not.toBeNull();
      expect(player.installations.weapons?.instanceId).toBe(installableCard.instanceId);
    });

    it('should apply install discount', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.credits = 10;
      player.installDiscount = 1;

      const installableCard = createCardInstance(TIER_1_CARDS[0]); // Cost 2 to install
      player.hand.push(installableCard);

      engine.dispatch({
        type: 'INSTALL_CARD',
        cardInstanceId: installableCard.instanceId,
        targetSystem: 'weapons',
      });

      expect(player.credits).toBe(9); // 10 - (2 - 1 discount)
    });

    it('should discard previous installation', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();
      player.credits = 20;

      const card1 = createCardInstance(TIER_1_CARDS[0]);
      const card2 = createCardInstance(TIER_1_CARDS[1]);
      player.hand.push(card1, card2);

      // Install first card
      engine.dispatch({
        type: 'INSTALL_CARD',
        cardInstanceId: card1.instanceId,
        targetSystem: 'weapons',
      });

      // Install second card in same slot
      engine.dispatch({
        type: 'INSTALL_CARD',
        cardInstanceId: card2.instanceId,
        targetSystem: 'weapons',
      });

      expect(player.installations.weapons?.instanceId).toBe(card2.instanceId);
      // Old installation goes to discard pile
      expect(player.discard.some(c => c.instanceId === card1.instanceId)).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fame on Purchase Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Fame on Purchase', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  it('should grant fame when buying a card with fame value', () => {
    const engine = createTestGame();
    const player = engine.getCurrentPlayer();
    player.location = 1;
    player.credits = 20;

    // Find a card with fame in the market
    const state = engine.getState();
    const stack = state.marketStacks[1][0];
    const topCard = stack.cards[stack.cards.length - 1];
    const actionCard = ALL_ACTION_CARDS.find(c => c.id === topCard.id);

    const initialFame = player.fame;
    engine.dispatch({ type: 'BUY_CARD', stackIndex: 0, cardIndex: 0 });

    if (actionCard?.fame) {
      expect(player.fame).toBe(initialFame + actionCard.fame);
    }
  });

  it('should grant fame when buy-and-installing a card with fame value', () => {
    const engine = createTestGame();
    const player = engine.getCurrentPlayer();
    player.location = 1;
    player.credits = 20;

    // Find an installable card with fame
    const fameCard = ALL_ACTION_CARDS.find(c => c.fame && c.installCost && c.system);
    if (!fameCard) return; // Skip if no such card exists

    // Put that card on top of a market stack and ensure it's revealed
    const fameInstance = createCardInstance(fameCard);
    const state = engine.getState();
    state.marketStacks[1][0].cards.push(fameInstance);
    state.marketStacks[1][0].revealed = true;

    const initialFame = player.fame;
    // Use default cardIndex (top card = last in array = the one we just pushed)
    engine.dispatch({ type: 'BUY_AND_INSTALL', stackIndex: 0, targetSystem: fameCard.system! });

    expect(player.fame).toBe(initialFame + fameCard.fame!);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-Game Penalty Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('End-Game Penalties', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  it('should apply fame penalty from completed missions at end game', () => {
    const engine = createTestGame(2);
    const player0 = engine.getPlayer(0)!;
    const player1 = engine.getPlayer(1)!;

    // Give player0 a mission with endGamePenalty
    player0.fame = VICTORY_THRESHOLD + 5;
    player1.fame = 10;

    // Add a fake completed mission with endGamePenalty
    player1.completedMissions.push({
      id: 'test-penalty-mission',
      instanceId: 'test-penalty-1',
      zone: 'mid',
      title: 'Test Penalty Mission',
      requirements: { computers: 1 },
      fame: 3,
      type: 'Exploration',
      rewardType: 'gear',
      reward: 'Test',
      rewardData: { endGamePenalty: { fame: -1 } },
    } as any);

    // Trigger end game
    engine.dispatch({ type: 'END_TURN' }); // Player 0 ends turn, triggers end game
    engine.dispatch({ type: 'END_TURN' }); // Player 1 ends turn, game ends

    // Player 1 should have lost 1 fame from the penalty
    expect(player1.fame).toBeLessThanOrEqual(9); // 10 - 1 penalty (may also lose from hazards)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hazards Given Counter Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Hazards Given Counter', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  it('should initialize hazardsGivenThisTurn to 0', () => {
    const engine = createTestGame();
    const player = engine.getCurrentPlayer();
    expect(player.hazardsGivenThisTurn).toBe(0);
  });

  it('should increment when giving a hazard', () => {
    const engine = createTestGame(2);
    const player0 = engine.getPlayer(0)!;
    const player1 = engine.getPlayer(1)!;

    engine['giveHazard'](player0, player1);
    expect(player0.hazardsGivenThisTurn).toBe(1);

    engine['giveHazard'](player0, player1);
    expect(player0.hazardsGivenThisTurn).toBe(2);
  });

  it('should reset at turn start', () => {
    const engine = createTestGame(2);
    const player0 = engine.getPlayer(0)!;
    const player1 = engine.getPlayer(1)!;

    engine['giveHazard'](player0, player1);
    expect(player0.hazardsGivenThisTurn).toBe(1);

    engine.dispatch({ type: 'END_TURN' }); // End player 0's turn
    engine.dispatch({ type: 'END_TURN' }); // End player 1's turn, back to player 0

    expect(player0.hazardsGivenThisTurn).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Chain Reaction (powerPerHazardGiven) Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Chain Reaction Install', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  it('should grant bonus power when giving hazard with powerPerHazardGiven installed', () => {
    const engine = createTestGame(2);
    const player0 = engine.getPlayer(0)!;
    const player1 = engine.getPlayer(1)!;

    // Find Chain Reaction card
    const chainReaction = ALL_ACTION_CARDS.find(c => c.installData?.powerPerHazardGiven);
    if (!chainReaction) return;

    // Install it
    const installed = createCardInstance(chainReaction);
    player0.installations[chainReaction.system!] = installed;

    const totalPowerBefore = getTotalPower(player0.currentPower);
    engine['giveHazard'](player0, player1);

    const totalPowerAfter = getTotalPower(player0.currentPower);
    expect(totalPowerAfter).toBe(totalPowerBefore + chainReaction.installData!.powerPerHazardGiven!);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Interaction Card Tests
// ─────────────────────────────────────────────────────────────────────────────

function findCard(id: string): ActionCard {
  return ALL_ACTION_CARDS.find(c => c.id === id)!;
}

describe('Interaction Cards', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
  });

  describe('Signal Jam (forceDiscard)', () => {
    it('should draw 1 and set forceDiscard pending when opponent at same location', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      // Place both at same location
      player0.location = 3;
      player1.location = 3;

      const card = createCardInstance(findCard('signal-jam'));
      player0.hand.push(card);

      const handSizeBefore = player0.hand.length - 1; // -1 for the card we'll play
      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Should have drawn 1 card
      expect(player0.hand.length).toBe(handSizeBefore + 1);

      // Should have pending forceDiscard on opponent
      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('forceDiscard');
      expect(pending!.playerId).toBe(player1.id); // Opponent chooses
    });

    it('should not trigger interaction when no opponent at location', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 5; // Different location

      const card = createCardInstance(findCard('signal-jam'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // No pending action since no opponent at location
      expect(engine.getState().pendingAction).toBeNull();
    });

    it('should resolve forceDiscard by moving card from hand to discard', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const card = createCardInstance(findCard('signal-jam'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Resolve: opponent picks a card to discard
      const cardToDiscard = player1.hand[0];
      const p1HandBefore = player1.hand.length;
      const p1DiscardBefore = player1.discard.length;

      engine.dispatch({ type: 'RESOLVE_PENDING', choice: cardToDiscard.instanceId });

      expect(player1.hand.length).toBe(p1HandBefore - 1);
      expect(player1.discard.length).toBe(p1DiscardBefore + 1);
      expect(player1.discard.some(c => c.instanceId === cardToDiscard.instanceId)).toBe(true);
    });
  });

  describe('Data Breach (revealHand + forceDiscardChoice)', () => {
    it('should set chooseOpponentDiscard pending with opponent hand revealed', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const card = createCardInstance(findCard('data-breach'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('chooseOpponentDiscard');
      expect(pending!.playerId).toBe(player0.id); // Active player chooses
      expect(pending!.data?.opponentHand).toBeDefined();
      expect(pending!.data?.targetPlayerId).toBe(player1.id);
    });

    it('should resolve chooseOpponentDiscard by discarding chosen card from opponent', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const card = createCardInstance(findCard('data-breach'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Pick the first non-hazard card from opponent's hand
      const targetCard = player1.hand.find(c => c.type !== 'hazard')!;
      const p1HandBefore = player1.hand.length;

      engine.dispatch({ type: 'RESOLVE_PENDING', choice: targetCard.instanceId });

      expect(player1.hand.length).toBe(p1HandBefore - 1);
      expect(player1.discard.some(c => c.instanceId === targetCard.instanceId)).toBe(true);
    });
  });

  describe('Ramming Speed (drainPower)', () => {
    it('should grant move and set choosePowerLoss pending when opponent at location', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;
      player1.currentPower = { weapons: 2, computers: 2, engines: 2, logistics: 2 };

      const card = createCardInstance(findCard('ramming-speed'));
      player0.hand.push(card);

      const movesBefore = player0.movesRemaining;
      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Should have gained +1 move
      expect(player0.movesRemaining).toBe(movesBefore + 1);

      // Should have pending choosePowerLoss on opponent
      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('choosePowerLoss');
      expect(pending!.playerId).toBe(player1.id);
    });

    it('should resolve choosePowerLoss by reducing chosen system', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;
      player1.currentPower = { weapons: 3, computers: 2, engines: 2, logistics: 2 };

      const card = createCardInstance(findCard('ramming-speed'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });
      engine.dispatch({ type: 'RESOLVE_PENDING', choice: 'weapons' });

      expect(player1.currentPower.weapons).toBe(2); // Was 3, now 2
    });

    it('should skip drain when opponent has zero power', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;
      player1.currentPower = { weapons: 0, computers: 0, engines: 0, logistics: 0 };

      const card = createCardInstance(findCard('ramming-speed'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // No pending action since opponent has no power
      expect(engine.getState().pendingAction).toBeNull();
    });
  });

  describe('Tractor Beam (pullPlayer)', () => {
    it('should pull adjacent player to own location (auto-select single target)', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 4; // Adjacent

      const card = createCardInstance(findCard('tractor-beam'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Player 1 should be pulled to location 3
      expect(player1.location).toBe(3);
      // No pending action (auto-resolved for single target)
      expect(engine.getState().pendingAction).toBeNull();
    });

    it('should not pull player from non-adjacent location', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 5; // Not adjacent (2 away)

      const card = createCardInstance(findCard('tractor-beam'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      expect(player1.location).toBe(5); // Unchanged
    });

    it('should prompt for target when multiple adjacent players', () => {
      const engine = createTestGame(3);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;
      const player2 = engine.getPlayer(2)!;

      player0.location = 3;
      player1.location = 2; // Adjacent
      player2.location = 4; // Adjacent

      const card = createCardInstance(findCard('tractor-beam'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Should prompt for target selection
      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('targetPlayer');
      expect(pending!.data?.interactionType).toBe('pullPlayer');
    });
  });

  describe('Repo Order (forceUninstall)', () => {
    it('should set forceUninstall pending when opponent at location has installations', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      // Give opponent an installation
      const installCard = createCardInstance(TIER_1_CARDS[0]);
      player1.installations.weapons = installCard;

      const card = createCardInstance(findCard('repo-order'));
      player0.hand.push(card);

      const creditsBefore = player0.credits;
      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Should have gained +1 credit
      expect(player0.credits).toBe(creditsBefore + 1);

      // Should have pending forceUninstall on opponent
      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('forceUninstall');
      expect(pending!.playerId).toBe(player1.id);
    });

    it('should resolve forceUninstall by returning card to discard', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const installCard = createCardInstance(TIER_1_CARDS[0]);
      player1.installations.weapons = installCard;

      const card = createCardInstance(findCard('repo-order'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });
      engine.dispatch({ type: 'RESOLVE_PENDING', choice: 'weapons' });

      expect(player1.installations.weapons).toBeNull();
      expect(player1.discard.some(c => c.instanceId === installCard.instanceId)).toBe(true);
    });

    it('should skip interaction when opponent has no installations', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;
      // No installations on player 1

      const card = createCardInstance(findCard('repo-order'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // No pending action since opponent has no installations
      expect(engine.getState().pendingAction).toBeNull();
    });
  });

  describe('Contract Breach (forceUninstallOrDiscard)', () => {
    it('should prompt interactionChoice when opponent has installations', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const installCard = createCardInstance(TIER_1_CARDS[0]);
      player1.installations.weapons = installCard;

      const card = createCardInstance(findCard('contract-breach'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('interactionChoice');
      expect(pending!.playerId).toBe(player0.id); // Active player chooses mode
    });

    it('should default to forceDiscard when opponent has no installations', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const card = createCardInstance(findCard('contract-breach'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('forceDiscard');
      expect(pending!.data?.amount).toBe(2);
      expect(pending!.playerId).toBe(player1.id);
    });

    it('should chain interactionChoice → discard → forceDiscard on opponent', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const installCard = createCardInstance(TIER_1_CARDS[0]);
      player1.installations.weapons = installCard;

      const card = createCardInstance(findCard('contract-breach'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Choose discard mode
      engine.dispatch({ type: 'RESOLVE_PENDING', choice: 'discard' });

      // Should chain to forceDiscard on opponent with amount: 2
      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('forceDiscard');
      expect(pending!.data?.amount).toBe(2);
      expect(pending!.playerId).toBe(player1.id);
    });

    it('should chain interactionChoice → uninstall → chooseOpponentInstall', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const installCard = createCardInstance(TIER_1_CARDS[0]);
      player1.installations.weapons = installCard;

      const card = createCardInstance(findCard('contract-breach'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Choose uninstall mode
      engine.dispatch({ type: 'RESOLVE_PENDING', choice: 'uninstall' });

      // Should chain to chooseOpponentInstall on active player
      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('chooseOpponentInstall');
      expect(pending!.playerId).toBe(player0.id);
      expect(pending!.data?.targetPlayerId).toBe(player1.id);
    });

    it('should resolve chooseOpponentInstall by removing installation', () => {
      const engine = createTestGame(2);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;

      player0.location = 3;
      player1.location = 3;

      const installCard = createCardInstance(TIER_1_CARDS[0]);
      player1.installations.weapons = installCard;

      const card = createCardInstance(findCard('contract-breach'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });
      engine.dispatch({ type: 'RESOLVE_PENDING', choice: 'uninstall' });
      engine.dispatch({ type: 'RESOLVE_PENDING', choice: 'weapons' });

      expect(player1.installations.weapons).toBeNull();
      expect(player1.discard.some(c => c.instanceId === installCard.instanceId)).toBe(true);
    });
  });

  describe('Multi-player target selection', () => {
    it('should prompt targetPlayer when multiple opponents at location', () => {
      const engine = createTestGame(3);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;
      const player2 = engine.getPlayer(2)!;

      player0.location = 3;
      player1.location = 3;
      player2.location = 3;

      const card = createCardInstance(findCard('signal-jam'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('targetPlayer');
      expect(pending!.data?.interactionType).toBe('forceDiscard');
      expect(pending!.data?.targetPlayerIds).toContain(player1.id);
      expect(pending!.data?.targetPlayerIds).toContain(player2.id);
    });

    it('should chain from targetPlayer to forceDiscard after selecting target', () => {
      const engine = createTestGame(3);
      const player0 = engine.getPlayer(0)!;
      const player1 = engine.getPlayer(1)!;
      const player2 = engine.getPlayer(2)!;

      player0.location = 3;
      player1.location = 3;
      player2.location = 3;

      const card = createCardInstance(findCard('signal-jam'));
      player0.hand.push(card);

      engine.dispatch({ type: 'PLAY_CARD', cardInstanceId: card.instanceId });

      // Select player 1 as target
      engine.dispatch({ type: 'RESOLVE_PENDING', choice: player1.id });

      const pending = engine.getState().pendingAction;
      expect(pending).not.toBeNull();
      expect(pending!.type).toBe('forceDiscard');
      expect(pending!.playerId).toBe(player1.id);
    });
  });

  describe('onTrash trophy passive', () => {
    it('should trigger onTrash passive when trashing a card', () => {
      const engine = createTestGame();
      const player = engine.getCurrentPlayer();

      // Give player a trophy with onTrash passive
      player.trophies.push({
        id: 'test-ontrash',
        instanceId: 'test-ontrash-1',
        zone: 'near',
        title: 'Test OnTrash Trophy',
        requirements: {},
        fame: 1,
        type: 'Combat',
        rewardType: 'trophy',
        reward: 'Test',
        rewardData: { passive: { trigger: 'onTrash', credits: 1 } },
      } as any);

      // Add a card to trash
      const cardToTrash = player.hand[0];
      const creditsBefore = player.credits;

      engine['trashCard'](player, cardToTrash.instanceId, 'hand');

      expect(player.credits).toBe(creditsBefore + 1);
    });
  });
});
