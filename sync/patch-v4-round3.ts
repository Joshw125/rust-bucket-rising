/**
 * Round-3 patches to the v4 card tabs (targeted cell writes only — preserves
 * user-added columns like "star fame"):
 *
 * 1. Enforce the cost-5+ Fame law on cards whose costs changed in V2:
 *    5–6 credits → Fame 1, 7+ → Fame 2.
 *    T2: Efficient Routing, Feedback Surge, Afterburner Surge, Cargo Jettison → 1
 *    T3: Salvage Network (now 7) → 2, Temporal Jump (8) → 2, Phase Skip Drive (6) → 1
 * 2. Simplify Gravity Sling (drop the "if moved 2+" conditionals).
 *
 * Usage: npx tsx sync/patch-v4-round3.ts
 */

import { readSheet, writeCell } from './sheets-api.js';

function colLetter(n: number): string {
  let s = '';
  n += 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

async function patchCells(tab: string, patches: Record<string, Record<string, string | number>>) {
  const rows = await readSheet(tab);
  const header = rows[0];
  const titleIdx = header.findIndex(h => h.trim() === 'Card Title');

  for (const [title, fields] of Object.entries(patches)) {
    const rowIdx = rows.findIndex((r, i) => i > 0 && (r[titleIdx] || '').trim() === title);
    if (rowIdx < 0) { console.error(`  ⚠ not found in ${tab}: ${title}`); continue; }
    for (const [field, value] of Object.entries(fields)) {
      const fieldIdx = header.findIndex(h => h.trim() === field);
      if (fieldIdx < 0) { console.error(`  ⚠ no column "${field}" in ${tab}`); continue; }
      await writeCell(tab, `${colLetter(fieldIdx)}${rowIdx + 1}`, value, true);
      console.log(`  ${tab} · ${title} · ${field} → ${value}`);
    }
  }
}

async function main() {
  await patchCells('v4 Tier 2 Market Cards', {
    'Efficient Routing': { Fame: 1 },
    'Feedback Surge': { Fame: 1 },
    'Afterburner Surge': { Fame: 1 },
    'Cargo Jettison': { Fame: 1 },
  });

  await patchCells('v4 Tier 3 Market Cards', {
    'Salvage Network': { Fame: 2 },
    'Temporal Jump': { Fame: 2 },
    'Phase Skip Drive': { Fame: 1 },
    'Gravity Sling': {
      'Effect When Played': '+2 {RBR/move.png}, +2⚡ (any system)',
      'Installation Text': '+1 {RBR/move.png} and +1⚡ (any system) each turn.',
    },
  });

  console.log('Done.');
}

main().catch(err => { console.error('Patch failed:', err.message ?? err); process.exit(1); });
