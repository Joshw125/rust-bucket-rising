// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Simulation Mode UI
// Run AI vs AI games to analyze balance
// ═══════════════════════════════════════════════════════════════════════════════
//
// Three major capabilities on top of the raw batch runner:
//   1. Per-decision replay — every action every AI took, browsable per game
//   2. Fixed matchup mode — pin specific captain+strategy to each seat
//   3. JSON export — download the full results payload (aggregates + action
//      logs) for offline analysis
//
// The aggregate view is unchanged from the previous version.

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { SimulationRunner } from '@shared/engine/SimulationRunner';
import { CAPTAINS, getCaptainById } from '@shared/data';
import type {
  AIStrategy,
  SimulationResults,
  SimGameResult,
  SimActionLogEntry,
  GameAction,
} from '@shared/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MatchupMode = 'random' | 'fixed';

interface LocalConfig {
  gamesCount: number;
  playerCount: number;
  strategies: AIStrategy[];
  matchupMode: MatchupMode;
  fixedMatchup: Array<{ captainId: string; strategy: AIStrategy }>;
  captureActionLog: boolean;
}

const ALL_STRATEGIES: AIStrategy[] = ['balanced', 'aggressive', 'economic', 'explorer', 'rush'];

const STRATEGY_COLORS: Record<AIStrategy, string> = {
  balanced: 'bg-slate-600',
  aggressive: 'bg-red-600',
  economic: 'bg-green-600',
  explorer: 'bg-blue-600',
  rush: 'bg-purple-600',
};

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
  return (
    <button
      className={clsx(
        'px-4 py-2 rounded-lg font-semibold transition-all',
        enabled ? `${STRATEGY_COLORS[strategy]} text-white` : 'bg-slate-800 text-slate-500'
      )}
      onClick={onToggle}
    >
      {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixed Matchup Builder
// ─────────────────────────────────────────────────────────────────────────────

function FixedMatchupBuilder({
  matchup,
  onChange,
  disabled,
}: {
  matchup: Array<{ captainId: string; strategy: AIStrategy }>;
  onChange: (m: Array<{ captainId: string; strategy: AIStrategy }>) => void;
  disabled: boolean;
}) {
  // Exclude Ghost (not a selectable captain; it's a reaction trigger).
  const selectableCaptains = CAPTAINS.filter(c => c.id !== 'ghost');

  const addSeat = () => {
    if (matchup.length >= 4) return;
    // Default next seat to an unused captain with 'balanced' strategy
    const used = new Set(matchup.map(m => m.captainId));
    const next = selectableCaptains.find(c => !used.has(c.id)) ?? selectableCaptains[0];
    onChange([...matchup, { captainId: next.id, strategy: 'balanced' }]);
  };
  const removeSeat = (i: number) => {
    onChange(matchup.filter((_, idx) => idx !== i));
  };
  const updateSeat = (i: number, patch: Partial<{ captainId: string; strategy: AIStrategy }>) => {
    onChange(matchup.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };

  return (
    <div className="space-y-2">
      {matchup.length === 0 && (
        <div className="text-sm text-slate-500 italic">Add at least 2 seats to run a fixed matchup.</div>
      )}
      {matchup.map((seat, i) => (
        <div key={i} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2">
          <div className="text-xs text-slate-500 w-12">Seat {i + 1}</div>
          <select
            className="flex-1 bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-700"
            value={seat.captainId}
            onChange={e => updateSeat(i, { captainId: e.target.value })}
            disabled={disabled}
          >
            {selectableCaptains.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-700"
            value={seat.strategy}
            onChange={e => updateSeat(i, { strategy: e.target.value as AIStrategy })}
            disabled={disabled}
          >
            {ALL_STRATEGIES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            className="px-2 py-1 text-xs bg-red-900/40 hover:bg-red-900 text-red-300 rounded disabled:opacity-50"
            onClick={() => removeSeat(i)}
            disabled={disabled || matchup.length <= 2}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 disabled:opacity-50"
        onClick={addSeat}
        disabled={disabled || matchup.length >= 4}
      >
        + Add Seat (up to 4)
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Display (aggregates)
// ─────────────────────────────────────────────────────────────────────────────

function ResultsDisplay({ results }: { results: SimulationResults }) {
  const sortedStrategies = Object.entries(results.strategyWinRates).sort((a, b) => b[1] - a[1]);
  const sortedCaptains = Object.entries(results.captainWinRates).sort((a, b) => b[1] - a[1]);

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
                    {getCaptainById(captain)?.name ?? captain.replace(/-/g, ' ')}
                  </span>
                  <span className="text-slate-400">{(winRate * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${barWidth}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Avg Fame: {avgFame.toFixed(1)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Game List + Replay Viewer
// ─────────────────────────────────────────────────────────────────────────────

function formatAction(action: GameAction): string {
  switch (action.type) {
    case 'PLAY_CARD':
      return `Play card (${action.cardInstanceId.slice(0, 12)}…)`;
    case 'INSTALL_CARD':
      return `Install to ${action.targetSystem}`;
    case 'ACTIVATE_SYSTEM':
      return `Activate ${action.system} ability #${action.abilityIndex}${
        action.targetPlayerId !== undefined ? ` → P${action.targetPlayerId}` : ''
      }`;
    case 'MOVE':
      return `Move ${action.direction > 0 ? '→' : '←'}`;
    case 'COMPLETE_MISSION':
      return `✓ Complete mission`;
    case 'BUY_CARD':
      return `Buy card (stack ${action.stackIndex}, idx ${action.cardIndex})`;
    case 'BUY_AND_INSTALL':
      return `Buy + install to ${action.targetSystem}`;
    case 'END_TURN':
      return `— End turn —`;
    case 'RESOLVE_PENDING':
      return `Resolve pending`;
    case 'CLEAR_HAZARD':
      return `Clear hazard`;
    case 'REVEAL_STACK':
      return `Reveal market stack ${action.stackIndex} (loc ${action.station})`;
    case 'RESTART_TURN':
      return `↶ Restart turn`;
  }
}

function formatPower(p: { weapons: number; computers: number; engines: number; logistics: number }): string {
  return `W${p.weapons} C${p.computers} E${p.engines} L${p.logistics}`;
}

function ActionLogView({ log }: { log: SimActionLogEntry[] }) {
  if (log.length === 0) {
    return <div className="text-sm text-slate-500 italic">No action log captured for this game.</div>;
  }

  // Group by turn
  const turns = new Map<number, SimActionLogEntry[]>();
  for (const entry of log) {
    const arr = turns.get(entry.turn) ?? [];
    arr.push(entry);
    turns.set(entry.turn, arr);
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto bg-slate-950 rounded-lg p-3 border border-slate-800">
      {Array.from(turns.entries()).map(([turn, entries]) => (
        <div key={turn}>
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Turn {turn}</div>
          <div className="space-y-1">
            {entries.map((e, idx) => (
              <div
                key={idx}
                className="flex items-baseline gap-2 font-mono text-xs py-0.5 hover:bg-slate-900 rounded px-1"
              >
                <span className={clsx('w-20 shrink-0 truncate', STRATEGY_COLORS[e.playerStrategy].replace('bg-', 'text-'))}>
                  P{e.playerIndex} {e.playerStrategy.slice(0, 3)}
                </span>
                <span className="flex-1 text-slate-200">{formatAction(e.action)}</span>
                <span className="text-slate-500 shrink-0">
                  @loc{e.location} • {e.fame}f • {e.credits}¢ • {formatPower(e.power)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GamesList({ games }: { games: SimGameResult[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return games;
    const q = filter.toLowerCase();
    return games.filter(
      g =>
        g.winnerName.toLowerCase().includes(q) ||
        g.winnerCaptain.toLowerCase().includes(q) ||
        g.winnerStrategy.toLowerCase().includes(q) ||
        g.finalScores.some(s => s.captain.toLowerCase().includes(q) || s.strategy.toLowerCase().includes(q)),
    );
  }, [games, filter]);

  const selected = games.find(g => g.gameId === selectedId) ?? null;

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="text-lg font-bold text-white">Games ({filtered.length} of {games.length})</h3>
        <input
          type="text"
          placeholder="Filter: captain, strategy, name…"
          className="flex-1 max-w-sm bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Game list */}
        <div className="md:col-span-1 max-h-[500px] overflow-y-auto space-y-1">
          {filtered.map(g => {
            const isSelected = g.gameId === selectedId;
            return (
              <button
                key={g.gameId}
                onClick={() => setSelectedId(g.gameId)}
                className={clsx(
                  'w-full text-left px-2 py-1.5 rounded text-xs font-mono transition-colors',
                  isSelected
                    ? 'bg-purple-800/40 border border-purple-500/50'
                    : 'bg-slate-900 hover:bg-slate-700 border border-transparent',
                )}
              >
                <div className="flex justify-between">
                  <span className="text-slate-400">#{g.gameId}</span>
                  <span className="text-amber-400">{g.winnerFame}f / t{g.turns}</span>
                </div>
                <div className="text-slate-200 truncate">
                  {getCaptainById(g.winnerCaptain)?.name ?? g.winnerCaptain}
                  <span className="text-slate-500"> · {g.winnerStrategy}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Game detail */}
        <div className="md:col-span-2">
          {!selected ? (
            <div className="h-full min-h-[300px] flex items-center justify-center text-slate-500 text-sm italic border border-dashed border-slate-700 rounded">
              Select a game to view its action log
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-sm font-bold text-amber-400 mb-1">
                  Game #{selected.gameId} — {getCaptainById(selected.winnerCaptain)?.name ?? selected.winnerCaptain} ({selected.winnerStrategy}) won with {selected.winnerFame} fame in {selected.turns} turns
                </div>
                <div className="text-xs text-slate-400">
                  Final scores:{' '}
                  {selected.finalScores
                    .slice()
                    .sort((a, b) => b.fame - a.fame)
                    .map(
                      s =>
                        `${s.name} (${getCaptainById(s.captain)?.name ?? s.captain}/${s.strategy}): ${s.fame}f`,
                    )
                    .join(' · ')}
                </div>
              </div>
              <ActionLogView log={selected.actionLog} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Simulation Mode Component
// ─────────────────────────────────────────────────────────────────────────────

export function SimulationMode({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<LocalConfig>({
    gamesCount: 100,
    playerCount: 2,
    strategies: ['balanced', 'aggressive', 'economic', 'explorer', 'rush'],
    matchupMode: 'random',
    fixedMatchup: [
      { captainId: 'scrapper', strategy: 'balanced' },
      { captainId: 'navigator', strategy: 'balanced' },
    ],
    captureActionLog: true,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState<SimulationResults | null>(null);

  const toggleStrategy = (strategy: AIStrategy) => {
    setConfig(prev => ({
      ...prev,
      strategies: prev.strategies.includes(strategy)
        ? prev.strategies.filter(s => s !== strategy)
        : [...prev.strategies, strategy],
    }));
  };

  const runSimulation = useCallback(async () => {
    if (config.matchupMode === 'random' && config.strategies.length === 0) {
      alert('Please select at least one strategy');
      return;
    }
    if (config.matchupMode === 'fixed' && config.fixedMatchup.length < 2) {
      alert('Add at least 2 seats to run a fixed matchup');
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
      captureActionLog: config.captureActionLog,
      fixedMatchup: config.matchupMode === 'fixed' ? config.fixedMatchup : undefined,
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

  const downloadResults = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `rbr-sim-${results.gamesPlayed}games-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
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
              <div className="flex gap-2 flex-wrap">
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

            {/* Matchup Mode */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Matchup Mode</label>
              <div className="flex gap-2">
                {(['random', 'fixed'] as MatchupMode[]).map(mode => (
                  <button
                    key={mode}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-semibold transition-all capitalize',
                      config.matchupMode === mode
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    )}
                    onClick={() => setConfig(prev => ({ ...prev, matchupMode: mode }))}
                    disabled={isRunning}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {config.matchupMode === 'random'
                  ? 'Captains + strategies chosen randomly each game'
                  : 'Every game uses the exact seat setup below'}
              </div>
            </div>
          </div>

          {/* Random-mode specific */}
          {config.matchupMode === 'random' && (
            <>
              <div className="mt-6">
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
              <div className="mt-6">
                <label className="block text-sm text-slate-400 mb-2">AI Strategies to Include</label>
                <div className="flex gap-2 flex-wrap">
                  {ALL_STRATEGIES.map(strategy => (
                    <StrategyToggle
                      key={strategy}
                      strategy={strategy}
                      enabled={config.strategies.includes(strategy)}
                      onToggle={() => !isRunning && toggleStrategy(strategy)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fixed-mode specific */}
          {config.matchupMode === 'fixed' && (
            <div className="mt-6">
              <label className="block text-sm text-slate-400 mb-2">Fixed Seats</label>
              <FixedMatchupBuilder
                matchup={config.fixedMatchup}
                onChange={m => setConfig(prev => ({ ...prev, fixedMatchup: m }))}
                disabled={isRunning}
              />
            </div>
          )}

          {/* Action log toggle */}
          <div className="mt-6">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={config.captureActionLog}
                onChange={e => setConfig(prev => ({ ...prev, captureActionLog: e.target.checked }))}
                disabled={isRunning}
              />
              Capture per-decision action logs (enables Replay viewer; slight perf cost)
            </label>
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
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Results</h2>
              <button
                onClick={downloadResults}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold"
              >
                ⬇ Download JSON
              </button>
            </div>
            <ResultsDisplay results={results} />
            {results.games && results.games.length > 0 && <GamesList games={results.games} />}
          </div>
        )}

        {/* Tips */}
        {!results && !isRunning && (
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
            <h3 className="font-bold text-slate-300 mb-2">💡 Tips for Balance Testing</h3>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• Run at least 100 games for statistically meaningful results</li>
              <li>• Compare win rates across strategies — they should be relatively even (40–60%)</li>
              <li>• If a captain has &gt;70% win rate, they may be overpowered</li>
              <li>• If a captain has &lt;30% win rate, they may need a buff</li>
              <li>• Use <b>Fixed matchup</b> to isolate two-captain questions ("is Navigator too strong vs Scrapper?")</li>
              <li>• Click any game in the results to scrub through its action log decision by decision</li>
              <li>• Download JSON to analyze the full dataset in Excel / Python / etc.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimulationMode;
