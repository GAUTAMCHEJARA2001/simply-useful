import { PrintableInvoiceItem, PrintableTaxBreakup, PrintableTotals } from '../types/printableInvoice.types';
import { amountToWords } from '../utils/amountToWords';

export interface TotalsInput {
  items: PrintableInvoiceItem[];
  cessAmount?: number;
  tdsAmount?: number;
}

/** Processes lines, maps CGST/SGST/IGST totals, and calculates exact round-offs */
export const calculateInvoiceTotals = (input: TotalsInput): { totals: PrintableTotals; taxes: PrintableTaxBreakup[] } => {
  let subtotal = 0;
  let itemDiscounts = 0;
  let taxableValue = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let taxAmount = 0;

  // Track tax breakups grouped by tax percentage
  const taxGroupMap = new Map<number, { taxableValue: number; cgstAmount: number; sgstAmount: number; igstAmount: number }>();

  input.items.forEach(item => {
    subtotal += item.rate * item.qty;
    itemDiscounts += item.discountAmount;
    taxableValue += item.taxableValue;
    cgstAmount += item.cgstAmount;
    sgstAmount += item.sgstAmount;
    igstAmount += item.igstAmount;
    taxAmount += item.taxAmount;

    // Accumulate under tax percent group
    const current = taxGroupMap.get(item.taxPercent) || { taxableValue: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
    taxGroupMap.set(item.taxPercent, {
      taxableValue: current.taxableValue + item.taxableValue,
      cgstAmount: current.cgstAmount + item.cgstAmount,
      sgstAmount: current.sgstAmount + item.sgstAmount,
      igstAmount: current.igstAmount + item.igstAmount
    });
  });

  const cessAmount = input.cessAmount || 0;
  const tdsAmount = input.tdsAmount || 0;

  const rawGrandTotal = taxableValue + taxAmount + cessAmount - tdsAmount;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((roundedGrandTotal - rawGrandTotal) * 100) / 100;

  const totals: PrintableTotals = {
    subtotal: Math.round(subtotal * 100) / 100,
    itemDiscounts: Math.round(itemDiscounts * 100) / 100,
    taxableValue: Math.round(taxableValue * 100) / 100,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    cessAmount: Math.round(cessAmount * 100) / 100,
    tdsAmount: Math.round(tdsAmount * 100) / 100,
    roundOff,
    grandTotal: roundedGrandTotal,
    amountInWords: amountToWords(roundedGrandTotal)
  };

  // Convert map to PrintableTaxBreakup list
  const taxes: PrintableTaxBreakup[] = Array.from(taxGroupMap.entries()).map(([taxPercent, data]) => {
    const totalTax = data.cgstAmount + data.sgstAmount + data.igstAmount;
    return {
      taxPercent,
      taxableValue: Math.round(data.taxableValue * 100) / 100,
      cgstAmount: Math.round(data.cgstAmount * 100) / 100,
      sgstAmount: Math.round(data.sgstAmount * 100) / 100,
      igstAmount: Math.round(data.igstAmount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100
    };
  }).sort((a, b) => b.taxPercent - a.taxPercent); // Sort high tax rate first

  return { totals, taxes };
};
