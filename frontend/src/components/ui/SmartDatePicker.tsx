import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SmartDatePickerProps {
  value?: string; // Accepts YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, or ISO string
  onChange: (isoDate: string) => void; // Emits YYYY-MM-DD
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

// Convert any date format to YYYY-MM-DD
export const toIsoDateString = (val?: string | Date | null): string => {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }

  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {}
  return '';
};

// Convert YYYY-MM-DD to display format DD-MM-YYYY
export const toDisplayDateString = (isoDate?: string | null): string => {
  const iso = toIsoDateString(isoDate);
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SmartDatePicker: React.FC<SmartDatePickerProps> = ({
  value,
  onChange,
  disabled = false,
  className,
  inputClassName,
  placeholder = 'DD-MM-YYYY',
  minYear = 1960,
  maxYear = 2050
}) => {
  const [open, setOpen] = useState(false);
  const currentIso = toIsoDateString(value);
  const [inputText, setInputText] = useState(() => toDisplayDateString(currentIso));

  useEffect(() => {
    setInputText(toDisplayDateString(value));
  }, [value]);

  const selectedDateObj = React.useMemo(() => {
    if (!currentIso) return undefined;
    const [y, m, d] = currentIso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [currentIso]);

  // Calendar view month & year state
  const [viewMonth, setViewMonth] = useState<Date>(() => selectedDateObj || new Date());

  useEffect(() => {
    if (selectedDateObj) {
      setViewMonth(selectedDateObj);
    }
  }, [selectedDateObj]);

  const handleSelectFromCalendar = (date?: Date) => {
    if (!date) return;
    const iso = toIsoDateString(date);
    setInputText(toDisplayDateString(iso));
    onChange(iso);
    setOpen(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    // If matches DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyy = text.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10);
      const year = parseInt(ddmmyyyy[3], 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1950 && year <= 2100) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(iso);
        setViewMonth(new Date(year, month - 1, day));
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) {
      const [y, m, d] = text.trim().split('-').map(Number);
      onChange(text.trim());
      setViewMonth(new Date(y, m - 1, d));
    }
  };

  const handleBlur = () => {
    if (!inputText.trim()) {
      onChange('');
      setInputText('');
      return;
    }
    const iso = toIsoDateString(inputText);
    if (iso) {
      setInputText(toDisplayDateString(iso));
      onChange(iso);
    } else {
      setInputText(toDisplayDateString(value));
    }
  };

  const setToday = () => {
    const today = new Date();
    const iso = toIsoDateString(today);
    setInputText(toDisplayDateString(iso));
    setViewMonth(today);
    onChange(iso);
    setOpen(false);
  };

  const currentYear = viewMonth.getFullYear();
  const currentMonthIdx = viewMonth.getMonth();

  // Generate list of years (descending, covering wide range including current selection)
  const yearList = React.useMemo(() => {
    const startY = Math.max(maxYear, currentYear + 5);
    const endY = Math.min(minYear, currentYear - 5);
    const years: number[] = [];
    for (let y = startY; y >= endY; y--) {
      years.push(y);
    }
    return years;
  }, [minYear, maxYear, currentYear]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newY = parseInt(e.target.value, 10);
    if (isNaN(newY)) return;
    
    // Calculate safe day to prevent overflow (e.g. Feb 29 on non-leap year)
    const targetDay = selectedDateObj ? selectedDateObj.getDate() : 1;
    const maxDayInNewMonth = new Date(newY, viewMonth.getMonth() + 1, 0).getDate();
    const safeDay = Math.min(targetDay, maxDayInNewMonth);

    const updatedView = new Date(newY, viewMonth.getMonth(), safeDay);
    setViewMonth(updatedView);

    if (selectedDateObj) {
      const newSelected = new Date(newY, selectedDateObj.getMonth(), Math.min(selectedDateObj.getDate(), maxDayInNewMonth));
      const iso = toIsoDateString(newSelected);
      setInputText(toDisplayDateString(iso));
      onChange(iso);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newM = parseInt(e.target.value, 10);
    if (isNaN(newM)) return;

    const targetDay = selectedDateObj ? selectedDateObj.getDate() : 1;
    const maxDayInNewMonth = new Date(viewMonth.getFullYear(), newM + 1, 0).getDate();
    const safeDay = Math.min(targetDay, maxDayInNewMonth);

    const updatedView = new Date(viewMonth.getFullYear(), newM, safeDay);
    setViewMonth(updatedView);

    if (selectedDateObj) {
      const newSelected = new Date(selectedDateObj.getFullYear(), newM, Math.min(selectedDateObj.getDate(), maxDayInNewMonth));
      const iso = toIsoDateString(newSelected);
      setInputText(toDisplayDateString(iso));
      onChange(iso);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        type="text"
        disabled={disabled}
        value={inputText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full border border-border rounded-lg pl-3 pr-9 py-1.5 bg-background text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed",
          inputClassName
        )}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Open date calendar picker"
            className="absolute right-1.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background border border-border shadow-xl rounded-xl z-50" align="end">
          <div className="p-2">
            {/* Quick Month & Year Dropdown Controls */}
            <div className="flex items-center justify-between gap-1.5 pb-2 mb-1 border-b border-border/50">
              <select
                value={currentMonthIdx}
                onChange={handleMonthChange}
                aria-label="Select month"
                className="bg-muted/50 hover:bg-muted text-xs font-semibold rounded-md px-2 py-1 border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer flex-1"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={handleYearChange}
                aria-label="Select year"
                className="bg-muted/50 hover:bg-muted text-xs font-semibold rounded-md px-2 py-1 border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer w-24"
              >
                {yearList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <Calendar
              mode="single"
              month={viewMonth}
              onMonthChange={setViewMonth}
              selected={selectedDateObj}
              onSelect={handleSelectFromCalendar}
              initialFocus
            />

            <div className="flex items-center justify-between p-2 mt-1 border-t border-border/50 bg-muted/20 rounded-b-lg">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={setToday}
                className="h-7 text-xs px-2.5 font-medium text-primary hover:bg-primary/10"
              >
                Today
              </Button>
              {currentIso && (
                <span className="text-[11px] font-semibold text-foreground/80 font-mono">
                  {toDisplayDateString(currentIso)}
                </span>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
