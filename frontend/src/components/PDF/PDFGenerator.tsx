import React from 'react';
import { pdf, Document, Page, Text, View } from '@react-pdf/renderer';

// Buffer is provided globally via CDN in index.html for @react-pdf/renderer v4
import { Button } from '@/components/ui/button';
import { Download, Save, Loader2, AlertTriangle } from 'lucide-react';
import { OrderTemplate } from './templates/OrderTemplate';
import { ProductionTemplate } from './templates/ProductionTemplate';
import { StockLedgerTemplate } from './templates/StockLedgerTemplate';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

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
    logo: settings.company_logo && settings.company_logo.startsWith('data:image') ? settings.company_logo : null
  }), [settings]);

  const getTemplate = () => {
    // Data Sanitization
    const safeItems = ((typeof data.items === 'string' ? JSON.parse(data.items) : data.items) || []).map((i: any) => {
      const qty = Number(i.qty || i.quantity || 0) || 0;
      const rate = sanitizeValue(i.price || i.rate || 0);
      return {
        product_name: safeString(i.product || i.product_name || 'Unknown Product'),
        qty,
        unit: safeString(i.unit || 'Bags'),
        rate,
        total: Number(i.total || (qty * rate) || 0) || 0,
        remark: safeString(i.item_remark || i.remark)
      };
    });

    const safeSubtotal = sanitizeValue(data.grand_total || 0);

    switch (type) {
      case 'SALES_ORDER':
      case 'PURCHASE_ORDER':
        return (
          <OrderTemplate
            type={type === 'SALES_ORDER' ? 'SALES ORDER' : 'PURCHASE ORDER'}
            orderNo={safeString(data.order_id || 'N/A')}
            date={safeString(data.date || new Date().toLocaleDateString())}
            party={{
              name: safeString(data.party_name || 'Generic Customer/Vendor'),
              address: safeString(data.address || 'N/A'),
              contact: safeString(data.contact || 'N/A'),
              gst: safeString(data.gst || 'N/A')
            }}
            items={safeItems}
            totals={{
              subtotal: safeSubtotal > 1e12 ? 0 : safeSubtotal,
              tax: 0, 
              grandTotal: safeSubtotal > 1e12 ? 0 : safeSubtotal
            }}
            company={companyInfo}
          />
        );
      case 'PRODUCTION_ORDER':
        return (
          <ProductionTemplate
            orderNo={safeString(data.order_id)}
            date={safeString(data.date)}
            product_name={safeString(data.product_name)}
            target_qty={Number(data.target_qty || 0)}
            unit={safeString(data.unit)}
            bom_items={data.bom_items || []}
            remarks={safeString(data.remarks)}
            company={companyInfo}
          />
        );
      case 'STOCK_LEDGER':
        return (
          <StockLedgerTemplate
            product_name={safeString(data.product_name)}
            sku={safeString(data.sku)}
            unit={safeString(data.unit)}
            date_from={safeString(data.date_from)}
            date_to={safeString(data.date_to)}
            summary={data.summary}
            items={data.ledger || []}
            company={companyInfo}
          />
        );
      default:
        return null;
    }
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const toastId = toast.loading('Generating PDF...');

      const getSafeTemplate = (level: 'FULL' | 'SAFE' | 'EMERGENCY') => {
        if (level === 'EMERGENCY') {
          return (
            <Document>
              <Page size="A4" style={{ padding: 40 }}>
                <Text style={{ fontSize: 20, marginBottom: 10 }}>{safeString(type)} - EMERGENCY RECOVERY</Text>
                <Text style={{ fontSize: 12, marginBottom: 5 }}>Order No: {safeString(data.order_id)}</Text>
                <Text style={{ fontSize: 10 }}>This is a plain-text recovery document because the primary layout engine failed.</Text>
                <View style={{ marginTop: 20 }}>
                    {((typeof data.items === 'string' ? JSON.parse(data.items) : data.items) || []).map((i: any, idx: number) => (
                        <Text key={idx}>{idx + 1}. {safeString(i.product || i.product_name)} - Qty: {safeString(i.qty || i.quantity)}</Text>
                    ))}
                </View>
              </Page>
            </Document>
          );
        }

        const safeItems = ((typeof data.items === 'string' ? JSON.parse(data.items) : data.items) || []).map((i: any) => {
          const qty = Number(i.qty || i.quantity || 0) || 0;
          const rate = sanitizeValue(i.price || i.rate || 0);
          return {
            product_name: safeString(i.product || i.product_name || 'Unknown Product'),
            qty,
            unit: safeString(i.unit || 'Bags'),
            rate,
            total: Number(i.total || (qty * rate) || 0) || 0,
            remark: safeString(i.item_remark || i.remark)
          };
        });

        // SAFE/EMERGENCY: Truncate items to prevent layout crashes from massive lists
        const finalItems = (level === 'FULL') ? safeItems : safeItems.slice(0, 5);

        const safeSubtotal = sanitizeValue(data.grand_total || 0);
        const safeCompany = { ...companyInfo, logo: level === 'FULL' ? companyInfo.logo : null };

        switch (type) {
          case 'SALES_ORDER':
          case 'PURCHASE_ORDER':
            return (
              <OrderTemplate
                type={type === 'SALES_ORDER' ? 'SALES ORDER' : 'PURCHASE ORDER'}
                orderNo={safeString(data.order_id || 'N/A')}
                date={safeString(data.date || new Date().toLocaleDateString())}
                party={{
                  name: safeString(data.party_name || 'N/A'),
                  address: safeString(data.address || 'N/A'),
                  contact: safeString(data.contact || 'N/A'),
                  gst: safeString(data.gst || 'N/A')
                }}
                items={finalItems}
                totals={{ subtotal: safeSubtotal, grandTotal: safeSubtotal }}
                company={safeCompany}
              />
            );
          case 'PRODUCTION_ORDER':
            return (
              <ProductionTemplate
                orderNo={safeString(data.order_id)}
                date={safeString(data.date)}
                product_name={safeString(data.product_name)}
                target_qty={Number(data.target_qty || 0)}
                unit={safeString(data.unit)}
                bom_items={data.bom_items || []}
                remarks={safeString(data.remarks)}
                company={safeCompany}
              />
            );
          case 'STOCK_LEDGER':
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
          default: return null;
        }
      };

      // Attempt 1: Full Render
      await new Promise(r => setTimeout(r, 600)); 
      let blob = await pdf(getSafeTemplate('FULL')).toBlob();
      
      // If corrupted (4KB), retry without logo (Safe Mode)
      if (blob.size < 5000) {
        console.warn("Corruption Detected (FULL). Retrying in SAFE Mode (No Logo)...");
        await new Promise(r => setTimeout(r, 1000)); 
        blob = await pdf(getSafeTemplate('SAFE')).toBlob();
      }

      // If STILL corrupted, try EMERGENCY (Ultra-Safe)
      if (blob.size < 5000) {
        console.warn("Corruption Detected (SAFE). Retrying in EMERGENCY Mode...");
        await new Promise(r => setTimeout(r, 1500)); 
        blob = await pdf(getSafeTemplate('EMERGENCY')).toBlob();
      }

      if (blob.size < 5000) {
        toast.dismiss(toastId);
        toast.error("PDF Engine Timeout. Use 'Standard Print'?", {
          action: {
            label: "Print Page",
            onClick: () => window.print()
          },
          duration: 10000
        });
        throw new Error("PDF generator failed locally. Using browser print fallback.");
      }

      toast.dismiss(toastId);
      
      // Prompt Save As
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast.success('Document saved successfully');
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success('Download triggered');

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
      className={`h-8 text-xs transition-all active:scale-95 flex items-center ${isGenerating ? 'opacity-70' : ''}`}
      onClick={handleDownload}
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Save className="w-4 h-4 mr-2" />
      )}
      {isGenerating ? 'Rendering...' : buttonLabel}
    </Button>
  );
};
