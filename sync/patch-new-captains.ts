/**
 * Fill in the two user-added captains (Wanderer, Technologist) on Captains v4.
 * - Wanderer: reveal-trigger ability CAPPED at once per turn (fixes the
 *   turn-1 triple-reveal burst: E3 dash to L4 would have paid 3x).
 * - Technologist: reallocate ability (user's pick) + array fixed to sum 5
 *   (was W1 C2 E1 L3 = 7; now W0 C1 E1 L3, keeping the L3 identity).
 * Targeted cell writes only.
 *
 * Usage: npx tsx sync/patch-new-captains.ts
 */

import { readSheet, writeCell } from './sheets-api.js';

function colLetter(n: number): string {
  let s = '';
  n += 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const PATCHES: Record<string, Record<string, string>> = {
  Wanderer: {
    Effect: 'When you reveal a face-down mission: +2⚡ and +1 {RBR/card.png} (max twice per turn).',
    'Flavor Text': 'The map ended three sectors ago.',
  },
  Technologist: {
    'Starting Power': 'W0 C2 E1 L2',
    Effect: 'Once per turn: reallocate up to 2⚡ between your systems.',
    'Flavor Text': 'Every system has slack, if you know where to look.',
  },
};

async function main() {
  const tab = 'Captains v4';
  const rows = await readSheet(tab);
  const header = rows[0];
  const nameIdx = header.findIndex(h => h.trim() === 'Captain Name');

  for (const [name, fields] of Object.entries(PATCHES)) {
    const rowIdx = rows.findIndex((r, i) => i > 0 && (r[nameIdx] || '').trim() === name);
    if (rowIdx < 0) { console.error(`  ⚠ not found: ${name}`); continue; }
    for (const [field, value] of Object.entries(fields)) {
      const idx = header.findIndex(h => h.trim() === field);
      if (idx < 0) { console.error(`  ⚠ no column "${field}"`); continue; }
      await writeCell(tab, `${colLetter(idx)}${rowIdx + 1}`, value, true);
      console.log(`  ${name} · ${field} → ${value}`);
    }
  }
  console.log('Done.');
}

main().catch(err => { console.error('Patch failed:', err.message ?? err); process.exit(1); });
