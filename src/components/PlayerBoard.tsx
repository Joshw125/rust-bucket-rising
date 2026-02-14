// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Player Board Component
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player, SystemType, CardInstance, ActionCard, MissionInstance, HazardCard } from '@/types';
import { Card } from './Card';
import { SYSTEM_CONFIG, MAX_POWER, SYSTEMS } from '@/data/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerBoardProps {
  player: Player;
  isCurrentPlayer: boolean;
  onPlayCard?: (card: CardInstance) => void;
  onInstallCard?: (card: CardInstance, system: SystemType) => void;
  onActivateSystem?: (system: SystemType, abilityIndex: number) => void;
  onViewCard?: (card: CardInstance) => void;
  onClearHazard?: (card: CardInstance) => void;
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fame Track Component
// ─────────────────────────────────────────────────────────────────────────────

interface FameTrackProps {
  fame: number;
  maxFame?: number;
}

function FameTrack({ fame, maxFame = 25 }: FameTrackProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Star icon with glow */}
      <span className="fame-star text-xl">★</span>
      <span className="text-amber-400 font-bold text-sm uppercase tracking-wide">Fame</span>

      {/* Fame numbers - show 1-10 in styled boxes */}
      <div className="flex gap-0.5 ml-2">
        {Array.from({ length: Math.min(10, maxFame) }, (_, i) => i + 1).map(n => (
          <div
            key={n}
            className={clsx(
              'w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded transition-all',
              n <= fame
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-900 shadow-md shadow-amber-500/30'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-600',
            )}
          >
            {n}
          </div>
        ))}
      </div>

      {/* Fame count if over 10 */}
      {fame > 10 && (
        <span className="text-amber-400 font-bold ml-2 bg-amber-500/20 px-2 py-0.5 rounded">+{fame - 10}</span>
      )}

      {/* Victory threshold indicator */}
      <span className="text-slate-500 text-xs ml-2">/ 25 to win</span>
    </div>
  );
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
            'w-3 h-3 rounded-full border-2 transition-colors',
            i < current
              ? `${config.bgClass} ${config.borderClass}`
              : 'bg-transparent border-slate-600',
          )}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Panel Component
// ─────────────────────────────────────────────────────────────────────────────

interface SystemPanelProps {
  system: SystemType;
  current: number;
  starting: number;
  installation: CardInstance | null;
  gearInstallation: MissionInstance | null;
  usedAbilities: boolean[];
  onActivate?: (abilityIndex: number) => void;
  onViewInstallation?: (card: CardInstance) => void;
  onViewGear?: (gear: MissionInstance) => void;
  isCurrentPlayer: boolean;
}

