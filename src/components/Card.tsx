// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Card Component
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { clsx } from 'clsx';
import type { CardInstance, ActionCard, StarterCard, HazardCard, SystemType, MissionInstance } from '@/types';
import { CARD_SIZES } from '@/data/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CardSize = 'tiny' | 'small' | 'normal' | 'large' | 'xlarge' | 'huge';

export interface CardProps {
  card: CardInstance;
  size?: CardSize;
  selected?: boolean;
  disabled?: boolean;
  showBack?: boolean;
  onClick?: () => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

// Convert card ID (kebab-case) to filename format (Title_Case)
// e.g., "weapons-core" -> "Weapons_Core"
// Special case: "mag-leash" -> "Mag-Leash" (preserve hyphen in compound names)
function idToFilename(id: string): string {
  // Special cases where hyphen should be preserved
  const hyphenPreserved = ['mag-leash'];
  if (hyphenPreserved.includes(id)) {
    return id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-');
  }

  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');
}

// Get the path to card art based on card type and id
function getCardArtPath(cardType: 'starter' | 'action' | 'hazard', cardId: string, tier?: number): string {
  const filename = idToFilename(cardId);
  if (cardType === 'starter') {
    return `/cards/starter/${filename}.png`;
  } else if (cardType === 'hazard') {
    return `/cards/hazards/${filename}.png`;
  } else if (cardType === 'action' && tier) {
    return `/cards/tier${tier}/${filename}.png`;
  }
  return '';
}

// Get mission art path
function getMissionArtPath(missionId: string): string {
  const filename = idToFilename(missionId);
  return `/cards/missions/${filename}.png`;
}

function getSystemColor(system?: SystemType): string {
  switch (system) {
    case 'weapons': return 'border-weapons bg-gradient-to-b from-weapons/20 to-weapons/5';
    case 'computers': return 'border-computers bg-gradient-to-b from-computers/20 to-computers/5';
    case 'engines': return 'border-engines bg-gradient-to-b from-engines/20 to-engines/5';
    case 'logistics': return 'border-logistics bg-gradient-to-b from-logistics/20 to-logistics/5';
    default: return 'border-amber-600 bg-gradient-to-b from-amber-900/40 to-slate-900';
  }
}

function getSystemTextColor(system?: SystemType): string {
  switch (system) {
    case 'weapons': return 'text-weapons-light';
    case 'computers': return 'text-computers-light';
    case 'engines': return 'text-engines-light';
    case 'logistics': return 'text-logistics-light';
    default: return 'text-amber-400';
  }
}

function getSystemBgColor(system?: SystemType): string {
  switch (system) {
    case 'weapons': return 'bg-weapons';
    case 'computers': return 'bg-computers';
    case 'engines': return 'bg-engines';
    case 'logistics': return 'bg-logistics';
    default: return 'bg-amber-700';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Back Component - Uses PNG artwork
// ─────────────────────────────────────────────────────────────────────────────

export function CardBack({ size }: { size: 'tiny' | 'small' | 'normal' | 'large' | 'xlarge' | 'huge' }) {
  const dimensions = CARD_SIZES[size];

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <img
        src="/cards/back/back.png"
        alt="Card Back"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Card Component
// ─────────────────────────────────────────────────────────────────────────────

function ActionCardFront({
  card,
  size
}: {
  card: ActionCard & { instanceId: string };
  size: CardSize;
}) {
  const [imgError, setImgError] = useState(false);
  const dimensions = CARD_SIZES[size];
  const isCompact = size === 'tiny' || size === 'small';
  const artPath = getCardArtPath('action', card.id, card.tier);

  // Always try to show PNG art (even at small sizes for market visibility)
  if (!imgError) {
    return (
      <div
        className="relative rounded-lg overflow-hidden"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <img
          src={artPath}
          alt={card.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback to generated card layout (only when image fails)
  return (
    <div
      className={clsx(
        'relative rounded-lg border-2 overflow-hidden flex flex-col',
        getSystemColor(card.system),
      )}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {/* Cost badge */}
      <div className={clsx(
        'absolute top-1 left-1 rounded-full flex items-center justify-center font-bold text-white',
        getSystemBgColor(card.system),
        isCompact ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-xs',
      )}>
        {card.cost}
      </div>

      {/* Install cost badge (if applicable) */}
      {card.installCost && (
        <div className={clsx(
          'absolute top-1 right-1 rounded-full flex items-center justify-center font-bold bg-slate-700 text-white border border-slate-500',
          isCompact ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[10px]',
        )}>
          {card.installCost}
        </div>
      )}

      {/* Title area */}
      <div className={clsx(
        'bg-amber-100 text-slate-900 font-semibold text-center border-b border-amber-300',
        isCompact ? 'mt-5 px-1 py-0.5 text-[7px] leading-tight' : 'mt-7 px-2 py-1 text-[10px]',
      )}>
        {card.title}
      </div>

      {/* Art placeholder */}
      {!isCompact && (
        <div className="flex-1 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center min-h-[40px]">
          <div className="text-slate-600 text-[8px]">[ Art ]</div>
        </div>
      )}

      {/* Effect area */}
      <div className={clsx(
        'bg-amber-100 text-slate-800 text-center border-t border-amber-300',
        isCompact ? 'px-1 py-0.5 text-[6px] leading-tight' : 'px-2 py-1 text-[9px]',
      )}>
        {card.effect}
      </div>

      {/* Install effect (if applicable) */}
      {card.installEffect && !isCompact && (
        <div className="px-2 py-1 text-[8px] text-center bg-slate-800 text-slate-300 border-t border-slate-600">
          <span className="text-amber-400">Install:</span> {card.installEffect}
        </div>
      )}

      {/* System label */}
      <div className={clsx(
        'text-center font-semibold',
        getSystemTextColor(card.system),
        isCompact ? 'py-0.5 text-[6px]' : 'py-1 text-[9px]',
      )}>
        +2⚡ to {card.system ? card.system.charAt(0).toUpperCase() + card.system.slice(1) : 'Any'}
      </div>

      {/* Flavor text (only on large cards) */}
      {card.flavor && size === 'large' && (
        <div className="px-2 py-1 text-[7px] text-slate-500 italic text-center border-t border-slate-700">
          {card.flavor}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Starter Card Component
// ─────────────────────────────────────────────────────────────────────────────

function StarterCardFront({
  card,
  size
}: {
  card: StarterCard & { instanceId: string };
  size: CardSize;
}) {
  const [imgError, setImgError] = useState(false);
  const dimensions = CARD_SIZES[size];
  const isCompact = size === 'tiny' || size === 'small';
  const artPath = getCardArtPath('starter', card.id);

  // If we have card art, show it as the full card
  if (!imgError) {
    return (
      <div
        className="relative rounded-lg overflow-hidden"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <img
          src={artPath}
          alt={card.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback to generated card layout
  return (
    <div
      className="relative rounded-lg border-2 border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden flex flex-col"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {/* Title */}
      <div className={clsx(
        'bg-slate-700 text-slate-200 font-semibold text-center',
        isCompact ? 'px-1 py-0.5 text-[7px]' : 'px-2 py-1 text-[10px]',
      )}>
        {card.title}
      </div>

      {/* Effect area */}
      <div className="flex-1 flex items-center justify-center">
        <div className={clsx(
          'text-amber-400 font-bold text-center',
          isCompact ? 'text-[8px]' : 'text-sm',
        )}>
          {card.effect}
        </div>
      </div>

      {/* Flavor */}
      {card.flavor && !isCompact && (
        <div className="px-2 py-1 text-[7px] text-slate-500 italic text-center border-t border-slate-700">
          {card.flavor}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hazard Card Component
// ─────────────────────────────────────────────────────────────────────────────

function HazardCardFront({
  card,
  size
}: {
  card: HazardCard & { instanceId: string };
  size: CardSize;
}) {
  const [imgError, setImgError] = useState(false);
  const dimensions = CARD_SIZES[size];
  const isCompact = size === 'tiny' || size === 'small';
  const artPath = getCardArtPath('hazard', card.id);

  // If we have card art, show it as the full card
  if (!imgError) {
    return (
      <div
        className="relative rounded-lg overflow-hidden"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <img
          src={artPath}
          alt={card.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback to generated card layout
  return (
    <div
      className="relative rounded-lg border-2 border-red-700 bg-gradient-to-b from-red-950 to-slate-950 overflow-hidden flex flex-col"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {/* Hazard icon */}
      <div className={clsx(
        'absolute top-1 left-1 text-red-500 z-10',
        isCompact ? 'text-[8px]' : 'text-xs',
      )}>
        ⚠
      </div>

      {/* Title */}
      <div className={clsx(
        'bg-red-900 text-red-100 font-semibold text-center',
        isCompact ? 'px-1 py-0.5 text-[7px] mt-3' : 'px-2 py-1 text-[10px] mt-4',
      )}>
        {card.title}
      </div>

      {/* Effect */}
      <div className="flex-1 flex items-center justify-center px-1">
        <div className={clsx(
          'text-red-300 text-center',
          isCompact ? 'text-[6px]' : 'text-[9px]',
        )}>
          {card.effect}
        </div>
      </div>

      {/* Clear condition */}
      <div className={clsx(
        'bg-slate-800 text-slate-300 text-center border-t border-slate-700',
        isCompact ? 'px-1 py-0.5 text-[5px]' : 'px-2 py-1 text-[8px]',
      )}>
        <span className="text-green-400">Clear:</span> {card.clearCondition}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Card Component
// ─────────────────────────────────────────────────────────────────────────────

export function Card({
  card,
  size = 'normal',
  selected = false,
  disabled = false,
  showBack = false,
  onClick,
  className,
}: CardProps) {
  const handleClick = () => {
    onClick?.();
  };
  if (showBack) {
    return (
      <div
        className={clsx(
          'cursor-pointer transition-all duration-200',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'card-hover',
          className,
        )}
        onClick={disabled ? undefined : handleClick}
      >
        <CardBack size={size} />
      </div>
    );
  }

  let cardContent: React.ReactNode;

  switch (card.type) {
    case 'action':
      cardContent = <ActionCardFront card={card as ActionCard & { instanceId: string }} size={size} />;
      break;
    case 'starter':
      cardContent = <StarterCardFront card={card as StarterCard & { instanceId: string }} size={size} />;
      break;
    case 'hazard':
      cardContent = <HazardCardFront card={card as HazardCard & { instanceId: string }} size={size} />;
      break;
  }

  return (
    <div
      className={clsx(
        'cursor-pointer transition-all duration-200',
        selected && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'card-hover',
        className,
      )}
      onClick={disabled ? undefined : handleClick}
    >
      {cardContent}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Stack Component (for market display)
// ─────────────────────────────────────────────────────────────────────────────

export interface CardStackProps {
  cards: CardInstance[];
  size?: 'tiny' | 'small' | 'normal' | 'large' | 'xlarge' | 'huge';
  showTopCard?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CardStack({
  cards,
  size = 'normal',
  showTopCard = true,
  onClick,
  className,
}: CardStackProps) {
  const dimensions = CARD_SIZES[size];
  const count = cards.length;

  if (count === 0) {
    return (
      <div
        className={clsx(
          'rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center',
          className,
        )}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <span className="text-slate-600 text-xs">Empty</span>
      </div>
    );
  }

  const topCard = cards[count - 1];

  return (
    <div className={clsx('relative', className)} onClick={onClick}>
      {/* Stack shadow layers */}
      {count > 1 && (
        <>
          <div
            className="absolute rounded-lg bg-slate-800 border border-slate-700"
            style={{
              width: dimensions.width,
              height: dimensions.height,
              top: 4,
              left: 4,
            }}
          />
          {count > 2 && (
            <div
              className="absolute rounded-lg bg-slate-800 border border-slate-700"
              style={{
                width: dimensions.width,
                height: dimensions.height,
                top: 2,
                left: 2,
              }}
            />
          )}
        </>
      )}

      {/* Top card */}
      <Card
        card={topCard}
        size={size}
        showBack={!showTopCard}
        onClick={onClick}
      />

      {/* Count badge */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-300 font-mono">
        {count}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mission Card Component
// ─────────────────────────────────────────────────────────────────────────────

export interface MissionCardProps {
  mission: MissionInstance;
  size?: 'tiny' | 'small' | 'normal' | 'large' | 'xlarge' | 'huge';
  showBack?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MissionCard({
  mission,
  size = 'normal',
  showBack = false,
  onClick,
  className,
}: MissionCardProps) {
  const [imgError, setImgError] = useState(false);
  const dimensions = CARD_SIZES[size];
  const isCompact = size === 'tiny' || size === 'small';
  const artPath = getMissionArtPath(mission.id);

  if (showBack) {
    return (
      <div
        className={clsx('cursor-pointer transition-all duration-200 card-hover', className)}
        onClick={onClick}
      >
        <CardBack size={size} />
      </div>
    );
  }

  // Show PNG artwork at all sizes (except tiny which is too small)
  if (!imgError && size !== 'tiny') {
    return (
      <div
        className={clsx(
          'cursor-pointer transition-all duration-200 card-hover',
          className,
        )}
        onClick={onClick}
      >
        <div
          className="relative rounded-lg overflow-hidden"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <img
            src={artPath}
            alt={mission.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  // Fallback to generated card layout
  // Zone colors based on mission zone
  const zoneColors = {
    near: 'border-near bg-gradient-to-b from-near/20 to-near/5',
    mid: 'border-mid bg-gradient-to-b from-mid/20 to-mid/5',
    deep: 'border-deep bg-gradient-to-b from-deep/20 to-deep/5',
  };

  const zoneTextColors = {
    near: 'text-near-light',
    mid: 'text-mid-light',
    deep: 'text-deep-light',
  };

  return (
    <div
      className={clsx(
        'cursor-pointer transition-all duration-200 card-hover',
        className,
      )}
      onClick={onClick}
    >
      <div
        className={clsx(
          'relative rounded-lg border-2 overflow-hidden flex flex-col',
          zoneColors[mission.zone],
        )}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* Fame badge */}
        <div className={clsx(
          'absolute top-1 left-1 rounded-full flex items-center justify-center font-bold bg-amber-500 text-slate-900',
          isCompact ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-xs',
        )}>
          {mission.fame}
        </div>

        {/* Requirements with numbers */}
        <div className={clsx(
          'absolute top-1 right-1 flex gap-0.5',
          isCompact ? 'scale-75' : '',
        )}>
          {mission.requirements.weapons && mission.requirements.weapons > 0 && (
            <div className={clsx(
              'rounded-full bg-weapons flex items-center justify-center font-bold text-white',
              isCompact ? 'w-3 h-3 text-[6px]' : 'w-4 h-4 text-[8px]',
            )} title={`${mission.requirements.weapons} Weapons`}>
              {mission.requirements.weapons}
            </div>
          )}
          {mission.requirements.computers && mission.requirements.computers > 0 && (
            <div className={clsx(
              'rounded-full bg-computers flex items-center justify-center font-bold text-white',
              isCompact ? 'w-3 h-3 text-[6px]' : 'w-4 h-4 text-[8px]',
            )} title={`${mission.requirements.computers} Computers`}>
              {mission.requirements.computers}
            </div>
          )}
          {mission.requirements.engines && mission.requirements.engines > 0 && (
            <div className={clsx(
              'rounded-full bg-engines flex items-center justify-center font-bold text-white',
              isCompact ? 'w-3 h-3 text-[6px]' : 'w-4 h-4 text-[8px]',
            )} title={`${mission.requirements.engines} Engines`}>
              {mission.requirements.engines}
            </div>
          )}
          {mission.requirements.logistics && mission.requirements.logistics > 0 && (
            <div className={clsx(
              'rounded-full bg-logistics flex items-center justify-center font-bold text-white',
              isCompact ? 'w-3 h-3 text-[6px]' : 'w-4 h-4 text-[8px]',
            )} title={`${mission.requirements.logistics} Logistics`}>
              {mission.requirements.logistics}
            </div>
          )}
        </div>

        {/* Title */}
        <div className={clsx(
          'bg-slate-100 text-slate-900 font-semibold text-center border-b border-slate-300',
          isCompact ? 'mt-5 px-1 py-0.5 text-[6px] leading-tight' : 'mt-7 px-2 py-1 text-[9px]',
        )}>
          {mission.title}
        </div>

        {/* Art placeholder (only shown in fallback mode) */}
        {!isCompact && (
          <div className="flex-1 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center min-h-[30px]">
            <div className="text-slate-600 text-[8px]">[ Mission ]</div>
          </div>
        )}

        {/* Reward */}
        <div className={clsx(
          'bg-slate-100 text-slate-800 text-center border-t border-slate-300',
          isCompact ? 'px-1 py-0.5 text-[5px]' : 'px-2 py-1 text-[8px]',
        )}>
          {mission.reward}
        </div>

        {/* Type & Fame */}
        <div className={clsx(
          'text-center font-semibold',
          zoneTextColors[mission.zone],
          isCompact ? 'py-0.5 text-[5px]' : 'py-1 text-[8px]',
        )}>
          {mission.type} • {mission.fame} Fame
        </div>
      </div>
    </div>
  );
}

export default Card;
