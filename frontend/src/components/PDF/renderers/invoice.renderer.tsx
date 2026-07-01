import React from 'react';
import { adaptOrderToPrintable } from '../adapters/order.adapter';
import { PDFErrorBoundary } from '../errors/PDFErrorBoundary';
import { BaseLayout } from '../layouts/BaseLayout';
import { InvoiceTemplate } from '../templates/InvoiceTemplate';
import { ThemePreset, PrintDensity, WatermarkType } from '../types/printableCommon.types';
import { pdfTelemetry } from '../monitoring/pdfTelemetry.service';

interface RenderInvoiceProps {
  rawOrder: any;
  companyInfo: {
    name: string;
    address: string;
    gst?: string;
    contact: string;
    phone?: string;
    logo?: string | null;
    bankName?: string;
    bankAccount?: string;
    bankIfsc?: string;
    bankBranch?: string;
  };
  documentType: 'SALES ORDER' | 'QUOTATION' | 'PURCHASE ORDER' | 'DELIVERY CHALLAN';
  themePreset?: ThemePreset;
  densityMode?: PrintDensity;
  watermarkText?: WatermarkType;
}

/** 
 * Enterprise Invoicing Pipeline Renderer
 * Normalizes, calculates, wraps inside a protective boundary, and outputs printable layouts.
 */
export const renderInvoicePDF = ({
  rawOrder,
  companyInfo,
  documentType,
  themePreset = 'zoho',
  densityMode = 'comfortable',
  watermarkText = null
}: RenderInvoiceProps): React.ReactElement => {
  const startTime = Date.now();
  let errMessage = '';

  try {
    // 1. Data Normalization via Adapter
    const invoice = adaptOrderToPrintable(rawOrder, companyInfo, documentType);

    // 2. Metrics logging
    const duration = Date.now() - startTime;
    pdfTelemetry.logMetric({
      documentId: invoice.invoiceNo,
      documentType,
      renderDurationMs: duration,
      pageCount: 1, 
      itemCount: invoice.items.length,
      hasLogo: !!companyInfo.logo,
      density: densityMode,
      theme: themePreset,
      status: 'SUCCESS'
    });

    return (
      <PDFErrorBoundary documentType={documentType} documentId={invoice.invoiceNo}>
        <BaseLayout
          themePreset={themePreset}
          densityMode={densityMode}
          watermarkText={watermarkText || (invoice.showWatermark ? 'CANCELLED' : null)}
        >
          <InvoiceTemplate
            invoice={invoice}
            themePreset={themePreset}
            densityMode={densityMode}
          />
        </BaseLayout>
      </PDFErrorBoundary>
    );

  } catch (error: any) {
    errMessage = error.message || 'Render Pipeline Crash';
    
    pdfTelemetry.logMetric({
      documentId: rawOrder.order_id || 'N/A',
      documentType,
      renderDurationMs: Date.now() - startTime,
      pageCount: 0,
      itemCount: 0,
      hasLogo: !!companyInfo.logo,
      density: densityMode,
      theme: themePreset,
      status: 'FAILED',
      errorMessage: errMessage
    });

    throw error;
  }
};
