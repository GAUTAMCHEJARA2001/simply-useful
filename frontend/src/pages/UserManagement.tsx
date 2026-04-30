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
import { Search, Plus, Edit, Trash2, Shield, Lock, Key, Users, Settings2 } from 'lucide-react';
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
}

const emptyForm: UserForm = { email: '', password: '', name: '', role: 'SALES', active: true };

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
  const [selectedParentCat, setSelectedParentCat] = useState<number | null>(null);
  const [searchProd, setSearchProd] = useState('');

  const openAssignments = async (u: AppUserRecord) => {
    setAssignUser(u);
    setAssignmentsOpen(true);
    setLoadingAssignments(true);
    setSelectedParentCat(null);
    setSearchProd('');
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
      await apiService.users.saveAssignments(assignUser.id, userAssignments);
      toast({ title: 'Assignments saved' });
      setAssignmentsOpen(false);
    } catch (e: any) { 
      toast({ title: 'Error', description: e.message, variant: 'destructive' }); 
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (u: AppUserRecord) => { setEditing(u); setForm({ email: u.email, password: '', name: u.name, role: u.role, active: u.active }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || (!editing && (!form.email || !form.password))) {
      toast({ title: 'Missing Fields', variant: 'destructive' }); return;
    }
    if (editing) {
      await updateUser(editing.id, { name: form.name, role: form.role, active: form.active });
      toast({ title: 'Updated', description: `${form.name} updated.` });
    } else {
      await addUser(form);
      toast({ title: 'User Created', description: `${form.name} has been created and can now log in.` });
    }
    setDialogOpen(false);
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
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
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
                    {['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
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
                          const perm = permissions.find(p => p.role === role && p.feature === feature);
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
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => uf('name', e.target.value)} required /></div>
            {!editing && (
              <>
                <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => uf('email', e.target.value)} required /></div>
                <div className="space-y-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={e => uf('password', e.target.value)} minLength={6} required /></div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-5 py-2">
              <div className="bg-muted p-3 rounded-lg"><p className="text-xs font-semibold">User: <span className="font-bold text-sm">{assignUser?.name}</span> ({assignUser?.role})</p></div>

              {((assignUser?.role && (assignUser.role.startsWith('SALES') || assignUser.role.includes('SO'))) || assignUser?.role === 'SUPERADMIN' || assignUser?.role === 'ADMIN') && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-primary">1. Assigned Brands</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-xl bg-card max-h-32 overflow-y-auto">
                      {allBrands.map(b => (
                        <label key={b.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer p-0.5">
                          <input type="checkbox" checked={userAssignments.brands?.includes(b.id)} onChange={e => {
                            const c = e.target.checked;
                            setUserAssignments(f => ({ ...f, brands: c ? [...(f.brands || []), b.id] : (f.brands || []).filter((id: any) => id !== b.id) }));
                          }} /> {b.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t pt-3 border-border">
                    <Label className="text-xs font-bold text-primary">2. Select Parent Category</Label>
                    <select value={selectedParentCat || ''} onChange={e => setSelectedParentCat(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs">
                      <option value="">-- Choose Category --</option>
                      {allCategories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {selectedParentCat && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">3. Assign Sub-categories <Badge variant="outline">{allCategories.find(c => c.id === selectedParentCat)?.name}</Badge></Label>
                      <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-xl bg-card max-h-32 overflow-y-auto shadow-inner">
                        {allCategories.filter(c => c.parent_id === selectedParentCat).map(sub => (
                          <label key={sub.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors group">
                            <input type="checkbox" className="rounded-sm border-primary/30" checked={userAssignments.categories?.includes(sub.id)} onChange={e => {
                              const ch = e.target.checked;
                              setUserAssignments(f => ({ ...f, categories: ch ? [...(f.categories || []), sub.id] : (f.categories || []).filter((id: any) => id !== sub.id) }));
                            }} /> <span className="group-hover:text-primary transition-colors">{sub.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 border-t pt-3 border-border">
                    <Label className="text-xs font-bold text-primary">4. Assigned Products (Specific)</Label>
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input 
                        placeholder="Search specific products..." 
                        className="pl-7 h-8 text-[11px] bg-muted/20"
                        onChange={e => {
                           // Local filter logic or we can just scroll-to? 
                           // For now just keep it simple, the list below will be long so search is good.
                           setSearchProd(e.target.value);
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-1 p-3 border border-border rounded-xl bg-card max-h-48 overflow-y-auto">
                      {allProducts.filter(p => !searchProd || p.name.toLowerCase().includes(searchProd.toLowerCase())).map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted/50 p-1.5 rounded border border-transparent hover:border-border/40 transition-all">
                          <input type="checkbox" checked={userAssignments.products?.includes(p.id)} onChange={e => {
                            const ch = e.target.checked;
                            setUserAssignments(f => ({ ...f, products: ch ? [...(f.products || []), p.id] : (f.products || []).filter((id: any) => id !== p.id) }));
                          }} /> 
                          <span className="flex-1">{p.name} <span className="text-[10px] text-muted-foreground ml-1">({p.sku || p.productCode || 'N/A'})</span></span>
                          {allBrands.find(b => b.id === (p.brandId ?? p.brand_id)) && <Badge variant="secondary" className="text-[9px] px-1 h-4">{allBrands.find(b => b.id === (p.brandId ?? p.brand_id))?.name}</Badge>}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {((assignUser?.role && (assignUser.role.startsWith('INVENTORY') || assignUser.role.includes('WH') || assignUser.role.includes('MANAGER'))) || assignUser?.role === 'SUPERADMIN' || assignUser?.role === 'ADMIN') && (
                <div className="space-y-1.5 border-t pt-3 border-border">
                  <Label className="text-xs font-bold text-primary">Assigned Warehouses</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-xl bg-card max-h-32 overflow-y-auto">
                    {allWarehouses.map(w => (
                      <label key={w.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer p-0.5">
                        <input type="checkbox" checked={userAssignments.warehouses?.includes(w.id)} onChange={e => {
                          const ch = e.target.checked;
                          setUserAssignments(f => ({ ...f, warehouses: ch ? [...(f.warehouses || []), w.id] : (f.warehouses || []).filter((id: any) => id !== w.id) }));
                        }} /> {w.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
