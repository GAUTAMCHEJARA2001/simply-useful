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
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Product } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { inventoryService } from '@/api/services/inventory.service';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const ProductsTab: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState<string>('');
  
  // Data Queries
  const { data: products = [], isLoading: loadingProducts, error: errorProducts, refetch } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: warehouses = [] } = useWarehouses();
  const { data: units = [] } = useUnits();
  const { data: settings } = useSettings();
  const { activeWarehouseId, activeWarehouseName } = useWarehouse();

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
    if (modal && !form.id) {
      if (!activeWarehouseId) {
        setForm(f => ({ ...f, sku: '', productCode: '' }));
        return;
      }
      
      const timer = setTimeout(async () => {
        if (form.name && form.categoryId && form.brandId) {
          try {
            const res = await inventoryService.suggestSKU({
              name: form.name,
              categoryId: form.categoryId,
              brandId: form.brandId
            });
            if (res.data?.success && res.data?.data?.sku) {
              setForm(f => ({ ...f, sku: res.data.data.sku, productCode: res.data.data.sku, defaultWarehouseId: activeWarehouseId }));
            }
          } catch (e) {
             console.error("Failed to suggest SKU", e);
          }
        } else {
           // If they clear the name, reset the sku so it doesn't stay stale
           setForm(f => ({ ...f, sku: '', productCode: '', defaultWarehouseId: activeWarehouseId }));
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [modal, form.id, form.name, form.categoryId, form.brandId, activeWarehouseId]);

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
    if (!form.id && (!activeWarehouseId || activeWarehouseId === 'GLOBAL')) {
      toast({ title: 'Warehouse required', description: 'Please select a specific warehouse (not Global) to create a product.', variant: 'destructive' });
      return;
    }
    if (!form.categoryId) {
      toast({ title: 'Category required', description: 'Please select a category for the product.', variant: 'destructive' });
      return;
    }
    // Strip read-only nested fields before sending to API — the backend
    // serializer expects plain IDs, not nested objects like brand={id,name}.
    const { brand, unit, categoryRef, ...cleanForm } = form as any;
    const payload: Partial<Product> = {
      ...cleanForm,
      rate: Number(cleanForm.rate) || 0,
      gst: cleanForm.gst !== undefined && cleanForm.gst !== null ? Number(cleanForm.gst) : 18,
      openingStock: Number(cleanForm.openingStock) || 0,
      minimumStock: Number(cleanForm.minimumStock) || 0,
      // Resolve brandId from nested object if not already set
      brandId: cleanForm.brandId ? Number(cleanForm.brandId) : undefined,
    };
    try {
      await saveProduct(payload);
      setModal(false);
      setForm({});
    } catch (error) {
      // Error is already handled by useProductMutations and displayed via toast
      console.warn("Product save failed, keeping modal open for correction.");
    }
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
          columns={['SKU', 'Name', 'Category', 'Unit', user?.role === 'SUPERADMIN' ? 'Shortage' : 'Available Stock', 'Price']}
          rows={filtered.map((p: any) => {
            const avail = p.availableStock || p.stockQty || 0;
            const min = p.minimumStock || 0;
            const shortage = Math.max(0, min - avail);
            return [
              p.productCode || p.sku || '—', 
              p.name || p.productName || '—', 
              p.categoryRef?.name || p.categoryName || p.category?.name || '—',
              p.unit?.name || p.unit || '—', 
              user?.role === 'SUPERADMIN' ? (
                <span className={`font-bold ${shortage > 0 ? 'text-destructive' : 'text-success'}`}>
                  {shortage}
                </span>
              ) : (
                <span className={`font-bold ${avail <= min ? 'text-destructive' : 'text-success'}`}>
                  {avail}
                </span>
              ), 
              Currency(p.rate || p.defaultPrice || 0)
            ];
          })}
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
              { key: 'openingStock', label: 'Opening Stock', type: 'number' },
              { key: 'minimumStock', label: 'Minimum Stock', type: 'number' },
              { key: 'rate', label: 'Price', type: 'number' }
            ].map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium block mb-1">{field.label}</label>
                 <input 
                  type={field.type} 
                  value={String((form as any)[field.key] !== undefined && (form as any)[field.key] !== null && !Number.isNaN((form as any)[field.key]) ? (form as any)[field.key] : '')} 
                  onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value) || 0) : e.target.value })}
                  onWheel={field.type === 'number' ? e => e.currentTarget.blur() : undefined}
                  readOnly={field.readOnly}
                  placeholder={field.key === 'productCode' ? 'Auto-assigned by system on save' : ''}
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
              <label className="text-sm font-medium block mb-1">GST (%)</label>
              <select value={form.gst !== undefined ? form.gst : 18} onChange={e => {
                const val = Number(e.target.value);
                setForm({ ...form, gst: val });
              }} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value={0}>0% (Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4 p-3 bg-muted/40 rounded-xl border border-border text-center">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-0.5">CGST</label>
                <div className="text-sm font-bold text-foreground">{(form.gst !== undefined ? form.gst : 18) / 2}%</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-0.5">SGST</label>
                <div className="text-sm font-bold text-foreground">{(form.gst !== undefined ? form.gst : 18) / 2}%</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-0.5">IGST</label>
                <div className="text-sm font-bold text-foreground">{form.gst !== undefined ? form.gst : 18}%</div>
              </div>
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
            <div><span className="font-semibold text-muted-foreground">Opening Stock:</span> {viewProduct.openingStock || 0}</div>
            <div><span className="font-semibold text-muted-foreground">Stock:</span> {viewProduct.availableStock || viewProduct.stockQty || 0}</div>
            <div><span className="font-semibold text-muted-foreground">Default Price:</span> {Currency(viewProduct.rate || viewProduct.defaultPrice || 0)}</div>
            <div><span className="font-semibold text-muted-foreground">Warehouse:</span> {warehouses.find((w: any) => w.id === viewProduct.defaultWarehouseId)?.name || '—'}</div>
            <div><span className="font-semibold text-muted-foreground">GST:</span> {viewProduct.gst !== undefined ? viewProduct.gst : 18}%</div>
            <div className="col-span-2"><span className="font-semibold text-muted-foreground">CGST / SGST / IGST:</span> {(viewProduct.gst !== undefined ? viewProduct.gst : 18) / 2}% / {(viewProduct.gst !== undefined ? viewProduct.gst : 18) / 2}% / {viewProduct.gst !== undefined ? viewProduct.gst : 18}%</div>
          </div>
        )}
      </Modal>
    </div>
  );
};
