import React from 'react';
import { BaseLayout } from './BaseLayout';
import { ThemePreset, PrintDensity, WatermarkType } from '../types/printableCommon.types';

interface MinimalLayoutProps {
  themePreset?: ThemePreset;
  densityMode?: PrintDensity;
  watermarkText?: WatermarkType;
  children: React.ReactNode;
}

export const MinimalLayout: React.FC<MinimalLayoutProps> = React.memo(({
  themePreset = 'minimal',
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

MinimalLayout.displayName = 'MinimalLayout';
