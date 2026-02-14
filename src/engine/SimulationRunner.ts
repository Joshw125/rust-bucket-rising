// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Simulation Runner
// Automated game simulation for balance testing
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Captain,
  AIStrategy,
  SimulationConfig,
  SimulationResults,
} from '@/types';

import { GameEngine } from './GameEngine';
import { AIEngine } from './AIEngine';
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

    // Create game engine
    const engine = new GameEngine(players);

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

    // Initialize stats
    for (const strategy of this.config.strategies) {
      strategyStats.set(strategy, { wins: 0, games: 0, totalFame: 0, avgTurns: 0 });
    }

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
    }

    // Calculate averages
    const avgTurns = totalTurns / this.results.length;

    for (const [, stats] of strategyStats) {
      stats.avgTurns = stats.games > 0 ? stats.totalFame / stats.games : 0;
    }

    // Build results
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

    return {
      gamesPlayed: this.results.length,
      avgTurns,
      strategyWinRates,
      strategyAvgFame,
      captainWinRates,
      captainAvgFame,
      durationMs,
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

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default SimulationRunner;
