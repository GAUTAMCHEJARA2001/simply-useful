import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { PrintableTotals } from '../types/printableInvoice.types';
import { formatRupees } from '../utils/numberFormat';

interface PDFTotalsProps {
  totals: PrintableTotals;
  styles: any;
}

export const PDFTotals: React.FC<PDFTotalsProps> = React.memo(({
  totals,
  styles
}) => {
  return (
    <View style={styles.financialTotalsSection} wrap={false}>
      {/* 1. Subtotal */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Sub Total (Gross):</Text>
        <Text style={styles.totalVal}>{formatRupees(totals.subtotal)}</Text>
      </View>
      
      {/* 2. Discounts (render only if > 0) */}
      {totals.itemDiscounts > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Discount (-) :</Text>
          <Text style={[styles.totalVal, { color: '#B91C1C' }]}>
            -{formatRupees(totals.itemDiscounts)}
          </Text>
        </View>
      ) : null}

      {/* 3. Taxable Value */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Taxable Value:</Text>
        <Text style={styles.totalVal}>{formatRupees(totals.taxableValue)}</Text>
      </View>

      {/* 4. GST Taxes */}
      {totals.cgstAmount > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>CGST (+) :</Text>
          <Text style={styles.totalVal}>{formatRupees(totals.cgstAmount)}</Text>
        </View>
      ) : null}
      {totals.sgstAmount > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>SGST (+) :</Text>
          <Text style={styles.totalVal}>{formatRupees(totals.sgstAmount)}</Text>
        </View>
      ) : null}
      {totals.igstAmount > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>IGST (+) :</Text>
          <Text style={styles.totalVal}>{formatRupees(totals.igstAmount)}</Text>
        </View>
      ) : null}

      {/* 5. CESS */}
      {totals.cessAmount > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Cess Amount (+) :</Text>
          <Text style={styles.totalVal}>{formatRupees(totals.cessAmount)}</Text>
        </View>
      ) : null}

      {/* 6. TDS (subtract) */}
      {totals.tdsAmount > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TDS (-) :</Text>
          <Text style={[styles.totalVal, { color: '#B91C1C' }]}>
            -{formatRupees(totals.tdsAmount)}
          </Text>
        </View>
      ) : null}

      {/* 7. Round-Off */}
      {Math.abs(totals.roundOff) > 0 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Round Off:</Text>
          <Text style={styles.totalVal}>
            {totals.roundOff > 0 ? '+' : ''}{formatRupees(totals.roundOff)}
          </Text>
        </View>
      ) : null}

      {/* 8. Grand Total Accent Header */}
      <View style={styles.grandTotalRow}>
        <Text style={styles.grandTotalLabel}>Grand Total:</Text>
        <Text style={styles.grandTotalVal}>{formatRupees(totals.grandTotal)}</Text>
      </View>
    </View>
  );
});

PDFTotals.displayName = 'PDFTotals';
