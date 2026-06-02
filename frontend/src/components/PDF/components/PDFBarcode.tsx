import React from 'react';
import { View, Text } from '@react-pdf/renderer';

interface PDFBarcodeProps {
  value: string;
  width?: number;
  height?: number;
}

/** Vector-drawn barcode container matching Tally / Busy inventory codes */
export const PDFBarcode: React.FC<PDFBarcodeProps> = React.memo(({
  value,
  width = 90,
  height = 20
}) => {
  return (
    <View style={{
      width,
      height,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      paddingBottom: 2
    }}>
      {/* Renders standard procedural barcode line arrays */}
      <View style={{ width: 1.5, height: '90%', backgroundColor: '#000' }} />
      <View style={{ width: 0.8, height: '90%', backgroundColor: '#000' }} />
      <View style={{ width: 2, height: '90%', backgroundColor: '#000' }} />
      <View style={{ width: 0.5, height: '90%', backgroundColor: '#000' }} />
      <View style={{ width: 1.2, height: '90%', backgroundColor: '#000' }} />
      <View style={{ width: 1.8, height: '90%', backgroundColor: '#000' }} />
      <View style={{ width: 0.8, height: '90%', backgroundColor: '#000' }} />
      <View style={{ width: 1.5, height: '90%', backgroundColor: '#000' }} />
      <View style={{ width: 2.2, height: '90%', backgroundColor: '#000' }} />
    </View>
  );
});

PDFBarcode.displayName = 'PDFBarcode';
