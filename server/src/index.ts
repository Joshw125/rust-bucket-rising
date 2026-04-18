// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - WebSocket Server
// Real-time multiplayer game server
// ═══════════════════════════════════════════════════════════════════════════════

import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Room, RoomPlayer, ClientMessage, ServerMessage, NetworkPlayerInfo } from '../../shared/types/multiplayer.js';
import type { GameAction, GameState } from '../../shared/types/index.js';
import { GameEngine } from '../../shared/engine/GameEngine.js';
import { getCaptainById } from '../../shared/data/captains.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);
const ROOM_CODE_LENGTH = 4;
const MAX_PLAYERS_PER_ROOM = 4;
const ROOM_CLEANUP_INTERVAL = 60000; // 1 minute
const ROOM_TIMEOUT = 14400000; // 4 hours (was 1 hour)

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Logger
// ─────────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const GAMES_LOG = join(DATA_DIR, 'games.jsonl');

// Ensure data directory exists
try {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data directory:', e);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Aggregation (/stats endpoint)
// ─────────────────────────────────────────────────────────────────────────────

interface RecentGame {
  winnerName: string;
  players: Array<{ name: string; captainId: string | null; isHost?: boolean }> | undefined;
  duration: number | undefined;
  timestamp: number | undefined;
}

interface CaptainStats {
  captainId: string;
  plays: number;
  wins: number;
  winRate: number; // 0-1
  avgFame: number | null;
  avgMissions: number | null;
}

interface AggregatedStats {
  totalGamesStarted: number;
  totalGamesFinished: number;
  totalAbandoned: number; // started but never ended
  totalRejoins: number;
  avgDurationMs: number | null;
  avgTurns: number | null;
  avgWinningFame: number | null;
  playerCountDistribution: Record<string, number>; // "2" -> N, "3" -> N, "4" -> N
  captainStats: CaptainStats[]; // sorted by plays desc
  recentGames: RecentGame[]; // most-recent first
  generatedAt: number;
}

function emptyStats(): AggregatedStats {
  return {
    totalGamesStarted: 0,
    totalGamesFinished: 0,
    totalAbandoned: 0,
    totalRejoins: 0,
    avgDurationMs: null,
    avgTurns: null,
    avgWinningFame: null,
    playerCountDistribution: {},
    captainStats: [],
    recentGames: [],
    generatedAt: Date.now(),
  };
}

function computeStats(events: Array<Record<string, unknown>>): AggregatedStats {
  const starts = events.filter(e => e.event === 'game_start');
  const ends = events.filter(e => e.event === 'game_end');
  const rejoins = events.filter(e => e.event === 'player_rejoin' || e.event === 'player_rejoin_as');

  // Average duration (game_end entries that have a duration)
  const durations = ends
    .map(e => e.duration)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgDurationMs = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : null;

  // Pull turn count and winner fame from end-game stats payload (optional)
  const turns: number[] = [];
  const winningFames: number[] = [];
  for (const end of ends) {
    const stats = end.stats as Record<string, unknown> | undefined;
    if (stats && typeof stats.turn === 'number') turns.push(stats.turn);
    if (stats && Array.isArray(stats.players)) {
      const playersArr = stats.players as Array<Record<string, unknown>>;
      const winnerId = typeof end.winnerId === 'number' ? end.winnerId : null;
      if (winnerId !== null) {
        const winner = playersArr.find(p => p.id === winnerId);
        if (winner && typeof winner.fame === 'number') winningFames.push(winner.fame);
      }
    }
  }
  const avgTurns = turns.length ? turns.reduce((a, b) => a + b, 0) / turns.length : null;
  const avgWinningFame = winningFames.length
    ? winningFames.reduce((a, b) => a + b, 0) / winningFames.length
    : null;

  // Player count distribution (from game_start events' playerCount)
  const playerCountDistribution: Record<string, number> = {};
  for (const start of starts) {
    const pc = start.playerCount;
    if (typeof pc === 'number') {
      const key = String(pc);
      playerCountDistribution[key] = (playerCountDistribution[key] ?? 0) + 1;
    }
  }

  // Captain stats: accumulate plays and wins from game_end events.
  // (game_start also has captainIds but game_end is more reliable because
  // we can correlate wins there.)
  const captainAgg = new Map<string, { plays: number; wins: number; fames: number[]; missions: number[] }>();
  for (const end of ends) {
    const stats = end.stats as Record<string, unknown> | undefined;
    const winnerId = typeof end.winnerId === 'number' ? end.winnerId : null;
    if (!stats || !Array.isArray(stats.players)) continue;
    for (const p of stats.players as Array<Record<string, unknown>>) {
      const captainId = typeof p.captainId === 'string' ? p.captainId : null;
      if (!captainId) continue;
      const entry = captainAgg.get(captainId) ?? { plays: 0, wins: 0, fames: [], missions: [] };
      entry.plays += 1;
      if (p.id === winnerId) entry.wins += 1;
      if (typeof p.fame === 'number') entry.fames.push(p.fame);
      if (typeof p.completedMissions === 'number') entry.missions.push(p.completedMissions);
      captainAgg.set(captainId, entry);
    }
  }
  const captainStats: CaptainStats[] = Array.from(captainAgg.entries())
    .map(([captainId, e]) => ({
      captainId,
      plays: e.plays,
      wins: e.wins,
      winRate: e.plays > 0 ? e.wins / e.plays : 0,
      avgFame: e.fames.length ? e.fames.reduce((a, b) => a + b, 0) / e.fames.length : null,
      avgMissions: e.missions.length
        ? e.missions.reduce((a, b) => a + b, 0) / e.missions.length
        : null,
    }))
    .sort((a, b) => b.plays - a.plays);

  // Recent games (most recent first, last 15)
  const recentGames: RecentGame[] = ends
    .slice(-15)
    .reverse()
    .map(e => ({
      winnerName: typeof e.winnerName === 'string' ? e.winnerName : 'Unknown',
      players: Array.isArray(e.players) ? (e.players as RecentGame['players']) : undefined,
      duration: typeof e.duration === 'number' ? e.duration : undefined,
      timestamp: typeof e.timestamp === 'number' ? e.timestamp : undefined,
    }));

  return {
    totalGamesStarted: starts.length,
    totalGamesFinished: ends.length,
    totalAbandoned: Math.max(0, starts.length - ends.length),
    totalRejoins: rejoins.length,
    avgDurationMs,
    avgTurns,
    avgWinningFame,
    playerCountDistribution,
    captainStats,
    recentGames,
    generatedAt: Date.now(),
  };
}

function logAnalytics(event: Record<string, unknown>): void {
  try {
    const entry = JSON.stringify({ ...event, timestamp: Date.now() }) + '\n';
    appendFileSync(GAMES_LOG, entry);
  } catch (e) {
    // Analytics should never crash the server
    console.warn('Analytics write failed:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  roomId: string | null;
}

const rooms = new Map<string, Room>();
const clients = new Map<WebSocket, ConnectedClient>();
const playerToRoom = new Map<string, string>();
// Server-authoritative game engines, one per active room.
// Created in handleStartGame, deleted when room is removed.
const roomEngines = new Map<string, GameEngine>();

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

// All selectable captain IDs (excluding Ghost)
const SELECTABLE_CAPTAIN_IDS = [
  'scrapper', 'veteran', 'tycoon', 'mercenary',
  'navigator', 'broker', 'engineer', 'infiltrator',
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Assign 2 random captain choices to a new player, avoiding captains already assigned to others
function assignCaptainChoices(room: Room): string[] {
  const usedChoices = new Set<string>();
  for (const p of room.players) {
    for (const c of p.captainChoices) {
      usedChoices.add(c);
    }
  }
  const available = SELECTABLE_CAPTAIN_IDS.filter(id => !usedChoices.has(id));
  const shuffled = shuffleArray(available);
  return shuffled.slice(0, 2);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure unique
  if ([...rooms.values()].some(r => r.code === code)) {
    return generateRoomCode();
  }
  return code;
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(room: Room, message: ServerMessage, excludePlayerId?: string): void {
  for (const [ws, client] of clients) {
    if (client.roomId === room.id && client.playerId !== excludePlayerId) {
      send(ws, message);
    }
  }
}

function getRoomByCode(code: string): Room | undefined {
  return [...rooms.values()].find(r => r.code.toUpperCase() === code.toUpperCase());
}

function touchRoom(room: Room): void {
  room.lastActivity = Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Management
// ─────────────────────────────────────────────────────────────────────────────

function createRoom(hostId: string, hostName: string): Room {
  const roomId = uuidv4();
  const now = Date.now();
  // Create room first with empty players so assignCaptainChoices works
  const room: Room = {
    id: roomId,
    code: generateRoomCode(),
    name: `${hostName}'s Game`,
    hostId,
    players: [],
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    status: 'lobby',
    gameState: null,
    lastActivity: now,
    createdAt: now,
  };
  // Assign captain choices for the host (no existing players to conflict with)
  const hostChoices = assignCaptainChoices(room);
  room.players.push({
    id: hostId,
    name: hostName,
    captainId: null,
    captainChoices: hostChoices,
    isReady: false,
    isHost: true,
    isConnected: true,
  });
  rooms.set(roomId, room);
  playerToRoom.set(hostId, roomId);
  return room;
}

function joinRoom(room: Room, playerId: string, playerName: string): RoomPlayer | null {
  if (room.status !== 'lobby') {
    return null;
  }
  if (room.players.length >= room.maxPlayers) {
    return null;
  }
  if (room.players.some(p => p.id === playerId)) {
    return null;
  }

  // Assign 2 random captain choices that don't overlap with other players
  const choices = assignCaptainChoices(room);

  const player: RoomPlayer = {
    id: playerId,
    name: playerName,
    captainId: null,
    captainChoices: choices,
    isReady: false,
    isHost: false,
    isConnected: true,
  };
  room.players.push(player);
  playerToRoom.set(playerId, room.id);
  return player;
}

function leaveRoom(room: Room, playerId: string): void {
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  room.players.splice(playerIndex, 1);
  playerToRoom.delete(playerId);

  // If room is empty, delete it (and its engine)
  if (room.players.length === 0) {
    rooms.delete(room.id);
    roomEngines.delete(room.id);
    return;
  }

  // If host left, assign new host
  if (room.hostId === playerId) {
    const newHost = room.players[0];
    room.hostId = newHost.id;
    newHost.isHost = true;
    room.name = `${newHost.name}'s Game`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleCreateRoom(ws: WebSocket, client: ConnectedClient, playerName: string): void {
  // Leave current room if in one
  if (client.roomId) {
    const oldRoom = rooms.get(client.roomId);
    if (oldRoom) {
      leaveRoom(oldRoom, client.playerId);
      broadcast(oldRoom, { type: 'PLAYER_LEFT', playerId: client.playerId });
    }
  }

  const room = createRoom(client.playerId, playerName);
  client.roomId = room.id;

  send(ws, { type: 'ROOM_CREATED', room, playerId: client.playerId });
  console.log(`Room created: ${room.code} by ${playerName}`);
}

function handleJoinRoom(ws: WebSocket, client: ConnectedClient, roomCode: string, playerName: string): void {
  const room = getRoomByCode(roomCode);

  if (!room) {
    send(ws, { type: 'ERROR', message: 'Room not found. Check the code and try again.' });
    return;
  }

  touchRoom(room);

  // Allow rejoin if the game is in progress and a disconnected player matches by name
  if (room.status === 'playing') {
    const disconnectedPlayer = room.players.find(
      p => !p.isConnected && p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (disconnectedPlayer) {
      // Rejoin: reassign the socket to the disconnected player
      disconnectedPlayer.isConnected = true;
      const oldPlayerId = client.playerId;
      client.playerId = disconnectedPlayer.id;
      client.roomId = room.id;
      playerToRoom.delete(oldPlayerId);
      playerToRoom.set(disconnectedPlayer.id, room.id);

      // Send full room state to the rejoining player
      send(ws, { type: 'ROOM_JOINED', room, playerId: disconnectedPlayer.id });

      // Send the current authoritative state on rejoin so the client can render.
      const engine = roomEngines.get(room.id);
      if (engine) {
        send(ws, {
          type: 'STATE_SNAPSHOT',
          snapshot: engine.getState(),
          stateHash: '',
        });
      } else if (room.gameState) {
        send(ws, {
          type: 'STATE_SNAPSHOT',
          snapshot: room.gameState,
          stateHash: '',
        });
      }

      // Notify others
      broadcast(room, { type: 'ROOM_UPDATE', room }, disconnectedPlayer.id);
      console.log(`Player "${playerName}" rejoined room ${roomCode}`);

      logAnalytics({
        event: 'player_rejoin',
        roomCode: room.code,
        playerName,
        playerId: disconnectedPlayer.id,
      });
      return;
    }

    // No name match — check if there are disconnected players to choose from
    const disconnectedPlayers = room.players.filter(p => !p.isConnected);
    if (disconnectedPlayers.length > 0) {
      send(ws, {
        type: 'REJOIN_OPTIONS',
        roomCode: room.code,
        disconnectedPlayers: disconnectedPlayers.map(p => ({
          name: p.name,
          captainId: p.captainId,
        })),
      });
      return;
    }

    send(ws, { type: 'ERROR', message: 'This game has already started and all players are connected.' });
    return;
  }

  if (room.status !== 'lobby') {
    send(ws, { type: 'ERROR', message: 'This game has already started.' });
    return;
  }

  if (room.players.length >= room.maxPlayers) {
    send(ws, { type: 'ERROR', message: 'Room is full.' });
    return;
  }

  // Leave current room if in one
  if (client.roomId) {
    const oldRoom = rooms.get(client.roomId);
    if (oldRoom) {
      leaveRoom(oldRoom, client.playerId);
      broadcast(oldRoom, { type: 'PLAYER_LEFT', playerId: client.playerId });
    }
  }

  const player = joinRoom(room, client.playerId, playerName);
  if (!player) {
    send(ws, { type: 'ERROR', message: 'Could not join room.' });
    return;
  }

  client.roomId = room.id;

  // Notify the joining player
  send(ws, { type: 'ROOM_JOINED', room, playerId: client.playerId });

  // Notify other players
  broadcast(room, { type: 'PLAYER_JOINED', player }, client.playerId);

  console.log(`${playerName} joined room ${room.code}`);
}

function handleLeaveRoom(ws: WebSocket, client: ConnectedClient): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) return;

  const player = room.players.find(p => p.id === client.playerId);

  if (room.status === 'playing') {
    // During a game, mark as disconnected but keep player in room
    // (same behavior as connection drop — allows rejoin by name)
    if (player) {
      player.isConnected = false;
      broadcast(room, { type: 'ROOM_UPDATE', room });
    }
    client.roomId = null;
  } else {
    // In lobby, fully remove player
    leaveRoom(room, client.playerId);
    client.roomId = null;

    if (rooms.has(room.id)) {
      broadcast(room, {
        type: 'PLAYER_LEFT',
        playerId: client.playerId,
        newHostId: room.hostId
      });
      broadcast(room, { type: 'ROOM_UPDATE', room });
    }
  }

  console.log(`${player?.name || 'Unknown'} left room ${room.code}`);
}

function handleRejoinAs(ws: WebSocket, client: ConnectedClient, roomCode: string, playerName: string, targetPlayerName: string): void {
  const room = getRoomByCode(roomCode);
  if (!room) {
    send(ws, { type: 'ERROR', message: 'Room not found.' });
    return;
  }

  if (room.status !== 'playing') {
    send(ws, { type: 'ERROR', message: 'Game is not in progress.' });
    return;
  }

  const targetPlayer = room.players.find(
    p => !p.isConnected && p.name.toLowerCase() === targetPlayerName.toLowerCase()
  );
  if (!targetPlayer) {
    send(ws, { type: 'ERROR', message: 'That player is no longer available to rejoin as.' });
    return;
  }

  // Rejoin as the target player
  targetPlayer.isConnected = true;
  const oldPlayerId = client.playerId;
  client.playerId = targetPlayer.id;
  client.roomId = room.id;
  playerToRoom.delete(oldPlayerId);
  playerToRoom.set(targetPlayer.id, room.id);

  send(ws, { type: 'ROOM_JOINED', room, playerId: targetPlayer.id });

  const engineForRejoin = roomEngines.get(room.id);
  if (engineForRejoin) {
    send(ws, {
      type: 'STATE_SNAPSHOT',
      snapshot: engineForRejoin.getState(),
      stateHash: '',
    });
  } else if (room.gameState) {
    send(ws, {
      type: 'STATE_SNAPSHOT',
      snapshot: room.gameState,
      stateHash: '',
    });
  }

  broadcast(room, { type: 'ROOM_UPDATE', room }, targetPlayer.id);
  console.log(`Player "${playerName}" rejoined room ${roomCode} as "${targetPlayerName}"`);

  logAnalytics({
    event: 'player_rejoin_as',
    roomCode: room.code,
    playerName,
    targetPlayerName,
    playerId: targetPlayer.id,
  });
}

function handleSelectCaptain(ws: WebSocket, client: ConnectedClient, captainId: string): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room || room.status !== 'lobby') return;

  const player = room.players.find(p => p.id === client.playerId);
  if (!player) return;

  // Validate the captain is one of this player's assigned choices
  if (!player.captainChoices.includes(captainId)) {
    send(ws, { type: 'ERROR', message: 'That captain is not one of your choices.' });
    return;
  }

  player.captainId = captainId;
  player.isReady = false; // Reset ready state when changing captain

  broadcast(room, { type: 'ROOM_UPDATE', room });
}

function handleToggleReady(ws: WebSocket, client: ConnectedClient): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room || room.status !== 'lobby') return;

  const player = room.players.find(p => p.id === client.playerId);
  if (!player || !player.captainId) {
    send(ws, { type: 'ERROR', message: 'Select a captain first.' });
    return;
  }

  player.isReady = !player.isReady;
  broadcast(room, { type: 'ROOM_UPDATE', room });
}

function handleStartGame(ws: WebSocket, client: ConnectedClient): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) return;

  // Only host can start
  if (room.hostId !== client.playerId) {
    send(ws, { type: 'ERROR', message: 'Only the host can start the game.' });
    return;
  }

  // Need at least 2 players
  if (room.players.length < 2) {
    send(ws, { type: 'ERROR', message: 'Need at least 2 players to start.' });
    return;
  }

  // All players must be ready with captains
  const allReady = room.players.every(p => p.isReady && p.captainId);
  if (!allReady) {
    send(ws, { type: 'ERROR', message: 'All players must select a captain and be ready.' });
    return;
  }

  // Build the player info for multiplayer routing (network id <-> game index).
  const playerInfo: NetworkPlayerInfo[] = room.players.map((p, idx) => ({
    id: idx,
    name: p.name,
    captainId: p.captainId!,
    networkId: p.id,
  }));

  // Server-authoritative: instantiate the GameEngine here. This is the ONE
  // and only engine for this room — clients will render whatever state we
  // broadcast. No more independent random shuffles per client.
  try {
    const enginePlayers = playerInfo.map((info) => {
      const captain = getCaptainById(info.captainId);
      if (!captain) {
        throw new Error(`Unknown captain id: ${info.captainId}`);
      }
      return { name: info.name, captain, isAI: false };
    });
    const engine = new GameEngine(enginePlayers);
    engine.enableStatsTracking();
    roomEngines.set(room.id, engine);
    room.gameState = engine.getState();
  } catch (err) {
    console.error(`Failed to create engine for room ${room.code}:`, err);
    send(ws, { type: 'ERROR', message: 'Failed to initialize game. Try again.' });
    return;
  }

  room.status = 'playing';
  touchRoom(room);

  broadcast(room, {
    type: 'GAME_STARTED',
    gameState: {
      players: playerInfo,
      initialState: room.gameState,
    },
  });

  console.log(`Game started in room ${room.code} with ${room.players.length} players`);

  logAnalytics({
    event: 'game_start',
    roomCode: room.code,
    players: room.players.map(p => ({
      name: p.name,
      captainId: p.captainId,
      isHost: p.isHost,
    })),
    playerCount: room.players.length,
  });
}

function handleGameAction(ws: WebSocket, client: ConnectedClient, action: unknown): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room || room.status !== 'playing') return;

  touchRoom(room);

  const playerIndex = room.players.findIndex(p => p.id === client.playerId);
  if (playerIndex === -1) return;

  const engine = roomEngines.get(room.id);
  if (!engine) {
    console.warn(`No engine for room ${room.code} — dropping action`);
    send(ws, { type: 'ERROR', message: 'Game engine not found. Try rejoining.' });
    return;
  }

  // Server-authoritative dispatch. If the engine rejects (invalid move,
  // wrong turn, etc.), send an error back to JUST the originating client
  // and don't broadcast — everyone else's state is already correct.
  let result: boolean;
  try {
    result = engine.dispatch(action as GameAction);
  } catch (err) {
    console.error(`Engine threw on action from ${client.playerId}:`, err);
    send(ws, { type: 'ERROR', message: 'That action caused an error. State restored.' });
    // Even on throw, broadcast current state so all clients are in sync.
    broadcast(room, {
      type: 'GAME_STATE_UPDATE',
      state: engine.getState(),
      action,
      fromPlayerIndex: playerIndex,
    });
    return;
  }

  if (!result) {
    // Invalid action — tell just the sender. No need to broadcast; no one
    // else's state changed.
    send(ws, { type: 'ERROR', message: 'Action was rejected by the server (invalid move).' });
    return;
  }

  const newState = engine.getState();
  room.gameState = newState;

  // Broadcast the new authoritative state to EVERYONE including the sender.
  // Clients overwrite their local state with this — no local dispatch happens.
  broadcast(room, {
    type: 'GAME_STATE_UPDATE',
    state: newState,
    action,
    fromPlayerIndex: playerIndex,
  });
}

