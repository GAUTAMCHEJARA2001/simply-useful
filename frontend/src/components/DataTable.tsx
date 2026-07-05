import React, { useState, useMemo, useEffect } from 'react';
import { Trash2, Edit, ChevronUp, ChevronDown } from 'lucide-react';

interface DataTableProps {
  columns: string[];
  rows: any[][];
  onDelete?: (idx: number) => void;
  onEdit?: (idx: number) => void;
  onRowClick?: (idx: number) => void;
  columnWidths?: string[];
}

const getCellValue = (cell: any): string | number => {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const num = Number(cell);
    return isNaN(num) ? cell : num;
  }
  if (React.isValidElement(cell)) {
    const children = (cell.props as any)?.children;
    if (typeof children === 'string' || typeof children === 'number') {
      return children;
    }
  }
  return String(cell);
};

export const DataTable: React.FC<DataTableProps> = ({ columns, rows, onDelete, onEdit, onRowClick, columnWidths }) => {
  const storageKey = useMemo(() => {
    return `datatable_sort_${columns.join('_').replace(/[^a-zA-Z0-9]/g, '_')}`;
  }, [columns]);

  const [sortCol, setSortCol] = useState<number | null>(() => {
    const saved = localStorage.getItem(`${storageKey}_col`);
    return saved !== null ? Number(saved) : null;
  });
  const [sortAsc, setSortAsc] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${storageKey}_asc`);
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const savedCol = localStorage.getItem(`${storageKey}_col`);
    const savedAsc = localStorage.getItem(`${storageKey}_asc`);
    setSortCol(savedCol !== null ? Number(savedCol) : null);
    setSortAsc(savedAsc !== null ? savedAsc === 'true' : true);
  }, [storageKey]);

  const mappedRows = useMemo(() => rows.map((row, index) => ({ row, index })), [rows]);

  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      const nextAsc = !sortAsc;
      setSortAsc(nextAsc);
      localStorage.setItem(`${storageKey}_asc`, String(nextAsc));
    } else {
      setSortCol(colIndex);
      setSortAsc(true);
      localStorage.setItem(`${storageKey}_col`, String(colIndex));
      localStorage.setItem(`${storageKey}_asc`, 'true');
    }
  };

  const sortedMappedRows = useMemo(() => {
    if (sortCol === null) return mappedRows;
    return [...mappedRows].sort((a, b) => {
      const valA = getCellValue(a.row[sortCol]);
      const valB = getCellValue(b.row[sortCol]);

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      
      // Smart date parsing for en-IN format (DD/MM/YYYY)
      const normalizeDateString = (str: string) => {
        const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm))?/);
        if (match) {
          const yyyy = match[3];
          const mm = match[2].padStart(2, '0');
          const dd = match[1].padStart(2, '0');
          let hh = match[4] || '00';
          const min = match[5] || '00';
          const sec = match[6] || '00';
          const ampm = match[7] ? match[7] : '';
          
          if (ampm === 'pm' && hh !== '12') hh = String(Number(hh) + 12);
          if (ampm === 'am' && hh === '12') hh = '00';
          
          return `${yyyy}${mm}${dd}${hh.padStart(2, '0')}${min}${sec}`;
        }
        return str;
      };

      const normA = normalizeDateString(strA);
      const normB = normalizeDateString(strB);
      
      if (normA < normB) return sortAsc ? -1 : 1;
      if (normA > normB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [mappedRows, sortCol, sortAsc]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
      {/* Desktop View */}
      <div className="hidden sm:block overflow-x-auto overflow-y-auto max-h-[80vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/95 backdrop-blur z-10 border-b border-border shadow-sm">
            <tr className="bg-muted/50 border-b border-border">
              {columns.map((c, colIndex) => {
                const isSorted = sortCol === colIndex;
                return (
                  <th 
                    key={c} 
                    onClick={() => handleSort(colIndex)}
                    style={columnWidths?.[colIndex] ? { width: columnWidths[colIndex] } : undefined}
                    className="px-4 py-3 text-left text-muted-foreground font-semibold hover:text-foreground cursor-pointer select-none transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      {c}
                      {isSorted ? (
                        sortAsc ? (
                          <ChevronUp className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-primary" />
                        )
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                );
              })}
              {(onDelete || onEdit) && <th className="px-4 py-3 text-right text-muted-foreground font-medium">Action</th>}
            </tr>
          </thead>
          <tbody>
            {sortedMappedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onDelete || onEdit ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">
                  No records found
                </td>
              </tr>
            ) : (
              sortedMappedRows.map(({ row, index }) => (
                <tr key={index}
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
                    onRowClick?.(index);
                  }}
                >
                  {row.map((cell, j) => (
                    <td 
                      key={j} 
                      style={columnWidths?.[j] ? { width: columnWidths[j] } : undefined}
                      className={`px-4 py-3 whitespace-nowrap ${columnWidths?.[j] ? 'max-w-0' : ''}`}
                    >
                      <div className={columnWidths?.[j] ? 'truncate' : ''}>{cell ?? '—'}</div>
                    </td>
                  ))}
                  {(onDelete || onEdit) && (
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      {onEdit && (
                        <button onClick={() => onEdit(index)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(index)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="sm:hidden flex flex-col divide-y divide-border/50">
        {sortedMappedRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">No records found</div>
        ) : (
          sortedMappedRows.map(({ row, index }) => (
            <div key={index} 
              className={`p-4 space-y-3 ${onRowClick ? 'cursor-pointer active:bg-muted/30' : ''}`}
              onClick={(e) => {
                if (e.target instanceof HTMLElement && e.target.closest('button')) return;
                onRowClick?.(index);
              }}
            >
              <div className="grid grid-cols-2 gap-2 w-full">
                {row.map((cell, j) => (
                  <div key={j} className={j === 0 ? 'col-span-2 border-b border-border/30 pb-2 mb-1 min-w-0' : 'flex flex-col min-w-0'}>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate block">{columns[j]}</span>
                    <div className={`text-sm break-words whitespace-pre-wrap ${j === 0 ? 'font-bold text-foreground text-base' : 'font-medium'}`}>{cell ?? '—'}</div>
                  </div>
                ))}
              </div>
              {(onDelete || onEdit) && (
                <div className="flex gap-2 pt-3 mt-2 border-t border-border/30">
                  {onEdit && (
                    <button onClick={() => onEdit(index)} className="flex-1 flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-colors active:scale-[0.98]">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(index)} className="flex-1 flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-semibold transition-colors active:scale-[0.98]">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
