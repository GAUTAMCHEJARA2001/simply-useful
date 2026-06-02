import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import {
  getCurrentFY,
  getFYBounds,
  getAvailableFYs,
  formatFYLabel,
  filterByFY,
  isDateInFY,
  FYBounds,
} from '@/utils/financialYear';

const LS_KEY = 'simplyUseful_selectedFY';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialYearContextType {
  /** Currently selected FY string, e.g. "2024-25" or "ALL" */
  selectedFY: string;
  /** Set the selected FY. Persists to localStorage. */
  setSelectedFY: (fy: string) => void;
  /** Memoised bounds for the selected FY (start / endExclusive) */
  fyBounds: FYBounds | null;
  /** All selectable FY options (most recent first), including "ALL" */
  availableFYs: string[];
  /** Formatted label for the current selection, e.g. "FY 2024-25" */
  fyLabel: string;
  /** Quick helper: is this date in the selected FY? */
  isInSelectedFY: (dateInput: string | Date | null | undefined) => boolean;
  /** Generic array filter using the selected FY */
  filterBySelectedFY: <T>(
    items: T[],
    getDate: (item: T) => string | Date | null | undefined
  ) => T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const FinancialYearContext = createContext<FinancialYearContextType | null>(null);

export const useFinancialYear = (): FinancialYearContextType => {
  const ctx = useContext(FinancialYearContext);
  if (!ctx) throw new Error('useFinancialYear must be used within FinancialYearProvider');
  return ctx;
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export const FinancialYearProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Priority: 1. URL param  2. localStorage  3. currentFY
  const getInitialFY = (): string => {
    // Check URL search param ?fy=2024-25
    try {
      const params = new URLSearchParams(window.location.search);
      const urlFY = params.get('fy');
      if (urlFY) return urlFY;
    } catch {
      /* ignore */
    }
    // Check localStorage
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return stored;
    // Fallback: current FY
    return getCurrentFY();
  };

  const availableFYs = useMemo(() => ['ALL', ...getAvailableFYs()], []);

  const [selectedFY, _setSelectedFY] = useState<string>(getInitialFY);

  const setSelectedFY = useCallback(
    (fy: string) => {
      _setSelectedFY(fy);
      localStorage.setItem(LS_KEY, fy);
      // Sync to URL without a full page reload
      try {
        const url = new URL(window.location.href);
        if (fy === 'ALL') {
          url.searchParams.delete('fy');
        } else {
          url.searchParams.set('fy', fy);
        }
        window.history.replaceState({}, '', url.toString());
      } catch {
        /* ignore */
      }
    },
    []
  );

  // Keep state in sync if the user navigates back/forward
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const urlFY = params.get('fy');
      if (urlFY && urlFY !== selectedFY) _setSelectedFY(urlFY);
      else if (!urlFY && selectedFY !== 'ALL') {
        const stored = localStorage.getItem(LS_KEY);
        _setSelectedFY(stored || getCurrentFY());
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [selectedFY]);

  // Derive bounds from selectedFY — no duplicate state
  const fyBounds = useMemo<FYBounds | null>(() => {
    if (selectedFY === 'ALL') return null;
    return getFYBounds(selectedFY);
  }, [selectedFY]);

  const fyLabel = useMemo(() => formatFYLabel(selectedFY), [selectedFY]);

  const isInSelectedFY = useCallback(
    (dateInput: string | Date | null | undefined) =>
      isDateInFY(dateInput, selectedFY),
    [selectedFY]
  );

  const filterBySelectedFY = useCallback(
    <T,>(items: T[], getDate: (item: T) => string | Date | null | undefined) =>
      filterByFY(items, getDate, selectedFY),
    [selectedFY]
  );

  const value: FinancialYearContextType = {
    selectedFY,
    setSelectedFY,
    fyBounds,
    availableFYs,
    fyLabel,
    isInSelectedFY,
    filterBySelectedFY,
  };

  return (
    <FinancialYearContext.Provider value={value}>
      {children}
    </FinancialYearContext.Provider>
  );
};
