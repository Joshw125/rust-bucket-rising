/**
 * One-off: Expensive Countermeasures → Discount Countermeasures in the v4 T1 tab.
 * Cost 3 → 2 (guaranteed first-turn buy for any opening hand); install reaction
 * now pays (+1 card AND +1⚡). Targeted cell writes — user-added columns safe.
 *
 * Usage: npx tsx sync/patch-countermeasures.ts
 */

import { readSheet, writeCell } from './sheets-api.js';

function colLetter(n: number): string {
  let s = '';
  n += 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

async function main() {
  const tab = 'v4 Core Action Cards';
  const rows = await readSheet(tab);
  const header = rows[0];
  const titleIdx = header.findIndex(h => h.trim() === 'Card Title');
  const rowIdx = rows.findIndex((r, i) => i > 0 && (r[titleIdx] || '').trim() === 'Expensive Countermeasures');
  if (rowIdx < 0) { console.error('Expensive Countermeasures not found (already renamed?)'); process.exit(1); }

  const patch: Record<string, string | number> = {
    'Card Title': 'Discount Countermeasures',
    'Credit Cost': 2,
    'Installation Text': 'Reaction: discard a card to block a {RBR/hazard.png}, then +1 {RBR/card.png} and +1⚡ (any system).',
  };
  for (const [field, value] of Object.entries(patch)) {
    const idx = header.findIndex(h => h.trim() === field);
    if (idx < 0) { console.error(`  ⚠ no column "${field}"`); continue; }
    await writeCell(tab, `${colLetter(idx)}${rowIdx + 1}`, value, true);
    console.log(`  ${field} → ${value}`);
  }
  console.log('Done.');
}

main().catch(err => { console.error('Patch failed:', err.message ?? err); process.exit(1); });
