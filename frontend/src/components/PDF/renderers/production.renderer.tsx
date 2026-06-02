import React from 'react';
import { adaptProductionToPrintable } from '../adapters/production.adapter';
import { PDFErrorBoundary } from '../errors/PDFErrorBoundary';
import { BaseLayout } from '../layouts/BaseLayout';
import { ProductionTemplate } from '../templates/ProductionTemplate';
import { ThemePreset, PrintDensity, WatermarkType } from '../types/printableCommon.types';
import { pdfTelemetry } from '../monitoring/pdfTelemetry.service';

interface RenderProductionProps {
  rawData: any;
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

/** Pipeline renderer for raw work center schedules */
export const renderProductionPDF = ({
  rawData,
  companyInfo,
  themePreset = 'minimal',
  densityMode = 'comfortable',
  watermarkText = null
}: RenderProductionProps): React.ReactElement => {
  const startTime = Date.now();

  try {
    const production = adaptProductionToPrintable(rawData, companyInfo);

    const duration = Date.now() - startTime;
    pdfTelemetry.logMetric({
      documentId: production.orderNo,
      documentType: 'PRODUCTION_ORDER',
      renderDurationMs: duration,
      pageCount: 1,
      itemCount: production.bomItems.length,
      hasLogo: !!companyInfo.logo,
      density: densityMode,
      theme: themePreset,
      status: 'SUCCESS'
    });

    return (
      <PDFErrorBoundary documentType="PRODUCTION_ORDER" documentId={production.orderNo}>
        <BaseLayout
          themePreset={themePreset}
          densityMode={densityMode}
          watermarkText={watermarkText}
        >
          <ProductionTemplate
            production={production}
            themePreset={themePreset}
            densityMode={densityMode}
          />
        </BaseLayout>
      </PDFErrorBoundary>
    );

  } catch (error: any) {
    pdfTelemetry.logMetric({
      documentId: rawData.order_no || 'N/A',
      documentType: 'PRODUCTION_ORDER',
      renderDurationMs: Date.now() - startTime,
      pageCount: 0,
      itemCount: 0,
      hasLogo: !!companyInfo.logo,
      density: densityMode,
      theme: themePreset,
      status: 'FAILED',
      errorMessage: error.message || 'Production Renderer Failure'
    });

    throw error;
  }
};
