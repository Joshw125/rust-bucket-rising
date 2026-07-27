/**
 * One-off: add a "Fame" column to the T2/T3 market card tabs, populated from the
 * app's card data (cards.ts is the only place these values exist today).
 * Blank for cards without fame so Dextrous only renders it on premium cards.
 * Safe to re-run: overwrites the same column in place.
 *
 * Usage: npx tsx sync/push-fame-column.ts
 */

import { readSheet, writeRange } from './sheets-api.js';
import { TIER_2_CARDS, TIER_3_CARDS } from '../shared/data/cards.js';

const TABS: Array<{ tab: string; cards: { title: string; fame?: number }[] }> = [
  { tab: 'v3 Tier 2 Market Cards', cards: TIER_2_CARDS },
  { tab: 'v3 Tier 3 Market Cards', cards: TIER_3_CARDS },
];

function colLetter(n: number): string {
  // 0-indexed column number -> A1 letter(s)
  let s = '';
  n += 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

async function main() {
  for (const { tab, cards } of TABS) {
    const rows = await readSheet(tab);
    if (rows.length === 0) { console.error(`${tab}: empty/not found — skipped`); continue; }

    const header = rows[0];
    const titleCol = header.findIndex(h => h.trim() === 'Card Title');
    if (titleCol < 0) { console.error(`${tab}: no "Card Title" column — skipped`); continue; }

    // Reuse an existing Fame column if present, else append after the last header
    let fameCol = header.findIndex(h => h.trim() === 'Fame');
    if (fameCol < 0) fameCol = header.length;

    const fameByTitle = new Map(cards.map(c => [c.title.toLowerCase(), c.fame]));
    const misses: string[] = [];

    // Build the full column (header + one value per existing row, aligned)
    const column: (string | number)[][] = [['Fame']];
    for (let i = 1; i < rows.length; i++) {
      const title = (rows[i][titleCol] || '').trim();
      if (!title) { column.push(['']); continue; }
      if (!fameByTitle.has(title.toLowerCase())) { misses.push(title); column.push(['']); continue; }
      const fame = fameByTitle.get(title.toLowerCase());
      column.push([fame ?? '']);
    }

    await writeRange(tab, `${colLetter(fameCol)}1`, column, true);
    const written = column.filter(v => v[0] !== '' && v[0] !== 'Fame').length;
    console.log(`${tab}: wrote Fame column (${colLetter(fameCol)}), ${written} cards with fame.`);
    if (misses.length) console.log(`  ⚠ sheet titles not found in app data: ${misses.join(', ')}`);
  }
}

main().catch(err => { console.error('Push failed:', err.message ?? err); process.exit(1); });
