/**
 * Restructure Captains v4: replace the combined "Starting Power" text column
 * ("W4 C0 E0 L1") with four numeric columns — Weapons | Computers | Engines |
 * Logistics — matching the mission tabs' format for Dextrous field mapping.
 *
 * New layout: Captain Name | Weapons | Computers | Engines | Logistics | Effect | Flavor Text | Image
 * Safety: aborts if the tab's headers aren't the expected 5 (i.e. user added
 * columns I don't know about) so nothing gets clobbered.
 *
 * Usage: npx tsx sync/restructure-captains.ts
 */

import { readSheet, writeRange } from './sheets-api.js';

const EXPECTED = ['Captain Name', 'Starting Power', 'Effect', 'Flavor Text', 'Image'];

async function main() {
  const tab = 'Captains v4';
  const rows = await readSheet(tab);
  const header = rows[0].map(h => h.trim());

  if (header.length !== EXPECTED.length || !EXPECTED.every((h, i) => header[i] === h)) {
    console.error(`Unexpected headers — aborting to protect user edits.\n  found: ${header.join(' | ')}\n  expected: ${EXPECTED.join(' | ')}`);
    process.exit(1);
  }

  const newHeader = ['Captain Name', 'Weapons', 'Computers', 'Engines', 'Logistics', 'Effect', 'Flavor Text', 'Image'];
  const out: (string | number)[][] = [newHeader];

  for (let i = 1; i < rows.length; i++) {
    const [name, power, effect, flavor, image] = [0, 1, 2, 3, 4].map(c => (rows[i][c] || '').trim());
    if (!name) continue;
    const m = power.match(/W(\d+)\s*C(\d+)\s*E(\d+)\s*L(\d+)/i);
    if (!m) { console.error(`  ⚠ ${name}: can't parse "${power}" — writing blanks`); }
    const [w, c, e, l] = m ? [+m[1], +m[2], +m[3], +m[4]] : ['', '', '', ''];
    out.push([name, w, c, e, l, effect, flavor, image]);
    console.log(`  ${name}: W${w} C${c} E${e} L${l}`);
  }

  await writeRange(tab, 'A1', out, true);
  console.log(`\nRestructured "${tab}": ${out.length - 1} captains, per-system columns.`);
}

main().catch(err => { console.error('Failed:', err.message ?? err); process.exit(1); });
