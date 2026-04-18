// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Game Board Layout (Redesigned)
// Steam-quality layout with ship tableau and fanned hand
// ═══════════════════════════════════════════════════════════════════════════════

import { clsx } from 'clsx';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGameStore, useCurrentPlayer, usePlayers, useIsGameOver, useWinner, useMultiplayer } from '@/hooks';
import { useUIScaleStore } from '@/hooks/useUIScaleStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMobileViewStore } from '@/hooks/useMobileViewStore';
import { useAnimationStore } from '@/hooks/useAnimationStore';
import { SpaceTrack } from './SpaceTrack';
import { ExpandedSystemPanel } from './PlayerStatsBar';
import { HandDisplay } from './HandDisplay';
import { OpponentBar } from './OpponentBar';
import { PyramidMarket } from './PyramidMarket';
import { MarketOverlay } from './MarketDisplay';
import { Card, MissionCard, CardBack } from './Card';
import { ScaledSection } from './ScaledSection';
import { ScaleSettingsPanel } from './ScaleSettingsPanel';
import { MobileTabBar } from './MobileTabBar';
import { MobileActionBar } from './MobileActionBar';
import { AnimationOverlay } from './AnimationOverlay';
import { GameLogPanel } from './GameLogPanel';
import { FameTrack } from './FameTrack';
import { ActionButtonWithTooltip } from './ActionTooltip';
import { PLAYER_COLORS } from './SpaceTrack';
import type { SystemType, MissionInstance, CardInstance, Player, Captain } from '@shared/types';
import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Game Board Context (provides online game info to modal components)
// ─────────────────────────────────────────────────────────────────────────────

interface GameBoardContextValue {
  isOnlineGame: boolean;
  localPlayerId: number | null; // The local player's player.id in online mode
}

const GameBoardContext = createContext<GameBoardContextValue>({
  isOnlineGame: false,
  localPlayerId: null,
});

/** Returns true if the pending action should be shown to the local player */
function useShouldShowPendingAction(): boolean {
  const { isOnlineGame, localPlayerId } = useContext(GameBoardContext);
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState?.pendingAction) return false;
  if (!isOnlineGame) return true; // Local game: always show
  return gameState.pendingAction.playerId === localPlayerId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Header Component
// ─────────────────────────────────────────────────────────────────────────────

function GameHeader() {
  const gameState = useGameStore((s) => s.gameState);
  const currentPlayer = useCurrentPlayer();
  const toggleScalePanel = useUIScaleStore((s) => s.toggleScalePanel);
  const showScalePanel = useUIScaleStore((s) => s.showScalePanel);
  if (!gameState || !currentPlayer) return null;

  const playerColor = PLAYER_COLORS[gameState.currentPlayerIndex % PLAYER_COLORS.length];

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-amber-500">RUST BUCKET</span>
          <span className="text-slate-400"> RISING</span>
        </h1>
        <button
          onClick={toggleScalePanel}
          className={clsx(
            'text-sm px-2 py-1 rounded transition-all desktop-only',
            showScalePanel
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          )}
          title="UI Scale Settings"
        >
          ⚙️
        </button>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-500">
          Turn <span className="text-amber-400 font-bold">{gameState.turn}</span>
        </span>

        <span className={clsx(
          'px-2 py-0.5 rounded text-xs font-semibold uppercase',
          gameState.phase === 'initial' && 'bg-red-500/20 text-red-400',
          gameState.phase === 'action' && 'bg-amber-500/20 text-amber-400',
          gameState.phase === 'cleanup' && 'bg-slate-500/20 text-slate-400',
        )}>
          {gameState.phase} Phase
        </span>

        {gameState.hasRevealedInfo && (
          <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400" title="New information revealed - cannot restart turn">
            🔒 Info Revealed
          </span>
        )}

        <div className="flex items-center gap-2">
          <span className={clsx('w-2 h-2 rounded-full animate-pulse', playerColor.bg)} />
          <span className={clsx('font-semibold', playerColor.text)}>{currentPlayer.name}'s Turn</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trophy & Mission Item Components (with hover preview)
// ─────────────────────────────────────────────────────────────────────────────

function TrophyItem({ trophy, onView }: { trophy: MissionInstance; onView: () => void }) {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: rect.left - 10, y: rect.top + rect.height / 2 });
    setIsHovering(true);
  };

  return (
    <div
      className="relative flex items-center gap-2 px-2 py-1 bg-purple-900/20 rounded border border-purple-800/30 cursor-pointer hover:bg-purple-900/30 transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovering(false)}
      onClick={onView}
    >
      <span className="text-purple-400 text-xs">🏆</span>
      <div className="flex-1 min-w-0">
        <div className="text-purple-300 text-xs font-semibold truncate">{trophy.title}</div>
        <div className="text-purple-400/70 text-[10px]">{trophy.reward}</div>
      </div>
      <div className="text-purple-400 text-xs font-bold">+{trophy.fame}★</div>

      {/* Hover preview - portaled to body to escape sidebar transform */}
      {isHovering && createPortal(
        <div
          className="fixed pointer-events-none"
          style={{
            left: hoverPos.x,
            top: hoverPos.y,
            transform: 'translate(-100%, -50%)',
            zIndex: 9999,
          }}
        >
          <MissionCard mission={trophy} size="normal" />
        </div>,
        document.body
      )}
    </div>
  );
}

