// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Game Setup Screen
// Themed setup with large captain card art and randomized 2-choice selection
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
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
  captainChoices: Captain[]; // 2 random captain options for this player
}

const AI_STRATEGIES: { value: AIStrategy; label: string; description: string }[] = [
  { value: 'balanced', label: 'Balanced', description: 'Well-rounded approach' },
  { value: 'aggressive', label: 'Aggressive', description: 'Focuses on hazards' },
  { value: 'economic', label: 'Economic', description: 'Buys lots of cards' },
  { value: 'explorer', label: 'Explorer', description: 'Prioritizes missions' },
  { value: 'rush', label: 'Rush', description: 'Races for victory' },
];

// Captains eligible for random selection (exclude Ghost)
const SELECTABLE_CAPTAINS = CAPTAINS.filter(c => c.id !== 'ghost');

export interface GameSetupProps {
  onStartGame: (players: Array<{ name: string; captain: Captain; isAI?: boolean; aiStrategy?: AIStrategy }>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: shuffle array
// ─────────────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Assign 2 unique random captain choices per player, no overlaps
function assignCaptainChoices(numPlayers: number): Captain[][] {
  const shuffled = shuffle(SELECTABLE_CAPTAINS);
  const choices: Captain[][] = [];
  for (let i = 0; i < numPlayers; i++) {
    choices.push(shuffled.slice(i * 2, i * 2 + 2));
  }
  return choices;
}

// ─────────────────────────────────────────────────────────────────────────────
// Captain Card Choice Component
// ─────────────────────────────────────────────────────────────────────────────

interface CaptainCardProps {
  captain: Captain;
  isSelected: boolean;
  onSelect: () => void;
}

function CaptainCard({ captain, isSelected, onSelect }: CaptainCardProps) {
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
      {/* Captain card image */}
      <img
        src={`/cards/captain/${captain.image}`}
        alt={captain.name}
        className="w-full h-auto block"
        draggable={false}
      />

      {/* Selected overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-amber-400/10 flex items-start justify-end p-2">
          <div className="bg-amber-500 text-slate-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shadow-lg">
            ✓
          </div>
        </div>
      )}

      {/* Hover glow */}
      {!isSelected && (
        <div className="absolute inset-0 bg-amber-400/0 group-hover:bg-amber-400/5 transition-colors" />
      )}
    </button>
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
}

function PlayerConfigRow({
  index,
  config,
  onChange,
  onRemove,
  canRemove,
}: PlayerConfigRowProps) {
  const playerColors = [
    { border: 'border-purple-500/40', bg: 'bg-purple-900/20', label: 'text-purple-400' },
    { border: 'border-orange-500/40', bg: 'bg-orange-900/20', label: 'text-orange-400' },
    { border: 'border-cyan-500/40', bg: 'bg-cyan-900/20', label: 'text-cyan-400' },
    { border: 'border-pink-500/40', bg: 'bg-pink-900/20', label: 'text-pink-400' },
  ];
  const pColor = playerColors[index % playerColors.length];

  return (
    <div className={clsx(
      'rounded-xl p-5 border backdrop-blur-sm',
      pColor.border, pColor.bg,
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className={clsx('text-lg font-bold', pColor.label)}>Player {index + 1}</h3>
          {/* Human/AI toggle */}
          <div className="flex bg-slate-900/60 rounded-lg p-0.5">
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
            className="text-slate-500 hover:text-red-400 text-sm transition-colors"
            onClick={onRemove}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {/* Name and AI strategy in a row */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Name</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onChange({ ...config, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
            placeholder={config.isAI ? `AI ${index + 1}` : `Player ${index + 1}`}
          />
        </div>

        {config.isAI && (
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">AI Strategy</label>
            <div className="flex gap-1 flex-wrap">
              {AI_STRATEGIES.map(strat => (
                <button
                  key={strat.value}
                  className={clsx(
                    'px-2 py-1.5 rounded text-[10px] font-semibold transition-all',
                    config.aiStrategy === strat.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700'
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
      </div>

      {/* Captain selection — two big card images side by side */}
      <div>
        <label className="block text-xs text-slate-500 mb-2">Choose Your Captain</label>
        <div className="grid grid-cols-2 gap-3">
          {config.captainChoices.map((captain) => (
            <CaptainCard
              key={captain.id}
              captain={captain}
              isSelected={config.captain?.id === captain.id}
              onSelect={() => onChange({ ...config, captain })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Game Setup Component
// ─────────────────────────────────────────────────────────────────────────────

export function GameSetup({ onStartGame }: GameSetupProps) {
  // Generate initial captain choices for 2 players
  const initialChoices = useMemo(() => assignCaptainChoices(4), []); // pre-generate for max players

  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: 'Player 1', captain: null, isAI: false, aiStrategy: 'balanced', captainChoices: initialChoices[0] },
    { name: 'AI 2', captain: null, isAI: true, aiStrategy: 'balanced', captainChoices: initialChoices[1] },
  ]);

  const canAddPlayer = players.length < 4;
  const canRemovePlayer = players.length > 2;
  const canStart = players.every(p => p.name.trim() && p.captain);

  const addPlayer = () => {
    if (canAddPlayer) {
      const newIndex = players.length;
      setPlayers([...players, {
        name: `AI ${newIndex + 1}`,
        captain: null,
        isAI: true,
        aiStrategy: 'balanced',
        captainChoices: initialChoices[newIndex],
      }]);
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
    <div className="min-h-screen relative text-white flex items-center justify-center p-6">
      {/* Dark overlay matching the main menu */}
      <div className="fixed inset-0 bg-black/60 pointer-events-none" />

      <div className="max-w-3xl w-full relative z-10">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black tracking-tight mb-1">
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rust bg-clip-text text-transparent">
              RUST BUCKET RISING
            </span>
          </h1>
          <p className="text-amber-200/40 text-sm">Choose your crew</p>
        </div>

        {/* Setup panel */}
        <div className="bg-slate-950/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-2xl shadow-black/40">
          {/* Player configurations */}
          <div className="space-y-5 mb-6">
            {players.map((config, index) => (
              <PlayerConfigRow
                key={index}
                index={index}
                config={config}
                onChange={(c) => updatePlayer(index, c)}
                onRemove={() => removePlayer(index)}
                canRemove={canRemovePlayer}
              />
            ))}
          </div>

          {/* Add player button */}
          {canAddPlayer && (
            <button
              className="w-full py-3 border-2 border-dashed border-slate-600/50 rounded-xl text-slate-500 hover:border-amber-500/30 hover:text-slate-300 transition-colors mb-5"
              onClick={addPlayer}
            >
              + Add Player ({players.length}/4)
            </button>
          )}

          {/* Start button */}
          <button
            className={clsx(
              'w-full py-4 rounded-xl font-bold text-lg transition-all',
              canStart
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:via-amber-400 hover:to-orange-400 text-slate-900 shadow-lg shadow-orange-500/30 border border-amber-400/30 hover:scale-[1.01]'
                : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed',
            )}
            onClick={startGame}
            disabled={!canStart}
          >
            {canStart ? 'Start Game' : 'Select Captains for All Players'}
          </button>
        </div>

        {/* Info */}
        <div className="text-center mt-4 text-xs text-slate-600">
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
