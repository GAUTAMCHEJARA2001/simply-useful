import React, { useState } from 'react';
import { downloadCSV } from '../utils/csv';
import { Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  headers: string[];
  filename: string;
  getExportRows: () => any[][];
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  headers,
  filename,
  getExportRows,
  disabled = false
}) => {
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    if (disabled) return;
    
    try {
      const rows = getExportRows();
      downloadCSV(headers, rows, filename);
      
      // Temporary check transition
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (err) {
      console.error('🔥 CSV Compilation Fail:', err);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className={cn(
        "h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-ring select-none shrink-0",
        exported
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-primary hover:bg-primary/90 text-primary-foreground",
        disabled && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground shadow-none"
      )}
    >
      {exported ? (
        <>
          <Check className="w-4 h-4 animate-bounce" />
          <span>Exported!</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </>
      )}
    </button>
  );
};
