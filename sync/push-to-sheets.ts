/**
 * Push changes from app data to Google Sheets.
 * Can update specific cells or generate a full diff report of what needs pushing.
 *
 * Usage:
 *   npx tsx sync/push-to-sheets.ts report          — show what's different
 *   npx tsx sync/push-to-sheets.ts captain <name>   — push a captain's data to sheet
 *   npx tsx sync/push-to-sheets.ts cell <tab> <cell> <value> — write a single cell
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SHEETS } from './sheet-config.js';
import { readSheetAsObjects, writeCell, findRow, writeRange } from './sheets-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Captain Push ────────────────────────────────────────────────────────────

interface CaptainAppData {
  name: string;
  effect: string;
  flavor: string;
  image: string;
}

/**
 * Read captain data from the app's captains.ts source file.
 */
function readAppCaptains(): CaptainAppData[] {
  const captainsPath = path.resolve(__dirname, '..', 'src', 'data', 'captains.ts');
  const source = fs.readFileSync(captainsPath, 'utf-8');

  const captains: CaptainAppData[] = [];

  // Split into individual captain object blocks (each starts with `  {`)
  const blocks = source.split(/\n  \{/).slice(1);

  for (const block of blocks) {
    const extractStr = (field: string): string => {
      // Handle single-quoted strings (possibly with escaped single quotes inside)
      const singleQ = block.match(new RegExp(`${field}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
      if (singleQ) return singleQ[1].replace(/\\'/g, "'");
      // Handle double-quoted strings
      const doubleQ = block.match(new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
      if (doubleQ) return doubleQ[1].replace(/\\"/g, '"');
      return '';
    };

    const name = extractStr('name');
    if (!name) continue;

    captains.push({
      name,
      effect: extractStr('effect'),
      flavor: extractStr('flavor'),
      image: extractStr('image'),
    });
  }

  return captains;
}

async function pushCaptain(captainName: string): Promise<void> {
  const appCaptains = readAppCaptains();
  const captain = appCaptains.find(
    c => c.name.toLowerCase() === captainName.toLowerCase()
  );

  if (!captain) {
    console.log(`Captain "${captainName}" not found in app. Available:`);
    appCaptains.forEach(c => console.log(`  - ${c.name}`));
    return;
  }

  console.log(`Pushing captain "${captain.name}" to sheet...`);

  // Find the row in the sheet
  const rowNum = await findRow('Captains', 0, captain.name);
  if (rowNum === -1) {
    console.log(`Captain "${captain.name}" not found in Google Sheet.`);
    console.log('You may need to add a new row manually.');
    return;
  }

  // Sheet columns: Captain Name (A), Effect (B), Flavor Text (C), Image (D)
  const values = [[captain.name, captain.effect, captain.flavor, captain.image]];
  await writeRange('Captains', `A${rowNum}`, values);

  console.log(`✓ Updated row ${rowNum} in Captains sheet:`);
  console.log(`  Name: ${captain.name}`);
  console.log(`  Effect: ${captain.effect}`);
  console.log(`  Flavor: ${captain.flavor}`);
  console.log(`  Image: ${captain.image}`);
}

async function pushAllCaptains(): Promise<void> {
  const appCaptains = readAppCaptains();
  const sheetCaptains = await readSheetAsObjects('Captains');

  console.log('Comparing app captains vs sheet captains...\n');

  let updates = 0;
  for (const appCap of appCaptains) {
    const sheetCap = sheetCaptains.find(
      s => s['Captain Name']?.toLowerCase() === appCap.name.toLowerCase()
    );

    if (!sheetCap) {
      console.log(`  ⚠ ${appCap.name}: NOT IN SHEET (needs adding)`);
      continue;
    }

    const diffs: string[] = [];
    if (sheetCap['Effect'] !== appCap.effect) {
      diffs.push(`Effect: "${sheetCap['Effect']}" → "${appCap.effect}"`);
    }
    if (sheetCap['Flavor Text'] !== appCap.flavor) {
      diffs.push(`Flavor: differs`);
    }
    if (sheetCap['Image'] !== appCap.image) {
      diffs.push(`Image: "${sheetCap['Image']}" → "${appCap.image}"`);
    }

    if (diffs.length > 0) {
      console.log(`  ✗ ${appCap.name}:`);
      diffs.forEach(d => console.log(`      ${d}`));
      updates++;
    } else {
      console.log(`  ✓ ${appCap.name}: matches`);
    }
  }

  if (updates > 0) {
    console.log(`\n${updates} captain(s) differ. Use 'npx tsx sync/push-to-sheets.ts captain <name>' to push individual updates.`);
    console.log(`Or use 'npx tsx sync/push-to-sheets.ts captains-all' to push all.`);
  } else {
    console.log('\nAll captains match!');
  }
}

async function forceAllCaptains(): Promise<void> {
  const appCaptains = readAppCaptains();
  console.log(`Pushing all ${appCaptains.length} captains to sheet...\n`);

  for (const captain of appCaptains) {
    await pushCaptain(captain.name);
    console.log();
  }

  console.log('Done!');
}

// ─── Single Cell Write ───────────────────────────────────────────────────────

async function writeSingleCell(tabName: string, cell: string, value: string): Promise<void> {
  console.log(`Writing to '${tabName}'!${cell}: "${value}"`);
  await writeCell(tabName, cell, value);
  console.log('✓ Done');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'report':
    case 'captains':
      await pushAllCaptains();
      break;

    case 'captain':
      if (!args[1]) {
        console.log('Usage: npx tsx sync/push-to-sheets.ts captain <name>');
        return;
      }
      await pushCaptain(args[1]);
      break;

    case 'captains-all':
      await forceAllCaptains();
      break;

    case 'cell':
      if (args.length < 4) {
        console.log('Usage: npx tsx sync/push-to-sheets.ts cell "<tab name>" <cell> <value>');
        return;
      }
      await writeSingleCell(args[1], args[2], args[3]);
      break;

    default:
      console.log('Usage:');
      console.log('  npx tsx sync/push-to-sheets.ts report          — compare captains');
      console.log('  npx tsx sync/push-to-sheets.ts captain <name>  — push one captain');
      console.log('  npx tsx sync/push-to-sheets.ts captains-all    — push all captains');
      console.log('  npx tsx sync/push-to-sheets.ts cell <tab> <cell> <value> — write cell');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
