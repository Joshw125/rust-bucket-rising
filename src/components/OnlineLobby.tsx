// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Online Lobby
// Create/join multiplayer games
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

// ─────────────────────────────────────────────────────────────────────────────
// Captain Selector
// ─────────────────────────────────────────────────────────────────────────────

function CaptainSelector({
  selectedId,
  usedIds,
  onSelect,
}: {
  selectedId: string | null;
  usedIds: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CAPTAINS.map((captain) => {
        const isUsed = usedIds.includes(captain.id) && captain.id !== selectedId;
        const isSelected = captain.id === selectedId;

        return (
          <button
            key={captain.id}
            onClick={() => !isUsed && onSelect(captain.id)}
            disabled={isUsed}
            className={clsx(
              'p-2 rounded-lg border-2 transition-all text-left',
              isSelected && 'border-amber-500 bg-amber-500/20',
              !isSelected && !isUsed && 'border-slate-600 hover:border-slate-500 bg-slate-800',
              isUsed && 'border-slate-700 bg-slate-900 opacity-50 cursor-not-allowed'
            )}
          >
            <div className="font-bold text-sm text-amber-400">{captain.name}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{captain.effect}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Card
// ─────────────────────────────────────────────────────────────────────────────

function PlayerCard({ player, isMe }: { player: { id: string; name: string; captainId: string | null; isReady: boolean; isHost: boolean; isConnected: boolean }; isMe: boolean }) {
  const captain = CAPTAINS.find(c => c.id === player.captainId);

  return (
    <div className={clsx(
      'p-3 rounded-lg border',
      isMe ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 bg-slate-800',
      !player.isConnected && 'opacity-50'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{player.name}</span>
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
          <span className="text-slate-500"> - </span>
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
    <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-48">
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
      <div className="p-2 border-t border-slate-700 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-sm font-semibold"
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

  // Set up game start callback - pass playerId so App can determine local player index
  useEffect(() => {
    setGameCallbacks(
      (players) => {
        if (playerId) {
          onGameStart(players, playerId);
        }
      },
      () => {} // Action handler set up in App.tsx
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

  const usedCaptainIds = room?.players
    .filter(p => p.captainId && p.id !== playerId)
    .map(p => p.captainId!) || [];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">Online Play</h1>
            <p className="text-slate-400">
              {status === 'connected' && 'Connected to server'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'disconnected' && 'Disconnected'}
              {status === 'error' && 'Connection error'}
            </p>
          </div>
          <button
            onClick={() => room ? handleLeaveRoom() : onBack()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            ← {room ? 'Leave Room' : 'Back to Menu'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg flex items-center justify-between">
            <span className="text-red-300">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Main Content */}
        {screen === 'menu' && !room && (
          <div className="grid grid-cols-2 gap-6">
            {/* Create Room */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Create Room</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim() || status !== 'connected'}
                  className={clsx(
                    'w-full py-3 rounded-lg font-bold transition-all',
                    playerName.trim() && status === 'connected'
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  Create Room
                </button>
              </div>
            </div>

            {/* Join Room */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Join Room</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Room Code</label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="XXXX"
                    maxLength={4}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-center text-2xl tracking-widest font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || roomCode.length !== 4 || status !== 'connected'}
                  className={clsx(
                    'w-full py-3 rounded-lg font-bold transition-all',
                    playerName.trim() && roomCode.length === 4 && status === 'connected'
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lobby */}
        {room && screen === 'lobby' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Room Info & Players */}
            <div className="col-span-2 space-y-4">
              {/* Room Code */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-400">Room Code</div>
                    <div className="text-4xl font-mono font-bold text-cyan-400 tracking-widest">
                      {room.code}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Players</div>
                    <div className="text-2xl font-bold text-white">
                      {room.players.length} / {room.maxPlayers}
                    </div>
                  </div>
                </div>
                <p className="text-slate-500 text-sm mt-2">
                  Share this code with your friends to join!
                </p>
              </div>

              {/* Players */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="font-bold text-white mb-3">Players</h3>
                <div className="space-y-2">
                  {room.players.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      isMe={player.id === playerId}
                    />
                  ))}
                </div>
              </div>

              {/* Start Button (Host only) */}
              {isHost && (
                <button
                  onClick={startGame}
                  disabled={!canStart}
                  className={clsx(
                    'w-full py-4 rounded-xl font-bold text-xl transition-all',
                    canStart
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  {canStart ? 'Start Game' : 'Waiting for all players to ready up...'}
                </button>
              )}

              {!isHost && (
                <div className="text-center text-slate-400 py-4">
                  Waiting for the host to start the game...
                </div>
              )}
            </div>

            {/* Right: Captain Selection & Chat */}
            <div className="space-y-4">
              {/* Captain Selection */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="font-bold text-white mb-3">Select Your Captain</h3>
                <CaptainSelector
                  selectedId={myPlayer?.captainId || null}
                  usedIds={usedCaptainIds}
                  onSelect={selectCaptain}
                />

                {/* Ready Button */}
                <button
                  onClick={toggleReady}
                  disabled={!myPlayer?.captainId}
                  className={clsx(
                    'w-full mt-4 py-2 rounded-lg font-bold transition-all',
                    myPlayer?.isReady
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : myPlayer?.captainId
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  {myPlayer?.isReady ? 'Cancel Ready' : 'Ready Up!'}
                </button>
              </div>

              {/* Chat */}
              <ChatBox />
            </div>
          </div>
        )}

        {/* Connection Status */}
        {status === 'connecting' && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Connecting to server...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnlineLobby;
