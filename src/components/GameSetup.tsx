// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Game Setup Screen
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { clsx } from 'clsx';
import { CAPTAINS } from '@/data';
import type { Captain, AIStrategy } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerConfig {
  name: string;
  captain: Captain | null;
  isAI: boolean;
  aiStrategy: AIStrategy;
}

const AI_STRATEGIES: { value: AIStrategy; label: string; description: string }[] = [
  { value: 'balanced', label: 'Balanced', description: 'Well-rounded approach' },
  { value: 'aggressive', label: 'Aggressive', description: 'Focuses on hazards' },
  { value: 'economic', label: 'Economic', description: 'Buys lots of cards' },
  { value: 'explorer', label: 'Explorer', description: 'Prioritizes missions' },
  { value: 'rush', label: 'Rush', description: 'Races for victory' },
];

export interface GameSetupProps {
  onStartGame: (players: Array<{ name: string; captain: Captain; isAI?: boolean; aiStrategy?: AIStrategy }>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Captain Selector Component
// ─────────────────────────────────────────────────────────────────────────────

interface CaptainSelectorProps {
  selectedCaptain: Captain | null;
  onSelect: (captain: Captain) => void;
  usedCaptains: string[];
}

function CaptainSelector({ selectedCaptain, onSelect, usedCaptains }: CaptainSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CAPTAINS.map(captain => {
        const isUsed = usedCaptains.includes(captain.id);
        const isSelected = selectedCaptain?.id === captain.id;

        return (
          <button
            key={captain.id}
            className={clsx(
              'p-2 rounded-lg border-2 text-left transition-all',
              isSelected && 'border-amber-500 bg-amber-500/20',
              !isSelected && !isUsed && 'border-slate-600 hover:border-slate-500 bg-slate-800',
              isUsed && !isSelected && 'border-slate-700 bg-slate-900 opacity-50 cursor-not-allowed',
            )}
            onClick={() => !isUsed && onSelect(captain)}
            disabled={isUsed && !isSelected}
          >
            <div className="font-bold text-amber-400 text-sm">{captain.name}</div>
            <div className="text-xs text-slate-400 mt-1">{captain.effect}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Config Row
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerConfigRowProps {
  index: number;
  config: PlayerConfig;
  onChange: (config: PlayerConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
  usedCaptains: string[];
}

function PlayerConfigRow({
  index,
  config,
  onChange,
  onRemove,
  canRemove,
  usedCaptains,
}: PlayerConfigRowProps) {
  const [showCaptains, setShowCaptains] = useState(false);

  return (
    <div className={clsx(
      'rounded-lg p-4 border',
      config.isAI ? 'bg-purple-900/30 border-purple-700' : 'bg-slate-800 border-slate-700'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-white">Player {index + 1}</h3>
          {/* Human/AI toggle */}
          <div className="flex bg-slate-700 rounded-lg p-0.5">
            <button
              className={clsx(
                'px-3 py-1 rounded text-xs font-semibold transition-all',
                !config.isAI ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              )}
              onClick={() => onChange({ ...config, isAI: false, name: config.isAI ? `Player ${index + 1}` : config.name })}
            >
              Human
            </button>
            <button
              className={clsx(
                'px-3 py-1 rounded text-xs font-semibold transition-all',
                config.isAI ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              )}
              onClick={() => onChange({ ...config, isAI: true, name: config.isAI ? config.name : `AI ${index + 1}` })}
            >
              AI
            </button>
          </div>
        </div>
        {canRemove && (
          <button
            className="text-slate-500 hover:text-red-400 transition-colors"
            onClick={onRemove}
          >
            ✕ Remove
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Name input */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Name</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onChange({ ...config, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white focus:border-amber-500 focus:outline-none"
            placeholder={config.isAI ? `AI ${index + 1}` : `Player ${index + 1}`}
          />
        </div>

        {/* AI Strategy selector (only for AI players) */}
        {config.isAI && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">AI Strategy</label>
            <div className="grid grid-cols-5 gap-1">
              {AI_STRATEGIES.map(strat => (
                <button
                  key={strat.value}
                  className={clsx(
                    'px-2 py-1.5 rounded text-xs font-semibold transition-all',
                    config.aiStrategy === strat.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                  onClick={() => onChange({ ...config, aiStrategy: strat.value })}
                  title={strat.description}
                >
                  {strat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Captain selection */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Captain</label>
          <button
            className={clsx(
              'w-full px-3 py-2 rounded border text-left transition-colors',
              config.captain
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500',
            )}
            onClick={() => setShowCaptains(!showCaptains)}
          >
            {config.captain ? (
              <div>
                <div className="font-semibold">{config.captain.name}</div>
                <div className="text-xs opacity-75">{config.captain.effect}</div>
              </div>
            ) : (
              'Select Captain...'
            )}
          </button>

          {showCaptains && (
            <div className="mt-2">
              <CaptainSelector
                selectedCaptain={config.captain}
                onSelect={(captain) => {
                  onChange({ ...config, captain });
                  setShowCaptains(false);
                }}
                usedCaptains={usedCaptains}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Game Setup Component
// ─────────────────────────────────────────────────────────────────────────────

export function GameSetup({ onStartGame }: GameSetupProps) {
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: 'Player 1', captain: null, isAI: false, aiStrategy: 'balanced' },
    { name: 'AI 2', captain: null, isAI: true, aiStrategy: 'balanced' },
  ]);

  const usedCaptains = players
    .filter(p => p.captain)
    .map(p => p.captain!.id);

  const canAddPlayer = players.length < 4;
  const canRemovePlayer = players.length > 2;
  const canStart = players.every(p => p.name.trim() && p.captain);

  const addPlayer = () => {
    if (canAddPlayer) {
      setPlayers([...players, { name: `AI ${players.length + 1}`, captain: null, isAI: true, aiStrategy: 'balanced' }]);
    }
  };

  const removePlayer = (index: number) => {
    if (canRemovePlayer) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, config: PlayerConfig) => {
    setPlayers(players.map((p, i) => (i === index ? config : p)));
  };

  const startGame = () => {
    if (canStart) {
      onStartGame(
        players.map(p => ({
          name: p.name.trim(),
          captain: p.captain!,
          isAI: p.isAI,
          aiStrategy: p.aiStrategy,
        }))
      );
    }
  };

  const humanCount = players.filter(p => !p.isAI).length;
  const aiCount = players.filter(p => p.isAI).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-500 mb-2">RUST BUCKET RISING</h1>
          <p className="text-slate-400">Digital Playtest Edition</p>
        </div>

        {/* Setup card */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">Game Setup</h2>

          {/* Player configurations */}
          <div className="space-y-4 mb-6">
            {players.map((config, index) => (
              <PlayerConfigRow
                key={index}
                index={index}
                config={config}
                onChange={(c) => updatePlayer(index, c)}
                onRemove={() => removePlayer(index)}
                canRemove={canRemovePlayer}
                usedCaptains={usedCaptains.filter(id => id !== config.captain?.id)}
              />
            ))}
          </div>

          {/* Add player button */}
          {canAddPlayer && (
            <button
              className="w-full py-2 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors mb-6"
              onClick={addPlayer}
            >
              + Add Player ({players.length}/4)
            </button>
          )}

          {/* Start button */}
          <button
            className={clsx(
              'w-full py-4 rounded-lg font-bold text-lg transition-all',
              canStart
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed',
            )}
            onClick={startGame}
            disabled={!canStart}
          >
            {canStart ? 'Start Game' : 'Select Captains for All Players'}
          </button>
        </div>

        {/* Credits */}
        <div className="text-center mt-6 text-xs text-slate-600">
          {humanCount > 0 && aiCount > 0
            ? `${humanCount} human vs ${aiCount} AI`
            : humanCount > 0
              ? `Hot-seat multiplayer • ${humanCount} players`
              : `AI vs AI simulation • ${aiCount} AI players`}
        </div>
      </div>
    </div>
  );
}

export default GameSetup;
