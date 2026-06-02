import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { PrintableLedger } from '../types/printableLedger.types';
import { getThemeStyles } from '../theme';
import { presets } from '../theme/presets';
import { PDFHeader } from '../components/PDFHeader';
import { PDFTable, PDFColumnDef } from '../components/PDFTable';
import { PDFTerms } from '../components/PDFTerms';
import { formatRupees } from '../utils/numberFormat';
import { paginateLedger } from '../services/pagination.service';
import { ThemePreset, PrintDensity } from '../types/printableCommon.types';

interface LedgerTemplateProps {
  ledger: PrintableLedger;
  themePreset: ThemePreset;
  densityMode: PrintDensity;
}

export const LedgerTemplate: React.FC<LedgerTemplateProps> = React.memo(({
  ledger,
  themePreset,
  densityMode
}) => {
  const styles = React.useMemo(() => getThemeStyles(themePreset, densityMode), [themePreset, densityMode]);
  const tokens = React.useMemo(() => presets[themePreset] || presets.zoho, [themePreset]);

  // Paginate items with carry-forward logic for high-performance multi-page rendering
  const ledgerPages = React.useMemo(() => {
    return paginateLedger(ledger.items, ledger.summary.opening, 25);
  }, [ledger.items, ledger.summary.opening]);

  const columns: PDFColumnDef<any>[] = [
    { key: 'serialNo', title: 'Sr No', width: '8%', align: 'center' },
    { key: 'date', title: 'Date', width: '12%', align: 'left' },
    { key: 'transactionType', title: 'Transaction Type', width: '20%', align: 'left' },
    { key: 'referenceId', title: 'Reference ID', width: '15%', align: 'left' },
    { key: 'warehouseName', title: 'Warehouse', width: '15%', align: 'left' },
    { key: 'inQty', title: 'Inward (+)', width: '10%', align: 'right', formatter: (val) => val > 0 ? `+${Number(val).toLocaleString()}` : '—' },
    { key: 'outQty', title: 'Outward (-)', width: '10%', align: 'right', formatter: (val) => val > 0 ? `-${Number(val).toLocaleString()}` : '—' },
    { key: 'balance', title: 'Balance', width: '10%', align: 'right', formatter: (val) => Number(val).toLocaleString() }
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Product Description Details */}
      <View style={{ marginBottom: 10, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 6 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: tokens.colors.primary }}>
          Product: {ledger.productName}
        </Text>
        <Text style={{ fontSize: 8, color: tokens.colors.muted, marginTop: 2 }}>
          SKU Code: {ledger.sku} | Valuation Metric: {ledger.unit}
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, padding: 6, borderWidth: 0.5, borderColor: tokens.colors.border, backgroundColor: tokens.colors.bgHeader, borderRadius: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 6.5, color: tokens.colors.muted, textTransform: 'uppercase' }}>Opening Balance</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: tokens.colors.text }}>{ledger.summary.opening.toLocaleString()}</Text>
        </View>
        <View style={{ flex: 1, padding: 6, borderWidth: 0.5, borderColor: tokens.colors.border, backgroundColor: tokens.colors.bgHeader, borderRadius: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 6.5, color: tokens.colors.muted, textTransform: 'uppercase' }}>Total Inward</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: tokens.colors.success }}>+{ledger.summary.totalIn.toLocaleString()}</Text>
        </View>
        <View style={{ flex: 1, padding: 6, borderWidth: 0.5, borderColor: tokens.colors.border, backgroundColor: tokens.colors.bgHeader, borderRadius: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 6.5, color: tokens.colors.muted, textTransform: 'uppercase' }}>Total Outward</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: tokens.colors.danger }}>-{ledger.summary.totalOut.toLocaleString()}</Text>
        </View>
        <View style={{ flex: 1, padding: 6, borderWidth: 0.5, borderColor: tokens.colors.border, backgroundColor: '#EFF6FF', borderRadius: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 6.5, color: '#2563EB', textTransform: 'uppercase' }}>Closing Balance</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1D4ED8' }}>{ledger.summary.closing.toLocaleString()}</Text>
        </View>
      </View>

      {/* Pages rendering with repeating headers and carry forward calculations */}
      {ledgerPages.map((page, pageIdx) => (
        <View key={pageIdx} style={{ marginBottom: 15 }} break={pageIdx > 0}>
          {/* Header repeating on subsequent pages */}
          <PDFHeader
            company={ledger.company}
            documentTitle="STOCK LEDGER REPORT"
            documentNo={ledger.sku}
            documentDate={`${ledger.dateFrom} to ${ledger.dateTo}`}
            tokens={tokens}
            styles={styles}
          />

          {/* Running carry forward subheadings */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 4, backgroundColor: '#F9FAFB', borderStyle: 'solid', borderWidth: 0.5, borderColor: '#eee', marginBottom: 4 }}>
            <Text style={{ fontSize: 7, color: '#666' }}>
              Carry Forward Opening: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{page.openingBalance.toLocaleString()}</Text>
            </Text>
            <Text style={{ fontSize: 7, color: '#666' }}>
              Carry Forward Closing: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{page.closingBalance.toLocaleString()}</Text>
            </Text>
          </View>

          <PDFTable columns={columns} data={page.items} styles={styles} />
        </View>
      ))}

      <PDFTerms terms={ledger.terms} styles={styles} />
    </View>
  );
});

LedgerTemplate.displayName = 'LedgerTemplate';
