/**
 * Text-convention sweep: unspecified system = any system, so the phrase
 * "(any system)" is redundant — strip it everywhere in the v4/v3 tabs.
 * Functional parentheticals ("you choose the system" on steals, "you choose
 * the direction" on pushes) are NOT touched — those disambiguate who decides.
 * Targeted cell writes only (user-added columns like "star fame" are safe).
 *
 * Usage: npx tsx sync/strip-any-system.ts
 */

import { readSheet, writeCell } from './sheets-api.js';

const TABS = [
  'v4 Core Action Cards',
  'v4 Tier 2 Market Cards',
  'v4 Tier 3 Market Cards',
  'Captains v4',
  'v3 Missions Near',
  'v3 Missions Middle',
  'v3 Missions Deep',
];

function colLetter(n: number): string {
  let s = '';
  n += 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

async function main() {
  let total = 0;
  for (const tab of TABS) {
    const rows = await readSheet(tab);
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const val = rows[r][c] ?? '';
        if (val.includes('(any system)')) {
          const cleaned = val.replace(/ ?\(any system\)/g, '');
          await writeCell(tab, `${colLetter(c)}${r + 1}`, cleaned, true);
          console.log(`  ${tab} ${colLetter(c)}${r + 1}: "${val.slice(0, 60)}..." → stripped`);
          total++;
        }
      }
    }
  }
  console.log(`\nStripped "(any system)" from ${total} cells.`);
}

main().catch(err => { console.error('Sweep failed:', err.message ?? err); process.exit(1); });
