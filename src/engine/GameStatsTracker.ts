// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Game Stats Tracker
// Per-player per-turn stat tracking for balance analysis
// ═══════════════════════════════════════════════════════════════════════════════

import type { Player, SystemType, PowerState } from '@/types';

const SYSTEMS: SystemType[] = ['weapons', 'computers', 'engines', 'logistics'];

// ─────────────────────────────────────────────────────────────────────────────
// Per-Turn Stats (accumulated for one player during one turn)
// ─────────────────────────────────────────────────────────────────────────────

export interface TurnStats {
  turn: number;
  playerId: number;

  // Economy
  creditsGained: number;
  creditsSpent: number;
  powerGained: number;
  powerSpent: number;

  // Actions
  cardsPlayed: number;
  cardsBought: number;
  cardsBoughtNames: string[];
  cardsInstalled: number;
  cardsDrawn: number;
  cardsTrashed: number;
  hazardsGiven: number;
  hazardsReceived: number;
  hazardsCleared: number;
  missionsCompleted: number;
  missionsCompletedNames: string[];
  systemActivations: number;

  // Movement
  spacesMoved: number;
  locationAtEnd: number;

  // State snapshot at turn end
  fameAtEnd: number;
  deckSize: number;
  hazardsInDeck: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Game Summary (aggregated across all turns for one player)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerGameSummary {
  playerId: number;
  playerName: string;
  captainId: string;

  // Per-turn arrays (for curve analysis)
  fameOverTime: number[];
  creditsGainedPerTurn: number[];
  creditsSpentPerTurn: number[];
  powerGainedPerTurn: number[];
  powerSpentPerTurn: number[];

  // Totals
  totalCreditsGained: number;
  totalCreditsSpent: number;
  totalPowerGained: number;
  totalPowerSpent: number;
  totalCardsPlayed: number;
  totalCardsBought: number;
  totalCardsInstalled: number;
  totalCardsDrawn: number;
  totalCardsTrashed: number;
  totalHazardsGiven: number;
  totalHazardsReceived: number;
  totalHazardsCleared: number;
  totalMissionsCompleted: number;
  totalSystemActivations: number;
  totalSpacesMoved: number;

  // Averages
  avgCreditsGainedPerTurn: number;
  avgCreditsSpentPerTurn: number;
  avgPowerGainedPerTurn: number;
  avgPowerSpentPerTurn: number;

  // Card & mission popularity
  cardsBoughtByName: Record<string, number>;
  missionsCompletedByName: Record<string, number>;

  // Tempo milestones (turn number, or null if never happened)
  turnOfFirstPurchase: number | null;
  turnOfFirstInstall: number | null;
  turnOfFirstMission: number | null;

  // Final state
  finalFame: number;
  finalDeckComposition: Record<string, number>;
  finalHazardsInDeck: number;
  totalTurns: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Tracker Class
// ─────────────────────────────────────────────────────────────────────────────

export class GameStatsTracker {
  private turnStats: Map<number, TurnStats> = new Map();
  private allTurnStats: Map<number, TurnStats[]> = new Map();
  private turnStartSnapshots: Map<number, { credits: number; power: PowerState }> = new Map();

  // ─── Lifecycle hooks (called by GameEngine) ────────────────────────────

  onTurnStart(player: Player, turn: number): void {
    const playerId = player.id;

    if (!this.allTurnStats.has(playerId)) {
      this.allTurnStats.set(playerId, []);
    }

    this.turnStats.set(playerId, {
      turn,
      playerId,
      creditsGained: 0,
      creditsSpent: 0,
      powerGained: 0,
      powerSpent: 0,
      cardsPlayed: 0,
      cardsBought: 0,
      cardsBoughtNames: [],
      cardsInstalled: 0,
      cardsDrawn: 0,
      cardsTrashed: 0,
      hazardsGiven: 0,
      hazardsReceived: 0,
      hazardsCleared: 0,
      missionsCompleted: 0,
      missionsCompletedNames: [],
      systemActivations: 0,
      spacesMoved: 0,
      locationAtEnd: player.location,
      fameAtEnd: player.fame,
      deckSize: 0,
      hazardsInDeck: 0,
    });

    // Snapshot for economy diff calculation
    this.turnStartSnapshots.set(playerId, {
      credits: player.credits, // should be 0 after turn reset
      power: { ...player.currentPower }, // starting power for this turn
    });
  }

  onTurnEnd(player: Player): void {
    const stats = this.turnStats.get(player.id);
    if (!stats) return;

    const snapshot = this.turnStartSnapshots.get(player.id);

    // Credits gained = credits remaining + credits spent (since credits start at 0)
    stats.creditsGained = player.credits + stats.creditsSpent;

    // Power gained = (current power + power spent) - starting power
    if (snapshot) {
      const startTotal = SYSTEMS.reduce((sum, s) => sum + snapshot.power[s], 0);
      const endTotal = SYSTEMS.reduce((sum, s) => sum + player.currentPower[s], 0);
      stats.powerGained = Math.max(0, (endTotal + stats.powerSpent) - startTotal);
    }

    // Use engine's existing turn trackers
    stats.spacesMoved = player.movesThisTurn;
    stats.cardsPlayed = player.cardsPlayedThisTurn;

    // End-of-turn state snapshot
    stats.locationAtEnd = player.location;
    stats.fameAtEnd = player.fame;
    stats.hazardsInDeck = player.hazardsInDeck;

    // Deck size = all cards the player owns
    const allCards = [...player.deck, ...player.hand, ...player.discard, ...player.played];
    stats.deckSize = allCards.length +
      Object.values(player.installations).filter(Boolean).length;

    // Save completed turn stats
    this.allTurnStats.get(player.id)!.push({ ...stats });
  }

  // ─── Action counters ──────────────────────────────────────────────────

  onCardBought(playerId: number, cardTitle: string): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.cardsBought++;
    stats.cardsBoughtNames.push(cardTitle);
  }

  onCardInstalled(playerId: number): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.cardsInstalled++;
  }

