// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Hand Display Component
// Fanned card display for current player's hand
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import type { CardInstance, Player, SystemType, ActionCard, HazardCard } from '@/types';
import { STARTING_CARDS } from '@/data/cards';
import { Card } from './Card';
import { SYSTEMS, SYSTEM_CONFIG } from '@/data/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HandDisplayProps {
  cards: CardInstance[];
  player: Player;
  onPlayCard: (card: CardInstance, rect?: DOMRect) => void;
  onInstallCard: (card: CardInstance, system: SystemType) => void;
  onClearHazard: (card: CardInstance) => void;
  onViewCard?: (card: CardInstance) => void;
  layout?: 'horizontal' | 'vertical';
  isMyTurn?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Sort hand cards for optimal play order
// Order: purchased/special cards (left) → autoplay cards (middle) → credit cards (right)
// ─────────────────────────────────────────────────────────────────────────────

function getCardSortPriority(card: CardInstance): number {
  // Hazards always at far left (priority 0)
  if (card.type === 'hazard') return 0;

  // Starter cards
  if (card.type === 'starter') {
    const starterCard = card as typeof STARTING_CARDS[0] & { instanceId: string };

    // Credit cards (Supply Check) → far right (highest priority = 3)
    if (starterCard.effectData?.credits) return 3;

    // Autoplay cards (no choice needed, like Basic Engines with direct power)
    // These have direct power allocation (not powerChoice)
    if (starterCard.effectData?.power && !starterCard.effectData?.powerChoice) return 2;

    // Cards with powerChoice need selection → middle-left (lower priority)
    if (starterCard.effectData?.powerChoice) return 1;
  }

  // Action cards
  if (card.type === 'action') {
    const actionCard = card as ActionCard & { instanceId: string };

    // Credit-producing action cards → far right
    if (actionCard.effectData?.credits && !actionCard.effectData?.power && !actionCard.effectData?.powerChoice) {
      return 3;
    }

    // Autoplay action cards (direct power, no choice needed)
    if (actionCard.effectData?.power && !actionCard.effectData?.powerChoice) return 2;

    // All other action cards (including those with powerChoice) → left
    return 1;
  }

  return 1; // Default for any other card type
}

