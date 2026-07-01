import React from 'react';
import { pdf, Document, Page, Text, View } from '@react-pdf/renderer';

import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { OrderTemplate } from './templates/OrderTemplate';
import { ProductionTemplate } from './templates/ProductionTemplate';
import { adaptProductionToPrintable } from './adapters/production.adapter';
import { StockLedgerTemplate } from './templates/StockLedgerTemplate';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

// Import New Enterprise Renderers & Flags
import { renderInvoicePDF } from './renderers/invoice.renderer';
import { renderLedgerPDF } from './renderers/ledger.renderer';
import { renderProductionPDF } from './renderers/production.renderer';
import { pdfFlags } from './config/featureFlags';

/** Utility to ensure all PDF text inputs are safe primitives (strings/numbers) */
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

interface PDFGeneratorProps {
  type: 'SALES_ORDER' | 'PURCHASE_ORDER' | 'PRODUCTION_ORDER' | 'STOCK_LEDGER';
  data: any;
  filename?: string;
  buttonLabel?: string;
  variant?: 'outline' | 'default' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg';
}

export const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  type,
  data,
  filename = 'document.pdf',
  buttonLabel = 'Download PDF',
  variant = 'outline',
  size = 'sm'
}) => {
  const { settings } = useData();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const companyInfo = React.useMemo(() => ({
    name: settings.company_name || 'KAMLA INDUSTRIES',
    address: settings.company_address || 'Phase-1, Industrial Area, Rajasthan, India',
    gst: settings.company_gst || '08ABCDE1234F1Z5',
    contact: `Phone: ${settings.company_phone || '+91 98765 43210'} | Email: ${settings.company_email || 'office@kamlaerl.com'}`,
    phone: settings.company_phone || '+91 98765 43210',
    logo: settings.company_logo && settings.company_logo.startsWith('data:image') ? settings.company_logo : null,
    bankName: settings.company_bank_name || 'State Bank of India',
    bankAccount: settings.company_bank_account || '31234567890',
    bankIfsc: settings.company_bank_ifsc || 'SBIN0001234',
    bankBranch: settings.company_bank_branch || 'Main Branch'
  }), [settings]);

  // Main Controller: Maps dynamic adapters or falls back to legacy formats based on flags
  const getTemplate = (level: 'FULL' | 'SAFE' | 'EMERGENCY' = 'FULL') => {
    // 1. Check Emergency Mode
    if (level === 'EMERGENCY') {
      return (
        <Document>
          <Page size="A4" style={{ padding: 40 }}>
            <Text style={{ fontSize: 20, marginBottom: 10 }}>{safeString(type)} - EMERGENCY RECOVERY</Text>
            <Text style={{ fontSize: 12, marginBottom: 5 }}>Order No: {safeString(data.order_id || data.sku || 'N/A')}</Text>
            <Text style={{ fontSize: 10 }}>This is a plain-text recovery document because the primary layout engine failed.</Text>
          </Page>
        </Document>
      );
    }

    const safeCompany = { ...companyInfo, logo: level === 'FULL' ? companyInfo.logo : null };

    // 2. Map Invoices
    if (type === 'SALES_ORDER' || type === 'PURCHASE_ORDER') {
      if (pdfFlags.enableEnterpriseInvoices) {
        return renderInvoicePDF({
          rawOrder: data,
          companyInfo: safeCompany,
          documentType: type === 'SALES_ORDER' ? 'SALES ORDER' : 'PURCHASE ORDER',
          themePreset: type === 'SALES_ORDER' ? 'zoho' : 'modern',
          densityMode: 'comfortable'
        });
      }

      // Legacy fallback
      const safeItems = ((typeof data.items === 'string' ? JSON.parse(data.items) : data.items) || []).map((i: any) => {
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
      const safeSubtotal = recalculatedTotal > 0 ? recalculatedTotal : sanitizeValue(data.grand_total || data.grandTotal || 0);

      return (
        <OrderTemplate
          type={type === 'SALES_ORDER' ? 'SALES ORDER' : 'PURCHASE ORDER'}
          orderNo={safeString(data.order_id || 'N/A')}
          date={safeString(data.date || new Date().toLocaleDateString())}
          party={{
            name: safeString(data.party_name || data.partyName || data.party?.name || 'Generic Customer'),
            address: safeString(data.address || data.party?.address || 'N/A'),
            contact: safeString(data.contact || data.party?.contact || 'N/A'),
            gst: safeString(data.gst || data.party?.gst || 'N/A')
          }}
          items={level === 'FULL' ? safeItems : safeItems.slice(0, 5)}
          totals={{ subtotal: safeSubtotal, grandTotal: safeSubtotal }}
          company={safeCompany}
        />
      );
    }

    // 3. Map Production Orders
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
      return (
        <ProductionTemplate
          production={printable}
        />
      );
    }

    // 4. Map Stock Ledgers
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
          product_name={safeString(data.product_name)}
          sku={safeString(data.sku)}
          unit={safeString(data.unit)}
          date_from={safeString(data.date_from)}
          date_to={safeString(data.date_to)}
          summary={data.summary}
          items={data.ledger || []}
          company={safeCompany}
        />
      );
    }

    return null;
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const toastId = toast.loading('Generating PDF...');

      // Attempt 1: Full Render
      await new Promise(r => setTimeout(r, 600)); 
      const templateNode = getTemplate('FULL');
      if (!templateNode) throw new Error('Failed to resolve layout template');

      let blob = await pdf(templateNode).toBlob();
      
      // If corrupted (4KB), retry without logo (Safe Mode)
      if (blob.size < 5000) {
        console.warn("Corruption Detected (FULL). Retrying in SAFE Mode (No Logo)...");
        await new Promise(r => setTimeout(r, 1000)); 
        const safeNode = getTemplate('SAFE');
        if (safeNode) blob = await pdf(safeNode).toBlob();
      }

      // If STILL corrupted, try EMERGENCY (Ultra-Safe)
      if (blob.size < 5000) {
        console.warn("Corruption Detected (SAFE). Retrying in EMERGENCY Mode...");
        await new Promise(r => setTimeout(r, 1500)); 
        const emergencyNode = getTemplate('EMERGENCY');
        if (emergencyNode) blob = await pdf(emergencyNode).toBlob();
      }

      if (blob.size < 5000) {
        toast.dismiss(toastId);
        toast.error("PDF Engine Timeout. Use standard browser print?", {
          action: {
            label: "Print Page",
            onClick: () => window.print()
          },
          duration: 10000
        });
        throw new Error("PDF generator failed locally. Using browser print fallback.");
      }

      toast.dismiss(toastId);
      
      const url = URL.createObjectURL(blob);

      // 1. Automatically open a preview of the generated PDF in a new tab/window
      try {
        const previewWindow = window.open(url, '_blank');
        if (!previewWindow) {
          console.warn("Pop-up blocked: Enable pop-ups to automatically preview PDFs.");
        }
      } catch (err) {
        console.error("Failed to open auto-preview:", err);
      }

      // 2. Automatically download the PDF to the user's local disk
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Keep the Object URL active longer so the new preview tab can fully load and display the stream
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('PDF downloaded and preview opened');

    } catch (error: any) {
      console.error('PDF Render Error:', error);
      toast.error(error.message || 'PDF Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      disabled={isGenerating}
      className={`${size === 'sm' ? 'h-7.5 text-[10px] px-2' : 'h-8 text-xs px-3'} transition-all active:scale-95 flex items-center ${isGenerating ? 'opacity-70' : ''}`}
      onClick={handleDownload}
    >
      {isGenerating ? (
        <Loader2 className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} mr-1.5 animate-spin`} />
      ) : (
        <Save className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} mr-1.5`} />
      )}
      {isGenerating ? 'Rendering...' : buttonLabel}
    </Button>
  );
};
