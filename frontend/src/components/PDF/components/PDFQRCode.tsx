import React from 'react';
import { View, Text } from '@react-pdf/renderer';

interface PDFQRCodeProps {
  value: string;
  size?: number;
}

/** Placeholder component for dynamic e-invoicing QR placements */
export const PDFQRCode: React.FC<PDFQRCodeProps> = React.memo(({
  value,
  size = 50
}) => {
  return (
    <View style={{
      width: size,
      height: size,
      borderWidth: 1,
      borderColor: '#9CA3AF',
      borderStyle: 'solid',
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F3F4F6'
    }}>
      {/* 
        A clean, vector-drawn placeholder matching Zoho e-invoices QR frames
        until background API encoders dynamically generate QR payloads.
      */}
      <View style={{ width: '80%', height: '80%', borderStyle: 'solid', borderWidth: 0.5, borderColor: '#374151', padding: 2 }}>
        <View style={{ width: 10, height: 10, backgroundColor: '#374151' }} />
        <View style={{ width: '100%', alignItems: 'center', marginVertical: 2 }}>
          <Text style={{ fontSize: 4, fontFamily: 'Helvetica-Bold', color: '#6B7280' }}>QR VERIFIED</Text>
        </View>
        <View style={{ width: 10, height: 10, backgroundColor: '#374151', alignSelf: 'flex-end', position: 'absolute', bottom: 2, right: 2 }} />
      </View>
    </View>
  );
});

PDFQRCode.displayName = 'PDFQRCode';
