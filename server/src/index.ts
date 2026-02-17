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
import type { Room, RoomPlayer, ClientMessage, ServerMessage } from './types.js';

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

function getClientByPlayerId(playerId: string): ConnectedClient | undefined {
  for (const client of clients.values()) {
    if (client.playerId === playerId) {
      return client;
    }
  }
  return undefined;
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
    stateHash: null,
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

  // If room is empty, delete it
  if (room.players.length === 0) {
    rooms.delete(room.id);
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

      // If we have a stored game state snapshot, send it for resync
      if (room.gameState) {
        send(ws, {
          type: 'STATE_SNAPSHOT',
          snapshot: room.gameState,
          stateHash: room.stateHash || '',
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
    send(ws, { type: 'ERROR', message: 'This game has already started.' });
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
  leaveRoom(room, client.playerId);
  client.roomId = null;

  if (rooms.has(room.id)) {
    // Room still exists, notify others
    broadcast(room, {
      type: 'PLAYER_LEFT',
      playerId: client.playerId,
      newHostId: room.hostId
    });
    broadcast(room, { type: 'ROOM_UPDATE', room });
  }

  console.log(`${player?.name || 'Unknown'} left room ${room.code}`);
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

  // Start the game - client will create the actual game state
  room.status = 'playing';
  touchRoom(room);

  // Send start message with player info for game initialization
  const playerInfo = room.players.map((p, idx) => ({
    id: idx,
    name: p.name,
    captainId: p.captainId!,
    networkId: p.id, // Map network ID to game player ID
  }));

  broadcast(room, {
    type: 'GAME_STARTED',
    gameState: { players: playerInfo }
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

function handleGameAction(ws: WebSocket, client: ConnectedClient, action: unknown, stateHash?: string): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room || room.status !== 'playing') return;

  touchRoom(room);

  // Find player index for this client
  const playerIndex = room.players.findIndex(p => p.id === client.playerId);
  if (playerIndex === -1) return;

  // Broadcast the action to all other players (they'll validate on their end)
  broadcast(room, {
    type: 'GAME_STATE_UPDATE',
    gameState: {
      action,
      fromPlayerIndex: playerIndex,
      fromPlayerId: client.playerId,
      stateHash,
    }
  }, client.playerId);
}

function handleStateSnapshot(ws: WebSocket, client: ConnectedClient, snapshot: unknown, stateHash: string): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room || room.status !== 'playing') return;

  touchRoom(room);

  // Only the host stores snapshots on the server (single source of truth)
  if (client.playerId === room.hostId) {
    room.gameState = snapshot;
    room.stateHash = stateHash;
  }

  // Broadcast snapshot to all other players for resync
  broadcast(room, {
    type: 'STATE_SNAPSHOT',
    snapshot,
    stateHash,
  }, client.playerId);
}

function handleRequestResync(ws: WebSocket, client: ConnectedClient): void {
  if (!client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room || room.status !== 'playing') return;

  touchRoom(room);

  // If we have a stored snapshot, send it directly
  if (room.gameState) {
    send(ws, {
      type: 'STATE_SNAPSHOT',
      snapshot: room.gameState,
      stateHash: room.stateHash || '',
    });
    console.log(`Sent stored snapshot to ${client.playerId} for resync`);
    return;
  }

  // Otherwise, ask the host to send a fresh snapshot
  const hostClient = getClientByPlayerId(room.hostId);
  if (hostClient) {
    send(hostClient.ws, {
      type: 'RESYNC_REQUESTED',
      playerId: client.playerId,
    });
    console.log(`Resync requested by ${client.playerId}, asking host ${room.hostId}`);
  }
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
        handleGameAction(ws, client, message.action, message.stateHash);
        break;
      case 'STATE_SNAPSHOT':
        handleStateSnapshot(ws, client, message.snapshot, message.stateHash);
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
      version: 3,
      features: ['captainSelection', 'stateSync', 'rejoin', 'analytics'],
      rooms: rooms.size,
      clients: clients.size,
      uptime: process.uptime(),
    }));
    return;
  }

  if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
      if (existsSync(GAMES_LOG)) {
        const lines = readFileSync(GAMES_LOG, 'utf-8').trim().split('\n').filter(Boolean);
        const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        const starts = events.filter((e: any) => e.event === 'game_start');
        const ends = events.filter((e: any) => e.event === 'game_end');
        const rejoins = events.filter((e: any) => e.event === 'player_rejoin');
        res.end(JSON.stringify({
          totalGamesStarted: starts.length,
          totalGamesFinished: ends.length,
          totalRejoins: rejoins.length,
          recentGames: ends.slice(-10).map((e: any) => ({
            winnerName: e.winnerName,
            players: e.players,
            duration: e.duration,
            timestamp: e.timestamp,
          })),
        }));
      } else {
        res.end(JSON.stringify({ totalGamesStarted: 0, totalGamesFinished: 0, totalRejoins: 0, recentGames: [] }));
      }
    } catch (e) {
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
