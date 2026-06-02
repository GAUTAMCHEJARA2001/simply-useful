import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { BaseLayout } from '../layouts/BaseLayout';
import { styles } from '../styles';

interface OrderItem {
  id?: string;
  product_name: string;
  product_code?: string;
  qty: number;
  unit: string;
  rate: number;
  total: number;
  remark?: string;
}

interface OrderTemplateProps {
  type: 'SALES ORDER' | 'PURCHASE ORDER';
  orderNo: string;
  date: string;
  refNo?: string;
  party: {
    name: string;
    address: string;
    gst?: string;
    contact: string;
  };
  items: OrderItem[];
  totals: {
    subtotal: number;
    tax?: number;
    discount?: number;
    grandTotal: number;
  };
  company: any;
}

export const OrderTemplate: React.FC<OrderTemplateProps> = ({
  type,
  orderNo,
  date,
  refNo,
  party,
  items,
  totals,
  company
}) => (
  <BaseLayout
    title={type}
    docNumber={orderNo}
    date={date}
    reference={refNo}
    companyInfo={company}
  >
    {/* Party Details */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{type === 'SALES ORDER' ? 'Bill To' : 'Vendor'}</Text>
      <View style={styles.partyInfo}>
        <Text style={{ fontWeight: 'bold', fontSize: 11 }}>{party.name}</Text>
        <Text>{party.address}</Text>
        {party.gst ? <Text>GST: {party.gst}</Text> : null}
        <Text>Contact: {party.contact}</Text>
      </View>
    </View>

    {/* Items Table */}
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, styles.colNo]}>Sr.</Text>
        <Text style={[styles.tableCell, styles.colName]}>Item Description</Text>
        <Text style={[styles.tableCell, styles.colQty]}>Qty</Text>
        <Text style={[styles.tableCell, styles.colUnit]}>Unit</Text>
        <Text style={[styles.tableCell, styles.colRate]}>Rate</Text>
        <Text style={[styles.tableCell, styles.colAmt]}>Amount</Text>
      </View>

      {items.map((item, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlternate : null].filter(v => !!v)}>
          <Text style={[styles.tableCell, styles.colNo]}>{idx + 1}</Text>
          <View style={styles.colName}>
            <Text style={styles.tableCell}>{item.product_name}</Text>
            {item.remark ? <Text style={{ fontSize: 7, color: '#888', marginLeft: 4 }}>Rem: {item.remark}</Text> : null}
          </View>
          <Text style={[styles.tableCell, styles.colQty]}>{Number(item.qty || 0).toLocaleString()}</Text>
          <Text style={[styles.tableCell, styles.colUnit]}>{item.unit || 'Bags'}</Text>
          <Text style={[styles.tableCell, styles.colRate]}>Rs. {Number(item.rate || 0).toLocaleString()}</Text>
          <Text style={[styles.tableCell, styles.colAmt]}>Rs. {Number(item.total || 0).toLocaleString()}</Text>
        </View>
      ))}
    </View>



    {/* Totals Section */}
    <View style={styles.totalsContainer}>
      <View style={{ flexDirection: 'row' }}>
        <Text style={styles.totalsLabel}>Subtotal:</Text>
        <Text style={styles.totalsValue}>Rs. {Number(totals.subtotal || 0).toLocaleString()}</Text>
      </View>
      {Number(totals.tax || 0) > 0 && (
        <View style={{ flexDirection: 'row' }}>
          <Text style={styles.totalsLabel}>GST Amount:</Text>
          <Text style={styles.totalsValue}>Rs. {Number(totals.tax || 0).toLocaleString()}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row' }}>
        <Text style={[styles.totalsLabel, styles.grandTotalLabel]}>Total Amount:</Text>
        <Text style={[styles.totalsValue, styles.grandTotalValue]}>Rs. {Number(totals.grandTotal || 0).toLocaleString()}</Text>
      </View>
    </View>

    {/* Declaration */}
    <View style={{ marginTop: 40, fontSize: 8, color: '#777' }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Terms & Conditions:</Text>
      <Text>1. Goods once sold will not be taken back.</Text>
      <Text>2. All disputes are subject to local jurisdiction only.</Text>
      <Text>3. Interest @18% p.a. will be charged if payment is delayed.</Text>
    </View>
  </BaseLayout>
);
