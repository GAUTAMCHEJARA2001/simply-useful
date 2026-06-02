import React from 'react';
import { BaseLayout } from './BaseLayout';
import { ThemePreset, PrintDensity, WatermarkType } from '../types/printableCommon.types';

interface CompactLedgerLayoutProps {
  themePreset?: ThemePreset;
  densityMode?: PrintDensity;
  watermarkText?: WatermarkType;
  children: React.ReactNode;
}

export const CompactLedgerLayout: React.FC<CompactLedgerLayoutProps> = React.memo(({
  themePreset = 'tally',
  densityMode = 'compact',
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

CompactLedgerLayout.displayName = 'CompactLedgerLayout';
