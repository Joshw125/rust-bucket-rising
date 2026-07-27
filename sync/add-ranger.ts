/**
 * Append The Ranger to Captains v4 (approved).
 * Usage: npx tsx sync/add-ranger.ts
 */
import { readSheet, appendRow } from './sheets-api.js';

async function main() {
  const rows = await readSheet('Captains v4');
  const nameIdx = rows[0].findIndex(h => h.trim() === 'Captain Name');
  if (rows.some((r, i) => i > 0 && (r[nameIdx] || '').trim() === 'Ranger')) {
    console.log('Ranger already present — skipping.');
    return;
  }
  await appendRow('Captains v4', [
    'Ranger',
    'W2 C0 E2 L1',
    'At the start of your turn, if you’re not at a station: +1⚡.',
    'The stations smell like recycled air and lies.',
    'ranger.png',
  ], true);
  console.log('Ranger appended. Roster: 12 captains.');
}

main().catch(err => { console.error('Failed:', err.message ?? err); process.exit(1); });
