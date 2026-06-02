/**
 * Financial Year (FY) Utilities
 * Indian FY: April 1 → March 31
 * FY string format: "2024-25" (start year - last 2 digits of end year)
 */

// Configurable FY start month (0-indexed). 3 = April.
export const FY_START_MONTH = 3;

// Number of past FYs to show in selector (excluding current)
export const FY_HISTORY_COUNT = 4;

export interface FYBounds {
  /** Inclusive start: April 1 00:00:00 local time */
  start: Date;
  /** Exclusive end: April 1 of NEXT year 00:00:00 local time */
  endExclusive: Date;
}

/**
 * Returns FY string for a given Date.
 * e.g. new Date('2025-03-15') → "2024-25"
 *      new Date('2025-04-01') → "2025-26"
 */
export function getFYForDate(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  const startYear = month >= FY_START_MONTH ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
}

/**
 * Returns the current FY string based on today's date.
 */
export function getCurrentFY(): string {
  return getFYForDate(new Date());
}

/**
 * Parses a FY string like "2024-25" and returns inclusive start and
 * exclusive end dates (safe for any time-of-day comparison).
 */
export function getFYBounds(fy: string): FYBounds {
  const parts = fy.split('-');
  if (parts.length !== 2) {
    // Fallback: current FY
    return getFYBounds(getCurrentFY());
  }
  const startYear = parseInt(parts[0], 10);
  if (isNaN(startYear)) return getFYBounds(getCurrentFY());
  const endYear = startYear + 1;

  // April 1 of startYear at midnight local time
  const start = new Date(startYear, FY_START_MONTH, 1, 0, 0, 0, 0);
  // April 1 of endYear at midnight local time (exclusive upper bound)
  const endExclusive = new Date(endYear, FY_START_MONTH, 1, 0, 0, 0, 0);

  return { start, endExclusive };
}

/**
 * Returns an array of FY strings, most recent first.
 * Includes current FY + FY_HISTORY_COUNT previous FYs.
 */
export function getAvailableFYs(count: number = FY_HISTORY_COUNT + 1): string[] {
  const currentFY = getCurrentFY();
  const startYear = parseInt(currentFY.split('-')[0], 10);
  const fys: string[] = [];
  for (let i = 0; i < count; i++) {
    const sy = startYear - i;
    const ey = sy + 1;
    fys.push(`${sy}-${String(ey).slice(-2)}`);
  }
  return fys;
}

/**
 * Returns a user-friendly label: "FY 2024-25"
 */
export function formatFYLabel(fy: string): string {
  if (fy === 'ALL') return 'All Time';
  return `FY ${fy}`;
}

/**
 * Returns true if a date (as string or Date) falls within the given FY.
 * Uses exclusive upper bound to avoid March 31 23:59 edge cases.
 */
export function isDateInFY(dateInput: string | Date | null | undefined, fy: string): boolean {
  if (!dateInput) return false;
  if (fy === 'ALL') return true;

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return false;

  const { start, endExclusive } = getFYBounds(fy);
  return date >= start && date < endExclusive;
}

/**
 * Generic FY filter helper — avoids duplicating date logic everywhere.
 *
 * @param items     Array of items to filter
 * @param getDate   Extractor: returns the date string/Date for each item
 * @param fy        FY string like "2024-25" or "ALL"
 */
export function filterByFY<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined,
  fy: string
): T[] {
  if (fy === 'ALL') return items;
  return items.filter(item => isDateInFY(getDate(item), fy));
}

// ─────────────────────────────────────────────────────────────────────────────
// Fiscal Quarter Utilities (Indian FY: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)
// ─────────────────────────────────────────────────────────────────────────────

/** Quarter number within an FY: 1, 2, 3, or 4 */
export type FYQuarter = 1 | 2 | 3 | 4;

export interface QuarterBounds extends FYBounds {
  /** FY string the quarter belongs to, e.g. "2024-25" */
  fy: string;
  /** Quarter number (1–4) */
  quarter: FYQuarter;
  /** Human-readable label, e.g. "Q1 FY 2024-25 (Apr–Jun)" */
  label: string;
}

