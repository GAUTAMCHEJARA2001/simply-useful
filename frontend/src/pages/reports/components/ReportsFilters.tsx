import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DatePreset } from '../utils/dateRanges';
import { AppUserRecord } from '@/contexts/DataContext';
import { Warehouse, Product, Dealer, Distributor } from '@/types';
import { Search, Calendar, BarChart3, Settings, ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
  label: string;
  options: { label: string; value: string }[] | string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions = useMemo(() => {
    return options.map(opt => typeof opt === 'string' ? { label: opt, value: opt } : opt);
  }, [options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(normalizedOptions.map(opt => opt.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === normalizedOptions.length) return `All ${label}s`;
    if (selectedValues.length > 2) return `${selectedValues.length} Selected`;
    return normalizedOptions
      .filter(opt => selectedValues.includes(opt.value))
      .map(opt => opt.label)
      .join(', ');
  }, [selectedValues, normalizedOptions, placeholder, label]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between gap-2 h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-semibold text-primary hover:bg-muted/50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring w-48 md:w-56"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-[100] w-56 md:w-64 rounded-xl border border-border/80 bg-background text-popover-foreground shadow-lg focus:outline-none max-h-60 overflow-y-auto flex flex-col p-1.5 ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-1.5 px-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] font-bold text-muted-foreground hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="overflow-y-auto max-h-48 space-y-0.5 scrollbar-thin">
            {normalizedOptions.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggleOption(option.value)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-xs font-medium hover:bg-muted/65 transition-colors cursor-pointer"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate text-zinc-900 dark:text-zinc-100">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface ReportsFiltersProps {
  preset: DatePreset;
  onChangePreset: (p: DatePreset) => void;
  customStart: string;
  onChangeCustomStart: (s: string) => void;
  customEnd: string;
  onChangeCustomEnd: (e: string) => void;
  activeDomain: 'so-performance' | 'inventory' | 'partners' | 'monthly' | 'sales-analysis';
  
  selectedSO: string;
  onChangeSO: (email: string) => void;
  
  selectedWarehouses: string[];
  onChangeWarehouses: (whs: string[]) => void;
  
  selectedInventoryProducts: string[];
  onChangeInventoryProducts: (prodIds: string[]) => void;
  
  partnerType: 'all' | 'dealer' | 'distributor';
  onChangePartnerType: (t: 'all' | 'dealer' | 'distributor') => void;
  
  selectedState: string;
  onChangeState: (st: string) => void;
  
  selectedStockStatuses: string[];
  onChangeStockStatuses: (statuses: string[]) => void;
  
  chartStyle: 'bar' | 'line' | 'pie' | 'none';
  onChangeChartStyle: (s: 'bar' | 'line' | 'pie' | 'none') => void;
  
  searchTerm: string;
  onChangeSearchTerm: (term: string) => void;

  // Sales Analysis-specific
  activeSalesView: string;
  selectedBrands: string[];
  onChangeBrands: (brands: string[]) => void;
  brandOptions: string[];
  selectedTerritories: string[];
  onChangeTerritories: (t: string[]) => void;
  territoryOptions: string[];
  selectedPartners: string[];
  onChangePartners: (partners: string[]) => void;
  selectedSalesProducts: string[];
  onChangeSalesProducts: (prods: string[]) => void;
  dealers: Dealer[];
  distributors: Distributor[];
  
  users: AppUserRecord[];
  warehouses: Warehouse[];
  products: Product[];
}

export const ReportsFilters: React.FC<ReportsFiltersProps> = ({
  preset,
  onChangePreset,
  customStart,
  onChangeCustomStart,
  customEnd,
  onChangeCustomEnd,
  activeDomain,
  
  selectedSO,
  onChangeSO,
  
  selectedWarehouses,
  onChangeWarehouses,
  
  selectedInventoryProducts,
  onChangeInventoryProducts,
  
  partnerType,
  onChangePartnerType,
  
  selectedState,
  onChangeState,
  
  selectedStockStatuses,
  onChangeStockStatuses,
  
  chartStyle,
  onChangeChartStyle,
  
  searchTerm,
  onChangeSearchTerm,

  activeSalesView,
  selectedBrands,
  onChangeBrands,
  brandOptions,
  selectedTerritories,
  onChangeTerritories,
  territoryOptions,
  selectedPartners,
  onChangePartners,
  selectedSalesProducts,
  onChangeSalesProducts,
  dealers,
  distributors,
  
  users,
  warehouses,
  products
}) => {
  // Collect all unique states from users/warehouses/products context to build state options
  const stateOptions = useMemo(() => {
    return ['Gujarat', 'Maharashtra', 'Delhi', 'Rajasthan', 'Karnataka', 'Madhya Pradesh', 'Punjab'];
  }, []);

  const salesOfficers = useMemo(() => {
    return users.filter(u => u.role === 'SALES' || u.role === 'SALES_OFFICER');
  }, [users]);

  // Unique categories from products for Sales Analysis filter
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const cat = p.categoryName ||
        (p.categoryRef && typeof p.categoryRef === 'object' ? p.categoryRef.name : '') ||
        (typeof p.category === 'object' && p.category !== null ? (p.category as any).name : '') ||
        (typeof p.category === 'string' ? p.category : '') ||
        '';
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [products]);

  const productFilterOptions = useMemo(() => {
    return products.map(p => ({
      label: p.productName || p.name || p.productCode || '',
      value: p.productCode || p.product_code || ''
    })).filter(o => o.label && o.value);
  }, [products]);

  const partnerFilterOptions = useMemo(() => {
    const uniqueValues = new Set<string>();
    const list: { label: string; value: string }[] = [];
    dealers.forEach(d => {
      const name = d.dealerName?.trim();
      if (name && !uniqueValues.has(name.toLowerCase())) {
        uniqueValues.add(name.toLowerCase());
        list.push({ label: `${name} (Dealer)`, value: name });
      }
    });
    distributors.forEach(d => {
      const name = d.distributorName?.trim();
      if (name && !uniqueValues.has(name.toLowerCase())) {
        uniqueValues.add(name.toLowerCase());
        list.push({ label: `${name} (Distributor)`, value: name });
      }
    });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [dealers, distributors]);

  const warehouseFilterOptions = useMemo(() => {
    return warehouses.map(wh => wh.name).filter(Boolean);
  }, [warehouses]);

  return (
    <Card className="relative z-30 p-4 bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-sm space-y-4">
      {/* Dynamic Header Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* Date presets selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Date Scope
          </label>
          <select
            value={preset}
            onChange={(e) => onChangePreset(e.target.value as DatePreset)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium text-foreground hover:border-accent hover:text-accent-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="this-month">This Calendar Month</option>
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="last-30">Rolling 30 Days</option>
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="this-qtr">This Fiscal Quarter</option>
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="this-fy">This Financial Year (Apr-Mar)</option>
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* Custom date range fields (only rendered on selection) */}
        {preset === 'custom' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => onChangeCustomStart(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => onChangeCustomEnd(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        )}

        {/* Chart Visualizations Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Chart Layout
          </label>
          <select
            value={chartStyle}
            onChange={(e) => onChangeChartStyle(e.target.value as any)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium text-foreground hover:border-accent hover:text-accent-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="bar">Standard Bar Chart</option>
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="line">Trend Line Chart</option>
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="pie">Share Pie Chart</option>
            <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="none">No Visualization (Table Only)</option>
          </select>
        </div>

        {/* Live Search bar */}
        <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Live Keyword
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reports data..."
              value={searchTerm}
              onChange={(e) => onChangeSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Domain-specific filters panel */}
      <div className="pt-2 border-t border-border/50 flex flex-wrap gap-4 items-center">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
          <Settings className="w-3 h-3 animate-spin-slow" /> Custom Options:
        </span>

        {/* SO Performance-specific filters */}
        {activeDomain === 'so-performance' && (
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={selectedSO}
              onChange={(e) => onChangeSO(e.target.value)}
              className="h-8 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none cursor-pointer focus:ring-1 focus:ring-ring"
            >
              <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="all">All Sales Officers</option>
              {salesOfficers.map(so => (
                <option className="text-zinc-900 dark:text-zinc-100 bg-background" key={so.id} value={so.email}>{so.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Stock/Inventory-specific filters */}
        {activeDomain === 'inventory' && (
          <div className="flex flex-wrap gap-2 items-center">
            {/* Warehouse select */}
            <MultiSelect
              label="Warehouse"
              placeholder="All Warehouses"
              options={warehouseFilterOptions}
              selectedValues={selectedWarehouses}
              onChange={onChangeWarehouses}
            />

            {/* Product select */}
            <MultiSelect
              label="Product"
              placeholder="All Products"
              options={productFilterOptions}
              selectedValues={selectedInventoryProducts}
              onChange={onChangeInventoryProducts}
            />

            {/* Safety status flags multi-select */}
            <MultiSelect
              label="Stock Status"
              placeholder="All Stock Statuses"
              options={[
                { label: 'Healthy Stock', value: 'healthy' },
                { label: '⚠️ Low Safety Stock', value: 'low' },
                { label: '🚨 Critical / Stockout', value: 'critical' },
              ]}
              selectedValues={selectedStockStatuses}
              onChange={onChangeStockStatuses}
            />
          </div>
        )}

        {/* Dealer/Distributor-specific filters */}
        {activeDomain === 'partners' && (
          <div className="flex flex-wrap gap-2 items-center">
            {/* Type selector */}
            <select
              value={partnerType}
              onChange={(e) => onChangePartnerType(e.target.value as any)}
              className="h-8 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none cursor-pointer focus:ring-1 focus:ring-ring"
            >
              <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="all">All Parties (Dealers & Distributors)</option>
              <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="dealer">Dealers Only</option>
              <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="distributor">Distributors Only</option>
            </select>

            {/* Region/State selector */}
            <select
              value={selectedState}
              onChange={(e) => onChangeState(e.target.value)}
              className="h-8 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none cursor-pointer focus:ring-1 focus:ring-ring"
            >
              <option className="text-zinc-900 dark:text-zinc-100 bg-background" value="all">All States</option>
              {stateOptions.map(st => (
                <option className="text-zinc-900 dark:text-zinc-100 bg-background" key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        )}

        {activeDomain === 'monthly' && (
          <span className="text-xs text-muted-foreground">Aggregated month-on-month summary stats</span>
        )}

        {/* Sales Analysis-specific custom options based on sub-view */}
        {activeDomain === 'sales-analysis' && (
          <div className="flex flex-wrap gap-2 items-center">
            {/* 1. Brand Filter — only rendered under Brand-wise sub-tab */}
            {activeSalesView === 'brand' && (
              <MultiSelect
                label="Brand"
                placeholder="All Brands"
                options={brandOptions.map(b => ({ label: b, value: b }))}
                selectedValues={selectedBrands}
                onChange={onChangeBrands}
              />
            )}

            {/* 2. Items/Products Filter — only rendered under Item-wise sub-tab */}
            {activeSalesView === 'item' && (
              <MultiSelect
                label="Product"
                placeholder="All Products"
                options={productFilterOptions}
                selectedValues={selectedSalesProducts}
                onChange={onChangeSalesProducts}
              />
            )}

            {/* 3. Dealer & Distributor Filter — only rendered under Counter-wise sub-tab */}
            {activeSalesView === 'counter' && (
              <MultiSelect
                label="Party"
                placeholder="All Parties"
                options={partnerFilterOptions}
                selectedValues={selectedPartners}
                onChange={onChangePartners}
              />
            )}

            {/* Territory dropdown is always visible globally in Sales Analysis */}
            <MultiSelect
              label="Territory"
              placeholder="All Territories"
              options={territoryOptions.map(t => ({ label: t, value: t }))}
              selectedValues={selectedTerritories}
              onChange={onChangeTerritories}
            />

            <span className="text-[10px] text-muted-foreground italic">
              {activeSalesView === 'brand' && "Brands and Territories filters apply globally."}
              {activeSalesView === 'item' && "Products and Territories filters apply globally."}
              {activeSalesView === 'counter' && "Parties and Territories filters apply globally."}
              {!['brand', 'item', 'counter'].includes(activeSalesView) && "Territories filter applies globally."}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

import { Card } from '@/components/ui/card';
