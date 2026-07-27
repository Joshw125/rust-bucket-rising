/**
 * One-off: create the "Fame Cards" tab in the spreadsheet and write the three
 * Season 1 fame cards (Model A: buy with credits -> gain Fame immediately, set
 * aside, finite supply). Safe to re-run: skips tab creation if it exists and
 * rewrites the rows in place.
 *
 * Usage: npx tsx sync/push-fame-cards.ts
 */

import { google } from 'googleapis';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getSheetsClient, writeRange } from './sheets-api.js';
import { SPREADSHEET_ID } from './sheet-config.js';

const __filename = fileURLToPath(import.meta.url);
void path.dirname(__filename);

const TAB = 'Fame Cards';

const HEADER = ['Card Title', 'Station', 'Cost', 'Fame', 'Copies', 'Effect', 'Flavor Text'];

const ROWS: (string | number)[][] = [
  [
    'Sponsor Plug', 1, 4, 1, 6,
    'Pay 4 {RBR/credit.png}: gain 1 Fame. Set this card aside — it never enters your deck.',
    'A few seconds of airtime for the right logo.',
  ],
  [
    'Syndication Deal', 3, 6, 2, 4,
    'Pay 6 {RBR/credit.png}: gain 2 Fame. Set this card aside — it never enters your deck.',
    'Your best moments, rerun across a hundred systems.',
  ],
  [
    'Prime-Time Special', 5, 9, 3, 3,
    'Pay 9 {RBR/credit.png}: gain 3 Fame. Set this card aside — it never enters your deck.',
    'Top billing. The whole galaxy is watching.',
  ],
];

async function main() {
  const client = await getSheetsClient();

  // Create the tab if it doesn't exist
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some(s => s.properties?.title === TAB);
  if (!exists) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: TAB } } }],
      },
    });
    console.log(`Created tab "${TAB}"`);
  } else {
    console.log(`Tab "${TAB}" already exists — rewriting rows`);
  }

  // raw=true: Dextrous curly-brace notation must not be parsed as formulas
  await writeRange(TAB, 'A1', [HEADER, ...ROWS], true);
  console.log(`Wrote header + ${ROWS.length} fame cards to "${TAB}".`);
}

main().catch(err => {
  console.error('Push failed:', err.message ?? err);
  process.exit(1);
});
