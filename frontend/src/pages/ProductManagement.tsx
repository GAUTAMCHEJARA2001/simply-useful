import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Product, Category, Brand, Unit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Tag, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiService } from '@/api/apiService';

const STORAGE_KEY = 'erp_product_categories';
const DEFAULT_CATEGORIES = ['Tile Adhesive', 'Water Proofing', 'Grout', 'Wall Putty', 'Epoxy', 'Primer', 'Sealant', 'Other'];
const PAGE_SIZE = 20;

const getCategories = (): string[] => {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; }
};
const saveCategories = (cats: string[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));

const CAT_COLORS: Record<string, string> = {
  'Tile Adhesive': 'bg-blue-100 text-blue-700',
  'Water Proofing': 'bg-cyan-100 text-cyan-700',
  'Grout': 'bg-purple-100 text-purple-700',
  'Wall Putty': 'bg-orange-100 text-orange-700',
  'Epoxy': 'bg-red-100 text-red-700',
  'Primer': 'bg-yellow-100 text-yellow-700',
  'Sealant': 'bg-green-100 text-green-700',
  'Other': 'bg-gray-100 text-gray-700',
};
const getCatColor = (cat: string) => CAT_COLORS[cat] || 'bg-indigo-100 text-indigo-700';

const getCategoryName = (category: Product['category']) => {
  if (!category) return 'Other';
  if (typeof category === 'object') return category.name || 'Other';
  return category;
};

const emptyProduct: Product = {
  productCode: '',
  name: '',
  productName: '',
  category: '',
  categoryId: '',
  bagSize: '',
  rate: 0,
  gst: 18,
  openingStock: 0,
  minimumStock: 0,
  brandId: undefined,
  unitId: undefined,
  defaultWarehouseId: null
};

