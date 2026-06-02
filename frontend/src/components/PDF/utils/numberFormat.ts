/** Formats a numeric value into the Indian numbering format currency string (Lakh/Crore) */
export const formatIndianNumber = (num: number, decimals: number = 2): string => {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  
  const parts = Number(num).toFixed(decimals).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';

  // Reverse integer to group from right to left
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherParts = integerPart.substring(0, integerPart.length - 3);
  
  if (otherParts !== '') {
    lastThree = ',' + lastThree;
  }
  
  // Group other parts by two digits
  const formattedInteger = otherParts.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return formattedInteger + decimalPart;
};

/** High-level currency decorator pre-pending the Rupee symbol */
export const formatRupees = (num: number): string => {
  return `Rs. ${formatIndianNumber(num)}`;
};
