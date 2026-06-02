export interface PDFTelemetryMetric {
  documentId: string;
  documentType: string;
  renderDurationMs: number;
  pageCount: number;
  itemCount: number;
  hasLogo: boolean;
  timestamp: string;
  density: 'compact' | 'comfortable' | 'detailed';
  theme: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  errorMessage?: string;
}

const metricsLog: PDFTelemetryMetric[] = [];

/** Lightweight telemetry and exception logger for analytical audits */
export const pdfTelemetry = {
  logMetric(metric: Omit<PDFTelemetryMetric, 'timestamp'>): void {
    const fullMetric: PDFTelemetryMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };
    
    metricsLog.push(fullMetric);
    
    // Log corporate diagnostics cleanly
    console.log(`[PDF TELEMETRY] ${fullMetric.status} | Doc: ${fullMetric.documentType} | Duration: ${fullMetric.renderDurationMs}ms | Pages: ${fullMetric.pageCount}`);
    
    if (fullMetric.status === 'FAILED' || fullMetric.status === 'WARNING') {
      console.warn(`[PDF TELEMETRY WARNING/FAIL] Details: ${fullMetric.errorMessage || 'Unknown Warning'}`);
    }
  },

  getRecentLogs(limit: number = 20): PDFTelemetryMetric[] {
    return metricsLog.slice(-limit);
  },

  clearLogs(): void {
    metricsLog.length = 0;
  }
};
