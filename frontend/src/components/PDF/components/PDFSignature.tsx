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
  const formattedDateTime = React.useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds} +05:30`;
  }, []);

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
        <Text style={[styles.signatureSub, { fontSize: 6, color: '#4B5563', marginTop: 2, fontStyle: 'italic' }]}>
          Signed by: SIMPLY USEFUL ERP SYSTEM
        </Text>
        <Text style={[styles.signatureSub, { fontSize: 6, color: '#4B5563', fontStyle: 'italic' }]}>
          Date: {formattedDateTime}
        </Text>
      </View>
    </View>
  );
});

PDFSignature.displayName = 'PDFSignature';
