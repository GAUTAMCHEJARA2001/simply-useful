import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { INVENTORY_ROLES } from '@/constants/roles';
import { useProducts, useProductMutations } from '@/hooks/inventory/useProducts';
import { useBrands } from '@/hooks/inventory/useBrands';
import { useCategories } from '@/hooks/inventory/useCategories';
import { useWarehouses, useUnits, useSettings } from '@/hooks/inventory/useMasters';
import { Product } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const ProductsTab: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState<string>('');
  
  // Data Queries
  const { data: products = [], isLoading: loadingProducts, error: errorProducts, refetch } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: warehouses = [] } = useWarehouses();
  const { data: units = [] } = useUnits();
  const { data: settings } = useSettings();

  // Mutations
  const { saveProduct, deleteProduct } = useProductMutations();

  // Local UI State
  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<Partial<Product>>({});
  const [viewProduct, setViewProduct] = useState<any>(null);
  const [parentCatId, setParentCatId] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string>('');

  const filtered = products.filter(p => 
    !search || 
    (p.name || p.productName || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.sku || p.productCode || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (modal && form.categoryId) {
      const cat = categories.find(c => String(c.id) === String(form.categoryId));
      if (cat?.parent_id || cat?.parentId) {
        setParentCatId(String(cat.parent_id || cat.parentId || ''));
      } else {
        setParentCatId(String(form.categoryId));
      }
    } else if (modal && !form.categoryId) {
      setParentCatId('');
    }
  }, [modal, form.categoryId, categories]);

  useEffect(() => {
    if (modal && !form.id && !form.sku && !form.productCode) {
      const initials = settings?.companyName 
        ? settings.companyName.split(' ').filter(Boolean).map((w: string) => w[0]?.toUpperCase()).join('').substring(0, 4) 
        : 'KCPL';
      const nextNum = products.length + 1;
      const sku = `${initials}-${nextNum.toString().padStart(4, '0')}`;
      setForm(f => ({ ...f, sku, productCode: sku }));
    }
  }, [modal, form.id, form.sku, form.productCode, settings, products.length]);

  useEffect(() => {
    if (modal) {
      let updated = false;
      const newForm = { ...form };
      
      if (form.unit && typeof form.unit === 'object' && !form.unitId) {
        newForm.unitId = (form.unit as any).id;
        updated = true;
      }
      if (form.brand && typeof form.brand === 'object' && !form.brandId) {
        newForm.brandId = (form.brand as any).id;
        updated = true;
      }
      
      if (updated) {
        setForm(newForm);
      }
    }
  }, [modal, form.unit, form.brand, form.unitId, form.brandId]);

  const handleSave = async () => {
    await saveProduct(form);
    setModal(false); 
    setForm({});
  };

  const confirmDelete = async () => {
    await deleteProduct(deleteTarget);
    setDeleteDialogOpen(false);
  };

  const canManage = INVENTORY_ROLES.includes(user?.role as any);

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

      <div className="relative">
        <input 
          type="text" 
          placeholder="Search products by name or SKU..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-2 text-sm bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <SafeDataView
        data={filtered}
        isLoading={loadingProducts}
        error={errorProducts instanceof Error ? errorProducts.message : null}
        onRetry={() => refetch()}
        emptyMessage={search ? "No products match your search" : "No products found"}
      >
        <DataTable
          columns={['SKU', 'Name', 'Category', 'Unit', 'Stock', 'Price']}
          rows={filtered.map((p: any) => [
            p.productCode || p.sku || '—', 
            p.name || p.productName || '—', 
            p.categoryRef?.name || p.categoryName || p.category?.name || '—',
            p.unit?.name || p.unit || '—', 
            <span className={`font-bold ${p.availableStock <= (p.minimumStock || 0) ? 'text-destructive' : 'text-success'}`}>
              {p.availableStock || p.stockQty || 0}
            </span>, 
            Currency(p.rate || p.defaultPrice || 0)
          ])}
          onEdit={canManage ? (i: number) => { setForm(filtered[i]); setModal(true); } : undefined}
          onDelete={canManage ? (i: number) => { setDeleteTarget(filtered[i].id!); setDeleteDialogOpen(true); } : undefined} 
          onRowClick={(i: number) => setViewProduct(filtered[i])}
        />
      </SafeDataView>


      <Modal isOpen={modal} title={form.id ? "Edit Product" : "Add Product"} onClose={() => setModal(false)}>
        <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Brand</label>
              <select value={form.brandId || form.brand_id || ''} onChange={e => setForm({ ...form, brandId: parseInt(e.target.value) })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select Brand --</option>
                {(brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select value={parentCatId} onChange={e => { setParentCatId(e.target.value); setForm({ ...form, categoryId: e.target.value }); }}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select Category --</option>
                {(categories || []).filter((c: any) => !c.parent_id && !c.parentId).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Sub Category</label>
              <select value={form.categoryId || ''} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                disabled={!parentCatId}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm disabled:opacity-50">
                <option value="">-- Select Sub Category --</option>
                 {(categories || []).filter((c: any) => (
                   (c.parent_id && String(c.parent_id) === String(parentCatId)) || 
                   (c.parentId && String(c.parentId) === String(parentCatId))
                 )).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {[
              { key: 'productCode', label: 'SKU', type: 'text', readOnly: true },
              { key: 'name', label: 'Product Name', type: 'text' },
              { key: 'minimumStock', label: 'Minimum Stock', type: 'number' },
              { key: 'rate', label: 'Price', type: 'number' }
            ].map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium block mb-1">{field.label}</label>
                <input 
                  type={field.type} 
                  value={(form as any)[field.key] || ''} 
                  onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                  onWheel={field.type === 'number' ? e => e.currentTarget.blur() : undefined}
                  readOnly={field.readOnly}
                  className={`w-full border border-border rounded-lg px-3 py-2 bg-background text-sm ${field.readOnly ? 'bg-muted cursor-not-allowed font-mono' : ''}`} 
                />
              </div>
            ))}

            <div>
              <label className="text-sm font-medium block mb-1">Unit</label>
              <select value={form.unitId || ''} onChange={e => setForm({ ...form, unitId: e.target.value ? parseInt(e.target.value) : '' })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select Unit --</option>
                {(units || []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Warehouse</label>
              <select value={form.defaultWarehouseId || ''} onChange={e => setForm({ ...form, defaultWarehouseId: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- None --</option>
                {(warehouses || []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={handleSave}>{form.id ? 'Save Changes' : 'Create Product'}</Button>
            </div>
          </div>
      </Modal>

      {deleteDialogOpen && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Product?</DialogTitle>
              <DialogDescription>
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

      <Modal isOpen={!!viewProduct} title="Product Details" onClose={() => setViewProduct(null)}>
        {viewProduct && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold text-muted-foreground">SKU:</span> {viewProduct.productCode || viewProduct.sku}</div>
            <div><span className="font-semibold text-muted-foreground">Name:</span> {viewProduct.name || viewProduct.productName}</div>
            <div><span className="font-semibold text-muted-foreground">Brand:</span> {viewProduct.brand?.name || viewProduct.brandName || '—'}</div>
            <div><span className="font-semibold text-muted-foreground">Category:</span> {viewProduct.categoryRef?.name || viewProduct.category?.name || viewProduct.categoryName || '—'}</div>
            <div><span className="font-semibold text-muted-foreground">Unit:</span> {viewProduct.unit?.name || viewProduct.unit || '—'}</div>
            <div><span className="font-semibold text-muted-foreground">Stock:</span> {viewProduct.availableStock || viewProduct.stockQty || 0}</div>
            <div><span className="font-semibold text-muted-foreground">Default Price:</span> {Currency(viewProduct.rate || viewProduct.defaultPrice || 0)}</div>
            <div><span className="font-semibold text-muted-foreground">Warehouse:</span> {warehouses.find((w: any) => w.id === viewProduct.defaultWarehouseId)?.name || '—'}</div>
          </div>
        )}
      </Modal>
    </div>
  );
};
