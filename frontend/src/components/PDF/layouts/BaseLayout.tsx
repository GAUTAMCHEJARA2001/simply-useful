import React from 'react';
import { Page, View, Document } from '@react-pdf/renderer';
import { getThemeStyles } from '../theme';
import { ThemePreset, PrintDensity, WatermarkType } from '../types/printableCommon.types';
import { PDFWatermark } from '../components/PDFWatermark';
import { PDFFooter } from '../components/PDFFooter';
import { registerPDFFonts } from '../fonts/registerFonts';

interface BaseLayoutProps {
  themePreset?: ThemePreset;
  densityMode?: PrintDensity;
  watermarkText?: WatermarkType;
  showFooter?: boolean;
  children: React.ReactNode;
  title?: string;
  docNumber?: string;
  date?: string;
  reference?: string;
  companyInfo?: any;
}

export const BaseLayout: React.FC<BaseLayoutProps> = React.memo(({
  themePreset = 'modern',
  densityMode = 'comfortable',
  watermarkText = null,
  showFooter = true,
  children
}) => {
  // Ensure custom font setups are registered before drawing
  React.useEffect(() => {
    registerPDFFonts();
  }, []);

  const styles = React.useMemo(() => {
    return getThemeStyles(themePreset, densityMode);
  }, [themePreset, densityMode]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Transparent text watermark overlay */}
        {watermarkText && (
          <PDFWatermark watermarkText={watermarkText} styles={styles} />
        )}

        {/* Presentational content block */}
        <View style={{ flex: 1 }}>
          {children}
        </View>

        {/* Fixed repeating footer */}
        {showFooter && (
          <PDFFooter styles={styles} />
        )}
      </Page>
    </Document>
  );
});

BaseLayout.displayName = 'BaseLayout';
