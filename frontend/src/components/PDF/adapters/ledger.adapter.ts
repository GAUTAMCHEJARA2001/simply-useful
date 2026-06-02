import { PrintableLedger, PrintableLedgerItem, PrintableLedgerSummary } from '../types/printableLedger.types';
import { PrintableCompany } from '../types/printableInvoice.types';
import { formatPDFDate } from '../utils/dateFormat';

/** Normalizes raw stock ledger payloads into PrintableLedger */
export const adaptLedgerToPrintable = (
  rawLedger: any,
  companyInfo: {
    name: string;
    address: string;
    gst?: string;
    contact: string;
    logo?: string | null;
  }
): PrintableLedger => {
  const company: PrintableCompany = {
    name: companyInfo.name || 'KAMLA INDUSTRIES',
    address: companyInfo.address || 'Phase-1, Industrial Area, Rajasthan, India',
    contact: companyInfo.contact || '',
    gst: companyInfo.gst || '08ABCDE1234F1Z5',
    pan: companyInfo.gst ? companyInfo.gst.substring(2, 12) : 'ABCDE1234F',
    cin: 'L45201RJ2001PLC012345',
    logoUrl: companyInfo.logo || null,
    state: 'Rajasthan',
    stateCode: '08'
  };

  const rawSummary = rawLedger.summary || { opening: 0, total_in: 0, total_out: 0, closing: 0 };
  
  const summary: PrintableLedgerSummary = {
    opening: Number(rawSummary.opening || 0),
    totalIn: Number(rawSummary.total_in || rawSummary.totalIn || 0),
    totalOut: Number(rawSummary.total_out || rawSummary.totalOut || 0),
    closing: Number(rawSummary.closing || 0),
    unit: rawLedger.unit || 'Bags'
  };

  const rawItems = rawLedger.ledger || rawLedger.items || [];
  
  const items: PrintableLedgerItem[] = rawItems.map((item: any, idx: number) => {
    return {
      serialNo: idx + 1,
      date: formatPDFDate(item.date),
      transactionType: String(item.transaction_type || item.type || '—'),
      referenceId: String(item.reference_id || item.refNo || '—'),
      warehouseName: String(item.warehouse_name || item.warehouse || '—'),
      inQty: Number(item.in_qty || item.inQty || 0),
      outQty: Number(item.out_qty || item.outQty || 0),
      balance: Number(item.balance || 0),
      rate: item.rate ? Number(item.rate) : undefined,
      value: item.value ? Number(item.value) : undefined
    };
  });

  return {
    productName: String(rawLedger.product_name || rawLedger.productName || 'Bags / Materials'),
    sku: String(rawLedger.sku || 'PRD-001'),
    unit: String(rawLedger.unit || 'Bags'),
    dateFrom: formatPDFDate(rawLedger.date_from || rawLedger.dateFrom || new Date()),
    dateTo: formatPDFDate(rawLedger.date_to || rawLedger.dateTo || new Date()),
    summary,
    items,
    company,
    terms: [
      '1. This stock ledger report is computer-generated and represents real-time digital balances.',
      '2. In case of quantity discrepancies, verify physical inventory allocations with your floor manager.'
    ],
    
    // Hardening Governance Mappings
    documentVersion: 'ledger-v2',
    rendererVersion: 'renderer-1.3.0',
    themeVersion: 'tally-2026.1',
    templateVersion: 'compact-ledger-v1',
    
    generatedAt: new Date().toISOString(),
    generatedBy: 'System User',
    tenantId: 'tenant-kamla',
    timezone: 'Asia/Kolkata',
    exportMode: 'download'
  };
};
