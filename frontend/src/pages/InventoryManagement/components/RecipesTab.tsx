import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, RefreshCw, X, Search, Trash2, AlertCircle, Copy, Check,
  Calculator, TrendingUp, Layers, ChevronDown, ChevronRight, BarChart3, Download
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import apiClient from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';
import { formatDecimal } from '@/utils/format';

const Modal: React.FC<{ title: string; onClose: () => void; maxWidth?: string; children: React.ReactNode }> = ({ title, onClose, maxWidth = "max-w-2xl", children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className={`bg-card border border-border rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[92vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  </div>
);

export const RecipesTab: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeWarehouseId } = useWarehouse();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<any>({ name: '', productId: '', outputQuantity: 1, items: [] });
  const [productSearch, setProductSearch] = useState<string>('');
  const [ingSearch, setIngSearch] = useState<string>('');

  // Accurate BOM Price List Modal State
  const [showPriceListModal, setShowPriceListModal] = useState<boolean>(false);
  const [priceList, setPriceList] = useState<any[]>([]);
  const [priceListLoading, setPriceListLoading] = useState<boolean>(false);
  const [priceListSearch, setPriceListSearch] = useState<string>('');
  const [expandedBomId, setExpandedBomId] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const mainCat = p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName || p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : p.category?.name);
      if (mainCat) cats.add(String(mainCat));
    });
    return Array.from(cats).filter(Boolean).sort();
  }, [products]);

  const [finishedCatFilter, setFinishedCatFilter] = useState<string>(() => {
    return localStorage.getItem('recipe_modal_finished_cat_filter') || '';
  });
  const [rawCatFilter, setRawCatFilter] = useState<string>(() => {
    return localStorage.getItem('recipe_modal_raw_cat_filter') || '';
  });
  const [showFinishedDropdown, setShowFinishedDropdown] = useState<boolean>(false);
  
  const [showRawDropdown, setShowRawDropdown] = useState<boolean>(false);
  const [finishedSelectedIndex, setFinishedSelectedIndex] = useState<number>(0);
  const [rawSelectedIndex, setRawSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (showFinishedDropdown) {
      const el = document.getElementById(`recipe-finished-item-${finishedSelectedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [finishedSelectedIndex, showFinishedDropdown]);

  useEffect(() => {
    if (showRawDropdown) {
      const el = document.getElementById(`recipe-raw-item-${rawSelectedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [rawSelectedIndex, showRawDropdown]);

  const filteredFinishedProducts = useMemo(() => {
    return products.filter(p => {
      if (finishedCatFilter) {
        const parentCat = (p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName || '').toUpperCase();
        const subCat = (p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : p.category?.name) || '').toUpperCase();
        const selUpper = finishedCatFilter.toUpperCase();
        if (parentCat !== selUpper && subCat !== selUpper) { return false; }
      }
      if (!productSearch) return true;
      const s = productSearch.toLowerCase().trim();
      return ((p.name && p.name.toLowerCase().includes(s)) || (p.productCode && p.productCode.toLowerCase().includes(s)) || (p.sku && p.sku.toLowerCase().includes(s)));
    });
  }, [products, finishedCatFilter, productSearch]);

  const filteredRawProducts = useMemo(() => {
    return products.filter(p => {
      if (rawCatFilter) {
        const parentCat = (p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName || '').toUpperCase();
        const subCat = (p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : p.category?.name) || '').toUpperCase();
        const selUpper = rawCatFilter.toUpperCase();
        if (parentCat !== selUpper && subCat !== selUpper) { return false; }
      }
      if (!ingSearch) return true;
      const s = ingSearch.toLowerCase().trim();
      return ((p.name && p.name.toLowerCase().includes(s)) || (p.productCode && p.productCode.toLowerCase().includes(s)) || (p.sku && p.sku.toLowerCase().includes(s)));
    });
  }, [products, rawCatFilter, ingSearch]);

  const handleFinishedCatFilterChange = (val: string) => {
    setFinishedCatFilter(val);
    if (val) {
      localStorage.setItem('recipe_modal_finished_cat_filter', val);
    } else {
      localStorage.removeItem('recipe_modal_finished_cat_filter');
    }
  };

  const handleRawCatFilterChange = (val: string) => {
    setRawCatFilter(val);
    if (val) {
      localStorage.setItem('recipe_modal_raw_cat_filter', val);
    } else {
      localStorage.removeItem('recipe_modal_raw_cat_filter');
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        apiClient<any[]>('/bom').catch(() => null),
        apiClient<any[]>('/inv/masters/products').catch(() => null)
      ]);
      const recipesList = r && r.data ? r.data : (Array.isArray(r) ? r : []);
      const productsList = p && p.data ? p.data : (Array.isArray(p) ? p : []);
      setRecipes(recipesList);
      setProducts(productsList);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadPriceList = async () => {
    setPriceListLoading(true);
    try {
      const config = activeWarehouseId && activeWarehouseId !== 'GLOBAL' 
        ? { headers: { 'X-Warehouse-ID': activeWarehouseId } } 
        : {};
      const res = await apiClient<any>('/bom/price-list', config);
      const list = res && res.data ? res.data : (Array.isArray(res) ? res : []);
      setPriceList(list);
    } catch (e: any) {
      toast({ title: 'Failed to load BOM Price List', description: e.message, variant: 'destructive' });
    } finally {
      setPriceListLoading(false);
    }
  };

  const filteredRecipes = (recipes || []).filter(r => 
    !search || (r.name && r.name.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPriceList = useMemo(() => {
    if (!priceListSearch) return priceList;
    const q = priceListSearch.toLowerCase().trim();
    return priceList.filter(item => 
      (item.bomName && item.bomName.toLowerCase().includes(q)) ||
      (item.productName && item.productName.toLowerCase().includes(q)) ||
      (item.productCode && item.productCode.toLowerCase().includes(q))
    );
  }, [priceList, priceListSearch]);

  const priceListMetrics = useMemo(() => {
    if (!priceList || priceList.length === 0) return { total: 0, avgCost: 0, avgSelling: 0, avgMarginPct: 0 };
    const total = priceList.length;
    const sumCost = priceList.reduce((acc, it) => acc + (it.unitCost || 0), 0);
    const sumSelling = priceList.reduce((acc, it) => acc + (it.sellingRate || 0), 0);
    const sumMargin = priceList.reduce((acc, it) => acc + (it.marginPct || 0), 0);
    return {
      total,
      avgCost: sumCost / total,
      avgSelling: sumSelling / total,
      avgMarginPct: sumMargin / total,
    };
  }, [priceList]);

  const handleSave = async () => {
    if (!form.name || !form.productId || (form.items || []).length === 0) {
        toast({ title: 'Validation Error', description: 'Please fill in all required fields and add at least one ingredient.', variant: 'destructive' });
        return;
    }
    
    const config = isGlobal && form.assignedWarehouse ? { headers: { 'X-Warehouse-ID': form.assignedWarehouse } } : {};
    
    try {
      if (form.id) {
        await apiClient(`/inv/bom/${form.id}`, { method: 'PUT', data: form, ...config });
        toast({ title: 'Recipe updated', description: 'This recipe requires Super Admin approval to be used in production.' });
      } else {
        await apiClient('/inv/bom', { method: 'POST', data: form, ...config });
        toast({ title: 'Recipe created', description: 'This recipe requires Super Admin approval to be used in production.' });
      }
      setModal(false); setForm({ name: '', productId: '', outputQuantity: 1, items: [] });
      loadData();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const addIngredient = (p: any) => {
    if (form.items.some((i: any) => i.productId === p.id)) {
        toast({ title: 'Duplicate Item', description: 'This product is already in the ingredient list.' });
        return;
    }
    const unitPrice = p.avgCost || p.weightedAvgCost || p.fifoCost || p.rate || 0;
    setForm({ 
      ...form, 
      items: [
        ...form.items, 
        { 
          productId: p.id, 
          productName: p.name, 
          quantity: 1, 
          unit: p.unit?.name || p.unit,
          unitCost: unitPrice,
          lineCost: unitPrice
        }
      ] 
    });
    setIngSearch('');
    setShowRawDropdown(false);
  };

  const removeIngredient = (idx: number) => {
    const newItems = [...form.items];
    newItems.splice(idx, 1);
    setForm({ ...form, items: newItems });
  };

  const updateIngQty = (idx: number, qty: string) => {
    const newItems = [...form.items];
    const parsedQty = parseFloat(qty) || 0;
    newItems[idx].quantity = parsedQty;
    if (newItems[idx].unitCost) {
      newItems[idx].lineCost = newItems[idx].unitCost * parsedQty;
    }
    setForm({ ...form, items: newItems });
  };

  const isGlobal = activeWarehouseId === 'GLOBAL';
  const canManage = ['SUPERADMIN', 'ADMIN', 'INVENTORY'].includes(user?.role || '');

  const tableColumns = isGlobal 
    ? ['Recipe Name', 'Finished Product', 'Yield Qty', 'Unit Cost', 'Selling Rate', 'Gross Margin', 'Ingredients', 'Warehouse', 'Status', 'Actions']
    : ['Recipe Name', 'Finished Product', 'Yield Qty', 'Unit Cost', 'Selling Rate', 'Gross Margin', 'Ingredients', 'Status', 'Actions'];

  const isInventory = user?.role === 'INVENTORY' || user?.role === 'PRODUCTION';

  const handleView = async (i: number) => {
      const r = filteredRecipes[i];
      try {
          const config = isGlobal && r.assignedWarehouse ? { headers: { 'X-Warehouse-ID': r.assignedWarehouse } } : {};
          const details = await apiClient<any>(`/inv/bom/${r.id}`, config);
          const data = details && details.data ? details.data : details;
          data.assignedWarehouse = r.assignedWarehouse;
          setForm(data);
          setModal(true);
      } catch (e: any) {
          toast({ title: 'Failed to load details', description: e.message, variant: 'destructive' });
      }
  };

  const handleCopy = async (i: number) => {
      const r = filteredRecipes[i];
      try {
          const config = isGlobal && r.assignedWarehouse ? { headers: { 'X-Warehouse-ID': r.assignedWarehouse } } : {};
          const details = await apiClient<any>(`/inv/bom/${r.id}`, config);
          const data = details && details.data ? details.data : details;
          delete data.id;
          data.name = `Copy of ${data.name || 'Recipe'}`;
          data.assignedWarehouse = r.assignedWarehouse;
          setForm(data);
          setModal(true);
      } catch (e: any) {
          toast({ title: 'Failed to load recipe', description: e.message, variant: 'destructive' });
      }
  };

  const handleApprove = async (i: number) => {
      const r = filteredRecipes[i];
      try {
          const config = isGlobal && r.assignedWarehouse ? { headers: { 'X-Warehouse-ID': r.assignedWarehouse } } : {};
          await apiClient(`/inv/bom/${r.id}/approve`, { method: 'POST', ...config });
          toast({ title: 'Recipe Approved', description: `${r.name} can now be used in production.` });
          loadData();
      } catch (e: any) {
          toast({ title: 'Approval Failed', description: e.message, variant: 'destructive' });
      }
  };

  const handleReject = async (i: number) => {
      const r = filteredRecipes[i];
      try {
          const config = isGlobal && r.assignedWarehouse ? { headers: { 'X-Warehouse-ID': r.assignedWarehouse } } : {};
          await apiClient(`/inv/bom/${r.id}/reject`, { method: 'POST', ...config });
          toast({ title: 'Recipe Rejected' });
          loadData();
      } catch (e: any) {
          toast({ title: 'Rejection Failed', description: e.message, variant: 'destructive' });
      }
  };

  // Form modal calculated totals
  const modalBatchCost = useMemo(() => {
    if (form.items && form.items.length > 0) {
      return form.items.reduce((sum: number, it: any) => {
        const cost = it.unitCost || 0;
        const q = parseFloat(it.quantity) || 0;
        return sum + (cost * q);
      }, 0);
    }
    return form.batchCost || 0;
  }, [form.items, form.batchCost]);

  const modalYieldQty = parseFloat(form.outputQuantity) || 1;
  const modalUnitCost = modalYieldQty > 0 ? (modalBatchCost / modalYieldQty) : 0;
  const modalSellingRate = form.sellingRate || (products.find(p => p.id === form.productId)?.rate || 0);
  const modalGrossMargin = modalSellingRate - modalUnitCost;
  const modalMarginPct = modalSellingRate > 0 ? (modalGrossMargin / modalSellingRate) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>BOM (Recipes)</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Manufacturing formulas with warehouse FIFO & Weighted Average costing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setShowPriceListModal(true);
              loadPriceList();
            }}
            className="flex items-center gap-1.5 border-primary/40 hover:bg-primary/10 text-primary font-medium"
          >
            <Calculator className="w-4 h-4 text-primary" />
            <span>Accurate BOM Price List</span>
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => { setForm({ name: '', productId: '', outputQuantity: 1, items: [] }); setModal(true); }}>
              <Plus className="w-4 h-4 mr-1.5" /> New Recipe
            </Button>
          )}
        </div>
      </div>

      {isGlobal && (
        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold block mb-0.5">Global View Active</span>
            You are viewing recipes across all warehouses. You can now view, edit or delete recipes directly from here. New recipes require selecting a specific warehouse.
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search recipes by name..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-border rounded-xl pl-10 pr-4 py-2 text-sm bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading Recipes…</div>}

      <DataTable
        columns={tableColumns}
        rows={filteredRecipes.map((r: any, idx: number) => {
          const rowData = [
            <span key={`name-${idx}`} className="font-medium text-foreground">{r.name}</span>,
            <span key={`prod-${idx}`} className="text-foreground">{r.productName || '—'}</span>,
            formatDecimal(r.outputQuantity),
            <span key={`cost-${idx}`} className="font-semibold text-emerald-600 font-mono">
              {r.unitCost ? `₹${formatDecimal(r.unitCost)}` : '—'}
            </span>,
            <span key={`rate-${idx}`} className="text-foreground font-mono">
              {r.sellingRate ? `₹${formatDecimal(r.sellingRate)}` : '—'}
            </span>,
            r.sellingRate && r.grossMargin !== undefined ? (
              <span key={`margin-${idx}`} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                r.grossMargin >= 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'
              }`}>
                {r.grossMargin >= 0 ? '+' : ''}₹{formatDecimal(r.grossMargin)} ({formatDecimal(r.marginPct || 0)}%)
              </span>
            ) : <span key={`margin-${idx}`} className="text-muted-foreground text-xs">—</span>,
            <span key={`items-${idx}`} className="text-xs font-mono text-muted-foreground">{r.itemCount ?? r.items?.length ?? 0} items</span>
          ];
          if (isGlobal) {
            rowData.push(
              <span key={`wh-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground whitespace-nowrap">
                {r.assignedWarehouseName || 'Unknown'}
              </span>
            );
          }
          const status = r.status || 'APPROVED';
          const statusColors: any = { PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800', APPROVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800' };
          rowData.push(
            <span key={`status-${idx}`} className={`inline-flex px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
              {status.replace('_', ' ')}
            </span>
          );
          rowData.push(
          <div key={`actions-${idx}`} className="flex justify-end pr-2 gap-2 items-center">
            {user?.role === 'SUPERADMIN' && status === 'PENDING_APPROVAL' && (
              <>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleApprove(idx); }} title="Approve Recipe" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleReject(idx); }} title="Reject Recipe" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
            {!isInventory && (
              <PDFGenerator
                type="PRODUCTION_ORDER"
                data={{
                  orderId: `BOM-${r.id?.slice(-4) || '0000'}`,
                  date: new Date().toISOString().split('T')[0],
                  productName: r.productName,
                  targetQty: r.outputQuantity,
                  unit: r.unit || 'Bags',
                  remarks: r.remarks || `Standard Production for ${r.name}`,
                  bomItems: (r.items || []).map((i: any) => ({
                    id: i.productId,
                    name: i.productName,
                    code: i.productCode || 'RAW',
                    qty: i.quantity,
                    unit: i.unit
                  }))
                }}
                filename={`Production_${r.name.replace(/\s+/g, '_')}.pdf`}
                buttonLabel="Print BOM"
                variant="ghost"
                size="sm"
              />
            )}
            {canManage && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCopy(idx); }} title="Copy Recipe">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
            {!canManage && (
              <Button variant="link" size="sm" onClick={(e) => { e.stopPropagation(); handleView(idx); }}>
                View
              </Button>
            )}
          </div>
          );
          return rowData;
        })}
        onRowClick={handleView}
        onEdit={canManage ? handleView : undefined}
        onDelete={canManage ? async (i: number) => {
            if (!confirm('Are you sure you want to delete this recipe?')) return;
            const r = filteredRecipes[i];
            try {
                const config = isGlobal && r.assignedWarehouse ? { headers: { 'X-Warehouse-ID': r.assignedWarehouse } } : {};
                await apiClient(`/inv/bom/${r.id}`, { method: 'DELETE', ...config });
                toast({ title: 'Recipe deleted' });
                loadData();
                if (onRefresh) onRefresh();
            } catch (e: any) {
                toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
            }
        } : undefined}
      />

      {/* Edit / View Recipe Modal */}
      {modal && (
        <Modal title={form.id ? (canManage ? "Edit Recipe" : "View Recipe") : "New Recipe"} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Recipe Name {canManage && <span className="text-destructive">*</span>}</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                disabled={!canManage}
                placeholder="e.g., Standard Tile Adhesive Mix"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm disabled:opacity-75 disabled:bg-muted" />
            </div>

            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-medium">Finished Product {canManage && <span className="text-destructive">*</span>}</label>
                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Filter Category:</span>
                    <select
                      value={finishedCatFilter}
                      onChange={e => {
                        handleFinishedCatFilterChange(e.target.value);
                        setShowFinishedDropdown(true);
                      }}
                      className="text-xs bg-muted/50 border border-border rounded-md px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder={products.find(p => p.id === form.productId)?.name || "Search finished product..."}
                  value={productSearch}
                  disabled={!canManage}
                  onFocus={() => { if (canManage) setShowFinishedDropdown(true); }}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setShowFinishedDropdown(true);
                    setFinishedSelectedIndex(0);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setFinishedSelectedIndex(prev => Math.min(prev + 1, filteredFinishedProducts.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setFinishedSelectedIndex(prev => Math.max(prev - 1, 0));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (showFinishedDropdown && filteredFinishedProducts[finishedSelectedIndex]) {
                        const p = filteredFinishedProducts[finishedSelectedIndex];
                        setForm({ ...form, productId: p.id });
                        setProductSearch('');
                        setShowFinishedDropdown(false);
                      }
                    }
                  }}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-background text-sm disabled:opacity-75 disabled:bg-muted"
                />
              </div>
              {showFinishedDropdown && canManage && (
                <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex items-center justify-between text-xs text-muted-foreground sticky top-0 z-10">
                      <span>Select Finished Product</span>
                      <button type="button" onClick={() => { setShowFinishedDropdown(false); setProductSearch(''); }} className="hover:text-foreground font-bold">✕</button>
                    </div>
                    {filteredFinishedProducts.map((p, idx) => {
                        const parentCat = p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName;
                        const subCat = p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : p.category?.name);
                        const catText = parentCat && subCat && parentCat !== subCat ? `${parentCat} > ${subCat}` : (parentCat || subCat || '');
                        return (
                          <button id={`recipe-finished-item-${idx}`} key={p.id} onClick={() => { 
                                setForm({ ...form, productId: p.id }); 
                                setProductSearch(''); 
                                setShowFinishedDropdown(false); 
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/20 last:border-b-0 flex items-center justify-between gap-2 ${idx === finishedSelectedIndex ? 'bg-muted' : ''}`}>
                              <div className="truncate flex items-center gap-1.5">
                                <span className="font-medium text-foreground">{p.name}</span>
                                <span className="text-[11px] text-muted-foreground">({p.productCode || p.sku})</span>
                              </div>
                              {catText ? (
                                <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20 shrink-0">
                                  {catText}
                                </span>
                              ) : null}
                          </button>
                        );
                      })}
                    {filteredFinishedProducts.length === 0 && (
                      <div className="px-4 py-3 text-xs text-muted-foreground">
                        No products found matching filters.
                      </div>
                    )}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Yield Quantity (Output Bags / Units)</label>
              <input type="number" value={form.outputQuantity} onChange={e => setForm({ ...form, outputQuantity: e.target.value })}
                 disabled={!canManage}
                 className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm disabled:opacity-75 disabled:bg-muted" />
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  Ingredients List
                  <span className="text-[10px] font-normal text-muted-foreground">{form.items?.length || 0} items added</span>
                </h3>
                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Filter Category:</span>
                    <select
                      value={rawCatFilter}
                      onChange={e => {
                        handleRawCatFilterChange(e.target.value);
                        setShowRawDropdown(true);
                      }}
                      className="text-xs bg-muted/50 border border-border rounded-md px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {canManage && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input 
                    type="text"
                    placeholder="Search and add raw materials..."
                    value={ingSearch}
                    onFocus={() => setShowRawDropdown(true)}
                    onChange={e => {
                      setIngSearch(e.target.value);
                      setShowRawDropdown(true);
                      setRawSelectedIndex(0);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setRawSelectedIndex(prev => Math.min(prev + 1, filteredRawProducts.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setRawSelectedIndex(prev => Math.max(prev - 1, 0));
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (showRawDropdown && filteredRawProducts[rawSelectedIndex]) {
                          const p = filteredRawProducts[rawSelectedIndex];
                          addIngredient(p);
                        }
                      }
                    }}
                    className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-background text-sm"
                  />
                  {showRawDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex items-center justify-between text-xs text-muted-foreground sticky top-0 z-10">
                            <span>Select Ingredient</span>
                            <button type="button" onClick={() => { setShowRawDropdown(false); setIngSearch(''); }} className="hover:text-foreground font-bold">✕</button>
                          </div>
                          {filteredRawProducts.map((p, idx) => {
                              const parentCat = p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName;
                              const subCat = p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : p.category?.name);
                              const catText = parentCat && subCat && parentCat !== subCat ? `${parentCat} > ${subCat}` : (parentCat || subCat || '');
                              const currentCost = p.avgCost || p.weightedAvgCost || p.fifoCost || p.rate || 0;
                              return (
                                  <button id={`recipe-raw-item-${idx}`} key={p.id} onClick={() => addIngredient(p)}
                                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/20 last:border-b-0 flex items-center justify-between gap-2 ${idx === rawSelectedIndex ? 'bg-muted' : ''}`}>
                                      <div className="truncate flex items-center gap-1.5">
                                        <span className="font-medium text-foreground">{p.name}</span>
                                        <span className="text-[11px] text-muted-foreground">({p.productCode || p.sku})</span>
                                        {currentCost > 0 && (
                                          <span className="text-[11px] font-mono font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                            ₹{formatDecimal(currentCost)}
                                          </span>
                                        )}
                                      </div>
                                    {catText ? (
                                      <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20 shrink-0">
                                        {catText}
                                      </span>
                                    ) : null}
                                </button>
                              );
                            })}
                          {filteredRawProducts.length === 0 && (
                            <div className="px-4 py-3 text-xs text-muted-foreground">
                              No raw materials found matching filters.
                            </div>
                          )}
                      </div>
                  )}
                </div>
              )}

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {(form.items || []).map((item: any, idx: number) => {
                  const itCost = item.unitCost || 0;
                  const itQty = parseFloat(item.quantity) || 0;
                  const itLineCost = item.lineCost !== undefined ? item.lineCost : (itCost * itQty);
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{item.productName}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{item.unit?.name || (typeof item.unit === 'string' ? item.unit : '') || '—'}</span>
                              {itCost > 0 && (
                                <span className="text-primary font-medium">@ ₹{formatDecimal(itCost)}/unit</span>
                              )}
                            </div>
                        </div>
                        <div className="w-24">
                            <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => updateIngQty(idx, e.target.value)}
                                disabled={!canManage}
                                className="w-full border border-border rounded px-2 py-1 text-xs bg-background disabled:opacity-75 disabled:bg-transparent font-mono" 
                            />
                        </div>
                        <div className="w-20 text-right">
                          <span className="text-xs font-semibold text-foreground font-mono">
                            ₹{formatDecimal(itLineCost)}
                          </span>
                        </div>
                        {canManage && (
                          <button onClick={() => removeIngredient(idx)} className="p-1 hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                  );
                })}
                {(form.items || []).length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground">
                        No ingredients added yet. {canManage ? 'Search above to add.' : ''}
                    </div>
                )}
              </div>

              {/* Accurate BOM Cost Summary Card */}
              {form.items && form.items.length > 0 && (
                <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-2 mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-primary" />
                      Live BOM Costing & Yield Summary
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                      Warehouse WAC / FIFO Cost
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-background/90 p-2.5 rounded-lg border border-border/70 shadow-2xs">
                      <p className="text-[10px] text-muted-foreground font-medium">Total Batch Cost</p>
                      <p className="text-sm font-bold text-foreground font-mono">₹{formatDecimal(modalBatchCost)}</p>
                    </div>
                    <div className="bg-background/90 p-2.5 rounded-lg border border-border/70 shadow-2xs">
                      <p className="text-[10px] text-muted-foreground font-medium">Finished Unit Cost (Yield {modalYieldQty})</p>
                      <p className="text-sm font-bold text-emerald-600 font-mono">₹{formatDecimal(modalUnitCost)}</p>
                    </div>
                    <div className="bg-background/90 p-2.5 rounded-lg border border-border/70 shadow-2xs">
                      <p className="text-[10px] text-muted-foreground font-medium">Master Selling Rate</p>
                      <p className="text-sm font-bold text-foreground font-mono">
                        {modalSellingRate ? `₹${formatDecimal(modalSellingRate)}` : '—'}
                      </p>
                    </div>
                    <div className="bg-background/90 p-2.5 rounded-lg border border-border/70 shadow-2xs">
                      <p className="text-[10px] text-muted-foreground font-medium">Gross Margin</p>
                      <p className={`text-sm font-bold font-mono ${modalGrossMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {modalSellingRate ? `${modalGrossMargin >= 0 ? '+' : ''}₹${formatDecimal(modalGrossMargin)} (${formatDecimal(modalMarginPct)}%)` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {canManage && (
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button onClick={handleSave} className="w-full">{form.id ? 'Save Changes' : 'Create Recipe'}</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Accurate BOM Price List Modal */}
      {showPriceListModal && (
        <Modal 
          title="Accurate BOM Price List & Yield Valuation" 
          maxWidth="max-w-5xl" 
          onClose={() => setShowPriceListModal(false)}
        >
          <div className="space-y-4">
            {/* Top stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/20 border border-border p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium">Total Active Formulas</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{priceListMetrics.total}</p>
              </div>
              <div className="bg-muted/20 border border-border p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium">Avg Unit Cost (FIFO/WAC)</p>
                <p className="text-xl font-bold text-emerald-600 font-mono mt-0.5">₹{formatDecimal(priceListMetrics.avgCost)}</p>
              </div>
              <div className="bg-muted/20 border border-border p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium">Avg Selling Rate</p>
                <p className="text-xl font-bold text-foreground font-mono mt-0.5">₹{formatDecimal(priceListMetrics.avgSelling)}</p>
              </div>
              <div className="bg-muted/20 border border-border p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-medium">Avg Gross Margin %</p>
                <p className={`text-xl font-bold font-mono mt-0.5 ${priceListMetrics.avgMarginPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatDecimal(priceListMetrics.avgMarginPct)}%
                </p>
              </div>
            </div>

            {/* Filter and search bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Filter by product name, product code, or recipe..." 
                  value={priceListSearch}
                  onChange={e => setPriceListSearch(e.target.value)}
                  className="w-full border border-border rounded-xl pl-10 pr-4 py-2 text-sm bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadPriceList} disabled={priceListLoading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${priceListLoading ? 'animate-spin' : ''}`} />
                Refresh Costs
              </Button>
            </div>

            {/* Price list table */}
            {priceListLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Calculating live warehouse FIFO/WAC recipe costs...
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Finished Product</th>
                      <th className="py-2.5 px-3">BOM Formula</th>
                      <th className="py-2.5 px-3">Warehouse</th>
                      <th className="py-2.5 px-3 text-right">Yield Qty</th>
                      <th className="py-2.5 px-3 text-right">Batch Cost</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Selling Rate</th>
                      <th className="py-2.5 px-3 text-right">Gross Margin</th>
                      <th className="py-2.5 px-3 text-center">Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPriceList.map((item: any) => {
                      const isExpanded = expandedBomId === item.bomId;
                      return (
                        <React.Fragment key={item.bomId || item.id}>
                          <tr className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-foreground block">{item.productName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{item.productCode || '—'}</span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-foreground">{item.bomName}</td>
                            <td className="py-2.5 px-3">
                              <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap">
                                {item.assignedWarehouseName || 'Global'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">
                              {item.outputQuantity} {item.unit || 'Bags'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                              ₹{formatDecimal(item.totalBatchCost)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 bg-emerald-500/5">
                              ₹{formatDecimal(item.unitCost)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                              {item.sellingRate ? `₹${formatDecimal(item.sellingRate)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {item.sellingRate ? (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                                  item.grossMargin >= 0 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'
                                }`}>
                                  {item.grossMargin >= 0 ? '+' : ''}₹{formatDecimal(item.grossMargin)} ({formatDecimal(item.marginPct)}%)
                                </span>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button 
                                onClick={() => setExpandedBomId(isExpanded ? null : item.bomId)}
                                className="p-1 hover:bg-muted rounded text-primary transition-colors"
                                title="Toggle raw material ingredients breakdown"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>

                          {/* Ingredient breakdown expandable row */}
                          {isExpanded && (
                            <tr className="bg-muted/30">
                              <td colSpan={9} className="p-3">
                                <div className="bg-background rounded-lg border border-border p-3 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                    <span>Raw Material Ingredients ({item.items?.length || 0} items)</span>
                                    <span className="text-[10px] text-muted-foreground">Prices based on Purchase Receipts & Opening Stock</span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px]">
                                      <thead className="text-muted-foreground border-b border-border/50">
                                        <tr>
                                          <th className="py-1 px-2">Material Name</th>
                                          <th className="py-1 px-2 text-right">Required Qty</th>
                                          <th className="py-1 px-2 text-right">Live Purchase Cost</th>
                                          <th className="py-1 px-2 text-right">Line Cost</th>
                                          <th className="py-1 px-2">Cost Source</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/30">
                                        {(item.items || []).map((ing: any, iIdx: number) => (
                                          <tr key={iIdx}>
                                            <td className="py-1.5 px-2 font-medium text-foreground">{ing.materialName}</td>
                                            <td className="py-1.5 px-2 text-right font-mono">{ing.quantity} {ing.unit}</td>
                                            <td className="py-1.5 px-2 text-right font-mono font-medium text-emerald-600">
                                              ₹{formatDecimal(ing.unitCost)}/{ing.unit}
                                            </td>
                                            <td className="py-1.5 px-2 text-right font-mono font-bold text-foreground">
                                              ₹{formatDecimal(ing.lineCost)}
                                            </td>
                                            <td className="py-1.5 px-2 text-[10px] text-muted-foreground">
                                              <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50 font-mono">
                                                {ing.costSource?.replace(/_/g, ' ') || 'WAC'}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {filteredPriceList.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No BOM price list records match your filter.
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
