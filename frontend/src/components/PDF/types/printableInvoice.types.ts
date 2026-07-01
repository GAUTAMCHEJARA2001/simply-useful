export interface PrintableCompany {
  name: string;
  address: string;
  contact: string;
  phone?: string;
  gst?: string;
  pan?: string;
  cin?: string;
  msme?: string;
  udyam?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankBranch?: string;
  logoUrl?: string | null;
  state: string;
  stateCode: string;
}

export interface PrintableCustomer {
  name: string;
  billingAddress: string;
  shippingAddress: string;
  gst?: string;
  pan?: string;
  mobile: string;
  email: string;
  state: string;
  stateCode: string;
  
  // Optional Shipping overrides
  shippingName?: string;
  shippingMobile?: string;
  shippingGst?: string;
  shippingState?: string;
  shippingStateCode?: string;
}

export interface PrintableInvoiceItem {
  id: string;
  serialNo: number;
  productName: string;
  productCode: string;
  hsnSac?: string;
  qty: number;
  unit: string;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxableValue: number;
  taxPercent: number;
  taxAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  total: number;
  remark?: string;
}

export interface PrintableTaxBreakup {
  taxPercent: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface PrintableTotals {
  subtotal: number; // Sum of item rates * qty (pre-discount)
  itemDiscounts: number; // Sum of item discount values
  taxableValue: number; // Sum of item taxable values (post-discount)
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number; // Sum of CGST+SGST+IGST
  cessAmount: number;
  tdsAmount: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

export interface PrintableInvoice {
  documentType: 'SALES ORDER' | 'QUOTATION' | 'PURCHASE ORDER' | 'DELIVERY CHALLAN';
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  placeOfSupply: string;
  referenceNo?: string;
  company: PrintableCompany;
  customer: PrintableCustomer;
  items: PrintableInvoiceItem[];
  taxes: PrintableTaxBreakup[];
  totals: PrintableTotals;
  terms: string[];
  signatureName: string;
  showWatermark: boolean;
  watermarkText?: 'DRAFT' | 'PAID' | 'CANCELLED' | 'DUPLICATE';
  showBankDetails?: boolean;
  
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
  
  // Multi-currency readiness
  currencyCode: string;
  currencySymbol: string;
  exchangeRate: number;
}
