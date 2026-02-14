// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Animation Overlay
// Portal-mounted ghost card renderer for flying card animations
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimationStore } from '@/hooks/useAnimationStore';
import { PLAYER_COLORS } from './SpaceTrack';
import { Card } from './Card';
import type { AnimationEvent } from '@/hooks/useAnimationStore';

// ─────────────────────────────────────────────────────────────────────────────
// Ghost Card Component (flies from source to target)
// ─────────────────────────────────────────────────────────────────────────────

function GhostCard({ event }: { event: AnimationEvent & { type: 'card-play' | 'card-install' | 'card-trash' | 'card-buy' } }) {
  const dismiss = useAnimationStore((s) => s.dismiss);
  const getRefRect = useAnimationStore((s) => s.getRefRect);

  const from = event.fromRect;

  // Determine target position
  let targetRect: DOMRect | null = null;
  if (event.type === 'card-play') {
    targetRect = getRefRect(event.target === 'played' ? 'playedPile' : 'discardPile');
  } else if (event.type === 'card-install') {
    // Install: shrink toward the sidebar
    targetRect = getRefRect('playedPile');
  } else if (event.type === 'card-trash') {
    targetRect = getRefRect('discardPile');
  } else if (event.type === 'card-buy') {
    // Buy: fly from market to discard pile
    targetRect = getRefRect('discardPile');
  }

  // Fallback: animate in place if no target ref
  const toX = targetRect ? targetRect.left + targetRect.width / 2 - from.width / 2 : from.left;
  const toY = targetRect ? targetRect.top : from.top + 100;

  const isTrash = event.type === 'card-trash';
  const isBuy = event.type === 'card-buy';

  return (
    <motion.div
      initial={{
        position: 'fixed',
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
        opacity: 1,
        scale: 1,
        zIndex: 9999,
        pointerEvents: 'none' as const,
      }}
      animate={{
        left: toX,
        top: toY,
        scale: isTrash ? 0.3 : 0.4,
        opacity: isTrash ? 0 : 0.7,
        rotate: isTrash ? 15 : isBuy ? -5 : 0,
      }}
      transition={{
        duration: isBuy ? 0.4 : 0.35,
        ease: 'easeInOut',
      }}
      onAnimationComplete={() => dismiss(event.id)}
      style={{ position: 'fixed', pointerEvents: 'none' }}
    >
      <Card card={event.card} size="small" />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating Number Component ("+2" credits flying to counter)
// ─────────────────────────────────────────────────────────────────────────────

function FloatingNumber({ event }: { event: AnimationEvent & { type: 'credits-change' | 'fame-change' } }) {
  const dismiss = useAnimationStore((s) => s.dismiss);
  const getRefRect = useAnimationStore((s) => s.getRefRect);

  const refKey = event.type === 'credits-change' ? 'creditCounter' : 'fameCounter';
  const rect = getRefRect(refKey);

  if (!rect) {
    // Dismiss immediately if no target
    useEffect(() => { dismiss(event.id); }, []);
    return null;
  }

  const isPositive = event.delta > 0;
  const text = isPositive ? `+${event.delta}` : `${event.delta}`;
  const color = event.type === 'credits-change'
    ? (isPositive ? '#fbbf24' : '#ef4444')
    : (isPositive ? '#a855f7' : '#ef4444');

  return (
    <motion.div
      initial={{
        position: 'fixed',
        left: rect.left + rect.width / 2,
        top: rect.top,
        opacity: 1,
        scale: 1.5,
        y: 0,
      }}
      animate={{
        opacity: 0,
        scale: 0.8,
        y: -40,
      }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onAnimationComplete={() => dismiss(event.id)}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        fontWeight: 'bold',
        fontSize: '1.2rem',
        color,
        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        transform: 'translateX(-50%)',
      }}
    >
      {text}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Red Flash for Hazard Reveal
// ─────────────────────────────────────────────────────────────────────────────

function HazardFlash({ event }: { event: AnimationEvent & { type: 'hazard-reveal' } }) {
  const dismiss = useAnimationStore((s) => s.dismiss);

  return (
    <motion.div
      initial={{ opacity: 0.35 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => dismiss(event.id)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#991b1b',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn Start Banner ("Your Turn!" popup)
// ─────────────────────────────────────────────────────────────────────────────

function TurnStartBanner({ event }: { event: AnimationEvent & { type: 'turn-start' } }) {
  const dismiss = useAnimationStore((s) => s.dismiss);
  const color = PLAYER_COLORS[event.playerIndex % PLAYER_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onAnimationComplete={() => {
        // Hold for 1.2s then dismiss
        setTimeout(() => dismiss(event.id), 1200);
      }}
      style={{
        position: 'fixed',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        className="px-8 py-4 rounded-xl shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${color.hex}20, ${color.hex}40)`,
          border: `2px solid ${color.hex}80`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1" style={{ textShadow: `0 0 20px ${color.hex}` }}>
            {event.playerName}'s Turn!
          </div>
          <div className="text-sm" style={{ color: color.hex }}>
            Action Phase
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Overlay (portal-mounted)
// ─────────────────────────────────────────────────────────────────────────────

export function AnimationOverlay() {
  const events = useAnimationStore((s) => s.events);

  return createPortal(
    <AnimatePresence>
      {events.map((event) => {
        switch (event.type) {
          case 'card-play':
          case 'card-install':
          case 'card-trash':
          case 'card-buy':
            return <GhostCard key={event.id} event={event} />;
          case 'credits-change':
          case 'fame-change':
            return <FloatingNumber key={event.id} event={event} />;
          case 'hazard-reveal':
            return <HazardFlash key={event.id} event={event} />;
          case 'turn-start':
            return <TurnStartBanner key={event.id} event={event} />;
          case 'mission-complete':
            // Handled by modal pop animation directly
            return null;
          default:
            return null;
        }
      })}
    </AnimatePresence>,
    document.body,
  );
}

export default AnimationOverlay;
