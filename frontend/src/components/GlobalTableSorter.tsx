import React, { useEffect } from 'react';

export const GlobalTableSorter: React.FC = () => {
  useEffect(() => {
    const handleHeaderClick = (e: MouseEvent) => {
      // Ignore if clicking on interactive child elements like checkboxes, buttons, inputs, links
      if ((e.target as HTMLElement).closest('input, button, a, select, textarea')) {
        return;
      }

      const th = (e.target as HTMLElement).closest('th');
      if (!th) return;

      const thead = th.closest('thead');
      if (!thead) return;

      const table = th.closest('table');
      if (!table) return;

      // Skip tables managed by DataTable or marked no-sort
      if (
        table.getAttribute('data-datatable') === 'true' ||
        table.getAttribute('data-no-sort') === 'true' ||
        th.getAttribute('data-no-sort') === 'true' ||
        th.colSpan > 1
      ) {
        return;
      }

      // Check if this column is an action column or checkbox column
      const colText = (th.innerText || th.textContent || '').trim().toLowerCase();
      if (!colText || colText === 'action' || colText === 'actions' || colText === '') {
        return;
      }

      const ths = Array.from(th.parentElement?.children || []);
      const colIndex = ths.indexOf(th);
      if (colIndex === -1) return;

      const tbody = table.querySelector('tbody');
      if (!tbody) return;

      const rows = Array.from(tbody.querySelectorAll(':scope > tr')) as HTMLTableRowElement[];
      if (rows.length <= 1) return;

      const currentSortCol = table.dataset.sortCol ? Number(table.dataset.sortCol) : null;
      const currentSortAsc = table.dataset.sortAsc === 'true';
      const nextAsc = currentSortCol === colIndex ? !currentSortAsc : true;

      table.dataset.sortCol = String(colIndex);
      table.dataset.sortAsc = String(nextAsc);

      // Separate total/summary rows from normal rows so they stay at the bottom
      const isTotalRow = (tr: HTMLTableRowElement) => {
        const text = tr.innerText || tr.textContent || '';
        return /^\s*(total|grand total|summary|average|net total|balance)/i.test(text);
      };

      const sortableRows: HTMLTableRowElement[] = [];
      const totalRows: HTMLTableRowElement[] = [];

      rows.forEach((r) => {
        if (isTotalRow(r)) {
          totalRows.push(r);
        } else {
          sortableRows.push(r);
        }
      });

      const getCellValue = (tr: HTMLTableRowElement, idx: number): string => {
        const cell = tr.cells[idx];
        if (!cell) return '';
        return (cell.innerText || cell.textContent || '').trim();
      };

      const parseSortValue = (str: string): { type: 'number' | 'date' | 'string'; val: number | string } => {
        if (!str || str === '—' || str === '-' || str === 'N/A' || str === 'null' || str === 'undefined') {
          return { type: 'string', val: '' };
        }

        // Try currency/number stripping symbols
        const cleanNumStr = str.replace(/[₹$,%\s]/g, '');
        if (/^-?\d+(\.\d+)?$/.test(cleanNumStr)) {
          const num = Number(cleanNumStr);
          if (!isNaN(num)) return { type: 'number', val: num };
        }

        // Try Indian date format (DD/MM/YYYY or DD-MM-YYYY with optional time)
        const inDateMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?)?/);
        if (inDateMatch) {
          const dd = inDateMatch[1].padStart(2, '0');
          const mm = inDateMatch[2].padStart(2, '0');
          const yyyy = inDateMatch[3];
          let hh = inDateMatch[4] || '00';
          const min = inDateMatch[5] || '00';
          const sec = inDateMatch[6] || '00';
          const ampm = (inDateMatch[7] || '').toLowerCase();
          if (ampm === 'pm' && hh !== '12') hh = String(Number(hh) + 12);
          if (ampm === 'am' && hh === '12') hh = '00';
          return { type: 'date', val: `${yyyy}${mm}${dd}${hh.padStart(2, '0')}${min}${sec}` };
        }

        // Try ISO date format (YYYY-MM-DD)
        const isoDateMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (isoDateMatch) {
          return { type: 'date', val: str };
        }

        return { type: 'string', val: str.toLowerCase() };
      };

      sortableRows.sort((a, b) => {
        const strA = getCellValue(a, colIndex);
        const strB = getCellValue(b, colIndex);

        // Put empty/'—' values at bottom
        const emptyA = !strA || strA === '—' || strA === '-';
        const emptyB = !strB || strB === '—' || strB === '-';
        if (emptyA && !emptyB) return 1;
        if (!emptyA && emptyB) return -1;
        if (emptyA && emptyB) return 0;

        const parsedA = parseSortValue(strA);
        const parsedB = parseSortValue(strB);

        if (parsedA.type === 'number' && parsedB.type === 'number') {
          return nextAsc
            ? (parsedA.val as number) - (parsedB.val as number)
            : (parsedB.val as number) - (parsedA.val as number);
        }

        if (parsedA.val < parsedB.val) return nextAsc ? -1 : 1;
        if (parsedA.val > parsedB.val) return nextAsc ? 1 : -1;
        return 0;
      });

      // Update DOM with sorted rows
      const fragment = document.createDocumentFragment();
      sortableRows.forEach((row) => fragment.appendChild(row));
      totalRows.forEach((row) => fragment.appendChild(row));
      tbody.appendChild(fragment);

      // Update visual indicators on TH headers
      ths.forEach((siblingTh) => {
        const existingIndicator = siblingTh.querySelector('.table-sort-indicator');
        if (existingIndicator) {
          existingIndicator.remove();
        }
        siblingTh.classList.remove('text-primary');
      });

      const indicator = document.createElement('span');
      indicator.className = 'table-sort-indicator';
      indicator.innerHTML = nextAsc ? '▲' : '▼';
      indicator.title = nextAsc ? 'Sorted Ascending' : 'Sorted Descending';
      th.appendChild(indicator);
      th.classList.add('text-primary');
    };

    document.addEventListener('click', handleHeaderClick, true);
    return () => {
      document.removeEventListener('click', handleHeaderClick, true);
    };
  }, []);

  return null;
};

export default GlobalTableSorter;
