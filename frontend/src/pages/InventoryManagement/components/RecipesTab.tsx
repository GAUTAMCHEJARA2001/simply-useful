import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, X, Search, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import apiClient from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';

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

export const RecipesTab: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<any>({ name: '', productId: '', outputQuantity: 1, items: [] });
  const [productSearch, setProductSearch] = useState<string>('');
  const [ingSearch, setIngSearch] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        apiClient<any[]>('/inv/bom').catch(() => []),
        apiClient<any[]>('/inv/masters/products').catch(() => [])
      ]);
      setRecipes(Array.isArray(r) ? r : []);
      setProducts(Array.isArray(p) ? p : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRecipes = (recipes || []).filter(r => 
    !search || (r.name && r.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async () => {
    if (!form.name || !form.productId || (form.items || []).length === 0) {
        toast({ title: 'Validation Error', description: 'Please fill in all required fields and add at least one ingredient.', variant: 'destructive' });
        return;
    }
    try {
      if (form.id) {
        await apiClient(`/inv/bom/${form.id}`, { method: 'PUT', data: form });
        toast({ title: 'Recipe updated' });
      } else {
        await apiClient('/inv/bom', { method: 'POST', data: form });
        toast({ title: 'Recipe created' });
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
    setForm({ ...form, items: [...form.items, { productId: p.id, productName: p.name, quantity: 1, unit: p.unit }] });
    setIngSearch('');
  };

  const removeIngredient = (idx: number) => {
    const newItems = [...form.items];
    newItems.splice(idx, 1);
    setForm({ ...form, items: newItems });
  };

  const updateIngQty = (idx: number, qty: string) => {
    const newItems = [...form.items];
    newItems[idx].quantity = parseFloat(qty) || 0;
    setForm({ ...form, items: newItems });
  };

  const canManage = ['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">BOM (Recipes)</h1>
        {canManage && (
          <Button size="sm" onClick={() => { setForm({ name: '', product_id: '', output_quantity: 1, items: [] }); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Recipe
          </Button>
        )}
      </div>

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
        columns={['Recipe Name', 'Finished Product', 'Yield Qty', 'Actions']}
        rows={filteredRecipes.map((r: any) => [
          r.name,
          r.productName || '—',
          r.outputQuantity,
          <div className="flex justify-end pr-2">
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
          </div>
        ])}
        onEdit={canManage ? async (i: number) => {
            const r = filteredRecipes[i];
            try {
                const details = await apiClient<any>(`/inv/bom/${r.id}`);
                setForm(details);
                setModal(true);
            } catch (e: any) {
                toast({ title: 'Failed to load details', description: e.message, variant: 'destructive' });
            }
        } : undefined}
        onDelete={canManage ? async (i: number) => {
            if (!confirm('Are you sure you want to delete this recipe?')) return;
            try {
                await apiClient(`/inv/bom/${filteredRecipes[i].id}`, { method: 'DELETE' });
                toast({ title: 'Recipe deleted' });
                loadData();
                if (onRefresh) onRefresh();
            } catch (e: any) {
                toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
            }
        } : undefined}
      />

      {modal && (
        <Modal title={form.id ? "Edit Recipe" : "New Recipe"} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Recipe Name <span className="text-destructive">*</span></label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Standard Tile Adhesive Mix"
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>

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
                  }}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-background text-sm"
                />
              </div>
              {productSearch && !form.productId && (
                <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {products.filter(p => !productSearch || (p.name && p.name.toLowerCase().includes(productSearch.toLowerCase()))).map(p => (
                        <button key={p.id} onClick={() => { setForm({ ...form, productId: p.id, productName: p.name }); setProductSearch(''); }}
                             className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors">
                            {p.name} <span className="text-[10px] text-muted-foreground ml-2">({p.sku})</span>
                        </button>
                    ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Yield Quantity (Output)</label>
              <input type="number" value={form.outputQuantity || 1} onChange={e => setForm({ ...form, outputQuantity: e.target.value })}
                 className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold mb-3 flex items-center justify-between">
                Ingredients List
                <span className="text-[10px] font-normal text-muted-foreground">{form.items?.length || 0} items added</span>
              </h3>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search and add raw materials..."
                  value={ingSearch}
                  onChange={e => setIngSearch(e.target.value)}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2 bg-background text-sm"
                />
                {ingSearch && (
                    <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {products.filter(p => !ingSearch || (p.name && p.name.toLowerCase().includes(ingSearch.toLowerCase()))).map(p => (
                            <button key={p.id} onClick={() => addIngredient(p)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors">
                                {p.name} <span className="text-[10px] text-muted-foreground ml-2">({p.sku})</span>
                            </button>
                        ))}
                    </div>
                )}
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {(form.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg border border-border/40">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{item.productName}</p>
                            <p className="text-[10px] text-muted-foreground">{item.unit || '—'}</p>
                        </div>
                        <div className="w-24">
                            <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => updateIngQty(idx, e.target.value)}
                                className="w-full border border-border rounded px-2 py-1 text-xs bg-background" 
                            />
                        </div>
                        <button onClick={() => removeIngredient(idx)} className="p-1 hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {(form.items || []).length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground">
                        No ingredients added yet. Search above to add.
                    </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button onClick={handleSave} className="w-full">{form.id ? 'Save Changes' : 'Create Recipe'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
