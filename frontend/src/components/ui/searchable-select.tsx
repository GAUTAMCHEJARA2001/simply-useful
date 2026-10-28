import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from './popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  popoverWidth?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  className,
  triggerClassName,
  popoverWidth,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.subtitle && opt.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      scrollToActive(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
      scrollToActive(activeIndex - 1);
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < filteredOptions.length) {
      e.preventDefault();
      onChange(filteredOptions[activeIndex].value);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const scrollToActive = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (index >= 0 && index < items.length) {
      const item = items[index] as HTMLElement;
      item.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between w-full border border-border rounded-lg px-2.5 py-1.5 bg-background cursor-pointer text-foreground text-xs transition-colors hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed",
            triggerClassName,
            className
          )}
        >
          <span className={cn("truncate flex items-center gap-1.5 text-left", !selectedOption && "text-muted-foreground")}>
            {selectedOption?.icon}
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-60 shrink-0 ml-1.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn(
          "p-0 w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[420px] bg-popover border border-border rounded-xl shadow-xl z-[99999] overflow-hidden",
          popoverWidth
        )}
      >
        {/* Integrated Search Bar with icon and clear */}
        <div className="flex items-center px-2.5 py-2 border-b border-border/80 bg-muted/30">
          <Search className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="w-full bg-transparent outline-none text-xs placeholder:text-muted-foreground text-foreground"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Options List */}
        <ul
          ref={listRef}
          className="max-h-60 overflow-y-auto p-1 text-xs divide-y divide-border/20"
          role="listbox"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-4 text-muted-foreground text-xs text-center">
              No results found for "{search}"
            </li>
          ) : (
            filteredOptions.map((opt, idx) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
                className={cn(
                  "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors",
                  activeIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent/60 hover:text-accent-foreground",
                  value === opt.value && "bg-primary/10 text-primary font-bold"
                )}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="truncate flex items-center gap-1.5">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {opt.subtitle && (
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {opt.subtitle}
                    </div>
                  )}
                </div>
                {value === opt.value && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
