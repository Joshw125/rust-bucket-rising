/**
 * Replace Mercenary with The Privateer on Captains v4 (in-place row rewrite).
 * Rationale: weakest payoff of the three give-hazard captains, identity subsumed
 * by the Privateer; roster stays at 12.
 *
 * Usage: npx tsx sync/patch-privateer.ts
 */
import { readSheet, writeCell } from './sheets-api.js';

function colLetter(n: number): string {
  let s = '';
  n += 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const NEW_ROW: Record<string, string> = {
  'Captain Name': 'Pirate',
  'Starting Power': 'W4 C0 E0 L1',
  'Effect': 'You cannot complete missions. Your Weapons abilities have no once-per-turn limit. When you give a {RBR/hazard.png}: +2 Fame. When buying, you may spend {RBR/hazard.png} from your hand as {RBR/credit.png} (return them to the hazard deck).',
  'Flavor Text': 'Nobody invited him. Ratings tripled.',
  'Image': 'pirate.png',
};

async function main() {
  const tab = 'Captains v4';
  const rows = await readSheet(tab);
  const header = rows[0];
  const nameIdx = header.findIndex(h => h.trim() === 'Captain Name');
  const rowIdx = rows.findIndex((r, i) => i > 0 && ['Mercenary', 'Privateer', 'Pirate'].includes((r[nameIdx] || '').trim()));
  if (rowIdx < 0) { console.error('Pirate row not found', ''); process.exit(1); }

  for (const [field, value] of Object.entries(NEW_ROW)) {
    const idx = header.findIndex(h => h.trim() === field);
    if (idx < 0) { console.error(`  ⚠ no column "${field}"`); continue; }
    await writeCell(tab, `${colLetter(idx)}${rowIdx + 1}`, value, true);
    console.log(`  ${field} → ${value}`);
  }
  console.log('Mercenary → Privateer. Roster: 12 captains.');
}

main().catch(err => { console.error('Failed:', err.message ?? err); process.exit(1); });