function MissionItem({ mission, onView }: { mission: MissionInstance; onView: () => void }) {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: rect.left - 10, y: rect.top + rect.height / 2 });
    setIsHovering(true);
  };

  const zoneColors = {
    bolt: 'bg-amber-900/20 border-amber-800/30 text-amber-300',
    gear: 'bg-green-900/20 border-green-800/30 text-green-300',
    trophy: 'bg-purple-900/20 border-purple-800/30 text-purple-300',
  };

  return (
    <div
      className={clsx(
        'relative flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-colors',
        zoneColors[mission.rewardType],
        'hover:opacity-80',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovering(false)}
      onClick={onView}
    >
      <span className="text-xs">{mission.rewardType === 'bolt' ? '⚡' : mission.rewardType === 'gear' ? '⚙️' : '🏆'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">{mission.title}</div>
      </div>
      <div className="text-xs font-bold">+{mission.fame}★</div>

      {/* Hover preview - portaled to body to escape sidebar transform */}
      {isHovering && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Bar Component
// ─────────────────────────────────────────────────────────────────────────────

function ActionBar({ isMyTurn = true }: { isMyTurn?: boolean }) {
  const gameState = useGameStore((s) => s.gameState);
  const currentPlayer = useCurrentPlayer();
  const storeEndTurn = useGameStore((s) => s.endTurn);
  const storeCompleteMission = useGameStore((s) => s.completeMission);
  const storeMove = useGameStore((s) => s.move);
  const toggleMarket = useGameStore((s) => s.toggleMarket);
  const showMarket = useGameStore((s) => s.showMarket);
  const storeRestartTurn = useGameStore((s) => s.restartTurn);
  const canRestartTurn = useGameStore((s) => s.canRestartTurn);
  const storeCanCompleteMission = useGameStore((s) => s.canCompleteMission);

  // Wrap actions to check turn ownership (multiplayer sync happens via store callback)
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

  if (!gameState || !currentPlayer) return null;

  const canRestart = canRestartTurn();

  // Check if can complete mission at current location (delegate to engine for single source of truth)
  const trackMission = gameState.trackMissions[currentPlayer.location];
  const missionRevealed = trackMission?.revealed;
  const meetsMissionRequirements = storeCanCompleteMission();

  // Build descriptive tooltip lines for mission button
  const getMissionTooltipLines = (): string[] => {
    if (!isMyTurn) return ['Wait for your turn'];
    if (!trackMission || !missionRevealed) return ['No mission at this location'];
    const hasCorruptedNav = currentPlayer.hand.some(c => c.type === 'hazard' && c.id === 'corrupted-nav-chip');
    if (hasCorruptedNav) return ['Blocked by Corrupted Nav Chip!'];
    const mission = trackMission.mission;
    const reqs = mission.requirements;
    const lines: string[] = [];
    for (const sys of ['weapons', 'computers', 'engines', 'logistics'] as const) {
      const needed = (reqs[sys] ?? 0) - currentPlayer.missionDiscount;
      if (needed > 0) {
        const have = currentPlayer.currentPower[sys];
        const met = have >= needed;
        lines.push(`${sys[0].toUpperCase() + sys.slice(1)}: ${have}/${needed} ${met ? '\u2713' : '\u2717'}`);
      }
    }
    const hasWarrant = currentPlayer.hand.some(c => c.type === 'hazard' && c.id === 'warrant-issued');
    if (hasWarrant) lines.push(`Credits: ${currentPlayer.credits}/2 (warrant)`);
    return lines;
  };

  // Check if player can move
  const canMove = isMyTurn && (currentPlayer.movesRemaining > 0 || currentPlayer.currentPower.engines >= 1);
  const canMoveLeft = currentPlayer.location > 1 && canMove;
  const canMoveRight = currentPlayer.location < 6 && canMove;

  const moveCostText = currentPlayer.movesRemaining > 0
    ? `${currentPlayer.movesRemaining} Free`
    : `${currentPlayer.currentPower.engines}⚡`;

  // Tooltip lines for disabled move buttons
  const getMoveTooltipLines = (dir: 'left' | 'right'): string[] => {
    if (!isMyTurn) return ['Wait for your turn'];
    const lines: string[] = [];
    if (dir === 'left' && currentPlayer.location <= 1) lines.push('Already at location 1');
    if (dir === 'right' && currentPlayer.location >= 6) lines.push('Already at location 6');
    if (currentPlayer.movesRemaining <= 0 && currentPlayer.currentPower.engines < 1) {
      lines.push('No free moves remaining');
      lines.push('Need 1 Engine power to move');
    }
    return lines;
  };

  // Tooltip for restart button
  const getRestartTooltipLines = (): string[] => {
    if (!isMyTurn) return ['Wait for your turn'];
    if (!canRestart) return ['Info revealed this turn', 'Cannot undo'];
    return [];
  };

  const missionDisabled = !isMyTurn || !meetsMissionRequirements;
  const missionTooltipLines = missionDisabled ? getMissionTooltipLines() : [];

  return (
    <div className="action-bar">
      {/* Movement */}
      <div className="flex items-center gap-2">
        <ActionButtonWithTooltip
          disabled={!canMoveLeft}
          tooltipLines={!canMoveLeft ? getMoveTooltipLines('left') : []}
          className={clsx(
            'px-4 py-2 rounded-lg font-semibold transition-all',
            canMoveLeft
              ? 'bg-engines hover:bg-engines-light text-white shadow-lg shadow-engines/20'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed',
          )}
          onClick={() => move(-1)}
        >
          ←
        </ActionButtonWithTooltip>
        <div className="text-center px-2">
          <div className="text-amber-400 font-bold">📍 {currentPlayer.location}</div>
          <div className="text-slate-500 text-[10px]">{moveCostText}</div>
        </div>
        <ActionButtonWithTooltip
          disabled={!canMoveRight}
          tooltipLines={!canMoveRight ? getMoveTooltipLines('right') : []}
          className={clsx(
            'px-4 py-2 rounded-lg font-semibold transition-all',
            canMoveRight
              ? 'bg-engines hover:bg-engines-light text-white shadow-lg shadow-engines/20'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed',
          )}
          onClick={() => move(1)}
        >
          →
        </ActionButtonWithTooltip>
      </div>

      <div className="action-bar-divider" />

      {/* Mission */}
      <ActionButtonWithTooltip
        disabled={missionDisabled}
        tooltipLines={missionTooltipLines}
        className={clsx(
          'px-4 py-2 rounded-lg font-semibold transition-all',
          isMyTurn && meetsMissionRequirements
            ? 'bg-deep hover:bg-deep-light text-white shadow-lg shadow-deep/20 animate-pulse-subtle'
            : missionRevealed
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed',
        )}
        onClick={completeMission}
      >
        🎯 Complete Mission
      </ActionButtonWithTooltip>

      {/* Market */}
      <button
        className={clsx(
          'px-4 py-2 rounded-lg font-semibold transition-all',
          showMarket
            ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
            : 'bg-slate-700/50 hover:bg-slate-600 text-slate-200',
        )}
        onClick={toggleMarket}
      >
        🏪 Market
      </button>

      <div className="action-bar-divider" />

      {/* Restart Turn */}
      <ActionButtonWithTooltip
        disabled={!isMyTurn || !canRestart}
        tooltipLines={getRestartTooltipLines()}
        className={clsx(
          'px-3 py-2 rounded-lg font-semibold transition-all text-sm flex items-center gap-1',
          isMyTurn && canRestart
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed',
        )}
        onClick={restartTurn}
      >
        🔄 {canRestart ? 'Undo' : ''}
      </ActionButtonWithTooltip>

      {/* End Turn */}
      <ActionButtonWithTooltip
        disabled={!isMyTurn}
        tooltipLines={!isMyTurn ? ['Wait for your turn'] : []}
        className={clsx(
          'px-6 py-2 rounded-lg font-bold transition-all shadow-lg',
          isMyTurn
            ? 'bg-red-700 hover:bg-red-600 text-white shadow-red-900/30'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none',
        )}
        onClick={endTurn}
      >
        End Turn
      </ActionButtonWithTooltip>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Victory Screen
// ─────────────────────────────────────────────────────────────────────────────

function VictoryScreen() {
  const winner = useWinner();
  const players = usePlayers();

  if (!winner) return null;

  const sortedPlayers = [...players].sort((a, b) => b.fame - a.fame);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold text-amber-500 mb-2">Victory!</h1>
        <p className="text-xl text-white mb-6">
          {winner.name} wins with {winner.fame} Fame!
        </p>

        <div className="space-y-2 mb-6">
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className={clsx(
                'flex items-center justify-between px-4 py-2 rounded',
                idx === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300',
              )}
            >
              <span>{idx === 0 ? '👑' : `${idx + 1}.`} {player.name}</span>
              <span className="font-bold">{player.fame} Fame</span>
            </div>
          ))}
        </div>

        <button
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors"
          onClick={() => window.location.reload()}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card/Mission Viewer Modal
// ─────────────────────────────────────────────────────────────────────────────

function ViewerModal() {
  const viewingCard = useGameStore((s) => s.viewingCard);
  const viewingMission = useGameStore((s) => s.viewingMission);
  const viewCard = useGameStore((s) => s.viewCard);
  const viewMission = useGameStore((s) => s.viewMission);

  if (!viewingCard && !viewingMission) return null;

  const close = () => {
    viewCard(null);
    viewMission(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-40"
      onClick={close}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {viewingCard && <Card card={viewingCard} size="huge" />}
        {viewingMission && <MissionCard mission={viewingMission} size="huge" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hazard Reveal Modal (Initial Phase)
// ─────────────────────────────────────────────────────────────────────────────

function HazardRevealModal() {
  const gameState = useGameStore((s) => s.gameState);
  const resolveHazardReveal = useGameStore((s) => s.resolveHazardReveal);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;

  const pendingAction = gameState.pendingAction;
  if (pendingAction?.type !== 'revealHazards') return null;
  if (!shouldShow) return null;

  const hazards = pendingAction.data?.hazards ?? [];
  if (hazards.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-lg">
        <h2 className="text-2xl font-bold text-red-400 text-center mb-2">
          ⚠️ Hazard Alert!
        </h2>
        <p className="text-slate-400 text-center mb-4">
          The following hazards are active in your hand this turn:
        </p>

        <div className="space-y-3 mb-6">
          {hazards.map((hazard, idx) => (
            <div
              key={hazard.instanceId || idx}
              className="bg-red-900/30 border border-red-700 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">☢️</div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-400">{hazard.title}</h3>
                  <p className="text-sm text-slate-300 mt-1">
                    {(hazard as { effect?: string }).effect || 'Hazard effect'}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Clear: {(hazard as { clearCondition?: string }).clearCondition || 'See card for details'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors"
          onClick={resolveHazardReveal}
        >
          Acknowledge & Continue
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trash Card Modal (Logistics 3-power ability)
// ─────────────────────────────────────────────────────────────────────────────

function TrashCardModal() {
  const gameState = useGameStore((s) => s.gameState);
  const resolveTrashCard = useGameStore((s) => s.resolveTrashCard);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;

  const pendingAction = gameState.pendingAction;
  if (pendingAction?.type !== 'trashCard') return null;
  if (!shouldShow) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const source = pendingAction.data?.source;
  const handCards = currentPlayer.hand;
  const playedCards = currentPlayer.played;
  const discardCards = source === 'hand' ? [] : currentPlayer.discard;

  const totalCards = handCards.length + playedCards.length + discardCards.length;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-logistics-light text-center mb-2">
          🗑️ Trash a Card
        </h2>
        <p className="text-slate-400 text-center mb-4">
          Select a card to permanently remove from the game
        </p>

        {handCards.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">From Hand:</h3>
            <div className="flex gap-2 flex-wrap justify-center">
              {handCards.map((card) => (
                <div key={card.instanceId} className="relative">
                  <Card card={card} size="normal" />
                  <button
                    className="absolute inset-0 bg-red-500/0 hover:bg-red-500/30 transition-colors rounded flex items-center justify-center opacity-0 hover:opacity-100"
                    onClick={() => resolveTrashCard(card.instanceId)}
                  >
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                      Trash
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {playedCards.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">From Played This Turn:</h3>
            <div className="flex gap-2 flex-wrap justify-center">
              {playedCards.map((card) => (
                <div key={card.instanceId} className="relative">
                  <Card card={card} size="normal" />
                  <button
                    className="absolute inset-0 bg-red-500/0 hover:bg-red-500/30 transition-colors rounded flex items-center justify-center opacity-0 hover:opacity-100"
                    onClick={() => resolveTrashCard(card.instanceId)}
                  >
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                      Trash
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {discardCards.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">From Discard:</h3>
            <div className="flex gap-2 flex-wrap justify-center">
              {discardCards.map((card) => (
                <div key={card.instanceId} className="relative">
                  <Card card={card} size="normal" />
                  <button
                    className="absolute inset-0 bg-red-500/0 hover:bg-red-500/30 transition-colors rounded flex items-center justify-center opacity-0 hover:opacity-100"
                    onClick={() => resolveTrashCard(card.instanceId)}
                  >
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                      Trash
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalCards === 0 && (
          <p className="text-slate-500 text-center py-4">No cards available to trash</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mission Reward Modal
// ─────────────────────────────────────────────────────────────────────────────

function MissionRewardModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;

  const pendingAction = gameState.pendingAction;
  if (pendingAction?.type !== 'missionReward') return null;
  if (!shouldShow) return null;

  const mission = pendingAction.data?.mission;
  const powerAmount = pendingAction.data?.powerAmount ?? 0;
  const rewardType = pendingAction.data?.rewardType;

  const handleSelectSystem = (system: 'weapons' | 'computers' | 'engines' | 'logistics') => {
    dispatch({ type: 'RESOLVE_PENDING', choice: system });
  };

  const systems = [
    { key: 'weapons' as const, name: 'Weapons', color: 'bg-weapons', textColor: 'text-weapons-light' },
    { key: 'computers' as const, name: 'Computers', color: 'bg-computers', textColor: 'text-computers-light' },
    { key: 'engines' as const, name: 'Engines', color: 'bg-engines', textColor: 'text-engines-light' },
    { key: 'logistics' as const, name: 'Logistics', color: 'bg-logistics', textColor: 'text-logistics-light' },
  ];

  let title = 'Mission Reward';
  let rewardIcon = '⚡';

  // Gear rewards ALWAYS need system selection (even with 0 power)
  // Trophy rewards only need system selection if there's power to allocate
  const needsSystemSelection = rewardType === 'gear' || powerAmount > 0;

  switch (rewardType) {
    case 'bolt':
      title = 'Instant Reward';
      rewardIcon = '⚡';
      break;
    case 'gear':
      title = 'Install Gear';
      rewardIcon = '⚙️';
      break;
    case 'trophy':
      title = 'Trophy Acquired!';
      rewardIcon = '🏆';
      break;
  }

  // Compact dropdown style (matching PowerChoiceModal)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="game-panel p-4 max-w-xs">
        <div className="text-center mb-3">
          <div className="text-2xl mb-1">{rewardIcon}</div>
          <div className="text-amber-400 font-bold text-sm">{title}</div>
          {mission && <div className="text-slate-300 text-xs">"{mission.title}"</div>}
          {mission && <div className="text-slate-500 text-[10px] mt-1">{mission.reward}</div>}
        </div>

        {needsSystemSelection && (
          <div className="flex flex-col gap-1">
            {systems.map((sys) => (
              <button
                key={sys.key}
                className={clsx(
                  'flex items-center justify-between px-3 py-2 rounded font-semibold transition-all',
                  'hover:bg-slate-700',
                  sys.textColor,
                )}
                onClick={() => handleSelectSystem(sys.key)}
              >
                <span>{sys.name}</span>
                <span className={clsx('px-2 py-0.5 rounded text-sm text-white', sys.color)}>
                  {rewardType === 'gear' ? 'Install' : `+${powerAmount}⚡`}
                </span>
              </button>
            ))}
          </div>
        )}

        {!needsSystemSelection && (
          <button
            className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors"
            onClick={() => handleSelectSystem('weapons')}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mission Reward Choice Modal
// ─────────────────────────────────────────────────────────────────────────────

function MissionRewardChoiceModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;

  const pendingAction = gameState.pendingAction;
  if (pendingAction?.type !== 'missionRewardChoice') return null;
  if (!shouldShow) return null;

  const mission = pendingAction.data?.mission;
  const choices = mission?.rewardData?.choice ?? [];

  const handleChoice = (index: number) => {
    dispatch({ type: 'RESOLVE_PENDING', choice: index });
  };

  const formatChoice = (choice: any): string => {
    const parts: string[] = [];
    if (choice.powerChoice) parts.push(`+${choice.powerChoice}⚡`);
    if (choice.credits) parts.push(`+${choice.credits} Credits`);
    if (choice.draw) parts.push(`Draw ${choice.draw}`);
    return parts.join(', ') || 'Unknown reward';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-md">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🎁</div>
          <h2 className="text-2xl font-bold text-amber-400">Choose Your Reward</h2>
          {mission && <p className="text-slate-300 mt-1">"{mission.title}"</p>}
        </div>

        <div className="space-y-3">
          {choices.map((choice, idx) => (
            <button
              key={idx}
              className="w-full p-4 rounded-lg font-semibold text-white bg-slate-700 hover:bg-slate-600 transition-all border-2 border-slate-600 hover:border-amber-500"
              onClick={() => handleChoice(idx)}
            >
              <div className="text-lg">{formatChoice(choice)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Target Player Modal
// ─────────────────────────────────────────────────────────────────────────────

function TargetPlayerModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const animEmit = useAnimationStore((s) => s.emit);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;

  const pendingAction = gameState.pendingAction;
  if (pendingAction?.type !== 'targetPlayer') return null;
  if (!shouldShow) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const source = pendingAction.data?.source;
  const interactionType = pendingAction.data?.interactionType;

  // Determine valid targets based on interaction type
  const validTargetIds = pendingAction.data?.targetPlayerIds;
  const isLocationRestricted = source === 'giveHazardAtLocation' || !interactionType;
  const validTargets = validTargetIds
    ? gameState.players.filter(p => validTargetIds.includes(p.id))
    : gameState.players.filter(p => {
        if (p.id === currentPlayer.id) return false;
        if (isLocationRestricted && p.location !== currentPlayer.location) return false;
        return true;
      });

  // Contextual text based on interaction type
  const getModalInfo = () => {
    switch (interactionType) {
      case 'forceDiscard': return { icon: '📡', title: 'Select Target', desc: 'Choose a player to force discard', color: 'text-computers-light' };
      case 'revealAndChooseDiscard': return { icon: '🔍', title: 'Select Target', desc: 'Choose a player to hack', color: 'text-computers-light' };
      case 'drainPower': return { icon: '💥', title: 'Select Target', desc: 'Choose a player to drain power', color: 'text-engines-light' };
      case 'pullPlayer': return { icon: '🧲', title: 'Pull Player', desc: 'Choose a player to pull to your location', color: 'text-engines-light' };
      case 'forceUninstall': return { icon: '📋', title: 'Select Target', desc: 'Choose a player to repossess from', color: 'text-logistics-light' };
      case 'forceUninstallOrDiscard': return { icon: '⚖️', title: 'Select Target', desc: 'Choose a player to target', color: 'text-logistics-light' };
      default: return { icon: '🎯', title: 'Select Target', desc: 'Choose a player to give a hazard', color: 'text-weapons-light' };
    }
  };

  const info = getModalInfo();

  const handleSelectTarget = (playerId: number) => {
    const target = gameState.players.find(p => p.id === playerId);
    if (!interactionType) {
      // Default: hazard giving with animation
      const topHazard = gameState.hazardDeck.length > 0
        ? gameState.hazardDeck[gameState.hazardDeck.length - 1]
        : null;
      dispatch({ type: 'RESOLVE_PENDING', choice: playerId });
      if (target) {
        animEmit({
          type: 'hazard-given',
          targetName: target.name,
          hazardTitle: topHazard?.title ?? 'Hazard',
        });
      }
    } else {
      dispatch({ type: 'RESOLVE_PENDING', choice: playerId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-md">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{info.icon}</div>
          <h2 className={`text-2xl font-bold ${info.color}`}>{info.title}</h2>
          <p className="text-slate-400 text-sm mt-2">{info.desc}</p>
        </div>

        {validTargets.length > 0 ? (
          <div className="space-y-2">
            {validTargets.map((player) => (
              <button
                key={player.id}
                className="w-full p-3 rounded-lg font-semibold text-white bg-slate-700 hover:bg-weapons/30 transition-all border-2 border-slate-600 hover:border-weapons flex items-center justify-between"
                onClick={() => handleSelectTarget(player.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  <span>{player.name}</span>
                  <span className="text-slate-500 text-sm">({player.captain.name})</span>
                </div>
                <div className="text-sm text-slate-400">📍 Location {player.location}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-500">No valid targets available</p>
            <button
              className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: -1 })}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Draw 3 Keep 1 Modal (Computers 3-power ability)
// ─────────────────────────────────────────────────────────────────────────────

function Draw3Keep1Modal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;

  const pendingAction = gameState.pendingAction;
  if (pendingAction?.type !== 'draw3keep1') return null;
  if (!shouldShow) return null;

  const cards = pendingAction.data?.cards ?? [];

  const handleKeep = (index: number) => {
    dispatch({ type: 'RESOLVE_PENDING', choice: index });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-2xl">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔍</div>
          <h2 className="text-2xl font-bold text-computers-light">Choose 1 Card to Keep</h2>
          <p className="text-slate-400 text-sm mt-2">The other 2 cards will be discarded</p>
        </div>

        <div className="flex gap-4 justify-center">
          {cards.map((card, idx) => (
            <div key={card.instanceId || idx} className="relative group">
              <Card card={card} size="normal" />
              <button
                className="absolute inset-0 bg-computers/0 group-hover:bg-computers/30 transition-colors rounded flex items-center justify-center opacity-0 group-hover:opacity-100"
                onClick={() => handleKeep(idx)}
              >
                <span className="bg-computers text-white px-3 py-2 rounded font-bold text-sm shadow-lg">
                  Keep This
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Move Other Player Modal (Mag-Leash)
// ─────────────────────────────────────────────────────────────────────────────

function MoveOtherPlayerModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;

  const pendingAction = gameState.pendingAction;
  if (pendingAction?.type !== 'moveOtherPlayer') return null;
  if (!shouldShow) return null;

  const validTargetIds = pendingAction.data?.targetPlayerIds ?? [];
  const validTargets = gameState.players.filter(p => validTargetIds.includes(p.id));

  const handleMove = (targetId: number, direction: -1 | 1) => {
    dispatch({ type: 'RESOLVE_PENDING', choice: { targetId, direction } });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-md">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🧲</div>
          <h2 className="text-2xl font-bold text-engines-light">Move a Player</h2>
          <p className="text-slate-400 text-sm mt-2">Choose a player and direction to move them</p>
        </div>

        <div className="space-y-3">
          {validTargets.map((player) => (
            <div
              key={player.id}
              className="p-3 rounded-lg bg-slate-700 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  <span className="font-semibold text-white">{player.name}</span>
                  <span className="text-slate-400 text-sm">📍 {player.location}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {player.location > 1 && (
                  <button
                    className="flex-1 px-3 py-2 bg-engines/30 hover:bg-engines/50 text-engines-light rounded font-semibold text-sm transition-colors"
                    onClick={() => handleMove(player.id, -1)}
                  >
                    ← Move to {player.location - 1}
                  </button>
                )}
                {player.location < 6 && (
                  <button
                    className="flex-1 px-3 py-2 bg-engines/30 hover:bg-engines/50 text-engines-light rounded font-semibold text-sm transition-colors"
                    onClick={() => handleMove(player.id, 1)}
                  >
                    Move to {player.location + 1} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interaction Modals — Player Interaction Card Effects
// ─────────────────────────────────────────────────────────────────────────────

function ForceDiscardModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();
  const [selected, setSelected] = useState<string[]>([]);

  if (!gameState) return null;
  const pending = gameState.pendingAction;
  if (pending?.type !== 'forceDiscard') return null;
  if (!shouldShow) return null;

  const player = gameState.players.find(p => p.id === pending.playerId);
  if (!player) return null;

  const amount = pending.data?.amount ?? 1;
  const handCards = player.hand.filter(c => c.type !== 'hazard');

  const toggleCard = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < amount ? [...prev, id] : prev
    );
  };

  const handleConfirm = () => {
    dispatch({ type: 'RESOLVE_PENDING', choice: amount === 1 ? selected[0] : selected });
    setSelected([]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">📡</div>
          <h2 className="text-2xl font-bold text-computers-light">
            {player.name}: Discard {amount} Card{amount > 1 ? 's' : ''}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Select {amount} card{amount > 1 ? 's' : ''} to discard ({selected.length}/{amount})
          </p>
        </div>
        {handCards.length > 0 ? (
          <div className="flex gap-2 flex-wrap justify-center mb-4">
            {handCards.map(card => (
              <div key={card.instanceId} className="relative cursor-pointer" onClick={() => toggleCard(card.instanceId)}>
                <Card card={card} size="normal" selected={selected.includes(card.instanceId)} />
                {selected.includes(card.instanceId) && (
                  <div className="absolute inset-0 bg-red-500/30 rounded flex items-center justify-center">
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">Selected</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">No cards to discard</p>
        )}
        <div className="flex justify-center">
          <button
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selected.length < Math.min(amount, handCards.length)}
            onClick={handleConfirm}
          >
            Discard {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChooseOpponentDiscardModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;
  const pending = gameState.pendingAction;
  if (pending?.type !== 'chooseOpponentDiscard') return null;
  if (!shouldShow) return null;

  const opponentId = pending.data?.targetPlayerId;
  const opponent = opponentId !== undefined ? gameState.players.find(p => p.id === opponentId) : undefined;
  const revealedHand = pending.data?.opponentHand ?? [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔍</div>
          <h2 className="text-2xl font-bold text-computers-light">
            {opponent?.name}'s Hand Revealed
          </h2>
          <p className="text-slate-400 text-sm mt-2">Choose a card to force them to discard</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {revealedHand.map(card => (
            <div key={card.instanceId} className="relative">
              <Card card={card} size="normal" />
              <button
                className="absolute inset-0 bg-red-500/0 hover:bg-red-500/30 transition-colors rounded flex items-center justify-center opacity-0 hover:opacity-100"
                onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: card.instanceId })}
              >
                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">Discard This</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChoosePowerLossModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;
  const pending = gameState.pendingAction;
  if (pending?.type !== 'choosePowerLoss') return null;
  if (!shouldShow) return null;

  const player = gameState.players.find(p => p.id === pending.playerId);
  if (!player) return null;

  const systems: SystemType[] = ['weapons', 'computers', 'engines', 'logistics'];
  const systemColors: Record<SystemType, string> = {
    weapons: 'bg-weapons/30 hover:bg-weapons/50 text-weapons-light border-weapons',
    computers: 'bg-computers/30 hover:bg-computers/50 text-computers-light border-computers',
    engines: 'bg-engines/30 hover:bg-engines/50 text-engines-light border-engines',
    logistics: 'bg-logistics/30 hover:bg-logistics/50 text-logistics-light border-logistics',
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-md">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">💥</div>
          <h2 className="text-2xl font-bold text-engines-light">{player.name}: Lose Power</h2>
          <p className="text-slate-400 text-sm mt-2">Choose a system to lose 1 power from</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {systems.map(sys => (
            <button
              key={sys}
              disabled={player.currentPower[sys] <= 0}
              className={clsx(
                'p-3 rounded-lg font-semibold border-2 transition-all capitalize',
                player.currentPower[sys] > 0
                  ? systemColors[sys]
                  : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
              )}
              onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: sys })}
            >
              {sys} ({player.currentPower[sys]})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForceUninstallModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;
  const pending = gameState.pendingAction;
  if (pending?.type !== 'forceUninstall') return null;
  if (!shouldShow) return null;

  const player = gameState.players.find(p => p.id === pending.playerId);
  if (!player) return null;

  const systems: SystemType[] = ['weapons', 'computers', 'engines', 'logistics'];
  const installedSystems = systems.filter(s => player.installations[s] !== null);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-lg">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">📋</div>
          <h2 className="text-2xl font-bold text-logistics-light">{player.name}: Return Installation</h2>
          <p className="text-slate-400 text-sm mt-2">Choose an installed card to return to discard</p>
        </div>
        <div className="space-y-2">
          {installedSystems.map(sys => {
            const card = player.installations[sys]!;
            return (
              <button
                key={sys}
                className="w-full p-3 rounded-lg font-semibold text-white bg-slate-700 hover:bg-logistics/30 transition-all border-2 border-slate-600 hover:border-logistics flex items-center justify-between"
                onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: sys })}
              >
                <div className="flex items-center gap-2">
                  <span className="capitalize text-sm text-slate-400">{sys}:</span>
                  <span>{card.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InteractionChoiceModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;
  const pending = gameState.pendingAction;
  if (pending?.type !== 'interactionChoice') return null;
  if (!shouldShow) return null;

  const targetId = pending.data?.targetPlayerId;
  const target = targetId !== undefined ? gameState.players.find(p => p.id === targetId) : undefined;
  const discardAmount = pending.data?.discardAmount ?? 2;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-md">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">⚖️</div>
          <h2 className="text-2xl font-bold text-logistics-light">Contract Breach</h2>
          <p className="text-slate-400 text-sm mt-2">Choose how to punish {target?.name}</p>
        </div>
        <div className="space-y-3">
          <button
            className="w-full p-4 rounded-lg font-semibold text-white bg-slate-700 hover:bg-red-500/30 transition-all border-2 border-slate-600 hover:border-red-500"
            onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: 'discard' })}
          >
            <div className="text-lg">Force Discard {discardAmount}</div>
            <div className="text-sm text-slate-400">{target?.name} chooses {discardAmount} cards to discard</div>
          </button>
          <button
            className="w-full p-4 rounded-lg font-semibold text-white bg-slate-700 hover:bg-logistics/30 transition-all border-2 border-slate-600 hover:border-logistics"
            onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: 'uninstall' })}
          >
            <div className="text-lg">Uninstall a Card</div>
            <div className="text-sm text-slate-400">You choose which of {target?.name}'s installations to remove</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ChooseOpponentInstallModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;
  const pending = gameState.pendingAction;
  if (pending?.type !== 'chooseOpponentInstall') return null;
  if (!shouldShow) return null;

  const targetId = pending.data?.targetPlayerId;
  const target = targetId !== undefined ? gameState.players.find(p => p.id === targetId) : undefined;
  if (!target) return null;

  const systems: SystemType[] = ['weapons', 'computers', 'engines', 'logistics'];
  const installedSystems = systems.filter(s => target.installations[s] !== null);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-lg">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔧</div>
          <h2 className="text-2xl font-bold text-logistics-light">Uninstall from {target.name}</h2>
          <p className="text-slate-400 text-sm mt-2">Choose which installation to remove</p>
        </div>
        <div className="space-y-2">
          {installedSystems.map(sys => {
            const card = target.installations[sys]!;
            return (
              <button
                key={sys}
                className="w-full p-3 rounded-lg font-semibold text-white bg-slate-700 hover:bg-logistics/30 transition-all border-2 border-slate-600 hover:border-logistics flex items-center justify-between"
                onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: sys })}
              >
                <div className="flex items-center gap-2">
                  <span className="capitalize text-sm text-slate-400">{sys}:</span>
                  <span>{card.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InstallEffectPromptModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;
  const pending = gameState.pendingAction;
  if (pending?.type !== 'mayDiscardToDraw' && pending?.type !== 'maySwapHandDiscard') return null;
  if (!shouldShow) return null;

  const isDiscard = pending.type === 'mayDiscardToDraw';
  const title = isDiscard ? 'Discard to Draw' : 'Swap Hand/Discard';
  const desc = isDiscard
    ? `${pending.data?.cardTitle}: Discard 1 card to draw 1?`
    : `${pending.data?.cardTitle}: Swap a hand card with a discard pile card?`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-md">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔄</div>
          <h2 className="text-2xl font-bold text-logistics-light">{title}</h2>
          <p className="text-slate-400 text-sm mt-2">{desc}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold"
            onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: true })}
          >
            Yes
          </button>
          <button
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
            onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: false })}
          >
            No, Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectSwapDiscardModal() {
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);
  const shouldShow = useShouldShowPendingAction();

  if (!gameState) return null;
  const pending = gameState.pendingAction;
  if (pending?.type !== 'selectSwapDiscard') return null;
  if (!shouldShow) return null;

  const player = gameState.players.find(p => p.id === pending.playerId);
  if (!player) return null;

  const isFromHand = pending.data?.source === 'hand';
  const cards = isFromHand ? player.hand.filter(c => c.type !== 'hazard') : player.discard;
  const title = isFromHand ? 'Select Card from Hand' : 'Select Card from Discard';
  const desc = isFromHand ? 'Choose a card to swap away' : 'Choose a card to swap in';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="game-panel p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔄</div>
          <h2 className="text-2xl font-bold text-logistics-light">{title}</h2>
          <p className="text-slate-400 text-sm mt-2">{desc}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {cards.map(card => (
            <div key={card.instanceId} className="relative">
              <Card card={card} size="normal" />
              <button
                className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/30 transition-colors rounded flex items-center justify-center opacity-0 hover:opacity-100"
                onClick={() => dispatch({ type: 'RESOLVE_PENDING', choice: card.instanceId })}
              >
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">Select</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WaitingForOpponentOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const { isOnlineGame, localPlayerId } = useContext(GameBoardContext);

  if (!gameState?.pendingAction || !isOnlineGame) return null;

  // Show overlay when pending action is for someone else
  const isForUs = gameState.pendingAction.playerId === localPlayerId;
  if (isForUs) return null;

  const targetPlayer = gameState.players.find(p => p.id === gameState.pendingAction!.playerId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="game-panel p-6 max-w-sm text-center">
        <div className="text-4xl mb-2 animate-pulse">⏳</div>
        <h2 className="text-xl font-bold text-slate-300">
          Waiting for {targetPlayer?.name ?? 'opponent'}...
        </h2>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Power Choice Modal - Compact dropdown style
// ─────────────────────────────────────────────────────────────────────────────

function PowerChoiceModal() {
  const pendingPowerChoice = useGameStore((s) => s.pendingPowerChoice);
  const confirmPowerChoice = useGameStore((s) => s.confirmPowerChoice);
  const setPendingPowerChoice = useGameStore((s) => s.setPendingPowerChoice);

  const [allocation, setAllocation] = useState<Record<SystemType, number>>({
    weapons: 0, computers: 0, engines: 0, logistics: 0,
  });

  // Reset allocation when a new power choice appears
  const prevCardRef = useRef<string | null>(null);
  if (pendingPowerChoice && pendingPowerChoice.cardInstanceId !== prevCardRef.current) {
    prevCardRef.current = pendingPowerChoice.cardInstanceId;
    setAllocation({ weapons: 0, computers: 0, engines: 0, logistics: 0 });
  }

  if (!pendingPowerChoice) return null;

  const total = pendingPowerChoice.powerAmount;
  const allocated = allocation.weapons + allocation.computers + allocation.engines + allocation.logistics;
  const remaining = total - allocated;

  const systems = [
    { key: 'weapons' as SystemType, name: 'Weapons', color: 'bg-weapons', textColor: 'text-weapons-light' },
    { key: 'computers' as SystemType, name: 'Computers', color: 'bg-computers', textColor: 'text-computers-light' },
    { key: 'engines' as SystemType, name: 'Engines', color: 'bg-engines', textColor: 'text-engines-light' },
    { key: 'logistics' as SystemType, name: 'Logistics', color: 'bg-logistics', textColor: 'text-logistics-light' },
  ];

  // Quick path: single power — just click a system button
  if (total === 1) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPendingPowerChoice(null)}>
        <div className="game-panel p-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
          <div className="text-center mb-3">
            <div className="text-amber-400 font-bold text-sm">{pendingPowerChoice.cardTitle}</div>
            <div className="text-slate-400 text-xs">+1⚡ — Pick a system</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {systems.map((sys) => (
              <button
                key={sys.key}
                className={clsx(
                  'py-2 rounded-lg font-bold text-sm transition-all',
                  sys.color, 'hover:brightness-110 text-white shadow-lg',
                )}
                onClick={() => {
                  confirmPowerChoice({ weapons: 0, computers: 0, engines: 0, logistics: 0, [sys.key]: 1 });
                }}
              >
                {sys.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const adjust = (sys: SystemType, delta: number) => {
    setAllocation((prev) => {
      const newVal = Math.max(0, prev[sys] + delta);
      const othersTotal = Object.entries(prev).reduce((sum, [k, v]) => k === sys ? sum : sum + v, 0);
      if (newVal + othersTotal > total) return prev;
      return { ...prev, [sys]: newVal };
    });
  };

  const assignAll = (sys: SystemType) => {
    setAllocation({ weapons: 0, computers: 0, engines: 0, logistics: 0, [sys]: total });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPendingPowerChoice(null)}>
      <div className="game-panel p-4 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-3">
          <div className="text-amber-400 font-bold text-sm">{pendingPowerChoice.cardTitle}</div>
          <div className="text-slate-400 text-xs">
            Distribute +{total}⚡ across systems
          </div>
        </div>

        {/* Remaining indicator */}
        <div className="text-center mb-3">
          <span className={clsx(
            'text-lg font-bold',
            remaining > 0 ? 'text-amber-400' : 'text-green-400',
          )}>
            {remaining > 0 ? `${remaining}⚡ remaining` : 'All allocated ✓'}
          </span>
        </div>

        {/* System allocation rows */}
        <div className="flex flex-col gap-2 mb-4">
          {systems.map((sys) => (
            <div key={sys.key} className="flex items-center gap-2">
              {/* System name */}
              <span className={clsx('w-24 text-sm font-semibold', sys.textColor)}>{sys.name}</span>

              {/* Minus button */}
              <button
                className={clsx(
                  'w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-all',
                  allocation[sys.key] > 0
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed',
                )}
                onClick={() => adjust(sys.key, -1)}
                disabled={allocation[sys.key] <= 0}
              >
                −
              </button>

              {/* Current value */}
              <span className={clsx(
                'w-8 text-center text-lg font-bold',
                allocation[sys.key] > 0 ? sys.textColor : 'text-slate-600',
              )}>
                {allocation[sys.key]}
              </span>

              {/* Plus button */}
              <button
                className={clsx(
                  'w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-all',
                  remaining > 0
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed',
                )}
                onClick={() => adjust(sys.key, 1)}
                disabled={remaining <= 0}
              >
                +
              </button>

              {/* Quick "all" button */}
              <button
                className={clsx(
                  'px-2 py-0.5 rounded text-xs font-semibold transition-all',
                  'bg-slate-700 hover:bg-slate-600 text-slate-300',
                )}
                onClick={() => assignAll(sys.key)}
              >
                All
              </button>
            </div>
          ))}
        </div>

        {/* Confirm button */}
        <button
          className={clsx(
            'w-full py-2 rounded-lg font-bold text-sm transition-all',
            remaining === 0
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed',
          )}
          onClick={() => {
            if (remaining === 0) {
              confirmPowerChoice(allocation);
            }
          }}
          disabled={remaining !== 0}
        >
          {remaining === 0 ? 'Confirm ⚡' : `Assign ${remaining} more ⚡`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Power Allocation Pending Modal - For engine pendingAction 'powerAllocation'
// (installation power choices at turn start and mid-turn installs)
// ─────────────────────────────────────────────────────────────────────────────

function PowerAllocationPendingModal() {
  const shouldShow = useShouldShowPendingAction();
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);

  const pendingAction = gameState?.pendingAction;
  const [allocation, setAllocation] = useState<Record<SystemType, number>>({
    weapons: 0, computers: 0, engines: 0, logistics: 0,
  });

  // Reset allocation when pending changes
  const prevCardRef = useRef<string | null>(null);
  const cardTitle = pendingAction?.data?.cardTitle || '';
  if (cardTitle !== prevCardRef.current) {
    prevCardRef.current = cardTitle;
    setAllocation({ weapons: 0, computers: 0, engines: 0, logistics: 0 });
  }

  if (!shouldShow || pendingAction?.type !== 'powerAllocation') return null;

  const total = pendingAction.data?.powerAmount ?? 0;
  const allocated = allocation.weapons + allocation.computers + allocation.engines + allocation.logistics;
  const remaining = total - allocated;

  const systems = [
    { key: 'weapons' as SystemType, name: 'Weapons', color: 'bg-weapons', textColor: 'text-weapons-light' },
    { key: 'computers' as SystemType, name: 'Computers', color: 'bg-computers', textColor: 'text-computers-light' },
    { key: 'engines' as SystemType, name: 'Engines', color: 'bg-engines', textColor: 'text-engines-light' },
    { key: 'logistics' as SystemType, name: 'Logistics', color: 'bg-logistics', textColor: 'text-logistics-light' },
  ];

  // Quick path: single power — just click a system button
  if (total === 1) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="game-panel p-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
          <div className="text-center mb-3">
            <div className="text-amber-400 font-bold text-sm">{cardTitle}</div>
            <div className="text-slate-400 text-xs">+1⚡ — Pick a system</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {systems.map((sys) => (
              <button
                key={sys.key}
                className={clsx(
                  'py-2 rounded-lg font-bold text-sm transition-all',
                  sys.color, 'hover:brightness-110 text-white shadow-lg',
                )}
                onClick={() => {
                  dispatch({ type: 'RESOLVE_PENDING', choice: { weapons: 0, computers: 0, engines: 0, logistics: 0, [sys.key]: 1 } });
                }}
              >
                {sys.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const adjust = (sys: SystemType, delta: number) => {
    setAllocation((prev) => {
      const newVal = Math.max(0, prev[sys] + delta);
      const othersTotal = Object.entries(prev).reduce((sum, [k, v]) => k === sys ? sum : sum + v, 0);
      if (newVal + othersTotal > total) return prev;
      return { ...prev, [sys]: newVal };
    });
  };

  const assignAll = (sys: SystemType) => {
    setAllocation({ weapons: 0, computers: 0, engines: 0, logistics: 0, [sys]: total });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="game-panel p-4 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-3">
          <div className="text-amber-400 font-bold text-sm">{cardTitle}</div>
          <div className="text-slate-400 text-xs">
            Distribute +{total}⚡ across systems
          </div>
        </div>

        <div className="space-y-2">
          {systems.map((sys) => (
            <div key={sys.key} className="flex items-center gap-2">
              <div className={clsx('w-20 text-xs font-semibold', sys.textColor)}>{sys.name}</div>

              <button
                className={clsx(
                  'w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-all',
                  allocation[sys.key] > 0
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed',
                )}
                onClick={() => adjust(sys.key, -1)}
                disabled={allocation[sys.key] <= 0}
              >
                −
              </button>

              <span className={clsx(
                'w-8 text-center text-lg font-bold',
                allocation[sys.key] > 0 ? sys.textColor : 'text-slate-600',
              )}>
                {allocation[sys.key]}
              </span>

              <button
                className={clsx(
                  'w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-all',
                  remaining > 0
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed',
                )}
                onClick={() => adjust(sys.key, 1)}
                disabled={remaining <= 0}
              >
                +
              </button>

              <button
                className={clsx(
                  'px-2 py-0.5 rounded text-xs font-semibold transition-all',
                  remaining > 0 || allocation[sys.key] < total
                    ? `${sys.color} hover:brightness-110 text-white`
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed',
                )}
                onClick={() => assignAll(sys.key)}
              >
                All
              </button>
            </div>
          ))}
        </div>

        <button
          className={clsx(
            'w-full py-2 mt-3 rounded-lg font-bold text-sm transition-all',
            remaining === 0
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed',
          )}
          onClick={() => {
            if (remaining === 0) {
              dispatch({ type: 'RESOLVE_PENDING', choice: allocation });
            }
          }}
          disabled={remaining !== 0}
        >
          {remaining === 0 ? 'Confirm ⚡' : `Assign ${remaining} more ⚡`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hazard Clear Power Modal - Choose systems to spend 1⚡ each from
// ─────────────────────────────────────────────────────────────────────────────

function HazardClearPowerModal() {
  const shouldShow = useShouldShowPendingAction();
  const gameState = useGameStore((s) => s.gameState);
  const dispatch = useGameStore((s) => s.dispatch);

  const pendingAction = gameState?.pendingAction;
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const [selected, setSelected] = useState<Set<SystemType>>(new Set());

  // Reset when pending changes
  const prevCardRef = useRef<string | null>(null);
  const cardTitle = pendingAction?.data?.cardTitle || '';
  if (cardTitle !== prevCardRef.current) {
    prevCardRef.current = cardTitle;
    if (selected.size > 0) setSelected(new Set());
  }

  if (!shouldShow || pendingAction?.type !== 'hazardClearPower' || !currentPlayer) return null;

  const required = pendingAction.data?.powerAmount ?? 2;

  const systems = [
    { key: 'weapons' as SystemType, name: 'Weapons', color: 'bg-weapons', textColor: 'text-weapons-light' },
    { key: 'computers' as SystemType, name: 'Computers', color: 'bg-computers', textColor: 'text-computers-light' },
    { key: 'engines' as SystemType, name: 'Engines', color: 'bg-engines', textColor: 'text-engines-light' },
    { key: 'logistics' as SystemType, name: 'Logistics', color: 'bg-logistics', textColor: 'text-logistics-light' },
  ];

  const toggle = (sys: SystemType) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(sys)) {
        next.delete(sys);
      } else if (next.size < required) {
        next.add(sys);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="game-panel p-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-3">
          <div className="text-red-400 font-bold text-sm">Clear: {cardTitle}</div>
          <div className="text-slate-400 text-xs">
            Spend 1⚡ from {required} different systems
          </div>
        </div>
        <div className="space-y-2">
          {systems.map((sys) => {
            const hasPower = currentPlayer.currentPower[sys.key] >= 1;
            const isSelected = selected.has(sys.key);
            return (
              <button
                key={sys.key}
                className={clsx(
                  'w-full py-2 px-3 rounded-lg font-bold text-sm transition-all flex items-center justify-between',
                  isSelected
                    ? `${sys.color} text-white ring-2 ring-white/50`
                    : hasPower
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed',
                )}
                onClick={() => hasPower && toggle(sys.key)}
                disabled={!hasPower}
              >
                <span>{sys.name}</span>
                <span className={clsx('text-xs', isSelected ? 'text-white' : sys.textColor)}>
                  {currentPlayer.currentPower[sys.key]}⚡
                </span>
              </button>
            );
          })}
        </div>
        <button
          className={clsx(
            'w-full py-2 mt-3 rounded-lg font-bold text-sm transition-all',
            selected.size === required
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed',
          )}
          onClick={() => {
            if (selected.size === required) {
              const alloc = { weapons: 0, computers: 0, engines: 0, logistics: 0 };
              for (const sys of selected) alloc[sys] = 1;
              dispatch({ type: 'RESOLVE_PENDING', choice: alloc });
            }
          }}
          disabled={selected.size !== required}
        >
          {selected.size === required
            ? 'Confirm Clear'
            : `Select ${required - selected.size} more system${required - selected.size > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Captain Viewer Modal - Shows captain portrait, name, and ability
// ─────────────────────────────────────────────────────────────────────────────

function CaptainViewerModal({
  captain,
  onClose,
}: {
  captain: Captain;
  onClose: () => void;
}) {
  const filename = captain.id.charAt(0).toUpperCase() + captain.id.slice(1);
  const imgPath = `/cards/captain/${filename}.png`;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="game-panel p-5 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
        {/* Captain portrait */}
        <div className="flex justify-center mb-3">
          <img
            src={imgPath}
            alt={captain.name}
            className="w-24 h-24 rounded-lg object-cover border-2 border-amber-500/50 shadow-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        {/* Captain name */}
        <h3 className="text-amber-400 font-bold text-lg text-center mb-2">{captain.name}</h3>

        {/* Ability description */}
        <div className="bg-slate-800/80 rounded-lg p-3 mb-2">
          <div className="text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider">Ability</div>
          <p className="text-white text-sm">{captain.effect}</p>
        </div>

        {/* Flavor text */}
        {captain.flavor && (
          <p className="text-slate-500 text-xs italic text-center">{captain.flavor}</p>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Opponent Tableau Viewer Modal
// ─────────────────────────────────────────────────────────────────────────────

function OpponentTableauModal({
  player,
  allPlayers,
  onClose,
  onViewMission,
}: {
  player: Player;
  allPlayers: Player[];
  onClose: () => void;
  onViewMission: (mission: MissionInstance) => void;
}) {
  const playerIndex = allPlayers.findIndex(p => p.id === player.id);
  const pColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="game-panel p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={`/cards/captain/${player.captain.id.charAt(0).toUpperCase() + player.captain.id.slice(1)}.png`}
              alt={player.captain.name}
              className="w-12 h-12 rounded object-cover border-2"
              style={{ borderColor: pColor.hex + '80' }}
            />
            <div>
              <div className={clsx('font-bold text-lg', pColor.text)}>{player.name}</div>
              <div className="text-slate-500 text-xs">{player.captain.name}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg px-2 py-1 rounded hover:bg-slate-800"
          >
            X
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-amber-400">★</span>
            <span className="text-amber-400 font-bold">{player.fame}</span>
            <span className="text-slate-500">Fame</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-amber-300">💰</span>
            <span className="text-amber-300 font-semibold">{player.credits}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">📍</span>
            <span className="text-slate-300">{player.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">🃏</span>
            <span className="text-slate-300">{player.hand.length} in hand</span>
          </div>
        </div>

        {/* Systems */}
        <div className="space-y-2 mb-4">
          <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ship Systems</h3>
          <ExpandedSystemPanel system="weapons" player={player} isCurrentPlayer={false} onActivate={() => {}} />
          <ExpandedSystemPanel system="computers" player={player} isCurrentPlayer={false} onActivate={() => {}} />
          <ExpandedSystemPanel system="engines" player={player} isCurrentPlayer={false} onActivate={() => {}} />
          <ExpandedSystemPanel system="logistics" player={player} isCurrentPlayer={false} onActivate={() => {}} />
        </div>

        {/* Trophies */}
        {player.trophies.length > 0 && (
          <div className="mb-3">
            <h3 className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
              Trophies ({player.trophies.length})
            </h3>
            <div className="space-y-1">
              {player.trophies.map((trophy) => (
                <TrophyItem key={trophy.instanceId} trophy={trophy} onView={() => onViewMission(trophy)} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Missions */}
        {player.completedMissions.filter(m => m.rewardType !== 'trophy').length > 0 && (
          <div className="mb-3">
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Completed Missions ({player.completedMissions.filter(m => m.rewardType !== 'trophy').length})
            </h3>
            <div className="space-y-1">
              {player.completedMissions.filter(m => m.rewardType !== 'trophy').map((mission) => (
                <MissionItem key={mission.instanceId} mission={mission} onView={() => onViewMission(mission)} />
              ))}
            </div>
          </div>
        )}

        {/* Deck stats */}
        <div className="flex gap-4 text-[10px] text-slate-500 border-t border-slate-800 pt-3">
          <span>Deck: {player.deck.length}</span>
          <span>Discard: {player.discard.length}</span>
          <span>Played: {player.played.length}</span>
          <span>Hazards: {player.hazardsInDeck}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Game Board Component
// ─────────────────────────────────────────────────────────────────────────────

interface GameBoardProps {
  isOnlineGame?: boolean;
  localPlayerIndex?: number | null;
}

export function GameBoard({ isOnlineGame = false, localPlayerIndex = null }: GameBoardProps) {
  const isMobile = useIsMobile();
  const activeView = useMobileViewStore((s) => s.activeView);
  const gameState = useGameStore((s) => s.gameState);
  const currentPlayer = useCurrentPlayer();
  const players = usePlayers();
  const isGameOver = useIsGameOver();
  const showMarket = useGameStore((s) => s.showMarket);
  const scales = useUIScaleStore((s) => s.scales);
  const toggleMarket = useGameStore((s) => s.toggleMarket);
  const aiSpeed = useGameStore((s) => s.aiSpeed);
  const setAISpeed = useGameStore((s) => s.setAISpeed);

  const storePlayCardWithChoice = useGameStore((s) => s.playCardWithChoice);
  const storeInstallCard = useGameStore((s) => s.installCard);
  const storeActivateSystem = useGameStore((s) => s.activateSystem);
  const storeMove = useGameStore((s) => s.move);
  const storeBuyCard = useGameStore((s) => s.buyCard);
  const storeBuyAndInstall = useGameStore((s) => s.buyAndInstall);
  const revealMarketStack = useGameStore((s) => s.revealMarketStack);
  const viewCard = useGameStore((s) => s.viewCard);
  const viewMission = useGameStore((s) => s.viewMission);
  const pendingPowerChoice = useGameStore((s) => s.pendingPowerChoice);
  const storeClearHazard = useGameStore((s) => s.clearHazard);

  // Opponent viewer state
  const [viewingOpponent, setViewingOpponent] = useState<Player | null>(null);

  // Captain viewer state
  const [viewingCaptain, setViewingCaptain] = useState<Captain | null>(null);

  // Multiplayer hooks
  const multiplayerStatus = useMultiplayer((s) => s.status);

  // Determine if it's the local player's turn
  const isMyTurn = !isOnlineGame || (localPlayerIndex !== null && gameState?.currentPlayerIndex === localPlayerIndex);

  // The player whose perspective we display (always local player in online, else current turn player)
  const localPlayer = isOnlineGame && localPlayerIndex !== null && players[localPlayerIndex]
    ? players[localPlayerIndex]
    : currentPlayer;

  // Note: multiplayer sync callback (onActionDispatched) is set up in App.tsx
  // Host sends actions with state hash; non-host sends without hash.

  // Animation refs
  const playedPileRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const creditCounterRef = useRef<HTMLElement>(null);
  const prevCreditsRef = useRef<number | null>(null);
  const animEmit = useAnimationStore((s) => s.emit);
  const animSetRef = useAnimationStore((s) => s.setRef);

  // Register pile refs for animation targets
  useEffect(() => {
    animSetRef('playedPile', playedPileRef.current);
    animSetRef('discardPile', discardPileRef.current);
  }, [animSetRef]);

  // Callback ref for credit counter — works across mobile/desktop layouts
  const setCreditCounterRef = useCallback((el: HTMLElement | null) => {
    (creditCounterRef as React.MutableRefObject<HTMLElement | null>).current = el;
    animSetRef('creditCounter', el);
  }, [animSetRef]);

  // Emit credit fly animation when local player's credits change
  useEffect(() => {
    if (!localPlayer) return;
    const credits = localPlayer.credits;
    if (prevCreditsRef.current !== null && prevCreditsRef.current !== credits) {
      const delta = credits - prevCreditsRef.current;
      animEmit({ type: 'credits-change', delta });
    }
    prevCreditsRef.current = credits;
  }, [localPlayer?.credits, animEmit]);

  // "Your Turn!" popup on turn start
  const prevTurnRef = useRef<string | null>(null);
  useEffect(() => {
    if (!gameState || !currentPlayer) return;
    const turnKey = `${gameState.currentPlayerIndex}-${gameState.turn}`;
    if (prevTurnRef.current !== null && prevTurnRef.current !== turnKey && gameState.phase === 'action') {
      animEmit({
        type: 'turn-start',
        playerName: currentPlayer.name,
        playerIndex: gameState.currentPlayerIndex,
      });
    }
    prevTurnRef.current = turnKey;
  }, [gameState?.currentPlayerIndex, gameState?.turn, gameState?.phase, currentPlayer, animEmit]);

  // Turn timer reminder (shows after 60 seconds)
  const TURN_TIMER_THRESHOLD = 60;
  const [turnElapsed, setTurnElapsed] = useState(0);
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset timer whenever the current player changes
    setTurnElapsed(0);
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    turnTimerRef.current = setInterval(() => {
      setTurnElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [gameState?.currentPlayerIndex, gameState?.turn]);

  // Wrapped actions that check turn ownership
  const playCardWithChoice = useCallback((card: CardInstance, rect?: DOMRect) => {
    if (!isMyTurn) return;
    // Emit ghost card animation before dispatching
    if (rect) {
      animEmit({ type: 'card-play', card, fromRect: rect, target: 'played' });
    }
    storePlayCardWithChoice(card);
  }, [isMyTurn, storePlayCardWithChoice, animEmit]);

  const installCard = useCallback((cardInstanceId: string, targetSystem: SystemType) => {
    if (!isMyTurn) return false;
    return storeInstallCard(cardInstanceId, targetSystem);
  }, [isMyTurn, storeInstallCard]);

  const activateSystem = useCallback((system: SystemType, abilityIndex: number, targetPlayerId?: number) => {
    if (!isMyTurn) return false;
    return storeActivateSystem(system, abilityIndex, targetPlayerId);
  }, [isMyTurn, storeActivateSystem]);

  const move = useCallback((direction: -1 | 1) => {
    if (!isMyTurn) return false;
    return storeMove(direction);
  }, [isMyTurn, storeMove]);

  const buyCard = useCallback((station: 1 | 3 | 5, stackIndex: number, cardIndex?: number) => {
    if (!isMyTurn) return false;
    // Capture card data for ghost animation before dispatch removes it
    const stackInfo = gameState?.marketStacks[station]?.[stackIndex];
    const idx = cardIndex ?? 0;
    const card = stackInfo?.cards[idx];
    const result = storeBuyCard(station, stackIndex, cardIndex);
    if (result && card) {
      // Animate ghost card from center of screen to discard pile
      const fromRect = new DOMRect(window.innerWidth / 2 - 40, window.innerHeight / 3, 80, 112);
      animEmit({ type: 'card-buy', card, fromRect });
    }
    return result;
  }, [isMyTurn, storeBuyCard, gameState, animEmit]);

  const buyAndInstall = useCallback((station: 1 | 3 | 5, stackIndex: number, targetSystem: SystemType, cardIndex?: number) => {
    if (!isMyTurn) return false;
    return storeBuyAndInstall(station, stackIndex, targetSystem, cardIndex);
  }, [isMyTurn, storeBuyAndInstall]);

  const clearHazard = useCallback((hazardInstanceId: string) => {
    if (!isMyTurn) return false;
    return storeClearHazard(hazardInstanceId);
  }, [isMyTurn, storeClearHazard]);

  if (!gameState || !currentPlayer || !localPlayer) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  // Other players (from local player's perspective)
  const otherPlayers = players.filter(p => p.id !== localPlayer.id);

  // Context value for modal gating in online mode
  const boardContextValue: GameBoardContextValue = {
    isOnlineGame,
    localPlayerId: localPlayer.id,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <GameBoardContext.Provider value={boardContextValue}>
      <div className="game-container">
        {/* Shared overlays — these are fixed/portal so they work on any layout */}
        {isGameOver && <VictoryScreen />}
        <ViewerModal />
        {viewingCaptain && <CaptainViewerModal captain={viewingCaptain} onClose={() => setViewingCaptain(null)} />}
        {pendingPowerChoice && <PowerChoiceModal />}
        <PowerAllocationPendingModal />
        <HazardClearPowerModal />
        <HazardRevealModal />
        <TrashCardModal />
        <MissionRewardModal />
        <MissionRewardChoiceModal />
        <TargetPlayerModal />
        <Draw3Keep1Modal />
        <MoveOtherPlayerModal />
        <ForceDiscardModal />
        <ChooseOpponentDiscardModal />
        <ChoosePowerLossModal />
        <ForceUninstallModal />
        <InteractionChoiceModal />
        <ChooseOpponentInstallModal />
        <InstallEffectPromptModal />
        <SelectSwapDiscardModal />
        <WaitingForOpponentOverlay />

        {/* AI/Online thinking indicators */}
        {currentPlayer.isAI && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 px-4 py-2 rounded-xl border border-purple-500 text-sm">
            <span className="text-purple-200 font-semibold">{currentPlayer.name}</span>
            <span className="text-purple-400"> thinking...</span>
          </div>
        )}
        {isOnlineGame && !isMyTurn && !currentPlayer.isAI && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-900/90 px-4 py-2 rounded-xl border border-cyan-500 text-sm">
            <span className="text-cyan-400">Waiting for </span>
            <span className="text-cyan-200 font-semibold">{currentPlayer.name}</span>
          </div>
        )}

        {/* Compact header */}
        <header className="flex-none px-3 py-1.5 bg-slate-950/50 border-b border-amber-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={`/cards/captain/${localPlayer.captain.id.charAt(0).toUpperCase() + localPlayer.captain.id.slice(1)}.png`}
                alt={localPlayer.captain.name}
                className="w-8 h-8 rounded object-cover border border-amber-600/50 cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all"
                onClick={() => setViewingCaptain(localPlayer.captain)}
                title={`View ${localPlayer.captain.name}'s ability`}
              />
              <div>
                <div className="text-amber-400 font-bold text-sm leading-none">{localPlayer.name}</div>
                <div
                  className="text-slate-500 text-[10px] leading-none mt-0.5 cursor-pointer hover:text-amber-400 transition-colors"
                  onClick={() => setViewingCaptain(localPlayer.captain)}
                >{localPlayer.captain.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                T<span className="text-amber-400 font-bold">{gameState.turn}</span>
              </span>
              <span className={clsx(
                'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
                gameState.phase === 'action' && 'bg-amber-500/20 text-amber-400',
                gameState.phase === 'cleanup' && 'bg-slate-500/20 text-slate-400',
                gameState.phase === 'initial' && 'bg-red-500/20 text-red-400',
              )}>
                {gameState.phase}
              </span>
            </div>
          </div>
        </header>

        {/* Active view content */}
        <div className="mobile-view-container">
          {/* HAND VIEW */}
          {activeView === 'hand' && (
            <div className="p-3">
              <HandDisplay
                cards={localPlayer.hand}
                player={localPlayer}
                onPlayCard={playCardWithChoice}
                onInstallCard={(card, system) => installCard(card.instanceId, system)}
                onClearHazard={(card) => clearHazard(card.instanceId)}
                onViewCard={viewCard}
                layout="vertical"
                isMyTurn={isMyTurn}
              />

              {/* Deck / Played / Discard - compact row */}
              <div className="flex items-end justify-center gap-4 mt-4 pt-3 border-t border-slate-800">
                <div className="flex flex-col items-center">
                  <CardBack size="tiny" />
                  <div className="text-amber-500 text-[10px] font-bold mt-0.5">{localPlayer.deck.length}</div>
                  <span className="text-slate-500 text-[8px] font-semibold">DECK</span>
                </div>
                <div className="flex flex-col items-center">
                  {localPlayer.played.length > 0 ? (
                    <Card card={localPlayer.played[localPlayer.played.length - 1]} size="tiny" />
                  ) : (
                    <div className="w-16 h-22 rounded border-2 border-dashed border-green-700/50 bg-green-900/20 flex items-center justify-center">
                      <span className="text-green-600 text-[10px]">-</span>
                    </div>
                  )}
                  <div className="text-green-500 text-[10px] font-bold mt-0.5">{localPlayer.played.length}</div>
                  <span className="text-slate-500 text-[8px] font-semibold">PLAYED</span>
                </div>
                <div className="flex flex-col items-center">
                  {localPlayer.discard.length > 0 ? (
                    <Card card={localPlayer.discard[localPlayer.discard.length - 1]} size="tiny" />
                  ) : (
                    <div className="w-16 h-22 rounded border-2 border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center">
                      <span className="text-slate-600 text-[10px]">-</span>
                    </div>
                  )}
                  <div className="text-slate-400 text-[10px] font-bold mt-0.5">{localPlayer.discard.length}</div>
                  <span className="text-slate-500 text-[8px] font-semibold">DISCARD</span>
                </div>
              </div>
            </div>
          )}

          {/* TRACK VIEW */}
          {activeView === 'track' && (
            <div className="mobile-track-scroll py-3">
              <div className="min-w-fit px-2">
                <SpaceTrack
                  state={gameState}
                  currentPlayerId={currentPlayer.id}
                  onMove={move}
                  onViewMission={(tm) => viewMission(tm.mission)}
                  compact
                />
              </div>
            </div>
          )}

          {/* SYSTEMS VIEW (sidebar content) */}
          {activeView === 'systems' && (
            <div className="p-3 space-y-3">
              {/* Captain & Fame */}
              <div className="flex items-center gap-3 p-3 game-panel">
                <img
                  src={`/cards/captain/${localPlayer.captain.id.charAt(0).toUpperCase() + localPlayer.captain.id.slice(1)}.png`}
                  alt={localPlayer.captain.name}
                  className="w-14 h-14 rounded object-cover border-2 border-amber-600/50 cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all"
                  onClick={() => setViewingCaptain(localPlayer.captain)}
                  title={`View ${localPlayer.captain.name}'s ability`}
                />
                <div className="flex-1">
                  <div className="text-amber-400 font-bold">{localPlayer.name}</div>
                  <div
                    className="text-slate-500 text-xs mb-1 cursor-pointer hover:text-amber-400 transition-colors"
                    onClick={() => setViewingCaptain(localPlayer.captain)}
                  >{localPlayer.captain.name}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">★</span>
                      <span className="text-amber-400 font-bold text-lg">{localPlayer.fame}</span>
                    </div>
                    <div ref={setCreditCounterRef} className="flex items-center gap-1">
                      <span className="text-amber-300 text-sm">💰</span>
                      <span className="text-amber-300 font-semibold">{localPlayer.credits}</span>
                    </div>
                    {localPlayer.movesRemaining > 0 && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-engines/20 rounded">
                        <span className="text-engines font-bold text-sm">{localPlayer.movesRemaining}</span>
                        <span className="text-engines text-xs">Moves</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ship Systems */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ship Systems</h3>
                <ExpandedSystemPanel system="weapons" player={localPlayer} isCurrentPlayer={isMyTurn} onActivate={(idx) => activateSystem('weapons' as SystemType, idx)} allPlayers={gameState.players} />
                <ExpandedSystemPanel system="computers" player={localPlayer} isCurrentPlayer={isMyTurn} onActivate={(idx) => activateSystem('computers' as SystemType, idx)} allPlayers={gameState.players} />
                <ExpandedSystemPanel system="engines" player={localPlayer} isCurrentPlayer={isMyTurn} onActivate={(idx) => activateSystem('engines' as SystemType, idx)} allPlayers={gameState.players} />
                <ExpandedSystemPanel system="logistics" player={localPlayer} isCurrentPlayer={isMyTurn} onActivate={(idx) => activateSystem('logistics' as SystemType, idx)} allPlayers={gameState.players} />
              </div>

              {/* Completed Missions & Trophies */}
              {(localPlayer.completedMissions.length > 0 || localPlayer.trophies.length > 0) && (
                <div className="border-t border-amber-900/20 pt-3">
                  {localPlayer.trophies.length > 0 && (
                    <div className="mb-3">
                      <h3 className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                        🏆 Trophies ({localPlayer.trophies.length})
                      </h3>
                      <div className="space-y-1">
                        {localPlayer.trophies.map((trophy) => (
                          <TrophyItem key={trophy.instanceId} trophy={trophy} onView={() => viewMission(trophy)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {localPlayer.completedMissions.filter(m => m.rewardType !== 'trophy').length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Completed Missions ({localPlayer.completedMissions.filter(m => m.rewardType !== 'trophy').length})
                      </h3>
                      <div className="space-y-1">
                        {localPlayer.completedMissions.filter(m => m.rewardType !== 'trophy').map((mission) => (
                          <MissionItem key={mission.instanceId} mission={mission} onView={() => viewMission(mission)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Opponents */}
              {otherPlayers.length > 0 && (
                <div className="border-t border-amber-900/20 pt-3">
                  <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Opponents</h3>
                  <OpponentBar opponents={otherPlayers} allPlayers={players} layout="vertical" onViewPlayer={setViewingOpponent} onViewCaptain={setViewingCaptain} />
                </div>
              )}
            </div>
          )}

          {/* MARKET VIEW */}
          {activeView === 'market' && (
            <div className="mobile-market-scroll">
              <div className="min-w-fit px-2">
                <PyramidMarket
                  marketStacks={gameState.marketStacks}
                  currentPlayer={localPlayer}
                  onBuyCard={buyCard}
                  onBuyAndInstall={buyAndInstall}
                  onViewCard={viewCard}
                  onRevealStack={revealMarketStack}
                  compact
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile action controls + tab navigation */}
        <MobileActionBar isMyTurn={isMyTurn} />
        <MobileTabBar />
      </div>
      </GameBoardContext.Provider>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT (unchanged)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <GameBoardContext.Provider value={boardContextValue}>
    <div className="game-container">
      {/* Victory overlay */}
      {isGameOver && <VictoryScreen />}

      {/* AI Thinking indicator */}
      {currentPlayer.isAI && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 px-6 py-3 rounded-xl border border-purple-500 shadow-xl shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full" />
            <div>
              <span className="text-purple-200 font-semibold">{currentPlayer.name}</span>
              <span className="text-purple-400"> is thinking...</span>
            </div>
            <select
              value={aiSpeed}
              onChange={(e) => setAISpeed(e.target.value as 'slow' | 'normal' | 'fast')}
              className="ml-4 bg-purple-800 border border-purple-600 rounded px-2 py-1 text-xs text-purple-200"
            >
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </div>
        </div>
      )}

      {/* Online: Waiting for opponent indicator */}
      {isOnlineGame && !isMyTurn && !currentPlayer.isAI && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-cyan-900/90 px-6 py-3 rounded-xl border border-cyan-500 shadow-xl shadow-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="animate-pulse w-3 h-3 bg-cyan-400 rounded-full" />
            <div>
              <span className="text-cyan-400">Waiting for </span>
              <span className="text-cyan-200 font-semibold">{currentPlayer.name}</span>
              <span className="text-cyan-400">...</span>
            </div>
          </div>
        </div>
      )}

      {/* Card/Mission viewer modal */}
      <ViewerModal />
      {viewingCaptain && <CaptainViewerModal captain={viewingCaptain} onClose={() => setViewingCaptain(null)} />}

      {/* Two-column layout: Main game | Systems sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* MAIN GAME AREA */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Header */}
          <header className="flex-none px-4 py-1 bg-slate-950/30">
            <GameHeader />
          </header>

          {/* Fame Track */}
          {gameState && (
            <FameTrack
              players={gameState.players}
              currentPlayerIndex={gameState.currentPlayerIndex}
            />
          )}

          {/* Top row: Hand (left) | Market (center-right) - z-20 so buy buttons float above space track */}
          <div className="flex-none flex items-start px-4 py-2 relative z-20">
            {/* Hand Cards - fanned like cards held in hand */}
            <ScaledSection scale={scales.hand} fixedWidth={600} fixedHeight={340} origin="top left" className="flex-none ml-2">
              <HandDisplay
                cards={localPlayer.hand}
                player={localPlayer}
                onPlayCard={playCardWithChoice}
                onInstallCard={(card, system) => installCard(card.instanceId, system)}
                onClearHazard={(card) => clearHazard(card.instanceId)}
                onViewCard={viewCard}
                layout="horizontal"
                isMyTurn={isMyTurn}
              />
            </ScaledSection>

            {/* Spacer to push market toward center-right but not to edge */}
            <div className="flex-1" />

            {/* Market Pyramid - positioned with generous margin from right edge */}
            <ScaledSection scale={scales.market} origin="top right" className="flex-none mr-32">
              <PyramidMarket
                marketStacks={gameState.marketStacks}
                currentPlayer={localPlayer}
                onBuyCard={buyCard}
                onBuyAndInstall={buyAndInstall}
                onViewCard={viewCard}
                onRevealStack={revealMarketStack}
              />
            </ScaledSection>
          </div>

          {/* Space Track with Missions - Slightly right of center */}
          <section className="flex-1 flex items-center justify-center px-4 pl-16 min-h-0 overflow-hidden">
            <ScaledSection scale={scales.spaceTrack} origin="center center">
              <SpaceTrack
                state={gameState}
                currentPlayerId={currentPlayer.id}
                onMove={move}
                onViewMission={(tm) => viewMission(tm.mission)}
              />
            </ScaledSection>
          </section>

          {/* Deck, Played & Discard - Bottom left */}
          <div className="absolute bottom-20 left-4 z-10 flex items-end gap-3">
            {/* Deck pile */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {localPlayer.deck.length > 4 && (
                  <div className="absolute top-1 left-1">
                    <CardBack size="tiny" />
                  </div>
                )}
                {localPlayer.deck.length > 2 && (
                  <div className="absolute top-0.5 left-0.5">
                    <CardBack size="tiny" />
                  </div>
                )}
                <CardBack size="tiny" />
                <div className="absolute -bottom-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {localPlayer.deck.length}
                </div>
              </div>
              <span className="text-slate-500 text-[10px] mt-1 font-semibold">DECK</span>
            </div>

            {/* Hand count */}
            <div className="flex flex-col items-center px-2">
              <div className="text-amber-400 font-bold text-lg">{localPlayer.hand.length}</div>
              <span className="text-slate-500 text-[10px]">hand</span>
            </div>

            {/* Played pile (this turn) */}
            <div ref={playedPileRef} className="flex flex-col items-center">
              <div className="relative">
                {localPlayer.played.length > 0 ? (
                  <>
                    {localPlayer.played.length > 2 && (
                      <div className="absolute top-0.5 left-0.5 opacity-70">
                        <CardBack size="tiny" />
                      </div>
                    )}
                    <Card card={localPlayer.played[localPlayer.played.length - 1]} size="tiny" />
                  </>
                ) : (
                  <div className="w-16 h-22 rounded border-2 border-dashed border-green-700/50 bg-green-900/20 flex items-center justify-center">
                    <span className="text-green-600 text-[10px]">-</span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-green-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {localPlayer.played.length}
                </div>
              </div>
              <span className="text-green-500 text-[10px] mt-1 font-semibold">PLAYED</span>
            </div>

            {/* Discard pile */}
            <div ref={discardPileRef} className="flex flex-col items-center">
              <div className="relative">
                {localPlayer.discard.length > 0 ? (
                  <>
                    {localPlayer.discard.length > 2 && (
                      <div className="absolute top-0.5 left-0.5 opacity-70">
                        <CardBack size="tiny" />
                      </div>
                    )}
                    <Card card={localPlayer.discard[localPlayer.discard.length - 1]} size="tiny" />
                  </>
                ) : (
                  <div className="w-16 h-22 rounded border-2 border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center">
                    <span className="text-slate-600 text-[10px]">Empty</span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-slate-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {localPlayer.discard.length}
                </div>
              </div>
              <span className="text-slate-500 text-[10px] mt-1 font-semibold">DISCARD</span>
            </div>
          </div>

          {/* Action Bar at bottom */}
          <footer className="flex-none">
            <ActionBar isMyTurn={isMyTurn} />
          </footer>
        </main>

        {/* RIGHT COLUMN - Player Systems & Info */}
        <aside
          className="flex-none flex flex-col bg-slate-950/50 border-l border-amber-900/20 overflow-y-auto"
          style={{ width: 288 * scales.sidebar }}
        >
          <div
            style={{
              transform: scales.sidebar !== 1 ? `scale(${scales.sidebar})` : undefined,
              transformOrigin: 'top right',
              width: 288,
              willChange: scales.sidebar !== 1 ? 'transform' : undefined,
            }}
          >
          {/* Captain & Fame/Credits - Compact header */}
          <div className="flex-none p-3 border-b border-amber-900/20">
            <div className="flex items-center gap-3">
              <img
                src={`/cards/captain/${localPlayer.captain.id.charAt(0).toUpperCase() + localPlayer.captain.id.slice(1)}.png`}
                alt={localPlayer.captain.name}
                className="w-14 h-14 rounded object-cover border-2 border-amber-600/50 cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all"
                onClick={() => setViewingCaptain(localPlayer.captain)}
                title={`View ${localPlayer.captain.name}'s ability`}
              />
              <div className="flex-1">
                <div className="text-amber-400 font-bold">{localPlayer.name}</div>
                <div
                  className="text-slate-500 text-xs mb-1 cursor-pointer hover:text-amber-400 transition-colors"
                  onClick={() => setViewingCaptain(localPlayer.captain)}
                >{localPlayer.captain.name}</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400">★</span>
                    <motion.span
                      key={`fame-${localPlayer.fame}`}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="text-amber-400 font-bold text-lg"
                    >
                      {localPlayer.fame}
                    </motion.span>
                  </div>
                  <div ref={setCreditCounterRef} className="flex items-center gap-1">
                    <span className="text-amber-300 text-sm">💰</span>
                    <motion.span
                      key={`credits-${localPlayer.credits}`}
                      initial={{ scale: 1.3, color: '#fbbf24' }}
                      animate={{ scale: 1, color: '#fcd34d' }}
                      transition={{ duration: 0.3 }}
                      className="text-amber-300 font-semibold"
                    >
                      {localPlayer.credits}
                    </motion.span>
                  </div>
                  {localPlayer.movesRemaining > 0 && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-engines/20 rounded">
                      <span className="text-engines font-bold text-sm">{localPlayer.movesRemaining}</span>
                      <span className="text-engines text-xs">Moves</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ship Systems - Each with its own row showing abilities */}
          <div className="flex-none p-3 space-y-2">
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Ship Systems</h3>

            {/* Weapons */}
            <ExpandedSystemPanel
              system="weapons"
              player={localPlayer}
              isCurrentPlayer={isMyTurn}
              onActivate={(idx) => activateSystem('weapons' as SystemType, idx)}
              allPlayers={gameState.players}
            />

            {/* Computers */}
            <ExpandedSystemPanel
              system="computers"
              player={localPlayer}
              isCurrentPlayer={isMyTurn}
              onActivate={(idx) => activateSystem('computers' as SystemType, idx)}
              allPlayers={gameState.players}
            />

            {/* Engines */}
            <ExpandedSystemPanel
              system="engines"
              player={localPlayer}
              isCurrentPlayer={isMyTurn}
              onActivate={(idx) => activateSystem('engines' as SystemType, idx)}
              allPlayers={gameState.players}
            />

            {/* Logistics */}
            <ExpandedSystemPanel
              system="logistics"
              player={localPlayer}
              isCurrentPlayer={isMyTurn}
              onActivate={(idx) => activateSystem('logistics' as SystemType, idx)}
              allPlayers={gameState.players}
            />
          </div>

          {/* Completed Missions & Trophies */}
          {(localPlayer.completedMissions.length > 0 || localPlayer.trophies.length > 0) && (
            <div className="flex-none p-3 border-t border-amber-900/20">
              {/* Trophies Section */}
              {localPlayer.trophies.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                    🏆 Trophies ({localPlayer.trophies.length})
                  </h3>
                  <div className="space-y-1">
                    {localPlayer.trophies.map((trophy) => (
                      <TrophyItem key={trophy.instanceId} trophy={trophy} onView={() => viewMission(trophy)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Missions (non-trophy) */}
              {localPlayer.completedMissions.filter(m => m.rewardType !== 'trophy').length > 0 && (
                <div>
                  <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Completed Missions ({localPlayer.completedMissions.filter(m => m.rewardType !== 'trophy').length})
                  </h3>
                  <div className="space-y-1">
                    {localPlayer.completedMissions
                      .filter(m => m.rewardType !== 'trophy')
                      .map((mission) => (
                        <MissionItem key={mission.instanceId} mission={mission} onView={() => viewMission(mission)} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Opponents - Compact at bottom */}
          {otherPlayers.length > 0 && (
            <div className="flex-none p-3 border-t border-amber-900/20">
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Opponents</h3>
              <OpponentBar opponents={otherPlayers} allPlayers={players} layout="vertical" onViewPlayer={setViewingOpponent} onViewCaptain={setViewingCaptain} />
            </div>
          )}
          </div>{/* end sidebar scale wrapper */}
        </aside>
      </div>

      {/* Market Overlay */}
      <MarketOverlay
        isOpen={showMarket}
        onClose={toggleMarket}
        marketStacks={gameState.marketStacks}
        currentPlayer={localPlayer}
        onBuyCard={buyCard}
        onBuyAndInstall={buyAndInstall}
        onViewCard={viewCard}
      />

      {/* Power choice modal */}
      {pendingPowerChoice && <PowerChoiceModal />}
      <PowerAllocationPendingModal />

      {/* Hazard reveal modal */}
      <HazardRevealModal />

      {/* Trash card modal */}
      <TrashCardModal />

      {/* Mission reward modal */}
      <MissionRewardModal />

      {/* Mission reward choice modal */}
      <MissionRewardChoiceModal />

      {/* Target player modal */}
      <TargetPlayerModal />

      {/* Draw 3 keep 1 modal */}
      <Draw3Keep1Modal />

      {/* Move other player modal */}
      <MoveOtherPlayerModal />

      {/* Interaction modals */}
      <ForceDiscardModal />
      <ChooseOpponentDiscardModal />
      <ChoosePowerLossModal />
      <ForceUninstallModal />
      <InteractionChoiceModal />
      <ChooseOpponentInstallModal />
      <InstallEffectPromptModal />
      <SelectSwapDiscardModal />
      <WaitingForOpponentOverlay />

      {/* UI Scale Settings Panel */}
      <ScaleSettingsPanel />

      {/* Turn timer reminder — positioned above the action bar to avoid overlapping undo */}
      {turnElapsed >= TURN_TIMER_THRESHOLD && !isGameOver && !currentPlayer?.isAI && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 animate-pulse">
          <div className="bg-slate-900/90 border border-amber-900/40 rounded-lg px-4 py-2 shadow-lg backdrop-blur-sm text-center">
            {isMyTurn ? (
              <span className="text-amber-400 text-sm font-semibold">
                Still your turn ({Math.floor(turnElapsed / 60)}:{(turnElapsed % 60).toString().padStart(2, '0')})
              </span>
            ) : (
              <span className="text-slate-400 text-sm">
                Waiting for <span className="text-amber-400 font-semibold">{currentPlayer?.name}</span>
                {' '}({Math.floor(turnElapsed / 60)}:{(turnElapsed % 60).toString().padStart(2, '0')})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Game Log Panel - always visible in bottom-right */}
      <GameLogPanel />

      {/* Opponent Tableau Viewer */}
      {viewingOpponent && (
        <OpponentTableauModal
          player={viewingOpponent}
          allPlayers={players}
          onClose={() => setViewingOpponent(null)}
          onViewMission={viewMission}
        />
      )}

      {/* Reconnecting overlay */}
      {isOnlineGame && multiplayerStatus === 'connecting' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="game-panel p-6 text-center max-w-sm">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-400">Reconnecting...</h2>
            <p className="text-slate-400 mt-2 text-sm">Please wait while we reconnect to the game.</p>
          </div>
        </div>
      )}

      {/* Animation overlay (ghost cards, floating numbers) */}
      <AnimationOverlay />
    </div>
    </GameBoardContext.Provider>
  );
}

export default GameBoard;
