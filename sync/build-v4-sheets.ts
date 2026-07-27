/**
 * Build the v4 card tabs from the approved CARD-REWORK-V2 (+V2.1 addendum) design.
 *
 * Creates: "v4 Core Action Cards", "v4 Tier 2 Market Cards", "v4 Tier 3 Market Cards",
 *          "Captains v4"
 * - Headers are mirrored from the corresponding v3 tab (so Dextrous field mappings
 *   keep working — just re-point Dextrous at the v4 tabs).
 * - Unchanged cards are copied VERBATIM from v3.
 * - Culled cards are skipped: Impulse Boosters, Thruster Array, Energy Recoil,
 *   Credit Surge (T2), Singularity Drive (T3).
 * - Changed cards get fully authored rows; cost-only changes copy the v3 row and
 *   patch the cost.
 * Safe to re-run (rewrites tabs in place).
 *
 * Usage: npx tsx sync/build-v4-sheets.ts
 */

import { getSheetsClient, readSheet, writeRange } from './sheets-api.js';
import { SPREADSHEET_ID } from './sheet-config.js';

type Row = Record<string, string | number>;

const GEAR = '{RBR/gear.png}';

// ─── Authored rows (canonical field names) ────────────────────────────────────

// T1: only Weapons Core changes (install text)
const T1_PATCH: Record<string, Partial<Row>> = {
  'Weapons Core': {
    'Installation Text': 'Your {weapons: Weapons} abilities cost 1⚡ less.',
  },
};

const T2_CULL = ['Impulse Boosters', 'Thruster Array', 'Energy Recoil', 'Credit Surge'];
const T3_CULL = ['Singularity Drive'];

// Cost-only patches
const T2_COST_PATCH: Record<string, number> = {
  'Efficient Routing': 5,
  'Feedback Surge': 5,
  'Afterburner Surge': 5,
};
const T3_COST_PATCH: Record<string, number> = {
  'Salvage Network': 7,
};

// Fully authored replacements (matched by Card Title; replaces the v3 row)
const T2_REWORK: Row[] = [
  {
    'Card Title': 'Refit Contract', 'Installable': GEAR, 'Credit Cost': 5, 'Installation Cost': 3, 'Fame': 1,
    'Effect When Played': '+2 {RBR/credit.png}. You may {RBR/trashcan.png} a card.',
    'Installation Text': 'Cards you buy go to your hand instead of your discard pile.',
    'Flavor Text': 'Factory-fresh. Pre-installed. Slightly haunted.', 'Copies': 1, 'System': 'Logistics',
  },
  {
    'Card Title': 'Market Insider', 'Installable': GEAR, 'Credit Cost': 4, 'Installation Cost': 4, 'Fame': '',
    'Effect When Played': '+2 {RBR/credit.png}',
    'Installation Text': 'You may buy from any station’s market, regardless of your location.',
    'Flavor Text': 'She knows a guy. The guy also knows a guy.', 'Copies': 1, 'System': 'Logistics',
  },
  {
    'Card Title': 'Remote Uplink', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': 'Reallocate up to 3⚡ among your systems. +1 {RBR/card.png}',
    'Installation Text': 'Once per turn: reallocate 1⚡ between your systems.',
    'Flavor Text': 'Power goes where the paperwork says it goes.', 'Copies': 1, 'System': 'Computers',
  },
  {
    'Card Title': 'Cargo Jettison', 'Installable': GEAR, 'Credit Cost': 5, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '{RBR/trashcan.png} a card: +2⚡ (any system)',
    'Installation Text': '+1⚡ (any system) each turn.',
    'Flavor Text': 'Weight is the enemy. So is the cargo manifest.', 'Copies': 1, 'System': 'Logistics',
  },
  {
    'Card Title': 'Synced Loop', 'Installable': GEAR, 'Credit Cost': 5, 'Installation Cost': 3, 'Fame': 1,
    'Effect When Played': '+1⚡ (any system) for each card installed on your ship.',
    'Installation Text': 'When you install another card: +2⚡ (any system).',
    'Flavor Text': 'All systems nominal. All systems talking. Constantly.', 'Copies': 1, 'System': 'Computers',
  },
];

