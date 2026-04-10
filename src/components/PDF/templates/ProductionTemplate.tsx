import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { BaseLayout } from '../layouts/BaseLayout';
import { styles } from '../styles';

interface BOMItem {
  id: string;
  name: string;
  code: string;
  qty: number;
  unit: string;
}

interface ProductionTemplateProps {
  orderNo: string;
  date: string;
  product_name: string;
  target_qty: number;
  unit: string;
  bom_items: BOMItem[];
  remarks?: string;
  company: any;
}

const prodStyles = StyleSheet.create({
  summaryBox: {
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'column',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
});

export const ProductionTemplate: React.FC<ProductionTemplateProps> = ({
  orderNo,
  date,
  product_name,
  target_qty,
  unit,
  bom_items,
  remarks,
  company
}) => (
  <BaseLayout
    title="PRODUCTION ORDER"
    docNumber={orderNo}
    date={date}
    companyInfo={company}
  >
    {/* Finished Good Summary */}
    <View style={prodStyles.summaryBox}>
      <View style={prodStyles.summaryItem}>
        <Text style={prodStyles.summaryLabel}>Finished Good</Text>
        <Text style={prodStyles.summaryValue}>{product_name}</Text>
      </View>
      <View style={prodStyles.summaryItem}>
        <Text style={prodStyles.summaryLabel}>Batch Quantity</Text>
        <Text style={prodStyles.summaryValue}>{Number(target_qty || 0).toLocaleString()} {unit || 'Units'}</Text>
      </View>
      <View style={prodStyles.summaryItem}>
        <Text style={prodStyles.summaryLabel}>Work Center</Text>
        <Text style={prodStyles.summaryValue}>Main Plant</Text>
      </View>
    </View>

    {/* BOM Section */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Raw Material Requirements (BOM)</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.colNo]}>Sr.</Text>
          <Text style={[styles.tableCell, styles.colCode]}>Item Code</Text>
          <Text style={[styles.tableCell, styles.colName]}>Item Name</Text>
          <Text style={[styles.tableCell, styles.colQty]}>Req. Qty</Text>
          <Text style={[styles.tableCell, styles.colUnit]}>Unit</Text>
        </View>

        {(bom_items || []).map((item, idx) => (
          <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlternate : null].filter(Boolean)}>
            <Text style={[styles.tableCell, styles.colNo]}>{idx + 1}</Text>
            <Text style={[styles.tableCell, styles.colCode]}>{item.code || '—'}</Text>
            <Text style={[styles.tableCell, styles.colName]}>{item.name || 'Unknown'}</Text>
            <Text style={[styles.tableCell, styles.colQty]}>{Number(item.qty || 0).toFixed(2).toLocaleString()}</Text>
            <Text style={[styles.tableCell, styles.colUnit]}>{item.unit || 'Kg'}</Text>
          </View>
        ))}
      </View>
    </View>

    {/* Production Remarks */}
    {remarks ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Production Remarks</Text>
        <Text style={{ fontSize: 9, color: '#444' }}>{remarks}</Text>
      </View>
    ) : null}

    {/* Flow Verification (Empty slots for manual signing) */}
    <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ width: '30%' }}>
        <View style={{ borderBottomWidth: 1, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomColor: '#ccc', borderStyle: 'solid', marginBottom: 5, height: 15 }} />
        <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 'bold' }}>Mixer Operator</Text>
      </View>
      <View style={{ width: '30%' }}>
        <View style={{ borderBottomWidth: 1, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomColor: '#ccc', borderStyle: 'solid', marginBottom: 5, height: 15 }} />
        <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 'bold' }}>QC Inspector</Text>
      </View>
      <View style={{ width: '30%' }}>
        <View style={{ borderBottomWidth: 1, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomColor: '#ccc', borderStyle: 'solid', marginBottom: 5, height: 15 }} />
        <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 'bold' }}>Floor Manager</Text>
      </View>
    </View>
  </BaseLayout>
);
