/** Converts a numerical decimal value into standard Indian currency strings */
export const amountToWords = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Zero Rupees Only';
  
  // Split rupees and paise
  const roundedAmount = Math.round(amount * 100) / 100;
  const rupees = Math.floor(roundedAmount);
  const paise = Math.round((roundedAmount - rupees) * 100);

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertLessThanOneThousand = (num: number): string => {
    let str = '';
    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    }
    if (num > 0) {
      str += ones[num] + ' ';
    }
    return str.trim();
  };

  const convertRupees = (num: number): string => {
    if (num === 0) return 'Zero';
    
    let words = '';
    
    // Crores (1,00,00,000)
    if (num >= 10000000) {
      words += convertLessThanOneThousand(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    
    // Lakhs (1,00,000)
    if (num >= 100000) {
      words += convertLessThanOneThousand(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    
    // Thousands (1,000)
    if (num >= 1000) {
      words += convertLessThanOneThousand(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    
    // Remaining Hundreds
    if (num > 0) {
      words += convertLessThanOneThousand(num);
    }
    
    return words.trim();
  };

  const rupeesInWords = rupees > 0 ? `${convertRupees(rupees)} Rupees` : 'Zero Rupees';
  const paiseInWords = paise > 0 ? ` and ${convertLessThanOneThousand(paise)} Paise` : '';
  
  return `${rupeesInWords}${paiseInWords} Only`.replace(/\s+/g, ' ');
};
