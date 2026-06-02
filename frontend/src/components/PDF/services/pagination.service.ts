import { PrintableLedgerItem } from '../types/printableLedger.types';

export interface ChunkedLedgerPage {
  pageIndex: number;
  items: PrintableLedgerItem[];
  openingBalance: number;
  closingBalance: number;
  isFirstPage: boolean;
  isLastPage: boolean;
}

/**
 * Handles page chunking and running carry-forward calculations 
 * for large transaction ledgers exceeding 200 rows.
 */
export const paginateLedger = (
  items: PrintableLedgerItem[],
  initialOpeningBalance: number,
  chunkSize: number = 25
): ChunkedLedgerPage[] => {
  if (!items || items.length === 0) {
    return [{
      pageIndex: 0,
      items: [],
      openingBalance: initialOpeningBalance,
      closingBalance: initialOpeningBalance,
      isFirstPage: true,
      isLastPage: true
    }];
  }

  const pages: ChunkedLedgerPage[] = [];
  let runningOpeningBalance = initialOpeningBalance;
  
  const totalItems = items.length;
  let cursor = 0;
  let pageIndex = 0;

  while (cursor < totalItems) {
    const end = Math.min(cursor + chunkSize, totalItems);
    const pageItems = items.slice(cursor, end);

    // Calculate closing balance for this page chunk
    let currentBal = runningOpeningBalance;
    pageItems.forEach(item => {
      const inQty = Number(item.inQty || 0);
      const outQty = Number(item.outQty || 0);
      currentBal = currentBal + inQty - outQty;
      // Inject corrected balance value to maintain strict row audit trails
      item.balance = currentBal;
    });

    const isFirstPage = pageIndex === 0;
    const isLastPage = end >= totalItems;

    pages.push({
      pageIndex,
      items: pageItems,
      openingBalance: runningOpeningBalance,
      closingBalance: currentBal,
      isFirstPage,
      isLastPage
    });

    runningOpeningBalance = currentBal;
    cursor = end;
    pageIndex++;
  }

  return pages;
};
