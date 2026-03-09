/**
 * Fetches all sheet tabs from Google Sheets API and saves to local JSON cache.
 *
 * Usage: npx tsx sync/fetch-sheets.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SHEETS } from './sheet-config.js';
import { readSheetAsObjects } from './sheets-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');

async function fetchAllSheets(): Promise<void> {
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const metadata: Record<string, { rows: number; fetchedAt: string }> = {};
  const errors: string[] = [];

  console.log('Fetching sheets from Google Sheets API...\n');

  for (const [key, def] of Object.entries(SHEETS)) {
    try {
      process.stdout.write(`  ${def.tabName}... `);
      const data = await readSheetAsObjects(def.tabName);

      const cachePath = path.join(CACHE_DIR, def.cacheFile);
      fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));

      metadata[key] = {
        rows: data.length,
        fetchedAt: new Date().toISOString(),
      };

      console.log(`${data.length} rows ✓`);
    } catch (err: any) {
      const msg = `Failed to fetch "${def.tabName}": ${err.message}`;
      errors.push(msg);
      console.log(`FAILED ✗`);
      console.error(`    ${err.message}`);
    }
  }

  // Write metadata
  const metaPath = path.join(CACHE_DIR, '_metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    spreadsheetId: '1wkwNEjC75ph0bmO6p5omltYcFbUC7eoBeFFVmZblqiA',
    fetchedAt: new Date().toISOString(),
    sheets: metadata,
  }, null, 2));

  console.log('\n---');
  const successCount = Object.keys(metadata).length;
  const totalCount = Object.keys(SHEETS).length;
  console.log(`Fetched ${successCount}/${totalCount} sheets.`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log(`\nCache saved to: ${CACHE_DIR}`);
}

fetchAllSheets().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
