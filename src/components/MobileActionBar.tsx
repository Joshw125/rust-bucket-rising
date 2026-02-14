// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Mobile Action Bar
// Compact floating action controls for mobile (sits above MobileTabBar)
// ═══════════════════════════════════════════════════════════════════════════════

import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { useGameStore, useCurrentPlayer } from '@/hooks';

interface MobileActionBarProps {
  isMyTurn?: boolean;
}

export function MobileActionBar({ isMyTurn = true }: MobileActionBarProps) {
  const gameState = useGameStore((s) => s.gameState);
  const currentPlayer = useCurrentPlayer();
  const storeEndTurn = useGameStore((s) => s.endTurn);
  const storeCompleteMission = useGameStore((s) => s.completeMission);
  const storeMove = useGameStore((s) => s.move);
  const storeRestartTurn = useGameStore((s) => s.restartTurn);
  const canRestartTurn = useGameStore((s) => s.canRestartTurn);
  const storeCanCompleteMission = useGameStore((s) => s.canCompleteMission);

  if (!gameState || !currentPlayer) return null;

  const endTurn = () => {
    if (!isMyTurn) return false;
    return storeEndTurn();
  };

  const completeMission = () => {
    if (!isMyTurn) return false;
    return storeCompleteMission();
  };

  const move = (direction: -1 | 1) => {
    if (!isMyTurn) return false;
    return storeMove(direction);
  };

  const restartTurn = () => {
    if (!isMyTurn) return false;
    return storeRestartTurn();
  };

  const canRestart = canRestartTurn();
  const meetsMissionRequirements = storeCanCompleteMission();

  // Build mission requirement tooltip
  const getMissionTooltip = (): string => {
    if (!isMyTurn) return 'Wait for your turn';
    const trackMission = gameState.trackMissions[currentPlayer.location];
    if (!trackMission?.revealed) return 'No mission here';
    const hasCorruptedNav = currentPlayer.hand.some(c => c.type === 'hazard' && c.id === 'corrupted-nav-chip');
    if (hasCorruptedNav) return 'Blocked by Corrupted Nav Chip!';
    const reqs = trackMission.mission.requirements;
    const parts: string[] = [];
    for (const sys of ['weapons', 'computers', 'engines', 'logistics'] as const) {
      const needed = (reqs[sys] ?? 0) - currentPlayer.missionDiscount;
      if (needed > 0) {
        const have = currentPlayer.currentPower[sys];
        parts.push(`${sys}: ${have}/${needed}${have >= needed ? '\u2713' : '\u2717'}`);
      }
    }
    if (meetsMissionRequirements) return `Ready! ${parts.join(', ')}`;
    return `Need: ${parts.join(', ')}`;
  };

  // Movement state
  const canMove = isMyTurn && (currentPlayer.movesRemaining > 0 || currentPlayer.currentPower.engines >= 1);
  const canMoveLeft = currentPlayer.location > 1 && canMove;
  const canMoveRight = currentPlayer.location < 6 && canMove;

  // Shared button base class
  const btnBase = 'min-w-[44px] min-h-[40px] flex items-center justify-center rounded-lg font-semibold transition-all text-sm';

  return (
    <div className="mobile-action-bar safe-area-bottom">
      {/* Player status strip */}
      <div className="flex items-center gap-1.5 mr-1">
        <span className="text-amber-400 font-bold text-sm">★
          <motion.span
            key={`mfame-${currentPlayer.fame}`}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-block"
          >
            {currentPlayer.fame}
          </motion.span>
        </span>
        <span className="text-amber-300 text-xs">💰
          <motion.span
            key={`mcred-${currentPlayer.credits}`}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-block"
          >
            {currentPlayer.credits}
          </motion.span>
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-amber-900/30" />

      {/* Movement */}
      <button
        className={clsx(btnBase, 'px-2',
          canMoveLeft ? 'bg-engines text-white' : 'bg-slate-800 text-slate-600',
        )}
        onClick={() => move(-1)}
        disabled={!canMoveLeft}
      >
        ←
      </button>

      <div className="text-center px-1">
        <div className="text-amber-400 font-bold text-xs leading-none">📍{currentPlayer.location}</div>
        <div className="text-slate-500 text-[8px] leading-none mt-0.5">
          {currentPlayer.movesRemaining > 0 ? `${currentPlayer.movesRemaining}F` : `${currentPlayer.currentPower.engines}⚡`}
        </div>
      </div>

      <button
        className={clsx(btnBase, 'px-2',
          canMoveRight ? 'bg-engines text-white' : 'bg-slate-800 text-slate-600',
        )}
        onClick={() => move(1)}
        disabled={!canMoveRight}
      >
        →
      </button>

      {/* Divider */}
      <div className="w-px h-7 bg-amber-900/30" />

      {/* Mission */}
      <button
        className={clsx(btnBase, 'px-2',
          isMyTurn && meetsMissionRequirements
            ? 'bg-deep text-white animate-pulse-subtle'
            : 'bg-slate-800 text-slate-600',
        )}
        onClick={completeMission}
        disabled={!isMyTurn || !meetsMissionRequirements}
        title={getMissionTooltip()}
      >
        🎯
      </button>

      {/* Undo */}
      <button
        className={clsx(btnBase, 'px-2',
          isMyTurn && canRestart ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-600',
        )}
        onClick={restartTurn}
        disabled={!isMyTurn || !canRestart}
      >
        🔄
      </button>

      {/* End Turn */}
      <button
        className={clsx(btnBase, 'px-3',
          isMyTurn ? 'bg-red-700 text-white font-bold' : 'bg-slate-700 text-slate-500',
        )}
        onClick={endTurn}
        disabled={!isMyTurn}
      >
        End
      </button>
    </div>
  );
}
