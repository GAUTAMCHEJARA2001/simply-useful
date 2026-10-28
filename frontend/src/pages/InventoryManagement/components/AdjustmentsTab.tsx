import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { useAdjustments, useAdjustmentMutations } from '@/hooks/inventory/useAdjustments';
import { useProducts } from '@/hooks/inventory/useProducts';
import { useWarehouses } from '@/hooks/inventory/useMasters';
import { useAggregateStock } from '@/hooks/inventory/useStock';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { formatDecimal } from '@/utils/format';
import { SearchableSelect } from '@/components/ui/searchable-select';

export const AdjustmentsTab: React.FC = () => {
  const { data: adjustments = [], isLoading, error, refetch } = useAdjustments();
  const { data: products = [] } = useProducts({ global: true });
  const { data: warehouses = [] } = useWarehouses();
  const { data: aggregateStock = [] } = useAggregateStock();
  const { saveAdjustment, deleteAdjustment } = useAdjustmentMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedType, setSelectedType] = useState('ALL'); // ALL | IN | OUT

  const handleSave = async () => {
    await saveAdjustment(form);
    setModalOpen(false);
    setForm({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this adjustment?')) return;
    await deleteAdjustment(id);
  };

  // Distinct product options for the searchable dropdown filter
  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    // Collect from actual adjustments first so items always match
    adjustments.forEach((a: any) => {
      const pid = a.productId || a.product?.id || a.productName;
      const name = a.productName || a.product?.name;
      if (pid && name) {
        map.set(String(pid), String(name));
      }
    });
    // Supplement with master products catalog
    products.forEach((p: any) => {
      if (p.id && p.name && !map.has(String(p.id))) {
        map.set(String(p.id), String(p.name));
      }
    });

    const opts = Array.from(map.entries()).map(([val, label]) => ({
      value: val,
      label: label
    }));
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [adjustments, products]);

  // Filtered adjustments
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a: any) => {
      // 1. Searchable Product Dropdown Filter
      if (selectedProduct) {
        const aPid = String(a.productId || a.product?.id || '');
        const aName = (a.productName || a.product?.name || '').toLowerCase();
        const selTarget = selectedProduct.toLowerCase();
        const matchesProd = aPid === selectedProduct || aName === selTarget;
        if (!matchesProd) return false;
      }

      // 2. Warehouse Filter
      if (selectedWarehouse) {
        const aWhId = String(a.warehouseId || a.warehouse?.id || '');
        const aWhName = (a.warehouseName || a.warehouse?.name || '').toLowerCase();
        const selWh = selectedWarehouse.toLowerCase();
        const matchesWh = aWhId === selectedWarehouse || aWhName === selWh;
        if (!matchesWh) return false;
      }

      // 3. Direction Filter (Additions / Deductions)
      const qty = parseFloat(a.quantityChange || 0);
      if (selectedType === 'IN' && qty <= 0) return false;
      if (selectedType === 'OUT' && qty >= 0) return false;

      // 4. Text Search Bar (Product, Reason, Warehouse, Date)
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const pName = (a.productName || a.product?.name || '').toLowerCase();
        const wName = (a.warehouseName || a.warehouse?.name || '').toLowerCase();
        const reason = (a.reason || '').toLowerCase();
        const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '';
        const matchesSearch = pName.includes(term) || wName.includes(term) || reason.includes(term) || dateStr.includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [adjustments, selectedProduct, selectedWarehouse, selectedType, searchTerm]);

  const hasActiveFilters = Boolean(searchTerm || selectedProduct || selectedWarehouse || selectedType !== 'ALL');

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedProduct('');
    setSelectedWarehouse('');
    setSelectedType('ALL');
  };

  // Quick summary metrics
  const totalPositive = filteredAdjustments
    .filter((a: any) => (a.quantityChange || 0) > 0)
    .reduce((acc, a) => acc + (a.quantityChange || 0), 0);
  const totalNegative = filteredAdjustments
    .filter((a: any) => (a.quantityChange || 0) < 0)
    .reduce((acc, a) => acc + (a.quantityChange || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Stock Adjustments (Manual)</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit log of manual inventory additions, reductions, and conversions
          </p>
        </div>
        <Button size="sm" onClick={() => { setForm({}); setModalOpen(true); }} className="h-9">
          <Plus className="w-4 h-4 mr-1.5" /> New Adjustment
        </Button>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. General Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search product, reason..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Product Searchable Dropdown with Search Bar */}
          <div className="w-full">
            <SearchableSelect
              options={[
                { value: '', label: 'All Products' },
                ...productOptions
              ]}
              value={selectedProduct}
              onChange={val => setSelectedProduct(val)}
              placeholder="Filter by Product..."
              className="w-full"
            />
          </div>

          {/* 3. Warehouse Filter Dropdown */}
          <div>
            <select
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-colors"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Type / Direction Filter & Clear */}
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="flex-1 py-2 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-colors"
            >
              <option value="ALL">All Changes (+ / -)</option>
              <option value="IN">Additions (+)</option>
              <option value="OUT">Deductions (-)</option>
            </select>

            {hasActiveFilters && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearFilters}
                className="h-[38px] px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 border-dashed"
                title="Reset all filters"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filter Badges and Counter */}
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              Showing {filteredAdjustments.length} of {adjustments.length} adjustments
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                <SlidersHorizontal className="w-3 h-3" /> Filters Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Inflow: +{formatDecimal(totalPositive)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              Outflow: {formatDecimal(totalNegative)}
            </span>
          </div>
        </div>
      </div>

      {/* Adjustments Table */}
      <SafeDataView data={filteredAdjustments} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Product', 'Warehouse', 'Change', 'Reason', 'Date']}
          rows={filteredAdjustments.map((a: any) => [
            <span key={`prod_${a.id}`} className="font-medium text-foreground">
              {a.productName || a.product?.name || '—'}
            </span>,
            a.warehouseName || a.warehouse?.name || '—', 
            <span
              key={`qty_${a.id}`}
              className={`font-semibold inline-block ${
                (a.quantityChange || 0) > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : (a.quantityChange || 0) < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground'
              }`}
            >
              {(a.quantityChange > 0 ? `+${formatDecimal(a.quantityChange)}` : formatDecimal(a.quantityChange)) || 0}
            </span>, 
            a.reason, 
            a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '—'
          ])}
          onEdit={i => { setForm(filteredAdjustments[i]); setModalOpen(true); }}
          onDelete={i => handleDelete(filteredAdjustments[i].id)}
        />
      </SafeDataView>

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} title={form.id ? "Edit Stock Adjustment" : "Stock Adjustment"} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Product</label>
            <SearchableSelect 
              options={products.map((p: any) => {
                const stock = aggregateStock.find((s: any) => s.productId === p.id);
                const qty = stock ? Math.round(parseFloat(stock.quantity || stock.totalStock || 0)) : 0;
                return { 
                  value: p.id, 
                  label: p.name,
                  subtitle: `Available Qty: ${qty}`
                };
              })}
              value={form.productId || ''}
              onChange={val => setForm({ ...form, productId: val })}
              placeholder="-- Choose Product --"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Warehouse</label>
            <select value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
              <option value="">-- Choose Warehouse --</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Quantity Change (+/-)</label>
            <input type="number" value={form.quantityChange || ''} onChange={e => setForm({ ...form, quantityChange: parseFloat(e.target.value) })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="e.g. +10 or -5" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Reason</label>
            <input value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="Reason for adjustment" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.productId || !form.warehouseId || !form.quantityChange || !form.reason}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
