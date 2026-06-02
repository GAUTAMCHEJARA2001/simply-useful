import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { PrintableProductionOrder } from '../adapters/production.adapter';
import { getThemeStyles } from '../theme';
import { presets } from '../theme/presets';
import { PDFHeader } from '../components/PDFHeader';
import { PDFTable, PDFColumnDef } from '../components/PDFTable';
import { PDFTerms } from '../components/PDFTerms';
import { ThemePreset, PrintDensity } from '../types/printableCommon.types';

interface ProductionTemplateProps {
  production: PrintableProductionOrder;
  themePreset?: ThemePreset;
  densityMode?: PrintDensity;
}

export const ProductionTemplate: React.FC<ProductionTemplateProps> = React.memo(({
  production,
  themePreset = 'minimal',
  densityMode = 'comfortable'
}) => {
  const styles = React.useMemo(() => getThemeStyles(themePreset, densityMode), [themePreset, densityMode]);
  const tokens = React.useMemo(() => presets[themePreset] || presets.zoho, [themePreset]);

  // Column definitions for the raw materials requirement table
  const columns: PDFColumnDef<any>[] = [
    { key: 'serialNo', title: 'Sr No', width: '10%', align: 'center' },
    { key: 'code', title: 'Material SKU', width: '25%', align: 'left' },
    { key: 'name', title: 'Material Name', width: '40%', align: 'left' },
    { key: 'qty', title: 'Required Qty', width: '15%', align: 'right', formatter: (val) => Number(val).toFixed(2) },
    { key: 'unit', title: 'Unit', width: '10%', align: 'center' }
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* 1. Header */}
      <PDFHeader
        company={production.company}
        documentTitle="PRODUCTION BATCH ORDER"
        documentNo={production.orderNo}
        documentDate={production.date}
        tokens={tokens}
        styles={styles}
      />

      {/* 2. Finished Goods batch summary card */}
      <View style={{
        padding: 8,
        backgroundColor: tokens.colors.bgHeader,
        borderWidth: 0.5,
        borderColor: tokens.colors.border,
        borderRadius: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <View style={{ flexDirection: 'column' }}>
          <Text style={{ fontSize: 6.5, color: tokens.colors.muted, textTransform: 'uppercase' }}>Finished Good</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: tokens.colors.text }}>{production.productName}</Text>
        </View>
        <View style={{ flexDirection: 'column' }}>
          <Text style={{ fontSize: 6.5, color: tokens.colors.muted, textTransform: 'uppercase' }}>Batch Quantity</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: tokens.colors.text }}>{production.targetQty.toLocaleString()} {production.unit}</Text>
        </View>
        <View style={{ flexDirection: 'column' }}>
          <Text style={{ fontSize: 6.5, color: tokens.colors.muted, textTransform: 'uppercase' }}>Work Center</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: tokens.colors.text }}>{production.workCenter}</Text>
        </View>
      </View>

      {/* 3. BOM Requirement Listing */}
      <View style={{ marginTop: 6 }}>
        <Text style={{
          fontSize: tokens.typography.small,
          fontFamily: 'Helvetica-Bold',
          color: tokens.colors.secondary,
          textTransform: 'uppercase',
          borderBottomWidth: tokens.borders.thin,
          borderBottomColor: tokens.colors.border,
          borderStyle: tokens.borders.style,
          paddingBottom: 2,
          marginBottom: 4
        }}>Raw Material Requirements (BOM)</Text>
        <PDFTable columns={columns} data={production.bomItems} styles={styles} />
      </View>

      {/* 4. Production batch Remarks */}
      {production.remarks && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: tokens.colors.muted, textTransform: 'uppercase', marginBottom: 2 }}>
            Production Remarks:
          </Text>
          <Text style={{ fontSize: 8.5, color: tokens.colors.text, lineHeight: 1.3 }}>
            {production.remarks}
          </Text>
        </View>
      )}

      {/* 5. Production execution signatures */}
      <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' }} wrap={false}>
        <View style={{ width: '30%' }}>
          <View style={{ borderBottomWidth: 0.5, borderColor: '#ccc', marginBottom: 4, height: 18 }} />
          <Text style={{ textAlign: 'center', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Mixer Operator</Text>
        </View>
        <View style={{ width: '30%' }}>
          <View style={{ borderBottomWidth: 0.5, borderColor: '#ccc', marginBottom: 4, height: 18 }} />
          <Text style={{ textAlign: 'center', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>QC Inspector</Text>
        </View>
        <View style={{ width: '30%' }}>
          <View style={{ borderBottomWidth: 0.5, borderColor: '#ccc', marginBottom: 4, height: 18 }} />
          <Text style={{ textAlign: 'center', fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Floor Manager</Text>
        </View>
      </View>

      <PDFTerms terms={production.terms} styles={styles} />
    </View>
  );
});

ProductionTemplate.displayName = 'ProductionTemplate';
