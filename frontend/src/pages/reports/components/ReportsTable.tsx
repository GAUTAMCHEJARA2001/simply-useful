import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnDefinition<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

interface ReportsTableProps<T> {
  columns: ColumnDefinition<T>[];
  rows: T[];
  totals?: Partial<Record<keyof T | string, any>>;
  sortBy: keyof T | string | null;
  sortOrder: 'asc' | 'desc';
  onSort: (key: keyof T | string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ReportsTable<T extends { id: string | number }>({
  columns,
  rows,
  totals,
  sortBy,
  sortOrder,
  onSort,
  isLoading = false,
  emptyMessage = 'No matching report rows found.'
}: ReportsTableProps<T>) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto w-full max-h-[500px] scrollbar-thin">
        <Table className="relative w-full text-sm">
          {/* Sticky Header */}
          <TableHeader className="bg-muted/40 backdrop-blur sticky top-0 z-10 border-b border-border">
            <TableRow>
              {columns.map(col => {
                const isCurrentSort = sortBy === col.key;
                return (
                  <TableHead
                    key={String(col.key)}
                    onClick={() => col.sortable && onSort(col.key)}
                    className={cn(
                      "h-12 px-4 py-3 font-semibold text-muted-foreground transition-colors select-none",
                      col.sortable && "hover:bg-muted/80 hover:text-foreground cursor-pointer",
                      col.align === 'right' && "text-right",
                      col.align === 'center' && "text-center"
                    )}
                  >
                    <div className={cn(
                      "flex items-center gap-1.5",
                      col.align === 'right' && "justify-end",
                      col.align === 'center' && "justify-center"
                    )}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-muted-foreground/60 shrink-0">
                          {isCurrentSort ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="text-xs">Computing report values...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground text-xs">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {rows.map((row, idx) => (
                  <TableRow
                    key={String(row.id ?? idx)}
                    className={cn(
                      "border-b border-border/50 transition-colors hover:bg-muted/20",
                      idx % 2 === 1 && "bg-muted/5" // Clean traditional Zebra Rows!
                    )}
                  >
                    {columns.map(col => {
                      const value = (row as any)[col.key];
                      return (
                        <TableCell
                          key={String(col.key)}
                          className={cn(
                            "px-4 py-3.5 font-medium align-middle",
                            col.align === 'right' && "text-right font-mono",
                            col.align === 'center' && "text-center"
                          )}
                        >
                          {col.render ? col.render(value, row) : (value ?? '—')}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}

                {/* Sharded Footer Totals aggregate row */}
                {totals && rows.length > 0 && (
                  <TableRow className="font-bold bg-muted/30 border-t border-border border-double sticky bottom-0 z-10 backdrop-blur">
                    {columns.map((col, idx) => {
                      const hasTotal = totals[col.key] !== undefined;
                      return (
                        <TableCell
                          key={String(col.key)}
                          className={cn(
                            "px-4 py-3 text-foreground border-t border-double border-border-primary/40",
                            col.align === 'right' && "text-right font-mono text-primary",
                            col.align === 'center' && "text-center"
                          )}
                        >
                          {idx === 0 && !hasTotal ? 'Total Aggregate' : null}
                          {hasTotal ? (col.render ? col.render(totals[col.key], null as any) : totals[col.key]) : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
