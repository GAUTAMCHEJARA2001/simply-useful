import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { PrintableCompany } from '../types/printableInvoice.types';
import { DesignTokens } from '../theme/presets';

interface PDFHeaderProps {
  company: PrintableCompany;
  documentTitle: string;
  documentNo: string;
  documentDate: string;
  dueDate?: string;
  placeOfSupply?: string;
  referenceNo?: string;
  tokens: DesignTokens;
  styles: any;
}

export const PDFHeader: React.FC<PDFHeaderProps> = React.memo(({
  company,
  documentTitle,
  documentNo,
  documentDate,
  dueDate,
  placeOfSupply,
  referenceNo,
  tokens,
  styles
}) => {
  return (
    <View style={styles.headerContainer} fixed>
      {/* Left side: Company Logo + Details */}
      <View style={styles.companySection}>
        {company.logoUrl && company.logoUrl.trim() !== '' ? (
          <Image src={company.logoUrl} style={styles.logo} />
        ) : (
          // Reserve empty spacing gracefully if logo is missing to avoid layout collapse
          <View style={{ height: 15 }} />
        )}
        <Text style={styles.companyName}>{company.name}</Text>
        <Text style={styles.companyDetail}>{company.address}</Text>
        <Text style={styles.companyDetail}>{company.contact}</Text>
        
        {/* Core ERP compliance tags */}
        <View style={{ flexDirection: 'row', marginTop: 3, gap: 8 }}>
          {company.gst ? (
            <Text style={[styles.companyDetail, { fontFamily: 'Helvetica-Bold' }]}>
              GSTIN: {company.gst}
            </Text>
          ) : null}
          {company.pan ? (
            <Text style={[styles.companyDetail, { fontFamily: 'Helvetica-Bold' }]}>
              PAN: {company.pan}
            </Text>
          ) : null}
        </View>
        {company.cin ? (
          <Text style={[styles.companyDetail, { fontSize: tokens.typography.tiny }]}>
            CIN: {company.cin}
          </Text>
        ) : null}
      </View>

      {/* Right side: Document Type Badge + Metadata Table */}
      <View style={styles.docBadgeSection}>
        <View style={styles.docTitleBadge}>
          <Text>{documentTitle}</Text>
        </View>
        
        <View style={styles.metaGrid}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Document No:</Text>
            <Text style={styles.metaVal}>{documentNo}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date:</Text>
            <Text style={styles.metaVal}>{documentDate}</Text>
          </View>
          {dueDate ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date:</Text>
              <Text style={styles.metaVal}>{dueDate}</Text>
            </View>
          ) : null}
          {placeOfSupply ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Supply State:</Text>
              <Text style={styles.metaVal}>{placeOfSupply}</Text>
            </View>
          ) : null}
          {referenceNo ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Reference:</Text>
              <Text style={styles.metaVal}>{referenceNo}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
});

PDFHeader.displayName = 'PDFHeader';
