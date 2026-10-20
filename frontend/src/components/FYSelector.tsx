import React, { useState, useEffect } from 'react';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { formatFYLabel } from '@/utils/financialYear';
import { CalendarRange, ChevronDown } from 'lucide-react';

/**
 * FYSelector
 * A compact, responsive dropdown that lives in the AppLayout topbar.
 * Reads & writes the global FinancialYearContext.
 */
const FYSelector: React.FC = () => {
  const { selectedFY, setSelectedFY, availableFYs } = useFinancialYear();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getLabel = (fy: string) => {
    if (fy === 'ALL') return isMobile ? 'All' : 'All Time';
    if (isMobile) {
      const parts = fy.split('-');
      if (parts.length === 2 && parts[0].length === 4) {
        return `FY ${parts[0].slice(2)}-${parts[1]}`;
      }
      return `FY ${fy}`;
    }
    return formatFYLabel(fy);
  };

  return (
    <div className="relative flex items-center shrink-0">
      <div className="flex items-center gap-1 sm:gap-1.5 h-8 px-1.5 sm:pl-2.5 sm:pr-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors shadow-2xs cursor-pointer">
        <CalendarRange className="w-3.5 h-3.5 text-primary shrink-0" />
        <select
          id="fy-selector"
          value={selectedFY}
          onChange={e => setSelectedFY(e.target.value)}
          className="appearance-none bg-transparent text-[11px] sm:text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-3 sm:pr-4"
          aria-label="Select Financial Year"
          title="Select Financial Year"
        >
          {availableFYs.map(fy => (
            <option key={fy} value={fy}>
              {getLabel(fy)}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-muted-foreground pointer-events-none -ml-2.5 sm:-ml-3" />
      </div>
    </div>
  );
};

export default FYSelector;
