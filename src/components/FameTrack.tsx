// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Fame Track
// Full-width numbered track (0-25) with colored player tokens showing position
// ═══════════════════════════════════════════════════════════════════════════════

import { clsx } from 'clsx';
import { PLAYER_COLORS } from './SpaceTrack';
import { VICTORY_THRESHOLD } from '@/data/constants';
import type { Player } from '@/types';

interface FameTrackProps {
  players: Player[];
  currentPlayerIndex: number;
}

export function FameTrack({ players, currentPlayerIndex }: FameTrackProps) {
  // Build a map of fame value → players at that position
  const positionMap = new Map<number, Array<{ player: Player; index: number }>>();
  players.forEach((player, index) => {
    const fame = player.fame;
    if (!positionMap.has(fame)) positionMap.set(fame, []);
    positionMap.get(fame)!.push({ player, index });
  });

  const leadingFame = Math.max(...players.map(p => p.fame));

  // Generate cells 0 to VICTORY_THRESHOLD
  const cells = Array.from({ length: VICTORY_THRESHOLD + 1 }, (_, i) => i);

  return (
    <div className="bg-slate-950/60 border-b border-amber-900/20 px-2 py-1">
      {/* Player legend */}
      <div className="flex items-center gap-3 mb-1 px-1">
        {players.map((player, index) => {
          const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
          const isCurrentTurn = index === currentPlayerIndex;
          return (
            <div key={player.name} className="flex items-center gap-1">
              <div className={clsx(
                'w-3 h-3 rounded-full',
                color.bg,
                isCurrentTurn && 'ring-1 ring-amber-400',
              )} />
              <span className={clsx(
                'text-[10px] font-semibold',
                color.text,
              )}>
                {player.name}
              </span>
              <span className="text-amber-400 text-[10px] font-bold">
                {player.fame}
              </span>
            </div>
          );
        })}
        <div className="ml-auto text-[10px] text-slate-500">
          ★ {VICTORY_THRESHOLD} to win
        </div>
      </div>

      {/* Full-width track — cells stretch to fill available space */}
      <div className="flex gap-0 w-full">
        {cells.map((cellValue) => {
          const playersHere = positionMap.get(cellValue) ?? [];
          const isFinishLine = cellValue === VICTORY_THRESHOLD;
          const isZero = cellValue === 0;
          const isMilestone = cellValue > 0 && cellValue % 5 === 0;

          return (
            <div
              key={cellValue}
              data-cell={cellValue}
              className={clsx(
                'flex-1 min-w-0 flex flex-col items-center relative',
                'border-r border-slate-800/60',
                isFinishLine && 'border-r-0',
              )}
            >
              {/* Player tokens */}
              <div className="h-5 flex items-end justify-center gap-0.5 mb-0.5">
                {playersHere.map(({ player, index }) => {
                  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
                  const isCurrentTurn = index === currentPlayerIndex;
                  const isLeader = player.fame === leadingFame && player.fame > 0;
                  return (
                    <div
                      key={player.name}
                      className={clsx(
                        'w-3.5 h-3.5 rounded-full flex items-center justify-center',
                        color.bg,
                        isCurrentTurn && 'ring-1 ring-amber-400',
                        isLeader && 'ring-1 ring-amber-400 shadow-sm shadow-amber-400/50',
                      )}
                      title={`${player.name}: ${player.fame} Fame`}
                    >
                      <span className="text-[7px] text-white font-bold drop-shadow">
                        {player.name[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Cell background and number */}
              <div className={clsx(
                'w-full h-4 flex items-center justify-center text-[8px] font-semibold rounded-sm',
                isFinishLine
                  ? 'bg-amber-700/40 text-amber-300'
                  : isMilestone
                    ? 'bg-slate-800/60 text-slate-400'
                    : isZero
                      ? 'bg-slate-900/40 text-slate-600'
                      : 'bg-slate-900/30 text-slate-600',
                playersHere.length > 0 && !isFinishLine && 'bg-slate-800/50',
              )}>
                {/* Show number on milestones, 0, finish, and every 5th cell.
                    Hide numbers on other cells at small widths for cleanliness */}
                {(isMilestone || isZero || isFinishLine || cellValue === 1) ? cellValue : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FameTrack;
