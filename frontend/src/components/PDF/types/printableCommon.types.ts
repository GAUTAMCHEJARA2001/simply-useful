export type PrintDensity = 'compact' | 'comfortable' | 'detailed';

export type ExportMode = 'download' | 'preview' | 'print' | 'email';

export type ThemePreset = 'zoho' | 'tally' | 'modern' | 'minimal';

export type WatermarkType = 'DRAFT' | 'PAID' | 'CANCELLED' | 'DUPLICATE' | null;

export interface PrintableCommonSettings {
  density: PrintDensity;
  exportMode: ExportMode;
  theme: ThemePreset;
  watermark: WatermarkType;
  showQRCode?: boolean;
  showBankDetails?: boolean;
}
