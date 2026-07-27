/**
 * Compares cached sheet data against app data files.
 * Reports mismatches grouped by category.
 *
 * Usage: npx tsx sync/diff-sheets.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SHEETS, SheetDef } from './sheet-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')         // strip apostrophes (smart and straight)
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric runs with hyphens
    .replace(/^-|-$/g, '');       // trim leading/trailing hyphens
}

function loadCache(def: SheetDef): Record<string, string>[] | null {
  const cachePath = path.join(CACHE_DIR, def.cacheFile);
  if (!fs.existsSync(cachePath)) return null;
  return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
}

function parseNum(val: string | undefined): number | undefined {
  if (!val || val.trim() === '') return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

interface DiffResult {
  field: string;
  sheetVal: string | number | undefined;
  appVal: string | number | undefined;
}

// ─── Card Loading (dynamic import from app) ──────────────────────────────────

async function loadAppData() {
  // We read the TS files and extract data using simple parsing
  // rather than importing (which would need the full Vite/TS build chain)
  // Data moved src/data -> shared/data in the April 2026 server-authority migration
  const cardsPath = path.resolve(__dirname, '..', 'shared', 'data', 'cards.ts');
  const captainsPath = path.resolve(__dirname, '..', 'shared', 'data', 'captains.ts');
  const missionsPath = path.resolve(__dirname, '..', 'shared', 'data', 'missions.ts');

  return {
    cardsSource: fs.readFileSync(cardsPath, 'utf-8'),
    captainsSource: fs.readFileSync(captainsPath, 'utf-8'),
    missionsSource: fs.readFileSync(missionsPath, 'utf-8'),
  };
}

/**
 * Extract a numeric field value from a card object in TypeScript source.
 * Looks for patterns like `cost: 3,` within the card's object block.
 * Only searches FORWARD from the id match to avoid bleeding into adjacent cards.
 */
