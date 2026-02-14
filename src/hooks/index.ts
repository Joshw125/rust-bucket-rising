// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Hooks Module Exports
// ═══════════════════════════════════════════════════════════════════════════════

export {
  useGameStore,
  useCurrentPlayer,
  usePlayers,
  useIsGameOver,
  useWinner,
  useGameLog,
} from './useGameStore';

export {
  useMultiplayer,
  useMultiplayerRoom,
  useMultiplayerStatus,
  useMultiplayerError,
  useMultiplayerChat,
  useIsHost,
  useMyPlayer,
  useCanStartGame,
} from './useMultiplayer';

export { useUIScaleStore } from './useUIScaleStore';
export { useIsMobile } from './useIsMobile';
export { useMobileViewStore } from './useMobileViewStore';
export { useAnimationStore } from './useAnimationStore';
