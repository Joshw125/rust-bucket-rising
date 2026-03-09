/**
 * Google Sheets API client using service account credentials.
 * Handles authentication and provides read/write methods.
 */

import { google, sheets_v4 } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { SPREADSHEET_ID } from './sheet-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

let sheetsClient: sheets_v4.Sheets | null = null;

/**
 * Initialize and return the authenticated Google Sheets client.
 */
export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Service account credentials not found at ${CREDENTIALS_PATH}\n` +
      'Follow the setup guide in the plan to create and download credentials.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets', // read + write
    ],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Read all rows from a sheet tab. Returns array of row arrays (including header).
 */
export async function readSheet(tabName: string): Promise<string[][]> {
  const client = await getSheetsClient();
  const response = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'`,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  return (response.data.values as string[][]) || [];
}

/**
 * Read a sheet and return as array of objects (using first row as headers).
 */
export async function readSheetAsObjects(tabName: string): Promise<Record<string, string>[]> {
  const rows = await readSheet(tabName);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(row => row.some(cell => cell && cell.trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        if (header) {
          obj[header] = (row[i] || '').trim();
        }
      });
      return obj;
    });
}

/**
 * Write a value to a specific cell.
 * Use raw=true for Dextrous notation containing curly braces (prevents Sheets formula parsing).
 */
export async function writeCell(tabName: string, cell: string, value: string | number, raw = false): Promise<void> {
  const client = await getSheetsClient();
  await client.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'!${cell}`,
    valueInputOption: raw ? 'RAW' : 'USER_ENTERED',
    requestBody: {
      values: [[value]],
    },
  });
}

/**
 * Write values to a range of cells.
 * Use raw=true for Dextrous notation containing curly braces (prevents Sheets formula parsing).
 */
export async function writeRange(
  tabName: string,
  startCell: string,
  values: (string | number)[][],
  raw = false
): Promise<void> {
  const client = await getSheetsClient();
  await client.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'!${startCell}`,
    valueInputOption: raw ? 'RAW' : 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Append a new row to the end of a sheet.
 * Use raw=true for Dextrous notation containing curly braces (prevents Sheets formula parsing).
 */
export async function appendRow(tabName: string, values: (string | number)[], raw = false): Promise<void> {
  const client = await getSheetsClient();
  await client.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'!A1`,
    valueInputOption: raw ? 'RAW' : 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });
}

/**
 * Find a row by matching a value in a specific column (0-indexed).
 * Returns the 1-based row number, or -1 if not found.
 */
export async function findRow(
  tabName: string,
  columnIndex: number,
  searchValue: string
): Promise<number> {
  const rows = await readSheet(tabName);
  for (let i = 1; i < rows.length; i++) { // skip header
    if (rows[i][columnIndex]?.trim().toLowerCase() === searchValue.toLowerCase()) {
      return i + 1; // 1-based for Sheets API
    }
  }
  return -1;
}
