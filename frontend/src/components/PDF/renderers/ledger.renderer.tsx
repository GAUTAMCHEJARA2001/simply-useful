import React from 'react';
import { adaptLedgerToPrintable } from '../adapters/ledger.adapter';
import { PDFErrorBoundary } from '../errors/PDFErrorBoundary';
import { BaseLayout } from '../layouts/BaseLayout';
import { LedgerTemplate } from '../templates/LedgerTemplate';
import { ThemePreset, PrintDensity, WatermarkType } from '../types/printableCommon.types';
import { pdfTelemetry } from '../monitoring/pdfTelemetry.service';

interface RenderLedgerProps {
  rawLedger: any;
  companyInfo: {
    name: string;
    address: string;
    gst?: string;
    contact: string;
    logo?: string | null;
  };
  themePreset?: ThemePreset;
  densityMode?: PrintDensity;
  watermarkText?: WatermarkType;
}

/** Renders multi-page ledgers with carry-forwards safely */
export const renderLedgerPDF = ({
  rawLedger,
  companyInfo,
  themePreset = 'tally',
  densityMode = 'compact',
  watermarkText = null
}: RenderLedgerProps): React.ReactElement => {
  const startTime = Date.now();

  try {
    const ledger = adaptLedgerToPrintable(rawLedger, companyInfo);

    const duration = Date.now() - startTime;
    pdfTelemetry.logMetric({
      documentId: ledger.sku,
      documentType: 'STOCK_LEDGER',
      renderDurationMs: duration,
      pageCount: Math.ceil(ledger.items.length / 25) || 1,
      itemCount: ledger.items.length,
      hasLogo: !!companyInfo.logo,
      density: densityMode,
      theme: themePreset,
      status: 'SUCCESS'
    });

    return (
      <PDFErrorBoundary documentType="STOCK_LEDGER" documentId={ledger.sku}>
        <BaseLayout
          themePreset={themePreset}
          densityMode={densityMode}
          watermarkText={watermarkText}
        >
          <LedgerTemplate
            ledger={ledger}
            themePreset={themePreset}
            densityMode={densityMode}
          />
        </BaseLayout>
      </PDFErrorBoundary>
    );

  } catch (error: any) {
    pdfTelemetry.logMetric({
      documentId: rawLedger.sku || 'N/A',
      documentType: 'STOCK_LEDGER',
      renderDurationMs: Date.now() - startTime,
      pageCount: 0,
      itemCount: 0,
      hasLogo: !!companyInfo.logo,
      density: densityMode,
      theme: themePreset,
      status: 'FAILED',
      errorMessage: error.message || 'Ledger Renderer Failure'
    });

    throw error;
  }
};
