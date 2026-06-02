import { PrintableInvoice, PrintableInvoiceItem, PrintableCompany, PrintableCustomer } from '../types/printableInvoice.types';
import { calculateItemGST } from '../services/gst.service';
import { calculateInvoiceTotals } from '../services/totals.service';
import { formatPDFDate } from '../utils/dateFormat';
import { layoutRegistry } from '../config/layoutRegistry';

/** Normalizes raw order DTOs into a clean, canonical PrintableInvoice model */
export const adaptOrderToPrintable = (
  rawOrder: any,
  companyInfo: {
    name: string;
    address: string;
    gst?: string;
    contact: string;
    logo?: string | null;
  },
  documentType: 'TAX INVOICE' | 'QUOTATION' | 'PURCHASE ORDER' | 'DELIVERY CHALLAN'
): PrintableInvoice => {
  // 1. Map Company details (safely fall back state codes)
  const companyState = 'Rajasthan';
  const companyStateCode = '08'; // Standard Indian state code for Rajasthan

  const company: PrintableCompany = {
    name: companyInfo.name || 'KAMLA INDUSTRIES',
    address: companyInfo.address || 'Phase-1, Industrial Area, Rajasthan, India',
    contact: companyInfo.contact || '',
    gst: companyInfo.gst || '08ABCDE1234F1Z5',
    pan: companyInfo.gst ? companyInfo.gst.substring(2, 12) : 'ABCDE1234F',
    cin: 'L45201RJ2001PLC012345',
    bankName: 'State Bank of India',
    bankAccount: '31234567890',
    bankIfsc: 'SBIN0001234',
    logoUrl: companyInfo.logo || null,
    state: companyState,
    stateCode: companyStateCode
  };

  // 2. Map Customer/Party details
  const partyName = rawOrder.party_name || rawOrder.partyName || 'Walk-in Customer';
  const partyAddress = rawOrder.address || 'N/A';
  const partyContact = rawOrder.contact || '';
  const partyGst = rawOrder.gst || '';
  const partyState = 'Gujarat';
  const partyStateCode = partyGst ? partyGst.substring(0, 2) : '24'; // Standard state code for Gujarat

  const customer: PrintableCustomer = {
    name: partyName,
    billingAddress: partyAddress,
    shippingAddress: partyAddress, // Default to billing address if not provided
    gst: partyGst || undefined,
    pan: partyGst && partyGst.length >= 12 ? partyGst.substring(2, 12) : undefined,
    mobile: partyContact,
    email: rawOrder.email || 'customer@example.com',
    state: partyState,
    stateCode: partyStateCode
  };

  // Helper: safely extract a human-readable product name string from an order item DTO
  const getItemName = (item: any): string => {
    const raw = item.productName ?? item.product ?? item.product_name ?? item.name ?? '';
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      return String(o.name || o.productName || o.product_name || o.productCode || '');
    }
    return String(raw || '');
  };

  // Helper: safely extract SKU / Product Code
  const getProductCode = (item: any): string => {
    const raw = item.productCode ?? item.product_code ?? item.sku ?? '';
    if (typeof raw === 'string') return raw;
    if (item.product && typeof item.product === 'object') {
      const p = item.product as Record<string, unknown>;
      return String(p.productCode || p.product_code || p.sku || '');
    }
    return 'PRD-BAG';
  };

  // 3. Map Line Items & Calculate dynamic GST lines
  const rawItems = ((typeof rawOrder.items === 'string' ? JSON.parse(rawOrder.items) : rawOrder.items) || []);
  
  const items: PrintableInvoiceItem[] = rawItems.map((i: any, idx: number) => {
    const qty = Number(i.qty || i.quantity || 0) || 0;
    const rate = Number(i.price || i.rate || 0) || 0;
    const taxPercent = Number(i.tax_percent || i.taxPercent || 18); // Default 18% standard GST
    const discountPercent = Number(i.discount_percent || i.discountPercent || 0) || 0;

    // Apply strict GST math via services
    const gstMath = calculateItemGST({
      rate,
      qty,
      discountPercent,
      taxPercent,
      companyStateCode,
      customerStateCode: partyStateCode
    });

    return {
      id: String(i.id || i.product_code || idx),
      serialNo: idx + 1,
      productName: getItemName(i),
      productCode: getProductCode(i),
      hsnSac: '2523', // Standard cement HSN SAC code
      qty,
      unit: i.unit || 'Bags',
      rate,
      discountPercent,
      discountAmount: gstMath.discountAmount,
      taxableValue: gstMath.taxableValue,
      taxPercent,
      taxAmount: gstMath.taxAmount,
      cgstPercent: gstMath.cgstPercent,
      cgstAmount: gstMath.cgstAmount,
      sgstPercent: gstMath.sgstPercent,
      sgstAmount: gstMath.sgstAmount,
      igstPercent: gstMath.igstPercent,
      igstAmount: gstMath.igstAmount,
      total: gstMath.total,
      remark: i.remark || i.item_remark || ''
    };
  });

  // 4. Calculate Aggregate Totals & Grouped Taxes
  const aggregateResult = calculateInvoiceTotals({
    items,
    cessAmount: Number(rawOrder.cess_amount || 0),
    tdsAmount: Number(rawOrder.tds_amount || 0)
  });

  // 5. Default terms & conditions
  const terms = [
    '1. Goods once sold will not be taken back.',
    '2. All disputes are subject to local jurisdiction only.',
    '3. Interest @18% p.a. will be charged if payment is delayed beyond terms.'
  ];

  return {
    documentType,
    invoiceNo: String(rawOrder.order_id || rawOrder.id || 'N/A'),
    invoiceDate: formatPDFDate(rawOrder.date || new Date()),
    dueDate: rawOrder.due_date ? formatPDFDate(rawOrder.due_date) : undefined,
    placeOfSupply: `${customer.state} (${customer.stateCode})`,
    referenceNo: rawOrder.reference_id || rawOrder.refNo || undefined,
    company,
    customer,
    items,
    taxes: aggregateResult.taxes,
    totals: aggregateResult.totals,
    terms,
    signatureName: 'Authorized Representative',
    showWatermark: rawOrder.status === 'Cancelled',
    watermarkText: rawOrder.status === 'Cancelled' ? 'CANCELLED' : undefined,
    showBankDetails: layoutRegistry[documentType === 'TAX INVOICE' ? 'SALES_ORDER' : 'PURCHASE_ORDER']?.showBankDetails ?? true,
    
    // Hardening Governance Mappings
    documentVersion: 'invoice-v2',
    rendererVersion: 'renderer-1.3.0',
    themeVersion: 'zoho-2026.1',
    templateVersion: 'corporate-a4-v4',
    
    generatedAt: new Date().toISOString(),
    generatedBy: 'System User',
    tenantId: 'tenant-kamla',
    timezone: 'Asia/Kolkata',
    exportMode: 'download',
    
    currencyCode: 'INR',
    currencySymbol: '₹',
    exchangeRate: 1.0
  };
};
