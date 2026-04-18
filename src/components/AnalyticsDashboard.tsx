// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Analytics Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
// Pulls aggregated game stats from the server's /stats endpoint and displays
// summary cards, a captain leaderboard, player-count distribution, and a
// list of recent games. Feeds off the analytics the server has been logging
// to games.jsonl since multiplayer launched.

import { useEffect, useState } from 'react';
import { getCaptainById } from '@shared/data';

// ─────────────────────────────────────────────────────────────────────────────
// Types mirroring the server /stats response
// ─────────────────────────────────────────────────────────────────────────────

interface CaptainStats {
  captainId: string;
  plays: number;
  wins: number;
  winRate: number;
  avgFame: number | null;
  avgMissions: number | null;
}

interface RecentGame {
  winnerName: string;
  players?: Array<{ name: string; captainId: string | null }>;
  duration?: number;
  timestamp?: number;
}

interface AggregatedStats {
  totalGamesStarted: number;
  totalGamesFinished: number;
  totalAbandoned: number;
  totalRejoins: number;
  avgDurationMs: number | null;
  avgTurns: number | null;
  avgWinningFame: number | null;
  playerCountDistribution: Record<string, number>;
  captainStats: CaptainStats[];
  recentGames: RecentGame[];
  generatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function statsUrl(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsUrl = ((import.meta as any).env?.VITE_WS_URL as string) || 'ws://localhost:3001';
  // Convert ws:// → http:// and wss:// → https://
  return wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:') + '/stats';
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !isFinite(ms)) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function formatPercent(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function formatNumber(x: number | null | undefined, decimals = 1): string {
  if (x == null || !isFinite(x)) return '—';
  return x.toFixed(decimals);
}

function formatRelative(ts: number | undefined): string {
  if (!ts) return '—';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function captainName(id: string): string {
  return getCaptainById(id)?.name ?? id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsDashboardProps {
  onBack: () => void;
}

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(statsUrl());
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = (await res.json()) as AggregatedStats | { error: string };
        if (cancelled) return;
        if ('error' in data) {
          setError(data.error);
        } else {
          setStats(data);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="mb-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-sm transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-amber-500">Analytics</h1>
            <p className="text-slate-400 text-sm">Aggregated game stats across all online games</p>
          </div>
          {stats && (
            <div className="text-xs text-slate-500 text-right">
              Generated {formatRelative(stats.generatedAt)}
              <br />
              <button
                onClick={() => window.location.reload()}
                className="text-amber-500 hover:text-amber-400 underline"
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-slate-900 rounded-lg p-12 text-center text-slate-400">
            Loading stats from server…
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-6 text-red-200">
            <div className="font-bold mb-1">Couldn't load stats</div>
            <div className="text-sm text-red-300 font-mono">{error}</div>
            <div className="text-xs text-slate-400 mt-3">
              The /stats endpoint may be unreachable. Try again in a moment.
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Games Finished" value={stats.totalGamesFinished.toLocaleString()} />
              <StatCard
                label="Games Started"
                value={stats.totalGamesStarted.toLocaleString()}
                sub={stats.totalAbandoned ? `${stats.totalAbandoned} abandoned` : undefined}
              />
              <StatCard label="Avg Duration" value={formatDuration(stats.avgDurationMs)} />
              <StatCard label="Avg Turns" value={formatNumber(stats.avgTurns, 1)} />
              <StatCard label="Avg Winning Fame" value={formatNumber(stats.avgWinningFame, 1)} />
            </div>

            {/* Captain leaderboard */}
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-bold text-amber-500">Captain Leaderboard</h2>
                <span className="text-xs text-slate-500">Sorted by games played</span>
              </div>
              {stats.captainStats.length === 0 ? (
                <div className="p-6 text-slate-500 text-center text-sm">
                  No finished games yet. Play a round or two!
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-950/50">
                    <tr>
                      <th className="px-5 py-2 text-left font-semibold">Captain</th>
                      <th className="px-5 py-2 text-right font-semibold">Plays</th>
                      <th className="px-5 py-2 text-right font-semibold">Wins</th>
                      <th className="px-5 py-2 text-right font-semibold">Win Rate</th>
                      <th className="px-5 py-2 text-right font-semibold">Avg Fame</th>
                      <th className="px-5 py-2 text-right font-semibold">Avg Missions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {stats.captainStats.map((cs) => (
                      <tr key={cs.captainId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-2.5 font-semibold">{captainName(cs.captainId)}</td>
                        <td className="px-5 py-2.5 text-right text-slate-300">{cs.plays}</td>
                        <td className="px-5 py-2.5 text-right text-slate-300">{cs.wins}</td>
                        <td
                          className={`px-5 py-2.5 text-right font-semibold ${
                            cs.winRate >= 0.5
                              ? 'text-green-400'
                              : cs.winRate >= 0.3
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatPercent(cs.winRate)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-slate-300">
                          {formatNumber(cs.avgFame, 1)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-slate-300">
                          {formatNumber(cs.avgMissions, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Player count distribution */}
            {Object.keys(stats.playerCountDistribution).length > 0 && (
              <div className="bg-slate-900 rounded-lg p-5">
                <h2 className="font-bold text-amber-500 mb-3">Games by Player Count</h2>
                <div className="space-y-2">
                  {Object.entries(stats.playerCountDistribution)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([count, games]) => {
                      const maxGames = Math.max(
                        ...Object.values(stats.playerCountDistribution),
                      );
                      const pct = maxGames > 0 ? (games / maxGames) * 100 : 0;
                      return (
                        <div key={count} className="flex items-center gap-3">
                          <div className="w-16 text-slate-300 text-sm">{count}-player</div>
                          <div className="flex-1 bg-slate-950 rounded h-6 overflow-hidden">
                            <div
                              className="h-full bg-amber-600 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="w-16 text-right text-slate-300 text-sm">{games} games</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Recent games */}
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800">
                <h2 className="font-bold text-amber-500">Recent Games</h2>
              </div>
              {stats.recentGames.length === 0 ? (
                <div className="p-6 text-slate-500 text-center text-sm">No games yet.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {stats.recentGames.map((g, i) => (
                    <div
                      key={i}
                      className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-semibold text-amber-400">{g.winnerName}</span>
                          <span className="text-slate-500"> won — </span>
                          <span className="text-slate-300">
                            {g.players
                              ?.map((p) =>
                                `${p.name}${p.captainId ? ` (${captainName(p.captainId)})` : ''}`,
                              )
                              .join(', ') ?? 'players unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 text-right ml-4 whitespace-nowrap">
                        <div>{formatDuration(g.duration)}</div>
                        <div>{formatRelative(g.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
