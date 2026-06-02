/**
 * Safely escapes double-quotes and wraps values inside double-quotes for CSV compliance.
 */
export function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return '""';
  const strVal = String(value);
  // Escapes quotes to double-quotes, protecting CSV boundaries
  return `"${strVal.replace(/"/g, '""')}"`;
}

/**
 * Triggers a browser-level file download of compiled report data as a CSV file.
 * Includes UTF-8 BOM headers to guarantee Microsoft Excel renders Rupee (₹) symbols properly.
 */
export function downloadCSV(
  headers: string[],
  rows: any[][],
  filename: string
): void {
  const headerRow = headers.map(csvEscape).join(',');
  const dataRows = rows.map(r => r.map(csvEscape).join(','));
  const csvText = [headerRow, ...dataRows].join('\n');

  // Excel needs standard UTF-8 Byte Order Mark to display currency symbols like ₹ correctly
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvText], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.setAttribute('href', downloadUrl);
  anchor.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
