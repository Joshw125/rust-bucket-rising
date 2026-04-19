// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Simulation Analysis
// ═══════════════════════════════════════════════════════════════════════════════
//
// Post-run analysis layer that sits between the raw SimulationResults and
// the designer's eyes. Instead of digging through JSON or staring at win-rate
// bars, this surfaces the patterns that actually matter for balance work:
//
//   1. Auto-detected anomalies ("Navigator wins 74% — probably OP")
//   2. Turn-length distribution (game pacing)
//   3. Captain matchup matrix (pairwise head-to-head winrates)
//   4. Fame trajectory chart (avg fame per turn, by strategy)
//   5. Card impact table (winrate delta: bought vs. not bought)
//
// Everything is computed client-side from the existing SimulationResults —
// no runner changes required.

import { useMemo } from 'react';
import { clsx } from 'clsx';
import { getCaptainById } from '@shared/data';
import type { SimulationResults, SimGameResult } from '@shared/types';

// ─────────────────────────────────────────────────────────────────────────────
// Anomaly Detection
// ─────────────────────────────────────────────────────────────────────────────

interface Anomaly {
  severity: 'warning' | 'info';
  title: string;
  detail: string;
}

/**
 * Fire a few simple rules over the aggregate stats and flag things that
 * deserve the designer's attention. Over-tuning the thresholds is a trap —
 * these are meant to nudge, not prescribe.
 */