const T2_NEW: Row[] = [
  {
    'Card Title': 'Scrap Furnace', 'Installable': GEAR, 'Credit Cost': 5, 'Installation Cost': 3, 'Fame': 1,
    'Effect When Played': '{RBR/trashcan.png} a card: +2⚡ (any system)',
    'Installation Text': 'Any number of times on your turn: discard a card → +1⚡ (any system).',
    'Flavor Text': 'One ship’s trash is the same ship’s thrust.', 'Copies': 1, 'System': 'Logistics',
  },
  {
    'Card Title': 'Intimidation', 'Installable': GEAR, 'Credit Cost': 4, 'Installation Cost': 3, 'Fame': '',
    'Effect When Played': '+1⚡ to {weapons: Weapons}. This turn, you may spend {weapons: Weapons} ⚡ as {RBR/credit.png} when buying.',
    'Installation Text': 'Once per turn: convert up to 2 {weapons: Weapons} ⚡ into 2 {RBR/credit.png}.',
    'Flavor Text': 'Nice little shop. Shame if something happened to it.', 'Copies': 1, 'System': 'Weapons',
  },
  {
    'Card Title': 'Pursuit Drive', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 3, 'Fame': '',
    'Effect When Played': '+1 {RBR/move.png}, +1⚡ (any system)',
    'Installation Text': 'Once per turn: move directly to any location where another player is.',
    'Flavor Text': 'Where are YOU going?', 'Copies': 1, 'System': 'Engines',
  },
  {
    'Card Title': 'Remote Ops', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 3, 'Fame': '',
    'Effect When Played': '+1 {RBR/card.png}, +1⚡ (any system)',
    'Installation Text': 'You may complete missions at locations adjacent to yours as if you were there.',
    'Flavor Text': 'Technically present. Legally distinct.', 'Copies': 1, 'System': 'Computers',
  },
  {
    'Card Title': 'Repulsor Blast', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': 'Push a player at your location 1 space (you choose the direction). +1⚡ (any system)',
    'Installation Text': 'If you pushed a player this turn: +1⚡ (any system).',
    'Flavor Text': 'Personal space. Enforced.', 'Copies': 1, 'System': 'Weapons',
  },
  {
    'Card Title': 'Survey Probes', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '+1 {RBR/card.png}',
    'Installation Text': 'You may look at face-down missions at locations adjacent to yours.',
    'Flavor Text': 'Spoilers, but for planets.', 'Copies': 1, 'System': 'Computers',
  },
  {
    'Card Title': 'Overdrive Governor', 'Installable': GEAR, 'Credit Cost': 4, 'Installation Cost': 3, 'Fame': '',
    'Effect When Played': '+2⚡ (any system)',
    'Installation Text': 'Your systems can hold 8⚡ instead of 6.',
    'Flavor Text': 'The warranty voided itself.', 'Copies': 1, 'System': 'Engines',
  },
  {
    'Card Title': 'Auto-Dock', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '+1 {RBR/credit.png}, +1 {RBR/move.png}',
    'Installation Text': 'When you move onto a station: +1 {RBR/credit.png}.',
    'Flavor Text': 'Parking validated.', 'Copies': 1, 'System': 'Logistics',
  },
  {
    'Card Title': 'Express Lane', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '+2 {RBR/credit.png}',
    'Installation Text': 'Cards you buy may be placed on top of your deck.',
    'Flavor Text': 'Same-day delivery, most days.', 'Copies': 1, 'System': 'Logistics',
  },
  {
    'Card Title': 'Salvage Rig', 'Installable': GEAR, 'Credit Cost': 4, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '+1⚡ (any system). Clear one of your {RBR/hazard.png} for free.',
    'Installation Text': 'When you clear a {RBR/hazard.png}: +1⚡ (any system).',
    'Flavor Text': 'Every disaster is inventory.', 'Copies': 1, 'System': 'Weapons',
  },
  {
    'Card Title': 'Siphon Array', 'Installable': GEAR, 'Credit Cost': 4, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': 'Steal 1⚡ from a player at your location (you choose the system).',
    'Installation Text': '+1⚡ to {weapons: Weapons} each turn.',
    'Flavor Text': 'Sharing is caring. Involuntarily.', 'Copies': 1, 'System': 'Weapons',
  },
  {
    'Card Title': 'Leech Coupling', 'Installable': GEAR, 'Credit Cost': 4, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '+1 {RBR/card.png}, +1⚡ (any system)',
    'Installation Text': 'When another player at your location completes a mission: +1⚡ (any system).',
    'Flavor Text': 'Success is contagious. Latch on.', 'Copies': 1, 'System': 'Computers',
  },
  {
    'Card Title': 'Overclocked Processor', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '+2⚡ to {computers: Computers}',
    'Installation Text': 'Your {computers: Computers} 1⚡ ability draws 2 {RBR/card.png}.',
    'Flavor Text': 'It only catches fire a little.', 'Copies': 1, 'System': 'Computers',
  },
  {
    'Card Title': 'Fuel Injector', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '+2⚡ to {engines: Engines}',
    'Installation Text': 'Your {engines: Engines} 1⚡ ability moves 2 spaces.',
    'Flavor Text': 'Kicks like a mule with a grudge.', 'Copies': 1, 'System': 'Engines',
  },
  {
    'Card Title': 'Bulk Contracts', 'Installable': GEAR, 'Credit Cost': 3, 'Installation Cost': 2, 'Fame': '',
    'Effect When Played': '+2⚡ to {logistics: Logistics}',
    'Installation Text': 'Your {logistics: Logistics} 1⚡ ability yields 2 {RBR/credit.png}.',
    'Flavor Text': 'Buy in bulk. Sell in bulk. Sleep in bulk.', 'Copies': 1, 'System': 'Logistics',
  },
];

