import { PrintableCompany } from './printableInvoice.types';

export interface PrintableLedgerItem {
  serialNo: number;
  date: string;
  transactionType: string;
  referenceId: string;
  warehouseName: string;
  inQty: number;
  outQty: number;
  balance: number;
  rate?: number;
  value?: number;
}

export interface PrintableLedgerSummary {
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
  unit: string;
}

export interface PrintableLedger {
  productName: string;
  sku: string;
  unit: string;
  dateFrom: string;
  dateTo: string;
  summary: PrintableLedgerSummary;
  items: PrintableLedgerItem[];
  company: PrintableCompany;
  terms: string[];
  
  // Versioning Governance
  documentVersion: string;
  rendererVersion: string;
  themeVersion: string;
  templateVersion: string;
  
  // Audit Metadata Mappings
  generatedAt: string;
  generatedBy: string;
  tenantId: string;
  timezone: string;
  exportMode: 'download' | 'preview' | 'print' | 'email' | 'archive';
}
