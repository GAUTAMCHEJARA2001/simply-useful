import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { getPDFTimestamp } from '../utils/dateFormat';

interface PDFFooterProps {
  systemVersion?: string;
  styles: any;
}

export const PDFFooter: React.FC<PDFFooterProps> = React.memo(({
  systemVersion = 'v2.0-enterprise',
  styles
}) => {
  const timestamp = React.useMemo(() => getPDFTimestamp(), []);

  return (
    <View style={styles.footerContainer} fixed>
      {/* Left side: System version and timestamp */}
      <Text style={styles.footerLeft}>
        System Log: KAMLA OTS ({systemVersion}) | Printed: {timestamp}
      </Text>

      {/* Right side: Re-evaluation of page numbers */}
      <Text
        style={styles.footerRight}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
          `Page ${pageNumber} of ${totalPages}`
        )}
      />
    </View>
  );
});

PDFFooter.displayName = 'PDFFooter';