const T3_REWORK: Row[] = [
  {
    'Card Title': 'Chain Reaction', 'Installable': GEAR, 'Credit Cost': 6, 'Installation Cost': 3, 'Fame': 1,
    'Effect When Played': 'Give a {RBR/hazard.png} to up to 2 different opponents. +2⚡ (any system) per {RBR/hazard.png} given.',
    'Installation Text': 'Your {RBR/hazard.png}-giving cards and abilities may target players at any location.',
    'Flavor Text': 'One thing led to another. Explosively.', 'Copies': 1, 'System': 'Weapons',
  },
  {
    'Card Title': 'Scorch Protocol', 'Installable': GEAR, 'Credit Cost': 5, 'Installation Cost': 4, 'Fame': 1,
    'Effect When Played': '+4⚡ (any system). If you cleared a {RBR/hazard.png} this turn: +1 Fame.',
    'Installation Text': '+2⚡ (any system) each turn.',
    'Flavor Text': 'Fire solves most problems it starts.', 'Copies': 1, 'System': 'Weapons',
  },
  {
    'Card Title': 'Temporal Jump', 'Installable': '', 'Credit Cost': 8, 'Installation Cost': '', 'Fame': 1,
    'Effect When Played': 'Once per game: take an extra turn after this one.',
    'Installation Text': '',
    'Flavor Text': 'The producers swear this violates nothing important.', 'Copies': 1, 'System': 'Computers',
  },
  {
    'Card Title': 'Phase Skip Drive', 'Installable': '', 'Credit Cost': 6, 'Installation Cost': '', 'Fame': 2,
    'Effect When Played': '+3 {RBR/move.png}. Missions cost 2⚡ less this turn.',
    'Installation Text': '',
    'Flavor Text': 'Skip the traffic. Skip the physics.', 'Copies': 1, 'System': 'Engines',
  },
  {
    'Card Title': 'Trade Nexus', 'Installable': GEAR, 'Credit Cost': 7, 'Installation Cost': 4, 'Fame': 2,
    'Effect When Played': '+4 {RBR/credit.png}',
    'Installation Text': 'When you buy a card: +1⚡ (any system).',
    'Flavor Text': 'Everything is for sale, including the sale.', 'Copies': 1, 'System': 'Logistics',
  },
];

// Captains v4 (arrays sum to 5; abilities per CARD-REWORK-V2 §6)
const CAPTAINS_V4: Row[] = [
  { 'Captain Name': 'Scientist', 'Starting Power': 'W0 C3 E1 L1', 'Effect': 'Your {computers: Computers} 3⚡ ability keeps 2 {RBR/card.png}.', 'Flavor Text': 'Peer review is for survivors.', 'Image': 'scientist.png' },
  { 'Captain Name': 'Veteran', 'Starting Power': 'W3 C1 E1 L0', 'Effect': 'When you give a {RBR/hazard.png}: +1⚡ (any system).', 'Flavor Text': 'Seven-time returning contestant. The producers hate him.', 'Image': 'veteran.png' },
  { 'Captain Name': 'Navigator', 'Starting Power': 'W1 C1 E3 L0', 'Effect': 'Once per turn: 1 {RBR/move.png} for free.', 'Flavor Text': 'Routes? No. I make jumps.', 'Image': 'navigator.png' },
  { 'Captain Name': 'Scrapper', 'Starting Power': 'W1 C1 E0 L3', 'Effect': 'When you {RBR/trashcan.png} a card: +1 {RBR/credit.png}.', 'Flavor Text': 'Nothing is useless. Some things are just waiting.', 'Image': 'scrapper.png' },
  { 'Captain Name': 'Tycoon', 'Starting Power': 'W0 C2 E1 L2', 'Effect': 'Your {RBR/credit.png} carry over between turns (max 3).', 'Flavor Text': 'Profit first. Then plasma.', 'Image': 'tycoon.png' },
  { 'Captain Name': 'Broker', 'Starting Power': 'W1 C2 E0 L2', 'Effect': 'Once per turn: activate one system ability twice.', 'Flavor Text': 'Deals don’t wait. Neither do I.', 'Image': 'broker.png' },
  { 'Captain Name': 'Engineer', 'Starting Power': 'W1 C2 E1 L1', 'Effect': 'When you install a card: +2⚡ (any system).', 'Flavor Text': 'Give me duct tape and I’ll give you a fleet.', 'Image': 'engineer.png' },
  { 'Captain Name': 'Mercenary', 'Starting Power': 'W2 C1 E2 L0', 'Effect': 'When you give a {RBR/hazard.png}: +1 {RBR/credit.png}.', 'Flavor Text': 'A little chaos pays the bills.', 'Image': 'mercenary.png' },
  { 'Captain Name': 'Daredevil', 'Starting Power': 'W2 C1 E1 L1', 'Effect': 'When you clear a {RBR/hazard.png}: +1⚡ (any system) and +1 {RBR/credit.png}.', 'Flavor Text': 'Presumed dead after Season 4. Showed up anyway.', 'Image': 'daredevil.png' },
];

