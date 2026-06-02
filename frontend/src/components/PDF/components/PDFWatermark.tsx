import React from 'react';
import { Text, View } from '@react-pdf/renderer';

interface PDFWatermarkProps {
  watermarkText?: 'DRAFT' | 'PAID' | 'CANCELLED' | 'DUPLICATE';
  styles: any;
}

export const PDFWatermark: React.FC<PDFWatermarkProps> = React.memo(({
  watermarkText,
  styles
}) => {
  if (!watermarkText) return null;

  return (
    <View style={styles.watermarkContainer} fixed>
      <Text style={styles.watermarkText}>{watermarkText}</Text>
    </View>
  );
});

PDFWatermark.displayName = 'PDFWatermark';