function handleRequestResync(ws: WebSocket, client: ConnectedClient): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room || room.status !== 'playing') return;

  touchRoom(room);

  // Server owns the authoritative state. Serve it from the engine directly.
  const engine = roomEngines.get(room.id);
  if (engine) {
    send(ws, {
      type: 'STATE_SNAPSHOT',
      snapshot: engine.getState(),
      stateHash: '',
    });
    console.log(`Sent authoritative snapshot to ${client.playerId} for resync`);
    return;
  }

  // Engine is gone (room in a weird state) — tell the client, they can decide.
  send(ws, { type: 'ERROR', message: 'Game state unavailable; try rejoining.' });
}

function handleGameOver(ws: WebSocket, client: ConnectedClient, winnerId: number, winnerName: string, stats: unknown): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room || room.status !== 'playing') return;

  // Only process game over from host to avoid duplicates
  if (client.playerId !== room.hostId) return;

  room.status = 'finished';
  touchRoom(room);

  // Broadcast game over to all players
  broadcast(room, {
    type: 'GAME_OVER',
    winnerId,
    winnerName,
  });

  console.log(`Game over in room ${room.code}. Winner: ${winnerName}`);

  logAnalytics({
    event: 'game_end',
    roomCode: room.code,
    winnerId,
    winnerName,
    stats,
    players: room.players.map(p => ({
      name: p.name,
      captainId: p.captainId,
      isHost: p.isHost,
    })),
    duration: Date.now() - room.createdAt,
  });
}

