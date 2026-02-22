// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Simulation Runner
// Automated game simulation for balance testing
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Captain,
  AIStrategy,
  SimulationConfig,
  SimulationResults,
  EconomyStats,
} from '@/types';

import { GameEngine } from './GameEngine';
import { AIEngine } from './AIEngine';
import type { PlayerGameSummary } from './GameStatsTracker';
import { CAPTAINS } from '@/data/captains';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GameResult {
  winnerId: number;
  winnerName: string;
  winnerCaptain: string;
  winnerStrategy: AIStrategy;
  winnerFame: number;
  turns: number;
  finalScores: Array<{ name: string; fame: number; captain: string; strategy: AIStrategy }>;
  playerSummaries: PlayerGameSummary[];
}

interface StrategyStats {
  wins: number;
  games: number;
  totalFame: number;
  avgTurns: number;
}

interface CaptainStats {
  wins: number;
  games: number;
  totalFame: number;
}

// Accumulator for economy stats (used during aggregation)
interface EconomyAccumulator {
  totalCreditsPerTurn: number;
  totalCreditsSpentPerTurn: number;
  totalPowerPerTurn: number;
  totalPowerSpentPerTurn: number;
  firstBuyTurns: number[];
  firstInstallTurns: number[];
  firstMissionTurns: number[];
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation Runner Class
// ─────────────────────────────────────────────────────────────────────────────

export class SimulationRunner {
  private config: SimulationConfig;
  private results: GameResult[] = [];
  private onProgress?: (completed: number, total: number) => void;

  constructor(config: Partial<SimulationConfig> = {}) {
    // Default config
    this.config = {
      gamesCount: config.gamesCount ?? 100,
      playerCount: config.playerCount ?? 2,
      strategies: config.strategies ?? ['balanced', 'aggressive', 'economic', 'explorer', 'rush'],
      captains: config.captains ?? CAPTAINS.map(c => c.id),
      randomizeCaptains: config.randomizeCaptains ?? true,
      maxTurns: config.maxTurns ?? 50,
    };
  }

