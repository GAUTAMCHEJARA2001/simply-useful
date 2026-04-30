import React from 'react';
import { Page, Text, View, Document, Image } from '@react-pdf/renderer';
import { styles } from '../styles';

interface BaseLayoutProps {
  title: string;
  docNumber: string;
  date: string;
  reference?: string;
  companyInfo: {
    name: string;
    address: string;
    gst?: string;
    contact: string;
    logo?: string;
  };
  children: React.ReactNode;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  title,
  docNumber,
  date,
  reference,
  companyInfo,
  children
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoSection}>
          {companyInfo.logo && companyInfo.logo.trim() !== '' ? (
            <Image src={companyInfo.logo} style={styles.logo} />
          ) : null}
          <Text style={styles.companyName}>{companyInfo.name || 'KAMLA INDUSTRIES'}</Text>
          <Text style={styles.companyDetail}>{companyInfo.address}</Text>
          {companyInfo.gst ? <Text style={styles.companyDetail}>GST: {companyInfo.gst}</Text> : null}
          <Text style={styles.companyDetail}>{companyInfo.contact}</Text>
        </View>
        <View style={styles.docTitleSection}>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.docDetail}>No: {docNumber}</Text>
          <Text style={styles.docDetail}>Date: {date}</Text>
          {reference ? <Text style={styles.docDetail}>Ref: {reference}</Text> : null}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.section}>
        {children}
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <View>
          <Text style={styles.footerInfo}>Generated on: {new Date().toLocaleString()}</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={styles.signatureLine}>
            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Authorized Signatory</Text>
          </View>
          <Text style={styles.footerInfo}>(Digital Document - Seal Required for Physical Use)</Text>
        </View>
      </View>
    </Page>
  </Document>
);