function sortHandCards(cards: CardInstance[]): CardInstance[] {
  return [...cards].sort((a, b) => {
    const priorityA = getCardSortPriority(a);
    const priorityB = getCardSortPriority(b);

    // Higher priority = further right in the hand
    // So we sort descending (b - a would put high priority at start)
    // But since fan is left-to-right, we want low priority on left
    return priorityA - priorityB;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Calculate fan positions (tighter overlap, expands on hover)
// ─────────────────────────────────────────────────────────────────────────────

function calculateFanPositions(cardCount: number) {
  if (cardCount === 0) return [];
  if (cardCount === 1) return [{ rotation: 0, translateX: 60, translateY: 0 }];

  // Card dimensions for xlarge cards
  const cardWidth = 180;
  const containerWidth = 600;
  const padding = 60; // Padding from left edge (shifted right)

  // Calculate spacing to fit cards with nice overlap
  // We want visible portion of each card to be decent but overlap nicely
  const availableWidth = containerWidth - cardWidth - padding * 2;
  const maxSpacing = 80; // Maximum spacing between cards (more spread out)
  const calculatedSpacing = Math.min(maxSpacing, availableWidth / Math.max(cardCount - 1, 1));

  // Subtle rotation for held-in-hand feel
  const maxRotation = Math.min(8, cardCount * 1.2);
  const centerIndex = (cardCount - 1) / 2;

  return Array.from({ length: cardCount }, (_, index) => {
    const offset = index - centerIndex;

    return {
      rotation: offset * (maxRotation / Math.max(centerIndex, 1)),
      translateX: padding + index * calculatedSpacing,
      translateY: -Math.abs(offset) * 4, // Slight arc - edge cards lower (negative = up)
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Check if player can afford to clear a hazard
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Hand Card Component (single card with actions)
// ─────────────────────────────────────────────────────────────────────────────

interface HandCardProps {
  card: CardInstance;
  player: Player;
  position: { rotation: number; translateX: number; translateY: number };
  zIndex: number;
  index: number;
  onPlayCard: (card: CardInstance, rect?: DOMRect) => void;
  onInstallCard: (card: CardInstance, system: SystemType) => void;
  onClearHazard: (card: CardInstance) => void;
  onViewCard?: (card: CardInstance) => void;
}

function HandCard({
  card,
  player,
  position,
  zIndex,
  index,
  onPlayCard,
  onInstallCard,
  onClearHazard,
  onViewCard,
}: HandCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showInstallMenu, setShowInstallMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isAction = card.type === 'action';
  const isHazard = card.type === 'hazard';
  const actionCard = isAction ? (card as ActionCard & { instanceId: string }) : null;
  const hazardCard = isHazard ? (card as HazardCard & { instanceId: string }) : null;

  const isInstallable = actionCard?.installCost !== undefined;
  const installCost = isInstallable ? actionCard!.installCost! - player.installDiscount : 0;
  const canAffordInstall = isInstallable && player.credits >= Math.max(0, installCost);
  const canClear = hazardCard ? canClearHazard(player, hazardCard) : false;

  // Capture bounding rect for ghost card animation
  const getRect = () => cardRef.current?.getBoundingClientRect();

  // Click on card plays it (for non-hazards)
  const handleCardClick = () => {
    if (!isHazard) {
      onPlayCard(card, getRect());
    } else if (canClear) {
      onClearHazard(card);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
    >
    <div
      ref={cardRef}
      className="hand-card"
      style={{
        // Use CSS custom properties so hover can reference them
        '--tx': `${position.translateX}px`,
        '--ty': `${position.translateY}px`,
        '--rot': `${position.rotation}deg`,
        transform: `translateX(var(--tx)) translateY(var(--ty)) rotate(var(--rot))`,
        zIndex: isHovered ? 50 : zIndex,
      } as React.CSSProperties}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowInstallMenu(false);
      }}
    >
      {/* The card itself - Click to play! (hover handled by CSS) */}
      <div
        className="relative cursor-pointer"
        onClick={handleCardClick}
      >
        <Card card={card} size="xlarge" />

        {/* Overlay hint on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-4 pointer-events-none">
          <span className="text-white font-bold text-lg drop-shadow-lg">
            {isHazard ? (canClear ? '🧹 Click to Clear' : '⚠️ Hazard') : '▶ Click to Play'}
          </span>
        </div>
      </div>

      {/* Action buttons - appear on hover */}
      <div className="hand-card-actions">
        {/* Play button (not for hazards) - also clickable for extra clarity */}
        {!isHazard && (
          <button
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm px-4 py-2 rounded font-bold shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              onPlayCard(card, getRect());
            }}
          >
            ▶ Play
          </button>
        )}

        {/* Clear hazard button */}
        {isHazard && hazardCard && (
          <button
            className={clsx(
              'text-sm px-4 py-2 rounded font-bold shadow-lg',
              canClear
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed',
            )}
            disabled={!canClear}
            onClick={(e) => {
              e.stopPropagation();
              if (canClear) onClearHazard(card);
            }}
            title={hazardCard.clearCondition}
          >
            🧹 Clear
          </button>
        )}

        {/* Install button with dropdown */}
        {isInstallable && (
          <div className="relative">
            <button
              className={clsx(
                'text-sm px-4 py-2 rounded font-bold shadow-lg',
                canAffordInstall
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed',
              )}
              disabled={!canAffordInstall}
              onClick={(e) => {
                e.stopPropagation();
                if (canAffordInstall) setShowInstallMenu(!showInstallMenu);
              }}
            >
              🔧 Install (${Math.max(0, installCost)})
            </button>

            {/* System selection dropdown */}
            {showInstallMenu && canAffordInstall && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col bg-slate-800 rounded border border-slate-600 shadow-xl overflow-hidden z-50">
                {SYSTEMS.map(sys => {
                  const config = SYSTEM_CONFIG[sys];
                  return (
                    <button
                      key={sys}
                      className={clsx(
                        'px-4 py-2.5 text-sm font-semibold hover:bg-slate-700 transition-colors capitalize whitespace-nowrap',
                        config.textClass,
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInstallCard(card, sys);
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

        {/* View details button */}
        <button
          className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded font-semibold shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            onViewCard?.(card);
          }}
        >
          🔍
        </button>
      </div>
    </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical Hand Card Component (for sidebar layout)
// ─────────────────────────────────────────────────────────────────────────────

interface VerticalHandCardProps {
  card: CardInstance;
  player: Player;
  index: number;
  onPlayCard: (card: CardInstance, rect?: DOMRect) => void;
  onInstallCard: (card: CardInstance, system: SystemType) => void;
  onClearHazard: (card: CardInstance) => void;
  onViewCard?: (card: CardInstance) => void;
}

function VerticalHandCard({
  card,
  player,
  index,
  onPlayCard,
  onInstallCard,
  onClearHazard,
  onViewCard,
}: VerticalHandCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showInstallMenu, setShowInstallMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isAction = card.type === 'action';
  const isHazard = card.type === 'hazard';
  const actionCard = isAction ? (card as ActionCard & { instanceId: string }) : null;
  const hazardCard = isHazard ? (card as HazardCard & { instanceId: string }) : null;

  const isInstallable = actionCard?.installCost !== undefined;
  const installCost = isInstallable ? actionCard!.installCost! - player.installDiscount : 0;
  const canAffordInstall = isInstallable && player.credits >= Math.max(0, installCost);
  const canClear = hazardCard ? canClearHazard(player, hazardCard) : false;

  const getRect = () => cardRef.current?.getBoundingClientRect();

  const handleCardClick = () => {
    if (!isHazard) {
      onPlayCard(card, getRect());
    } else if (canClear) {
      onClearHazard(card);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
    >
    <div
      ref={cardRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowInstallMenu(false);
      }}
    >
      {/* Card */}
      <div
        className={clsx(
          'cursor-pointer transition-all duration-200',
          isHovered && 'scale-105 -translate-x-1',
        )}
        onClick={handleCardClick}
      >
        <Card card={card} size="large" />
      </div>

      {/* Action buttons - appear on hover */}
      {isHovered && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {/* Play button */}
          {!isHazard && (
            <button
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs px-2 py-1 rounded font-bold shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onPlayCard(card, getRect());
              }}
            >
              ▶
            </button>
          )}

          {/* Clear hazard */}
          {isHazard && (
            <button
              className={clsx(
                'text-xs px-2 py-1 rounded font-bold shadow-lg',
                canClear
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-slate-600 text-slate-400',
              )}
              disabled={!canClear}
              onClick={(e) => {
                e.stopPropagation();
                if (canClear) onClearHazard(card);
              }}
            >
              🧹
            </button>
          )}

          {/* Install */}
          {isInstallable && (
            <div className="relative">
              <button
                className={clsx(
                  'text-xs px-2 py-1 rounded font-bold shadow-lg',
                  canAffordInstall
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-slate-600 text-slate-400',
                )}
                disabled={!canAffordInstall}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canAffordInstall) setShowInstallMenu(!showInstallMenu);
                }}
              >
                🔧
              </button>

              {showInstallMenu && canAffordInstall && (
                <div className="absolute right-full top-0 mr-1 flex flex-col bg-slate-800 rounded border border-slate-600 shadow-xl overflow-hidden z-50">
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
                          onInstallCard(card, sys);
                          setShowInstallMenu(false);
                        }}
                      >
                        {config.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* View */}
          <button
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded font-semibold shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              onViewCard?.(card);
            }}
          >
            🔍
          </button>
        </div>
      )}
    </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Hand Display Component
// ─────────────────────────────────────────────────────────────────────────────

export function HandDisplay({
  cards,
  player,
  onPlayCard,
  onInstallCard,
  onClearHazard,
  onViewCard,
  layout = 'horizontal',
  isMyTurn = true,
}: HandDisplayProps) {
  // Sort cards for optimal play order: purchased (left) → autoplay (middle) → credits (right)
  const sortedCards = sortHandCards(cards);
  const positions = calculateFanPositions(sortedCards.length);

  if (sortedCards.length === 0) {
    return (
      <div className={layout === 'vertical' ? 'flex items-center justify-center h-32' : 'hand-container'}>
        <div className="text-slate-500 text-sm">No cards in hand</div>
      </div>
    );
  }

  // Vertical layout - stacked cards for sidebar
  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col gap-3 transition-opacity ${!isMyTurn ? 'opacity-60 pointer-events-none' : ''}`}>
        {!isMyTurn && (
          <div className="text-center text-slate-500 text-xs font-semibold py-1">Waiting for your turn...</div>
        )}
        {sortedCards.map((card, index) => (
          <VerticalHandCard
            key={card.instanceId}
            card={card}
            player={player}
            index={index}
            onPlayCard={onPlayCard}
            onInstallCard={onInstallCard}
            onClearHazard={onClearHazard}
            onViewCard={onViewCard}
          />
        ))}
      </div>
    );
  }

  // Horizontal fanned layout (default)
  return (
    <div className={`hand-container transition-opacity ${!isMyTurn ? 'opacity-60 pointer-events-none' : ''}`}>
      {sortedCards.map((card, index) => (
        <HandCard
          key={card.instanceId}
          card={card}
          player={player}
          position={positions[index]}
          zIndex={index}
          index={index}
          onPlayCard={onPlayCard}
          onInstallCard={onInstallCard}
          onClearHazard={onClearHazard}
          onViewCard={onViewCard}
        />
      ))}
    </div>
  );
}

export default HandDisplay;
