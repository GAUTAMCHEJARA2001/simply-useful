import React from 'react';
import { Text, View } from '@react-pdf/renderer';

interface PDFBankDetailsProps {
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  branchName?: string;
  styles: any;
}

export const PDFBankDetails: React.FC<PDFBankDetailsProps> = React.memo(({
  bankName = 'State Bank of India',
  accountNo = '31234567890',
  ifscCode = 'SBIN0001234',
  branchName = 'Main Branch',
  styles
}) => {
  return (
    <View style={styles.bankBlock} wrap={false}>
      <Text style={styles.bankTitle}>Bank Details (Electronic Transfer)</Text>
      
      <View style={styles.bankDetailRow}>
        <Text style={styles.bankLabel}>Bank Name:</Text>
        <Text style={styles.bankValue}>{bankName}</Text>
      </View>
      
      <View style={styles.bankDetailRow}>
        <Text style={styles.bankLabel}>Account No:</Text>
        <Text style={styles.bankValue}>{accountNo}</Text>
      </View>
      
      <View style={styles.bankDetailRow}>
        <Text style={styles.bankLabel}>IFSC Code:</Text>
        <Text style={styles.bankValue}>{ifscCode}</Text>
      </View>
      
      <View style={styles.bankDetailRow}>
        <Text style={styles.bankLabel}>Branch:</Text>
        <Text style={styles.bankValue}>{branchName}</Text>
      </View>
    </View>
  );
});

PDFBankDetails.displayName = 'PDFBankDetails';
