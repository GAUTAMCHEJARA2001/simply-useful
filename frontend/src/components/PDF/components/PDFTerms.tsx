import React from 'react';
import { Text, View } from '@react-pdf/renderer';

interface PDFTermsProps {
  terms: string[];
  styles: any;
}

export const PDFTerms: React.FC<PDFTermsProps> = React.memo(({
  terms,
  styles
}) => {
  return (
    <View style={styles.termsBlock}>
      <Text style={styles.termsTitle}>Terms & Conditions:</Text>
      {terms.map((term, idx) => (
        <Text key={idx} style={styles.termsContent}>
          {term}
        </Text>
      ))}
    </View>
  );
});

PDFTerms.displayName = 'PDFTerms';