  setProgressCallback(callback: (completed: number, total: number) => void) {
    this.onProgress = callback;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Run Simulation
  // ─────────────────────────────────────────────────────────────────────────

  async runSimulation(): Promise<SimulationResults> {
    this.results = [];
    const startTime = Date.now();

    for (let i = 0; i < this.config.gamesCount; i++) {
      const result = this.runSingleGame();
      this.results.push(result);

      // Report progress
      if (this.onProgress) {
        this.onProgress(i + 1, this.config.gamesCount);
      }

      // Yield to event loop periodically to prevent blocking
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const endTime = Date.now();
    return this.analyzeResults(endTime - startTime);
  }

  // Run simulation synchronously (for testing)
  runSimulationSync(): SimulationResults {
    this.results = [];
    const startTime = Date.now();

    for (let i = 0; i < this.config.gamesCount; i++) {
      const result = this.runSingleGame();
      this.results.push(result);

      if (this.onProgress) {
        this.onProgress(i + 1, this.config.gamesCount);
      }
    }

    const endTime = Date.now();
    return this.analyzeResults(endTime - startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Single Game Execution
  // ─────────────────────────────────────────────────────────────────────────

  private runSingleGame(): GameResult {
    // Setup players with random captains and strategies
    const players = this.setupPlayers();

    // Create game engine with stats tracking enabled
    const engine = new GameEngine(players);
    engine.enableStatsTracking();

    // Create AI engines for all players
    const aiEngines = new Map<number, AIEngine>();
    players.forEach((p, idx) => {
      aiEngines.set(idx, new AIEngine(p.aiStrategy!));
    });

    // Run game loop
    let turns = 0;
    let gameState = engine.getState();

    while (!gameState.gameOver && turns < this.config.maxTurns) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const aiEngine = aiEngines.get(currentPlayer.id)!;

      // Let AI make decisions until turn ends
      let actionsThisTurn = 0;
      const maxActionsPerTurn = 50; // Safety limit

      while (actionsThisTurn < maxActionsPerTurn) {
        const action = aiEngine.decideAction(gameState, currentPlayer);

        if (!action || action.type === 'END_TURN') {
          engine.dispatch({ type: 'END_TURN' });
          break;
        }

        engine.dispatch(action);
        gameState = engine.getState();

        // Check if turn changed or game ended
        if (gameState.gameOver) break;
        if (gameState.players[gameState.currentPlayerIndex].id !== currentPlayer.id) break;

        actionsThisTurn++;
      }

      // If we hit the action limit, force end turn
      if (actionsThisTurn >= maxActionsPerTurn && !gameState.gameOver) {
        engine.dispatch({ type: 'END_TURN' });
      }

      gameState = engine.getState();
      turns = gameState.turn;
    }

    // Determine winner
    const winner = gameState.winner ?? gameState.players.reduce((best, p) =>
      p.fame > best.fame ? p : best
    );

    const winnerConfig = players.find(p => p.name === winner.name)!;

    // Collect per-player stats
    const statsTracker = engine.getStatsTracker();
    const playerSummaries = statsTracker
      ? statsTracker.generateAllSummaries(gameState.players)
      : [];

    return {
      winnerId: winner.id,
      winnerName: winner.name,
      winnerCaptain: winner.captain.id,
      winnerStrategy: winnerConfig.aiStrategy!,
      winnerFame: winner.fame,
      turns,
      finalScores: gameState.players.map(p => ({
        name: p.name,
        fame: p.fame,
        captain: p.captain.id,
        strategy: players.find(pl => pl.name === p.name)!.aiStrategy!,
      })),
      playerSummaries,
    };
  }

  private setupPlayers(): Array<{ name: string; captain: Captain; isAI: true; aiStrategy: AIStrategy }> {
    const players: Array<{ name: string; captain: Captain; isAI: true; aiStrategy: AIStrategy }> = [];
    const usedCaptains = new Set<string>();

    for (let i = 0; i < this.config.playerCount; i++) {
      // Pick random strategy
      const strategy = this.config.strategies[
        Math.floor(Math.random() * this.config.strategies.length)
      ];

      // Pick random captain (not already used)
      let captainId: string;
      const availableCaptains = this.config.captains.filter(id => !usedCaptains.has(id));

      if (this.config.randomizeCaptains && availableCaptains.length > 0) {
        captainId = availableCaptains[Math.floor(Math.random() * availableCaptains.length)];
      } else {
        captainId = this.config.captains[i % this.config.captains.length];
      }

      usedCaptains.add(captainId);
      const captain = CAPTAINS.find(c => c.id === captainId)!;

      players.push({
        name: `AI_${i + 1}_${strategy}`,
        captain,
        isAI: true,
        aiStrategy: strategy,
      });
    }

    return players;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Results Analysis
  // ─────────────────────────────────────────────────────────────────────────

  private analyzeResults(durationMs: number): SimulationResults {
    const strategyStats = new Map<AIStrategy, StrategyStats>();
    const captainStats = new Map<string, CaptainStats>();

    // Balance analysis accumulators
    const cardPopularity: Record<string, number> = {};
    const missionPopularity: Record<string, number> = {};
    const strategyEconomy = new Map<string, EconomyAccumulator>();
    const captainEconomy = new Map<string, EconomyAccumulator>();
    const strategyFameCurves = new Map<string, number[][]>();

    // Initialize stats
    for (const strategy of this.config.strategies) {
      strategyStats.set(strategy, { wins: 0, games: 0, totalFame: 0, avgTurns: 0 });
    }

    const getOrCreateEconomy = (map: Map<string, EconomyAccumulator>, key: string): EconomyAccumulator => {
      if (!map.has(key)) {
        map.set(key, {
          totalCreditsPerTurn: 0,
          totalCreditsSpentPerTurn: 0,
          totalPowerPerTurn: 0,
          totalPowerSpentPerTurn: 0,
          firstBuyTurns: [],
          firstInstallTurns: [],
          firstMissionTurns: [],
          count: 0,
        });
      }
      return map.get(key)!;
    };

    // Aggregate results
    let totalTurns = 0;

    for (const result of this.results) {
      totalTurns += result.turns;

      // Count strategy stats from winner
      const winnerStats = strategyStats.get(result.winnerStrategy)!;
      winnerStats.wins++;

      // Count all players' appearances
      for (const score of result.finalScores) {
        const stats = strategyStats.get(score.strategy)!;
        stats.games++;
        stats.totalFame += score.fame;

        // Captain stats
        if (!captainStats.has(score.captain)) {
          captainStats.set(score.captain, { wins: 0, games: 0, totalFame: 0 });
        }
        const capStats = captainStats.get(score.captain)!;
        capStats.games++;
        capStats.totalFame += score.fame;
        if (result.winnerCaptain === score.captain && result.winnerName === score.name) {
          capStats.wins++;
        }
      }

      // Aggregate per-player balance stats
      for (const summary of result.playerSummaries) {
        // Card & mission popularity
        for (const [card, count] of Object.entries(summary.cardsBoughtByName)) {
          cardPopularity[card] = (cardPopularity[card] ?? 0) + count;
        }
        for (const [mission, count] of Object.entries(summary.missionsCompletedByName)) {
          missionPopularity[mission] = (missionPopularity[mission] ?? 0) + count;
        }

        // Find this player's strategy
        const playerScore = result.finalScores.find(s => s.name === summary.playerName);
        if (!playerScore) continue;

        const strategyKey = playerScore.strategy;
        const captainKey = summary.captainId;

        // Strategy economy
        const sEcon = getOrCreateEconomy(strategyEconomy, strategyKey);
        sEcon.totalCreditsPerTurn += summary.avgCreditsGainedPerTurn;
        sEcon.totalCreditsSpentPerTurn += summary.avgCreditsSpentPerTurn;
        sEcon.totalPowerPerTurn += summary.avgPowerGainedPerTurn;
        sEcon.totalPowerSpentPerTurn += summary.avgPowerSpentPerTurn;
        if (summary.turnOfFirstPurchase !== null) sEcon.firstBuyTurns.push(summary.turnOfFirstPurchase);
        if (summary.turnOfFirstInstall !== null) sEcon.firstInstallTurns.push(summary.turnOfFirstInstall);
        if (summary.turnOfFirstMission !== null) sEcon.firstMissionTurns.push(summary.turnOfFirstMission);
        sEcon.count++;

        // Captain economy
        const cEcon = getOrCreateEconomy(captainEconomy, captainKey);
        cEcon.totalCreditsPerTurn += summary.avgCreditsGainedPerTurn;
        cEcon.totalCreditsSpentPerTurn += summary.avgCreditsSpentPerTurn;
        cEcon.totalPowerPerTurn += summary.avgPowerGainedPerTurn;
        cEcon.totalPowerSpentPerTurn += summary.avgPowerSpentPerTurn;
        if (summary.turnOfFirstPurchase !== null) cEcon.firstBuyTurns.push(summary.turnOfFirstPurchase);
        if (summary.turnOfFirstInstall !== null) cEcon.firstInstallTurns.push(summary.turnOfFirstInstall);
        if (summary.turnOfFirstMission !== null) cEcon.firstMissionTurns.push(summary.turnOfFirstMission);
        cEcon.count++;

        // Fame curves by strategy
        if (!strategyFameCurves.has(strategyKey)) {
          strategyFameCurves.set(strategyKey, []);
        }
        strategyFameCurves.get(strategyKey)!.push(summary.fameOverTime);
      }
    }

    // Calculate averages
    const avgTurns = totalTurns / this.results.length;

    for (const [, stats] of strategyStats) {
      stats.avgTurns = stats.games > 0 ? stats.totalFame / stats.games : 0;
    }

    // Build win rates
    const strategyWinRates: Record<string, number> = {};
    const strategyAvgFame: Record<string, number> = {};

    for (const [strategy, stats] of strategyStats) {
      strategyWinRates[strategy] = stats.games > 0 ? stats.wins / stats.games : 0;
      strategyAvgFame[strategy] = stats.games > 0 ? stats.totalFame / stats.games : 0;
    }

    const captainWinRates: Record<string, number> = {};
    const captainAvgFame: Record<string, number> = {};

    for (const [captain, stats] of captainStats) {
      captainWinRates[captain] = stats.games > 0 ? stats.wins / stats.games : 0;
      captainAvgFame[captain] = stats.games > 0 ? stats.totalFame / stats.games : 0;
    }

    // Build economy stats
    const buildEconomyStats = (acc: EconomyAccumulator): EconomyStats => {
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
      return {
        avgCreditsPerTurn: acc.count > 0 ? acc.totalCreditsPerTurn / acc.count : 0,
        avgCreditsSpentPerTurn: acc.count > 0 ? acc.totalCreditsSpentPerTurn / acc.count : 0,
        avgPowerPerTurn: acc.count > 0 ? acc.totalPowerPerTurn / acc.count : 0,
        avgPowerSpentPerTurn: acc.count > 0 ? acc.totalPowerSpentPerTurn / acc.count : 0,
        avgTurnToFirstBuy: avg(acc.firstBuyTurns),
        avgTurnToFirstInstall: avg(acc.firstInstallTurns),
        avgTurnToFirstMission: avg(acc.firstMissionTurns),
      };
    };

    const avgEconomyByStrategy: Record<string, EconomyStats> = {};
    for (const [strategy, acc] of strategyEconomy) {
      avgEconomyByStrategy[strategy] = buildEconomyStats(acc);
    }

    const avgEconomyByCaptain: Record<string, EconomyStats> = {};
    for (const [captain, acc] of captainEconomy) {
      avgEconomyByCaptain[captain] = buildEconomyStats(acc);
    }

    // Build fame curves (average fame at each turn index, per strategy)
    const fameCurvesByStrategy: Record<string, number[]> = {};
    for (const [strategy, curves] of strategyFameCurves) {
      if (curves.length === 0) continue;
      const maxLen = Math.max(...curves.map(c => c.length));
      const avgCurve: number[] = [];
      for (let i = 0; i < maxLen; i++) {
        const values = curves.filter(c => i < c.length).map(c => c[i]);
        avgCurve.push(values.reduce((a, b) => a + b, 0) / values.length);
      }
      fameCurvesByStrategy[strategy] = avgCurve;
    }

    return {
      gamesPlayed: this.results.length,
      avgTurns,
      strategyWinRates,
      strategyAvgFame,
      captainWinRates,
      captainAvgFame,
      durationMs,
      cardPopularity,
      missionPopularity,
      avgEconomyByStrategy,
      avgEconomyByCaptain,
      fameCurvesByStrategy,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────

  getResults(): GameResult[] {
    return [...this.results];
  }

  printSummary(results: SimulationResults): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════',
      '                    SIMULATION RESULTS',
      '═══════════════════════════════════════════════════════════════',
      '',
      `Games Played: ${results.gamesPlayed}`,
      `Average Turns: ${results.avgTurns.toFixed(1)}`,
      `Duration: ${(results.durationMs / 1000).toFixed(2)}s`,
      '',
      '─────────────────────────────────────────────────────────────────',
      '                    STRATEGY WIN RATES',
      '─────────────────────────────────────────────────────────────────',
    ];

    // Sort strategies by win rate
    const sortedStrategies = Object.entries(results.strategyWinRates)
      .sort((a, b) => b[1] - a[1]);

    for (const [strategy, winRate] of sortedStrategies) {
      const avgFame = results.strategyAvgFame[strategy];
      const bar = '█'.repeat(Math.round(winRate * 20));
      lines.push(`  ${strategy.padEnd(12)} ${(winRate * 100).toFixed(1).padStart(5)}% ${bar} (avg fame: ${avgFame.toFixed(1)})`);
    }

    lines.push('');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('                    CAPTAIN WIN RATES');
    lines.push('─────────────────────────────────────────────────────────────────');

    // Sort captains by win rate
    const sortedCaptains = Object.entries(results.captainWinRates)
      .sort((a, b) => b[1] - a[1]);

    for (const [captain, winRate] of sortedCaptains) {
      const avgFame = results.captainAvgFame[captain];
      const bar = '█'.repeat(Math.round(winRate * 20));
      lines.push(`  ${captain.padEnd(12)} ${(winRate * 100).toFixed(1).padStart(5)}% ${bar} (avg fame: ${avgFame.toFixed(1)})`);
    }

    // Economy by strategy
    lines.push('');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('                 ECONOMY BY STRATEGY (avg/turn)');
    lines.push('─────────────────────────────────────────────────────────────────');

    for (const [strategy] of sortedStrategies) {
      const econ = results.avgEconomyByStrategy[strategy];
      if (!econ) continue;
      lines.push(`  ${strategy.padEnd(12)} Credits: ${econ.avgCreditsPerTurn.toFixed(1)} earned / ${econ.avgCreditsSpentPerTurn.toFixed(1)} spent  |  Power: ${econ.avgPowerPerTurn.toFixed(1)} earned / ${econ.avgPowerSpentPerTurn.toFixed(1)} spent`);
      const milestones: string[] = [];
      if (econ.avgTurnToFirstBuy !== null) milestones.push(`1st buy: t${econ.avgTurnToFirstBuy.toFixed(1)}`);
      if (econ.avgTurnToFirstInstall !== null) milestones.push(`1st install: t${econ.avgTurnToFirstInstall.toFixed(1)}`);
      if (econ.avgTurnToFirstMission !== null) milestones.push(`1st mission: t${econ.avgTurnToFirstMission.toFixed(1)}`);
      if (milestones.length > 0) {
        lines.push(`               ${milestones.join('  |  ')}`);
      }
    }

    // Economy by captain
    lines.push('');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('                 ECONOMY BY CAPTAIN (avg/turn)');
    lines.push('─────────────────────────────────────────────────────────────────');

    for (const [captain] of sortedCaptains) {
      const econ = results.avgEconomyByCaptain[captain];
      if (!econ) continue;
      lines.push(`  ${captain.padEnd(12)} Credits: ${econ.avgCreditsPerTurn.toFixed(1)} earned / ${econ.avgCreditsSpentPerTurn.toFixed(1)} spent  |  Power: ${econ.avgPowerPerTurn.toFixed(1)} earned / ${econ.avgPowerSpentPerTurn.toFixed(1)} spent`);
    }

    // Card popularity (top 10)
    lines.push('');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('                    CARD POPULARITY (top 15)');
    lines.push('─────────────────────────────────────────────────────────────────');

    const sortedCards = Object.entries(results.cardPopularity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    const maxCardBuys = sortedCards.length > 0 ? sortedCards[0][1] : 1;
    for (const [card, count] of sortedCards) {
      const bar = '█'.repeat(Math.round((count / maxCardBuys) * 15));
      const perGame = (count / results.gamesPlayed).toFixed(1);
      lines.push(`  ${card.padEnd(25)} ${String(count).padStart(4)} buys (${perGame}/game) ${bar}`);
    }

    // Mission popularity
    lines.push('');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push('                 MISSION COMPLETION RATES');
    lines.push('─────────────────────────────────────────────────────────────────');

    const sortedMissions = Object.entries(results.missionPopularity)
      .sort((a, b) => b[1] - a[1]);

    const maxMissionCompletions = sortedMissions.length > 0 ? sortedMissions[0][1] : 1;
    for (const [mission, count] of sortedMissions) {
      const bar = '█'.repeat(Math.round((count / maxMissionCompletions) * 15));
      const perGame = (count / results.gamesPlayed).toFixed(2);
      lines.push(`  ${mission.padEnd(30)} ${String(count).padStart(4)} (${perGame}/game) ${bar}`);
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default SimulationRunner;
