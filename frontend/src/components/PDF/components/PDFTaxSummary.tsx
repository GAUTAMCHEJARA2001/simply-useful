import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { PrintableTaxBreakup, PrintableTotals } from '../types/printableInvoice.types';
import { formatRupees, formatIndianNumber } from '../utils/numberFormat';

interface PDFTaxSummaryProps {
  taxes: PrintableTaxBreakup[];
  totals: PrintableTotals;
  styles: any;
}

export const PDFTaxSummary: React.FC<PDFTaxSummaryProps> = React.memo(({
  taxes,
  totals,
  styles
}) => {
  return (
    <View style={styles.taxSection} wrap={false}>
      {/* Words and Terms Grid Pane */}
      <View style={styles.wordsBlock}>
        <Text style={styles.wordsTitle}>Total Amount In Words:</Text>
        <Text style={styles.wordsContent}>{totals.amountInWords}</Text>
      </View>

      {/* Tax rate-wise breakdown grid */}
      {taxes && taxes.length > 0 ? (
        <View style={styles.tableContainer}>
          <View style={[styles.tableHeaderRow, { height: 18 }]}>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Tax Rate</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Taxable Amt</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>CGST Amt</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>SGST Amt</Text>
            <Text style={[styles.tableHeaderCell, { width: '19%', textAlign: 'right' }]}>IGST Amt</Text>
          </View>
          
          {taxes.map((tax, idx) => (
            <View key={idx} style={[styles.tableBodyRow, { minHeight: 16 }]}>
              <Text style={[styles.tableCell, { width: '20%' }]}>
                GST {tax.taxPercent}%
              </Text>
              <Text style={[styles.tableCell, { width: '25%', textAlign: 'right' }]}>
                {formatRupees(tax.taxableValue)}
              </Text>
              <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                {tax.cgstAmount > 0 ? formatRupees(tax.cgstAmount) : '—'}
              </Text>
              <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                {tax.sgstAmount > 0 ? formatRupees(tax.sgstAmount) : '—'}
              </Text>
              <Text style={[styles.tableCell, { width: '19%', textAlign: 'right' }]}>
                {tax.igstAmount > 0 ? formatRupees(tax.igstAmount) : '—'}
              </Text>
            </View>
          ))}
          
          {/* Summary Row */}
          <View style={[styles.tableBodyRow, { backgroundColor: '#F9FAFB', minHeight: 18, fontFamily: 'Helvetica-Bold' }]}>
            <Text style={[styles.tableCell, { width: '20%', fontFamily: 'Helvetica-Bold' }]}>Total Tax:</Text>
            <Text style={[styles.tableCell, { width: '25%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
              {formatRupees(totals.taxableValue)}
            </Text>
            <Text style={[styles.tableCell, { width: '18%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
              {totals.cgstAmount > 0 ? formatRupees(totals.cgstAmount) : '—'}
            </Text>
            <Text style={[styles.tableCell, { width: '18%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
              {totals.sgstAmount > 0 ? formatRupees(totals.sgstAmount) : '—'}
            </Text>
            <Text style={[styles.tableCell, { width: '19%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
              {totals.igstAmount > 0 ? formatRupees(totals.igstAmount) : '—'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
});

PDFTaxSummary.displayName = 'PDFTaxSummary';
