// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Online Lobby
// Create/join multiplayer games with card-art captain selection
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  useMultiplayer,
  useMultiplayerRoom,
  useMultiplayerStatus,
  useMultiplayerError,
  useMultiplayerChat,
  useIsHost,
  useMyPlayer,
  useCanStartGame,
} from '@/hooks';
import { CAPTAINS } from '@/data';
import type { Captain } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Captain Card Choice Component (matches GameSetup style)
// ─────────────────────────────────────────────────────────────────────────────

function CaptainCardChoice({
  captain,
  isSelected,
  onSelect,
}: {
  captain: Captain;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={clsx(
        'relative rounded-xl overflow-hidden transition-all duration-200 group',
        isSelected
          ? 'ring-3 ring-amber-400 shadow-lg shadow-amber-500/30 scale-105'
          : 'ring-2 ring-slate-600 hover:ring-amber-500/50 hover:scale-[1.02]',
      )}
      onClick={onSelect}
    >
      <img
        src={`/cards/captain/${captain.image}`}
        alt={captain.name}
        className="w-full h-auto block"
        draggable={false}
      />
      {isSelected && (
        <div className="absolute inset-0 bg-amber-400/10 flex items-start justify-end p-2">
          <div className="bg-amber-500 text-slate-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shadow-lg">
            ✓
          </div>
        </div>
      )}
      {!isSelected && (
        <div className="absolute inset-0 bg-amber-400/0 group-hover:bg-amber-400/5 transition-colors" />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Captain Selector (2-card choice from server-assigned options)
// ─────────────────────────────────────────────────────────────────────────────

function CaptainSelector({
  selectedId,
  captainChoices,
  onSelect,
}: {
  selectedId: string | null;
  captainChoices: string[];
  onSelect: (id: string) => void;
}) {
  const captains = captainChoices
    .map(id => CAPTAINS.find(c => c.id === id))
    .filter((c): c is Captain => !!c);

  if (captains.length === 0) {
    return <div className="text-slate-500 text-sm text-center py-4">Waiting for captain choices...</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {captains.map((captain) => (
        <CaptainCardChoice
          key={captain.id}
          captain={captain}
          isSelected={selectedId === captain.id}
          onSelect={() => onSelect(captain.id)}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Card
// ─────────────────────────────────────────────────────────────────────────────

const PLAYER_LOBBY_COLORS = [
  { border: 'border-purple-500/40', bg: 'bg-purple-900/20', label: 'text-purple-400' },
  { border: 'border-orange-500/40', bg: 'bg-orange-900/20', label: 'text-orange-400' },
  { border: 'border-cyan-500/40', bg: 'bg-cyan-900/20', label: 'text-cyan-400' },
  { border: 'border-pink-500/40', bg: 'bg-pink-900/20', label: 'text-pink-400' },
];

function PlayerCard({ player, index, isMe }: {
  player: { id: string; name: string; captainId: string | null; isReady: boolean; isHost: boolean; isConnected: boolean };
  index: number;
  isMe: boolean;
}) {
  const captain = CAPTAINS.find(c => c.id === player.captainId);
  const pColor = PLAYER_LOBBY_COLORS[index % PLAYER_LOBBY_COLORS.length];

  return (
    <div className={clsx(
      'p-3 rounded-lg border',
      pColor.border, pColor.bg,
      !player.isConnected && 'opacity-50'
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={clsx('font-bold', pColor.label)}>{player.name}</span>
          {player.isHost && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">HOST</span>
          )}
          {isMe && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">YOU</span>
          )}
        </div>
        <div className={clsx(
          'text-xs px-2 py-0.5 rounded',
          player.isReady && player.captainId ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
        )}>
          {player.isReady && player.captainId ? '✓ Ready' : 'Not Ready'}
        </div>
      </div>

      {captain ? (
        <div className="text-sm">
          <span className="text-amber-400">{captain.name}</span>
          <span className="text-slate-500"> — </span>
          <span className="text-slate-400 text-xs">{captain.effect}</span>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">Selecting captain...</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Box
// ─────────────────────────────────────────────────────────────────────────────

function ChatBox() {
  const [message, setMessage] = useState('');
  const messages = useMultiplayerChat();
  const sendChat = useMultiplayer((s) => s.sendChat);
  const myId = useMultiplayer((s) => s.playerId);

  const handleSend = () => {
    if (message.trim()) {
      sendChat(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-lg border border-slate-700/50 flex flex-col h-48">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.length === 0 ? (
          <div className="text-slate-500 text-xs text-center py-4">No messages yet</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-xs">
              <span className={clsx(
                'font-semibold',
                msg.playerId === myId ? 'text-cyan-400' : 'text-amber-400'
              )}>
                {msg.playerName}:
              </span>
              <span className="text-slate-300 ml-1">{msg.message}</span>
            </div>
          ))
        )}
      </div>
      <div className="p-2 border-t border-slate-700/50 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-2 py-1 bg-slate-950/60 border border-slate-700 rounded text-white text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-white text-sm font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Lobby Component
// ─────────────────────────────────────────────────────────────────────────────

export interface OnlineLobbyProps {
  onBack: () => void;
  onGameStart: (players: Array<{ id: number; name: string; captainId: string; networkId: string }>, myNetworkId: string) => void;
}

export function OnlineLobby({ onBack, onGameStart }: OnlineLobbyProps) {
  const [screen, setScreen] = useState<'menu' | 'create' | 'join' | 'lobby'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const status = useMultiplayerStatus();
  const room = useMultiplayerRoom();
  const error = useMultiplayerError();
  const isHost = useIsHost();
  const myPlayer = useMyPlayer();
  const canStart = useCanStartGame();
  const playerId = useMultiplayer((s) => s.playerId);

  const connect = useMultiplayer((s) => s.connect);
  const createRoom = useMultiplayer((s) => s.createRoom);
  const joinRoom = useMultiplayer((s) => s.joinRoom);
  const leaveRoom = useMultiplayer((s) => s.leaveRoom);
  const selectCaptain = useMultiplayer((s) => s.selectCaptain);
  const toggleReady = useMultiplayer((s) => s.toggleReady);
  const startGame = useMultiplayer((s) => s.startGame);
  const clearError = useMultiplayer((s) => s.clearError);
  const setGameCallbacks = useMultiplayer((s) => s.setGameCallbacks);

  // Connect on mount
  useEffect(() => {
    if (status === 'disconnected') {
      connect();
    }
  }, [status, connect]);

  // Set up game start callback
  useEffect(() => {
    setGameCallbacks(
      (players) => {
        if (playerId) {
          onGameStart(players, playerId);
        }
      },
      () => {}, // Action handler set up in App.tsx
      () => {}, // Snapshot handler set up in App.tsx
      () => {}, // Resync handler set up in App.tsx
    );
  }, [setGameCallbacks, onGameStart, playerId]);

  // Auto-switch to lobby when room is joined
  useEffect(() => {
    if (room) {
      setScreen('lobby');
    }
  }, [room]);

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      createRoom(playerName.trim());
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && roomCode.trim()) {
      joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setScreen('menu');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen relative text-white flex items-center justify-center p-6">
      {/* Dark overlay matching the main menu / game setup theme */}
      <div className="fixed inset-0 bg-black/60 pointer-events-none" />

      <div className="max-w-3xl w-full relative z-10">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black tracking-tight mb-1">
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rust bg-clip-text text-transparent">
              RUST BUCKET RISING
            </span>
          </h1>
          <p className="text-amber-200/40 text-sm">
            {room ? `Room ${room.code} — ${room.players.length}/${room.maxPlayers} Players` : 'Online Play'}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {status === 'connected' && '🟢 Connected'}
            {status === 'connecting' && '🟡 Connecting...'}
            {status === 'disconnected' && '🔴 Disconnected'}
            {status === 'error' && '🔴 Connection error'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between">
            <span className="text-red-300 text-sm">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Back button */}
        <div className="mb-4">
          <button
            onClick={() => room ? handleLeaveRoom() : onBack()}
            className="px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg transition-colors text-slate-400 hover:text-white text-sm"
          >
            ← {room ? 'Leave Room' : 'Back to Menu'}
          </button>
        </div>

        {/* ─── Menu Screen: Create or Join ─── */}
        {screen === 'menu' && !room && (
          <div className="bg-slate-950/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-2xl shadow-black/40">
            <div className="grid grid-cols-2 gap-6">
              {/* Create Room */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-amber-400">Create Room</h2>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim() || status !== 'connected'}
                  className={clsx(
                    'w-full py-3 rounded-lg font-bold transition-all',
                    playerName.trim() && status === 'connected'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-900'
                      : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                  )}
                >
                  Create Room
                </button>
              </div>

              {/* Join Room */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-amber-400">Join Room</h2>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Room Code</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="XXXX"
                    maxLength={4}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-white text-center text-2xl tracking-widest font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || roomCode.length !== 4 || status !== 'connected'}
                  className={clsx(
                    'w-full py-3 rounded-lg font-bold transition-all',
                    playerName.trim() && roomCode.length === 4 && status === 'connected'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white'
                      : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                  )}
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Lobby Screen ─── */}
        {room && screen === 'lobby' && (
          <div className="bg-slate-950/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-2xl shadow-black/40">
            {/* Room Code Banner */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-700/50">
              <div>
                <div className="text-xs text-slate-500">Room Code</div>
                <div className="text-3xl font-mono font-bold text-amber-400 tracking-widest">
                  {room.code}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Players</div>
                <div className="text-2xl font-bold text-white">
                  {room.players.length} / {room.maxPlayers}
                </div>
              </div>
            </div>

            {/* Players list */}
            <div className="space-y-3 mb-5">
              {room.players.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  index={index}
                  isMe={player.id === playerId}
                />
              ))}
            </div>

            {/* My Captain Selection — 2 big card images */}
            {myPlayer && (
              <div className="mb-5 p-4 rounded-xl border border-amber-900/30 bg-amber-900/10">
                <label className="block text-xs text-amber-400/60 mb-2 font-semibold uppercase tracking-wider">Choose Your Captain</label>
                <CaptainSelector
                  selectedId={myPlayer.captainId}
                  captainChoices={myPlayer.captainChoices || []}
                  onSelect={selectCaptain}
                />

                {/* Ready Button */}
                <button
                  onClick={toggleReady}
                  disabled={!myPlayer.captainId}
                  className={clsx(
                    'w-full mt-4 py-3 rounded-lg font-bold transition-all',
                    myPlayer.isReady
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : myPlayer.captainId
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-slate-800/50 text-slate-500 cursor-not-allowed',
                  )}
                >
                  {myPlayer.isReady ? '✓ Ready — Click to Cancel' : myPlayer.captainId ? 'Ready Up!' : 'Select a Captain First'}
                </button>
              </div>
            )}

            {/* Start Button (Host only) */}
            {isHost && (
              <button
                onClick={startGame}
                disabled={!canStart}
                className={clsx(
                  'w-full py-4 rounded-xl font-bold text-lg transition-all mb-4',
                  canStart
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:via-amber-400 hover:to-orange-400 text-slate-900 shadow-lg shadow-orange-500/30 border border-amber-400/30'
                    : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed',
                )}
              >
                {canStart ? 'Start Game' : 'Waiting for all players to ready up...'}
              </button>
            )}

            {!isHost && (
              <div className="text-center text-slate-500 text-sm mb-4">
                Waiting for the host to start the game...
              </div>
            )}

            {/* Chat */}
            <ChatBox />
          </div>
        )}

        {/* Connection Status */}
        {status === 'connecting' && !room && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Connecting to server...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnlineLobby;
