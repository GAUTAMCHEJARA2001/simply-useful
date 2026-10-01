import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Building2, Target, Factory, ChevronDown, MapPin, Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PartyOption {
  id: string;
  name: string;
  code?: string;
  city?: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
  companyName?: string;
  type: 'Dealer' | 'Distributor' | 'Lead';
}

interface PartySearchSelectorProps {
  parties: PartyOption[];
  selectedPartyId: string;
  onSelect: (party: PartyOption | null) => void;
  className?: string;
  placeholder?: string;
}

export const PartySearchSelector: React.FC<PartySearchSelectorProps> = ({
  parties,
  selectedPartyId,
  onSelect,
  className,
  placeholder = "Search dealer, distributor, or CRM lead...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'LEAD' | 'DEALER' | 'DISTRIBUTOR'>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find currently selected party
  const selectedParty = useMemo(() => {
    if (!selectedPartyId) return null;
    return parties.find(p => {
      const leadKey = p.type === 'Lead' ? `LEAD-${p.id}` : p.id;
      return leadKey === selectedPartyId || p.id === selectedPartyId;
    }) || null;
  }, [parties, selectedPartyId]);

  // Counts
  const counts = useMemo(() => {
    let leads = 0;
    let dealers = 0;
    let dists = 0;
    for (const p of parties) {
      if (p.type === 'Lead') leads++;
      else if (p.type === 'Dealer') dealers++;
      else if (p.type === 'Distributor') dists++;
    }
    return { all: parties.length, leads, dealers, dists };
  }, [parties]);

  // Filtered parties
  const filteredParties = useMemo(() => {
    const query = search.trim().toLowerCase();
    return parties.filter(p => {
      // Category filter
      if (activeCategory === 'LEAD' && p.type !== 'Lead') return false;
      if (activeCategory === 'DEALER' && p.type !== 'Dealer') return false;
      if (activeCategory === 'DISTRIBUTOR' && p.type !== 'Distributor') return false;

      // Text search
      if (!query) return true;

      const nameMatch = p.name?.toLowerCase().includes(query);
      const cityMatch = p.city?.toLowerCase().includes(query);
      const phoneMatch = p.phone?.toLowerCase().includes(query);
      const codeMatch = p.code?.toLowerCase().includes(query);
      const contactMatch = p.contactPerson?.toLowerCase().includes(query);
      const companyMatch = p.companyName?.toLowerCase().includes(query);

      return nameMatch || cityMatch || phoneMatch || codeMatch || contactMatch || companyMatch;
    }).slice(0, 100); // Cap display for instantaneous rendering
  }, [parties, search, activeCategory]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  const getBadge = (type: 'Dealer' | 'Distributor' | 'Lead') => {
    switch (type) {
      case 'Lead':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
            <Target className="w-2.5 h-2.5" /> Lead
          </span>
        );
      case 'Distributor':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
            <Factory className="w-2.5 h-2.5" /> Distributor
          </span>
        );
      case 'Dealer':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shrink-0">
            <Building2 className="w-2.5 h-2.5" /> Dealer
          </span>
        );
    }
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between text-left rounded-xl border px-3 py-2 text-xs transition-all outline-none",
          isOpen
            ? "border-primary ring-2 ring-primary/20 bg-background shadow-xs"
            : "border-border/80 bg-background/80 hover:border-primary/50 hover:bg-background",
          selectedParty ? "text-foreground font-medium" : "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
          {selectedParty ? (
            <>
              {getBadge(selectedParty.type)}
              <span className="truncate font-semibold text-foreground">
                {selectedParty.name}
              </span>
              {selectedParty.city && (
                <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                  • {selectedParty.city}
                </span>
              )}
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-60" />
              <span className="truncate">{placeholder}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {selectedParty && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              title="Clear selection"
              className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search Bar */}
          <div className="p-2 border-b border-border/60 bg-muted/30">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, area, city, phone, code..."
                className="w-full bg-background border border-border/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false);
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Category Filter Tabs */}
            <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory('ALL')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors",
                  activeCategory === 'ALL'
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                All ({counts.all})
              </button>
              {counts.leads > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory('LEAD')}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
                    activeCategory === 'LEAD'
                      ? "bg-amber-600 text-white shadow-2xs"
                      : "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
                  )}
                >
                  <Target className="w-2.5 h-2.5" /> Leads ({counts.leads})
                </button>
              )}
              {counts.dealers > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory('DEALER')}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
                    activeCategory === 'DEALER'
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-blue-500/10 text-blue-800 dark:text-blue-200 hover:bg-blue-500/20"
                  )}
                >
                  <Building2 className="w-2.5 h-2.5" /> Dealers ({counts.dealers})
                </button>
              )}
              {counts.dists > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory('DISTRIBUTOR')}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
                    activeCategory === 'DISTRIBUTOR'
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20"
                  )}
                >
                  <Factory className="w-2.5 h-2.5" /> Distributors ({counts.dists})
                </button>
              )}
            </div>
          </div>

          {/* List of Parties */}
          <div ref={listRef} className="max-h-64 overflow-y-auto divide-y divide-border/30">
            {filteredParties.length === 0 ? (
              <div className="p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  No matching party found for "{search}"
                </p>
                <p className="text-[11px] text-muted-foreground/75">
                  You can type the party name directly into the name field below.
                </p>
              </div>
            ) : (
              filteredParties.map((party) => {
                const partyVal = party.type === 'Lead' ? `LEAD-${party.id}` : party.id;
                const isSelected = selectedPartyId === partyVal || selectedPartyId === party.id;

                return (
                  <button
                    key={`${party.type}-${party.id}`}
                    type="button"
                    onClick={() => {
                      onSelect(party);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left p-2.5 hover:bg-accent/60 transition-colors flex items-start justify-between gap-2",
                      isSelected && "bg-primary/5 dark:bg-primary/10 font-semibold"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getBadge(party.type)}
                        <span className="font-bold text-xs text-foreground truncate">
                          {party.name}
                        </span>
                        {party.code && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{party.code}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                        {party.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground/70" />
                            {party.city}
                          </span>
                        )}
                        {party.phone && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <Phone className="w-3 h-3" />
                            {party.phone}
                          </span>
                        )}
                        {party.contactPerson && party.contactPerson !== party.name && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3 text-muted-foreground/70" />
                            {party.contactPerson}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-muted/40 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Showing {filteredParties.length} parties</span>
            <span>Click to auto-fill</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default PartySearchSelector;
