// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Market Display Component
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { clsx } from 'clsx';
import type { MarketStacks, MarketStackInfo, CardInstance, Player, SystemType, ActionCard } from '@/types';
import { CardStack } from './Card';
import { SYSTEMS } from '@/data/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketDisplayProps {
  marketStacks: MarketStacks;
  currentPlayer: Player;
  onBuyCard?: (station: 1 | 3 | 5, stackIndex: number) => void;
  onBuyAndInstall?: (station: 1 | 3 | 5, stackIndex: number, targetSystem: SystemType) => void;
  onViewCard?: (card: CardInstance) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Station Row Component
// ─────────────────────────────────────────────────────────────────────────────

interface StationRowProps {
  station: 1 | 3 | 5;
  stackInfos: MarketStackInfo[];
  currentPlayer: Player;
  onBuyCard?: (stackIndex: number) => void;
  onBuyAndInstall?: (stackIndex: number, targetSystem: SystemType) => void;
  onViewCard?: (card: CardInstance) => void;
}

function StationRow({
  station,
  stackInfos,
  currentPlayer,
  onBuyCard,
  onBuyAndInstall,
  onViewCard,
}: StationRowProps) {
  // Extract cards arrays from stack infos (only revealed stacks)
  const stacks = stackInfos.filter(s => s.revealed).map(s => s.cards);
  // Track which card's install dropdown is open
  const [openInstallDropdown, setOpenInstallDropdown] = useState<number | null>(null);

  const tierLabels = {
    1: { tier: 'Tier 1', name: 'Station 1 - Core Cards', zone: 'near' },
    3: { tier: 'Tier 2', name: 'Station 3 - Advanced', zone: 'mid' },
    5: { tier: 'Tier 3', name: 'Station 5 - Elite', zone: 'deep' },
  };

  const info = tierLabels[station];
  const isAtStation = currentPlayer.location === station;
  const zoneColors = {
    near: 'border-near/50 bg-near/5',
    mid: 'border-mid/50 bg-mid/5',
    deep: 'border-deep/50 bg-deep/5',
  };

  return (
    <div className={clsx(
      'rounded-lg border p-3',
      zoneColors[info.zone as 'near' | 'mid' | 'deep'],
      !isAtStation && 'opacity-60',
    )}>
      {/* Station header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Station icon */}
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-amber-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-500" fill="currentColor">
              <circle cx="12" cy="8" r="4" />
              <ellipse cx="12" cy="8" rx="8" ry="2" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="10" y="12" width="4" height="6" />
              <rect x="8" y="18" width="2" height="2" />
              <rect x="14" y="18" width="2" height="2" />
            </svg>
          </div>

          <div>
            <div className="font-bold text-white">{info.name}</div>
            <div className="text-xs text-slate-400">{info.tier}</div>
          </div>
        </div>

        {/* Status indicator */}
        {isAtStation ? (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
            You're Here - Can Buy
          </span>
        ) : (
          <span className="text-xs bg-slate-800 text-slate-500 px-2 py-1 rounded">
            Travel to Location {station}
          </span>
        )}
      </div>

      {/* Card stacks */}
      <div className="flex gap-4 justify-center flex-wrap">
        {stacks.map((stack, index) => {
          if (stack.length === 0) return null;

          const topCard = stack[stack.length - 1];
          const isAction = topCard.type === 'action';
          const actionCard = isAction ? topCard as ActionCard & { instanceId: string } : null;

          const buyCost = isAction ? Math.max(0, actionCard!.cost - currentPlayer.buyDiscount) : 0;
          const canAfford = isAction && currentPlayer.credits >= buyCost;
          const canBuy = isAtStation && canAfford;

          // Check if can buy AND install
          const isInstallable = actionCard?.installCost !== undefined;
          const installCost = isInstallable ? Math.max(0, actionCard!.installCost! - currentPlayer.installDiscount) : 0;
          const totalCost = buyCost + installCost;
          const canBuyAndInstall = isAtStation && isInstallable && currentPlayer.credits >= totalCost;

          return (
            <div key={index} className="flex flex-col items-center">
              <CardStack
                cards={stack}
                size="normal"
                showTopCard={true}
                onClick={() => onViewCard?.(topCard)}
              />

              {/* Buy buttons container - positioned below card naturally */}
              {isAtStation && (
                <div className="mt-2 flex flex-col gap-1 items-center">
                  {/* Buy only button */}
                  <button
                    className={clsx(
                      'px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap',
                      canBuy
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canBuy) onBuyCard?.(index);
                    }}
                    disabled={!canBuy}
                  >
                    Buy ({buyCost}💰)
                  </button>

                  {/* Buy + Install button (only for installable cards) */}
                  {isInstallable && (
                    <div className="relative">
                      <button
                        className={clsx(
                          'px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap',
                          canBuyAndInstall
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                        )}
                        disabled={!canBuyAndInstall}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canBuyAndInstall) {
                            setOpenInstallDropdown(openInstallDropdown === index ? null : index);
                          }
                        }}
                      >
                        Buy+Install ({totalCost}💰) {openInstallDropdown === index ? '▼' : '▶'}
                      </button>

                      {/* System selection dropdown - click-based */}
                      {canBuyAndInstall && openInstallDropdown === index && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col bg-slate-800 rounded border border-slate-600 shadow-lg overflow-hidden z-10">
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
                                onBuyAndInstall?.(index, sys);
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
              )}

              {/* Placeholder spacing for when not at station */}
              {!isAtStation && <div className="h-14" />}
            </div>
          );
        })}

        {/* Empty state */}
        {stacks.filter(s => s.length > 0).length === 0 && (
          <div className="text-slate-500 text-sm py-8">
            No cards available at this station
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Market Display Component
// ─────────────────────────────────────────────────────────────────────────────

export function MarketDisplay({
  marketStacks,
  currentPlayer,
  onBuyCard,
  onBuyAndInstall,
  onViewCard,
}: MarketDisplayProps) {
  return (
    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-amber-500">MARKET STATIONS</h2>
        <p className="text-xs text-slate-500">
          Buy cards at stations to improve your deck (Credits: {currentPlayer.credits}
          {currentPlayer.buyDiscount > 0 && ` | Discount: -${currentPlayer.buyDiscount}`})
        </p>
      </div>

      {/* Station rows */}
      <div className="space-y-8">
        <StationRow
          station={1}
          stackInfos={marketStacks[1]}
          currentPlayer={currentPlayer}
          onBuyCard={(idx) => onBuyCard?.(1, idx)}
          onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(1, idx, sys)}
          onViewCard={onViewCard}
        />

        <StationRow
          station={3}
          stackInfos={marketStacks[3]}
          currentPlayer={currentPlayer}
          onBuyCard={(idx) => onBuyCard?.(3, idx)}
          onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(3, idx, sys)}
          onViewCard={onViewCard}
        />

        <StationRow
          station={5}
          stackInfos={marketStacks[5]}
          currentPlayer={currentPlayer}
          onBuyCard={(idx) => onBuyCard?.(5, idx)}
          onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(5, idx, sys)}
          onViewCard={onViewCard}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Market (for side panel)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompactMarketProps {
  marketStacks: MarketStacks;
  currentLocation: number;
  onViewStation?: (station: 1 | 3 | 5) => void;
}

export function CompactMarket({
  marketStacks,
  currentLocation,
  onViewStation,
}: CompactMarketProps) {
  const stations = [1, 3, 5] as const;

  return (
    <div className="space-y-2">
      {stations.map(station => {
        const stackInfos = marketStacks[station];
        const totalCards = stackInfos.reduce((sum, s) => sum + s.cards.length, 0);
        const isHere = currentLocation === station;

        return (
          <div
            key={station}
            className={clsx(
              'p-2 rounded-lg border cursor-pointer transition-colors',
              isHere
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800',
            )}
            onClick={() => onViewStation?.(station)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  isHere ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300',
                )}>
                  {station}
                </div>
                <span className="text-sm text-white">
                  Station {station} <span className="text-slate-500">(Tier {station === 1 ? 1 : station === 3 ? 2 : 3})</span>
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {totalCards} cards
              </span>
            </div>
            {isHere && (
              <div className="mt-1 text-xs text-amber-400">
                Click to browse
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Overlay (slide-out panel)
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  marketStacks: MarketStacks;
  currentPlayer: Player;
  onBuyCard?: (station: 1 | 3 | 5, stackIndex: number) => void;
  onBuyAndInstall?: (station: 1 | 3 | 5, stackIndex: number, targetSystem: SystemType) => void;
  onViewCard?: (card: CardInstance) => void;
}

export function MarketOverlay({
  isOpen,
  onClose,
  marketStacks,
  currentPlayer,
  onBuyCard,
  onBuyAndInstall,
  onViewCard,
}: MarketOverlayProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx('market-backdrop', isOpen && 'open')}
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className={clsx('market-overlay scrollbar-thin', isOpen && 'open')}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-900/95 border-b border-amber-600/30">
          <div>
            <h2 className="text-xl font-bold text-amber-500">MARKET STATIONS</h2>
            <p className="text-xs text-slate-400">
              Credits: <span className="text-amber-400 font-bold">{currentPlayer.credits}</span>
              {currentPlayer.buyDiscount > 0 && (
                <span className="text-green-400 ml-2">-{currentPlayer.buyDiscount} discount</span>
              )}
            </p>
          </div>
          <button
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Station rows */}
        <div className="p-4 space-y-6">
          <StationRow
            station={1}
            stackInfos={marketStacks[1]}
            currentPlayer={currentPlayer}
            onBuyCard={(idx) => onBuyCard?.(1, idx)}
            onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(1, idx, sys)}
            onViewCard={onViewCard}
          />

          <StationRow
            station={3}
            stackInfos={marketStacks[3]}
            currentPlayer={currentPlayer}
            onBuyCard={(idx) => onBuyCard?.(3, idx)}
            onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(3, idx, sys)}
            onViewCard={onViewCard}
          />

          <StationRow
            station={5}
            stackInfos={marketStacks[5]}
            currentPlayer={currentPlayer}
            onBuyCard={(idx) => onBuyCard?.(5, idx)}
            onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(5, idx, sys)}
            onViewCard={onViewCard}
          />
        </div>
      </div>
    </>
  );
}

export default MarketDisplay;