// The 4 quarter start months (0-indexed) relative to FY_START_MONTH = 3 (April)
// Q1: Apr(3), Q2: Jul(6), Q3: Oct(9), Q4: Jan(0)
const QUARTER_START_MONTHS: number[] = [
  FY_START_MONTH,           // Q1: April  (month 3)
  (FY_START_MONTH + 3) % 12,// Q2: July   (month 6)
  (FY_START_MONTH + 6) % 12,// Q3: October(month 9)
  (FY_START_MONTH + 9) % 12,// Q4: January(month 0)
];

const QUARTER_MONTH_LABELS = [
  'Apr–Jun',
  'Jul–Sep',
  'Oct–Dec',
  'Jan–Mar',
];

/**
 * Returns the fiscal quarter (1–4) for a given Date within a financial year.
 */
export function getQuarterFromDate(date: Date): FYQuarter {
  const month = date.getMonth();
  // How many months past FY start?
  const monthsIntoFY = (month - FY_START_MONTH + 12) % 12;
  return (Math.floor(monthsIntoFY / 3) + 1) as FYQuarter;
}

/**
 * Returns the QuarterBounds for a given FY string and quarter number.
 * Uses exclusive upper-bound for safe comparison.
 */
export function getQuarterBounds(fy: string, quarter: FYQuarter): QuarterBounds {
  const fyParts = fy.split('-');
  const fyStartYear = parseInt(fyParts[0], 10);

  const qIndex = quarter - 1; // 0-based
  const startMonthIndex = QUARTER_START_MONTHS[qIndex];

  // Determine the calendar year for the quarter's start month
  // Q1 (Apr), Q2 (Jul), Q3 (Oct) are in fyStartYear; Q4 (Jan) is in fyStartYear+1
  const startCalYear = qIndex < 3 ? fyStartYear : fyStartYear + 1;
  const start = new Date(startCalYear, startMonthIndex, 1, 0, 0, 0, 0);

  // End is exclusive: 3 months after start
  const endMonth = (startMonthIndex + 3) % 12;
  const endCalYear = endMonth < startMonthIndex ? startCalYear + 1 : startCalYear;
  const endExclusive = new Date(endCalYear, endMonth, 1, 0, 0, 0, 0);

  return {
    fy,
    quarter,
    start,
    endExclusive,
    label: `Q${quarter} FY ${fy} (${QUARTER_MONTH_LABELS[qIndex]})`,
  };
}

/**
 * Returns all 4 QuarterBounds for a given FY string, ordered Q1→Q4.
 */
export function getFYQuarters(fy: string): QuarterBounds[] {
  return ([1, 2, 3, 4] as FYQuarter[]).map(q => getQuarterBounds(fy, q));
}

/**
 * Returns true if a date falls within a specific quarter.
 */
export function isDateInQuarter(
  dateInput: string | Date | null | undefined,
  fy: string,
  quarter: FYQuarter
): boolean {
  if (!dateInput) return false;
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return false;
  const { start, endExclusive } = getQuarterBounds(fy, quarter);
  return date >= start && date < endExclusive;
}

/**
 * Filter an array to only items whose date falls in a specific quarter.
 */
export function filterByQuarter<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined,
  fy: string,
  quarter: FYQuarter
): T[] {
  return items.filter(item => isDateInQuarter(getDate(item), fy, quarter));
}

/**
 * Returns a short label like "Q2 FY 2024-25".
 */
