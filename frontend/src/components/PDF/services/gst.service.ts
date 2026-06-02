interface TaxBreakdownInput {
  rate: number;
  qty: number;
  discountPercent: number;
  taxPercent: number;
  companyStateCode: string;
  customerStateCode: string;
}

export interface TaxCalculations {
  discountAmount: number;
  taxableValue: number;
  taxAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  total: number;
}

/** Determines if two Indian states codes imply Intra-state or Inter-state trade */
export const isIntrastate = (companyStateCode?: string, customerStateCode?: string): boolean => {
  if (!companyStateCode || !customerStateCode) return true;
  return companyStateCode.trim().toLowerCase() === customerStateCode.trim().toLowerCase();
};

/** High-precision GST calculation engine avoiding float-drift */
export const calculateItemGST = (input: TaxBreakdownInput): TaxCalculations => {
  const quantity = Math.max(0, input.qty);
  const unitRate = Math.max(0, input.rate);
  const rawSubtotal = quantity * unitRate;

  // 1. Calculate discount
  const discountPercent = Math.min(100, Math.max(0, input.discountPercent));
  const discountAmount = Math.round(rawSubtotal * (discountPercent / 100) * 100) / 100;
  const taxableValue = Math.max(0, rawSubtotal - discountAmount);

  // 2. GST Type Resolution
  const gstRate = Math.max(0, input.taxPercent);
  const taxAmount = Math.round(taxableValue * (gstRate / 100) * 100) / 100;

  const isIntra = isIntrastate(input.companyStateCode, input.customerStateCode);

  let cgstPercent = 0;
  let cgstAmount = 0;
  let sgstPercent = 0;
  let sgstAmount = 0;
  let igstPercent = 0;
  let igstAmount = 0;

  if (isIntra) {
    cgstPercent = gstRate / 2;
    cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
    sgstPercent = gstRate / 2;
    sgstAmount = Math.round((taxAmount / 2) * 100) / 100;
  } else {
    igstPercent = gstRate;
    igstAmount = taxAmount;
  }

  const total = Math.round((taxableValue + taxAmount) * 100) / 100;

  return {
    discountAmount,
    taxableValue,
    taxAmount,
    cgstPercent,
    cgstAmount,
    sgstPercent,
    sgstAmount,
    igstPercent,
    igstAmount,
    total
  };
};