  onCardDrawn(playerId: number, count: number): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.cardsDrawn += count;
  }

  onCardTrashed(playerId: number): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.cardsTrashed++;
  }

  onHazardGiven(fromPlayerId: number, toPlayerId: number): void {
    const fromStats = this.turnStats.get(fromPlayerId);
    if (fromStats) fromStats.hazardsGiven++;

    const toStats = this.turnStats.get(toPlayerId);
    if (toStats) toStats.hazardsReceived++;
  }

  onHazardCleared(playerId: number): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.hazardsCleared++;
  }

  onMissionCompleted(playerId: number, missionTitle: string): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.missionsCompleted++;
    stats.missionsCompletedNames.push(missionTitle);
  }

  onSystemActivated(playerId: number): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.systemActivations++;
  }

  // ─── Economy accumulators ─────────────────────────────────────────────

  onCreditSpent(playerId: number, amount: number): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.creditsSpent += amount;
  }

  onPowerSpent(playerId: number, amount: number): void {
    const stats = this.turnStats.get(playerId);
    if (!stats) return;
    stats.powerSpent += amount;
  }

  // ─── Summary generation ───────────────────────────────────────────────

  generatePlayerSummary(player: Player): PlayerGameSummary {
    const turns = this.allTurnStats.get(player.id) ?? [];
    const totalTurns = turns.length;

    // Aggregate totals
    let totalCreditsGained = 0;
    let totalCreditsSpent = 0;
    let totalPowerGained = 0;
    let totalPowerSpent = 0;
    let totalCardsPlayed = 0;
    let totalCardsBought = 0;
    let totalCardsInstalled = 0;
    let totalCardsDrawn = 0;
    let totalCardsTrashed = 0;
    let totalHazardsGiven = 0;
    let totalHazardsReceived = 0;
    let totalHazardsCleared = 0;
    let totalMissionsCompleted = 0;
    let totalSystemActivations = 0;
    let totalSpacesMoved = 0;

    const fameOverTime: number[] = [];
    const creditsGainedPerTurn: number[] = [];
    const creditsSpentPerTurn: number[] = [];
    const powerGainedPerTurn: number[] = [];
    const powerSpentPerTurn: number[] = [];

    const cardsBoughtByName: Record<string, number> = {};
    const missionsCompletedByName: Record<string, number> = {};

    let turnOfFirstPurchase: number | null = null;
    let turnOfFirstInstall: number | null = null;
    let turnOfFirstMission: number | null = null;

    for (const t of turns) {
      totalCreditsGained += t.creditsGained;
      totalCreditsSpent += t.creditsSpent;
      totalPowerGained += t.powerGained;
      totalPowerSpent += t.powerSpent;
      totalCardsPlayed += t.cardsPlayed;
      totalCardsBought += t.cardsBought;
      totalCardsInstalled += t.cardsInstalled;
      totalCardsDrawn += t.cardsDrawn;
      totalCardsTrashed += t.cardsTrashed;
      totalHazardsGiven += t.hazardsGiven;
      totalHazardsReceived += t.hazardsReceived;
      totalHazardsCleared += t.hazardsCleared;
      totalMissionsCompleted += t.missionsCompleted;
      totalSystemActivations += t.systemActivations;
      totalSpacesMoved += t.spacesMoved;

      fameOverTime.push(t.fameAtEnd);
      creditsGainedPerTurn.push(t.creditsGained);
      creditsSpentPerTurn.push(t.creditsSpent);
      powerGainedPerTurn.push(t.powerGained);
      powerSpentPerTurn.push(t.powerSpent);

      for (const name of t.cardsBoughtNames) {
        cardsBoughtByName[name] = (cardsBoughtByName[name] ?? 0) + 1;
      }
      for (const name of t.missionsCompletedNames) {
        missionsCompletedByName[name] = (missionsCompletedByName[name] ?? 0) + 1;
      }

      if (t.cardsBought > 0 && turnOfFirstPurchase === null) {
        turnOfFirstPurchase = t.turn;
      }
      if (t.cardsInstalled > 0 && turnOfFirstInstall === null) {
        turnOfFirstInstall = t.turn;
      }
      if (t.missionsCompleted > 0 && turnOfFirstMission === null) {
        turnOfFirstMission = t.turn;
      }
    }

    // Final deck composition
    const finalDeckComposition: Record<string, number> = {};
    const allCards = [...player.deck, ...player.hand, ...player.discard, ...player.played];
    for (const card of allCards) {
      finalDeckComposition[card.title] = (finalDeckComposition[card.title] ?? 0) + 1;
    }
    for (const sys of SYSTEMS) {
      const installed = player.installations[sys];
      if (installed) {
        finalDeckComposition[installed.title] = (finalDeckComposition[installed.title] ?? 0) + 1;
      }
    }

    return {
      playerId: player.id,
      playerName: player.name,
      captainId: player.captain.id,

      fameOverTime,
      creditsGainedPerTurn,
      creditsSpentPerTurn,
      powerGainedPerTurn,
      powerSpentPerTurn,

      totalCreditsGained,
      totalCreditsSpent,
      totalPowerGained,
      totalPowerSpent,
      totalCardsPlayed,
      totalCardsBought,
      totalCardsInstalled,
      totalCardsDrawn,
      totalCardsTrashed,
      totalHazardsGiven,
      totalHazardsReceived,
      totalHazardsCleared,
      totalMissionsCompleted,
      totalSystemActivations,
      totalSpacesMoved,

      avgCreditsGainedPerTurn: totalTurns > 0 ? totalCreditsGained / totalTurns : 0,
      avgCreditsSpentPerTurn: totalTurns > 0 ? totalCreditsSpent / totalTurns : 0,
      avgPowerGainedPerTurn: totalTurns > 0 ? totalPowerGained / totalTurns : 0,
      avgPowerSpentPerTurn: totalTurns > 0 ? totalPowerSpent / totalTurns : 0,

      cardsBoughtByName,
      missionsCompletedByName,

      turnOfFirstPurchase,
      turnOfFirstInstall,
      turnOfFirstMission,

      finalFame: player.fame,
      finalDeckComposition,
      finalHazardsInDeck: player.hazardsInDeck,
      totalTurns,
    };
  }

  generateAllSummaries(players: Player[]): PlayerGameSummary[] {
    return players.map(p => this.generatePlayerSummary(p));
  }
}
