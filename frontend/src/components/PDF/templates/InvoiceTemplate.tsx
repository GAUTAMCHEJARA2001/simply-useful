import React from 'react';
import { View } from '@react-pdf/renderer';
import { PrintableInvoice } from '../types/printableInvoice.types';
import { getThemeStyles } from '../theme';
import { presets } from '../theme/presets';
import { PDFHeader } from '../components/PDFHeader';
import { PDFPartySection } from '../components/PDFPartySection';
import { PDFTable, PDFColumnDef } from '../components/PDFTable';
import { PDFTotals } from '../components/PDFTotals';
import { PDFTaxSummary } from '../components/PDFTaxSummary';
import { PDFBankDetails } from '../components/PDFBankDetails';
import { PDFTerms } from '../components/PDFTerms';
import { PDFSignature } from '../components/PDFSignature';
import { formatRupees } from '../utils/numberFormat';
import { ThemePreset, PrintDensity } from '../types/printableCommon.types';

interface InvoiceTemplateProps {
  invoice: PrintableInvoice;
  themePreset: ThemePreset;
  densityMode: PrintDensity;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = React.memo(({
  invoice,
  themePreset,
  densityMode
}) => {
  const styles = React.useMemo(() => getThemeStyles(themePreset, densityMode), [themePreset, densityMode]);
  const tokens = React.useMemo(() => presets[themePreset] || presets.zoho, [themePreset]);

  // Column definitions for the Invoice items table
  const columns: PDFColumnDef<any>[] = [
    { key: 'serialNo', title: 'Sr No', width: '8%', align: 'center' },
    { key: 'productCode', title: 'SKU / Code', width: '15%', align: 'left' },
    { key: 'productName', title: 'Item Description', width: '37%', align: 'left' },
    { key: 'qty', title: 'Qty', width: '10%', align: 'center', formatter: (val) => Number(val).toLocaleString() },
    { key: 'rate', title: 'Rate', width: '13%', align: 'right', formatter: (val) => formatRupees(val) },
    { key: 'total', title: 'Total', width: '17%', align: 'right', formatter: (val) => formatRupees(val) }
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header */}
      <PDFHeader
        company={invoice.company}
        documentTitle={invoice.documentType}
        documentNo={invoice.invoiceNo}
        documentDate={invoice.invoiceDate}
        dueDate={invoice.dueDate}
        placeOfSupply={invoice.placeOfSupply}
        referenceNo={invoice.referenceNo}
        tokens={tokens}
        styles={styles}
      />

      {/* 2. Customer Section */}
      <PDFPartySection 
        customer={invoice.customer} 
        billingTitle={invoice.documentType === 'PURCHASE ORDER' ? 'Supplier Details' : 'Bill To'}
        shippingTitle={invoice.documentType === 'PURCHASE ORDER' ? 'Bill To' : 'Ship To'}
        styles={styles} 
      />

      {/* 3. Items Table */}
      <PDFTable columns={columns} data={invoice.items} styles={styles} />

      {/* 4. Totals and Summaries Grid */}
      <View style={styles.summaryPaneContainer} wrap={false}>
        {/* Left side: Tax breakdown and words */}
        <View style={styles.wordsTermsSection}>
          <PDFTaxSummary taxes={invoice.taxes} totals={invoice.totals} styles={styles} />
        </View>

        {/* Right side: High-contrast grand totals */}
        <PDFTotals totals={invoice.totals} styles={styles} />
      </View>

      {/* 5. Terms & Bank details */}
      <View style={styles.bottomGovernanceSection} wrap={false}>
        {invoice.showBankDetails ? (
          <PDFBankDetails 
            styles={styles} 
            bankName={invoice.company.bankName}
            accountNo={invoice.company.bankAccount}
            ifscCode={invoice.company.bankIfsc}
            branchName={invoice.company.bankBranch}
          />
        ) : null}
        <PDFSignature companyName={invoice.company.name} styles={styles} />
      </View>

      <PDFTerms terms={invoice.terms} styles={styles} />
    </View>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';
