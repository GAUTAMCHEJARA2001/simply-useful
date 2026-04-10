import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, X } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

const Currency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

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

export const ProductsTab: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string>('');

  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<any>({});
  const [viewProduct, setViewProduct] = useState<any>(null);
  const [parentCatId, setParentCatId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const filtered = (products || []).filter(p => 
    !search || 
    (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (modal && form.category_id && categories.length > 0) {
      const cat = categories.find(c => c.id === form.category_id);
      if (cat?.parent_id) {
        setParentCatId(cat.parent_id);
      } else {
        setParentCatId(form.category_id);
      }
    } else if (modal && !form.category_id) {
      setParentCatId('');
    }
  }, [modal, form.category_id, categories]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, b, w, u, s] = await Promise.all([
        apiClient<any[]>('/inv/masters/products').catch(() => []),
        apiClient<any[]>('/inv/masters/categories').catch(() => []),
        apiClient<any[]>('/inv/masters/brands').catch(() => []),
        apiClient<any[]>('/inv/masters/warehouses').catch(() => []),
        apiClient<any[]>('/inv/masters/units').catch(() => []),
        apiClient<any>('/inv/masters/settings').catch(() => null)
      ]);
      setProducts(p || []);
      setCategories(c || []);
      setBrands(b || []);
      setWarehouses(w || []);
      setUnits(u || []);
      setSettings(s);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (modal && !form.id && !form.sku) {
      try {
        const initials = settings?.company_name && typeof settings.company_name === 'string'
          ? settings.company_name.split(' ').filter(Boolean).map((w: string) => w[0]?.toUpperCase()).join('').substring(0, 4) 
          : 'KCPL';
        const nextNum = products ? (products.length + 1) : 1;
        setForm((f: any) => ({ ...f, sku: `${initials}-${nextNum.toString().padStart(4, '0')}` }));
      } catch (err) {
        console.error("SKU Gen Fail:", err);
      }
    }
  }, [modal, form.id, form.sku, settings, products]);

  const handleSave = async () => {
    try {
      if (form.id) {
        await apiClient(`/inv/masters/products/${form.id}`, { method: 'PUT', data: form });
        toast({ title: 'Product updated' });
      } else {
        await apiClient('/inv/masters/products', { method: 'POST', data: form });
        toast({ title: 'Product saved' });
      }
      setModal(false); setForm({});
      loadData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await apiClient(`/inv/masters/products/${deleteTarget}`, { method: 'DELETE' });
      toast({ title: 'Deleted' });
      loadData();
    } catch (e: any) { 
      console.error('Delete API Error:', e);
      toast({ title: 'Error', description: e.message, variant: 'destructive' }); 
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const canManage = ['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(user?.role || '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        {canManage && (
          <Button size="sm" onClick={() => { setForm({}); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Product
          </Button>
        )}
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading Products…</div>}

      <div className="relative">
        <input 
          type="text" 
          placeholder="Search products by name or SKU..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2 text-sm bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <DataTable
        columns={['SKU', 'Name', 'Unit', 'Min Stock', 'Price']}
        rows={filtered.map((p: any) => [p.sku, p.name, p.unit || '—', p.minimum_stock, Currency(p.default_price)])}

        onEdit={canManage ? (i: number) => { setForm(filtered[i]); setModal(true); } : undefined}
        onDelete={canManage ? (i: number) => handleDeleteClick(filtered[i].id) : undefined} 
        onRowClick={(i: number) => setViewProduct(filtered[i])}
      />

      {modal && (
        <Modal title={form.id ? "Edit Product" : "Add Product"} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Brand</label>
              <select value={form.brand_id || ''} onChange={e => setForm({ ...form, brand_id: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select Brand --</option>
                {(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select value={parentCatId} onChange={e => { setParentCatId(e.target.value); setForm({ ...form, category_id: e.target.value }); }}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select Category --</option>
                {(categories || []).filter((c: any) => !c.parent_id).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Sub Category</label>
              <select value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}
                disabled={!parentCatId}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm disabled:opacity-50">
                <option value="">-- Select Sub Category --</option>
                {(categories || []).filter((c: any) => c.parent_id === parentCatId).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {[['sku', 'SKU', 'text'], ['name', 'Product Name', 'text'], ['minimum_stock', 'Minimum Stock', 'number']].map(([k, lbl, type]) => (
              <div key={k as string}>
                <label className="text-sm font-medium block mb-1">{lbl as string}</label>
                <input type={type as string} value={form[k as string] || ''} onChange={e => setForm({ ...form, [k as string]: e.target.value })}
                  onWheel={type === 'number' ? e => e.currentTarget.blur() : undefined}
                  readOnly={k === 'sku'}
                  className={`w-full border border-border rounded-lg px-3 py-2 bg-background text-sm ${k === 'sku' ? 'bg-muted cursor-not-allowed font-mono' : ''}`} />
              </div>
            ))}

            <div>
              <label className="text-sm font-medium block mb-1">Unit</label>
              <select value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select Unit --</option>
                {(units || []).map((u: any) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Warehouse</label>
              <select value={form.default_warehouse_id || ''} onChange={e => setForm({ ...form, default_warehouse_id: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- None --</option>
                {(warehouses || []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={handleSave}>{form.id ? 'Save' : 'Create Product'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {deleteDialogOpen && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm" aria-describedby="delete-product-desc">
            <DialogHeader>
              <DialogTitle>Delete Product?</DialogTitle>
              <DialogDescription id="delete-product-desc" className="sr-only">
                Confirm permanent removal of this product from the inventory master.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">This action cannot be undone. Product data will be permanently removed.</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {viewProduct && (
        <Modal title="Product Details" onClose={() => setViewProduct(null)}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold text-muted-foreground">SKU:</span> {viewProduct.sku}</div>
            <div><span className="font-semibold text-muted-foreground">Name:</span> {viewProduct.name}</div>
            <div><span className="font-semibold text-muted-foreground">Brand:</span> {brands.find(b => b.id === viewProduct.brand_id)?.name || '—'}</div>
            <div><span className="font-semibold text-muted-foreground">Category:</span> {categories.find(c => c.id === viewProduct.category_id)?.name || '—'}</div>
            <div><span className="font-semibold text-muted-foreground">Unit:</span> {viewProduct.unit || '—'}</div>
            <div><span className="font-semibold text-muted-foreground">Minimum Stock:</span> {viewProduct.minimum_stock}</div>
            <div><span className="font-semibold text-muted-foreground">Default Price:</span> {Currency(viewProduct.default_price)}</div>
            <div><span className="font-semibold text-muted-foreground">Warehouse:</span> {warehouses.find(w => w.id === viewProduct.default_warehouse_id)?.name || '—'}</div>
          </div>
        </Modal>
      )}
    </div>
  );
};
