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
  <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted/50 border-b border-border">
          {columns.map(c => <th key={c} className="px-4 py-3 text-left text-muted-foreground font-medium">{c}</th>)}
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
              {row.map((cell, j) => <td key={j} className="px-4 py-3">{cell ?? '—'}</td>)}
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
);
