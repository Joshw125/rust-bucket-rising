// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Simulation Mode UI
// Run AI vs AI games to analyze balance
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { SimulationRunner } from '@/engine/SimulationRunner';
import type { AIStrategy, SimulationResults } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SimulationConfig {
  gamesCount: number;
  playerCount: number;
  strategies: AIStrategy[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Toggle Button
// ─────────────────────────────────────────────────────────────────────────────

function StrategyToggle({
  strategy,
  enabled,
  onToggle,
}: {
  strategy: AIStrategy;
  enabled: boolean;
  onToggle: () => void;
}) {
  const colors: Record<AIStrategy, string> = {
    balanced: 'bg-slate-600',
    aggressive: 'bg-red-600',
    economic: 'bg-green-600',
    explorer: 'bg-blue-600',
    rush: 'bg-purple-600',
  };

  return (
    <button
      className={clsx(
        'px-4 py-2 rounded-lg font-semibold transition-all',
        enabled ? `${colors[strategy]} text-white` : 'bg-slate-800 text-slate-500'
      )}
      onClick={onToggle}
    >
      {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Display
// ─────────────────────────────────────────────────────────────────────────────

function ResultsDisplay({ results }: { results: SimulationResults }) {
  // Sort strategies by win rate
  const sortedStrategies = Object.entries(results.strategyWinRates)
    .sort((a, b) => b[1] - a[1]);

  const sortedCaptains = Object.entries(results.captainWinRates)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-amber-400">{results.gamesPlayed}</div>
          <div className="text-slate-400 text-sm">Games Played</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-cyan-400">{results.avgTurns.toFixed(1)}</div>
          <div className="text-slate-400 text-sm">Avg Turns</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{(results.durationMs / 1000).toFixed(1)}s</div>
          <div className="text-slate-400 text-sm">Duration</div>
        </div>
      </div>

      {/* Strategy Win Rates */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-4">Strategy Win Rates</h3>
        <div className="space-y-3">
          {sortedStrategies.map(([strategy, winRate]) => {
            const avgFame = results.strategyAvgFame[strategy];
            const barWidth = Math.round(winRate * 100);
            const colors: Record<string, string> = {
              balanced: 'bg-slate-500',
              aggressive: 'bg-red-500',
              economic: 'bg-green-500',
              explorer: 'bg-blue-500',
              rush: 'bg-purple-500',
            };

            return (
              <div key={strategy} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white capitalize font-medium">{strategy}</span>
                  <span className="text-slate-400">
                    {(winRate * 100).toFixed(1)}% win • {avgFame.toFixed(1)} avg fame
                  </span>
                </div>
                <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all', colors[strategy])}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Captain Win Rates */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-4">Captain Win Rates</h3>
        <div className="grid grid-cols-2 gap-2">
          {sortedCaptains.map(([captain, winRate]) => {
            const avgFame = results.captainAvgFame[captain];
            const barWidth = Math.round(winRate * 100);

            return (
              <div key={captain} className="bg-slate-700/50 rounded p-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-medium capitalize">
                    {captain.replace(/-/g, ' ')}
                  </span>
                  <span className="text-slate-400">
                    {(winRate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Avg Fame: {avgFame.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Simulation Mode Component
// ─────────────────────────────────────────────────────────────────────────────

export function SimulationMode({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<SimulationConfig>({
    gamesCount: 100,
    playerCount: 2,
    strategies: ['balanced', 'aggressive', 'economic', 'explorer', 'rush'],
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState<SimulationResults | null>(null);

  const allStrategies: AIStrategy[] = ['balanced', 'aggressive', 'economic', 'explorer', 'rush'];

  const toggleStrategy = (strategy: AIStrategy) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.includes(strategy)
        ? prev.strategies.filter(s => s !== strategy)
        : [...prev.strategies, strategy],
    }));
  };

  const runSimulation = useCallback(async () => {
    if (config.strategies.length === 0) {
      alert('Please select at least one strategy');
      return;
    }

    setIsRunning(true);
    setProgress({ completed: 0, total: config.gamesCount });
    setResults(null);

    const runner = new SimulationRunner({
      gamesCount: config.gamesCount,
      playerCount: config.playerCount,
      strategies: config.strategies,
      randomizeCaptains: true,
      maxTurns: 50,
    });

    runner.setProgressCallback((completed, total) => {
      setProgress({ completed, total });
    });

    try {
      const simResults = await runner.runSimulation();
      setResults(simResults);
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Simulation failed. Check console for details.');
    }

    setIsRunning(false);
  }, [config]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-400">Simulation Mode</h1>
            <p className="text-slate-400">Run AI vs AI games to analyze game balance</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            ← Back to Menu
          </button>
        </div>

        {/* Configuration */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Configuration</h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Games Count */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Number of Games</label>
              <div className="flex gap-2">
                {[10, 50, 100, 500, 1000].map(count => (
                  <button
                    key={count}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-semibold transition-all',
                      config.gamesCount === count
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    )}
                    onClick={() => setConfig(prev => ({ ...prev, gamesCount: count }))}
                    disabled={isRunning}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Player Count */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Players per Game</label>
              <div className="flex gap-2">
                {[2, 3, 4].map(count => (
                  <button
                    key={count}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-semibold transition-all',
                      config.playerCount === count
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    )}
                    onClick={() => setConfig(prev => ({ ...prev, playerCount: count }))}
                    disabled={isRunning}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Strategies */}
          <div className="mt-6">
            <label className="block text-sm text-slate-400 mb-2">AI Strategies to Include</label>
            <div className="flex gap-2 flex-wrap">
              {allStrategies.map(strategy => (
                <StrategyToggle
                  key={strategy}
                  strategy={strategy}
                  enabled={config.strategies.includes(strategy)}
                  onToggle={() => !isRunning && toggleStrategy(strategy)}
                />
              ))}
            </div>
          </div>

          {/* Run Button */}
          <div className="mt-6">
            <button
              className={clsx(
                'w-full py-4 rounded-xl font-bold text-xl transition-all',
                isRunning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white'
              )}
              onClick={runSimulation}
              disabled={isRunning}
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
                  Running... {progress.completed} / {progress.total}
                </span>
              ) : (
                `Run ${config.gamesCount} Games`
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4">Results</h2>
            <ResultsDisplay results={results} />
          </div>
        )}

        {/* Tips */}
        {!results && !isRunning && (
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
            <h3 className="font-bold text-slate-300 mb-2">💡 Tips for Balance Testing</h3>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• Run at least 100 games for statistically meaningful results</li>
              <li>• Compare win rates across strategies - they should be relatively even (40-60%)</li>
              <li>• If a captain has &gt;70% win rate, they may be overpowered</li>
              <li>• If a captain has &lt;30% win rate, they may need a buff</li>
              <li>• Average fame can indicate how dominant a winning strategy is</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimulationMode;
