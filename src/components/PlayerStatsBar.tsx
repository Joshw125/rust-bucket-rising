// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Player Stats Bar Component
// Compact horizontal bar showing captain + systems + resources
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player, SystemType, CardInstance, MissionInstance, ActionCard } from '@/types';
import { SYSTEM_CONFIG, MAX_POWER } from '@/data/constants';
import { Card, MissionCard } from './Card';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerStatsBarProps {
  player: Player;
  isCurrentPlayer: boolean;
  onActivateSystem?: (system: SystemType, abilityIndex: number) => void;
  layout?: 'horizontal' | 'vertical';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get captain image path
// ─────────────────────────────────────────────────────────────────────────────

function getCaptainImagePath(captainId: string): string {
  const filename = captainId.charAt(0).toUpperCase() + captainId.slice(1);
  return `/cards/captain/${filename}.png`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Power Pips Component
// ─────────────────────────────────────────────────────────────────────────────

interface PowerPipsProps {
  system: SystemType;
  current: number;
  max?: number;
}

function PowerPips({ system, current, max = MAX_POWER }: PowerPipsProps) {
  const config = SYSTEM_CONFIG[system];

  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={clsx(
            'w-4 h-4 rounded-full border-2 transition-all',
            i < current
              ? 'power-pip-overlay filled'
              : 'power-pip-overlay',
          )}
          style={{ color: config.color, borderColor: config.color }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Panel Component (Compact)
// ─────────────────────────────────────────────────────────────────────────────

interface SystemPanelProps {
  system: SystemType;
  player: Player;
  isCurrentPlayer: boolean;
  onActivate?: (abilityIndex: number) => void;
}

function SystemPanel({ system, player, isCurrentPlayer, onActivate }: SystemPanelProps) {
  const config = SYSTEM_CONFIG[system];
  const currentPower = player.currentPower[system];
  const usedAbilities = player.usedSystemAbilities?.[system] ?? [];

  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-lg',
        'bg-slate-900/80 border',
      )}
      style={{ borderColor: `${config.color}50` }}
    >
      {/* System name */}
      <span
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: config.color }}
      >
        {config.name}
      </span>

      {/* Power pips */}
      <PowerPips system={system} current={currentPower} />

      {/* Ability buttons */}
      <div className="flex gap-1 mt-1">
        {config.abilities.map((ability, idx) => {
          const isUsed = usedAbilities[idx] ?? false;
          const canActivate = isCurrentPlayer && currentPower >= ability.cost && !isUsed;

          return (
            <button
              key={idx}
              className={clsx(
                'px-2 py-0.5 rounded text-xs font-bold transition-all',
                canActivate
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed',
                isUsed && 'line-through opacity-50',
              )}
              onClick={() => canActivate && onActivate?.(idx)}
              disabled={!canActivate}
              title={ability.description}
              style={canActivate ? { color: config.color } : undefined}
            >
              {ability.cost}⚡
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expanded System Panel Component (Shows abilities explicitly)
// ─────────────────────────────────────────────────────────────────────────────

interface ExpandedSystemPanelProps {
  system: SystemType;
  player: Player;
  isCurrentPlayer: boolean;
  onActivate?: (abilityIndex: number) => void;
}

// Hover preview component for installed cards - uses fixed position to escape overflow
function InstallationPreview({
  card,
  hoverPos,
}: {
  card: CardInstance;
  hoverPos: { x: number; y: number };
}) {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: hoverPos.x,
        top: hoverPos.y,
        transform: 'translate(-100%, -50%)',
        zIndex: 9999,
      }}
    >
      <Card card={card} size="normal" />
    </div>
  );
}

// Hover preview for gear (mission) cards - uses fixed position to escape overflow
function GearPreview({
  mission,
  hoverPos,
}: {
  mission: MissionInstance;
  hoverPos: { x: number; y: number };
}) {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: hoverPos.x,
        top: hoverPos.y,
        transform: 'translate(-100%, -50%)',
        zIndex: 9999,
      }}
    >
      <MissionCard mission={mission} size="normal" />
    </div>
  );
}

