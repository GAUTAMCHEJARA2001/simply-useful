import { ThemePreset, PrintDensity } from '../types/printableCommon.types';

export interface LayoutConfig {
  layoutType: 'corporate' | 'minimal' | 'compact-ledger';
  themePreset: ThemePreset;
  densityMode: PrintDensity;
  showWatermark: boolean;
  showQRCode: boolean;
  showBankDetails: boolean;
}

export const layoutRegistry: Record<string, LayoutConfig> = {
  SALES_ORDER: {
    layoutType: 'corporate',
    themePreset: 'zoho',
    densityMode: 'comfortable',
    showWatermark: false,
    showQRCode: true,
    showBankDetails: true
  },
  PURCHASE_ORDER: {
    layoutType: 'corporate',
    themePreset: 'modern',
    densityMode: 'comfortable',
    showWatermark: false,
    showQRCode: false,
    showBankDetails: false
  },
  PRODUCTION_ORDER: {
    layoutType: 'corporate',
    themePreset: 'minimal',
    densityMode: 'comfortable',
    showWatermark: false,
    showQRCode: false,
    showBankDetails: false
  },
  STOCK_LEDGER: {
    layoutType: 'compact-ledger',
    themePreset: 'tally',
    densityMode: 'compact',
    showWatermark: false,
    showQRCode: false,
    showBankDetails: false
  }
};
