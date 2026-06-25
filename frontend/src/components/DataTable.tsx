import React from 'react';
import { Trash2, Edit } from 'lucide-react';

interface DataTableProps {
  columns: string[];
  rows: any[][];
  onDelete?: (idx: number) => void;
  onEdit?: (idx: number) => void;
  onRowClick?: (idx: number) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ columns, rows, onDelete, onEdit, onRowClick }) => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    {/* Desktop View */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            {columns.map(c => <th key={c} className="px-4 py-3 text-left text-muted-foreground font-medium whitespace-nowrap">{c}</th>)}
            {(onDelete || onEdit) && <th className="px-4 py-3 text-right text-muted-foreground font-medium">Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onDelete || onEdit ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">
                No records found
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}
                className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={(e) => {
                  if (e.target instanceof HTMLElement && e.target.closest('button')) return;
                  onRowClick?.(i);
                }}
              >
                {row.map((cell, j) => <td key={j} className="px-4 py-3 whitespace-nowrap">{cell ?? '—'}</td>)}
                {(onDelete || onEdit) && (
                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    {onEdit && (
                      <button onClick={() => onEdit(i)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
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
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-muted-foreground text-sm">No records found</div>
      ) : (
        rows.map((row, i) => (
          <div key={i} 
            className={`p-4 space-y-3 ${onRowClick ? 'cursor-pointer active:bg-muted/30' : ''}`}
            onClick={(e) => {
              if (e.target instanceof HTMLElement && e.target.closest('button')) return;
              onRowClick?.(i);
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              {row.map((cell, j) => (
                <div key={j} className={j === 0 ? 'col-span-2 border-b border-border/30 pb-2 mb-1' : 'flex flex-col'}>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{columns[j]}</span>
                  <div className={`text-sm ${j === 0 ? 'font-bold text-foreground text-base' : 'font-medium'}`}>{cell ?? '—'}</div>
                </div>
              ))}
            </div>
            {(onDelete || onEdit) && (
              <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                {onEdit && (
                  <button onClick={() => onEdit(i)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(i)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
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
