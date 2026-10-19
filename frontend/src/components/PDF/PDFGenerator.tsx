import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

interface PDFGeneratorProps {
  type: 'SALES_ORDER' | 'PURCHASE_ORDER' | 'PRODUCTION_ORDER' | 'STOCK_LEDGER' | 'QUOTATION';
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

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const toastId = toast.loading('Generating PDF...');

      // Dynamic import loads heavy @react-pdf/renderer and template components on demand
      const { generatePdfBlob } = await import('./pdfRendererService');
      const blob = await generatePdfBlob(type, data, companyInfo);

      if (!blob || blob.size < 5000) {
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
export default PDFGenerator;
