import React from 'react';
import { Text, View } from '@react-pdf/renderer';

export interface PDFColumnDef<T> {
  key: string;
  title: string;
  width: string; // percentage string (e.g. '10%') or number
  align: 'left' | 'center' | 'right';
  formatter?: (val: any, row: T) => string;
}

interface PDFTableProps<T> {
  columns: PDFColumnDef<T>[];
  data: T[];
  styles: any;
  showAlternateRows?: boolean;
}

export const PDFTable = <T extends Record<string, any>>({
  columns,
  data,
  styles,
  showAlternateRows = true
}: PDFTableProps<T>): React.ReactElement => {
  return (
    <View style={styles.tableContainer}>
      {/* Table Header Row (Repeating fixed header on new pages) */}
      <View style={styles.tableHeaderRow} fixed>
        {columns.map((col, idx) => (
          <View
            key={idx}
            style={{
              width: col.width,
              alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start'
            }}
          >
            <Text style={styles.tableHeaderCell}>{col.title}</Text>
          </View>
        ))}
      </View>

      {/* Table Body Rows */}
      {data.map((row, rowIdx) => {
        const isAlternate = showAlternateRows && rowIdx % 2 === 1;
        const rowStyle = [
          styles.tableBodyRow,
          isAlternate ? styles.tableBodyRowAlternate : null
        ].filter(Boolean);

        return (
          <View key={rowIdx} style={rowStyle as any}>
            {columns.map((col, colIdx) => {
              const rawValue = row[col.key];
              const displayValue = col.formatter ? col.formatter(rawValue, row) : String(rawValue ?? '');
              
              return (
                <View
                  key={colIdx}
                  style={{
                    width: col.width,
                    alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start'
                  }}
                >
                  <Text style={styles.tableCell}>{displayValue}</Text>
                </View>
              );
            })}
          </View>
        );
      })}

      {data.length === 0 ? (
        <View style={{ padding: 15, alignItems: 'center', opacity: 0.5 }}>
          <Text style={styles.tableCell}>No records found.</Text>
        </View>
      ) : null}
    </View>
  );
};
