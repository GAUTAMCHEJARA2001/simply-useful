import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomColor: '#eee',
    borderStyle: 'solid',
    paddingBottom: 15,
  },
  logoSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  docTitleSection: {
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb', // Modern Blue
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  docDetail: {
    fontSize: 9,
    color: '#444',
  },
  
  // Party Info
  section: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111',
    borderBottomWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomColor: '#ddd',
    borderStyle: 'solid',
    paddingBottom: 3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  partyInfo: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  
  // Table
  table: {
    width: 'auto',
    marginVertical: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomColor: '#e2e8f0',
    borderStyle: 'solid',
    alignItems: 'center',
    height: 28,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomColor: '#f1f5f9',
    borderStyle: 'solid',
    alignItems: 'center',
    height: 24,
  },
  tableRowAlternate: {
    backgroundColor: '#fcfdfe',
  },
  tableCell: {
    padding: 4,
    fontSize: 9,
  },
  
  // Column Widths
  colNo: { width: '10%', textAlign: 'left' },
  colCode: { width: '12%', textAlign: 'left' },
  colName: { width: '38%', textAlign: 'left' },
  colQty: { width: '12%', textAlign: 'center' },
  colUnit: { width: '8%', textAlign: 'center' },
  colRate: { width: '10%', textAlign: 'right' },
  colAmt: { width: '15%', textAlign: 'right' },
  
  // Totals
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    borderStyle: 'solid',
    paddingTop: 10,
  },
  totalsLabel: {
    width: 120,
    fontSize: 10,
    color: '#64748b',
    paddingVertical: 4,
    textAlign: 'right',
    marginRight: 15,
  },
  totalsValue: {
    width: 100,
    fontSize: 10,
    textAlign: 'right',
    paddingVertical: 4,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    paddingTop: 12,
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'right',
    paddingTop: 12,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopColor: '#eee',
    borderStyle: 'solid',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerInfo: {
    fontSize: 8,
    color: '#999',
  },
  signatureLine: {
    width: 150,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopColor: '#333',
    borderStyle: 'solid',
    paddingTop: 5,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
  },
  pageNumber: {
    fontSize: 8,
    color: '#999',
  }
});
