/**
 * Build "v3 Missions Near/Middle/Deep" tabs from the v2 tabs: copy verbatim,
 * patch the 9 reworked rewards (CARD-REWORK-V2 §4, approved), and switch
 * Forgotten Vault's reward type gear→bolt. Also patches Echo Engine's play
 * effect in "v4 Tier 3 Market Cards" (interactive version, approved).
 * Safe to re-run.
 *
 * Usage: npx tsx sync/build-v3-missions.ts
 */

import { getSheetsClient, readSheet, writeRange } from './sheets-api.js';
import { SPREADSHEET_ID } from './sheet-config.js';

const REWARD_PATCH: Record<string, { text: string; type?: string }> = {
  'Signal Boost': { text: '+1⚡ each turn.' },
  'System Check': { text: 'At turn start, you may reallocate 1⚡ between systems.' },
  'Merchant Escort': { text: 'Your {logistics: Logistics} 1⚡ ability yields 2 {RBR/credit.png}.' },
  'Trade Route Mapping': { text: 'When you buy a card: +1⚡ (any system).' },
  'Deep Void Courier': { text: '+1⚡ and +1 {RBR/credit.png} each turn.' },
  'Adaptive Drone Deployment': { text: 'At turn start: +1⚡ to your lowest system.' },
  'Forbidden Artifact': { text: '+2⚡ each turn. Game end: −2 Fame if still installed on your ship.' },
  'Quantum Proxy Hack': { text: '+2⚡ each turn.' },
  'Forgotten Vault': { text: '+3⚡ (any system). You may {RBR/trashcan.png} up to 2 cards from your hand or discard.', type: 'bolt.png' },
  // Round 2: the two fiddly violations missed by the first sweep
  'Asteroid Siege': { text: '+2⚡ each turn. When you receive a {RBR/hazard.png}: +1⚡ (any system).' },
  'Fleet Arbitration': { text: '+1⚡ (any system). When you move onto a station: +2 {RBR/credit.png}.' },
};

const MISSION_TABS: Array<[string, string]> = [
  ['v2 Missions Near', 'v3 Missions Near'],
  ['v2 Missions Middle', 'v3 Missions Middle'],
  ['v2 Missions Deep', 'v3 Missions Deep'],
];

async function ensureTab(title: string) {
  const client = await getSheetsClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  if (!meta.data.sheets?.some(s => s.properties?.title === title)) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
    console.log(`Created tab "${title}"`);
  }
}

async function main() {
  let patched = 0;
  for (const [src, dst] of MISSION_TABS) {
    const rows = await readSheet(src);
    const header = rows[0];
    const titleIdx = header.findIndex(h => h.trim() === 'Title');
    const textIdx = header.findIndex(h => h.trim() === 'Reward Text');
    const typeIdx = header.findIndex(h => h.trim() === 'Reward Type');

    const out = rows.map((r, i) => {
      if (i === 0) return r;
      const row = [...r];
      while (row.length < header.length) row.push('');
      const patch = REWARD_PATCH[(row[titleIdx] || '').trim()];
      if (patch) {
        row[textIdx] = patch.text;
        if (patch.type) row[typeIdx] = patch.type;
        patched++;
        console.log(`  patched: ${row[titleIdx]}`);
      }
      return row;
    });

    await ensureTab(dst);
    await writeRange(dst, 'A1', out, true);
    console.log(`${dst}: ${out.length - 1} missions written.`);
  }
  console.log(`Total reward patches: ${patched} (expect 11)`);

  // Echo Engine — interactive play effect in the v4 T3 tab
  const t3 = await readSheet('v4 Tier 3 Market Cards');
  const h = t3[0];
  const tIdx = h.findIndex(x => x.trim() === 'Card Title');
  const eIdx = h.findIndex(x => x.trim() === 'Effect When Played');
  const rowNum = t3.findIndex((r, i) => i > 0 && (r[tIdx] || '').trim() === 'Echo Engine');
  if (rowNum > 0) {
    const colLetter = String.fromCharCode(65 + eIdx);
    await writeRange('v4 Tier 3 Market Cards', `${colLetter}${rowNum + 1}`,
      [['Play a copy of the top card of any player’s discard pile.']], true);
    console.log('Echo Engine: play effect updated (any player’s discard).');
  } else {
    console.error('⚠ Echo Engine not found in v4 Tier 3 tab!');
  }
}

main().catch(err => { console.error('Build failed:', err.message ?? err); process.exit(1); });
