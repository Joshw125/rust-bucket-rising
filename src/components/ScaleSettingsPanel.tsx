// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Scale Settings Panel
// Floating UI panel with sliders for independent section scaling
// ═══════════════════════════════════════════════════════════════════════════════

import { useUIScaleStore, type SectionScales } from '../hooks/useUIScaleStore';

const SECTION_LABELS: { key: keyof SectionScales; label: string }[] = [
  { key: 'hand', label: 'Hand Cards' },
  { key: 'spaceTrack', label: 'Space Track' },
  { key: 'market', label: 'Market' },
  { key: 'sidebar', label: 'Sidebar' },
];

export function ScaleSettingsPanel() {
  const { scales, setScale, resetScales, showScalePanel, toggleScalePanel } =
    useUIScaleStore();

  if (!showScalePanel) return null;

  const isDefault = Object.values(scales).every((v) => v === 1.0);

  return (
    <div className="fixed top-14 right-4 z-50">
      <div className="game-panel p-4 w-64 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wide">
            UI Scale
          </h3>
          <button
            onClick={toggleScalePanel}
            className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          {SECTION_LABELS.map(({ key, label }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 text-xs">{label}</span>
                <span className="text-amber-400 text-xs font-mono w-10 text-right">
                  {Math.round(scales[key] * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                step={5}
                value={Math.round(scales[key] * 100)}
                onChange={(e) =>
                  setScale(key, parseInt(e.target.value, 10) / 100)
                }
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                  bg-slate-700
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-amber-400
                  [&::-webkit-slider-thumb]:hover:bg-amber-300
                  [&::-webkit-slider-thumb]:transition-colors
                  [&::-moz-range-thumb]:w-3
                  [&::-moz-range-thumb]:h-3
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-amber-400
                  [&::-moz-range-thumb]:border-0"
              />
            </div>
          ))}
        </div>

        {/* Reset button */}
        <button
          onClick={resetScales}
          disabled={isDefault}
          className="mt-3 w-full px-3 py-1.5 rounded text-xs font-semibold transition-all
            bg-slate-800 border border-slate-600 text-slate-300
            hover:bg-slate-700 hover:text-white
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
