import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, Edit, ChevronUp, ChevronDown, Eye, Search, 
  ChevronLeft, ChevronRight, Inbox, X, RefreshCw,
  Table2, LayoutList, LayoutGrid
} from 'lucide-react';

type ViewMode = 'auto' | 'table' | 'cards' | 'grid';

interface DataTableProps {
  columns: string[];
  rows: any[][];
  loading?: boolean;
  onDelete?: (idx: number) => void;
  onEdit?: (idx: number) => void;
  onView?: (idx: number) => void;
  onRowClick?: (idx: number) => void;
  customActions?: (idx: number) => React.ReactNode;
  columnWidths?: string[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  defaultViewMode?: ViewMode;
}

const getCellValue = (cell: any): string | number => {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'string') {
    const num = Number(cell);
    return isNaN(num) ? cell : num;
  }
  if (React.isValidElement(cell)) {
    const props = cell.props as any;
    if (props?.['data-sort-value'] !== undefined) {
      const v = props['data-sort-value'];
      const num = Number(v);
      return isNaN(num) ? String(v) : num;
    }
    const extractText = (node: any): string => {
      if (node === null || node === undefined || typeof node === 'boolean') return '';
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extractText).join(' ');
      if (React.isValidElement(node)) return extractText((node.props as any)?.children);
      return '';
    };
    const extracted = extractText(props?.children).trim();
    if (extracted) {
      const num = Number(extracted);
      return isNaN(num) ? extracted : num;
    }
  }
  return String(cell);
};

export const DataTable: React.FC<DataTableProps> = ({ 
  columns, 
  rows, 
  loading = false,
  onDelete, 
  onEdit, 
  onView, 
  onRowClick,
  customActions,
  columnWidths,
  searchable = false,
  searchPlaceholder = 'Search records...',
  pageSize,
  defaultViewMode = 'auto'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedView: 'table' | 'cards' | 'grid' =
    viewMode === 'auto' ? (isMobile ? 'cards' : 'table') : viewMode;

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
      
      // Smart date parsing for en-IN format (DD/MM/YYYY) and ISO format (YYYY-MM-DD)
      const normalizeDateString = (str: string) => {
        const clean = str.trim();
        const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm))?/i);
        if (match) {
          const yyyy = match[3];
          const mm = match[2].padStart(2, '0');
          const dd = match[1].padStart(2, '0');
          let hh = match[4] || '00';
          const min = match[5] || '00';
          const sec = match[6] || '00';
          const ampm = match[7] ? match[7].toLowerCase() : '';
          
          if (ampm === 'pm' && hh !== '12') hh = String(Number(hh) + 12);
          if (ampm === 'am' && hh === '12') hh = '00';
          
          return `${yyyy}${mm}${dd}${hh.padStart(2, '0')}${min}${sec}`;
        }
        const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
          return `${isoMatch[1]}${isoMatch[2].padStart(2, '0')}${isoMatch[3].padStart(2, '0')}`;
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

  const hasActions = Boolean(onView || onDelete || onEdit || customActions);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
      {/* Toolbar: Search + Record Count + Table / Cards / Grid Switcher */}
      <div className="p-2.5 sm:p-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
        {searchable ? (
          <div className="relative flex-1 min-w-[180px] sm:max-w-sm">
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
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs font-medium text-muted-foreground">
            {sortedMappedRows.length} {sortedMappedRows.length === 1 ? 'record' : 'records'}
          </div>
        )}

        <div className="flex items-center gap-2.5 ml-auto">
          {searchable && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {sortedMappedRows.length} {sortedMappedRows.length === 1 ? 'record' : 'records'}
            </span>
          )}
          <div
            className="inline-flex items-center rounded-lg border border-border bg-background p-0.5 shadow-2xs"
            role="group"
            aria-label="Layout view"
          >
            {(
              [
                { id: 'table', label: 'Table', Icon: Table2 },
                { id: 'cards', label: 'Cards', Icon: LayoutList },
                { id: 'grid', label: 'Grid', Icon: LayoutGrid },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = resolvedView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewMode(id)}
                  title={`${label} view`}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table View */}
      {resolvedView === 'table' && (
        <div className="overflow-x-auto overflow-y-auto max-h-[80vh]">
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
                      className="px-4 py-3 text-left text-muted-foreground font-semibold hover:text-foreground cursor-pointer select-none transition-colors group whitespace-nowrap"
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
                {hasActions && (
                  <th className="px-4 py-3 text-right text-muted-foreground font-medium whitespace-nowrap">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                      <p className="font-semibold text-sm text-foreground">Loading records...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">
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
                    {hasActions && (
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        {customActions && customActions(index)}
                        {onView && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onView(index); }} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors" title="View details">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onEdit && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(index); }} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Edit">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(index); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
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
      )}

      {/* Cards & Grid Views */}
      {resolvedView !== 'table' && (
        <div>
          {loading ? (
            <div className="px-4 py-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-7 h-7 text-primary animate-spin" />
              <p className="font-semibold text-sm text-foreground">Loading records...</p>
            </div>
          ) : paginatedRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <Inbox className="w-7 h-7 text-muted-foreground/40" />
              <p className="font-medium text-sm text-foreground">No records found</p>
              {searchTerm && (
                <p className="text-xs text-muted-foreground">No results matching "{searchTerm}"</p>
              )}
            </div>
          ) : (
            <div
              className={
                resolvedView === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3'
                  : 'flex flex-col divide-y divide-border/50'
              }
            >
              {paginatedRows.map(({ row, index }) => (
                <div
                  key={index}
                  className={
                    resolvedView === 'grid'
                      ? `rounded-xl border border-border/70 bg-background/60 p-3.5 shadow-2xs hover:shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between gap-3 ${onRowClick ? 'cursor-pointer active:bg-muted/30' : ''}`
                      : `p-3.5 sm:p-4 space-y-3 ${onRowClick ? 'cursor-pointer active:bg-muted/30 hover:bg-muted/20 transition-colors' : ''}`
                  }
                  onClick={(e) => {
                    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
                    onRowClick?.(index);
                  }}
                >
                  <div className={`grid gap-2.5 w-full ${resolvedView === 'grid' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
                    {row.map((cell, j) => (
                      <div key={j} className={j === 0 ? 'col-span-full border-b border-border/40 pb-2 mb-0.5 min-w-0' : 'flex flex-col min-w-0'}>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate block">
                          {columns[j]}
                        </span>
                        <div className={`break-words whitespace-pre-wrap ${j === 0 ? 'font-bold text-foreground text-sm sm:text-base' : 'text-xs sm:text-sm font-medium'}`}>
                          {cell ?? '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasActions && (
                    <div className="flex flex-wrap gap-2 pt-2.5 border-t border-border/30">
                      {customActions && customActions(index)}
                      {onView && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onView(index); }} className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-colors hover:bg-blue-500/20">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      )}
                      {onEdit && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(index); }} className="flex-1 min-w-[70px] flex justify-center items-center gap-1.5 py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors active:scale-[0.98]">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      {onDelete && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(index); }} className="flex-1 min-w-[70px] flex justify-center items-center gap-1.5 py-2 px-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold transition-colors active:scale-[0.98]">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer (when effectivePageSize is active and rows exist) */}
      {effectivePageSize && sortedMappedRows.length > effectivePageSize && (
        <div className="p-3 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
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
