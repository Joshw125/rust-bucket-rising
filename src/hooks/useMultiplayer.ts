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
  GameState,
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WS_URL = ((import.meta as any).env?.VITE_WS_URL as string) || 'ws://localhost:3001';
const PING_INTERVAL = 30000;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000]; // Exponential backoff

// ─────────────────────────────────────────────────────────────────────────────
// Store Interface
// ─────────────────────────────────────────────────────────────────────────────

interface MultiplayerStore extends MultiplayerState {
  // WebSocket reference
  ws: WebSocket | null;
  pingInterval: ReturnType<typeof setInterval> | null;

  // Reconnection state
  lastRoomCode: string | null;
  lastPlayerName: string | null;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  isRejoining: boolean;

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
  sendGameAction: (action: GameAction, stateHash?: string) => void;
  sendStateSnapshot: (snapshot: GameState, stateHash: string) => void;
  requestResync: () => void;
  sendGameOver: (winnerId: number, winnerName: string, stats: unknown) => void;

  // Chat
  sendChat: (message: string) => void;

  // Internal
  clearError: () => void;
  _send: (message: ClientMessage) => void;
  _handleMessage: (message: ServerMessage) => void;
  _attemptReconnect: () => void;
  _stopReconnect: () => void;

  // Game state sync callbacks
  onGameStart: ((players: Array<{ id: number; name: string; captainId: string; networkId: string }>) => void) | null;
  onGameAction: ((action: GameAction, fromPlayerIndex: number, stateHash?: string) => void) | null;
  onStateSnapshot: ((snapshot: unknown, stateHash: string) => void) | null;
  onResyncRequested: (() => void) | null;
  setGameCallbacks: (
    onStart: (players: Array<{ id: number; name: string; captainId: string; networkId: string }>) => void,
    onAction: (action: GameAction, fromPlayerIndex: number, stateHash?: string) => void,
    onSnapshot: (snapshot: unknown, stateHash: string) => void,
    onResync: () => void,
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
  onStateSnapshot: null,
  onResyncRequested: null,

  // Reconnection state
  lastRoomCode: null,
  lastPlayerName: null,
  reconnectAttempt: 0,
  reconnectTimer: null,
  isRejoining: false,

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
      set({ ws: socket, pingInterval: interval, reconnectAttempt: 0 });
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
      const { pingInterval, room, lastRoomCode } = get();
      if (pingInterval) clearInterval(pingInterval);

      const wasInGame = room?.status === 'playing' || lastRoomCode;

      set({
        ws: null,
        status: 'disconnected',
        pingInterval: null,
      });

      // Auto-reconnect if we were in a game
      if (wasInGame) {
        get()._attemptReconnect();
      }
    };
  },

  // Disconnect from server (intentional disconnect, no auto-reconnect)
  disconnect: () => {
    const { ws, pingInterval } = get();
    get()._stopReconnect();
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
      lastRoomCode: null,
      lastPlayerName: null,
      reconnectAttempt: 0,
      isRejoining: false,
    });
  },

  // Create a new room
  createRoom: (playerName: string) => {
    const { status } = get();
    set({ lastPlayerName: playerName });
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
    set({ lastRoomCode: roomCode, lastPlayerName: playerName });
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
    get()._stopReconnect();
    set({ room: null, chatMessages: [], lastRoomCode: null, lastPlayerName: null, isRejoining: false });
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

  // Send a game action with optional state hash
  sendGameAction: (action: GameAction, stateHash?: string) => {
    get()._send({ type: 'GAME_ACTION', action, stateHash });
  },

  // Send a full state snapshot (host sends after each turn end)
  sendStateSnapshot: (snapshot: GameState, stateHash: string) => {
    get()._send({ type: 'STATE_SNAPSHOT', snapshot, stateHash });
  },

  // Request a resync from the server/host
  requestResync: () => {
    get()._send({ type: 'REQUEST_RESYNC' });
  },

  // Send game over notification (host only)
  sendGameOver: (winnerId: number, winnerName: string, stats: unknown) => {
    get()._send({ type: 'GAME_OVER', winnerId, winnerName, stats });
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

  // Internal: Auto-reconnect with exponential backoff
  _attemptReconnect: () => {
    const { reconnectAttempt, lastRoomCode, lastPlayerName } = get();
    if (!lastRoomCode || !lastPlayerName) return;

    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    console.log(`Auto-reconnect attempt ${reconnectAttempt + 1} in ${delay}ms...`);

    set({ status: 'connecting', isRejoining: true });

    const timer = setTimeout(() => {
      set({ reconnectAttempt: reconnectAttempt + 1 });

      const socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.log('Reconnected to server, attempting rejoin...');
        const interval = setInterval(() => {
          get()._send({ type: 'PING' });
        }, PING_INTERVAL);
        set({ ws: socket, pingInterval: interval });
        // Don't set status to 'connected' yet - wait for CONNECTED message
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          get()._handleMessage(message);
        } catch (err) {
          console.error('Failed to parse server message:', err);
        }
      };

      socket.onerror = () => {
        console.error('Reconnection failed');
        set({ ws: null, status: 'disconnected', pingInterval: null });
        // Try again
        get()._attemptReconnect();
      };

      socket.onclose = () => {
        const { pingInterval } = get();
        if (pingInterval) clearInterval(pingInterval);
        set({ ws: null, status: 'disconnected', pingInterval: null });
        // If we're still trying to rejoin, try again
        if (get().isRejoining) {
          get()._attemptReconnect();
        }
      };
    }, delay);

    set({ reconnectTimer: timer });
  },

  // Internal: Stop reconnection attempts
  _stopReconnect: () => {
    const { reconnectTimer } = get();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    set({ reconnectTimer: null, reconnectAttempt: 0, isRejoining: false });
  },

  // Internal: Handle message from server
  _handleMessage: (message: ServerMessage) => {
    switch (message.type) {
      case 'CONNECTED': {
        const { isRejoining, lastRoomCode, lastPlayerName } = get();
        set({ status: 'connected', playerId: message.playerId });

        // If reconnecting, auto-rejoin the room
        if (isRejoining && lastRoomCode && lastPlayerName) {
          console.log(`Auto-rejoining room ${lastRoomCode} as ${lastPlayerName}`);
          get()._send({ type: 'JOIN_ROOM', roomCode: lastRoomCode, playerName: lastPlayerName });
        }
        break;
      }

      case 'ERROR':
        set({ error: message.message });
        // If rejoin failed (room not found), stop trying
        if (get().isRejoining && message.message.includes('not found')) {
          get()._stopReconnect();
          set({ status: 'connected' });
        }
        break;

      case 'ROOM_CREATED':
        set({
          room: message.room,
          playerId: message.playerId,
          error: null,
          lastRoomCode: message.room.code,
        });
        break;

      case 'ROOM_JOINED':
        set({
          room: message.room,
          playerId: message.playerId,
          error: null,
          lastRoomCode: message.room.code,
          isRejoining: false,
          reconnectAttempt: 0,
        });
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
          const { action, fromPlayerIndex, stateHash } = message.gameState;
          onGameAction(action as GameAction, fromPlayerIndex, stateHash);
        }
        break;
      }

      case 'STATE_SNAPSHOT': {
        const { onStateSnapshot } = get();
        if (onStateSnapshot) {
          onStateSnapshot(message.snapshot, message.stateHash);
        }
        break;
      }

      case 'RESYNC_REQUESTED': {
        const { onResyncRequested } = get();
        if (onResyncRequested) {
          onResyncRequested();
        }
        break;
      }

      case 'GAME_OVER':
        // Game over notification from server
        break;

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
  setGameCallbacks: (onStart, onAction, onSnapshot, onResync) => {
    set({ onGameStart: onStart, onGameAction: onAction, onStateSnapshot: onSnapshot, onResyncRequested: onResync });
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
