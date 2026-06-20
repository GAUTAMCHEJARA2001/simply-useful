/**
 * Formats any numeric value to a string with a maximum of 2 decimal places.
 * Trimming trailing zeros if they are not needed.
 */
export const formatDecimal = (val: any): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return parseFloat(Number(val).toFixed(2)).toString();
};

/**
 * Formats currency values in Indian numbering format (Lakh/Crore) with exactly 2 decimal places
 */
export const formatCurrency2Dec = (val: any): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Formats numbers in Indian format with maximum 2 decimal places
 */
export const formatNumber2Dec = (val: any): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};
