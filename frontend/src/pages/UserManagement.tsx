import React, { useState } from 'react';
import { useData, AppUserRecord } from '@/contexts/DataContext';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Shield, Lock, Key, Users, Settings2, Tag, Layers, Package, Warehouse } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import apiService from '@/api/apiService';

const roles: UserRole[] = ['SALES', 'ADMIN', 'HR', 'INVENTORY', 'SUPERADMIN'];

interface UserForm {
  email: string;
  password: string;
  name: string;
  role: string;
  active: boolean;
  inventoryAccess: boolean;
  warehouses: any[];
  territory?: string;
}

const emptyForm: UserForm = { 
  email: '', 
  password: '', 
  name: '', 
  role: 'SALES', 
  active: true,
  inventoryAccess: false,
  warehouses: [],
  territory: ''
};

const UserManagement: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, updateUserPassword, permissions, updatePermission } = useData();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppUserRecord | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Assignments States
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<AppUserRecord | null>(null);
  const [allBrands, setAllBrands] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allWarehouses, setAllWarehouses] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [userAssignments, setUserAssignments] = useState<{ brands: any[], categories: any[], warehouses: any[], products: any[] }>({ brands: [], categories: [], warehouses: [], products: [] });
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Filter and Search States
  const [selectedParentCat, setSelectedParentCat] = useState<number | null>(null);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<any>(null);
  const [selectedSubCatFilter, setSelectedSubCatFilter] = useState<any>(null);
  const [searchProd, setSearchProd] = useState('');
  const [searchBrand, setSearchBrand] = useState('');
  const [searchCat, setSearchCat] = useState('');

  const openAssignments = async (u: AppUserRecord) => {
    setAssignUser(u);
    setAssignmentsOpen(true);
    setLoadingAssignments(true);
    setSelectedParentCat(null);
    setSelectedBrandFilter(null);
    setSelectedSubCatFilter(null);
    setSearchProd('');
    setSearchBrand('');
    setSearchCat('');
    setUserAssignments({ brands: [], categories: [], warehouses: [], products: [] });
    try {
      if (allBrands.length === 0) {
        const [b, c, w, p] = await Promise.all([
          apiService.inventory.getBrands().then(({ data }) => data.success ? data.data || [] : []),
          apiService.inventory.getCategories().then(({ data }) => data.success ? data.data || [] : []),
          apiService.inventory.getWarehouses().then(({ data }) => data.success ? data.data || [] : []),
          apiService.inventory.getProductsMaster().then(({ data }) => data.success ? data.data || [] : [])
        ]);
        setAllBrands(b);
        setAllCategories(c);
        setAllWarehouses(w);
        setAllProducts(p);
      }
      const res = await apiService.users.getAssignments(u.id);
      setUserAssignments(res.data.success ? res.data.data : { brands: [], categories: [], warehouses: [], products: [] });
    } catch (e) { /* ignore */ }
    finally { setLoadingAssignments(false); }
  };

  const saveAssignments = async () => {
    if (!assignUser) return;
    try {
      await apiService.users.saveAssignments(assignUser.id, {
        brands: userAssignments.brands || [],
        categories: userAssignments.categories || [],
        warehouses: userAssignments.warehouses || [],
        products: userAssignments.products || []
      });
      toast({ title: 'Assignments saved' });
      setAssignmentsOpen(false);
    } catch (e: any) { 
      toast({ title: 'Error', description: e.message, variant: 'destructive' }); 
    }
  };

  // Select All Handlers
  const handleSelectAllBrands = (filteredBrandsList: any[]) => {
    const filteredIds = filteredBrandsList.map(b => b.id);
    const areAllSelected = filteredIds.every(id => userAssignments.brands?.includes(id));
    
    setUserAssignments(f => {
      const existing = f.brands || [];
      const updated = areAllSelected
        ? existing.filter(id => !filteredIds.includes(id))
        : [...existing, ...filteredIds.filter(id => !existing.includes(id))];
      return { ...f, brands: updated };
    });
  };

  const handleSelectAllCategories = (filteredMainCats: any[]) => {
    const mainCatIds = filteredMainCats.map(c => c.id);
    const areAllMainSelected = mainCatIds.every(id => userAssignments.categories?.includes(id));

    setUserAssignments(f => {
      let newCats = [...(f.categories || [])];
      if (areAllMainSelected) {
        // Deselect filtered main categories and all their subcategories
        newCats = newCats.filter(id => !mainCatIds.includes(id));
        mainCatIds.forEach(parentId => {
          const subCatIds = allCategories.filter(c => (c.parentId ?? c.parent_id) === parentId).map(c => c.id);
          newCats = newCats.filter(id => !subCatIds.includes(id));
        });
      } else {
        // Select all filtered main categories and their subcategories
        filteredMainCats.forEach(mainCat => {
          if (!newCats.includes(mainCat.id)) newCats.push(mainCat.id);
          const subCatIds = allCategories.filter(c => (c.parentId ?? c.parent_id) === mainCat.id).map(c => c.id);
          subCatIds.forEach(subId => {
            if (!newCats.includes(subId)) newCats.push(subId);
          });
        });
      }
      return { ...f, categories: newCats };
    });
  };

  const handleSelectAllSubcategories = (filteredMainCats: any[]) => {
    const allSubsOfFiltered = allCategories.filter(c => {
      const parentId = c.parentId ?? c.parent_id;
      return parentId && filteredMainCats.some(mc => mc.id === parentId);
    });
    const subCatIds = allSubsOfFiltered.map(c => c.id);
    const areAllSubSelected = subCatIds.every(id => userAssignments.categories?.includes(id));

    setUserAssignments(f => {
      let newCats = [...(f.categories || [])];
      if (areAllSubSelected) {
        newCats = newCats.filter(id => !subCatIds.includes(id));
      } else {
        subCatIds.forEach(id => {
          if (!newCats.includes(id)) newCats.push(id);
        });
      }
      return { ...f, categories: newCats };
    });
  };

  const handleSelectAllProducts = (filteredProds: any[]) => {
    const filteredIds = filteredProds.map(p => p.id);
    const areAllSelected = filteredIds.every(id => userAssignments.products?.includes(id));

    setUserAssignments(f => {
      const existing = f.products || [];
      const updated = areAllSelected
        ? existing.filter(id => !filteredIds.includes(id))
        : [...existing, ...filteredIds.filter(id => !existing.includes(id))];
      return { ...f, products: updated };
    });
  };

  const handleCategoryToggle = (catId: any, isParent: boolean) => {
    setUserAssignments(f => {
      const isChecked = f.categories?.includes(catId);
      let newCats = [...(f.categories || [])];

      if (isChecked) {
        newCats = newCats.filter(id => id !== catId);
        if (isParent) {
          const subCatIds = allCategories.filter(c => (c.parentId ?? c.parent_id) === catId).map(c => c.id);
          newCats = newCats.filter(id => !subCatIds.includes(id));
        } else {
          // If a subcategory is unchecked, the parent category cannot be fully selected
          const subCatObj = categoriesById.get(catId);
          const parentId = subCatObj ? (subCatObj.parentId ?? subCatObj.parent_id) : null;
          if (parentId) {
            newCats = newCats.filter(id => id !== parentId);
          }
        }
      } else {
        newCats.push(catId);
        if (isParent) {
          const subCatIds = allCategories.filter(c => (c.parentId ?? c.parent_id) === catId).map(c => c.id);
          subCatIds.forEach(subId => {
            if (!newCats.includes(subId)) newCats.push(subId);
          });
        } else {
          const subCatObj = categoriesById.get(catId);
          const parentId = subCatObj ? (subCatObj.parentId ?? subCatObj.parent_id) : null;
          if (parentId) {
            const siblings = allCategories.filter(c => (c.parentId ?? c.parent_id) === parentId).map(c => c.id);
            const allSiblingsChecked = siblings.every(subId => subId === catId || newCats.includes(subId));
            if (allSiblingsChecked && !newCats.includes(parentId)) {
              newCats.push(parentId);
            }
          }
        }
      }
      return { ...f, categories: newCats };
    });
  };

  const categoriesById = React.useMemo(() => {
    const map = new Map();
    for (const c of allCategories) map.set(c.id, c);
    return map;
  }, [allCategories]);

  const brandsById = React.useMemo(() => {
    const map = new Map();
    for (const b of allBrands) map.set(b.id, b);
    return map;
  }, [allBrands]);

  const productsById = React.useMemo(() => {
    const map = new Map();
    for (const p of allProducts) map.set(p.id, p);
    return map;
  }, [allProducts]);

  const permissionsByRoleFeature = React.useMemo(() => {
    const map = new Map();
    for (const p of permissions) map.set(`${p.role}_${p.feature}`, p);
    return map;
  }, [permissions]);

  const getFilteredProducts = () => {
    let list = allProducts;
    if (selectedBrandFilter) {
      list = list.filter(p => (p.brandId ?? p.brand_id) === selectedBrandFilter);
    }
    if (selectedParentCat) {
      const subCatIds = allCategories.filter(c => (c.parentId ?? c.parent_id) === selectedParentCat).map(c => c.id);
      if (selectedSubCatFilter) {
        list = list.filter(p => (p.categoryId ?? p.category_id) === selectedSubCatFilter);
      } else {
        const allowedCatIds = [selectedParentCat, ...subCatIds];
        list = list.filter(p => allowedCatIds.includes(p.categoryId ?? p.category_id));
      }
    }
    return list;
  };

  const getRelatedMainCategories = () => {
    const mainCats = allCategories.filter(c => !(c.parentId ?? c.parent_id));
    if (!selectedBrandFilter) return mainCats;
    const brandProductCatIds = allProducts
      .filter(p => (p.brandId ?? p.brand_id) === selectedBrandFilter)
      .map(p => p.categoryId ?? p.category_id);
    const parentIdsOfBrandProducts = allCategories
      .filter(c => brandProductCatIds.includes(c.id))
      .map(c => c.parentId ?? c.parent_id)
      .filter(Boolean);
    return mainCats.filter(c => brandProductCatIds.includes(c.id) || parentIdsOfBrandProducts.includes(c.id));
  };

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.territory || '').toLowerCase().includes(search.toLowerCase())
  );

  const fetchWarehousesOnce = async () => {
    if (allWarehouses.length === 0) {
      try {
        const w = await apiService.inventory.getWarehouses().then(({ data }) => data.success ? data.data || [] : []);
        setAllWarehouses(w);
      } catch (e) {}
    }
  };

  const openAdd = async () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
    await fetchWarehousesOnce();
  };

  const openEdit = async (u: AppUserRecord) => {
    setEditing(u);
    setForm({ 
      email: u.email || '', 
      password: '', 
      name: u.name || '', 
      role: u.role || 'SALES', 
      active: u.active ?? true,
      inventoryAccess: false,
      warehouses: [],
      territory: u.territory || ''
    });
    setDialogOpen(true);
    await fetchWarehousesOnce();
    try {
      const res = await apiService.users.getAssignments(u.id);
      if (res.data.success) {
        const whs = res.data.data.warehouses || [];
        setForm(f => ({
          ...f,
          inventoryAccess: whs.length > 0 || u.role.startsWith('INVENTORY') || u.role === 'SUPERADMIN' || u.role === 'ADMIN',
          warehouses: whs
        }));
      }
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!form.name || (!editing && (!form.email || !form.password))) {
      toast({ title: 'Missing Fields', variant: 'destructive' }); return;
    }
    try {
      let savedUser: any = null;
      if (editing) {
        savedUser = await updateUser(editing.id, { name: form.name, role: form.role, active: form.active, territory: form.territory });
        toast({ title: 'Updated', description: `${form.name} updated.` });
      } else {
        savedUser = await addUser(form);
        toast({ title: 'User Created', description: `${form.name} has been created and can now log in.` });
      }

      const userId = editing ? editing.id : savedUser?.id;
      if (userId) {
        let existingProducts: any[] = [];
        let existingBrands: any[] = [];
        let existingCategories: any[] = [];
        try {
          const res = await apiService.users.getAssignments(userId);
          if (res.data.success) {
            existingProducts = res.data.data.products || [];
            existingBrands = res.data.data.brands || [];
            existingCategories = res.data.data.categories || [];
          }
        } catch (e) {}

        await apiService.users.saveAssignments(userId, {
          brands: existingBrands,
          categories: existingCategories,
          warehouses: form.inventoryAccess ? (form.warehouses || []) : [],
          products: existingProducts
        });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    await deleteUser(deleteTarget);
    toast({ title: 'Removed' });
    setDeleteDialogOpen(false);
  };

  const handleUpdatePassword = async () => {
    if (!editing || !newPassword || newPassword.length < 6) {
      toast({ title: 'Invalid Password', description: 'Minimum 6 characters required', variant: 'destructive' });
      return;
    }
    setUpdatingPassword(true);
    try {
      await updateUserPassword(editing.id, newPassword);
      toast({ title: 'Password Updated', description: `Password for ${editing.name} has been reset.` });
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const uf = (field: keyof UserForm, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">User Management</h1>
          <p className="page-subheader">{users.length} users</p>
        </div>
        <Button className="action-button" onClick={openAdd}><Plus className="w-5 h-5 mr-2" /> Add User</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search users by name or email..." className="pl-10 h-12" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> Passwords
          </TabsTrigger>
          {currentUser?.role === 'SUPERADMIN' && (
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <div className="lg:hidden space-y-3">
            {filtered.map(u => (
              <Card key={u.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground">{u.email} {u.territory ? `· Territory: ${u.territory}` : ''}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                      <Badge variant={u.active ? 'default' : 'destructive'} className="text-[10px]">{u.active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button size="sm" variant="outline" onClick={() => openAssignments(u)} className="flex-1">
                      <Shield className="w-3.5 h-3.5 mr-1" /> Assignments
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)} className="flex-1">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(u.id); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Name', 'Email', 'Role', 'Territory', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{u.role}</Badge></td>
                      <td className="px-4 py-3 font-medium text-xs text-primary">{u.territory || '—'}</td>
                      <td className="px-4 py-3"><Badge variant={u.active ? 'default' : 'destructive'} className="text-[10px]">{u.active ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openAssignments(u)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setDeleteTarget(u.id); setDeleteDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          {/* ... existing security content ... */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['User', 'Role', 'Password Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{u.role}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px] flex w-fit items-center gap-1">
                          <Shield className="w-3 h-3" /> Encrypted
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-semibold"
                          onClick={() => { setEditing(u); setPasswordDialogOpen(true); }}
                        >
                          <Key className="w-3 h-3 mr-1.5" /> Reset Password
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {currentUser?.role === 'SUPERADMIN' && (
          <TabsContent value="permissions">
            <Card>
              <CardContent className="p-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">Feature</th>
                      {roles.map(r => (
                        <th key={r} className="text-center px-4 py-3 text-muted-foreground font-medium">{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(permissions.map(p => p.feature))).sort().map(feature => (
                      <tr key={feature} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium capitalize text-xs">
                            {feature.replace(/_/g, ' ')}
                          </p>
                        </td>
                        {roles.map(role => {
                          const perm = permissionsByRoleFeature.get(`${role}_${feature}`);
                          if (!perm) return <td key={role} className="px-4 py-3 text-center">-</td>;
                          return (
                            <td key={role} className="px-4 py-3">
                              <div className="flex justify-center">
                                <Switch
                                  checked={perm.isEnabled}
                                  onCheckedChange={async (checked) => {
                                    try {
                                      const res = await apiService.settings.updatePermission(perm.id, checked);
                                      if (res.data.success) {
                                        updatePermission(perm.id, checked);
                                        toast({
                                          title: `Permission Updated`,
                                          description: `${feature} is now ${checked ? 'enabled' : 'disabled'} for ${role}.`,
                                          variant: checked ? 'default' : 'destructive'
                                        });
                                      }
                                    } catch (err) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to update permission",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Centralized Access Control
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                As a SuperAdmin, your changes here are reflected immediately across the entire system.
                Disabling a feature for a role restricts access to both the UI navigation and the underlying functional components
                for all sub-users assigned to that role.
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby="user-form-desc">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} User</DialogTitle>
            <DialogDescription id="user-form-desc" className="sr-only">
              {editing ? 'Update existing user profile and roles.' : 'Create a new user account with specified role and status.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name || ''} onChange={e => uf('name', e.target.value)} required /></div>
            {!editing && (
              <>
                <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email || ''} onChange={e => uf('email', e.target.value)} required /></div>
                <div className="space-y-2"><Label>Password *</Label><Input type="password" value={form.password || ''} onChange={e => uf('password', e.target.value)} minLength={6} required /></div>
              </>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Role</Label>
                <Select value={form.role} onValueChange={v => uf('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.active ? 'active' : 'inactive'} onValueChange={v => uf('active', v === 'active')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Territory (Area Code)</Label>
                <Input value={form.territory || ''} onChange={e => uf('territory', e.target.value)} placeholder="e.g. T-WEST" />
              </div>
            </div>

            <div className="flex items-center gap-2 py-2 border-t border-border mt-2">
              <Switch 
                id="inventoryAccess" 
                checked={form.inventoryAccess} 
                onCheckedChange={checked => uf('inventoryAccess', checked)} 
              />
              <Label htmlFor="inventoryAccess" className="text-xs font-bold text-primary cursor-pointer">Inventory Access (Module Authorization)</Label>
            </div>

            {form.inventoryAccess && (
              <div className="space-y-1.5 border-t pt-3 border-border animate-in fade-in duration-200">
                <div className="flex flex-col">
                  <Label className="text-xs font-bold text-primary">Assign Warehouse(s)</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Select the warehouses this user should have access to. Unchecked warehouses are hidden from their view.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border border-border rounded-xl bg-card max-h-32 overflow-y-auto shadow-inner">
                  {allWarehouses.map(w => (
                    <label key={w.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded-sm border-primary/30"
                        checked={form.warehouses?.includes(w.id)} 
                        onChange={e => {
                          const ch = e.target.checked;
                          const currentWh = form.warehouses || [];
                          uf('warehouses', ch ? [...currentWh, w.id] : currentWh.filter((id: any) => id !== w.id));
                        }} 
                      /> <span className="hover:text-primary transition-colors">{w.name}</span>
                    </label>
                  ))}
                  {allWarehouses.length === 0 && (
                    <div className="text-[10px] text-muted-foreground col-span-2 py-2 text-center">No warehouses available.</div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} type="button">Cancel</Button>
              <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby="delete-user-desc">
          <DialogHeader>
            <DialogTitle>Remove User?</DialogTitle>
            <DialogDescription id="delete-user-desc" className="sr-only">
              Confirm deletion of the selected user account.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove them from the list.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby="reset-password-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Key className="w-5 h-5" /> Reset Password
            </DialogTitle>
            <DialogDescription id="reset-password-desc" className="sr-only">
              Set a new secure password for this user account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/40 p-3 rounded-lg border border-border">
              <p className="text-xs font-semibold mb-1">Target Account:</p>
              <p className="text-sm font-bold">{editing?.name}</p>
              <p className="text-[10px] text-muted-foreground">{editing?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter secure password"
                minLength={6}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3" /> Minimum 6 characters required
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleUpdatePassword}
              disabled={updatingPassword}
            >
              {updatingPassword ? 'Updating...' : 'Set New Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentsOpen} onOpenChange={setAssignmentsOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" aria-describedby="assignments-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Manage Assignments
            </DialogTitle>
            <DialogDescription id="assignments-desc" className="sr-only">
              Assign specific brands, categories, products, or warehouses to the user.
            </DialogDescription>
          </DialogHeader>
          {loadingAssignments ? <div className="p-4 text-center text-muted-foreground text-sm">Loading user assignments...</div> : (
            <div className="space-y-4 py-2">
              <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
                <p className="text-xs font-semibold">User: <span className="font-bold text-sm">{assignUser?.name}</span> ({assignUser?.role})</p>
                <div className="flex gap-2">
                  {userAssignments.brands?.length > 0 && <Badge variant="secondary" className="text-[10px]">{userAssignments.brands.length} Brands</Badge>}
                  {userAssignments.categories?.length > 0 && <Badge variant="secondary" className="text-[10px]">{userAssignments.categories.length} Categories</Badge>}
                  {userAssignments.products?.length > 0 && <Badge variant="secondary" className="text-[10px]">{userAssignments.products.length} Products</Badge>}
                </div>
              </div>

              <Tabs defaultValue="brands-categories" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="brands-categories" className="text-xs gap-1">
                    <Layers className="w-3.5 h-3.5" /> Brands & Cats
                  </TabsTrigger>
                  <TabsTrigger value="products" className="text-xs gap-1">
                    <Package className="w-3.5 h-3.5" /> Products
                  </TabsTrigger>
                  <TabsTrigger value="warehouses" className="text-xs gap-1">
                    <Warehouse className="w-3.5 h-3.5" /> Warehouses
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="brands-categories" className="space-y-4 pt-2">
                  {/* Brands & Categories column layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Brands box */}
                    <div className="border border-border rounded-xl p-3 bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-primary flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" /> Brands ({allBrands.length})
                        </Label>
                        <button
                          type="button"
                          onClick={() => handleSelectAllBrands(allBrands.filter(b => b.name.toLowerCase().includes(searchBrand.toLowerCase())))}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Select All
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input 
                          placeholder="Search brands..." 
                          value={searchBrand}
                          onChange={e => setSearchBrand(e.target.value)}
                          className="pl-8 h-8 text-xs bg-muted/20"
                        />
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {allBrands.filter(b => b.name.toLowerCase().includes(searchBrand.toLowerCase())).map(b => (
                          <label key={b.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-all">
                            <input 
                              type="checkbox" 
                              checked={userAssignments.brands?.includes(b.id)} 
                              onChange={() => {
                                setUserAssignments(f => {
                                  const existing = f.brands || [];
                                  const updated = existing.includes(b.id)
                                    ? existing.filter(id => id !== b.id)
                                    : [...existing, b.id];
                                  return { ...f, brands: updated };
                                });
                              }}
                            />
                            <span>{b.name}</span>
                          </label>
                        ))}
                        {allBrands.filter(b => b.name.toLowerCase().includes(searchBrand.toLowerCase())).length === 0 && (
                          <div className="text-center py-4 text-xs text-muted-foreground">No brands found.</div>
                        )}
                      </div>
                    </div>

                    {/* Categories box */}
                    <div className="border border-border rounded-xl p-3 bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-primary flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" /> Categories
                        </Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectAllCategories(allCategories.filter(c => !(c.parentId ?? c.parent_id) && c.name.toLowerCase().includes(searchCat.toLowerCase())))}
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            All Cats
                          </button>
                          <span className="text-muted-foreground text-[10px]">|</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllSubcategories(allCategories.filter(c => !(c.parentId ?? c.parent_id) && c.name.toLowerCase().includes(searchCat.toLowerCase())))}
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            All Subs
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input 
                          placeholder="Search categories..." 
                          value={searchCat}
                          onChange={e => setSearchCat(e.target.value)}
                          className="pl-8 h-8 text-xs bg-muted/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {allCategories.filter(c => !(c.parentId ?? c.parent_id) && c.name.toLowerCase().includes(searchCat.toLowerCase())).map(mainCat => {
                          const subs = allCategories.filter(c => (c.parentId ?? c.parent_id) === mainCat.id);
                          return (
                            <div key={mainCat.id} className="space-y-1">
                              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer hover:bg-muted/50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={userAssignments.categories?.includes(mainCat.id)}
                                  onChange={() => handleCategoryToggle(mainCat.id, true)}
                                />
                                <span>{mainCat.name}</span>
                              </label>
                              {subs.length > 0 && (
                                <div className="pl-4 space-y-1 border-l ml-2 border-border/60">
                                  {subs.map(subCat => (
                                    <label key={subCat.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted/50 p-1 rounded">
                                      <input
                                        type="checkbox"
                                        checked={userAssignments.categories?.includes(subCat.id)}
                                        onChange={() => handleCategoryToggle(subCat.id, false)}
                                      />
                                      <span className="text-muted-foreground">{subCat.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {allCategories.filter(c => !(c.parentId ?? c.parent_id) && c.name.toLowerCase().includes(searchCat.toLowerCase())).length === 0 && (
                          <div className="text-center py-4 text-xs text-muted-foreground">No categories found.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="products" className="space-y-4 pt-2">
                  <div className="border border-border rounded-xl p-3 bg-card space-y-3">
                    {/* View Filters (dropdowns) for filtering the products checkbox list */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Filter Brand</Label>
                        <select 
                          value={selectedBrandFilter || ''} 
                          onChange={e => {
                            const val = e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : parseInt(e.target.value)) : null;
                            setSelectedBrandFilter(val);
                            setSelectedParentCat(null);
                            setSelectedSubCatFilter(null);
                          }}
                          className="w-full border border-border rounded px-2 py-1 bg-background text-[11px]"
                        >
                          <option value="">All Brands</option>
                          {allBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[10px] text-muted-foreground">Filter Category</Label>
                        <select 
                          value={selectedParentCat || ''} 
                          onChange={e => {
                            const val = e.target.value ? parseInt(e.target.value) : null;
                            setSelectedParentCat(val);
                            setSelectedSubCatFilter(null);
                          }}
                          className="w-full border border-border rounded px-2 py-1 bg-background text-[11px]"
                        >
                          <option value="">All Categories</option>
                          {getRelatedMainCategories().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[10px] text-muted-foreground">Filter Subcategory</Label>
                        <select 
                          value={selectedSubCatFilter || ''} 
                          onChange={e => setSelectedSubCatFilter(e.target.value ? parseInt(e.target.value) : null)}
                          disabled={!selectedParentCat}
                          className="w-full border border-border rounded px-2 py-1 bg-background text-[11px] disabled:opacity-50"
                        >
                          <option value="">All Subcategories</option>
                          {allCategories.filter(c => (c.parentId ?? c.parent_id) === selectedParentCat).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2 mt-2">
                      <Label className="text-xs font-bold text-primary flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> Products ({getFilteredProducts().filter(p => !searchProd || p.name.toLowerCase().includes(searchProd.toLowerCase())).length})
                      </Label>
                      <button
                        type="button"
                        onClick={() => handleSelectAllProducts(getFilteredProducts().filter(p => !searchProd || p.name.toLowerCase().includes(searchProd.toLowerCase())))}
                        className="text-[10px] text-primary hover:underline font-semibold"
                      >
                        Select All (Filtered)
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Search products..." 
                        className="pl-8 h-8 text-xs bg-muted/20"
                        value={searchProd}
                        onChange={e => setSearchProd(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-1 p-2 border border-border rounded-xl bg-card max-h-52 overflow-y-auto shadow-inner">
                      {getFilteredProducts().filter(p => !searchProd || p.name.toLowerCase().includes(searchProd.toLowerCase())).map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted/50 p-1.5 rounded border border-transparent hover:border-border/40 transition-all">
                          <input 
                            type="checkbox" 
                            checked={userAssignments.products?.includes(p.id)} 
                            onChange={e => {
                              const ch = e.target.checked;
                              setUserAssignments(f => ({ 
                                ...f, 
                                products: ch 
                                  ? [...(f.products || []), p.id] 
                                  : (f.products || []).filter((id: any) => id !== p.id) 
                              }));
                            }} 
                          /> 
                          <span className="flex-1">{p.name} <span className="text-[10px] text-muted-foreground ml-1">({p.sku || p.productCode || 'N/A'})</span></span>
                          {brandsById.has(p.brandId ?? p.brand_id) && (
                            <Badge variant="secondary" className="text-[9px] px-1 h-4">
                              {brandsById.get(p.brandId ?? p.brand_id)?.name}
                            </Badge>
                          )}
                        </label>
                      ))}
                      {getFilteredProducts().filter(p => !searchProd || p.name.toLowerCase().includes(searchProd.toLowerCase())).length === 0 && (
                        <div className="text-center py-4 text-xs text-muted-foreground">No products match filters.</div>
                      )}
                    </div>

                    {userAssignments.products && userAssignments.products.length > 0 && (
                      <div className="space-y-1.5 border-t pt-2 animate-in fade-in duration-200">
                        <Label className="text-[10px] font-bold text-muted-foreground">Currently Assigned Products ({userAssignments.products.length})</Label>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 border border-border rounded-lg bg-muted/30 shadow-inner">
                          {userAssignments.products.map(pId => {
                            const pObj = productsById.get(pId);
                            if (!pObj) return null;
                            return (
                              <Badge key={pId} variant="outline" className="text-[10px] gap-1 py-0.5 pl-2 pr-1.5 bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
                                {pObj.name}
                                <button 
                                  type="button"
                                  onClick={() => setUserAssignments(f => ({ ...f, products: (f.products || []).filter((id: any) => id !== pId) }))}
                                  className="hover:bg-destructive/20 p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors font-bold text-[9px] w-3 h-3 flex items-center justify-center"
                                  title="Remove assignment"
                                >
                                  &times;
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="warehouses" className="space-y-4 pt-2">
                  <div className="border border-border rounded-xl p-3 bg-card space-y-3">
                    <Label className="text-xs font-bold text-primary flex items-center gap-1">
                      <Warehouse className="w-3.5 h-3.5" /> Assigned Warehouses
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 max-h-52 overflow-y-auto">
                      {allWarehouses.map(w => (
                        <label key={w.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer p-1 hover:bg-muted/50 rounded transition-all">
                          <input 
                            type="checkbox" 
                            checked={userAssignments.warehouses?.includes(w.id)} 
                            onChange={e => {
                              const ch = e.target.checked;
                              setUserAssignments(f => ({ 
                                ...f, 
                                warehouses: ch ? [...(f.warehouses || []), w.id] : (f.warehouses || []).filter((id: any) => id !== w.id) 
                              }));
                            }} 
                          /> 
                          <span>{w.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignmentsOpen(false)}>Cancel</Button>
            <Button onClick={saveAssignments}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
