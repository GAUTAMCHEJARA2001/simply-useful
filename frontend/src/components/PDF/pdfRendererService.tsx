import React from 'react';
import { pdf, Document, Page, Text } from '@react-pdf/renderer';

import { OrderTemplate } from './templates/OrderTemplate';
import { ProductionTemplate } from './templates/ProductionTemplate';
import { adaptProductionToPrintable } from './adapters/production.adapter';
import { StockLedgerTemplate } from './templates/StockLedgerTemplate';

// Enterprise Renderers & Flags
import { renderInvoicePDF } from './renderers/invoice.renderer';
import { renderLedgerPDF } from './renderers/ledger.renderer';
import { renderProductionPDF } from './renderers/production.renderer';
import { pdfFlags } from './config/featureFlags';

export interface CompanyInfo {
  name: string;
  address: string;
  gst: string;
  contact: string;
  phone: string;
  logo: string | null;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  bankBranch: string;
}

const safeString = (val: any) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return String(val); }
  }
  return String(val);
};

const sanitizeValue = (val: any) => {
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[₹,]/g, '').trim();
    if (cleaned === '') return 0;
    const n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }
  return 0;
};

export const resolvePDFTemplate = (
  type: 'SALES_ORDER' | 'PURCHASE_ORDER' | 'PRODUCTION_ORDER' | 'STOCK_LEDGER' | 'QUOTATION',
  data: any,
  companyInfo: CompanyInfo,
  level: 'FULL' | 'SAFE' | 'EMERGENCY' = 'FULL'
): React.ReactElement | null => {
  // 1. Emergency Mode
  if (level === 'EMERGENCY') {
    return (
      <Document>
        <Page size="A4" style={{ padding: 40 }}>
          <Text style={{ fontSize: 20, marginBottom: 10 }}>{safeString(type)} - EMERGENCY RECOVERY</Text>
          <Text style={{ fontSize: 12, marginBottom: 5 }}>Order No: {safeString(data?.order_id || data?.sku || 'N/A')}</Text>
          <Text style={{ fontSize: 10 }}>This is a plain-text recovery document because the primary layout engine failed.</Text>
        </Page>
      </Document>
    );
  }

  const safeCompany = { ...companyInfo, logo: level === 'FULL' ? companyInfo.logo : null };

  // 2. Invoices & Quotations
  if (type === 'SALES_ORDER' || type === 'PURCHASE_ORDER' || type === 'QUOTATION') {
    if (pdfFlags.enableEnterpriseInvoices) {
      return renderInvoicePDF({
        rawOrder: data,
        companyInfo: safeCompany,
        documentType: type === 'QUOTATION' ? 'QUOTATION' : (type === 'SALES_ORDER' ? 'SALES ORDER' : 'PURCHASE ORDER'),
        themePreset: type === 'SALES_ORDER' || type === 'QUOTATION' ? 'zoho' : 'modern',
        densityMode: 'comfortable'
      });
    }

    // Legacy fallback
    const safeItems = ((typeof data?.items === 'string' ? JSON.parse(data.items) : data?.items) || []).map((i: any) => {
      const originalQty = Number(i.qty || i.quantity || 0) || 0;
      const returnedQty = Number(i.returnedQty || i.returnedqty || 0) || 0;
      const netQty = Math.max(0, originalQty - returnedQty);
      const rate = sanitizeValue(i.price || i.rate || 0);
      return {
        product_name: safeString(i.productName || i.product_name || (typeof i.product === 'object' && i.product ? (i.product.name || i.product.productName) : i.product) || 'Unknown Product'),
        qty: netQty,
        unit: safeString(i.unit || 'Bags'),
        rate,
        total: Number(netQty * rate) || 0,
        remark: safeString(i.item_remark || i.remark)
      };
    });

    const recalculatedTotal = safeItems.reduce((sum: number, item: any) => sum + item.total, 0);
    const safeSubtotal = recalculatedTotal > 0 ? recalculatedTotal : sanitizeValue(data?.grand_total || data?.grandTotal || 0);

    return (
      <OrderTemplate
        type={type === 'PURCHASE_ORDER' ? 'PURCHASE ORDER' : 'SALES ORDER'}
        orderNo={safeString(data?.order_id || 'N/A')}
        date={safeString(data?.date || new Date().toLocaleDateString())}
        party={{
          name: safeString(data?.party_name || data?.partyName || data?.party?.name || 'Generic Customer'),
          address: safeString(data?.address || data?.party?.address || 'N/A'),
          contact: safeString(data?.contact || data?.party?.contact || 'N/A'),
          gst: safeString(data?.gst || data?.party?.gst || 'N/A')
        }}
        items={level === 'FULL' ? safeItems : safeItems.slice(0, 5)}
        totals={{ subtotal: safeSubtotal, tax: sanitizeValue(data?.tax || 0), grandTotal: safeSubtotal }}
        company={safeCompany}
      />
    );
  }

  // 3. Production Orders
  if (type === 'PRODUCTION_ORDER') {
    if (pdfFlags.enableEnterpriseProduction) {
      return renderProductionPDF({
        rawData: data,
        companyInfo: safeCompany,
        themePreset: 'minimal',
        densityMode: 'comfortable'
      });
    }

    const printable = adaptProductionToPrintable(data, safeCompany);
    return <ProductionTemplate production={printable} />;
  }

  // 4. Stock Ledgers
  if (type === 'STOCK_LEDGER') {
    if (pdfFlags.enableEnterpriseLedger) {
      return renderLedgerPDF({
        rawLedger: data,
        companyInfo: safeCompany,
        themePreset: 'tally',
        densityMode: 'compact'
      });
    }

    return (
      <StockLedgerTemplate
        product_name={safeString(data?.product_name)}
        sku={safeString(data?.sku)}
        unit={safeString(data?.unit)}
        date_from={safeString(data?.date_from)}
        date_to={safeString(data?.date_to)}
        summary={data?.summary}
        items={data?.ledger || []}
        company={safeCompany}
      />
    );
  }

  return null;
};

/**
 * Executes PDF rendering with resilient fallback cascade (FULL -> SAFE -> EMERGENCY).
 */
export const generatePdfBlob = async (
  type: 'SALES_ORDER' | 'PURCHASE_ORDER' | 'PRODUCTION_ORDER' | 'STOCK_LEDGER' | 'QUOTATION',
  data: any,
  companyInfo: CompanyInfo
): Promise<Blob> => {
  // Attempt 1: Full Render
  await new Promise(r => setTimeout(r, 600));
  const templateNode = resolvePDFTemplate(type, data, companyInfo, 'FULL');
  if (!templateNode) throw new Error('Failed to resolve layout template');

  let blob = await pdf(templateNode).toBlob();

  // If corrupted (< 5KB), retry without logo (Safe Mode)
  if (blob.size < 5000) {
    console.warn('Corruption Detected (FULL). Retrying in SAFE Mode (No Logo)...');
    await new Promise(r => setTimeout(r, 1000));
    const safeNode = resolvePDFTemplate(type, data, companyInfo, 'SAFE');
    if (safeNode) blob = await pdf(safeNode).toBlob();
  }

  // If STILL corrupted, try EMERGENCY (Ultra-Safe)
  if (blob.size < 5000) {
    console.warn('Corruption Detected (SAFE). Retrying in EMERGENCY Mode...');
    await new Promise(r => setTimeout(r, 1500));
    const emergencyNode = resolvePDFTemplate(type, data, companyInfo, 'EMERGENCY');
    if (emergencyNode) blob = await pdf(emergencyNode).toBlob();
  }

  return blob;
};
