import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Distributor } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

const emptyDist: Distributor = { distributor_name: '', area: '', assigned_so_email: '', credit_limit: 0, outstanding: 0, active: true };

const DistributorManagement: React.FC = () => {
  const { distributors, users, addDistributor, updateDistributor, deleteDistributor } = useData();
  const { can } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Distributor | null>(null);
  const [form, setForm] = useState<Distributor>(emptyDist);
  const [deleteTarget, setDeleteTarget] = useState('');

  const salesUsers = users.filter(u => u.role === 'SALES' && u.active);
  const filtered = distributors.filter(d =>
    d.distributor_name.toLowerCase().includes(search.toLowerCase()) || d.area.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm(emptyDist); setDialogOpen(true); };
  const openEdit = (d: Distributor) => { setEditing(d); setForm({ ...d }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.distributor_name || !form.area || !form.assigned_so_email) {
      toast({ title: 'Missing Fields', description: 'Fill all required fields.', variant: 'destructive' }); return;
    }
    if (editing) {
      updateDistributor(editing.distributor_name, form);
      toast({ title: 'Updated', description: `${form.distributor_name} updated.` });
    } else {
      addDistributor(form);
      toast({ title: 'Added', description: `${form.distributor_name} added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    deleteDistributor(deleteTarget);
    toast({ title: 'Deleted', description: 'Distributor removed.' });
    setDeleteDialogOpen(false);
  };

  const uf = (field: keyof Distributor, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Distributor Management</h1>
          <p className="page-subheader">{distributors.length} distributors</p>
        </div>
        {can('manage_distributors') && <Button className="action-button" onClick={openAdd}><Plus className="w-5 h-5 mr-2" /> Add Distributor</Button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search distributors..." className="pl-10 h-12" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="lg:hidden space-y-3">
        {filtered.map(d => (
          <Card key={d.distributor_name}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{d.distributor_name}</p>
                  <p className="text-xs text-muted-foreground">{d.area}</p>
                </div>
                <Badge variant={d.active ? 'default' : 'destructive'} className="text-[10px]">{d.active ? 'Active' : 'Blocked'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                <div><span className="text-muted-foreground">Credit:</span> ₹{d.credit_limit.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Outstanding:</span> ₹{d.outstanding.toLocaleString()}</div>
                <div><span className="text-muted-foreground">SO:</span> {d.assigned_so_email.split('@')[0]}</div>
              </div>
              {can('manage_distributors') && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)} className="flex-1"><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(d.distributor_name); setDeleteDialogOpen(true); }} className="flex-1"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
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
                {['Name', 'Area', 'SO', 'Credit Limit', 'Outstanding', 'Status', ...(can('manage_distributors') ? ['Actions'] : [])].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.distributor_name} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{d.distributor_name}</td>
                  <td className="px-4 py-3">{d.area}</td>
                  <td className="px-4 py-3 text-xs">{d.assigned_so_email.split('@')[0]}</td>
                  <td className="px-4 py-3">₹{d.credit_limit.toLocaleString()}</td>
                  <td className="px-4 py-3">₹{d.outstanding.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={d.active ? 'default' : 'destructive'} className="text-[10px]">{d.active ? 'Active' : 'Blocked'}</Badge></td>
                  {can('manage_distributors') && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setDeleteTarget(d.distributor_name); setDeleteDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby="dist-form-desc">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Distributor</DialogTitle>
            <DialogDescription id="dist-form-desc" className="sr-only">
              Manage distributor details, area, and SO assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.distributor_name} onChange={e => uf('distributor_name', e.target.value)} disabled={!!editing} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Area *</Label><Input value={form.area} onChange={e => uf('area', e.target.value)} /></div>
              <div className="space-y-2"><Label>Assigned SO *</Label>
                <Select value={form.assigned_so_email} onValueChange={v => uf('assigned_so_email', v)}>
                  <SelectTrigger><SelectValue placeholder="Select SO" /></SelectTrigger>
                  <SelectContent>{salesUsers.filter(u => u.email).map(u => <SelectItem key={u.email} value={u.email}>{u.name} ({u.email})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Credit Limit</Label><Input type="number" value={form.credit_limit} onChange={e => uf('credit_limit', Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.active ? 'active' : 'blocked'} onValueChange={v => uf('active', v === 'active')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="blocked">Blocked</SelectItem></SelectContent>
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
        <DialogContent className="max-w-sm" aria-describedby="dist-delete-desc">
          <DialogHeader>
            <DialogTitle>Delete Distributor?</DialogTitle>
            <DialogDescription id="dist-delete-desc" className="sr-only">
              Confirm permanent deletion of the distributor.
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

export default DistributorManagement;
