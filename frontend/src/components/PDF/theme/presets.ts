import { ThemePreset } from '../types/printableCommon.types';

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    text: string;
    muted: string;
    border: string;
    bgHeader: string;
    bgAlternate: string;
    success: string;
    danger: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    title: number;
    heading: number;
    subheading: number;
    body: number;
    small: number;
    tiny: number;
  };
  borders: {
    thin: number;
    medium: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
  };
  watermarkOpacity: number;
}

export const presets: Record<ThemePreset, DesignTokens> = {
  zoho: {
    colors: {
      primary: '#1F4E78',      // Rich Corporate Blue
      secondary: '#2F5597',    // Slightly Lighter Navy
      text: '#1F2937',         // Cool Dark Charcoal
      muted: '#6B7280',        // Cool Gray
      border: '#E5E7EB',       // Soft light gray
      bgHeader: '#F3F4F6',     // Header row backgrounds
      bgAlternate: '#F9FAFB',  // Table row zebra stripes
      success: '#10B981',
      danger: '#EF4444'
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    typography: { title: 18, heading: 12, subheading: 10, body: 8.5, small: 7.5, tiny: 6.5 },
    borders: { thin: 0.5, medium: 1, color: '#E5E7EB', style: 'solid' },
    watermarkOpacity: 0.08
  },
  tally: {
    colors: {
      primary: '#0B6623',      // Tally Forest Green
      secondary: '#3F704D',    // Muted Sage Green
      text: '#000000',         // Rich pure black for Tally high-contrast standard
      muted: '#4B5563',        // Slate gray
      border: '#9CA3AF',       // Medium gray borders for high readability
      bgHeader: '#F3FBF5',     // Tinted light green headers
      bgAlternate: '#FFFFFF',  // Tally doesn't typically alternate row colors
      success: '#047857',
      danger: '#DC2626'
    },
    spacing: { xs: 3, sm: 6, md: 10, lg: 14, xl: 20 },
    typography: { title: 17, heading: 11, subheading: 9.5, body: 8, small: 7, tiny: 6 },
    borders: { thin: 0.8, medium: 1.5, color: '#9CA3AF', style: 'solid' },
    watermarkOpacity: 0.05
  },
  modern: {
    colors: {
      primary: '#0F172A',      // Slate 900
      secondary: '#475569',    // Slate 600
      text: '#0F172A',         // Slate 900
      muted: '#64748B',        // Slate 500
      border: '#E2E8F0',       // Slate 200
      bgHeader: '#F8FAFC',     // Slate 50
      bgAlternate: '#F1F5F9',  // Slate 100
      success: '#059669',
      danger: '#E11D48'
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    typography: { title: 18, heading: 12, subheading: 10, body: 8.5, small: 7.5, tiny: 6.5 },
    borders: { thin: 0.5, medium: 1, color: '#E2E8F0', style: 'solid' },
    watermarkOpacity: 0.07
  },
  minimal: {
    colors: {
      primary: '#000000',      // Monochrome Pure Black
      secondary: '#374151',    // Gray 700
      text: '#111827',         // Gray 900
      muted: '#9CA3AF',        // Gray 400
      border: '#D1D5DB',       // Gray 300
      bgHeader: '#FFFFFF',     // Clean white
      bgAlternate: '#FFFFFF',  // Clean white
      success: '#10B981',
      danger: '#EF4444'
    },
    spacing: { xs: 4, sm: 6, md: 10, lg: 14, xl: 22 },
    typography: { title: 16, heading: 11, subheading: 9.5, body: 8, small: 7, tiny: 6 },
    borders: { thin: 0.5, medium: 0.5, color: '#D1D5DB', style: 'solid' },
    watermarkOpacity: 0.04
  }
};
