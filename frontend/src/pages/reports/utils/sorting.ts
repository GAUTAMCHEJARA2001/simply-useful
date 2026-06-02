/**
 * Generic sorting helper for tabular arrays.
 * Handles strings, numbers, dates, and nullish values.
 */
export function sortRows<T>(
  rows: T[],
  sortBy: keyof T | null,
  order: 'asc' | 'desc'
): T[] {
  if (!sortBy) return rows;

  return [...rows].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];

    if (valA === valB) return 0;
    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    // Numerical-aware case-insensitive string comparison
    if (typeof valA === 'string' && typeof valB === 'string') {
      const comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return order === 'asc' ? comparison : -comparison;
    }

    // Comparative check for numbers, booleans, or dates
    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });
}
