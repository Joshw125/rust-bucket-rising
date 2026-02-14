// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Player Tableau Component
// Ship board with overlaid interactive UI elements
// ═══════════════════════════════════════════════════════════════════════════════

import { clsx } from 'clsx';
import type { Player, SystemType, CardInstance, MissionInstance } from '@/types';
import { SYSTEM_CONFIG, MAX_POWER, TABLEAU_POSITIONS, VICTORY_THRESHOLD } from '@/data/constants';

// Position type for overlay styling
interface OverlayPosition {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width?: string;
  height?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerTableauProps {
  player: Player;
  shipImage: 1 | 2 | 3 | 4;
  isCurrentPlayer: boolean;
  onActivateSystem?: (system: SystemType, abilityIndex: number) => void;
  onViewCard?: (card: CardInstance) => void;
  onViewMission?: (mission: MissionInstance) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get captain image path
// ─────────────────────────────────────────────────────────────────────────────

function getCaptainImagePath(captainId: string): string {
  const filename = captainId.charAt(0).toUpperCase() + captainId.slice(1);
  return `/cards/captain/${filename}.png`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fame Track Overlay
// ─────────────────────────────────────────────────────────────────────────────

interface FameTrackOverlayProps {
  fame: number;
  maxFame?: number;
}

function FameTrackOverlay({ fame, maxFame = 12 }: FameTrackOverlayProps) {
  return (
    <div
      className="tableau-overlay tableau-overlay-interactive"
      style={{
        ...TABLEAU_POSITIONS.fameTrack,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '4px 8px',
      }}
    >
      {/* Star icon */}
      <span className="fame-star text-lg mr-1">★</span>

      {/* Fame pips */}
      <div className="flex gap-1">
        {Array.from({ length: Math.min(maxFame, 12) }, (_, i) => i + 1).map(n => (
          <div
            key={n}
            className={clsx('fame-pip', n <= fame ? 'filled' : 'empty')}
          >
            {n}
          </div>
        ))}
      </div>

      {/* Overflow indicator */}
      {fame > 12 && (
        <span className="text-amber-400 font-bold text-sm ml-2">+{fame - 12}</span>
      )}

      {/* Victory threshold */}
      <span className="text-slate-500 text-[10px] ml-2">/ {VICTORY_THRESHOLD}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Captain Overlay
// ─────────────────────────────────────────────────────────────────────────────

interface CaptainOverlayProps {
  captain: Player['captain'];
}

function CaptainOverlay({ captain }: CaptainOverlayProps) {
  const captainImg = getCaptainImagePath(captain.id);

  return (
    <div
      className="tableau-overlay tableau-overlay-interactive"
      style={{
        ...TABLEAU_POSITIONS.captain,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
      }}
    >
      <img
        src={captainImg}
        alt={captain.name}
        className="w-full h-auto rounded shadow-lg"
        style={{ maxHeight: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Power Pips Component
// ─────────────────────────────────────────────────────────────────────────────

interface PowerPipsProps {
  system: SystemType;
  current: number;
  vertical?: boolean;
}

function PowerPips({ system, current, vertical = false }: PowerPipsProps) {
  const config = SYSTEM_CONFIG[system];

  return (
    <div className={clsx('flex gap-1', vertical ? 'flex-col' : 'flex-row')}>
      {Array.from({ length: MAX_POWER }, (_, i) => (
        <div
          key={i}
          className={clsx(
            'power-pip-overlay',
            i < current && 'filled',
          )}
          style={{ color: config.color }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Overlay Component
// ─────────────────────────────────────────────────────────────────────────────

interface SystemOverlayProps {
  system: SystemType;
  player: Player;
  position: OverlayPosition;
  isCurrentPlayer: boolean;
  onActivate?: (abilityIndex: number) => void;
  onViewCard?: (card: CardInstance) => void;
  onViewMission?: (mission: MissionInstance) => void;
  vertical?: boolean;
}

function SystemOverlay({
  system,
  player,
  position,
  isCurrentPlayer,
  onActivate,
  onViewCard,
  onViewMission,
  vertical = false,
}: SystemOverlayProps) {
  const config = SYSTEM_CONFIG[system];
  const currentPower = player.currentPower[system];
  const usedAbilities = player.usedSystemAbilities?.[system] ?? [];
  const installation = player.installations[system];
  const gearInstallation = player.gearInstallations?.[system];

  return (
    <div
      className="tableau-overlay tableau-overlay-interactive"
      style={{
        ...position,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '4px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '4px',
      }}
    >
      {/* System name */}
      <div className={clsx('text-[10px] font-bold uppercase', config.textClass)}>
        {config.name}
      </div>

      {/* Power pips */}
      <div className="my-1">
        <PowerPips system={system} current={currentPower} vertical={vertical} />
      </div>

      {/* Abilities */}
      <div className="flex flex-col gap-0.5">
        {config.abilities.map((ability, idx) => {
          const isUsed = usedAbilities[idx] ?? false;
          const canActivate = isCurrentPlayer && currentPower >= ability.cost && !isUsed;

          return (
            <button
              key={idx}
              className={clsx(
                'system-ability-btn',
                isUsed && 'used',
                config.textClass,
              )}
              onClick={() => onActivate?.(idx)}
              disabled={!canActivate}
              title={ability.description}
            >
              <span className="font-bold">{ability.cost}⚡</span>
            </button>
          );
        })}
      </div>

      {/* Installation indicator */}
      {(installation || gearInstallation) && (
        <div className="mt-1 pt-1 border-t border-white/20">
          {installation && (
            <button
              className="text-[8px] text-amber-400 hover:text-amber-300 truncate w-full text-left"
              onClick={() => onViewCard?.(installation)}
              title={installation.title}
            >
              🔧 {installation.title.substring(0, 10)}...
            </button>
          )}
          {gearInstallation && (
            <button
              className="text-[8px] text-amber-300 hover:text-amber-200 truncate w-full text-left"
              onClick={() => onViewMission?.(gearInstallation)}
              title={gearInstallation.title}
            >
              ⚙️ Gear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Bar Component
// ─────────────────────────────────────────────────────────────────────────────

interface StatsBarProps {
  player: Player;
}

function StatsBar({ player }: StatsBarProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-2 bg-slate-900/80 rounded-lg mt-2">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-xl">💰</span>
        <span className="font-bold text-amber-400 text-xl">{player.credits}</span>
        <span className="text-slate-500 text-sm">Credits</span>
      </div>

      <div className="w-px h-6 bg-slate-700" />

      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-400">
          <span className="text-slate-500">Deck:</span> {player.deck.length}
        </span>
        <span className="text-slate-400">
          <span className="text-slate-500">Discard:</span> {player.discard.length}
        </span>
        <span className="text-slate-400">
          <span className="text-slate-500">Played:</span> {player.played.length}
        </span>
        <span className={clsx(
          player.hazardsInDeck > 0 ? 'text-red-400' : 'text-green-400'
        )}>
          <span className="text-slate-500">Hazards:</span> {player.hazardsInDeck}
        </span>
        <span className="text-amber-400">
          <span className="text-slate-500">Missions:</span> {player.completedMissions.length}
        </span>
      </div>

      {player.movesRemaining > 0 && (
        <>
          <div className="w-px h-6 bg-slate-700" />
          <span className="text-engines font-semibold">
            {player.movesRemaining} Free Move{player.movesRemaining > 1 ? 's' : ''}
          </span>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Player Tableau Component
// ─────────────────────────────────────────────────────────────────────────────

export function PlayerTableau({
  player,
  shipImage,
  isCurrentPlayer,
  onActivateSystem,
  onViewCard,
  onViewMission,
}: PlayerTableauProps) {
  const shipSrc = `/cards/player/Ship${shipImage}.png`;

  return (
    <div className="flex flex-col items-center">
      {/* Ship board with overlays */}
      <div className="player-tableau">
        {/* Ship background image */}
        <img
          src={shipSrc}
          alt={`${player.name}'s Ship`}
          className="player-tableau-bg"
          draggable={false}
        />

        {/* Fame Track Overlay */}
        <FameTrackOverlay fame={player.fame} />

        {/* Captain Overlay */}
        <CaptainOverlay captain={player.captain} />

        {/* Engines Overlay (left side, vertical) */}
        <SystemOverlay
          system="engines"
          player={player}
          position={TABLEAU_POSITIONS.engines}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('engines', idx)}
          onViewCard={onViewCard}
          onViewMission={onViewMission}
          vertical={true}
        />

        {/* Computers Overlay (bottom left) */}
        <SystemOverlay
          system="computers"
          player={player}
          position={TABLEAU_POSITIONS.computers}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('computers', idx)}
          onViewCard={onViewCard}
          onViewMission={onViewMission}
        />

        {/* Logistics Overlay (bottom center) */}
        <SystemOverlay
          system="logistics"
          player={player}
          position={TABLEAU_POSITIONS.logistics}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('logistics', idx)}
          onViewCard={onViewCard}
          onViewMission={onViewMission}
        />

        {/* Weapons Overlay (bottom right) */}
        <SystemOverlay
          system="weapons"
          player={player}
          position={TABLEAU_POSITIONS.weapons}
          isCurrentPlayer={isCurrentPlayer}
          onActivate={(idx) => onActivateSystem?.('weapons', idx)}
          onViewCard={onViewCard}
          onViewMission={onViewMission}
        />
      </div>

      {/* Stats bar below tableau */}
      <StatsBar player={player} />
    </div>
  );
}

export default PlayerTableau;
