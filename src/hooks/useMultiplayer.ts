// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Multiplayer Hook
// WebSocket connection and state management for online play
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type {
  RoomPlayer,
  ClientMessage,
  ServerMessage,
  MultiplayerState,
  GameAction,
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WS_URL = ((import.meta as any).env?.VITE_WS_URL as string) || 'ws://localhost:3001';
const PING_INTERVAL = 30000;

// ─────────────────────────────────────────────────────────────────────────────
// Store Interface
// ─────────────────────────────────────────────────────────────────────────────

interface MultiplayerStore extends MultiplayerState {
  // WebSocket reference
  ws: WebSocket | null;
  pingInterval: ReturnType<typeof setInterval> | null;

  // Connection actions
  connect: () => void;
  disconnect: () => void;

  // Room actions
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;

  // Lobby actions
  selectCaptain: (captainId: string) => void;
  toggleReady: () => void;
  startGame: () => void;

  // Game actions
  sendGameAction: (action: GameAction) => void;

  // Chat
  sendChat: (message: string) => void;

  // Internal
  clearError: () => void;
  _send: (message: ClientMessage) => void;
  _handleMessage: (message: ServerMessage) => void;

  // Game state sync callback
  onGameStart: ((players: Array<{ id: number; name: string; captainId: string; networkId: string }>) => void) | null;
  onGameAction: ((action: GameAction, fromPlayerIndex: number) => void) | null;
  setGameCallbacks: (
    onStart: (players: Array<{ id: number; name: string; captainId: string; networkId: string }>) => void,
    onAction: (action: GameAction, fromPlayerIndex: number) => void
  ) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useMultiplayer = create<MultiplayerStore>((set, get) => ({
  // Initial state
  status: 'disconnected',
  playerId: null,
  room: null,
  error: null,
  chatMessages: [],
  ws: null,
  pingInterval: null,
  onGameStart: null,
  onGameAction: null,

  // Connect to WebSocket server
  connect: () => {
    const { ws, status } = get();
    if (ws || status === 'connecting') return;

    set({ status: 'connecting', error: null });

    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log('Connected to multiplayer server');
      // Start ping interval
      const interval = setInterval(() => {
        get()._send({ type: 'PING' });
      }, PING_INTERVAL);
      set({ ws: socket, pingInterval: interval });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        get()._handleMessage(message);
      } catch (err) {
        console.error('Failed to parse server message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ status: 'error', error: 'Connection error' });
    };

    socket.onclose = () => {
      console.log('Disconnected from multiplayer server');
      const { pingInterval } = get();
      if (pingInterval) clearInterval(pingInterval);
      set({
        ws: null,
        status: 'disconnected',
        pingInterval: null,
      });
    };
  },

  // Disconnect from server
  disconnect: () => {
    const { ws, pingInterval } = get();
    if (pingInterval) clearInterval(pingInterval);
    if (ws) {
      ws.close();
    }
    set({
      ws: null,
      status: 'disconnected',
      playerId: null,
      room: null,
      chatMessages: [],
      pingInterval: null,
    });
  },

  // Create a new room
  createRoom: (playerName: string) => {
    const { status } = get();
    if (status !== 'connected') {
      get().connect();
      // Queue the action after connection
      setTimeout(() => {
        if (get().status === 'connected') {
          get()._send({ type: 'CREATE_ROOM', playerName });
        }
      }, 500);
      return;
    }
    get()._send({ type: 'CREATE_ROOM', playerName });
  },

  // Join an existing room
  joinRoom: (roomCode: string, playerName: string) => {
    const { status } = get();
    if (status !== 'connected') {
      get().connect();
      setTimeout(() => {
        if (get().status === 'connected') {
          get()._send({ type: 'JOIN_ROOM', roomCode, playerName });
        }
      }, 500);
      return;
    }
    get()._send({ type: 'JOIN_ROOM', roomCode, playerName });
  },

  // Leave current room
  leaveRoom: () => {
    get()._send({ type: 'LEAVE_ROOM' });
    set({ room: null, chatMessages: [] });
  },

  // Select a captain
  selectCaptain: (captainId: string) => {
    get()._send({ type: 'SELECT_CAPTAIN', captainId });
  },

  // Toggle ready status
  toggleReady: () => {
    get()._send({ type: 'TOGGLE_READY' });
  },

  // Start the game (host only)
  startGame: () => {
    get()._send({ type: 'START_GAME' });
  },

  // Send a game action
  sendGameAction: (action: GameAction) => {
    get()._send({ type: 'GAME_ACTION', action });
  },

  // Send a chat message
  sendChat: (message: string) => {
    get()._send({ type: 'CHAT', message });
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Internal: Send message to server
  _send: (message: ClientMessage) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  },

  // Internal: Handle message from server
  _handleMessage: (message: ServerMessage) => {
    switch (message.type) {
      case 'CONNECTED':
        set({ status: 'connected', playerId: message.playerId });
        break;

      case 'ERROR':
        set({ error: message.message });
        break;

      case 'ROOM_CREATED':
      case 'ROOM_JOINED':
        set({ room: message.room, error: null });
        break;

      case 'ROOM_UPDATE':
        set({ room: message.room });
        break;

      case 'PLAYER_JOINED':
        set((state) => {
          if (!state.room) return state;
          return {
            room: {
              ...state.room,
              players: [...state.room.players, message.player],
            },
          };
        });
        break;

      case 'PLAYER_LEFT':
        set((state) => {
          if (!state.room) return state;
          const newPlayers = state.room.players.filter(p => p.id !== message.playerId);
          const newHostId = message.newHostId || state.room.hostId;
          return {
            room: {
              ...state.room,
              players: newPlayers.map(p => ({
                ...p,
                isHost: p.id === newHostId,
              })),
              hostId: newHostId,
            },
          };
        });
        break;

      case 'GAME_STARTED': {
        const { onGameStart, room } = get();
        if (room) {
          set({ room: { ...room, status: 'playing' } });
        }
        if (onGameStart) {
          onGameStart(message.gameState.players);
        }
        break;
      }

      case 'GAME_STATE_UPDATE': {
        const { onGameAction } = get();
        if (onGameAction) {
          const { action, fromPlayerIndex } = message.gameState;
          onGameAction(action as GameAction, fromPlayerIndex);
        }
        break;
      }

      case 'CHAT_MESSAGE':
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            {
              id: `${Date.now()}-${message.playerId}`,
              playerId: message.playerId,
              playerName: message.playerName,
              message: message.message,
              timestamp: Date.now(),
            },
          ].slice(-100), // Keep last 100 messages
        }));
        break;

      case 'PONG':
        // Connection alive
        break;
    }
  },

  // Set game state callbacks
  setGameCallbacks: (onStart, onAction) => {
    set({ onGameStart: onStart, onGameAction: onAction });
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helper Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useMultiplayerRoom = () => useMultiplayer((state) => state.room);
export const useMultiplayerStatus = () => useMultiplayer((state) => state.status);
export const useMultiplayerError = () => useMultiplayer((state) => state.error);
export const useMultiplayerChat = () => useMultiplayer((state) => state.chatMessages);

export const useIsHost = () => {
  const playerId = useMultiplayer((state) => state.playerId);
  const room = useMultiplayer((state) => state.room);
  return room?.hostId === playerId;
};

export const useMyPlayer = (): RoomPlayer | null => {
  const playerId = useMultiplayer((state) => state.playerId);
  const room = useMultiplayer((state) => state.room);
  return room?.players.find(p => p.id === playerId) || null;
};

export const useCanStartGame = () => {
  const room = useMultiplayer((state) => state.room);
  if (!room) return false;
  if (room.players.length < 2) return false;
  return room.players.every(p => p.isReady && p.captainId);
};

export default useMultiplayer;