export function formatQuarterLabel(fy: string, quarter: FYQuarter): string {
  return `Q${quarter} FY ${fy}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed Temporal Scope
// ─────────────────────────────────────────────────────────────────────────────
// A discriminated union that unifies every period variant the platform supports.
// Callers never need ad-hoc conditionals — pass a TimeScope and let the helpers
// resolve it to dates, labels, or API params.
// ─────────────────────────────────────────────────────────────────────────────

export type TimeScope =
  | { type: 'ALL_TIME' }
  | { type: 'FY';      fy: string }
  | { type: 'QUARTER'; fy: string; quarter: FYQuarter }
  | { type: 'MONTH';   year: number; month: number }   // month: 0-indexed
  | { type: 'CUSTOM';  start: Date; endExclusive: Date; label?: string };

/**
 * Resolve any TimeScope to concrete { start, endExclusive } dates.
 * Returns null for ALL_TIME (means: no date constraint).
 */
export function toFYBounds(scope: TimeScope): FYBounds | null {
  switch (scope.type) {
    case 'ALL_TIME':
      return null;

    case 'FY':
      return getFYBounds(scope.fy);

    case 'QUARTER':
      return getQuarterBounds(scope.fy, scope.quarter);

    case 'MONTH': {
      const start = new Date(scope.year, scope.month, 1, 0, 0, 0, 0);
      const endExclusive = new Date(scope.year, scope.month + 1, 1, 0, 0, 0, 0);
      return { start, endExclusive };
    }

    case 'CUSTOM':
      return { start: scope.start, endExclusive: scope.endExclusive };
  }
}

// Month name lookup (short English abbreviation)
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Human-readable label for any TimeScope.
 * Suitable for chart subtitles, PDF headers, export filenames, breadcrumbs.
 *
 * Examples:
 *   ALL_TIME  → "All Time"
 *   FY        → "FY 2024-25"
 *   QUARTER   → "Q2 FY 2024-25 (Jul–Sep)"
 *   MONTH     → "Apr 2025"
 *   CUSTOM    → custom label or "Custom Range"
 */
export function getTimeScopeLabel(scope: TimeScope): string {
  switch (scope.type) {
    case 'ALL_TIME': return 'All Time';
    case 'FY':       return formatFYLabel(scope.fy);
    case 'QUARTER':  return getQuarterBounds(scope.fy, scope.quarter).label;
    case 'MONTH':    return `${MONTH_ABBR[scope.month]} ${scope.year}`;
    case 'CUSTOM':   return scope.label ?? 'Custom Range';
  }
}

/**
 * Converts any TimeScope into query params for API calls.
 * Returns an empty object for ALL_TIME (no filtering).
 *
 * Examples:
 *   FY        → { fy: '2024-25' }
 *   QUARTER   → { start: '2024-07-01', end: '2024-10-01' }
 *   MONTH     → { start: '2025-04-01', end: '2025-05-01' }
 *   CUSTOM    → { start: '...', end: '...' }
 */
export function toTimeScopeQueryParams(
  scope: TimeScope
): Record<string, string> {
  if (scope.type === 'ALL_TIME') return {};
  if (scope.type === 'FY') return { fy: scope.fy };

  const bounds = toFYBounds(scope);
  if (!bounds) return {};

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(bounds.start), end: fmt(bounds.endExclusive) };
}

/**
 * Returns true if a date falls within the given TimeScope.
 * ALL_TIME always returns true.
 */
export function isDateInScope(
  dateInput: string | Date | null | undefined,
  scope: TimeScope
): boolean {
  if (scope.type === 'ALL_TIME') return true;
  if (!dateInput) return false;
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return false;

  const bounds = toFYBounds(scope);
  if (!bounds) return true;
  return date >= bounds.start && date < bounds.endExclusive;
}

/**
 * Generic array filter for any TimeScope.
 * Drop-in replacement for filterByFY when the caller has a full TimeScope.
 */
export function filterByScope<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined,
  scope: TimeScope
): T[] {
  if (scope.type === 'ALL_TIME') return items;
  return items.filter(item => isDateInScope(getDate(item), scope));
}

/**
 * Build a TimeScope from the global FY selector string ("ALL" or "2024-25").
 * Convenience bridge between the FY dropdown and the typed scope system.
 */
export function fyStringToScope(fy: string): TimeScope {
  return fy === 'ALL' ? { type: 'ALL_TIME' } : { type: 'FY', fy };
}