export function ExpandedSystemPanel({ system, player, isCurrentPlayer, onActivate }: ExpandedSystemPanelProps) {
  const config = SYSTEM_CONFIG[system];
  const currentPower = player.currentPower[system];
  const usedAbilities = player.usedSystemAbilities?.[system] ?? [];

  // Get installed card and gear for this system
  const installedCard = player.installations[system];
  const installedGear = player.gearInstallations[system];

  // Hover state for previews
  const [hoveringCard, setHoveringCard] = useState(false);
  const [hoveringGear, setHoveringGear] = useState(false);
  const [cardHoverPos, setCardHoverPos] = useState({ x: 0, y: 0 });
  const [gearHoverPos, setGearHoverPos] = useState({ x: 0, y: 0 });

  const handleCardMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCardHoverPos({ x: rect.left - 10, y: rect.top + rect.height / 2 });
    setHoveringCard(true);
  };

  const handleGearMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGearHoverPos({ x: rect.left - 10, y: rect.top + rect.height / 2 });
    setHoveringGear(true);
  };

  return (
    <div
      className={clsx(
        'rounded-lg bg-slate-900/80 border overflow-hidden',
      )}
      style={{ borderColor: `${config.color}40` }}
    >
      {/* Header: System name + Power pips */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: `${config.color}15` }}
      >
        <span
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: config.color }}
        >
          {config.name}
        </span>
        <PowerPips system={system} current={currentPower} />
      </div>

      {/* Installed Card & Gear */}
      {(installedCard || installedGear) && (
        <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700 space-y-1">
          {installedCard && (
            <div
              className="relative flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-700/50 rounded px-1 -mx-1"
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={() => setHoveringCard(false)}
            >
              <span className="text-amber-400">⚙️</span>
              <span className="text-slate-300 truncate" title={installedCard.title}>
                {installedCard.title}
              </span>
              <span className="text-slate-500 text-[10px]">
                {(installedCard as ActionCard).installEffect || 'Installed'}
              </span>
              {hoveringCard && <InstallationPreview card={installedCard} hoverPos={cardHoverPos} />}
            </div>
          )}
          {installedGear && (
            <div
              className="relative flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-700/50 rounded px-1 -mx-1"
              onMouseEnter={handleGearMouseEnter}
              onMouseLeave={() => setHoveringGear(false)}
            >
              <span className="text-purple-400">⚙️</span>
              <span className="text-slate-300 truncate" title={installedGear.title}>
                {installedGear.title}
              </span>
              <span className="text-slate-500 text-[10px]">
                {installedGear.reward}
              </span>
              {hoveringGear && <GearPreview mission={installedGear} hoverPos={gearHoverPos} />}
            </div>
          )}
        </div>
      )}

      {/* Abilities list - each on its own row */}
      <div className="divide-y divide-slate-800">
        {config.abilities.map((ability, idx) => {
          const isUsed = usedAbilities[idx] ?? false;
          const canActivate = isCurrentPlayer && currentPower >= ability.cost && !isUsed;

          return (
            <div
              key={idx}
              className={clsx(
                'flex items-center gap-2 px-3 py-2',
                isUsed && 'opacity-40',
              )}
            >
              {/* Ability button */}
              <button
                className={clsx(
                  'flex-none w-10 h-8 rounded font-bold text-sm transition-all',
                  canActivate
                    ? 'hover:scale-105 shadow-md'
                    : 'cursor-not-allowed',
                  isUsed && 'line-through',
                )}
                style={{
                  backgroundColor: canActivate ? config.color : '#374151',
                  color: canActivate ? 'white' : '#6b7280',
                }}
                onClick={() => canActivate && onActivate?.(idx)}
                disabled={!canActivate}
              >
                {ability.cost}⚡
              </button>

              {/* Ability description */}
              <span
                className={clsx(
                  'flex-1 text-xs',
                  canActivate ? 'text-slate-200' : 'text-slate-500',
                  isUsed && 'line-through',
                )}
              >
                {ability.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Player Stats Bar Component
// ─────────────────────────────────────────────────────────────────────────────

export function PlayerStatsBar({
  player,
  isCurrentPlayer,
  onActivateSystem,
  layout = 'horizontal',
}: PlayerStatsBarProps) {
  const captainImg = getCaptainImagePath(player.captain.id);

  // Vertical layout for sidebar - just the systems grid
  if (layout === 'vertical') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <SystemPanel
          system="weapons"
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('weapons', idx)}
        />
        <SystemPanel
          system="computers"
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('computers', idx)}
        />
        <SystemPanel
          system="engines"
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('engines', idx)}
        />
        <SystemPanel
          system="logistics"
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('logistics', idx)}
        />
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-2 bg-slate-950/60 backdrop-blur-sm rounded-xl border border-amber-900/30">
      {/* Captain portrait + info */}
      <div className="flex items-center gap-3">
        <img
          src={captainImg}
          alt={player.captain.name}
          className="w-16 h-12 rounded object-cover border border-amber-600/50"
        />
        <div className="text-left">
          <div className="text-amber-400 font-bold">{player.name}</div>
          <div className="text-slate-500 text-xs">{player.captain.name}</div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-12 bg-amber-900/30" />

      {/* Fame & Credits */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-amber-400 text-lg">★</span>
          <span className="text-amber-400 font-bold text-xl">{player.fame}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-amber-300">💰</span>
          <span className="text-amber-300 font-semibold">{player.credits}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-12 bg-amber-900/30" />

      {/* All 4 Systems */}
      <div className="flex gap-2">
        <SystemPanel
          system="weapons"
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('weapons', idx)}
        />
        <SystemPanel
          system="computers"
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('computers', idx)}
        />
        <SystemPanel
          system="engines"
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('engines', idx)}
        />
        <SystemPanel
          system="logistics"
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('logistics', idx)}
        />
      </div>

      {/* Divider */}
      <div className="w-px h-12 bg-amber-900/30" />

      {/* Deck stats */}
      <div className="flex gap-3 text-xs text-slate-400">
        <div className="flex flex-col items-center">
          <span className="font-bold text-slate-300">{player.deck.length}</span>
          <span>Deck</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-slate-300">{player.discard.length}</span>
          <span>Discard</span>
        </div>
        <div className="flex flex-col items-center">
          <span className={clsx('font-bold', player.hazardsInDeck > 0 ? 'text-red-400' : 'text-green-400')}>
            {player.hazardsInDeck}
          </span>
          <span>Hazards</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-amber-400">{player.completedMissions.length}</span>
          <span>Missions</span>
        </div>
      </div>

      {/* Free moves indicator */}
      {player.movesRemaining > 0 && (
        <>
          <div className="w-px h-12 bg-amber-900/30" />
          <div className="flex items-center gap-1 px-2 py-1 bg-engines/20 rounded border border-engines/40">
            <span className="text-engines font-bold">{player.movesRemaining}</span>
            <span className="text-engines text-xs">Free Move{player.movesRemaining > 1 ? 's' : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default PlayerStatsBar;
