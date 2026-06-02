import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { PrintableCustomer } from '../types/printableInvoice.types';

interface PDFPartySectionProps {
  customer: PrintableCustomer;
  billingTitle?: string;
  shippingTitle?: string;
  styles: any;
}

export const PDFPartySection: React.FC<PDFPartySectionProps> = React.memo(({
  customer,
  billingTitle = 'Bill To',
  shippingTitle = 'Ship To',
  styles
}) => {
  return (
    <View style={styles.partySectionContainer}>
      {/* Billing Address Card */}
      <View style={styles.partyCol}>
        <Text style={styles.partySectionTitle}>{billingTitle}</Text>
        <Text style={styles.partyName}>{customer.name}</Text>
        <Text style={styles.partyDetail}>{customer.billingAddress}</Text>
        
        {customer.mobile ? (
          <Text style={styles.partyDetail}>Mobile: {customer.mobile}</Text>
        ) : null}
        {customer.email ? (
          <Text style={styles.partyDetail}>Email: {customer.email}</Text>
        ) : null}
        {customer.gst ? (
          <Text style={[styles.partyDetail, { fontFamily: 'Helvetica-Bold' }]}>
            GSTIN: {customer.gst}
          </Text>
        ) : null}
        {customer.pan ? (
          <Text style={styles.partyDetail}>PAN: {customer.pan}</Text>
        ) : null}
        <Text style={styles.partyDetail}>
          State: {customer.state} (Code: {customer.stateCode})
        </Text>
      </View>

      {/* Shipping Address Card */}
      <View style={styles.partyCol}>
        <Text style={styles.partySectionTitle}>{shippingTitle}</Text>
        <Text style={styles.partyName}>{customer.name}</Text>
        <Text style={styles.partyDetail}>{customer.shippingAddress}</Text>
        
        {customer.mobile ? (
          <Text style={styles.partyDetail}>Mobile: {customer.mobile}</Text>
        ) : null}
        {customer.gst ? (
          <Text style={[styles.partyDetail, { fontFamily: 'Helvetica-Bold' }]}>
            GSTIN: {customer.gst}
          </Text>
        ) : null}
        <Text style={styles.partyDetail}>
          State: {customer.state} (Code: {customer.stateCode})
        </Text>
      </View>
    </View>
  );
});

PDFPartySection.displayName = 'PDFPartySection';