function SystemPanel({ system, current, installation, gearInstallation, usedAbilities, onActivate, onViewInstallation, onViewGear, isCurrentPlayer }: SystemPanelProps) {
  const config = SYSTEM_CONFIG[system];

  // Dynamic hover class based on system
  const hoverBgClass = {
    weapons: 'hover:bg-weapons/20',
    computers: 'hover:bg-computers/20',
    engines: 'hover:bg-engines/20',
    logistics: 'hover:bg-logistics/20',
  }[system];

  return (
    <div className={clsx(
      'rounded-lg border-2 p-2',
      config.borderClass,
      'bg-slate-900/80',
    )}>
      {/* Header with name and power pips */}
      <div className="flex items-center justify-between mb-2">
        <span className={clsx('text-xs font-bold uppercase tracking-wide', config.textClass)}>
          {config.name}
        </span>
        <PowerPips system={system} current={current} />
      </div>

      {/* Abilities */}
      <div className="space-y-1">
        {config.abilities.map((ability, idx) => {
          const isUsed = usedAbilities[idx] ?? false;
          const canActivate = isCurrentPlayer && current >= ability.cost && !isUsed;
          return (
            <button
              key={idx}
              className={clsx(
                'w-full text-left px-2 py-1 rounded text-[11px] transition-all',
                isUsed
                  ? 'bg-slate-900/50 text-slate-600 cursor-not-allowed line-through'
                  : canActivate
                    ? `bg-slate-800 ${hoverBgClass} text-slate-200 cursor-pointer border border-transparent hover:border-${system === 'weapons' ? 'weapons' : system === 'computers' ? 'computers' : system === 'engines' ? 'engines' : 'logistics'}/50`
                    : 'bg-slate-900/50 text-slate-600 cursor-not-allowed',
              )}
              onClick={() => onActivate?.(idx)}
              disabled={!canActivate}
            >
              <span className={clsx(config.textClass, 'font-bold', isUsed && 'line-through')}>{ability.cost}⚡</span>{' '}
              {ability.description}
              {isUsed && <span className="ml-2 text-[9px] text-slate-500">(used)</span>}
            </button>
          );
        })}
      </div>

      {/* Installation slots - Card and/or Gear */}
      <div className="mt-2 space-y-1">
        {/* Card Installation */}
        {installation ? (
          <button
            className="p-1.5 bg-slate-800 rounded border border-slate-600 w-full text-left hover:bg-slate-700 hover:border-amber-500/50 transition-colors cursor-pointer"
            onClick={() => onViewInstallation?.(installation)}
            title={`Click to view ${installation.title}`}
          >
            <div className="text-[9px] text-slate-500 uppercase">🔧 Card</div>
            <div className="text-[11px] text-amber-400 font-medium truncate">{installation.title}</div>
            {/* Show install effect preview */}
            {(installation as any).installEffect && (
              <div className="text-[9px] text-slate-400 truncate mt-0.5">
                {(installation as any).installEffect}
              </div>
            )}
          </button>
        ) : !gearInstallation && (
          <div className="p-1.5 border border-dashed border-slate-700/50 rounded">
            <div className="text-[9px] text-slate-600 text-center">Empty Slot</div>
          </div>
        )}

        {/* Gear Installation (from completed mission) */}
        {gearInstallation && (
          <button
            className="p-1.5 bg-gradient-to-r from-amber-900/30 to-amber-800/20 rounded border border-amber-600/40 w-full text-left hover:from-amber-900/40 hover:to-amber-800/30 hover:border-amber-500/60 transition-colors cursor-pointer"
            onClick={() => onViewGear?.(gearInstallation)}
            title={`Gear: ${gearInstallation.title}`}
          >
            <div className="text-[9px] text-amber-500 uppercase">⚙️ Gear</div>
            <div className="text-[11px] text-amber-300 font-medium truncate">{gearInstallation.title}</div>
            <div className="text-[9px] text-amber-400/70 truncate mt-0.5">
              {gearInstallation.reward}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Hand Component
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerHandProps {
  cards: CardInstance[];
  player: Player;
  selectedCard?: string;
  onSelectCard?: (card: CardInstance) => void;
  onPlayCard?: (card: CardInstance) => void;
  onInstallCard?: (card: CardInstance, system: SystemType) => void;
  onClearHazard?: (card: CardInstance) => void;
}

// Helper to check if player can afford to clear a hazard
function canClearHazard(player: Player, hazard: HazardCard): boolean {
  const cost = hazard.clearCost;

  // Check credits
  if (cost.credits && player.credits < cost.credits) return false;

  // Check power requirements
  if (cost.power) {
    for (const system of SYSTEMS) {
      if (cost.power[system] && player.currentPower[system] < cost.power[system]!) {
        return false;
      }
    }
  }

  // Check spend all (with minimum)
  if (cost.spendAll) {
    const available = player.currentPower[cost.spendAll];
    if (cost.min && available < cost.min) return false;
  }

  // Check power from different systems
  if (cost.powerFromDifferent) {
    const systemsWithPower = SYSTEMS.filter(s => player.currentPower[s] >= 1);
    if (systemsWithPower.length < cost.powerFromDifferent) return false;
  }

  // Check discard (simplified - just check if player has cards to discard)
  if (cost.discard) {
    const nonHazardCards = player.hand.filter(c => c.type !== 'hazard');
    if (nonHazardCards.length < cost.discard) return false;
  }

  return true;
}

function PlayerHand({ cards, player, selectedCard, onPlayCard, onInstallCard, onClearHazard }: PlayerHandProps) {
  // Track which card's install dropdown is open
  const [openInstallDropdown, setOpenInstallDropdown] = useState<string | null>(null);

  if (cards.length === 0) {
    return (
      <div className="text-center text-slate-500 py-4">
        No cards in hand
      </div>
    );
  }

  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {cards.map(card => {
        const isAction = card.type === 'action';
        const isHazard = card.type === 'hazard';
        const actionCard = isAction ? card as ActionCard & { instanceId: string } : null;
        const hazardCard = isHazard ? card as HazardCard & { instanceId: string } : null;
        const isInstallable = actionCard?.installCost !== undefined;
        const installCost = isInstallable ? actionCard!.installCost! - player.installDiscount : 0;
        const canAffordInstall = isInstallable && player.credits >= Math.max(0, installCost);
        const isDropdownOpen = openInstallDropdown === card.instanceId;
        const canClear = hazardCard ? canClearHazard(player, hazardCard) : false;

        return (
          <div key={card.instanceId} className="relative group pb-12">
            <Card
              card={card}
              size="normal"
              selected={card.instanceId === selectedCard}
              onClick={() => !isHazard && onPlayCard?.(card)}
            />

            {/* Action buttons - always visible below card */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {/* Play button (not for hazards) */}
              {card.type !== 'hazard' && (
                <button
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs px-2 py-1 rounded font-semibold whitespace-nowrap shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayCard?.(card);
                  }}
                >
                  Play
                </button>
              )}

              {/* Clear hazard button */}
              {isHazard && hazardCard && (
                <button
                  className={clsx(
                    'text-xs px-2 py-1 rounded font-semibold whitespace-nowrap shadow-lg',
                    canClear
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed',
                  )}
                  disabled={!canClear}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canClear) {
                      onClearHazard?.(card);
                    }
                  }}
                  title={hazardCard.clearCondition}
                >
                  Clear: {hazardCard.clearCondition}
                </button>
              )}

              {/* Install button with system dropdown */}
              {isInstallable && (
                <div className="relative">
                  <button
                    className={clsx(
                      'text-xs px-2 py-1 rounded font-semibold whitespace-nowrap shadow-lg',
                      canAffordInstall
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed',
                    )}
                    disabled={!canAffordInstall}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canAffordInstall) {
                        setOpenInstallDropdown(isDropdownOpen ? null : card.instanceId);
                      }
                    }}
                  >
                    Install ({Math.max(0, installCost)}💰) {isDropdownOpen ? '▼' : '▶'}
                  </button>

                  {/* System selection dropdown - click-based */}
                  {canAffordInstall && isDropdownOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col bg-slate-800 rounded border border-slate-600 shadow-lg overflow-hidden z-20">
                      {SYSTEMS.map(sys => (
                        <button
                          key={sys}
                          className={clsx(
                            'px-3 py-1.5 text-xs font-semibold hover:bg-slate-700 transition-colors capitalize whitespace-nowrap',
                            sys === 'weapons' && 'text-weapons-light',
                            sys === 'computers' && 'text-computers-light',
                            sys === 'engines' && 'text-engines-light',
                            sys === 'logistics' && 'text-logistics-light',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onInstallCard?.(card, sys);
                            setOpenInstallDropdown(null);
                          }}
                        >
                          → {sys}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Player Board Component
// ─────────────────────────────────────────────────────────────────────────────

export function PlayerBoard({
  player,
  isCurrentPlayer,
  onPlayCard,
  onInstallCard,
  onActivateSystem,
  onViewCard,
  onClearHazard,
  compact = false,
}: PlayerBoardProps) {

  if (compact) {
    return <CompactPlayerBoard player={player} isCurrentPlayer={isCurrentPlayer} />;
  }

  return (
    <div className={clsx(
      'rounded-xl border-2 overflow-hidden',
      isCurrentPlayer ? 'border-amber-600/60 shadow-lg shadow-amber-900/20' : 'border-amber-900/30',
      'game-panel',
    )}>
      {/* Header with player info */}
      <div className={clsx(
        'px-4 py-3 flex items-center justify-between',
        isCurrentPlayer ? 'game-header' : 'bg-slate-800/50',
      )}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-white">{player.name}</span>
          <span className="text-sm text-amber-500/70">• {player.captain.name}</span>
          {isCurrentPlayer && (
            <span className="text-xs bg-amber-500 text-slate-900 px-2 py-1 rounded-full font-bold uppercase tracking-wide animate-pulse">
              Your Turn
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-amber-400 text-lg">💰</span>
            <span className="font-bold text-amber-400 text-lg">{player.credits}</span>
          </div>
        </div>
      </div>

      {/* Fame Track */}
      <div className="px-4 py-2 border-b border-amber-900/20 bg-slate-800/30">
        <FameTrack fame={player.fame} />
      </div>

      {/* Main content - Ship board layout with balanced 2x2 system grid */}
      <div className="p-4">
        <div className="grid grid-cols-5 gap-3">
          {/* Left Systems Column */}
          <div className="col-span-1 space-y-3">
            <SystemPanel
              system="weapons"
              current={player.currentPower.weapons}
              starting={player.startingPower.weapons}
              installation={player.installations.weapons}
              gearInstallation={player.gearInstallations?.weapons ?? null}
              usedAbilities={player.usedSystemAbilities?.weapons ?? [false, false]}
              onActivate={(idx) => onActivateSystem?.('weapons', idx)}
              onViewInstallation={onViewCard}
              isCurrentPlayer={isCurrentPlayer}
            />
            <SystemPanel
              system="engines"
              current={player.currentPower.engines}
              starting={player.startingPower.engines}
              installation={player.installations.engines}
              gearInstallation={player.gearInstallations?.engines ?? null}
              usedAbilities={player.usedSystemAbilities?.engines ?? [false]}
              onActivate={(idx) => onActivateSystem?.('engines', idx)}
              onViewInstallation={onViewCard}
              isCurrentPlayer={isCurrentPlayer}
            />
          </div>

          {/* Center: Ship + Captain + Stats */}
          <div className="col-span-3">
            {/* Ship art placeholder */}
            <div className="w-full h-28 bg-gradient-to-b from-slate-700 to-slate-800 rounded-lg flex items-center justify-center border border-slate-600 mb-2">
              <div className="text-center">
                <div className="text-5xl mb-1">🚀</div>
              </div>
            </div>

            {/* Captain info */}
            <div className="text-center mb-3 bg-slate-800/50 rounded-lg p-2">
              <div className="font-bold text-amber-400 text-lg">{player.captain.name}</div>
              <div className="text-xs text-slate-400">{player.captain.effect}</div>
            </div>

            {/* Stats row - Card counts */}
            <div className="grid grid-cols-6 gap-1.5 text-center">
              <div className="bg-slate-800 rounded p-1.5">
                <div className="text-slate-500 text-[9px] uppercase">Deck</div>
                <div className="text-white font-bold">{player.deck.length}</div>
              </div>
              <div className="bg-slate-800 rounded p-1.5">
                <div className="text-slate-500 text-[9px] uppercase">Hand</div>
                <div className="text-amber-400 font-bold">{player.hand.length}</div>
              </div>
              <div className="bg-slate-800 rounded p-1.5">
                <div className="text-slate-500 text-[9px] uppercase">Played</div>
                <div className="text-blue-400 font-bold">{player.played.length}</div>
              </div>
              <div className="bg-slate-800 rounded p-1.5">
                <div className="text-slate-500 text-[9px] uppercase">Discard</div>
                <div className="text-slate-400 font-bold">{player.discard.length}</div>
              </div>
              <div className="bg-slate-800 rounded p-1.5">
                <div className="text-slate-500 text-[9px] uppercase">Hazards</div>
                <div className={clsx('font-bold', player.hazardsInDeck > 0 ? 'text-red-400' : 'text-green-400')}>
                  {player.hazardsInDeck}
                </div>
              </div>
              <div className="bg-slate-800 rounded p-1.5">
                <div className="text-slate-500 text-[9px] uppercase">Missions</div>
                <div className="text-amber-400 font-bold">{player.completedMissions.length}</div>
              </div>
            </div>
          </div>

          {/* Right Systems Column */}
          <div className="col-span-1 space-y-3">
            <SystemPanel
              system="computers"
              current={player.currentPower.computers}
              starting={player.startingPower.computers}
              installation={player.installations.computers}
              gearInstallation={player.gearInstallations?.computers ?? null}
              usedAbilities={player.usedSystemAbilities?.computers ?? [false, false]}
              onActivate={(idx) => onActivateSystem?.('computers', idx)}
              onViewInstallation={onViewCard}
              isCurrentPlayer={isCurrentPlayer}
            />
            <SystemPanel
              system="logistics"
              current={player.currentPower.logistics}
              starting={player.startingPower.logistics}
              installation={player.installations.logistics}
              gearInstallation={player.gearInstallations?.logistics ?? null}
              usedAbilities={player.usedSystemAbilities?.logistics ?? [false, false]}
              onActivate={(idx) => onActivateSystem?.('logistics', idx)}
              onViewInstallation={onViewCard}
              isCurrentPlayer={isCurrentPlayer}
            />
          </div>
        </div>
      </div>

      {/* Hand (only show if current player) */}
      {isCurrentPlayer && (
        <div className="border-t border-amber-900/30 p-4 bg-gradient-to-b from-slate-900/80 to-slate-950/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🃏</span>
              <span className="text-sm font-semibold text-slate-300">Your Hand</span>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                {player.hand.length}
              </span>
            </div>
            <span className="text-xs text-amber-500">Click a card to play it</span>
          </div>
          <PlayerHand
            cards={player.hand}
            player={player}
            onPlayCard={onPlayCard}
            onInstallCard={onInstallCard}
            onClearHazard={onClearHazard}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Player Board (for other players)
// ─────────────────────────────────────────────────────────────────────────────

function CompactPlayerBoard({
  player,
  isCurrentPlayer,
}: {
  player: Player;
  isCurrentPlayer: boolean;
}) {
  return (
    <div className={clsx(
      'rounded-lg border overflow-hidden',
      isCurrentPlayer ? 'border-amber-500' : 'border-slate-700',
      'bg-gradient-to-b from-slate-800 to-slate-900',
    )}>
      {/* Header */}
      <div className={clsx(
        'px-3 py-1.5 flex items-center justify-between',
        isCurrentPlayer ? 'bg-amber-500/20' : 'bg-slate-800',
      )}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-sm">{player.name}</span>
          <span className="text-xs text-slate-500">({player.captain.name})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-amber-400 font-semibold">★{player.fame}</span>
          <span className="text-slate-400">${player.credits}</span>
        </div>
      </div>

      {/* Systems grid */}
      <div className="p-2 grid grid-cols-2 gap-1">
        {(['weapons', 'computers', 'engines', 'logistics'] as SystemType[]).map(system => {
          const config = SYSTEM_CONFIG[system];
          return (
            <div
              key={system}
              className={clsx(
                'p-1 rounded border',
                config.borderClass,
                'bg-slate-900/60',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={clsx('text-[10px] font-semibold', config.textClass)}>
                  {config.name.substring(0, 3).toUpperCase()}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: MAX_POWER }, (_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'w-1.5 h-1.5 rounded-full',
                        i < player.currentPower[system] ? config.bgClass : 'bg-slate-700',
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="px-2 py-1 bg-slate-900/50 flex justify-between text-[10px] text-slate-500">
        <span>📍 Loc {player.location}</span>
        <span>🃏 {player.hand.length}</span>
        <span>📚 {player.deck.length}</span>
        <span>🏆 {player.completedMissions.length}</span>
      </div>
    </div>
  );
}

export default PlayerBoard;