// ─── Build machinery ─────────────────────────────────────────────────────────

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

function toRowArray(header: string[], row: Row): (string | number)[] {
  return header.map(h => (h in row ? row[h] : ''));
}

async function buildCardTab(srcTab: string, dstTab: string, opts: {
  cull?: string[]; costPatch?: Record<string, number>; patch?: Record<string, Partial<Row>>;
  rework?: Row[]; add?: Row[];
}) {
  const src = await readSheet(srcTab);
  const header = src[0];
  const titleIdx = header.findIndex(h => h.trim() === 'Card Title');
  const costIdx = header.findIndex(h => h.trim() === 'Credit Cost');

  const reworkByTitle = new Map((opts.rework ?? []).map(r => [String(r['Card Title']).toLowerCase(), r]));
  const out: (string | number)[][] = [header];

  for (let i = 1; i < src.length; i++) {
    const row = [...src[i]];
    while (row.length < header.length) row.push('');
    const title = (row[titleIdx] || '').trim();
    if (!title) continue;
    if (opts.cull?.some(c => c.toLowerCase() === title.toLowerCase())) { console.log(`  culled: ${title}`); continue; }

    const rework = reworkByTitle.get(title.toLowerCase());
    if (rework) { out.push(toRowArray(header, rework)); reworkByTitle.delete(title.toLowerCase()); continue; }

    if (opts.costPatch && title in opts.costPatch) row[costIdx] = String(opts.costPatch[title]);
    const patch = opts.patch?.[title];
    if (patch) for (const [k, v] of Object.entries(patch)) {
      const idx = header.findIndex(h => h.trim() === k);
      if (idx >= 0) row[idx] = String(v);
    }
    out.push(row);
  }
  // Any rework rows whose v3 original wasn't found are appended (shouldn't happen, but safe)
  for (const r of reworkByTitle.values()) out.push(toRowArray(header, r));
  for (const r of opts.add ?? []) out.push(toRowArray(header, r));

  await ensureTab(dstTab);
  await writeRange(dstTab, 'A1', out, true);
  console.log(`${dstTab}: ${out.length - 1} cards written.`);
}

async function buildCaptainsTab() {
  const header = ['Captain Name', 'Starting Power', 'Effect', 'Flavor Text', 'Image'];
  const out = [header, ...CAPTAINS_V4.map(r => toRowArray(header, r))];
  await ensureTab('Captains v4');
  await writeRange('Captains v4', 'A1', out, true);
  console.log(`Captains v4: ${out.length - 1} captains written.`);
}

async function main() {
  await buildCardTab('v3 Core Action Cards', 'v4 Core Action Cards', { patch: T1_PATCH });
  await buildCardTab('v3 Tier 2 Market Cards', 'v4 Tier 2 Market Cards', {
    cull: T2_CULL, costPatch: T2_COST_PATCH, rework: T2_REWORK, add: T2_NEW,
  });
  await buildCardTab('v3 Tier 3 Market Cards', 'v4 Tier 3 Market Cards', {
    cull: T3_CULL, costPatch: T3_COST_PATCH, rework: T3_REWORK,
  });
  await buildCaptainsTab();
  console.log('\nDone. Re-point Dextrous data sources at the v4 tabs.');
}

main().catch(err => { console.error('Build failed:', err.message ?? err); process.exit(1); });
