// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Main Application
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameSetup } from './components/GameSetup';
import { GameBoard } from './components/GameBoard';
import { SimulationMode } from './components/SimulationMode';
import { OnlineLobby } from './components/OnlineLobby';
import { useGameStore, useMultiplayer } from './hooks';
import { CAPTAINS } from './data';
import type { Captain, AIStrategy, GameAction, GameState } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Main Menu Screen
// ─────────────────────────────────────────────────────────────────────────────

function MainMenu({
  onNewGame,
  onOnlinePlay,
  onSimulation
}: {
  onNewGame: () => void;
  onOnlinePlay: () => void;
  onSimulation: () => void;
}) {
  return (
    <div className="min-h-screen relative text-white flex items-center justify-center p-6">
      {/* Dark overlay for readability over the body background */}
      <div className="fixed inset-0 bg-black/60 pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-6xl font-black tracking-tight mb-2">
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rust bg-clip-text text-transparent">
              RUST BUCKET
            </span>
          </h1>
          <h2 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              RISING
            </span>
          </h2>
          <p className="text-amber-200/60 mt-4 text-lg">A Competitive Spacefaring Deck-Builder</p>
          <p className="text-amber-300/30 mt-2 text-sm">Digital Playtest Edition</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onNewGame}
            className="w-full py-4 rounded-xl font-bold text-xl transition-all hover:scale-[1.02] text-slate-900
                       bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500
                       hover:from-orange-400 hover:via-amber-400 hover:to-orange-400
                       shadow-lg shadow-orange-500/30 border border-amber-400/30"
          >
            Local Game
          </button>
          <button
            onClick={onOnlinePlay}
            className="w-full py-4 rounded-xl font-bold text-xl transition-all hover:scale-[1.02] text-white
                       bg-gradient-to-r from-amber-700 via-copper to-amber-700
                       hover:from-amber-600 hover:via-amber-500 hover:to-amber-600
                       shadow-lg shadow-amber-700/30 border border-amber-500/30"
          >
            Online Play
          </button>
          <button
            onClick={onSimulation}
            className="w-full py-4 rounded-xl font-bold text-xl transition-all hover:scale-[1.02] text-white
                       bg-gradient-to-r from-rust via-orange-800 to-rust
                       hover:from-orange-700 hover:via-orange-600 hover:to-orange-700
                       shadow-lg shadow-rust/30 border border-rust/40"
          >
            Simulation Mode
          </button>
          <button
            className="w-full py-4 rounded-xl font-bold text-xl transition-all
                       bg-slate-800/70 text-slate-500 border border-slate-700/50 cursor-not-allowed"
            disabled
          >
            How to Play (Coming Soon)
          </button>
        </div>

        {/* Features panel */}
        <div className="mt-10 text-left game-panel p-6">
          <h3 className="font-bold text-lg text-amber-400 mb-3">Game Features</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-bold text-amber-300 mb-1">Implemented</div>
              <ul className="text-slate-400 text-xs space-y-1">
                <li>Full game engine with all rules</li>
                <li>9 unique captains</li>
                <li>38 action cards + 11 hazards</li>
                <li>30 missions across 3 zones</li>
                <li>Hot-seat multiplayer (2-4 players)</li>
                <li className="text-amber-400">AI opponents</li>
                <li className="text-amber-400">Online multiplayer</li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-amber-500/70 mb-1">Coming Soon</div>
              <ul className="text-slate-400 text-xs space-y-1">
                <li>Sound effects</li>
                <li>Desktop app (Steam)</li>
                <li>Mobile support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────────────────────

type Screen = 'menu' | 'setup' | 'game' | 'simulation' | 'online';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [isOnlineGame, setIsOnlineGame] = useState(false);
  const [localPlayerIndex, setLocalPlayerIndex] = useState<number | null>(null);
  const initGame = useGameStore((s) => s.initGame);
  const applyRemoteAction = useGameStore((s) => s.applyRemoteAction);
  const loadSnapshot = useGameStore((s) => s.loadSnapshot);
  const computeStateHash = useGameStore((s) => s.computeStateHash);
  const gameState = useGameStore((s) => s.gameState);
  const setGameCallbacks = useMultiplayer((s) => s.setGameCallbacks);
  const sendStateSnapshot = useMultiplayer((s) => s.sendStateSnapshot);
  const requestResync = useMultiplayer((s) => s.requestResync);
  const playerId = useMultiplayer((s) => s.playerId);
  const room = useMultiplayer((s) => s.room);

  // Track whether we're the host for snapshot duties
  const isHost = room?.hostId === playerId;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  // Track desync count to avoid spamming resync requests
  const desyncCountRef = useRef(0);
  const lastResyncRef = useRef(0);

  const handleStartGame = (players: Array<{ name: string; captain: Captain; isAI?: boolean; aiStrategy?: AIStrategy }>) => {
    setIsOnlineGame(false);
    initGame(players);
    setScreen('game');
  };

  const handleOnlineGameStart = (players: Array<{ id: number; name: string; captainId: string; networkId: string }>, myNetworkId: string) => {
    // Find which player index we are
    const myIndex = players.findIndex(p => p.networkId === myNetworkId);
    setLocalPlayerIndex(myIndex);

    // Convert network player info to game player format
    const gamePlayers = players.map(p => ({
      name: p.name,
      captain: CAPTAINS.find(c => c.id === p.captainId)!,
      isAI: false,
    }));

    setIsOnlineGame(true);
    initGame(gamePlayers);
    setScreen('game');

    // Set up multiplayer callbacks immediately (can't wait for useEffect render cycle)
    // so the initial state snapshot from the host is handled correctly
    setGameCallbacks(
      () => {}, // onGameStart already handled
      handleRemoteGameAction,
      handleStateSnapshot,
      handleResyncRequested,
    );

    // Each client creates its own GameEngine with independent random shuffles,
    // so states will differ. The host is the source of truth:
    // - Host sends its initial state snapshot to the server and all clients
    // - Non-host clients will receive the snapshot and load it via handleStateSnapshot
    if (isHostRef.current) {
      setTimeout(() => {
        const state = useGameStore.getState().gameState;
        const hash = useGameStore.getState().computeStateHash();
        if (state) {
          useMultiplayer.getState().sendStateSnapshot(state, hash);
        }
      }, 300);
    }
  };

  // Handle game actions received from other players
  const handleRemoteGameAction = useCallback((action: GameAction, fromPlayerIndex: number, remoteStateHash?: string) => {
    // Only apply actions from other players (we already applied our own locally)
    if (fromPlayerIndex !== localPlayerIndex) {
      applyRemoteAction(action);

      // After applying, check state hash if provided
      if (remoteStateHash) {
        const localHash = computeStateHash();
        if (localHash && localHash !== remoteStateHash) {
          desyncCountRef.current++;
          console.warn(`State desync detected! Local: ${localHash}, Remote: ${remoteStateHash} (count: ${desyncCountRef.current})`);

          // Request resync after 2 consecutive desyncs, but not more than once per 10s
          if (desyncCountRef.current >= 2 && Date.now() - lastResyncRef.current > 10000) {
            console.log('Requesting resync from host...');
            requestResync();
            lastResyncRef.current = Date.now();
            desyncCountRef.current = 0;
          }
        } else {
          // Hashes match, reset counter
          desyncCountRef.current = 0;
        }
      }
    }
  }, [localPlayerIndex, applyRemoteAction, computeStateHash, requestResync]);

  // Handle receiving a state snapshot (for resync or rejoin)
  const handleStateSnapshot = useCallback((snapshot: unknown, _stateHash: string) => {
    console.log('Received state snapshot, loading...');
    loadSnapshot(snapshot as GameState);
    desyncCountRef.current = 0;
  }, [loadSnapshot]);

  // Handle resync request (host sends their current state)
  const handleResyncRequested = useCallback(() => {
    if (!isHostRef.current) return;
    const currentState = useGameStore.getState().gameState;
    const hash = useGameStore.getState().computeStateHash();
    if (currentState) {
      console.log('Resync requested, sending snapshot...');
      sendStateSnapshot(currentState, hash);
    }
  }, [sendStateSnapshot]);

  // Set up the game callbacks for multiplayer
  useEffect(() => {
    if (isOnlineGame) {
      setGameCallbacks(
        () => {}, // onGameStart already handled by OnlineLobby
        handleRemoteGameAction,
        handleStateSnapshot,
        handleResyncRequested,
      );
    }
  }, [isOnlineGame, handleRemoteGameAction, handleStateSnapshot, handleResyncRequested, setGameCallbacks]);

  // Host: send state snapshot + hash with every action (for sync verification)
  // Also send full snapshot after END_TURN for resync ability
  useEffect(() => {
    if (!isOnlineGame || !isHost) return;

    const gameStore = useGameStore.getState();
    // Set callback to include state hash with each action
    gameStore.setOnActionDispatched((action: GameAction) => {
      const hash = useGameStore.getState().computeStateHash();
      useMultiplayer.getState().sendGameAction(action, hash);

      // After END_TURN, send full snapshot so server stores it
      if (action.type === 'END_TURN') {
        const state = useGameStore.getState().gameState;
        if (state) {
          // Small delay to ensure state is fully settled
          setTimeout(() => {
            const finalState = useGameStore.getState().gameState;
            const finalHash = useGameStore.getState().computeStateHash();
            if (finalState) {
              useMultiplayer.getState().sendStateSnapshot(finalState, finalHash);
            }
          }, 100);
        }
      }

      // Check for game over
      const currentGameState = useGameStore.getState().gameState;
      if (currentGameState?.gameOver && currentGameState.winner) {
        const winner = currentGameState.winner;
        useMultiplayer.getState().sendGameOver(
          winner.id,
          winner.name,
          {
            players: currentGameState.players.map(p => ({
              id: p.id,
              name: p.name,
              captainId: p.captain.id,
              fame: p.fame,
              credits: p.credits,
              completedMissions: p.completedMissions.length,
              hazardsInDeck: p.hazardsInDeck,
              totalCardsPlayed: p.played.length,
            })),
            turn: currentGameState.turn,
          }
        );
      }
    });

    return () => {
      gameStore.setOnActionDispatched(null);
    };
  }, [isOnlineGame, isHost]);

  // Non-host: set callback to send actions without hash (hash comes from host)
  useEffect(() => {
    if (!isOnlineGame || isHost) return;

    const gameStore = useGameStore.getState();
    gameStore.setOnActionDispatched((action: GameAction) => {
      useMultiplayer.getState().sendGameAction(action);
    });

    return () => {
      gameStore.setOnActionDispatched(null);
    };
  }, [isOnlineGame, isHost]);

  // If we're on game screen but no game state, go back to menu
  if (screen === 'game' && !gameState) {
    setScreen('menu');
  }

  switch (screen) {
    case 'menu':
      return (
        <MainMenu
          onNewGame={() => setScreen('setup')}
          onOnlinePlay={() => setScreen('online')}
          onSimulation={() => setScreen('simulation')}
        />
      );

    case 'online':
      return (
        <OnlineLobby
          onBack={() => setScreen('menu')}
          onGameStart={handleOnlineGameStart}
        />
      );

    case 'simulation':
      return <SimulationMode onBack={() => setScreen('menu')} />;

    case 'setup':
      return (
        <div>
          <GameSetup onStartGame={handleStartGame} />
          <button
            onClick={() => setScreen('menu')}
            className="fixed top-4 left-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-sm transition-colors"
          >
            ← Back
          </button>
        </div>
      );

    case 'game':
      return (
        <div>
          <GameBoard isOnlineGame={isOnlineGame} localPlayerIndex={localPlayerIndex} />
          <button
            onClick={() => {
              if (confirm('Are you sure you want to quit this game?')) {
                setScreen('menu');
              }
            }}
            className="fixed top-4 left-4 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-white text-sm transition-colors z-50"
          >
            ← Quit
          </button>
          {isOnlineGame && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-600/80 rounded-lg text-white text-sm z-50">
              🌐 Online Game
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

export default App;
