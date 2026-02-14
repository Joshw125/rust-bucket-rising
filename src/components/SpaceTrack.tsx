// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Space Track Component (Straight Line Design)
// ═══════════════════════════════════════════════════════════════════════════════

import { clsx } from 'clsx';
import type { GameState, Player, TrackMission } from '@/types';
import { MissionCard } from './Card';
import { STATION_LOCATIONS, STATION_ICONS, ZONE_MAP } from '@/data/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SpaceTrackProps {
  state: GameState;
  currentPlayerId: number;
  onMove?: (direction: -1 | 1) => void;
  onSelectLocation?: (location: number) => void;
  onViewMission?: (mission: TrackMission) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Colors
// ─────────────────────────────────────────────────────────────────────────────

const PLAYER_COLORS = [
  { bg: 'bg-purple-500', ring: 'ring-purple-400' },
  { bg: 'bg-orange-500', ring: 'ring-orange-400' },
  { bg: 'bg-cyan-400', ring: 'ring-cyan-300' },
  { bg: 'bg-pink-400', ring: 'ring-pink-300' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Zone colors
// ─────────────────────────────────────────────────────────────────────────────

const ZONE_STYLES = {
  near: {
    trackBg: 'bg-near/20',
    border: 'border-near/60',
    text: 'text-near',
    label: 'NEAR SPACE'
  },
  mid: {
    trackBg: 'bg-mid/20',
    border: 'border-mid/60',
    text: 'text-mid',
    label: 'MID SPACE'
  },
  deep: {
    trackBg: 'bg-deep/20',
    border: 'border-deep/60',
    text: 'text-deep',
    label: 'DEEP SPACE'
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Track Location Component
// ─────────────────────────────────────────────────────────────────────────────

interface TrackLocationProps {
  location: number;
  mission: TrackMission | null;
  playersHere: Player[];
  allPlayers: Player[];
  currentPlayerId: number;
  isStation: boolean;
  hasCurrentPlayer: boolean;
  onViewMission?: (mission: TrackMission) => void;
}

function TrackLocation({
  location,
  mission,
  playersHere,
  allPlayers,
  currentPlayerId,
  isStation,
  hasCurrentPlayer,
  onViewMission,
}: TrackLocationProps) {
  const zone = ZONE_MAP[location];
  const zoneStyle = ZONE_STYLES[zone];

  return (
    <div className="flex flex-col items-center">
      {/* Station icon if applicable */}
      {isStation && (
        <img
          src={STATION_ICONS[location as 1 | 3 | 5]}
          alt={`Station ${location}`}
          className="w-10 h-10 mb-1 drop-shadow-md"
        />
      )}
      {!isStation && <div className="w-10 h-10 mb-1" />}

      {/* Location node on the track */}
      <div
        className={clsx(
          'relative w-16 h-16 rounded-lg border-2 flex items-center justify-center',
          zoneStyle.trackBg,
          zoneStyle.border,
          hasCurrentPlayer && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent shadow-lg shadow-amber-500/30',
        )}
      >
        {/* Location number */}
        <span className={clsx(
          'font-bold text-2xl',
          hasCurrentPlayer ? 'text-white' : 'text-white/70',
        )}>
          {location}
        </span>

        {/* Player tokens - positioned around the node */}
        {playersHere.map((player, idx) => {
          const playerIndex = allPlayers.findIndex(p => p.id === player.id);
          const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
          const isCurrentPlayer = player.id === currentPlayerId;

          // Position tokens in corners
          const positions = [
            'top-0 right-0 translate-x-1/3 -translate-y-1/3',
            'bottom-0 right-0 translate-x-1/3 translate-y-1/3',
            'top-0 left-0 -translate-x-1/3 -translate-y-1/3',
            'bottom-0 left-0 -translate-x-1/3 translate-y-1/3',
          ];

          return (
            <div
              key={player.id}
              className={clsx(
                'absolute w-5 h-5 rounded-full border-2 border-white',
                color.bg,
                isCurrentPlayer && 'ring-2 ring-amber-400',
                positions[idx % 4],
              )}
              title={`${player.name} (${player.captain.name})`}
            />
          );
        })}
      </div>

      {/* Mission card below */}
      <div className="mt-2">
        {mission ? (
          <div
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => onViewMission?.(mission)}
          >
            <MissionCard
              mission={mission.mission}
              size="large"
              showBack={!mission.revealed}
            />
          </div>
        ) : (
          <div className="w-40 h-56 rounded-lg border-2 border-dashed border-slate-700/30 bg-slate-900/20 flex items-center justify-center">
            <span className="text-slate-600 text-xs">No Mission</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Space Track Component
// ─────────────────────────────────────────────────────────────────────────────

export function SpaceTrack({
  state,
  currentPlayerId,
  onViewMission,
}: SpaceTrackProps) {
  const locations = [1, 2, 3, 4, 5, 6] as const;

  // Group players by location
  const playersByLocation: Record<number, Player[]> = {};
  for (const loc of locations) {
    playersByLocation[loc] = state.players.filter(p => p.location === loc);
  }

  const currentPlayer = state.players.find(p => p.id === currentPlayerId);

  return (
    <div className="flex flex-col items-center">
      {/* Zone labels */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', ZONE_STYLES.near.text, 'bg-near/20')}>
          {ZONE_STYLES.near.label}
        </span>
        <span className="text-slate-600">→</span>
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', ZONE_STYLES.mid.text, 'bg-mid/20')}>
          {ZONE_STYLES.mid.label}
        </span>
        <span className="text-slate-600">→</span>
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', ZONE_STYLES.deep.text, 'bg-deep/20')}>
          {ZONE_STYLES.deep.label}
        </span>
      </div>

      {/* The track - straight horizontal line with locations */}
      <div className="relative flex items-start">
        {/* Connecting line behind the nodes */}
        <div className="absolute top-[60px] left-8 right-8 h-1 bg-gradient-to-r from-near/40 via-mid/40 to-deep/40 rounded-full" />

        {/* Location nodes */}
        <div className="flex items-start gap-4">
          {locations.map((loc) => (
            <TrackLocation
              key={loc}
              location={loc}
              mission={state.trackMissions[loc]}
              playersHere={playersByLocation[loc]}
              allPlayers={state.players}
              currentPlayerId={currentPlayerId}
              isStation={STATION_LOCATIONS.includes(loc as 1 | 3 | 5)}
              hasCurrentPlayer={currentPlayer?.location === loc}
              onViewMission={onViewMission}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default SpaceTrack;
