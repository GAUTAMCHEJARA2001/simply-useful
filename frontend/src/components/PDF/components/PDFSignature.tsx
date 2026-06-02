import React from 'react';
import { Text, View } from '@react-pdf/renderer';

interface PDFSignatureProps {
  companyName: string;
  signatoryName?: string;
  styles: any;
}

export const PDFSignature: React.FC<PDFSignatureProps> = React.memo(({
  companyName,
  signatoryName = 'Authorized Signatory',
  styles
}) => {
  return (
    <View style={styles.signatureBlock} wrap={false}>
      <Text style={[styles.signatureSub, { marginBottom: 35, fontFamily: 'Helvetica-Bold' }]}>
        For {companyName}
      </Text>
      
      <View style={styles.signatureLine}>
        <Text style={styles.signatureTitle}>{signatoryName}</Text>
        <Text style={styles.signatureSub}>
          (Digitally Verified Document - Signature Verified)
        </Text>
      </View>
    </View>
  );
});

PDFSignature.displayName = 'PDFSignature';
