// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Opponent Bar Component
// Compact top bar showing other players' status
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player, SystemType } from '@shared/types';
import { SYSTEM_CONFIG, SYSTEMS, MAX_POWER } from '@shared/data/constants';
import { PLAYER_COLORS } from './SpaceTrack';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OpponentBarProps {
  opponents: Player[];
  allPlayers?: Player[];  // Full player list for color index lookup
  layout?: 'horizontal' | 'vertical';
  onViewPlayer?: (player: Player) => void;
  onViewCaptain?: (captain: Player['captain']) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get captain image path
// ─────────────────────────────────────────────────────────────────────────────

function getCaptainImagePath(captainId: string): string {
  // Captain IDs are like "scrapper", "veteran", etc.
  // Files are like "Scrapper.png", "Veteran.png"
  const filename = captainId.charAt(0).toUpperCase() + captainId.slice(1);
  return `/cards/captain/${filename}.png`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Power Pips
// ─────────────────────────────────────────────────────────────────────────────

function MiniPowerPips({ system, current }: { system: SystemType; current: number }) {
  const config = SYSTEM_CONFIG[system];

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: MAX_POWER }, (_, i) => (
        <div
          key={i}
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            i < current ? config.bgClass : 'bg-slate-700',
          )}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Opponent Mini Card (collapsed view)
// ─────────────────────────────────────────────────────────────────────────────

interface OpponentMiniProps {
  player: Player;
  playerIndex: number;
  expanded: boolean;
  onToggle: () => void;
}

function OpponentMini({ player, playerIndex, expanded, onToggle }: OpponentMiniProps) {
  const captainImg = getCaptainImagePath(player.captain.id);
  const pColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

  return (
    <div
      className={clsx('opponent-mini', expanded && 'expanded')}
      onClick={onToggle}
    >
      {/* Collapsed view */}
      <div className="flex items-center gap-2">
        {/* Captain thumbnail */}
        <img
          src={captainImg}
          alt={player.captain.name}
          className="opponent-mini-avatar"
          onError={(e) => {
            // Fallback if image fails
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Name */}
        <span className={clsx('font-semibold text-sm', pColor.text)}>{player.name}</span>

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-amber-400 font-bold">★{player.fame}</span>
          <span className="text-slate-400">${player.credits}</span>
          <span className="text-slate-500">📍{player.location}</span>
          <span className="text-slate-500">🃏{player.hand.length}</span>
        </div>

        {/* Expand indicator */}
        <span className="text-slate-500 text-xs ml-1">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 w-full">
          {/* Power pips for all systems */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {SYSTEMS.map(system => {
              const config = SYSTEM_CONFIG[system];
              return (
                <div key={system} className="flex items-center gap-2">
                  <span className={clsx('text-[10px] font-semibold w-8', config.textClass)}>
                    {config.name.substring(0, 3).toUpperCase()}
                  </span>
                  <MiniPowerPips system={system} current={player.currentPower[system]} />
                </div>
              );
            })}
          </div>

          {/* Additional stats */}
          <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
            <span>Deck: {player.deck.length}</span>
            <span>Discard: {player.discard.length}</span>
            <span>Missions: {player.completedMissions.length}</span>
            <span>Hazards: {player.hazardsInDeck}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Opponent Bar Component
// ─────────────────────────────────────────────────────────────────────────────

export function OpponentBar({ opponents, allPlayers, layout = 'horizontal', onViewPlayer, onViewCaptain }: OpponentBarProps) {
  // Helper to get player index for color lookup
  const getPlayerIndex = (opponent: Player): number => {
    if (allPlayers) return allPlayers.findIndex(p => p.id === opponent.id);
    return 0;
  };
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (opponents.length === 0) {
    return (
      <div className="text-slate-600 text-sm italic">No opponents</div>
    );
  }

  // Vertical layout for sidebar
  if (layout === 'vertical') {
    return (
      <div className="flex flex-col gap-2">
        {opponents.map(opponent => {
          const captainImg = getCaptainImagePath(opponent.captain.id);
          const isExpanded = expandedId === opponent.id;

          const pIndex = getPlayerIndex(opponent);
          const pColor = PLAYER_COLORS[pIndex % PLAYER_COLORS.length];

          return (
            <div
              key={opponent.id}
              className="bg-slate-900/60 rounded-lg p-2 cursor-pointer hover:bg-slate-900/80 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : opponent.id)}
            >
              {/* Header row */}
              <div className="flex items-center gap-2">
                <img
                  src={captainImg}
                  alt={opponent.captain.name}
                  className={clsx('w-8 h-8 rounded object-cover border cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all', `border-${pColor.hex === '#a855f7' ? 'purple' : pColor.hex === '#fb923c' ? 'orange' : pColor.hex === '#67e8f9' ? 'cyan' : 'pink'}-500/50`)}
                  style={{ borderColor: pColor.hex + '80' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewCaptain?.(opponent.captain);
                  }}
                  title={`View ${opponent.captain.name}'s ability`}
                />
                <div className="flex-1 min-w-0">
                  <div className={clsx('text-sm font-semibold truncate', pColor.text)}>{opponent.name}</div>
                  <div
                    className="text-slate-500 text-xs cursor-pointer hover:text-amber-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewCaptain?.(opponent.captain);
                    }}
                  >{opponent.captain.name}</div>
                </div>
                <div className="text-amber-400 font-bold text-sm">★{opponent.fame}</div>
              </div>

              {/* Quick stats row */}
              <div className="flex justify-between mt-1 text-xs text-slate-400">
                <span>📍{opponent.location}</span>
                <span>💰{opponent.credits}</span>
                <span>🃏{opponent.hand.length}</span>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-slate-700/50">
                  <div className="grid grid-cols-2 gap-1">
                    {SYSTEMS.map(system => {
                      const config = SYSTEM_CONFIG[system];
                      return (
                        <div key={system} className="flex items-center gap-1">
                          <span className={clsx('text-[10px] w-6', config.textClass)}>
                            {config.name.substring(0, 3)}
                          </span>
                          <MiniPowerPips system={system} current={opponent.currentPower[system]} />
                        </div>
                      );
                    })}
                  </div>
                  {onViewPlayer && (
                    <button
                      className="mt-2 w-full text-[10px] font-semibold text-slate-400 hover:text-amber-400 hover:bg-slate-800 py-1 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPlayer(opponent);
                      }}
                    >
                      View Full Tableau
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className="opponent-bar">
      {opponents.map(opponent => (
        <OpponentMini
          key={opponent.id}
          player={opponent}
          playerIndex={getPlayerIndex(opponent)}
          expanded={expandedId === opponent.id}
          onToggle={() => setExpandedId(
            expandedId === opponent.id ? null : opponent.id
          )}
        />
      ))}
    </div>
  );
}

export default OpponentBar;
