import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, Edit, ChevronUp, ChevronDown, Eye, Search, 
  ChevronLeft, ChevronRight, Inbox, X 
} from 'lucide-react';

interface DataTableProps {
  columns: string[];
  rows: any[][];
  onDelete?: (idx: number) => void;
  onEdit?: (idx: number) => void;
  onView?: (idx: number) => void;
  onRowClick?: (idx: number) => void;
  customActions?: (idx: number) => React.ReactNode;
  columnWidths?: string[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
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

export const DataTable: React.FC<DataTableProps> = ({ 
  columns, 
  rows, 
  onDelete, 
  onEdit, 
  onView, 
  onRowClick,
  customActions,
  columnWidths,
  searchable = false,
  searchPlaceholder = 'Search records...',
  pageSize
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset page when search or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, rows.length]);

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

  // 1. Filter by search term if searchable
  const filteredMappedRows = useMemo(() => {
    if (!searchTerm.trim()) return mappedRows;
    const term = searchTerm.toLowerCase().trim();
    return mappedRows.filter(({ row }) => {
      return row.some(cell => {
        const val = getCellValue(cell);
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [mappedRows, searchTerm]);

  // 2. Sort filtered rows
  const sortedMappedRows = useMemo(() => {
    if (sortCol === null) return filteredMappedRows;
    return [...filteredMappedRows].sort((a, b) => {
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
  }, [filteredMappedRows, sortCol, sortAsc]);

  // 3. Paginate if pageSize is specified and valid
  const effectivePageSize = pageSize && pageSize > 0 ? pageSize : null;
  const totalPages = effectivePageSize ? Math.max(1, Math.ceil(sortedMappedRows.length / effectivePageSize)) : 1;
  const paginatedRows = useMemo(() => {
    if (!effectivePageSize) return sortedMappedRows;
    const start = (currentPage - 1) * effectivePageSize;
    return sortedMappedRows.slice(start, start + effectivePageSize);
  }, [sortedMappedRows, effectivePageSize, currentPage]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
      {/* Optional Search Bar Header */}
      {searchable && (
        <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {sortedMappedRows.length} {sortedMappedRows.length === 1 ? 'record' : 'records'}
          </div>
        </div>
      )}

      {/* Desktop View */}
      <div className="hidden sm:block overflow-x-auto overflow-y-auto max-h-[80vh]">
        <table className="w-full text-sm" data-datatable="true">
          <thead className="sticky top-0 bg-muted/95 backdrop-blur z-10 border-b border-border shadow-xs">
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
              {(onView || onDelete || onEdit || customActions) && (
                <th className="px-4 py-3 text-right text-muted-foreground font-medium">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onDelete || onEdit || customActions ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-muted-foreground/40" />
                    <p className="font-medium text-sm text-foreground">No records found</p>
                    {searchTerm && (
                      <p className="text-xs text-muted-foreground">No results matching "{searchTerm}"</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map(({ row, index }) => (
                <tr 
                  key={index}
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
                  {(onView || onDelete || onEdit || customActions) && (
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      {customActions && customActions(index)}
                      {onView && (
                        <button onClick={(e) => { e.stopPropagation(); onView(index); }} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors" title="View details">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onEdit && (
                        <button onClick={(e) => { e.stopPropagation(); onEdit(index); }} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(index); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
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
        {paginatedRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
            <Inbox className="w-7 h-7 text-muted-foreground/40" />
            <p className="font-medium text-sm text-foreground">No records found</p>
          </div>
        ) : (
          paginatedRows.map(({ row, index }) => (
            <div 
              key={index} 
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
              {(onView || onDelete || onEdit || customActions) && (
                <div className="flex flex-wrap gap-2 pt-3 mt-2 border-t border-border/30">
                  {customActions && customActions(index)}
                  {onView && (
                    <button onClick={(e) => { e.stopPropagation(); onView(index); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-blue-500/10 text-blue-600 font-semibold text-xs transition-colors hover:bg-blue-500/20">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  )}
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

      {/* Pagination Footer (when effectivePageSize is active and rows exist) */}
      {effectivePageSize && sortedMappedRows.length > effectivePageSize && (
        <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing {((currentPage - 1) * effectivePageSize) + 1} to {Math.min(currentPage * effectivePageSize, sortedMappedRows.length)} of {sortedMappedRows.length} entries
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
