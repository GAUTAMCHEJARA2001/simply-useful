import React, { useState, useEffect } from 'react';
import { useProductions, useProductionMutations } from '@/hooks/inventory/useProductions';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, X, Search, RefreshCw, Trash2, AlertTriangle, ShoppingCart } from 'lucide-react';
import { SafeDataView } from '@/components/SafeDataView';
import { motion } from 'framer-motion';
import apiClient from '@/api/client';
import { useToast } from '@/hooks/use-toast';

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

  const [modal, setModal] = useState<boolean>(false);
  const [deficitModal, setDeficitModal] = useState<boolean>(false);
  const [deficitItems, setDeficitItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ 
    productId: '', 
    productName: '', 
    quantity: 1, 
    warehouseId: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Masters lists
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);

  // Batch ingredients adjustments
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [batchItems, setBatchItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [ingSearch, setIngSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [pRes, wRes, rRes] = await Promise.all([
          apiClient<any[]>('/inv/masters/products').catch(() => null),
          apiClient<any[]>('/inv/masters/warehouses').catch(() => null),
          apiClient<any[]>('/bom').catch(() => null)
        ]);
        const pList = pRes && pRes.data ? pRes.data : (Array.isArray(pRes) ? pRes : []);
        const wList = wRes && wRes.data ? wRes.data : (Array.isArray(wRes) ? wRes : []);
        const rList = rRes && rRes.data ? rRes.data : (Array.isArray(rRes) ? rRes : []);
        
        setProducts(pList);
        setWarehouses(wList);
        setRecipes(rList);
        
        if (wList.length > 0) {
          setForm(prev => ({ ...prev, warehouseId: wList[0].id }));
        }
      } catch (e) {
        console.error("Failed to load master lists for production", e);
      }
    };
    fetchMasters();
  }, []);

  // Dynamically scale ingredient quantities based on recipe standard ratios and entered yield quantity
  useEffect(() => {
    if (!selectedRecipe) {
      setBatchItems([]);
      return;
    }
    // Only scale if the recipe has standard items (preserves manually edited list during updates)
    if (selectedRecipe.items && selectedRecipe.items.length > 0) {
      const newItems = (selectedRecipe.items || []).map((item: any) => {
        const ratio = (item.qty || item.quantity || 0) / (selectedRecipe.outputQuantity || 1);
        return {
          productId: item.productId,
          productName: item.productName || item.materialName,
          quantity: parseFloat((ratio * (form.quantity || 0)).toFixed(4)) || 0,
          unit: item.unit
        };
      });
      setBatchItems(newItems);
    }
  }, [form.quantity, selectedRecipe]);

  const selectFinishedProduct = (p: any) => {
    // Locate the standard recipe/BOM mapping for this product
    const recipe = recipes.find((r: any) => r.productCode === p.productCode || r.productName === p.name || r.name === p.name);
    
    setForm({ ...form, productId: p.id, productName: p.name });
    setSelectedRecipe(recipe || null);
    setProductSearch('');

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
    setIngSearch('');
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

      setModal(false);
      setForm({ 
        productId: '', 
        productName: '', 
        quantity: 1, 
        warehouseId: warehouses[0]?.id || '',
        date: new Date().toISOString().split('T')[0]
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Production Log</h1>
        <Button size="sm" onClick={() => setModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Production Run
        </Button>
      </div>

      <SafeDataView data={productions} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Finished Product', 'Qty Produced', 'Warehouse', 'Date']}
          rows={productions.map((p: any) => [
            p.finishedProductName || p.finished_product?.name || '—', 
            p.quantityProduced || p.quantity_produced || 0, 
            p.warehouseName || p.warehouse?.name || '—', 
            p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'
          ])}
          onEdit={async (idx: number) => {
            const p = productions[idx];
            try {
              const matRes = await apiClient<any[]>(`/inv/transactions/productions/${p.id}/materials`);
              const mats = matRes && matRes.data ? matRes.data : (Array.isArray(matRes) ? matRes : []);
              
              setForm({
                id: p.id,
                productId: p.productId,
                productName: p.finishedProductName,
                quantity: p.quantityProduced,
                warehouseId: p.warehouseId,
                date: p.createdAt ? p.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
              });
              if (mats.length > 0) {
                setBatchItems(mats);
                setSelectedRecipe({ items: [] }); // Set non-null to bypass auto-scaling
              } else {
                // Fall back: locate standard recipe/BOM for this product so they can still see/adjust ingredients
                const recipe = recipes.find((r: any) => r.productName === p.finishedProductName || r.productCode === p.productCode || r.name === p.finishedProductName);
                if (recipe) {
                  setSelectedRecipe(recipe); // The auto-scaling useEffect will automatically run and populate batchItems based on recipe and quantity!
                } else {
                  setBatchItems([]);
                  setSelectedRecipe(null);
                }
              }
              setModal(true);
            } catch (e: any) {
              toast({ title: 'Error', description: 'Failed to load production run details.', variant: 'destructive' });
            }
          }}
          onDelete={async (idx: number) => {
            const p = productions[idx];
            if (!confirm('Are you sure you want to delete this production run? All stock changes will be completely reversed.')) return;
            try {
              await apiClient(`/inv/transactions/productions/${p.id}`, { method: 'DELETE' });
              toast({ title: 'Success', description: 'Production run deleted successfully.' });
              refetch();
            } catch (e: any) {
              toast({ title: 'Error', description: e.message || 'Delete failed', variant: 'destructive' });
            }
          }}
        />
      </SafeDataView>

      {modal && (
        <Modal title={form.id ? "Edit Production Run" : "Record New Production Run"} onClose={() => { setModal(false); setForm({ productId: '', productName: '', quantity: 1, warehouseId: warehouses[0]?.id || '', date: new Date().toISOString().split('T')[0] }); setSelectedRecipe(null); setBatchItems([]); }}>
          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium block mb-1">Finished Product <span className="text-destructive">*</span></label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search finished product..."
                  value={form.productName || productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setForm({ ...form, productId: '', productName: '' });
                    setSelectedRecipe(null);
                  }}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {productSearch && !form.productId && (
                <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {products
                    .filter(p => {
                      const cat = (p.categoryRef?.name || p.categoryName || p.category?.name || '').toUpperCase();
                      return cat === 'FINISHED GOOD' || cat === 'SEMI FINISHED GOOD' || cat === 'TILES ADHESIVE' || cat === 'JOINT FILLER';
                    })
                    .filter(p => !productSearch || (p.name && p.name.toLowerCase().includes(productSearch.toLowerCase())))
                    .map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => selectFinishedProduct(p)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors border-b border-border/20 last:border-b-0"
                      >
                        {p.name} <span className="text-[10px] text-muted-foreground ml-2">({p.productCode || p.sku})</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Production Date <span className="text-destructive">*</span></label>
              <input 
                type="date" 
                value={form.date} 
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Warehouse <span className="text-destructive">*</span></label>
                <select 
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
                <label className="text-sm font-medium block mb-1">Quantity Produced <span className="text-destructive">*</span></label>
                <input 
                  type="number" 
                  min="0.01" 
                  step="any"
                  value={form.quantity || ''} 
                  onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter yield quantity"
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
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search and add raw materials to this batch run..."
                  value={ingSearch}
                  onChange={e => setIngSearch(e.target.value)}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {ingSearch && (
                  <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {products
                      .filter(p => !ingSearch || (p.name && p.name.toLowerCase().includes(ingSearch.toLowerCase())))
                      .map(p => (
                        <button key={p.id} onClick={() => addIngredient(p)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors border-b border-border/20 last:border-b-0">
                            {p.name} <span className="text-[10px] text-muted-foreground ml-2">({p.sku || p.productCode})</span>
                        </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {batchItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg border border-border/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.productName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.unit || 'KG'}</p>
                    </div>
                    <div className="w-28 flex items-center gap-1.5">
                      <input 
                        type="number" 
                        step="any"
                        value={item.quantity} 
                        onChange={e => updateIngQty(idx, e.target.value)}
                        className="w-full border border-border rounded px-2 py-1 text-xs bg-background text-right focus:outline-none focus:ring-2 focus:ring-primary/10" 
                      />
                    </div>
                    <button onClick={() => removeIngredient(idx)} className="p-1 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
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
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting || !form.productId || !form.warehouseId || form.quantity <= 0}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> Saving…</span>
                ) : (form.id ? 'Save Changes' : 'Record Production')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deficitModal && (
        <Modal title="⚠️ Raw Material Deficit Detected" onClose={() => setDeficitModal(false)}>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
              <p className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                Raw Material Shortage Block
              </p>
              <p className="text-xs mt-1 text-muted-foreground leading-relaxed">
                Recording this production run is blocked because the required quantities exceed your current stock levels. Please replenish raw materials first by placing a <strong>Purchase Entry</strong> or posting a <strong>Stock Adjustment</strong>.
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
                  {deficitItems.map((item: any, idx: number) => (
                    <tr key={idx} className="bg-card">
                      <td className="px-3 py-2 font-medium text-foreground">{item.name}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-600">{item.currentStock}</td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">{item.consuming}</td>
                      <td className="px-3 py-2 text-right font-extrabold text-destructive">-{item.deficit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

            <div className="flex justify-end pt-2 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => setDeficitModal(false)}
                className="h-9 px-4 text-xs font-bold"
              >
                Close Warning
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