function extractField(source: string, cardId: string, fieldName: string): string | undefined {
  // Find the card block by its id
  const idPattern = new RegExp(`id:\\s*['"]${cardId}['"]`);
  const idMatch = idPattern.exec(source);
  if (!idMatch) return undefined;

  // Find the end of this card's object block (next `},` or `}]` at base indentation)
  const afterId = source.substring(idMatch.index);
  const blockEnd = afterId.search(/\n  \},|\n  \}\]/);
  const searchRegion = blockEnd > 0 ? afterId.substring(0, blockEnd) : afterId.substring(0, 1500);

  const fieldPattern = new RegExp(`${fieldName}:\\s*([^,}\\n]+)`);
  const fieldMatch = fieldPattern.exec(searchRegion);
  if (!fieldMatch) return undefined;

  return fieldMatch[1].trim().replace(/['"]/g, '');
}

/**
 * Extract copies field specifically (it may appear as `copies: 4`)
 */
function extractCopies(source: string, cardId: string): number | undefined {
  const val = extractField(source, cardId, 'copies');
  return val ? Number(val) : undefined;
}

function extractCost(source: string, cardId: string): number | undefined {
  const val = extractField(source, cardId, 'cost');
  return val ? Number(val) : undefined;
}

function extractInstallCost(source: string, cardId: string): number | undefined {
  const val = extractField(source, cardId, 'installCost');
  return val ? Number(val) : undefined;
}

function extractTitle(source: string, cardId: string): string | undefined {
  return extractField(source, cardId, 'title');
}

// ─── Diff Logic ──────────────────────────────────────────────────────────────

function diffActionCards(
  sheetData: Record<string, string>[],
  appSource: string,
  tier: number,
  titleCol: string = 'Card Title'
): { cardName: string; diffs: DiffResult[]; missing: boolean }[] {
  const results: { cardName: string; diffs: DiffResult[]; missing: boolean }[] = [];

  for (const row of sheetData) {
    const name = row[titleCol];
    if (!name) continue;

    const cardId = toKebabCase(name);
    const diffs: DiffResult[] = [];

    // Check if card exists in app
    if (!appSource.includes(`'${cardId}'`) && !appSource.includes(`"${cardId}"`)) {
      results.push({ cardName: name, diffs: [], missing: true });
      continue;
    }

    // Compare sheet-owned fields
    const sheetCost = parseNum(row['Credit Cost']);
    const appCost = extractCost(appSource, cardId);
    if (sheetCost !== undefined && appCost !== undefined && sheetCost !== appCost) {
      diffs.push({ field: 'cost', sheetVal: sheetCost, appVal: appCost });
    }

    const sheetInstall = parseNum(row['Installation Cost']);
    const appInstall = extractInstallCost(appSource, cardId);
    if (sheetInstall !== undefined && appInstall !== undefined && sheetInstall !== appInstall) {
      diffs.push({ field: 'installCost', sheetVal: sheetInstall, appVal: appInstall });
    }

    const sheetCopies = parseNum(row['Copies']);
    const appCopies = extractCopies(appSource, cardId);
    if (sheetCopies !== undefined && appCopies !== undefined && sheetCopies !== appCopies) {
      diffs.push({ field: 'copies', sheetVal: sheetCopies, appVal: appCopies });
    }

    if (diffs.length > 0) {
      results.push({ cardName: name, diffs, missing: false });
    }
  }

  return results;
}

function diffHazardCards(
  sheetData: Record<string, string>[],
  appSource: string
): { cardName: string; diffs: DiffResult[]; missing: boolean }[] {
  const results: { cardName: string; diffs: DiffResult[]; missing: boolean }[] = [];

  for (const row of sheetData) {
    const name = row['Card Title'];
    if (!name) continue;

    const cardId = toKebabCase(name);
    const diffs: DiffResult[] = [];

    if (!appSource.includes(`'${cardId}'`) && !appSource.includes(`"${cardId}"`)) {
      results.push({ cardName: name, diffs: [], missing: true });
      continue;
    }

    const sheetCopies = parseNum(row['Copies']);
    const appCopies = extractCopies(appSource, cardId);
    if (sheetCopies !== undefined && appCopies !== undefined && sheetCopies !== appCopies) {
      diffs.push({ field: 'copies', sheetVal: sheetCopies, appVal: appCopies });
    }

    if (diffs.length > 0) {
      results.push({ cardName: name, diffs, missing: false });
    }
  }

  return results;
}

function diffMissions(
  sheetData: Record<string, string>[],
  appSource: string
): { cardName: string; diffs: DiffResult[]; missing: boolean }[] {
  const results: { cardName: string; diffs: DiffResult[]; missing: boolean }[] = [];

  for (const row of sheetData) {
    const name = row['Title'];
    if (!name) continue;

    const cardId = toKebabCase(name);
    const diffs: DiffResult[] = [];

    if (!appSource.includes(`'${cardId}'`) && !appSource.includes(`"${cardId}"`)) {
      results.push({ cardName: name, diffs: [], missing: true });
      continue;
    }

    const sheetFame = parseNum(row['Fame']);
    const appFame = extractField(appSource, cardId, 'fame');
    if (sheetFame !== undefined && appFame !== undefined && sheetFame !== Number(appFame)) {
      diffs.push({ field: 'fame', sheetVal: sheetFame, appVal: Number(appFame) });
    }

    if (diffs.length > 0) {
      results.push({ cardName: name, diffs, missing: false });
    }
  }

  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function runDiff(): Promise<void> {
  const { cardsSource, captainsSource, missionsSource } = await loadAppData();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RUST BUCKET RISING — Sheet ↔ App Diff Report');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check cache exists
  if (!fs.existsSync(CACHE_DIR)) {
    console.log('❌ No cache found. Run `npx tsx sync/fetch-sheets.ts` first.');
    return;
  }

  const metaPath = path.join(CACHE_DIR, '_metadata.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    console.log(`Cache fetched: ${meta.fetchedAt}\n`);
  }

  let totalDiffs = 0;
  let totalMissing = 0;

  // ── Tier 1 Cards ───────────────────────────────
  const tier1 = loadCache(SHEETS.tier1);
  if (tier1) {
    const diffs = diffActionCards(tier1, cardsSource, 1);
    if (diffs.length > 0) {
      console.log('── TIER 1 CARDS ──');
      for (const d of diffs) {
        if (d.missing) {
          console.log(`  ⚠ ${d.cardName}: MISSING FROM APP`);
          totalMissing++;
        } else {
          for (const f of d.diffs) {
            console.log(`  ✗ ${d.cardName}.${f.field}: sheet=${f.sheetVal}, app=${f.appVal}`);
            totalDiffs++;
          }
        }
      }
      console.log();
    } else {
      console.log('── TIER 1 CARDS ── ✓ All match\n');
    }
  }

  // ── Tier 2 Cards ───────────────────────────────
  const tier2 = loadCache(SHEETS.tier2);
  if (tier2) {
    const diffs = diffActionCards(tier2, cardsSource, 2);
    if (diffs.length > 0) {
      console.log('── TIER 2 CARDS ──');
      for (const d of diffs) {
        if (d.missing) {
          console.log(`  ⚠ ${d.cardName}: MISSING FROM APP`);
          totalMissing++;
        } else {
          for (const f of d.diffs) {
            console.log(`  ✗ ${d.cardName}.${f.field}: sheet=${f.sheetVal}, app=${f.appVal}`);
            totalDiffs++;
          }
        }
      }
      console.log();
    } else {
      console.log('── TIER 2 CARDS ── ✓ All match\n');
    }
  }

  // ── Tier 3 Cards ───────────────────────────────
  const tier3 = loadCache(SHEETS.tier3);
  if (tier3) {
    const diffs = diffActionCards(tier3, cardsSource, 3);
    if (diffs.length > 0) {
      console.log('── TIER 3 CARDS ──');
      for (const d of diffs) {
        if (d.missing) {
          console.log(`  ⚠ ${d.cardName}: MISSING FROM APP`);
          totalMissing++;
        } else {
          for (const f of d.diffs) {
            console.log(`  ✗ ${d.cardName}.${f.field}: sheet=${f.sheetVal}, app=${f.appVal}`);
            totalDiffs++;
          }
        }
      }
      console.log();
    } else {
      console.log('── TIER 3 CARDS ── ✓ All match\n');
    }
  }

  // ── Hazard Cards ───────────────────────────────
  const hazards = loadCache(SHEETS.hazards);
  if (hazards) {
    const diffs = diffHazardCards(hazards, cardsSource);
    if (diffs.length > 0) {
      console.log('── HAZARD CARDS ──');
      for (const d of diffs) {
        if (d.missing) {
          console.log(`  ⚠ ${d.cardName}: MISSING FROM APP`);
          totalMissing++;
        } else {
          for (const f of d.diffs) {
            console.log(`  ✗ ${d.cardName}.${f.field}: sheet=${f.sheetVal}, app=${f.appVal}`);
            totalDiffs++;
          }
        }
      }
      console.log();
    } else {
      console.log('── HAZARD CARDS ── ✓ All match\n');
    }
  }

  // ── Missions ───────────────────────────────────
  for (const [key, label] of [['missionsNear', 'NEAR'], ['missionsMid', 'MID'], ['missionsDeep', 'DEEP']] as const) {
    const missions = loadCache(SHEETS[key]);
    if (missions) {
      const diffs = diffMissions(missions, missionsSource);
      if (diffs.length > 0) {
        console.log(`── MISSIONS ${label} ──`);
        for (const d of diffs) {
          if (d.missing) {
            console.log(`  ⚠ ${d.cardName}: MISSING FROM APP`);
            totalMissing++;
          } else {
            for (const f of d.diffs) {
              console.log(`  ✗ ${d.cardName}.${f.field}: sheet=${f.sheetVal}, app=${f.appVal}`);
              totalDiffs++;
            }
          }
        }
        console.log();
      } else {
        console.log(`── MISSIONS ${label} ── ✓ All match\n`);
      }
    }
  }

  // ── Summary ────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  if (totalDiffs === 0 && totalMissing === 0) {
    console.log('  ✓ All sheet-owned fields match app data!');
  } else {
    if (totalDiffs > 0) console.log(`  ${totalDiffs} field mismatch(es) found`);
    if (totalMissing > 0) console.log(`  ${totalMissing} card(s) missing from app`);
  }
  console.log('═══════════════════════════════════════════════════════════');
}

runDiff().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
