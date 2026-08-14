import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProductions, useProductionMutations } from '@/hooks/inventory/useProductions';
import { useProducts } from '@/hooks/inventory/useProducts';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, X, Search, RefreshCw, Trash2, AlertTriangle, ShoppingCart } from 'lucide-react';
import { SafeDataView } from '@/components/SafeDataView';
import { motion } from 'framer-motion';
import apiClient from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { formatDecimal } from '@/utils/format';
import { Input } from '@/components/ui/input';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { useAuth } from '@/contexts/AuthContext';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  </div>
);

export const ProductionsTab: React.FC<{ onTabChange?: (tab: any) => void }> = ({ onTabChange }) => {
  const { toast } = useToast();
  const { data: productions = [], isLoading, error, refetch } = useProductions();
  const { saveProduction } = useProductionMutations();
  const { user } = useAuth();

  const [modal, setModal] = useState<boolean>(false);
  const [deficitModal, setDeficitModal] = useState<boolean>(false);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [deficitItems, setDeficitItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ 
    productId: '', 
    productName: '', 
    batches: 1,
    quantity: 1, 
    warehouseId: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Masters lists
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);

  // Batch ingredients adjustments
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [batchItems, setBatchItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [ingSearch, setIngSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, idx: number, reason: string}>({ show: false, idx: -1, reason: '' });

  const { data: products = [] } = useProducts({ warehouseId: form.warehouseId || undefined });

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const mainCat = p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName || p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : (typeof p.category === 'object' && p.category ? p.category.name : ''));
      if (mainCat) cats.add(String(mainCat));
    });
    return Array.from(cats).filter(Boolean).sort();
  }, [products]);

  const [finishedCatFilter, setFinishedCatFilter] = useState<string>(() => {
    return localStorage.getItem('prod_modal_finished_cat_filter') || '';
  });
  const [rawCatFilter, setRawCatFilter] = useState<string>(() => {
    return localStorage.getItem('prod_modal_raw_cat_filter') || '';
  });
  const [showFinishedDropdown, setShowFinishedDropdown] = useState<boolean>(false);
  const [showRawDropdown, setShowRawDropdown] = useState<boolean>(false);
  const finishedDropdownRef = useRef<HTMLDivElement>(null);
  const rawDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (finishedDropdownRef.current && !finishedDropdownRef.current.contains(event.target as Node)) {
        setShowFinishedDropdown(false);
      }
      if (rawDropdownRef.current && !rawDropdownRef.current.contains(event.target as Node)) {
        setShowRawDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFinishedCatFilterChange = (val: string) => {
    setFinishedCatFilter(val);
    if (val) {
      localStorage.setItem('prod_modal_finished_cat_filter', val);
    } else {
      localStorage.removeItem('prod_modal_finished_cat_filter');
    }
  };

  const handleRawCatFilterChange = (val: string) => {
    setRawCatFilter(val);
    if (val) {
      localStorage.setItem('prod_modal_raw_cat_filter', val);
    } else {
      localStorage.removeItem('prod_modal_raw_cat_filter');
    }
  };

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [wRes, rRes] = await Promise.all([
          apiClient<any[]>('/inv/masters/warehouses').catch(() => null),
          apiClient<any[]>('/bom').catch(() => null)
        ]);
        const wList = wRes && wRes.data ? wRes.data : (Array.isArray(wRes) ? wRes : []);
        const rList = rRes && rRes.data ? rRes.data : (Array.isArray(rRes) ? rRes : []);
        
        setWarehouses(wList);
        setRecipes(rList);
        
        if (wList.length > 0 && !form.warehouseId) {
          setForm((prev: any) => ({ ...prev, warehouseId: wList[0].id }));
        }
      } catch (e) {
        console.error("Failed to load master lists for production", e);
      }
    };
    fetchMasters();
  }, []);

  // Dynamically scale ingredient quantities based on recipe standard ratios and entered number of batches
  useEffect(() => {
    if (!selectedRecipe) {
      setBatchItems([]);
      return;
    }
    // Only scale if the recipe has standard items (preserves manually edited list during updates)
    if (selectedRecipe.items && selectedRecipe.items.length > 0) {
      const newItems = (selectedRecipe.items || []).map((item: any) => {
        // Here we scale by number of batches instead of actual yield quantity
        const standardQty = item.qty || item.quantity || 0;
        return {
          productId: item.productId,
          productName: item.productName || item.materialName,
          quantity: parseFloat((standardQty * (form.batches || 1)).toFixed(2)) || 0,
          unit: item.unit
        };
      });
      setBatchItems(newItems);
    }
  }, [form.batches, selectedRecipe]);
  const recipesByProduct = React.useMemo(() => {
    const map = new Map();
    for (const r of recipes) {
      if (r.productCode) {
        map.set(r.productCode, r);
        map.set(String(r.productCode).toLowerCase(), r);
      }
      if (r.productName) {
        map.set(r.productName, r);
        map.set(String(r.productName).toLowerCase(), r);
      }
      if (r.name) {
        map.set(r.name, r);
        map.set(String(r.name).toLowerCase(), r);
      }
      if (r.productId) {
        map.set(String(r.productId), r);
      }
    }
    return map;
  }, [recipes]);

  const productsById = React.useMemo(() => {
    const map = new Map();
    for (const p of products) map.set(String(p.id), p);
    return map;
  }, [products]);

  const selectFinishedProduct = (p: any) => {
    // Locate the standard recipe/BOM mapping for this product
    const recipe =
      recipesByProduct.get(p.productCode) ||
      recipesByProduct.get(String(p.productCode || '').toLowerCase()) ||
      recipesByProduct.get(p.name) ||
      recipesByProduct.get(String(p.name || '').toLowerCase()) ||
      recipesByProduct.get(p.sku) ||
      recipesByProduct.get(String(p.sku || '').toLowerCase()) ||
      recipesByProduct.get(String(p.id));
    
    setForm({ ...form, productId: p.id, productName: p.name });
    setSelectedRecipe(recipe || null);
    setProductSearch('');
    setShowFinishedDropdown(false);

    if (recipe) {
      toast({
        title: 'Recipe Loaded',
        description: `Successfully loaded recipe: "${recipe.name}" containing ${recipe.items?.length || 0} standard raw materials.`
      });
    } else {
      toast({
        title: 'No Recipe Found',
        description: 'You can manually search and add raw materials to this batch below.',
        variant: 'default'
      });
    }
  };

  const addIngredient = (p: any) => {
    setIngSearch('');
    setShowRawDropdown(false);
    if (batchItems.some((i: any) => i.productId === p.id)) {
      toast({ title: 'Duplicate Item', description: 'This product is already in the batch ingredients list.' });
      return;
    }
    setBatchItems([...batchItems, { 
      productId: p.id, 
      productName: p.name, 
      quantity: 1, 
      unit: p.unit?.name || p.unit || 'KG'
    }]);
  };

  const removeIngredient = (idx: number) => {
    const newItems = [...batchItems];
    newItems.splice(idx, 1);
    setBatchItems(newItems);
  };

  const updateIngQty = (idx: number, qty: string) => {
    const newItems = [...batchItems];
    newItems[idx].quantity = parseFloat(qty) || 0;
    setBatchItems(newItems);
  };

  const handleSave = async () => {
    if (!form.productId || !form.warehouseId || form.quantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a finished product, warehouse, and enter a valid quantity.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        productId: form.productId,
        warehouseId: form.warehouseId,
        batches: form.batches,
        expectedQuantity: (selectedRecipe?.outputQuantity || 1) * form.batches,
        quantity: form.quantity,
        date: form.date,
        items: batchItems // Send adjustable/custom raw materials consumption list
      };

      if (form.id) {
        await apiClient(`/inv/transactions/productions/${form.id}`, { method: 'PUT', data: payload });
        toast({ title: 'Success', description: 'Production run updated successfully.' });
      } else {
        await saveProduction(payload);
      }

      localStorage.setItem('prod_modal_last_wh', form.warehouseId);
      localStorage.setItem('prod_modal_last_date', form.date);
      
      setModal(false);
      setForm({ 
        productId: '', 
        productName: '', 
        batches: 1,
        quantity: 1, 
        warehouseId: form.warehouseId || warehouses[0]?.id || '',
        date: form.date || new Date().toISOString().split('T')[0]
      });
      setSelectedRecipe(null);
      setBatchItems([]);
      setProductSearch('');
      refetch();
    } catch (e: any) {
      console.error("Save production error details:", e);
      const errData = e.response?.data || e.data;
      if (errData && errData.error_type === 'NEGATIVE_RAW_MATERIALS') {
        setDeficitItems(errData.data || []);
        setDeficitModal(true);
      } else {
        const msg = errData?.message || e.message || 'Save failed';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const { filterBySelectedFY } = useFinancialYear();

  const filteredProductions = filterBySelectedFY(productions, (p: any) => p.date || p.createdAt).filter((p: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const s = [
      p.finishedProductName, p.finished_product?.name, p.warehouseName, p.warehouse?.name, p.createdAt, p.date
    ].filter(Boolean).join(' ').toLowerCase();
    return s.includes(term);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Production Log</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products, warehouses..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background h-9"
            />
          </div>
          <Button size="sm" onClick={() => {
            setForm(prev => {
              const lastWh = localStorage.getItem('prod_modal_last_wh');
              const isValid = warehouses.some(w => String(w.id) === String(lastWh));
              return {
                ...prev,
                warehouseId: isValid ? lastWh : (warehouses[0]?.id || ''),
                date: localStorage.getItem('prod_modal_last_date') || prev.date || new Date().toISOString().split('T')[0]
              };
            });
            setIsReadOnly(false);
            setModal(true);
          }} className="h-9">
            <Plus className="w-4 h-4 mr-1.5" /> New Production Run
          </Button>
        </div>
      </div>

      <SafeDataView data={filteredProductions} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Finished Product', 'Standard Yield', 'Actual Yield', 'Variance', 'Warehouse', 'Date', 'Status']}
          rows={filteredProductions.map((p: any) => {
            const expected = p.expectedQuantity || p.quantityProduced || 0;
            const actual = p.quantityProduced || p.quantity_produced || 0;
            const variance = actual - expected;
            return [
              p.finishedProductName || p.finished_product?.name || '—', 
              formatDecimal(expected),
              formatDecimal(actual),
              <span key="var" className={`font-bold ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {variance > 0 ? '+' : ''}{formatDecimal(variance)}
              </span>,
              p.warehouseName || p.warehouse?.name || '—', 
              p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—',
            <div key={p.id} className="flex flex-col gap-1 items-start">
              <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                (p.status || '').toUpperCase() === 'APPROVED'
                  ? 'bg-success/15 text-success border-success/30'
                  : (p.status || '').toUpperCase() === 'PENDING'
                  ? 'bg-warning/15 text-warning border-warning/30'
                  : 'bg-destructive/15 text-destructive border-destructive/30'
              }`}>
                {p.status || 'Approved'}
              </span>
              <div className="text-[10px] text-muted-foreground flex flex-col mt-0.5 whitespace-nowrap">
                {p.createdBy && <span>Created by {p.createdBy}</span>}
                {p.approvedBy && <span>{(p.status || '').toUpperCase() === 'REJECTED' ? 'Rejected' : 'Approved'} by {p.approvedBy}</span>}
                {p.deletedBy && <span>Deleted by {p.deletedBy}</span>}
                {p.deleteReason && <span className="max-w-[150px] truncate" title={p.deleteReason}>Reason: {p.deleteReason}</span>}
              </div>
            </div>
            ];
          })}
          onView={async (idx: number) => {
            const p = filteredProductions[idx];
            try {
              const matRes = await apiClient<any[]>(`/inv/transactions/productions/${p.id}/materials`);
              const mats = matRes && matRes.data ? matRes.data : (Array.isArray(matRes) ? matRes : []);
              
              setForm({
                id: p.id,
                productId: p.productId,
                productName: p.finishedProductName,
                batches: p.batches || 1,
                quantity: p.quantityProduced,
                warehouseId: p.warehouseId,
                date: p.createdAt ? p.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
              });
              if (mats.length > 0) {
                setBatchItems(mats);
                setSelectedRecipe({ items: [] }); // Set non-null to bypass auto-scaling
              }
              setIsReadOnly(true);
              setModal(true);
            } catch (e: any) {
              toast({ title: 'Error', description: 'Failed to load production run details.', variant: 'destructive' });
            }
          }}
          onEdit={async (idx: number) => {
            const p = filteredProductions[idx];
            try {
              const matRes = await apiClient<any[]>(`/inv/transactions/productions/${p.id}/materials`);
              const mats = matRes && matRes.data ? matRes.data : (Array.isArray(matRes) ? matRes : []);
              
              setForm({
                id: p.id,
                productId: p.productId,
                productName: p.finishedProductName,
                batches: p.batches || 1,
                quantity: p.quantityProduced,
                warehouseId: p.warehouseId,
                date: p.createdAt ? p.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
              });
              if (mats.length > 0) {
                setBatchItems(mats);
                setSelectedRecipe({ items: [] }); // Set non-null to bypass auto-scaling
              } else {
                // Fall back: locate standard recipe/BOM for this product so they can still see/adjust ingredients
                const recipe = recipesByProduct.get(p.productCode) || recipesByProduct.get(p.finishedProductName);
                if (recipe) {
                  setSelectedRecipe(recipe); // The auto-scaling useEffect will automatically run and populate batchItems based on recipe and quantity!
                } else {
                  setBatchItems([]);
                  setSelectedRecipe(null);
                }
              }
              setIsReadOnly(false);
              setModal(true);
            } catch (e: any) {
              toast({ title: 'Error', description: 'Failed to load production run details.', variant: 'destructive' });
            }
          }}
          onDelete={(idx: number) => {
            setDeleteModal({ show: true, idx, reason: '' });
          }}
        />
      </SafeDataView>

      {modal && (
        <Modal title={form.id ? "Edit Production Run" : "Record New Production Run"} onClose={() => { 
          setModal(false); 
          setForm(prev => {
            const lastWh = localStorage.getItem('prod_modal_last_wh');
            const isValid = warehouses.some(w => String(w.id) === String(lastWh));
            return { 
              productId: '', 
              productName: '', 
              quantity: 1, 
              warehouseId: isValid ? lastWh : (warehouses[0]?.id || ''), 
              date: localStorage.getItem('prod_modal_last_date') || new Date().toISOString().split('T')[0] 
            };
          }); 
          setSelectedRecipe(null); 
          setBatchItems([]); 
        }}>
          <div className="space-y-4">
            {(() => {
              const totalCost = batchItems.reduce((acc, item) => {
                const p = productsById.get(String(item.productId));
                return acc + (item.quantity * (p?.rate || 0));
              }, 0);
              const costPerBag = totalCost / (form.quantity || 1);
              if (batchItems.length > 0 && user?.role === 'SUPERADMIN') {
                return (
                  <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-primary">Total Material Cost:</span> ₹{formatDecimal(totalCost)}
                    </div>
                    <div>
                      <span className="font-semibold text-primary">Cost per Unit (Actual Yield):</span> ₹{formatDecimal(costPerBag)}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            <div className="relative" ref={finishedDropdownRef}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-medium">Finished Product <span className="text-destructive">*</span></label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-medium">Filter Category:</span>
                  <select
                    value={finishedCatFilter}
                    disabled={isReadOnly}
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
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text"
                  disabled={isReadOnly}
                  placeholder="Search finished product..."
                  value={form.productName || productSearch}
                  onFocus={() => setShowFinishedDropdown(true)}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setShowFinishedDropdown(true);
                    setForm({ ...form, productId: '', productName: '' });
                    setSelectedRecipe(null);
                  }}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {showFinishedDropdown && !form.productId && (
                <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex items-center justify-between text-xs text-muted-foreground sticky top-0 z-10">
                    <span>Select Finished Product</span>
                    <button type="button" onClick={() => { setShowFinishedDropdown(false); setProductSearch(''); }} className="hover:text-foreground font-bold">✕</button>
                  </div>
                  {products
                    .filter(p => {
                      if (finishedCatFilter) {
                        const parentCat = (p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName || '').toUpperCase();
                        const subCat = (p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : (typeof p.category === 'object' && p.category ? p.category.name : '')) || '').toUpperCase();
                        const selUpper = finishedCatFilter.toUpperCase();
                        if (parentCat !== selUpper && subCat !== selUpper) {
                          return false;
                        }
                      }
                      if (!productSearch) return true;
                      const s = productSearch.toLowerCase().trim();
                      return (
                        (p.name && p.name.toLowerCase().includes(s)) ||
                        (p.productCode && p.productCode.toLowerCase().includes(s)) ||
                        (p.sku && p.sku.toLowerCase().includes(s))
                      );
                    })
                    .map(p => {
                      const parentCat = p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName;
                      const subCat = p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : (typeof p.category === 'object' && p.category ? p.category.name : ''));
                      const catText = parentCat && subCat && parentCat !== subCat ? `${parentCat} > ${subCat}` : (parentCat || subCat || '');
                      return (
                        <button 
                          key={p.id} 
                          onClick={() => selectFinishedProduct(p)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/20 last:border-b-0 flex items-center justify-between gap-2"
                        >
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
                  {products.filter(p => {
                    if (finishedCatFilter) {
                      const parentCat = (p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName || '').toUpperCase();
                      const subCat = (p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : (typeof p.category === 'object' && p.category ? p.category.name : '')) || '').toUpperCase();
                      const selUpper = finishedCatFilter.toUpperCase();
                      if (parentCat !== selUpper && subCat !== selUpper) {
                        return false;
                      }
                    }
                    if (!productSearch) return true;
                    const s = productSearch.toLowerCase().trim();
                    return (
                      (p.name && p.name.toLowerCase().includes(s)) ||
                      (p.productCode && p.productCode.toLowerCase().includes(s)) ||
                      (p.sku && p.sku.toLowerCase().includes(s))
                    );
                  }).length === 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground">
                      No products found matching filters.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Production Date <span className="text-destructive">*</span></label>
              <input 
                type="date" 
                disabled={isReadOnly}
                value={form.date} 
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Warehouse <span className="text-destructive">*</span></label>
                <select 
                  disabled={isReadOnly}
                  value={form.warehouseId || ''} 
                  onChange={e => setForm({ ...form, warehouseId: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="" disabled>Select a Warehouse</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Number of Batches <span className="text-destructive">*</span></label>
                <input 
                  type="number" 
                  min="0.01" 
                  step="any"
                  disabled={isReadOnly}
                  value={form.batches || ''} 
                  onChange={e => setForm({ ...form, batches: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. 1"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Actual Quantity Produced <span className="text-destructive">*</span></label>
                <input 
                  type="number" 
                  min="0.01" 
                  step="any"
                  disabled={isReadOnly}
                  value={form.quantity || ''} 
                  onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Custom Adjustable Raw Materials Section */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold mb-3 flex items-center justify-between">
                Consumed Raw Materials (Batch Adjustments)
                <span className="text-[10px] font-normal text-muted-foreground">{batchItems.length} items to consume</span>
              </h3>
              
              {!isReadOnly && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Add Custom Ingredients</span>
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
              </div>
              )}
              {!isReadOnly && (
              <div className="relative mb-3" ref={rawDropdownRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search and add raw materials to this batch run..."
                  value={ingSearch}
                  onFocus={() => setShowRawDropdown(true)}
                  onChange={e => {
                    setIngSearch(e.target.value);
                    setShowRawDropdown(true);
                  }}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {showRawDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex items-center justify-between text-xs text-muted-foreground sticky top-0 z-10">
                      <span>Select Raw Material</span>
                      <button type="button" onClick={() => { setShowRawDropdown(false); setIngSearch(''); }} className="hover:text-foreground font-bold">✕</button>
                    </div>
                    {products
                      .filter(p => {
                        if (rawCatFilter) {
                          const parentCat = (p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName || '').toUpperCase();
                          const subCat = (p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : (typeof p.category === 'object' && p.category ? p.category.name : '')) || '').toUpperCase();
                          const selUpper = rawCatFilter.toUpperCase();
                          if (parentCat !== selUpper && subCat !== selUpper) {
                            return false;
                          }
                        }
                        if (!ingSearch) return true;
                        const s = ingSearch.toLowerCase().trim();
                        return (
                          (p.name && p.name.toLowerCase().includes(s)) ||
                          (p.productCode && p.productCode.toLowerCase().includes(s)) ||
                          (p.sku && p.sku.toLowerCase().includes(s))
                        );
                      })
                      .map(p => {
                        const parentCat = p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName;
                        const subCat = p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : (typeof p.category === 'object' && p.category ? p.category.name : ''));
                        const catText = parentCat && subCat && parentCat !== subCat ? `${parentCat} > ${subCat}` : (parentCat || subCat || '');
                        return (
                          <button key={p.id} onClick={() => addIngredient(p)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border/20 last:border-b-0 flex items-center justify-between gap-2">
                              <div className="truncate flex items-center gap-1.5">
                                <span className="font-medium text-foreground">{p.name}</span>
                                <span className="text-[11px] text-muted-foreground">({p.sku || p.productCode})</span>
                              </div>
                              {catText ? (
                                <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20 shrink-0">
                                  {catText}
                                </span>
                              ) : null}
                          </button>
                        );
                      })}
                    {products.filter(p => {
                      if (rawCatFilter) {
                        const parentCat = (p.categoryRef?.parent?.name || p.categoryRef?.parentName || p.parentCategoryName || '').toUpperCase();
                        const subCat = (p.categoryRef?.name || p.categoryName || (typeof p.category === 'string' ? p.category : (typeof p.category === 'object' && p.category ? p.category.name : '')) || '').toUpperCase();
                        const selUpper = rawCatFilter.toUpperCase();
                        if (parentCat !== selUpper && subCat !== selUpper) {
                          return false;
                        }
                      }
                      if (!ingSearch) return true;
                      const s = ingSearch.toLowerCase().trim();
                      return (
                        (p.name && p.name.toLowerCase().includes(s)) ||
                        (p.productCode && p.productCode.toLowerCase().includes(s)) ||
                        (p.sku && p.sku.toLowerCase().includes(s))
                      );
                    }).length === 0 && (
                      <div className="px-4 py-3 text-xs text-muted-foreground">
                        No raw materials found matching filters.
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {batchItems.map((item: any, idx: number) => {
                  const pObj = productsById.get(String(item.productId));
                  const available = pObj ? (pObj.availableStock ?? pObj.stockQty ?? 0) : 0;
                  const required = item.quantity || 0;
                  const isAvailable = available >= required;

                  return (
                    <div key={idx} className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg border border-border/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate text-foreground">{item.productName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{item.unit || 'KG'}</span>
                          <span className="text-[10px] text-muted-foreground/30">|</span>
                          <span className="text-[10px] text-muted-foreground">
                            Avail: <span className={`font-semibold ${isAvailable ? 'text-green-600' : 'text-red-500'}`}>{available}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground/30">|</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                            isAvailable 
                              ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {isAvailable ? 'In Stock' : 'Deficit'}
                          </span>
                        </div>
                      </div>
                      <div className="w-28 flex items-center gap-1.5">
                        <input 
                          type="number" 
                          step="any"
                          disabled={isReadOnly}
                          value={item.quantity} 
                          onChange={e => updateIngQty(idx, e.target.value)}
                          className="w-full border border-border rounded px-2 py-1 text-xs bg-background text-right focus:outline-none focus:ring-2 focus:ring-primary/10" 
                        />
                      </div>
                      {!isReadOnly && (
                      <button onClick={() => removeIngredient(idx)} className="p-1 hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                      )}
                    </div>
                  );
                })}
                {batchItems.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    No raw materials in this run yet. Search above to add custom raw materials.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => setModal(false)}
                disabled={isSubmitting}
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </Button>
              {!isReadOnly && (
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting || !form.productId || !form.warehouseId || form.quantity <= 0}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> Saving…</span>
                ) : (form.id ? 'Save Changes' : 'Record Production')}
              </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {deficitModal && (
        <Modal title={deficitItems.every((item: any) => (item.deficit || 0) <= 0) ? "✅ All Raw Materials Available" : "⚠️ Raw Material Deficit Detected"} onClose={() => setDeficitModal(false)}>
          <div className="space-y-4">
            <div className={`p-4 ${deficitItems.every((item: any) => (item.deficit || 0) <= 0) ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-destructive/10 border-destructive/20 text-destructive'} border rounded-xl`}>
              <p className="text-sm font-semibold flex items-center gap-2">
                {deficitItems.every((item: any) => (item.deficit || 0) <= 0) ? (
                  <span className="text-green-600 shrink-0">✅</span>
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                )}
                {deficitItems.every((item: any) => (item.deficit || 0) <= 0) ? 'All Materials In Stock' : 'Raw Material Shortage Block'}
              </p>
              <p className="text-xs mt-1 text-muted-foreground leading-relaxed">
                {deficitItems.every((item: any) => (item.deficit || 0) <= 0)
                  ? 'All required raw materials are available in sufficient quantity. You can proceed with production.'
                  : 'Recording this production run is blocked because the required quantities exceed your current stock levels. Please replenish raw materials first by placing a <strong>Purchase Entry</strong> or posting a <strong>Stock Adjustment</strong>.'}
              </p>
            </div>

            <div className="border border-border/85 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left">Material Name</th>
                    <th className="px-3 py-2 text-right">Available Stock</th>
                    <th className="px-3 py-2 text-right">Required Qty</th>
                    <th className="px-3 py-2 text-right font-bold text-destructive">Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deficitItems.map((item: any, idx: number) => {
                    const hasShortage = (item.deficit || 0) > 0;
                    return (
                      <tr key={idx} className={hasShortage ? 'bg-red-500/5' : 'bg-green-500/5'}>
                        <td className="px-3 py-2 font-medium text-foreground">{item.name}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${hasShortage ? 'text-red-600' : 'text-green-600'}`}>{formatDecimal(item.currentStock)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">{formatDecimal(item.consuming)}</td>
                        <td className={`px-3 py-2 text-right font-extrabold ${hasShortage ? 'text-destructive' : 'text-green-600'}`}>
                          {hasShortage ? `-${formatDecimal(item.deficit)}` : '✓ Available'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!deficitItems.every((item: any) => (item.deficit || 0) <= 0) && (
            <div className="bg-secondary/40 p-4 rounded-xl border border-border/20 text-xs space-y-2">
              <p className="font-semibold text-foreground">💡 Recommended Next Steps:</p>
              <p className="text-muted-foreground leading-relaxed">
                To fix the shortage, navigate to one of the raw material transaction screens below:
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button 
                  onClick={() => {
                    setDeficitModal(false);
                    setModal(false); // also close main modal
                    if (onTabChange) onTabChange('adjustments');
                  }}
                  variant="outline"
                  className="flex items-center justify-center gap-1.5 h-10 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Give Adjustment
                </Button>
                <Button 
                  onClick={() => {
                    setDeficitModal(false);
                    setModal(false);
                    if (onTabChange) onTabChange('purchases');
                  }}
                  className="flex items-center justify-center gap-1.5 h-10 bg-primary hover:bg-primary/95 text-white text-xs font-bold"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Purchase Material
                </Button>
              </div>
            </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button 
                variant={deficitItems.every((item: any) => (item.deficit || 0) <= 0) ? "default" : "outline"}
                onClick={() => setDeficitModal(false)}
                className="h-9 px-4 text-xs font-bold"
              >
                {deficitItems.every((item: any) => (item.deficit || 0) <= 0) ? 'Proceed with Production' : 'Close Warning'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      
      {deleteModal.show && (
        <Modal title="Delete Production Run" onClose={() => setDeleteModal({ show: false, idx: -1, reason: '' })}>
          <div className="space-y-4">
            <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20 flex items-start gap-3 text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Warning: This action cannot be undone.</p>
                <p>Are you sure you want to delete this production run? All stock changes will be completely reversed.</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1">Reason for deletion <span className="text-destructive">*</span></label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                placeholder="Please explain why this production is being deleted..."
                value={deleteModal.reason}
                onChange={(e) => setDeleteModal(prev => ({ ...prev, reason: e.target.value }))}
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setDeleteModal({ show: false, idx: -1, reason: '' })}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                disabled={!deleteModal.reason.trim() || isSubmitting}
                onClick={async () => {
                  const p = productions[deleteModal.idx];
                  setIsSubmitting(true);
                  try {
                    await apiClient(`/inv/transactions/productions/${p.id}`, { method: 'DELETE', data: { reason: deleteModal.reason } });
                    toast({ title: 'Success', description: 'Production run deleted successfully.' });
                    setDeleteModal({ show: false, idx: -1, reason: '' });
                    refetch();
                  } catch (e: any) {
                    toast({ title: 'Error', description: e.message || 'Delete failed', variant: 'destructive' });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Production'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
