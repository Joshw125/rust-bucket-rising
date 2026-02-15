// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Pyramid Market Component
// Market cards arranged in pyramid: Tier 3 top, Tier 2 middle, Tier 1 bottom
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import type { MarketStacks, MarketStackInfo, CardInstance, Player, SystemType, ActionCard } from '@/types';
import { CardStack, CardBack, Card } from './Card';
import { SYSTEMS, SYSTEM_CONFIG, STATION_ICONS } from '@/data/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PyramidMarketProps {
  marketStacks: MarketStacks;
  currentPlayer: Player;
  onBuyCard?: (station: 1 | 3 | 5, stackIndex: number, cardIndex?: number) => void;
  onBuyAndInstall?: (station: 1 | 3 | 5, stackIndex: number, targetSystem: SystemType, cardIndex?: number) => void;
  onViewCard?: (card: CardInstance) => void;
  onRevealStack?: (station: 1 | 3 | 5, stackIndex: number) => void;
  compact?: boolean; // Mobile-friendly smaller rendering
}

// ─────────────────────────────────────────────────────────────────────────────
// Stack Browser Modal - Shows ALL cards in a T2/T3 stack
// ─────────────────────────────────────────────────────────────────────────────

interface StackBrowserModalProps {
  stackInfo: MarketStackInfo;
  station: 1 | 3 | 5;
  stackIndex: number;
  currentPlayer: Player;
  onBuyCard: (cardIndex: number) => void;
  onBuyAndInstall: (targetSystem: SystemType, cardIndex: number) => void;
  onClose: () => void;
}

