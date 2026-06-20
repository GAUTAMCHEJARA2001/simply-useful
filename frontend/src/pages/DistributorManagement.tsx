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

const emptyDist: Distributor = { distributorName: '', area: '', assignedSoEmail: '', creditLimit: 0, outstanding: 0, active: true, territory: '', phone: '', email: '', address: '', gst: '', contactPerson: '' };

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
    d.distributorName.toLowerCase().includes(search.toLowerCase()) ||
    d.area.toLowerCase().includes(search.toLowerCase()) ||
    (d.territory || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm(emptyDist); setDialogOpen(true); };
  const openEdit = (d: Distributor) => { setEditing(d); setForm({ ...d }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.distributorName || !form.area || !form.assignedSoEmail) {
      toast({ title: 'Missing Fields', description: 'Fill all required fields.', variant: 'destructive' }); return;
    }
    try {
      if (editing) {
        await updateDistributor(editing.distributorName, form);
        toast({ title: 'Updated', description: `${form.distributorName} updated.` });
      } else {
        await addDistributor(form);
        toast({ title: 'Added', description: `${form.distributorName} added.` });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save distributor.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDistributor(deleteTarget);
      toast({ title: 'Deleted', description: 'Distributor removed.' });
      setDeleteDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete distributor.', variant: 'destructive' });
    }
  };

  const uf = (field: keyof Distributor, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Distributor Management</h1>
          <p className="page-subheader">{distributors.length} distributors</p>
        </div>
        {can('manage_customers') && <Button className="action-button" onClick={openAdd}><Plus className="w-5 h-5 mr-2" /> Add Distributor</Button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search distributors by name, area, or territory..." className="pl-10 h-12" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="lg:hidden space-y-3">
        {filtered.map(d => (
          <Card key={d.distributorName}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{d.distributorName}</p>
                  <p className="text-xs text-muted-foreground">{d.area} {d.territory ? `(${d.territory})` : ''}</p>
                </div>
                <Badge variant={d.active ? 'default' : 'destructive'} className="text-[10px]">{d.active ? 'Active' : 'Blocked'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                <div><span className="text-muted-foreground">Credit:</span> ₹{d.creditLimit.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Outstanding:</span> ₹{d.outstanding.toLocaleString()}</div>
                <div><span className="text-muted-foreground">SO:</span> {d.assignedSoEmail?.split('@')[0] || 'Unknown'}</div>
              </div>
              {can('manage_customers') && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)} className="flex-1"><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(d.distributorName); setDeleteDialogOpen(true); }} className="flex-1"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
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
                {['Name', 'Area', 'Territory', 'SO', 'Credit Limit', 'Outstanding', 'Status', ...(can('manage_customers') ? ['Actions'] : [])].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.distributorName} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{d.distributorName}</td>
                  <td className="px-4 py-3">{d.area}</td>
                  <td className="px-4 py-3 font-medium text-xs text-primary">{d.territory || '—'}</td>
                  <td className="px-4 py-3 text-xs">{d.assignedSoEmail?.split('@')[0] || 'Unknown'}</td>
                  <td className="px-4 py-3">₹{d.creditLimit.toLocaleString()}</td>
                  <td className="px-4 py-3">₹{d.outstanding.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant={d.active ? 'default' : 'destructive'} className="text-[10px]">{d.active ? 'Active' : 'Blocked'}</Badge></td>
                  {can('manage_customers') && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setDeleteTarget(d.distributorName); setDeleteDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby="dist-form-desc">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Distributor</DialogTitle>
            <DialogDescription id="dist-form-desc" className="sr-only">
              Manage distributor details, area, and SO assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.distributorName} onChange={e => uf('distributorName', e.target.value)} disabled={!!editing} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Area *</Label><Input value={form.area} onChange={e => uf('area', e.target.value)} /></div>
              <div className="space-y-2"><Label>Assigned SO *</Label>
                <Select value={form.assignedSoEmail} onValueChange={v => uf('assignedSoEmail', v)}>
                  <SelectTrigger><SelectValue placeholder="Select SO" /></SelectTrigger>
                  <SelectContent>{salesUsers.filter(u => u.email).map(u => <SelectItem key={u.email} value={u.email}>{u.name} ({u.email})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person Name</Label>
                <Input value={form.contactPerson || ''} onChange={e => uf('contactPerson', e.target.value)} placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={form.phone || ''} onChange={e => uf('phone', e.target.value)} placeholder="e.g. 9876543210" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email ID</Label>
                <Input type="email" value={form.email || ''} onChange={e => uf('email', e.target.value)} placeholder="e.g. dist@example.com" />
              </div>
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input value={form.gst || ''} onChange={e => uf('gst', e.target.value)} placeholder="e.g. 08ABCDE1234F1Z5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address || ''} onChange={e => uf('address', e.target.value)} placeholder="Enter full address" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Territory (Area Code)</Label><Input value={form.territory || ''} onChange={e => uf('territory', e.target.value)} placeholder="e.g. T-WEST" /></div>
              <div className="space-y-2"><Label>Credit Limit</Label><Input type="number" value={form.creditLimit} onChange={e => uf('creditLimit', Number(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
