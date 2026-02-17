// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Multiplayer Types
// Shared types for WebSocket communication
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Room & Player Types
// ─────────────────────────────────────────────────────────────────────────────

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
  stateHash: string | null; // Latest state hash for desync detection
  lastActivity: number; // Timestamp of last message (for cleanup)
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client -> Server Messages
// ─────────────────────────────────────────────────────────────────────────────

export type ClientMessage =
  | { type: 'CREATE_ROOM'; playerName: string }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SELECT_CAPTAIN'; captainId: string }
  | { type: 'TOGGLE_READY' }
  | { type: 'START_GAME' }
  | { type: 'GAME_ACTION'; action: unknown; stateHash?: string }
  | { type: 'STATE_SNAPSHOT'; snapshot: unknown; stateHash: string }
  | { type: 'REQUEST_RESYNC' }
  | { type: 'GAME_OVER'; winnerId: number; winnerName: string; stats: unknown }
  | { type: 'CHAT'; message: string }
  | { type: 'PING' };

// ─────────────────────────────────────────────────────────────────────────────
// Server -> Client Messages
// ─────────────────────────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: 'CONNECTED'; playerId: string }
  | { type: 'ERROR'; message: string }
  | { type: 'ROOM_CREATED'; room: Room; playerId: string }
  | { type: 'ROOM_JOINED'; room: Room; playerId: string }
  | { type: 'ROOM_UPDATE'; room: Room }
  | { type: 'PLAYER_JOINED'; player: RoomPlayer }
  | { type: 'PLAYER_LEFT'; playerId: string; newHostId?: string }
  | { type: 'GAME_STARTED'; gameState: { players: Array<{ id: number; name: string; captainId: string; networkId: string }> } }
  | { type: 'GAME_STATE_UPDATE'; gameState: { action: unknown; fromPlayerIndex: number; fromPlayerId: string; stateHash?: string } }
  | { type: 'STATE_SNAPSHOT'; snapshot: unknown; stateHash: string }
  | { type: 'RESYNC_REQUESTED'; playerId: string }
  | { type: 'GAME_OVER'; winnerId: number; winnerName: string }
  | { type: 'CHAT_MESSAGE'; playerId: string; playerName: string; message: string }
  | { type: 'PONG' };
