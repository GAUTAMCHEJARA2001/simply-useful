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

/**
 * Formats integer digits into Indian numbering system (1,000, 1,00,000, 10,00,000, etc.)
 */
export const formatIndianNumber = (val: any): string => {
  if (val === null || val === undefined || val === '') return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  if (!clean) return '';
  const num = parseInt(clean, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-IN');
};

/**
 * Formats value with Rupee sign and Indian comma notation (e.g. ₹1,00,000)
 */
export const formatIndianCurrency = (val: any): string => {
  if (val === null || val === undefined || val === '') return '₹0';
  const clean = String(val).replace(/[^0-9.]/g, '');
  if (!clean) return '₹0';
  const num = parseFloat(clean);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Converts Indian currency amount into words (Thousands, Lakhs, Crores)
 */
export const formatIndianWords = (val: any): string => {
  if (val === null || val === undefined || val === '') return '';
  const clean = String(val).replace(/[^0-9]/g, '');
  if (!clean) return '';
  const n = parseInt(clean, 10);
  if (isNaN(n) || n === 0) return '';
  
  if (n >= 10000000) {
    const cr = (n / 10000000).toFixed(2).replace(/\.00$/, '');
    return `${cr} Crore`;
  }
  if (n >= 100000) {
    const lk = (n / 100000).toFixed(2).replace(/\.00$/, '');
    return `${lk} Lakh`;
  }
  if (n >= 1000) {
    const th = (n / 1000).toFixed(2).replace(/\.00$/, '');
    return `${th} Thousand`;
  }
  return '';
};

