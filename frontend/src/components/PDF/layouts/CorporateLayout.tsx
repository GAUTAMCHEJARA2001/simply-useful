import React from 'react';
import { BaseLayout } from './BaseLayout';
import { ThemePreset, PrintDensity, WatermarkType } from '../types/printableCommon.types';

interface CorporateLayoutProps {
  themePreset?: ThemePreset;
  densityMode?: PrintDensity;
  watermarkText?: WatermarkType;
  children: React.ReactNode;
}

export const CorporateLayout: React.FC<CorporateLayoutProps> = React.memo(({
  themePreset = 'zoho',
  densityMode = 'comfortable',
  watermarkText = null,
  children
}) => {
  return (
    <BaseLayout
      themePreset={themePreset}
      densityMode={densityMode}
      watermarkText={watermarkText}
      showFooter={true}
    >
      {children}
    </BaseLayout>
  );
});

CorporateLayout.displayName = 'CorporateLayout';