const ProductManagement: React.FC = () => {
  const { user } = useAuth();
  const { addProduct, updateProduct, deleteProduct, warehouses } = useData();
  const { can } = usePermissions();
  const { toast } = useToast();

  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnitList] = useState<Unit[]>([]);

  const [selectedParentCatId, setSelectedParentCatId] = useState<string>('');
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('');

  const [categories, setCategories] = useState<string[]>(getCategories);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Product>(emptyProduct);
  const [deleteTarget, setDeleteTarget] = useState('');

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isAdmin = can('manage_products');

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [catsRes, brandsRes, unitsRes] = await Promise.all([
          apiService.inventory.getCategories(),
          apiService.inventory.getBrands(),
          apiService.inventory.getUnits()
        ]);
        if (catsRes.data?.success) {
          const fetchedCats = catsRes.data.data || [];
          setDbCategories(fetchedCats);
          const catNames = Array.from(new Set(fetchedCats.map((c: any) => c.name))) as string[];
          if (catNames.length > 0) {
            setCategories(catNames);
            saveCategories(catNames);
          }
        }
        if (brandsRes.data?.success) setBrands(brandsRes.data.data || []);
        if (unitsRes.data?.success) setUnitList(unitsRes.data.data || []);
      } catch (err) {
        console.error("Error fetching master lists:", err);
      }
    };
    if (user) fetchMasters();
  }, [user]);

  const fetchPage = useCallback(async (p: number, searchTerm: string, append: boolean) => {
    setLoading(true);
    try {
      const res = await apiService.inventory.getPaginated(p, PAGE_SIZE, searchTerm || undefined);
      const data = res.data?.data;
      if (data?.items) {
        setItems(prev => append ? [...prev, ...data.items] : data.items);
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPage(1, search, false);
  }, [search, fetchPage]);

  useEffect(() => {
    if (page > 1) fetchPage(page, search, true);
  }, [page, search, fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(p => p + 1);
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 300);
  };

  const filtered = categoryFilter === 'All'
    ? items
    : items.filter(p => getCategoryName(p.category) === categoryFilter);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyProduct, productCode: '', category: categories[0] || 'Other' });
    setSelectedParentCatId('');
    setSelectedSubCatId('');
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    let resolvedParentId = '';
    let resolvedSubId = '';
    if (p.categoryId) {
      const cat = dbCategories.find(c => String(c.id) === String(p.categoryId));
      if (cat) {
        if (cat.parentId) { resolvedParentId = String(cat.parentId); resolvedSubId = String(cat.id); }
        else { resolvedParentId = String(cat.id); resolvedSubId = ''; }
      }
    } else if (p.categoryRef) {
      const cat = dbCategories.find(c => String(c.id) === String(p.categoryRef?.id));
      if (cat) {
        if (cat.parentId) { resolvedParentId = String(cat.parentId); resolvedSubId = String(cat.id); }
        else { resolvedParentId = String(cat.id); resolvedSubId = ''; }
      }
    }
    setSelectedParentCatId(resolvedParentId);
    setSelectedSubCatId(resolvedSubId);
    setForm({
      ...p,
      rate: isNaN(Number(p.rate)) ? 0 : Number(p.rate),
      gst: isNaN(Number(p.gst)) ? 18 : Number(p.gst),
      openingStock: isNaN(Number(p.openingStock)) ? 0 : Number(p.openingStock),
      minimumStock: isNaN(Number(p.minimumStock)) ? 0 : Number(p.minimumStock),
      category: getCategoryName(p.category),
      brandId: p.brandId ? Number(p.brandId) : undefined,
      unitId: p.unitId ? Number(p.unitId) : undefined,
      defaultWarehouseId: p.defaultWarehouseId ? Number(p.defaultWarehouseId) : null,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.productName || !form.bagSize || !form.rate || !selectedParentCatId) {
      toast({ title: 'Missing Fields', variant: 'destructive', description: 'Product Name, Bag Size, Price, and Category are required.' });
      return;
    }
    const finalCategoryId = selectedSubCatId || selectedParentCatId;
    const { brand, unit, categoryRef, ...cleanForm } = form as any;
    const payload = {
      ...cleanForm,
      productName: form.productName || form.name || '',
      name: form.productName || form.name || '',
      rate: Number(form.rate) || 0,
      gst: Number(form.gst) || 18,
      openingStock: Number(form.openingStock) || 0,
      minimumStock: Number(form.minimumStock) || 0,
      categoryId: finalCategoryId ? Number(finalCategoryId) : null,
      brandId: form.brandId ? Number(form.brandId) : null,
      unitId: form.unitId ? Number(form.unitId) : null,
      defaultWarehouseId: form.defaultWarehouseId ? Number(form.defaultWarehouseId) : null,
    };
    if (editing) {
      updateProduct(editing.productCode, payload);
      toast({ title: 'Product Updated', description: form.productName });
      setItems(prev => prev.map(p => p.productCode === editing.productCode ? { ...p, ...payload } : p));
    } else {
      addProduct(payload);
      toast({ title: 'Product Added', description: form.productName });
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    deleteProduct(deleteTarget);
    toast({ title: 'Deleted' });
    setItems(prev => prev.filter(p => p.productCode !== deleteTarget));
    setDeleteDialogOpen(false);
  };

  const uf = (field: keyof Product, value: any) => setForm(prev => {
    const updated = { ...prev, [field]: value };
    if (field === 'productName') updated.name = value;
    return updated;
  });

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.includes(name)) { toast({ title: 'Category already exists', variant: 'destructive' }); return; }
    const updated = [...categories, name];
    setCategories(updated); saveCategories(updated);
    setNewCatName('');
    toast({ title: 'Category Added', description: name });
  };

  const handleDeleteCategory = (cat: string) => {
    if (DEFAULT_CATEGORIES.includes(cat)) { toast({ title: 'Cannot delete default category', variant: 'destructive' }); return; }
    const updated = categories.filter(c => c !== cat);
    setCategories(updated); saveCategories(updated);
    toast({ title: 'Category Removed' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Product Management</h1>
          <p className="page-subheader">{total} products · {categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setCatDialogOpen(true)}>
              <Tag className="w-4 h-4 mr-2" /> Manage Categories
            </Button>
          )}
          {isAdmin && <Button className="action-button" onClick={openAdd}><Plus className="w-5 h-5 mr-2" /> Add Product</Button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter('All')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === 'All' ? 'bg-primary text-white border-primary' : 'bg-secondary border-border hover:bg-muted'}`}>
          All ({total})
        </button>
        {categories.map(cat => {
          const count = items.filter(p => getCategoryName(p.category) === cat).length;
          if (count === 0) return null;
          return (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === cat ? 'bg-primary text-white border-primary' : 'bg-secondary border-border hover:bg-muted'}`}>
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search products..." className="pl-10 h-12" value={searchInput} onChange={e => handleSearchChange(e.target.value)} />
      </div>

      <div className="lg:hidden space-y-3">
        {filtered.map(p => (
          <Card key={p.productCode}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{p.productName}</p>
                  <p className="text-xs text-muted-foreground">{p.productCode} · {p.bagSize} · Opening: {p.openingStock ?? 0}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCatColor(getCategoryName(p.category))}`}>{getCategoryName(p.category)}</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-bold text-primary">₹{p.rate}</span>
                <span className="text-xs text-muted-foreground">GST: {p.gst}%</span>
              </div>
              {isAdmin && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="flex-1"><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(p.productCode); setDeleteDialogOpen(true); }} className="flex-1"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Code', 'Product Name', 'Category', 'Bag Size', 'Opening Stock', 'Rate (₹)', 'GST %', ...(isAdmin ? ['Actions'] : [])].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.productCode} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{p.productCode}</td>
                  <td className="px-4 py-3 font-medium">{p.productName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCatColor(getCategoryName(p.category))}`}>{getCategoryName(p.category)}</span>
                  </td>
                  <td className="px-4 py-3">{p.bagSize}</td>
                  <td className="px-4 py-3">{p.openingStock ?? 0}</td>
                  <td className="px-4 py-3">₹{p.rate}</td>
                  <td className="px-4 py-3">{p.gst}%</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setDeleteTarget(p.productCode); setDeleteDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && !loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No products found</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div ref={sentinelRef} className="h-4" />
      {loading && <p className="text-center text-sm text-muted-foreground py-2">Loading products...</p>}
      {!hasMore && items.length > 0 && <p className="text-center text-xs text-muted-foreground">All {total} products loaded</p>}

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="cat-dialog-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="w-4 h-4" /> Manage Categories</DialogTitle>
            <DialogDescription id="cat-dialog-desc" className="sr-only">
              Add or remove product categories from the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="New category name..." value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
              <Button onClick={handleAddCategory}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCatColor(cat)}`}>{cat}</span>
                  <div className="flex items-center gap-2">
                    {DEFAULT_CATEGORIES.includes(cat)
                      ? <span className="text-[10px] text-muted-foreground">Default</span>
                      : <button onClick={() => handleDeleteCategory(cat)} className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setCatDialogOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl" aria-describedby="product-form-desc">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Product</DialogTitle>
            <DialogDescription id="product-form-desc" className="sr-only">
              Enter product details including code, name, category, and pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-sku">Code (SKU)</Label>
                <Input id="product-sku" name="productCode" value={form.productCode} onChange={e => uf('productCode', e.target.value)} disabled={!!editing} placeholder="Auto-generated if empty" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-name">Name *</Label>
                <Input id="product-name" name="productName" value={form.productName} onChange={e => uf('productName', e.target.value)} placeholder="Product Name" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-category">Category *</Label>
                <Select value={selectedParentCatId} onValueChange={v => { setSelectedParentCatId(v); setSelectedSubCatId(''); }}>
                  <SelectTrigger id="product-category" name="category"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    {dbCategories.filter(c => !c.parentId).map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-subcategory">Subcategory</Label>
                <Select value={selectedSubCatId || 'none_selected'} onValueChange={v => setSelectedSubCatId(v === 'none_selected' ? '' : v)} disabled={!selectedParentCatId}>
                  <SelectTrigger id="product-subcategory" name="subcategory"><SelectValue placeholder={selectedParentCatId ? "Select Subcategory" : "Choose Category first"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none_selected">-- None --</SelectItem>
                    {dbCategories.filter(c => String(c.parentId) === String(selectedParentCatId)).map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-brand">Brand</Label>
                <Select value={form.brandId ? String(form.brandId) : 'none_selected'} onValueChange={v => uf('brandId', v === 'none_selected' ? null : Number(v))}>
                  <SelectTrigger id="product-brand" name="brandId"><SelectValue placeholder="Select Brand" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none_selected">-- None --</SelectItem>
                    {brands.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-unit">Unit</Label>
                <Select value={form.unitId ? String(form.unitId) : 'none_selected'} onValueChange={v => uf('unitId', v === 'none_selected' ? null : Number(v))}>
                  <SelectTrigger id="product-unit" name="unitId"><SelectValue placeholder="Select Unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none_selected">-- None --</SelectItem>
                    {units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="product-bag-size">Bag Size *</Label>
                <Input id="product-bag-size" name="bagSize" value={form.bagSize} onChange={e => uf('bagSize', e.target.value)} placeholder="50 KG" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-rate">Rate (Price ₹) *</Label>
                <Input id="product-rate" name="rate" type="number" value={(form.rate ?? '').toString()} onChange={e => uf('rate', Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-gst">GST %</Label>
                <Input id="product-gst" name="gst" type="number" value={(form.gst ?? 18).toString()} onChange={e => uf('gst', Number(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="product-opening-stock">Opening Stock</Label>
                <Input id="product-opening-stock" name="openingStock" type="number" value={(form.openingStock ?? 0).toString()} onChange={e => uf('openingStock', Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-minimum-stock">Minimum Stock</Label>
                <Input id="product-minimum-stock" name="minimumStock" type="number" value={(form.minimumStock ?? 0).toString()} onChange={e => uf('minimumStock', Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-warehouse">Default Warehouse</Label>
                <Select value={form.defaultWarehouseId ? String(form.defaultWarehouseId) : 'none_selected'} onValueChange={v => uf('defaultWarehouseId', v === 'none_selected' ? null : Number(v))}>
                  <SelectTrigger id="product-warehouse" name="defaultWarehouseId"><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none_selected">-- None --</SelectItem>
                    {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby="delete-prod-desc">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
            <DialogDescription id="delete-prod-desc" className="sr-only">
              Confirm permanent deletion of this product.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
