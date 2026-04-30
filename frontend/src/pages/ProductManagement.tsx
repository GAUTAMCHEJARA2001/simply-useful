import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Product } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Tag, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

// ── Category storage (localStorage, per-session) ──────────────────
const STORAGE_KEY = 'erp_product_categories';
const DEFAULT_CATEGORIES = ['Tile Adhesive', 'Water Proofing', 'Grout', 'Wall Putty', 'Epoxy', 'Primer', 'Sealant', 'Other'];

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

const emptyProduct: Product = { productCode: '', productName: '', category: '', bagSize: '', rate: 0, gst: 18, openingStock: 0 };

const ProductManagement: React.FC = () => {
  const { user } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const { can } = usePermissions();
  const { toast } = useToast();

  const [categories, setCategories] = useState<string[]>(getCategories);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Product>(emptyProduct);
  const [deleteTarget, setDeleteTarget] = useState('');

  const isAdmin = can('manage_products');

  const filtered = products.filter(p => {
    const matchSearch = p.productName.toLowerCase().includes(search.toLowerCase()) || p.productCode.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyProduct, productCode: `PRD${String(Date.now()).slice(-4)}`, category: categories[0] || 'Other' });
    setDialogOpen(true);
  };
  const openEdit = (p: Product) => { setEditing(p); setForm({ ...p }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.productName || !form.bagSize || !form.rate || !form.category) {
      toast({ title: 'Missing Fields', variant: 'destructive' }); return;
    }
    if (editing) { updateProduct(editing.productCode, form); toast({ title: 'Product Updated', description: form.productName }); }
    else { addProduct(form); toast({ title: 'Product Added', description: form.productName }); }
    setDialogOpen(false);
  };

  const handleDelete = () => { deleteProduct(deleteTarget); toast({ title: 'Deleted' }); setDeleteDialogOpen(false); };
  const uf = (field: keyof Product, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Category management
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
          <p className="page-subheader">{products.length} products · {categories.length} categories</p>
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

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter('All')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === 'All' ? 'bg-primary text-white border-primary' : 'bg-secondary border-border hover:bg-muted'}`}>
          All ({products.length})
        </button>
        {categories.map(cat => {
          const count = products.filter(p => p.category === cat).length;
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
        <Input placeholder="Search products..." className="pl-10 h-12" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {filtered.map(p => (
          <Card key={p.productCode}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{p.productName}</p>
                  <p className="text-xs text-muted-foreground">{p.productCode} · {p.bagSize}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCatColor(p.category)}`}>{p.category || 'Other'}</span>
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

      {/* Desktop Table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Code', 'Product Name', 'Category', 'Bag Size', 'Rate (₹)', 'GST %', ...(isAdmin ? ['Actions'] : [])].map(h => (
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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCatColor(p.category)}`}>{p.category || 'Other'}</span>
                  </td>
                  <td className="px-4 py-3">{p.bagSize}</td>
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
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No products found</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Manage Categories Dialog ────────────────────────── */}
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

      {/* ── Add/Edit Product Dialog ─────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby="product-form-desc">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Product</DialogTitle>
            <DialogDescription id="product-form-desc" className="sr-only">
              Enter product details including code, name, category, and pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Code</Label><Input value={form.productCode} onChange={e => uf('productCode', e.target.value)} disabled={!!editing} /></div>
              <div className="space-y-2"><Label>Name *</Label><Input value={form.productName} onChange={e => uf('productName', e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => uf('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1"><Label>Bag Size *</Label><Input value={form.bagSize} onChange={e => uf('bagSize', e.target.value)} placeholder="20 KG" /></div>
              <div className="space-y-2 col-span-1"><Label>Rate (₹) *</Label><Input type="number" value={form.rate || ''} onChange={e => uf('rate', Number(e.target.value))} /></div>
              <div className="space-y-2 col-span-1"><Label>GST %</Label><Input type="number" value={form.gst} onChange={e => uf('gst', Number(e.target.value))} /></div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ───────────────────────────── */}
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
