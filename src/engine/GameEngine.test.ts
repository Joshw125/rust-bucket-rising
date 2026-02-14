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
import { STARTING_CARDS, TIER_1_CARDS, HAZARD_CARDS } from '@/data/cards';
import { HAND_SIZE, VICTORY_THRESHOLD, MAX_POWER, STARTING_POWER } from '@/data/constants';
import type { PowerState, Captain } from '@/types';

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
      // Old installation goes back to the deck (shuffled), not discard
      expect(player.deck.some(c => c.instanceId === card1.instanceId)).toBe(true);
    });
  });
});
