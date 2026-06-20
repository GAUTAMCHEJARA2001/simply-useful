import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';

interface Props {
  children: ReactNode;
  fallbackDocument?: ReactNode;
  documentType?: string;
  documentId?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/** Error Boundary protecting UI from PDF compiler crashes */
export class PDFErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PDF ERROR BOUNDARY] PDF Render Crash Caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackDocument) {
        return this.props.fallbackDocument;
      }

      // Generate a clean minimal fallback PDF so user can still print
      return (
        <Document>
          <Page size="A4" style={{ padding: 40, fontFamily: 'Helvetica' }}>
            <View style={{ borderBottomWidth: 1, borderColor: '#B91C1C', paddingBottom: 10, marginBottom: 20 }}>
              <Text style={{ fontSize: 16, color: '#B91C1C', fontWeight: 'bold' }}>
                DOCUMENT EXPORT RECOVERY
              </Text>
              <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 3 }}>
                The high-fidelity PDF Layout Engine encountered a layout overflow error. Rerouting via fallback rendering.
              </Text>
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ fontSize: 11, color: '#1F2937' }}>
                Document Type: {this.props.documentType || 'UNSPECIFIED'}
              </Text>
              <Text style={{ fontSize: 11, color: '#1F2937', marginTop: 4 }}>
                Reference ID: {this.props.documentId || 'N/A'}
              </Text>
            </View>

            <View style={{ marginTop: 30, borderStyle: 'solid', borderWidth: 0.5, borderColor: '#D1D5DB', padding: 10, borderRadius: 4 }}>
              <Text style={{ fontSize: 9, color: '#374151', lineHeight: 1.4 }}>
                Please use the standard browser print command (Ctrl+P / Command+P) as a backup recovery step, or contact ERP support.
              </Text>
            </View>
          </Page>
        </Document>
      );
    }

    return this.props.children;
  }
}
