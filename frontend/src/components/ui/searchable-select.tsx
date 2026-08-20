import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = "Select...", className }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

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
    <div className={cn("relative w-full text-sm", className)} ref={containerRef}>
      <div 
        className="flex items-center justify-between w-full border border-border rounded-lg px-3 py-2 bg-background cursor-pointer text-foreground"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-md">
          <div className="flex items-center px-3 py-2 border-b border-border">
            <Search className="w-4 h-4 mr-2 text-muted-foreground opacity-50" />
            <input 
              ref={inputRef}
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder="Search..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul 
            ref={listRef}
            className="max-h-60 overflow-y-auto py-1"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground text-sm text-center">No results found.</li>
            ) : (
              filteredOptions.map((opt, idx) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={value === opt.value}
                  className={cn(
                    "flex items-center px-3 py-2 cursor-pointer text-sm",
                    activeIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
                    value === opt.value && "font-medium"
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {value === opt.value && <Check className="w-4 h-4 ml-2" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