function StackBrowserModal({
  stackInfo,
  station,
  currentPlayer,
  onBuyCard,
  onBuyAndInstall,
  onClose,
}: StackBrowserModalProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showInstallMenu, setShowInstallMenu] = useState(false);
  const { cards } = stackInfo;

  if (cards.length === 0) return null;

  const isAtStation = currentPlayer.location === station;
  const tierLabel = station === 1 ? 'Tier 1' : station === 3 ? 'Tier 2' : 'Tier 3';

  // Get selected card info (or null if none selected)
  const selectedCard = selectedCardIndex !== null ? cards[selectedCardIndex] : null;
  const isAction = selectedCard?.type === 'action';
  const actionCard = isAction ? (selectedCard as ActionCard & { instanceId: string }) : null;

  const buyCost = actionCard ? Math.max(0, actionCard.cost - currentPlayer.buyDiscount) : 0;
  const canAfford = actionCard && currentPlayer.credits >= buyCost;
  const canBuy = isAtStation && canAfford && selectedCardIndex !== null;

  const isInstallable = actionCard?.installCost !== undefined;
  const installCost = isInstallable ? Math.max(0, actionCard!.installCost! - currentPlayer.installDiscount) : 0;
  const totalCost = buyCost + installCost;
  const canBuyAndInstall = isAtStation && isInstallable && currentPlayer.credits >= totalCost;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="game-panel p-6 max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-amber-400">Browse {tierLabel} Stack</h2>
            <p className="text-slate-400 text-sm">{cards.length} cards in stack • Click a card to select it for purchase</p>
          </div>
          <button
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* All cards in stack, laid out horizontally - click to select */}
        <div className="flex gap-3 flex-wrap justify-center mb-6 p-4 bg-slate-800/50 rounded-lg">
          {cards.map((card, idx) => {
            const isSelected = selectedCardIndex === idx;
            const cardAction = card.type === 'action' ? (card as ActionCard & { instanceId: string }) : null;
            const cardCost = cardAction ? Math.max(0, cardAction.cost - currentPlayer.buyDiscount) : 0;
            const cardAffordable = cardAction && currentPlayer.credits >= cardCost;

            return (
              <div
                key={card.instanceId}
                className={clsx(
                  'relative cursor-pointer transition-all',
                  isSelected && 'ring-4 ring-amber-400 rounded-lg scale-105',
                  !isSelected && isAtStation && cardAffordable && 'hover:scale-105',
                  !cardAffordable && 'opacity-60',
                )}
                onClick={() => {
                  if (isAtStation && cardAffordable) {
                    setSelectedCardIndex(isSelected ? null : idx);
                    setShowInstallMenu(false);
                  }
                }}
              >
                <Card card={card} size="large" />
                {/* Cost badge */}
                <div className={clsx(
                  'absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-bold',
                  isSelected ? 'bg-amber-500 text-slate-900' :
                  cardAffordable ? 'bg-slate-600 text-slate-200' : 'bg-red-900 text-red-300'
                )}>
                  ${cardCost}
                </div>
              </div>
            );
          })}
        </div>

        {/* Purchase options for selected card */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-700">
          <div className="text-slate-400 text-sm">
            Credits: <span className="text-amber-400 font-bold">{currentPlayer.credits}</span>
          </div>

          {selectedCardIndex === null ? (
            <span className="text-slate-500 text-sm">Select a card to buy</span>
          ) : (
            <>
              <button
                className={clsx(
                  'px-4 py-2 rounded-lg font-semibold transition-all',
                  canBuy
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                )}
                onClick={() => {
                  if (canBuy) {
                    onBuyCard(selectedCardIndex);
                    onClose();
                  }
                }}
                disabled={!canBuy}
              >
                Buy {selectedCard?.title} (${buyCost})
              </button>

              {isInstallable && (
                <div className="relative">
                  <button
                    className={clsx(
                      'px-4 py-2 rounded-lg font-semibold transition-all',
                      canBuyAndInstall
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                    )}
                    onClick={() => {
                      if (canBuyAndInstall) {
                        setShowInstallMenu(!showInstallMenu);
                      }
                    }}
                    disabled={!canBuyAndInstall}
                  >
                    Buy + Install (${totalCost})
                  </button>

                  {showInstallMenu && canBuyAndInstall && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col bg-slate-800 rounded border border-slate-600 shadow-xl overflow-hidden z-30">
                      {SYSTEMS.map(sys => {
                        const config = SYSTEM_CONFIG[sys];
                        return (
                          <button
                            key={sys}
                            className={clsx(
                              'px-4 py-2 text-sm font-semibold hover:bg-slate-700 transition-colors whitespace-nowrap',
                              config.textClass,
                            )}
                            onClick={() => {
                              onBuyAndInstall(sys, selectedCardIndex);
                              onClose();
                            }}
                          >
                            Install to {config.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <button
            className="px-4 py-2 rounded-lg font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Stack Component
// ─────────────────────────────────────────────────────────────────────────────

interface MarketStackComponentProps {
  stackInfo: MarketStackInfo;
  station: 1 | 3 | 5;
  stackIndex: number;
  currentPlayer: Player;
  onBuyCard?: () => void;
  onBuyAndInstall?: (targetSystem: SystemType) => void;
  onViewCard?: (card: CardInstance) => void;
  onReveal?: () => void;
  compact?: boolean;
}

function MarketStackComponent({
  stackInfo,
  station,
  currentPlayer,
  onBuyCard,
  onBuyAndInstall,
  onViewCard,
  onReveal,
  compact,
}: MarketStackComponentProps) {
  const [showInstallMenu, setShowInstallMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { cards, revealed } = stackInfo;

  const cardSize = compact ? 'small' : 'normal';

  // Show empty slot when stack is depleted
  if (cards.length === 0) {
    return (
      <div className="relative flex flex-col items-center opacity-30">
        <div className={clsx(
          'rounded-lg border-2 border-dashed border-slate-600 bg-slate-900/50 flex items-center justify-center',
          compact ? 'w-[80px] h-[112px]' : 'w-[100px] h-[140px]',
        )}>
          <span className="text-slate-600 text-xs">Empty</span>
        </div>
      </div>
    );
  }

  const topCard = cards[cards.length - 1];
  const isAction = topCard.type === 'action';
  const actionCard = isAction ? (topCard as ActionCard & { instanceId: string }) : null;

  const isAtStation = currentPlayer.location === station;
  const buyCost = isAction && revealed ? Math.max(0, actionCard!.cost - currentPlayer.buyDiscount) : 0;
  const canAfford = isAction && currentPlayer.credits >= buyCost;
  const canBuy = isAtStation && canAfford && revealed;

  const isInstallable = actionCard?.installCost !== undefined;
  const installCost = isInstallable ? Math.max(0, actionCard!.installCost! - currentPlayer.installDiscount) : 0;
  const totalCost = buyCost + installCost;
  const canBuyAndInstall = isAtStation && isInstallable && currentPlayer.credits >= totalCost && revealed;

  // If not revealed, show face-down stack (grayed if not at station)
  if (!revealed) {
    return (
      <div
        className={clsx(
          'relative flex flex-col items-center',
          isAtStation ? 'cursor-pointer' : 'opacity-50',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (isAtStation) onReveal?.();
        }}
      >
        <div className={clsx(
          'transition-transform duration-200',
          isHovered && isAtStation && 'scale-110 -translate-y-2',
        )}>
          {/* Stack of face-down cards */}
          <div className="relative">
            {cards.length > 2 && (
              <div className="absolute top-1 left-1 w-full h-full rounded-lg bg-slate-800 border border-slate-700" />
            )}
            {cards.length > 1 && (
              <div className="absolute top-0.5 left-0.5 w-full h-full rounded-lg bg-slate-800 border border-slate-700" />
            )}
            <CardBack size={cardSize} />
          </div>
        </div>

        {/* Stack count */}
        <div className="absolute -bottom-1 -right-1 bg-slate-900 text-slate-400 text-xs font-bold px-1.5 py-0.5 rounded border border-slate-600">
          {cards.length}
        </div>

        {/* "Browse" hint when at station */}
        {isHovered && isAtStation && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-20">
            <span className="px-2 py-1 bg-amber-500 text-slate-900 text-xs font-bold rounded whitespace-nowrap">
              Click to Browse
            </span>
          </div>
        )}
      </div>
    );
  }

  // Revealed stack
  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowInstallMenu(false);
      }}
    >
      {/* Card stack */}
      <div className={clsx(
        'relative transition-transform duration-200',
        isHovered && 'scale-110 -translate-y-2',
      )}>
        <CardStack
          cards={cards}
          size={cardSize}
          showTopCard={true}
          onClick={() => onViewCard?.(topCard)}
        />

        {/* Stack count - positioned relative to card */}
        <div className="absolute -bottom-1 -right-1 bg-slate-900 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded border border-amber-600/50">
          {cards.length}
        </div>
      </div>

      {/* Buy buttons - flow below the card, always in the hover area */}
      <div className={clsx(
        'flex flex-col items-center gap-1 z-20',
        compact ? 'mt-1 min-h-[40px]' : 'mt-2 min-h-[52px]',
      )}>
        {isHovered && isAtStation && (
          <>
            {/* Buy only */}
            <button
              className={clsx(
                'px-2 py-1 rounded text-xs font-bold whitespace-nowrap transition-all shadow-lg',
                canBuy
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed',
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (canBuy) onBuyCard?.();
              }}
              disabled={!canBuy}
            >
              Buy ${buyCost}
            </button>

            {/* Buy + Install */}
            {isInstallable && (
              <div className="relative">
                <button
                  className={clsx(
                    'px-2 py-1 rounded text-xs font-bold whitespace-nowrap transition-all shadow-lg',
                    canBuyAndInstall
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canBuyAndInstall) setShowInstallMenu(!showInstallMenu);
                  }}
                  disabled={!canBuyAndInstall}
                >
                  +Install ${totalCost}
                </button>

                {/* System dropdown */}
                {showInstallMenu && canBuyAndInstall && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col bg-slate-800 rounded border border-slate-600 shadow-xl overflow-hidden z-30">
                    {SYSTEMS.map(sys => {
                      const config = SYSTEM_CONFIG[sys];
                      return (
                        <button
                          key={sys}
                          className={clsx(
                            'px-3 py-1.5 text-xs font-semibold hover:bg-slate-700 transition-colors whitespace-nowrap',
                            config.textClass,
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBuyAndInstall?.(sys);
                            setShowInstallMenu(false);
                          }}
                        >
                          → {config.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Row Component
// ─────────────────────────────────────────────────────────────────────────────

interface MarketRowProps {
  station: 1 | 3 | 5;
  stackInfos: MarketStackInfo[];
  currentPlayer: Player;
  onBuyCard?: (stackIndex: number) => void;
  onBuyAndInstall?: (stackIndex: number, targetSystem: SystemType) => void;
  onViewCard?: (card: CardInstance) => void;
  onRevealStack?: (stackIndex: number) => void;
  compact?: boolean;
}

function MarketRow({
  station,
  stackInfos,
  currentPlayer,
  onBuyCard,
  onBuyAndInstall,
  onViewCard,
  onRevealStack,
  compact,
}: MarketRowProps) {
  const isAtStation = currentPlayer.location === station;
  const tierLabel = station === 1 ? 'Tier 1' : station === 3 ? 'Tier 2' : 'Tier 3';

  // Filter out empty stacks
  const nonEmptyStacks = stackInfos
    .map((info, idx) => ({ info, idx }))
    .filter(s => s.info.cards.length > 0);

  if (nonEmptyStacks.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 opacity-50">
        <img src={STATION_ICONS[station]} alt={`Station ${station}`} className={clsx(compact ? 'w-5 h-5' : 'w-6 h-6', 'opacity-50')} />
        <span className="text-slate-500 text-xs">{tierLabel} - Empty</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Station indicator */}
      <div className={clsx(
        'flex flex-col items-center',
        isAtStation ? 'opacity-100' : 'opacity-40',
      )}>
        <img
          src={STATION_ICONS[station]}
          alt={`Station ${station}`}
          className={compact ? 'w-6 h-6' : 'w-8 h-8'}
        />
        <span className={clsx(
          'text-[9px] font-bold',
          isAtStation ? 'text-amber-400' : 'text-slate-500',
        )}>
          {tierLabel}
        </span>
      </div>

      {/* Card stacks */}
      <div className={clsx('flex', compact ? 'gap-1' : 'gap-1.5')}>
        {nonEmptyStacks.map(({ info, idx }) => (
          <MarketStackComponent
            key={idx}
            stackInfo={info}
            station={station}
            stackIndex={idx}
            currentPlayer={currentPlayer}
            onBuyCard={() => onBuyCard?.(idx)}
            onBuyAndInstall={(sys) => onBuyAndInstall?.(idx, sys)}
            onViewCard={onViewCard}
            onReveal={() => onRevealStack?.(idx)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Pyramid Market Component
// ─────────────────────────────────────────────────────────────────────────────

export function PyramidMarket({
  marketStacks,
  currentPlayer,
  onBuyCard,
  onBuyAndInstall,
  onViewCard,
  onRevealStack,
  compact,
}: PyramidMarketProps) {
  // State for stack browser modal
  const [browsingStack, setBrowsingStack] = useState<{
    station: 1 | 3 | 5;
    stackIndex: number;
  } | null>(null);

  // Determine which stack (if any) the current player revealed THIS TURN at each tier
  // Only that stack can be fully browsed; other revealed stacks show top card only
  const revealedThisTurn = currentPlayer.revealedStacksThisTurn;

  // Check if a T2/T3 stack can be fully browsed (was just revealed this turn and player is present)
  const canBrowseStack = (station: 1 | 3 | 5, stackIndex: number): boolean => {
    if (station === 1) return false; // T1 never uses browser modal
    if (currentPlayer.location !== station) return false; // Must be at station
    return revealedThisTurn[station] === stackIndex; // Only the stack revealed this turn
  };

  // Handle opening the stack browser when a revealed T2/T3 stack is clicked
  const handleStackClick = (station: 1 | 3 | 5, stackIndex: number) => {
    const stackInfo = marketStacks[station][stackIndex];
    if (!stackInfo?.revealed || stackInfo.cards.length === 0) return;

    if (canBrowseStack(station, stackIndex)) {
      // This is the stack we revealed this turn — open full browser
      setBrowsingStack({ station, stackIndex });
    } else {
      // Just view the top card (T1, or stacks revealed on previous turns/by other players)
      onViewCard?.(stackInfo.cards[stackInfo.cards.length - 1]);
    }
  };

  // Handle reveal + browse for face-down stacks
  const handleRevealAndBrowse = (station: 1 | 3 | 5, stackIndex: number) => {
    onRevealStack?.(station, stackIndex);
    // Open browser modal after revealing
    setBrowsingStack({ station, stackIndex });
  };

  const browsingStackInfo = browsingStack
    ? marketStacks[browsingStack.station][browsingStack.stackIndex]
    : null;

  return (
    <div className={clsx('flex flex-col items-center py-2', compact ? 'gap-1' : 'gap-1.5')}>
      {/* Tier 3 - Top of pyramid (3 stacks) */}
      <MarketRow
        station={5}
        stackInfos={marketStacks[5]}
        currentPlayer={currentPlayer}
        onBuyCard={(idx) => onBuyCard?.(5, idx)}
        onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(5, idx, sys)}
        onViewCard={(card) => {
          const idx = marketStacks[5].findIndex(s => s.cards.includes(card));
          if (idx >= 0) handleStackClick(5, idx);
          else onViewCard?.(card);
        }}
        onRevealStack={(idx) => handleRevealAndBrowse(5, idx)}
        compact={compact}
      />

      {/* Tier 2 - Middle (4 stacks) */}
      <MarketRow
        station={3}
        stackInfos={marketStacks[3]}
        currentPlayer={currentPlayer}
        onBuyCard={(idx) => onBuyCard?.(3, idx)}
        onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(3, idx, sys)}
        onViewCard={(card) => {
          const idx = marketStacks[3].findIndex(s => s.cards.includes(card));
          if (idx >= 0) handleStackClick(3, idx);
          else onViewCard?.(card);
        }}
        onRevealStack={(idx) => handleRevealAndBrowse(3, idx)}
        compact={compact}
      />

      {/* Tier 1 - Bottom of pyramid (5 stacks) */}
      <MarketRow
        station={1}
        stackInfos={marketStacks[1]}
        currentPlayer={currentPlayer}
        onBuyCard={(idx) => onBuyCard?.(1, idx)}
        onBuyAndInstall={(idx, sys) => onBuyAndInstall?.(1, idx, sys)}
        onViewCard={onViewCard}
        onRevealStack={(idx) => onRevealStack?.(1, idx)}
        compact={compact}
      />

      {/* Stack Browser Modal */}
      {browsingStack && browsingStackInfo && (
        <StackBrowserModal
          stackInfo={browsingStackInfo}
          station={browsingStack.station}
          stackIndex={browsingStack.stackIndex}
          currentPlayer={currentPlayer}
          onBuyCard={(cardIdx) => onBuyCard?.(browsingStack.station, browsingStack.stackIndex, cardIdx)}
          onBuyAndInstall={(sys, cardIdx) => onBuyAndInstall?.(browsingStack.station, browsingStack.stackIndex, sys, cardIdx)}
          onClose={() => setBrowsingStack(null)}
        />
      )}
    </div>
  );
}

export default PyramidMarket;