function handleChat(ws: WebSocket, client: ConnectedClient, message: string): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) return;

  touchRoom(room);

  const player = room.players.find(p => p.id === client.playerId);
  if (!player) return;

  broadcast(room, {
    type: 'CHAT_MESSAGE',
    playerId: client.playerId,
    playerName: player.name,
    message: message.slice(0, 500), // Limit message length
  });
}

function handleMessage(ws: WebSocket, client: ConnectedClient, data: string): void {
  try {
    const message = JSON.parse(data) as ClientMessage;

    switch (message.type) {
      case 'CREATE_ROOM':
        handleCreateRoom(ws, client, message.playerName);
        break;
      case 'JOIN_ROOM':
        handleJoinRoom(ws, client, message.roomCode, message.playerName);
        break;
      case 'LEAVE_ROOM':
        handleLeaveRoom(ws, client);
        break;
      case 'SELECT_CAPTAIN':
        handleSelectCaptain(ws, client, message.captainId);
        break;
      case 'TOGGLE_READY':
        handleToggleReady(ws, client);
        break;
      case 'START_GAME':
        handleStartGame(ws, client);
        break;
      case 'GAME_ACTION':
        handleGameAction(ws, client, message.action);
        break;
      case 'REQUEST_RESYNC':
        handleRequestResync(ws, client);
        break;
      case 'GAME_OVER':
        handleGameOver(ws, client, message.winnerId, message.winnerName, message.stats);
        break;
      case 'CHAT':
        handleChat(ws, client, message.message);
        break;
      case 'REJOIN_AS':
        handleRejoinAs(ws, client, message.roomCode, message.playerName, message.targetPlayerName);
        break;
      case 'PING':
        send(ws, { type: 'PONG' });
        break;
    }
  } catch (err) {
    console.error('Failed to parse message:', err);
    send(ws, { type: 'ERROR', message: 'Invalid message format.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP + WebSocket Server (HTTP needed for cloud hosting health checks)
// ─────────────────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  // CORS headers for health checks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: 4,
      architecture: 'server-authoritative',
      features: ['captainSelection', 'stateSync', 'rejoin', 'analytics', 'serverEngine'],
      activeEngines: roomEngines.size,
      rooms: rooms.size,
      clients: clients.size,
      uptime: process.uptime(),
    }));
    return;
  }

  if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
      if (!existsSync(GAMES_LOG)) {
        res.end(JSON.stringify(emptyStats()));
        return;
      }
      const lines = readFileSync(GAMES_LOG, 'utf-8').trim().split('\n').filter(Boolean);
      const events = lines
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean) as Array<Record<string, unknown>>;
      res.end(JSON.stringify(computeStats(events)));
    } catch (e) {
      console.error('Stats endpoint error:', e);
      res.end(JSON.stringify({ error: 'Failed to read stats' }));
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Rust Bucket Rising WebSocket Server');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const playerId = uuidv4();
  const client: ConnectedClient = {
    ws,
    playerId,
    roomId: null,
  };
  clients.set(ws, client);

  console.log(`Client connected: ${playerId}`);
  send(ws, { type: 'CONNECTED', playerId });

  ws.on('message', (data) => {
    handleMessage(ws, client, data.toString());
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${playerId}`);

    // Handle disconnection from room
    if (client.roomId) {
      const room = rooms.get(client.roomId);
      if (room) {
        touchRoom(room);
        if (room.status === 'lobby') {
          // In lobby, fully remove player
          leaveRoom(room, client.playerId);
          if (rooms.has(room.id)) {
            broadcast(room, {
              type: 'PLAYER_LEFT',
              playerId: client.playerId,
              newHostId: room.hostId
            });
            broadcast(room, { type: 'ROOM_UPDATE', room });
          }
        } else {
          // In game, mark as disconnected but don't remove
          const player = room.players.find(p => p.id === client.playerId);
          if (player) {
            player.isConnected = false;
            broadcast(room, { type: 'ROOM_UPDATE', room });
          }
        }
      }
    }

    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${playerId}:`, err);
  });
});

// Cleanup old rooms periodically (use lastActivity instead of createdAt)
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.lastActivity > ROOM_TIMEOUT) {
      // Notify players
      broadcast(room, { type: 'ERROR', message: 'Room closed due to inactivity.' });
      rooms.delete(id);
      roomEngines.delete(id);
      console.log(`Room ${room.code} cleaned up due to inactivity (${Math.round((now - room.lastActivity) / 60000)}min idle)`);
    }
  }
}, ROOM_CLEANUP_INTERVAL);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    RUST BUCKET RISING                         ║
║                   Multiplayer Server v3                       ║
╠═══════════════════════════════════════════════════════════════╣
║  WebSocket server running on port ${PORT}                       ║
║  Health check: http://0.0.0.0:${PORT}/health                    ║
║  Stats: http://0.0.0.0:${PORT}/stats                            ║
║  Features: state sync, rejoin, analytics                     ║
║  Waiting for connections...                                   ║
╚═══════════════════════════════════════════════════════════════╝
`);
});
