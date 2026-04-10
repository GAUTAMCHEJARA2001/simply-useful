import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { BaseLayout } from '../layouts/BaseLayout';
import { styles } from '../styles';

interface LedgerItem {
  date: string;
  transaction_type: string;
  reference_id: string;
  warehouse_name: string;
  in_qty: number;
  out_qty: number;
  balance: number;
  rate?: number;
  value?: number;
}

interface StockLedgerTemplateProps {
  product_name: string;
  sku: string;
  unit: string;
  date_from?: string;
  date_to?: string;
  summary: {
    opening: number;
    total_in: number;
    total_out: number;
    closing: number;
  };
  items: LedgerItem[];
  company: any;
}

const ledgerStyles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 6,
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  cardLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  // Table overrides (specific for Ledger)
  colDate: { width: '12%', fontSize: 8 },
  colType: { width: '15%', fontSize: 8 },
  colRef: { width: '22%', fontSize: 7, color: '#475569' },
  colWh: { width: '15%', fontSize: 8 },
  colIn: { width: '12%', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' },
  colOut: { width: '12%', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' },
  colBal: { width: '12%', textAlign: 'right', fontWeight: 'bold' },
});

export const StockLedgerTemplate: React.FC<StockLedgerTemplateProps> = ({
  product_name,
  sku,
  unit,
  date_from,
  date_to,
  summary,
  items,
  company
}) => (
  <BaseLayout
    title="STOCK LEDGER REPORT"
    docNumber={sku}
    date={`${date_from || 'Start'} to ${date_to || 'End'}`}
    companyInfo={company}
  >
    {/* Product Info */}
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{product_name}</Text>
      <Text style={{ fontSize: 9, color: '#666' }}>SKU: {sku} | Unit: {unit}</Text>
    </View>

    {/* Summary Cards */}
    {summary ? (
      <View style={ledgerStyles.summaryGrid}>
        <View style={ledgerStyles.card}>
          <Text style={ledgerStyles.cardLabel}>Opening Stock</Text>
          <Text style={ledgerStyles.cardValue}>{Number(summary.opening || 0).toLocaleString()}</Text>
        </View>
        <View style={ledgerStyles.card}>
          <Text style={ledgerStyles.cardLabel}>Total Inward</Text>
          <Text style={[ledgerStyles.cardValue, { color: '#059669' }]}>+{Number(summary.total_in || 0).toLocaleString()}</Text>
        </View>
        <View style={ledgerStyles.card}>
          <Text style={ledgerStyles.cardLabel}>Total Outward</Text>
          <Text style={[ledgerStyles.cardValue, { color: '#dc2626' }]}>-{Number(summary.total_out || 0).toLocaleString()}</Text>
        </View>
        <View style={[ledgerStyles.card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
          <Text style={[ledgerStyles.cardLabel, { color: '#2563eb' }]}>Closing Balance</Text>
          <Text style={[ledgerStyles.cardValue, { color: '#1d4ed8' }]}>{Number(summary.closing || 0).toLocaleString()}</Text>
        </View>
      </View>
    ) : null}

    {/* Transaction Table */}
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, ledgerStyles.colDate]}>Date</Text>
        <Text style={[styles.tableCell, ledgerStyles.colType]}>Type</Text>
        <Text style={[styles.tableCell, ledgerStyles.colRef]}>Ref No</Text>
        <Text style={[styles.tableCell, ledgerStyles.colWh]}>Warehouse</Text>
        <Text style={[styles.tableCell, ledgerStyles.colIn]}>In (+)</Text>
        <Text style={[styles.tableCell, ledgerStyles.colOut]}>Out (-)</Text>
        <Text style={[styles.tableCell, ledgerStyles.colBal]}>Balance</Text>
      </View>

      {items.map((item, idx) => {
        const itemDate = new Date(item.date);
        const formattedDate = isNaN(itemDate.getTime()) ? 'Invalid Date' : itemDate.toLocaleDateString();
        
        const truncatedRef = item.reference_id && item.reference_id.length > 8 
          ? item.reference_id.substring(0, 8) 
          : (item.reference_id || '—');

        return (
          <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlternate : null].filter(v => !!v)}>
            <Text style={[styles.tableCell, ledgerStyles.colDate]}>{formattedDate}</Text>
            <Text style={[styles.tableCell, ledgerStyles.colType]}>{item.transaction_type}</Text>
            <Text style={[styles.tableCell, ledgerStyles.colRef]}>{truncatedRef}</Text>
            <Text style={[styles.tableCell, ledgerStyles.colWh]}>{item.warehouse_name || '—'}</Text>
            <Text style={[styles.tableCell, ledgerStyles.colIn]}>{Number(item.in_qty || 0) > 0 ? `+${Number(item.in_qty).toLocaleString()}` : '0'}</Text>
            <Text style={[styles.tableCell, ledgerStyles.colOut]}>{Number(item.out_qty || 0) > 0 ? `-${Number(item.out_qty).toLocaleString()}` : '0'}</Text>
            <Text style={[styles.tableCell, ledgerStyles.colBal]}>{Number(item.balance || 0).toLocaleString()}</Text>
          </View>
        );
      })}

      {items.length === 0 && (
        <View style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>
          <Text>No transaction records found for this period.</Text>
        </View>
      )}
    </View>
  </BaseLayout>
);