function detectAnomalies(results: SimulationResults): Anomaly[] {
  const out: Anomaly[] = [];
  const minGamesForSignal = Math.max(10, Math.floor(results.gamesPlayed * 0.02));

  // Captain winrate outliers (only if the captain actually played enough games)
  for (const [captain, winRate] of Object.entries(results.captainWinRates)) {
    // We need a game count; reconstruct from games[] since it's not stored at
    // aggregate level. Fall back to games list.
    const plays = results.games.reduce(
      (acc, g) => acc + g.finalScores.filter(s => s.captain === captain).length,
      0,
    );
    if (plays < minGamesForSignal) continue;
    const name = getCaptainById(captain)?.name ?? captain;
    if (winRate >= 0.7) {
      out.push({
        severity: 'warning',
        title: `${name} win rate is ${(winRate * 100).toFixed(0)}%`,
        detail: `${plays} games played. Above 70% usually means overtuned — consider a nerf or look at what wins.`,
      });
    } else if (winRate <= 0.25) {
      out.push({
        severity: 'warning',
        title: `${name} win rate is ${(winRate * 100).toFixed(0)}%`,
        detail: `${plays} games played. Below 25% usually means undertuned — consider a buff or check if their ability fires.`,
      });
    }
  }

  // Strategy winrate outliers
  for (const [strategy, winRate] of Object.entries(results.strategyWinRates)) {
    if (winRate >= 0.7) {
      out.push({
        severity: 'info',
        title: `Strategy "${strategy}" dominates at ${(winRate * 100).toFixed(0)}%`,
        detail: `This may just mean the AI scoring weights favor it, not that real players would. Worth double-checking.`,
      });
    } else if (winRate <= 0.1 && results.gamesPlayed >= 50) {
      out.push({
        severity: 'info',
        title: `Strategy "${strategy}" barely wins (${(winRate * 100).toFixed(0)}%)`,
        detail: `Likely a weak AI heuristic — could indicate the game punishes that playstyle, or the scorer needs tuning.`,
      });
    }
  }

  // Game pacing
  if (results.avgTurns > 28) {
    out.push({
      severity: 'warning',
      title: `Games average ${results.avgTurns.toFixed(1)} turns`,
      detail: 'Over ~25 turns per game often signals pacing issues — fame generation may be too slow or the 25-fame threshold too high.',
    });
  } else if (results.avgTurns < 8) {
    out.push({
      severity: 'warning',
      title: `Games average only ${results.avgTurns.toFixed(1)} turns`,
      detail: 'Under 8 turns is very fast — fame may be too easy to rack up, or the winning-threshold too low.',
    });
  }

  // Blowouts (winner fame vs avg of losers)
  const margins: number[] = [];
  for (const g of results.games) {
    const winner = g.finalScores.find(s => s.fame === Math.max(...g.finalScores.map(x => x.fame)));
    if (!winner) continue;
    const losers = g.finalScores.filter(s => s !== winner);
    if (losers.length === 0) continue;
    const avgLoser = losers.reduce((a, b) => a + b.fame, 0) / losers.length;
    margins.push(winner.fame - avgLoser);
  }
  if (margins.length > 0) {
    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
    const blowouts = margins.filter(m => m >= 10).length;
    const blowoutPct = blowouts / margins.length;
    if (blowoutPct >= 0.35) {
      out.push({
        severity: 'info',
        title: `${(blowoutPct * 100).toFixed(0)}% of games end in blowouts (≥10 fame gap)`,
        detail: `Avg winning margin: ${avgMargin.toFixed(1)} fame. High blowout rates can hurt player experience — check for runaway leader mechanics.`,
      });
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn-count histogram
// ─────────────────────────────────────────────────────────────────────────────

function TurnLengthHistogram({ games }: { games: SimGameResult[] }) {
  const { bins, maxCount, median } = useMemo(() => {
    const counts: Record<number, number> = {};
    const turnValues = games.map(g => g.turns).sort((a, b) => a - b);
    for (const t of turnValues) counts[t] = (counts[t] ?? 0) + 1;
    const sortedKeys = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const bins = sortedKeys.map(turn => ({ turn, count: counts[turn] }));
    const maxCount = Math.max(0, ...bins.map(b => b.count));
    const median = turnValues[Math.floor(turnValues.length / 2)] ?? 0;
    return { bins, maxCount, median };
  }, [games]);

  if (bins.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">Turn-Length Distribution</h3>
        <div className="text-xs text-slate-400">median: {median} turns</div>
      </div>
      <div className="flex items-end gap-0.5 h-32">
        {bins.map(b => (
          <div key={b.turn} className="flex-1 min-w-0 flex flex-col items-center" title={`${b.count} games ended on turn ${b.turn}`}>
            <div
              className="w-full bg-cyan-600 rounded-t hover:bg-cyan-500 transition-colors"
              style={{ height: `${(b.count / maxCount) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>t{bins[0].turn}</span>
        <span>t{bins[bins.length - 1].turn}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Captain matchup matrix (pairwise winrates)
// ─────────────────────────────────────────────────────────────────────────────

interface MatchupCell {
  wins: number;
  losses: number; // games where row-captain lost to col-captain (both present)
}

function CaptainMatchupMatrix({ games }: { games: SimGameResult[] }) {
  // Aggregate pairwise head-to-head results. For each game, for each pair of
  // distinct captains (row, col): if row-captain won, +1 to cell.wins;
  // otherwise (col-captain or third captain won, but specifically the row
  // lost to the col or anyone), +1 to cell.losses ONLY if col-captain won.
  // Simpler and clearer: winRate of row when col is also playing.
  const { captains, matrix } = useMemo(() => {
    const captainSet = new Set<string>();
    for (const g of games) for (const s of g.finalScores) captainSet.add(s.captain);
    const captains = Array.from(captainSet).sort();

    const matrix = new Map<string, MatchupCell>();
    const key = (a: string, b: string) => `${a}|${b}`;
    for (const a of captains) for (const b of captains) matrix.set(key(a, b), { wins: 0, losses: 0 });

    for (const g of games) {
      const winnerCaptain = g.winnerCaptain;
      const presentCaptains = new Set(g.finalScores.map(s => s.captain));
      for (const a of presentCaptains) {
        for (const b of presentCaptains) {
          if (a === b) continue;
          const cell = matrix.get(key(a, b))!;
          if (winnerCaptain === a) cell.wins += 1;
          else if (winnerCaptain === b) cell.losses += 1;
        }
      }
    }
    return { captains, matrix };
  }, [games]);

  if (captains.length < 2) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-2">Captain Matchup Matrix</h3>
        <div className="text-sm text-slate-500 italic">Need at least 2 captains across games to build a matchup matrix.</div>
      </div>
    );
  }

  const cellColor = (rate: number | null): string => {
    if (rate == null) return 'bg-slate-900 text-slate-600';
    if (rate >= 0.6) return 'bg-green-900/60 text-green-300';
    if (rate >= 0.5) return 'bg-green-950/50 text-green-400';
    if (rate >= 0.4) return 'bg-red-950/50 text-red-400';
    return 'bg-red-900/60 text-red-300';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
      <h3 className="text-lg font-bold text-white mb-1">Captain Matchup Matrix</h3>
      <div className="text-xs text-slate-500 mb-3">
        Row captain's win rate when column captain is also in the game. Green = row wins more; red = row loses.
      </div>
      <table className="text-xs font-mono">
        <thead>
          <tr>
            <th className="text-left pr-2 pb-1 text-slate-500">vs →</th>
            {captains.map(c => (
              <th key={c} className="text-center px-1 pb-1 text-slate-400 min-w-[60px] truncate">
                {(getCaptainById(c)?.name ?? c).slice(0, 8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {captains.map(row => (
            <tr key={row}>
              <td className="pr-2 py-0.5 text-slate-400 whitespace-nowrap">
                {(getCaptainById(row)?.name ?? row).slice(0, 10)}
              </td>
              {captains.map(col => {
                const cell = matrix.get(`${row}|${col}`)!;
                const total = cell.wins + cell.losses;
                const rate = total > 0 ? cell.wins / total : null;
                const isDiagonal = row === col;
                return (
                  <td
                    key={col}
                    className={clsx(
                      'text-center px-1 py-0.5 rounded',
                      isDiagonal ? 'bg-slate-900 text-slate-700' : cellColor(rate),
                    )}
                    title={
                      isDiagonal
                        ? '—'
                        : `${cell.wins} wins / ${cell.losses} losses over ${total} shared games`
                    }
                  >
                    {isDiagonal ? '—' : total === 0 ? '·' : `${Math.round((rate ?? 0) * 100)}%`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fame trajectory chart (avg fame per turn by strategy)
// ─────────────────────────────────────────────────────────────────────────────

const STRATEGY_STROKE: Record<string, string> = {
  balanced: '#94a3b8', // slate
  aggressive: '#f87171', // red
  economic: '#4ade80', // green
  explorer: '#60a5fa', // blue
  rush: '#c084fc', // purple
};

function FameTrajectory({ curves }: { curves: Record<string, number[]> }) {
  const series = Object.entries(curves).filter(([, arr]) => arr.length > 0);
  if (series.length === 0) return null;

  const maxTurns = Math.max(...series.map(([, arr]) => arr.length));
  const maxFame = Math.max(...series.flatMap(([, arr]) => arr), 25);
  const W = 600;
  const H = 220;
  const PAD_L = 30;
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 24;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const xAt = (turn: number) => PAD_L + (turn / Math.max(1, maxTurns - 1)) * plotW;
  const yAt = (fame: number) => PAD_T + plotH - (fame / maxFame) * plotH;

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-bold text-white mb-1">Fame Trajectory by Strategy</h3>
      <div className="text-xs text-slate-500 mb-3">
        Avg fame at each turn (across all players of that strategy, wins and losses).
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#475569" strokeWidth="1" />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke="#475569" strokeWidth="1" />
        {/* Y ticks every 5 fame */}
        {Array.from({ length: Math.ceil(maxFame / 5) + 1 }, (_, i) => i * 5).map(tick => (
          <g key={tick}>
            <line x1={PAD_L - 3} y1={yAt(tick)} x2={PAD_L} y2={yAt(tick)} stroke="#475569" />
            <text x={PAD_L - 6} y={yAt(tick) + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
              {tick}
            </text>
            <line x1={PAD_L} y1={yAt(tick)} x2={W - PAD_R} y2={yAt(tick)} stroke="#1e293b" strokeDasharray="2,2" />
          </g>
        ))}
        {/* X ticks */}
        {Array.from({ length: Math.min(11, maxTurns) }, (_, i) =>
          Math.round((i * (maxTurns - 1)) / Math.max(1, Math.min(10, maxTurns - 1))),
        ).map((tick, i) => (
          <g key={`x${i}`}>
            <line x1={xAt(tick)} y1={PAD_T + plotH} x2={xAt(tick)} y2={PAD_T + plotH + 3} stroke="#475569" />
            <text x={xAt(tick)} y={PAD_T + plotH + 14} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
              t{tick}
            </text>
          </g>
        ))}
        {/* Lines */}
        {series.map(([strategy, arr]) => {
          const points = arr
            .map((fame, i) => `${xAt(i)},${yAt(fame)}`)
            .join(' ');
          return (
            <polyline
              key={strategy}
              points={points}
              fill="none"
              stroke={STRATEGY_STROKE[strategy] ?? '#94a3b8'}
              strokeWidth="1.8"
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        {series.map(([strategy]) => (
          <div key={strategy} className="flex items-center gap-1">
            <span className="w-3 h-0.5" style={{ background: STRATEGY_STROKE[strategy] ?? '#94a3b8' }} />
            <span className="text-slate-300 capitalize">{strategy}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card impact (winrate delta: bought vs not bought)
// ─────────────────────────────────────────────────────────────────────────────

function CardImpact({ games }: { games: SimGameResult[] }) {
  const rows = useMemo(() => {
    // For each card, tally: games where winner bought it / games where loser bought it.
    // We read from playerSummaries (which has cardsBoughtByName).
    const wonWith: Record<string, number> = {};
    const wonWithout: Record<string, number> = {};
    const lostWith: Record<string, number> = {};
    const lostWithout: Record<string, number> = {};

    for (const g of games) {
      for (const s of g.playerSummaries as Array<{
        playerName: string;
        cardsBoughtByName?: Record<string, number>;
      }>) {
        const bought = new Set(Object.keys(s.cardsBoughtByName ?? {}));
        const isWinner = s.playerName === g.winnerName;
        // Collect all cards this game saw any buy of
        for (const card of bought) {
          if (isWinner) wonWith[card] = (wonWith[card] ?? 0) + 1;
          else lostWith[card] = (lostWith[card] ?? 0) + 1;
        }
      }
    }

    // Also count games where card was NOT bought by winner/loser respectively
    for (const g of games) {
      for (const s of g.playerSummaries as Array<{
        playerName: string;
        cardsBoughtByName?: Record<string, number>;
      }>) {
        const bought = new Set(Object.keys(s.cardsBoughtByName ?? {}));
        const isWinner = s.playerName === g.winnerName;
        // Walk every card that exists in our tallies
        for (const card of new Set([...Object.keys(wonWith), ...Object.keys(lostWith)])) {
          if (bought.has(card)) continue;
          if (isWinner) wonWithout[card] = (wonWithout[card] ?? 0) + 1;
          else lostWithout[card] = (lostWithout[card] ?? 0) + 1;
        }
      }
    }

    const allCards = new Set([...Object.keys(wonWith), ...Object.keys(lostWith)]);
    const rows = Array.from(allCards).map(card => {
      const withCount = (wonWith[card] ?? 0) + (lostWith[card] ?? 0);
      const withoutCount = (wonWithout[card] ?? 0) + (lostWithout[card] ?? 0);
      const withWinRate = withCount > 0 ? (wonWith[card] ?? 0) / withCount : 0;
      const withoutWinRate = withoutCount > 0 ? (wonWithout[card] ?? 0) / withoutCount : 0;
      const delta = withWinRate - withoutWinRate;
      return {
        card,
        plays: withCount,
        withWinRate,
        withoutWinRate,
        delta,
      };
    });

    // Only show cards with a meaningful sample — at least 10 buys or 10% of games
    const minSample = Math.max(10, Math.floor(games.length * 0.1));
    return rows
      .filter(r => r.plays >= minSample)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 20);
  }, [games]);

  if (rows.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-2">Card Impact</h3>
        <div className="text-sm text-slate-500 italic">Not enough games yet to produce statistically meaningful card impact data.</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-white">Card Impact (top 20 by |delta|)</h3>
      </div>
      <div className="text-xs text-slate-500 mb-3">
        Win rate of players who bought each card vs. win rate of players who didn't. Large positive deltas = card is "winning." Large negative deltas = card is a trap.
      </div>
      <table className="w-full text-xs">
        <thead className="text-slate-500 uppercase tracking-wider">
          <tr>
            <th className="text-left py-1">Card</th>
            <th className="text-right py-1">Plays</th>
            <th className="text-right py-1">Bought</th>
            <th className="text-right py-1">Not bought</th>
            <th className="text-right py-1">Δ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {rows.map(r => (
            <tr key={r.card} className="hover:bg-slate-900/40">
              <td className="py-1 text-slate-200">{r.card}</td>
              <td className="py-1 text-right text-slate-400">{r.plays}</td>
              <td className="py-1 text-right text-slate-300">{(r.withWinRate * 100).toFixed(0)}%</td>
              <td className="py-1 text-right text-slate-400">{(r.withoutWinRate * 100).toFixed(0)}%</td>
              <td
                className={clsx(
                  'py-1 text-right font-mono font-semibold',
                  r.delta > 0.1 ? 'text-green-400' : r.delta < -0.1 ? 'text-red-400' : 'text-slate-500',
                )}
              >
                {r.delta > 0 ? '+' : ''}
                {(r.delta * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level analysis view
// ─────────────────────────────────────────────────────────────────────────────

export function SimulationAnalysis({ results }: { results: SimulationResults }) {
  const anomalies = useMemo(() => detectAnomalies(results), [results]);

  return (
    <div className="space-y-4">
      {/* Auto-detected anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-amber-400 mb-2">🔍 Patterns Worth Noting</h3>
          <ul className="space-y-2">
            {anomalies.map((a, i) => (
              <li key={i} className="text-sm">
                <span
                  className={clsx(
                    'inline-block w-2 h-2 rounded-full mr-2 align-middle',
                    a.severity === 'warning' ? 'bg-amber-400' : 'bg-slate-400',
                  )}
                />
                <span className="font-semibold text-slate-200">{a.title}</span>
                <div className="text-slate-400 text-xs mt-0.5 ml-4">{a.detail}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {anomalies.length === 0 && (
        <div className="bg-green-950/30 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-green-400 mb-1">✓ No obvious anomalies</h3>
          <div className="text-sm text-slate-400">
            Captain + strategy win rates are within normal bounds, games aren't pacing wildly, and blowouts aren't excessive. Run more games (or a fixed matchup) to zoom in on a specific question.
          </div>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TurnLengthHistogram games={results.games} />
        <FameTrajectory curves={results.fameCurvesByStrategy} />
      </div>

      <CaptainMatchupMatrix games={results.games} />
      <CardImpact games={results.games} />
    </div>
  );
}
