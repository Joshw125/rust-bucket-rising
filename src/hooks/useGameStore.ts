// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Game Store (Zustand)
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GameState, GameAction, Captain, CardInstance, SystemType, PowerAllocation, MissionInstance, AIStrategy } from '@/types';
import { GameEngine } from '@/engine';
import { AIEngine } from '@/engine/AIEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Pending power choice state
export interface PendingPowerChoice {
  cardInstanceId: string;
  cardTitle: string;
  powerAmount: number;
}

export interface GameStore {
  // Engine reference
  engine: GameEngine | null;
  aiEngines: Map<number, AIEngine>; // Map of player ID to AI engine

  // Game state (synced from engine)
  gameState: GameState | null;

  // UI state
  selectedCardId: string | null;
  viewingCard: CardInstance | null;
  viewingMission: MissionInstance | null;
  showMarket: boolean;
  showLog: boolean;
  pendingPowerChoice: PendingPowerChoice | null;
  isAIThinking: boolean;
  aiSpeed: 'slow' | 'normal' | 'fast'; // AI action delay

  // Multiplayer callback - called after successful dispatch, before AI processing
  onActionDispatched: ((action: GameAction) => void) | null;
  setOnActionDispatched: (callback: ((action: GameAction) => void) | null) => void;

  // Actions
  initGame: (players: Array<{ name: string; captain: Captain; isAI?: boolean; aiStrategy?: AIStrategy }>) => void;
  dispatch: (action: GameAction) => boolean;
  processAITurn: () => void;
  setAISpeed: (speed: 'slow' | 'normal' | 'fast') => void;

  // UI actions
  selectCard: (cardId: string | null) => void;
  viewCard: (card: CardInstance | null) => void;
  viewMission: (mission: MissionInstance | null) => void;
  toggleMarket: () => void;
  toggleLog: () => void;
  setPendingPowerChoice: (choice: PendingPowerChoice | null) => void;
  confirmPowerChoice: (allocation: PowerAllocation) => boolean;

  // Game action helpers
  playCard: (cardInstanceId: string, powerAllocation?: PowerAllocation) => boolean;
  playCardWithChoice: (card: CardInstance) => void;
  installCard: (cardInstanceId: string, targetSystem: SystemType) => boolean;
  activateSystem: (system: SystemType, abilityIndex: number, targetPlayerId?: number) => boolean;
  move: (direction: -1 | 1) => boolean;
  completeMission: () => boolean;
  buyCard: (station: 1 | 3 | 5, stackIndex: number, cardIndex?: number) => boolean;
  revealMarketStack: (station: 1 | 3 | 5, stackIndex: number) => void;
  endTurn: () => boolean;
  clearHazard: (hazardInstanceId: string) => boolean;
  resolveHazardReveal: () => boolean;
  buyAndInstall: (station: 1 | 3 | 5, stackIndex: number, targetSystem: SystemType, cardIndex?: number) => boolean;
  resolveTrashCard: (cardInstanceId: string) => boolean;
  restartTurn: () => boolean;
  canRestartTurn: () => boolean;
  canCompleteMission: () => boolean;

  // Multiplayer support
  applyRemoteAction: (action: GameAction) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper to deep clone state (avoids Immer freezing engine's internal state)
// ─────────────────────────────────────────────────────────────────────────────

function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

// AI action delays in milliseconds
const AI_DELAYS = {
  slow: 1500,
  normal: 800,
  fast: 300,
};

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // Initial state
    engine: null,
    aiEngines: new Map(),
    gameState: null,
    selectedCardId: null,
    viewingCard: null,
    viewingMission: null,
    showMarket: false,
    showLog: false,
    pendingPowerChoice: null,
    isAIThinking: false,
    aiSpeed: 'normal' as const,
    onActionDispatched: null,

    // Set the callback for multiplayer action sync
    setOnActionDispatched: (callback) => {
      set((state) => {
        state.onActionDispatched = callback;
      });
    },

    // Initialize a new game
    initGame: (players) => {
      const engine = new GameEngine(players);
      const aiEngines = new Map<number, AIEngine>();

      // Create AI engines for AI players
      players.forEach((p, idx) => {
        if (p.isAI) {
          aiEngines.set(idx, new AIEngine(p.aiStrategy ?? 'balanced'));
        }
      });

      set((state) => {
        state.engine = engine;
        state.aiEngines = aiEngines;
        // Clone state so Immer doesn't freeze the engine's internal state
        state.gameState = cloneGameState(engine.getState());
        state.selectedCardId = null;
        state.viewingCard = null;
        state.showMarket = false;
        state.isAIThinking = false;
      });

      // Check if first player is AI and start their turn
      const gameState = engine.getState();
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.isAI) {
        // Delay slightly so UI can render first
        setTimeout(() => get().processAITurn(), 500);
      }
    },

