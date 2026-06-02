export type DatePreset = 'this-month' | 'last-30' | 'this-qtr' | 'this-fy' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Resolves a date preset to concrete start and end boundaries.
 * Supports standard rolling periods, Indian FY convention, and custom bounds.
 */
export function resolveDateRange(
  preset: DatePreset,
  customStart?: string | Date,
  customEnd?: string | Date
): DateRange {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (preset) {
    case 'this-month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'last-30': {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'this-qtr': {
      // Indian Financial Quarters: Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)
      const month = now.getMonth(); // 0-11
      let qtrStartMonth = 3;
      if (month >= 3 && month <= 5) {
        qtrStartMonth = 3;
      } else if (month >= 6 && month <= 8) {
        qtrStartMonth = 6;
      } else if (month >= 9 && month <= 11) {
        qtrStartMonth = 9;
      } else {
        qtrStartMonth = 0;
      }
      const year = now.getFullYear();
      start = new Date(year, qtrStartMonth, 1);
      end = new Date(year, qtrStartMonth + 3, 0, 23, 59, 59, 999);
      break;
    }
    case 'this-fy': {
      // Indian Financial Year: April 1 to March 31
      const month = now.getMonth();
      const fyStartYear = month >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = new Date(fyStartYear, 3, 1);
      end = new Date(fyStartYear + 1, 3, 0, 23, 59, 59, 999);
      break;
    }
    case 'custom':
    default: {
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), 0, 1);
      end = customEnd ? new Date(customEnd) : new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    }
  }

  return { start, end };
}
