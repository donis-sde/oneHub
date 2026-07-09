/* eslint-disable */
// @ts-nocheck
import { google } from 'googleapis';

const WABA_SHEET_ID =
  process.env.WABA_DISCOUNTS_SHEET_ID ||
  '13CHWwyWoN-xKy2uqs4IIRuzS9Ikvrgbo2WdfjRB9IIQ';
const WABA_SHEET_NAME = process.env.WABA_DISCOUNTS_SHEET_NAME || 'Sheet1';

const SHEETS_READ_SCOPE =
  'https://www.googleapis.com/auth/spreadsheets.readonly';

export interface WabaDiscountRow {
  type: string;
  discount: number | null;
  start_date: string;
  end_date: string;
}

/**
 * Parse Sheets API values (array of arrays) into rows of { type, discount, start_date, end_date }.
 * First row is treated as header and skipped.
 */
export function parseWabaValues(values: unknown[][]): WabaDiscountRow[] {
  if (!Array.isArray(values) || values.length < 2) return [];
  const rows: WabaDiscountRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] as unknown[];
    const type = (row[0] != null ? String(row[0]) : '').trim();
    if (!type) continue;
    const discountRaw = row[1];
    const discount =
      discountRaw !== '' && discountRaw != null ? Number(discountRaw) : null;
    const start_date = (row[2] != null ? String(row[2]) : '').trim();
    const end_date = (row[3] != null ? String(row[3]) : '').trim();
    rows.push({
      type,
      discount: discount != null && !Number.isNaN(discount) ? discount : null,
      start_date,
      end_date,
    });
  }
  return rows;
}

/**
 * Fetch WABA discounts from Google Sheet via Sheets API using application default credentials.
 * Share the sheet with the Cloud Run service account email as Viewer.
 */
export async function fetchWabaDiscountsSheet(): Promise<WabaDiscountRow[]> {
  const auth = new google.auth.GoogleAuth({
    scopes: [SHEETS_READ_SCOPE],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${WABA_SHEET_NAME}!A:D`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: WABA_SHEET_ID,
    range,
  });
  const values = (res.data.values || []) as unknown[][];
  return parseWabaValues(values);
}

/**
 * Check if a date string is between start and end (inclusive).
 * Accepts various date formats (YYYY-MM-DD, M/D/YYYY, etc.) via Date parse.
 */
export function isDateInRange(
  dateStr: string,
  startStr: string,
  endStr: string,
): boolean {
  const d = new Date(dateStr);
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (
    Number.isNaN(d.getTime()) ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  )
    return false;
  return d >= start && d <= end;
}

/**
 * Normalize discount to percent (usage calculator expects percent, e.g. 7 for 7%).
 * Sheet may store decimal (0.07); we return 7 so formula (1 - x/100) works.
 */
export function discountToPercent(discount: number | null): number | null {
  if (discount == null || Number.isNaN(discount)) return null;
  if (discount > 0 && discount < 1) return discount * 100;
  return discount;
}

/**
 * Get WABA discount for a type from sheet data. Same logic as BQ:
 * - Rows where current date is between start_date and end_date
 * - Per type, take the one with latest start_date
 * - Return discount for the given type (as percent, e.g. 15 for 15%)
 */
export function getWabaDiscountForType(
  type: string,
  rows: WabaDiscountRow[],
): number | null {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const inRange = rows.filter((r) =>
    isDateInRange(todayStr, r.start_date, r.end_date),
  );
  const byType: Record<string, WabaDiscountRow> = {};
  inRange.forEach((r) => {
    const existing = byType[r.type];
    if (!existing || r.start_date > existing.start_date) {
      byType[r.type] = r;
    }
  });
  const row = byType[type];
  return row?.discount != null ? discountToPercent(row.discount) : null;
}

/**
 * Get WABA discount for type by fetching the sheet and applying the same logic as BQ.
 * Used by usage calculator instead of BigQuery (sheet is source of gs_wati.waba_discounts).
 * @param type - e.g. AUTHENTICATION, MARKETING, UTILITY, SERVICE
 * @returns Promise<number | null> - discount in percent (e.g. 15 for 15%), or null if not found
 */
export async function getWabaDiscountFromSheet(
  type: string,
): Promise<number | null> {
  const rows = await fetchWabaDiscountsSheet();
  return getWabaDiscountForType(type, rows);
}
