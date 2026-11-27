import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, Search, X, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';
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
  const { saveAdjustment, deleteAdjustment, convertCoupon, isConvertingCoupon } = useAdjustmentMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertForm, setConvertForm] = useState<{
    direction: 'WITH_TO_WITHOUT' | 'WITHOUT_TO_WITH';
    sourceProductId: string;
    targetProductId: string;
    couponProductId: string;
    warehouseId: string;
    quantity: string;
    couponQtyPerBag: string;
    damagedProductId: string;
    damagedQty: string;
    reason: string;
  }>({
    direction: 'WITH_TO_WITHOUT',
    sourceProductId: '',
    targetProductId: '',
    couponProductId: '',
    warehouseId: '',
    quantity: '',
    couponQtyPerBag: '1',
    damagedProductId: '',
    damagedQty: '',
    reason: '',
  });

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

  const getProductStock = (pid: string) => {
    if (!pid) return 0;
    const stock = aggregateStock.find((s: any) => String(s.productId) === String(pid));
    return stock ? Math.round(parseFloat(stock.quantity || stock.totalStock || 0) * 100) / 100 : 0;
  };

  const openConvertModal = () => {
    const defaultWh = warehouses.length === 1 ? String(warehouses[0].id) : '';
    const defaultCoupon = products.find((p: any) => /coupo?n|coupen/i.test(p.name || ''));
    setConvertForm({
      direction: 'WITH_TO_WITHOUT',
      sourceProductId: '',
      targetProductId: '',
      couponProductId: defaultCoupon ? String(defaultCoupon.id) : '',
      warehouseId: defaultWh,
      quantity: '',
      couponQtyPerBag: '1',
      damagedProductId: '',
      damagedQty: '',
      reason: '',
    });
    setConvertModalOpen(true);
  };

  const handleConvertCoupon = async () => {
    const qty = parseFloat(convertForm.quantity || '0');
    const perBag = parseFloat(convertForm.couponQtyPerBag || '1') || 1;
    const dmgQty = parseFloat(convertForm.damagedQty || '0') || 0;
    if (!qty || qty <= 0) return;
    await convertCoupon({
      direction: convertForm.direction,
      sourceProductId: convertForm.sourceProductId,
      targetProductId: convertForm.targetProductId,
      couponProductId: convertForm.couponProductId,
      warehouseId: convertForm.warehouseId,
      quantity: qty,
      couponQtyPerBag: perBag,
      ...(dmgQty > 0 && convertForm.damagedProductId
        ? { damagedProductId: convertForm.damagedProductId, damagedQty: dmgQty }
        : {}),
      reason: convertForm.reason,
    });
    setConvertModalOpen(false);
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={openConvertModal}
            className="h-9 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
          >
            <ArrowLeftRight className="w-4 h-4 mr-1.5" /> Convert Coupon
          </Button>
          <Button size="sm" onClick={() => { setForm({}); setModalOpen(true); }} className="h-9">
            <Plus className="w-4 h-4 mr-1.5" /> New Adjustment
          </Button>
        </div>
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

      {/* Coupon Conversion Modal (With Coupon <-> Without Coupon) */}
      <Modal
        isOpen={convertModalOpen}
        title="Convert With Coupon ↔ Without Coupon"
        onClose={() => setConvertModalOpen(false)}
      >
        <div className="space-y-4">
          {/* Direction Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConvertForm(prev => ({
                ...prev,
                direction: 'WITH_TO_WITHOUT',
                sourceProductId: prev.targetProductId,
                targetProductId: prev.sourceProductId,
              }))}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                convertForm.direction === 'WITH_TO_WITHOUT'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              <div className="text-xs font-bold">With Coupon → Without Coupon</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Remove coupon: Coupon stock <strong>+Plus</strong>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setConvertForm(prev => ({
                ...prev,
                direction: 'WITHOUT_TO_WITH',
                sourceProductId: prev.targetProductId,
                targetProductId: prev.sourceProductId,
              }))}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                convertForm.direction === 'WITHOUT_TO_WITH'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              <div className="text-xs font-bold">Without Coupon → With Coupon</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Add coupon: Coupon stock <strong>-Minus</strong>
              </div>
            </button>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Warehouse</label>
            <select
              value={convertForm.warehouseId}
              onChange={e => setConvertForm({ ...convertForm, warehouseId: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm"
            >
              <option value="">-- Choose Warehouse --</option>
              {warehouses.map((w: any) => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              {convertForm.direction === 'WITH_TO_WITHOUT'
                ? 'Source Product (With Coupon — will Minus)'
                : 'Source Product (Without Coupon — will Minus)'}
            </label>
            <SearchableSelect
              options={products.map((p: any) => ({
                value: String(p.id),
                label: p.name,
                subtitle: `Available Qty: ${getProductStock(p.id)}`,
              }))}
              value={convertForm.sourceProductId}
              onChange={val => setConvertForm({ ...convertForm, sourceProductId: val })}
              placeholder="-- Select Source Finished Good --"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              {convertForm.direction === 'WITH_TO_WITHOUT'
                ? 'Target Product (Without Coupon — will Plus)'
                : 'Target Product (With Coupon — will Plus)'}
            </label>
            <SearchableSelect
              options={products.map((p: any) => ({
                value: String(p.id),
                label: p.name,
                subtitle: `Available Qty: ${getProductStock(p.id)}`,
              }))}
              value={convertForm.targetProductId}
              onChange={val => setConvertForm({ ...convertForm, targetProductId: val })}
              placeholder="-- Select Target Finished Good --"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              Coupon Item ({convertForm.direction === 'WITH_TO_WITHOUT' ? 'will Plus / Return to stock' : 'will Minus / Consume from stock'})
            </label>
            <SearchableSelect
              options={[...products]
                .sort((a: any, b: any) => {
                  const aIsC = /coupo?n|coupen/i.test(a.name || '') ? 0 : 1;
                  const bIsC = /coupo?n|coupen/i.test(b.name || '') ? 0 : 1;
                  return aIsC - bIsC || (a.name || '').localeCompare(b.name || '');
                })
                .map((p: any) => ({
                  value: String(p.id),
                  label: p.name,
                  subtitle: `Available Qty: ${getProductStock(p.id)}`,
                }))}
              value={convertForm.couponProductId}
              onChange={val => setConvertForm({ ...convertForm, couponProductId: val })}
              placeholder="-- Select Coupon Product --"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Bags / Units to Convert</label>
              <input
                type="number"
                min="0"
                step="any"
                value={convertForm.quantity}
                onChange={e => setConvertForm({ ...convertForm, quantity: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm"
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Coupons per Bag</label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={convertForm.couponQtyPerBag}
                onChange={e => setConvertForm({ ...convertForm, couponQtyPerBag: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm"
                placeholder="1"
              />
            </div>
          </div>

          {/* Damaged Bag During Conversion (Optional) */}
          <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3 space-y-2.5">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
              Damaged Bags During Conversion (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Damaged Bag / Packaging Item</label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None (0 damaged)' },
                    ...products.map((p: any) => ({
                      value: String(p.id),
                      label: p.name,
                      subtitle: `Available Qty: ${getProductStock(p.id)}`,
                    })),
                  ]}
                  value={convertForm.damagedProductId}
                  onChange={val => setConvertForm({ ...convertForm, damagedProductId: val })}
                  placeholder="-- Select Bag Item --"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Damaged Qty</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={convertForm.damagedQty}
                  onChange={e => setConvertForm({ ...convertForm, damagedQty: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Live Stock Impact Preview */}
          {parseFloat(convertForm.quantity || '0') > 0 && convertForm.sourceProductId && convertForm.targetProductId && convertForm.couponProductId && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
              <div className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                Stock Impact Preview
              </div>
              {(() => {
                const qty = parseFloat(convertForm.quantity || '0');
                const perBag = parseFloat(convertForm.couponQtyPerBag || '1') || 1;
                const dmgQty = parseFloat(convertForm.damagedQty || '0') || 0;
                const couponDelta = convertForm.direction === 'WITH_TO_WITHOUT' ? qty * perBag : -(qty * perBag);
                const srcName = products.find((p: any) => String(p.id) === convertForm.sourceProductId)?.name || 'Source';
                const tgtName = products.find((p: any) => String(p.id) === convertForm.targetProductId)?.name || 'Target';
                const cpnName = products.find((p: any) => String(p.id) === convertForm.couponProductId)?.name || 'Coupon';
                const dmgName = products.find((p: any) => String(p.id) === convertForm.damagedProductId)?.name || 'Damaged Bag';
                const srcNow = getProductStock(convertForm.sourceProductId);
                const tgtNow = getProductStock(convertForm.targetProductId);
                const cpnNow = getProductStock(convertForm.couponProductId);
                const dmgNow = getProductStock(convertForm.damagedProductId);
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{srcName}</span>
                      <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                        {srcNow} → {srcNow - qty} (-{qty})
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{tgtName}</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {tgtNow} → {tgtNow + qty} (+{qty})
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{cpnName}</span>
                      <span className={`font-mono font-semibold shrink-0 ${couponDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {cpnNow} → {cpnNow + couponDelta} ({couponDelta >= 0 ? `+${couponDelta}` : couponDelta})
                      </span>
                    </div>
                    {dmgQty > 0 && convertForm.damagedProductId && (
                      <div className="flex justify-between gap-2">
                        <span className="truncate">{dmgName} (Damaged)</span>
                        <span className="font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                          {dmgNow} → {dmgNow - dmgQty} (-{dmgQty})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1">Note / Reason (Optional)</label>
            <input
              value={convertForm.reason}
              onChange={e => setConvertForm({ ...convertForm, reason: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm"
              placeholder="e.g. Party requested without coupon bags"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConvertCoupon}
              disabled={
                isConvertingCoupon ||
                !convertForm.warehouseId ||
                !convertForm.sourceProductId ||
                !convertForm.targetProductId ||
                !convertForm.couponProductId ||
                convertForm.sourceProductId === convertForm.targetProductId ||
                !(parseFloat(convertForm.quantity || '0') > 0) ||
                ((parseFloat(convertForm.damagedQty || '0') > 0) && !convertForm.damagedProductId)
              }
            >
              {isConvertingCoupon ? 'Converting...' : 'Convert Stock'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
