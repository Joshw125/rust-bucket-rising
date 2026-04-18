// =============================================================================
// RUST BUCKET RISING - Multiplayer Types
// Shared types for WebSocket communication
// =============================================================================

// -----------------------------------------------------------------------------
// Room & Player Types
// -----------------------------------------------------------------------------

export interface RoomPlayer {
  id: string;
  name: string;
  captainId: string | null;
  captainChoices: string[]; // 2 random captain options assigned by server
  isReady: boolean;
  isHost: boolean;
  isConnected: boolean;
}

export interface Room {
  id: string;
  code: string; // 4-character join code
  name: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'finished';
  gameState: unknown | null; // GameState when playing
  stateHash: string | null; // Latest state hash (legacy; removed in Phase 3)
  lastActivity: number; // Timestamp of last message (for server-side cleanup)
  createdAt: number;
}

// -----------------------------------------------------------------------------
// Client -> Server Messages
// -----------------------------------------------------------------------------

export type ClientMessage =
  | { type: 'CREATE_ROOM'; playerName: string }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SELECT_CAPTAIN'; captainId: string }
  | { type: 'TOGGLE_READY' }
  | { type: 'START_GAME' }
  // GAME_ACTION: server is authoritative — it validates, dispatches,
  // and broadcasts the resulting state. `action` is typed as unknown here
  // (server casts to GameAction) to avoid a circular import.
  | { type: 'GAME_ACTION'; action: unknown }
  // STATE_SNAPSHOT from client is legacy (Phase 2+: server owns state).
  // Still accepted to avoid breaking older clients mid-rollout, but ignored.
  | { type: 'STATE_SNAPSHOT'; snapshot: unknown; stateHash: string }
  | { type: 'REQUEST_RESYNC' }
  | { type: 'GAME_OVER'; winnerId: number; winnerName: string; stats: unknown }
  | { type: 'CHAT'; message: string }
  | { type: 'REJOIN_AS'; roomCode: string; playerName: string; targetPlayerName: string }
  | { type: 'PING' };

// -----------------------------------------------------------------------------
// Server -> Client Messages
// -----------------------------------------------------------------------------

// Player mapping shared between GAME_STARTED and room state
export interface NetworkPlayerInfo {
  id: number; // in-game player index (0..n-1)
  name: string;
  captainId: string;
  networkId: string; // WebSocket player id
}

export type ServerMessage =
  | { type: 'CONNECTED'; playerId: string }
  | { type: 'ERROR'; message: string }
  | { type: 'ROOM_CREATED'; room: Room; playerId: string }
  | { type: 'ROOM_JOINED'; room: Room; playerId: string }
  | { type: 'ROOM_UPDATE'; room: Room }
  | { type: 'PLAYER_JOINED'; player: RoomPlayer }
  | { type: 'PLAYER_LEFT'; playerId: string; newHostId?: string }
  // GAME_STARTED now carries the authoritative initial state. Clients load
  // it directly instead of creating their own engine and diverging.
  | { type: 'GAME_STARTED'; gameState: { players: NetworkPlayerInfo[]; initialState: unknown } }
  // GAME_STATE_UPDATE now broadcasts the full state after each server-side
  // dispatch. `fromPlayerIndex` is advisory (for animations/logs).
  // `action` is echoed so clients can render "what just happened" cues.
  | { type: 'GAME_STATE_UPDATE'; state: unknown; action: unknown; fromPlayerIndex: number }
  // STATE_SNAPSHOT: sent on reconnect/resync. Client overwrites local state.
  | { type: 'STATE_SNAPSHOT'; snapshot: unknown; stateHash: string }
  | { type: 'RESYNC_REQUESTED'; playerId: string }
  | { type: 'GAME_OVER'; winnerId: number; winnerName: string }
  | { type: 'CHAT_MESSAGE'; playerId: string; playerName: string; message: string }
  | { type: 'REJOIN_OPTIONS'; roomCode: string; disconnectedPlayers: Array<{ name: string; captainId: string | null }> }
  | { type: 'PONG' };

// -----------------------------------------------------------------------------
// Connection State
// -----------------------------------------------------------------------------

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface MultiplayerState {
  status: ConnectionStatus;
  playerId: string | null;
  room: Room | null;
  error: string | null;
  chatMessages: ChatMessage[];
}