    // Dispatch an action to the engine and sync state
    dispatch: (action) => {
      const { engine, onActionDispatched } = get();
      if (!engine) return false;

      const result = engine.dispatch(action);
      set((state) => {
        // Clone state so Immer doesn't freeze the engine's internal state
        state.gameState = cloneGameState(engine.getState());
      });

      // Call multiplayer sync callback if set (for online games)
      if (result && onActionDispatched) {
        onActionDispatched(action);
      }

      // After any action, check if it's now an AI player's turn
      const gameState = engine.getState();
      if (!gameState.gameOver) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer.isAI && !get().isAIThinking) {
          // Schedule AI turn processing
          setTimeout(() => get().processAITurn(), AI_DELAYS[get().aiSpeed]);
        }
      }

      return result;
    },

    // Process AI turn - called automatically when it's an AI's turn
    processAITurn: () => {
      const { engine, aiEngines, gameState, isAIThinking, aiSpeed } = get();
      if (!engine || !gameState || gameState.gameOver) return;

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer.isAI) return;

      // Prevent concurrent AI processing
      if (isAIThinking) return;

      set((state) => {
        state.isAIThinking = true;
      });

      // Get the AI engine for this player
      const aiEngine = aiEngines.get(currentPlayer.id);
      if (!aiEngine) {
        set((state) => {
          state.isAIThinking = false;
        });
        return;
      }

      // Get the AI's decision
      const action = aiEngine.decideAction(gameState, currentPlayer);

      if (action) {
        // Execute the action
        engine.dispatch(action);
        set((state) => {
          state.gameState = cloneGameState(engine.getState());
          state.isAIThinking = false;
        });

        // Check if turn continues (AI might need to take more actions)
        const newState = engine.getState();
        if (!newState.gameOver) {
          const newCurrentPlayer = newState.players[newState.currentPlayerIndex];
          if (newCurrentPlayer.isAI && newCurrentPlayer.id === currentPlayer.id) {
            // Same AI player still has actions - continue
            setTimeout(() => get().processAITurn(), AI_DELAYS[aiSpeed]);
          } else if (newCurrentPlayer.isAI && newCurrentPlayer.id !== currentPlayer.id) {
            // Different AI player's turn now
            setTimeout(() => get().processAITurn(), AI_DELAYS[aiSpeed] * 2); // Extra delay between players
          }
        }
      } else {
        // No action means AI is done
        set((state) => {
          state.isAIThinking = false;
        });
      }
    },

    // Set AI speed
    setAISpeed: (speed) => {
      set((state) => {
        state.aiSpeed = speed;
      });
    },

    // UI actions
    selectCard: (cardId) => {
      set((state) => {
        state.selectedCardId = cardId;
      });
    },

    viewCard: (card) => {
      set((state) => {
        state.viewingCard = card;
        state.viewingMission = null;
      });
    },

    viewMission: (mission) => {
      set((state) => {
        state.viewingMission = mission;
        state.viewingCard = null;
      });
    },

    toggleMarket: () => {
      set((state) => {
        state.showMarket = !state.showMarket;
      });
    },

    toggleLog: () => {
      set((state) => {
        state.showLog = !state.showLog;
      });
    },

    setPendingPowerChoice: (choice) => {
      set((state) => {
        state.pendingPowerChoice = choice;
      });
    },

    confirmPowerChoice: (allocation) => {
      const { pendingPowerChoice } = get();
      if (!pendingPowerChoice) return false;

      const result = get().playCard(pendingPowerChoice.cardInstanceId, allocation);

      set((state) => {
        state.pendingPowerChoice = null;
      });

      return result;
    },

    // Game action helpers
    playCard: (cardInstanceId, powerAllocation) => {
      return get().dispatch({ type: 'PLAY_CARD', cardInstanceId, powerAllocation });
    },

    // Play a card, checking if it needs a power choice first
    playCardWithChoice: (card) => {
      // Check if this card requires a power choice
      const effectData = (card as any).effectData;
      if (effectData?.powerChoice) {
        // Show the power choice modal
        set((state) => {
          state.pendingPowerChoice = {
            cardInstanceId: card.instanceId,
            cardTitle: card.title,
            powerAmount: effectData.powerChoice,
          };
        });
      } else {
        // Play directly
        get().playCard(card.instanceId);
      }
    },

    installCard: (cardInstanceId, targetSystem) => {
      return get().dispatch({ type: 'INSTALL_CARD', cardInstanceId, targetSystem });
    },

    activateSystem: (system, abilityIndex, targetPlayerId) => {
      return get().dispatch({ type: 'ACTIVATE_SYSTEM', system, abilityIndex, targetPlayerId });
    },

    move: (direction) => {
      return get().dispatch({ type: 'MOVE', direction });
    },

    completeMission: () => {
      return get().dispatch({ type: 'COMPLETE_MISSION' });
    },

    buyCard: (station, stackIndex, cardIndex = undefined) => {
      const { engine, gameState } = get();
      if (!engine || !gameState) return false;

      const player = engine.getCurrentPlayer();
      if (player.location !== station) return false;

      // If cardIndex not specified, default to top card (last in array)
      const stackInfo = gameState.marketStacks[station][stackIndex];
      const actualCardIndex = cardIndex ?? (stackInfo?.cards.length ? stackInfo.cards.length - 1 : 0);

      return get().dispatch({ type: 'BUY_CARD', stackIndex, cardIndex: actualCardIndex });
    },

    revealMarketStack: (station, stackIndex) => {
      get().dispatch({ type: 'REVEAL_STACK', station, stackIndex });
    },

    endTurn: () => {
      set((state) => {
        state.selectedCardId = null;
      });
      return get().dispatch({ type: 'END_TURN' });
    },

    clearHazard: (hazardInstanceId) => {
      return get().dispatch({ type: 'CLEAR_HAZARD', hazardInstanceId });
    },

    resolveHazardReveal: () => {
      return get().dispatch({ type: 'RESOLVE_PENDING', choice: null });
    },

    buyAndInstall: (_station, stackIndex, targetSystem, cardIndex = undefined) => {
      const { gameState } = get();
      if (!gameState) return false;

      // If cardIndex not specified, default to top card
      const station = _station as 1 | 3 | 5;
      const stackInfo = gameState.marketStacks[station][stackIndex];
      const actualCardIndex = cardIndex ?? (stackInfo?.cards.length ? stackInfo.cards.length - 1 : 0);

      return get().dispatch({ type: 'BUY_AND_INSTALL', stackIndex, targetSystem, cardIndex: actualCardIndex });
    },

    resolveTrashCard: (cardInstanceId) => {
      return get().dispatch({ type: 'RESOLVE_PENDING', choice: cardInstanceId });
    },

    restartTurn: () => {
      return get().dispatch({ type: 'RESTART_TURN' });
    },

    canRestartTurn: () => {
      const { engine } = get();
      if (!engine) return false;
      return engine.canRestartTurn();
    },

    canCompleteMission: () => {
      const { engine } = get();
      if (!engine) return false;
      const player = engine.getCurrentPlayer();
      return engine.canCompleteMission(player);
    },

    // Apply an action received from another player (multiplayer)
    // This dispatches to the engine without triggering AI turns (remote player handles their own AI)
    applyRemoteAction: (action) => {
      const { engine } = get();
      if (!engine) return false;

      const result = engine.dispatch(action);
      set((state) => {
        // Clone state so Immer doesn't freeze the engine's internal state
        state.gameState = cloneGameState(engine.getState());
      });

      return result;
    },
  }))
);

// ─────────────────────────────────────────────────────────────────────────────
// Selector Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useCurrentPlayer = () => {
  const gameState = useGameStore((state) => state.gameState);
  if (!gameState) return null;
  return gameState.players[gameState.currentPlayerIndex];
};

export const usePlayers = () => {
  const gameState = useGameStore((state) => state.gameState);
  return gameState?.players ?? [];
};

export const useIsGameOver = () => {
  const gameState = useGameStore((state) => state.gameState);
  return gameState?.gameOver ?? false;
};

export const useWinner = () => {
  const gameState = useGameStore((state) => state.gameState);
  return gameState?.winner ?? null;
};

export const useGameLog = () => {
  const gameState = useGameStore((state) => state.gameState);
  return gameState?.log ?? [];
};

export default useGameStore;
