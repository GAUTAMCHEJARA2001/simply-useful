/**
 * Safely escapes double-quotes and wraps values inside double-quotes for CSV compliance.
 */
export function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return '""';
  const strVal = String(value);
  // Escapes quotes to double-quotes, protecting CSV boundaries
  return `"${strVal.replace(/"/g, '""')}"`;
}

import { saveFileWithDialog } from '@/utils/fileDownload';

/**
 * Triggers a file download of compiled report data as a CSV file.
 * Includes UTF-8 BOM headers to guarantee Microsoft Excel renders Rupee (₹) symbols properly.
 * Supports native Windows 'Save As' path picker when available.
 */
export async function downloadCSV(
  headers: string[],
  rows: any[][],
  filename: string
): Promise<void> {
  const headerRow = headers.map(csvEscape).join(',');
  const dataRows = rows.map(r => r.map(csvEscape).join(','));
  const csvText = [headerRow, ...dataRows].join('\n');

  // Excel needs standard UTF-8 Byte Order Mark to display currency symbols like ₹ correctly
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const blob = new Blob([bom, csvText], { type: 'text/csv;charset=utf-8;' });

  await saveFileWithDialog(
    blob,
    safeFilename,
    'text/csv;charset=utf-8',
    'csv',
    'Excel CSV Spreadsheet (*.csv)'
  );
}
