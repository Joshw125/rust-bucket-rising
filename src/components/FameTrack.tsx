// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Fame Track
// Horizontal scoreboard showing all players' fame with colored star tokens
// ═══════════════════════════════════════════════════════════════════════════════

import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { PLAYER_COLORS } from './SpaceTrack';
import { VICTORY_THRESHOLD } from '@/data/constants';
import type { Player } from '@/types';

interface FameTrackProps {
  players: Player[];
  currentPlayerIndex: number;
}

export function FameTrack({ players, currentPlayerIndex }: FameTrackProps) {
  // Sort by fame descending for display (but keep original index for colors)
  const sortedPlayers = players
    .map((p, i) => ({ player: p, index: i }))
    .sort((a, b) => b.player.fame - a.player.fame);

  const leadingFame = sortedPlayers[0]?.player.fame ?? 0;

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-slate-950/50 border-b border-amber-900/20">
      {sortedPlayers.map(({ player, index }) => {
        const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
        const isCurrentTurn = index === currentPlayerIndex;
        const isLeader = player.fame === leadingFame && player.fame > 0;

        return (
          <div
            key={player.name}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all',
              isCurrentTurn
                ? 'bg-slate-800/80 ring-1 ring-amber-500/40'
                : 'bg-slate-900/40',
            )}
          >
            {/* Colored star token */}
            <div className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
              color.bg,
              isLeader && 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/30',
            )}>
              <span className="text-white drop-shadow">★</span>
            </div>

            {/* Player name (colored) */}
            <span className={clsx(
              'text-xs font-semibold truncate max-w-[80px]',
              color.text,
            )}>
              {player.name}
            </span>

            {/* Fame counter */}
            <motion.span
              key={`fame-track-${index}-${player.fame}`}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-amber-400 font-bold text-sm min-w-[16px] text-center"
            >
              {player.fame}
            </motion.span>
          </div>
        );
      })}

      {/* Victory goal */}
      <div className="flex items-center gap-1 ml-2 text-slate-600 text-[10px]">
        <span className="text-amber-600">★</span>
        <span>{VICTORY_THRESHOLD}</span>
      </div>
    </div>
  );
}

export default FameTrack;
