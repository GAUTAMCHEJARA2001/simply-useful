import React from 'react';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { formatFYLabel } from '@/utils/financialYear';
import { CalendarRange, ChevronDown } from 'lucide-react';

/**
 * FYSelector
 * A compact dropdown that lives in the AppLayout topbar.
 * Reads & writes the global FinancialYearContext.
 */
const FYSelector: React.FC = () => {
  const { selectedFY, setSelectedFY, availableFYs, fyLabel } = useFinancialYear();

  return (
    <div className="relative flex items-center">
      <div className="flex items-center gap-1.5 h-8 pl-2.5 pr-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors shadow-sm cursor-pointer">
        <CalendarRange className="w-3.5 h-3.5 text-primary shrink-0" />
        <select
          id="fy-selector"
          value={selectedFY}
          onChange={e => setSelectedFY(e.target.value)}
          className="appearance-none bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-4"
          aria-label="Select Financial Year"
          title="Select Financial Year"
        >
          {availableFYs.map(fy => (
            <option key={fy} value={fy}>
              {formatFYLabel(fy)}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-muted-foreground pointer-events-none -ml-3" />
      </div>
    </div>
  );
};

export default FYSelector;
