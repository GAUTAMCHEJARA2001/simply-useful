import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Dealer } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import LedgerModal from '@/pages/InventoryManagement/modals/LedgerModal';

const emptyDealer: Dealer = {
  dealerCode: '', dealerName: '', city: '', assignedSoEmail: '',
  distributorName: '', creditLimit: 0, outstanding: 0, active: true,
  territory: '', phone: '', email: '', address: '', gst: '', contactPerson: '',
};

const DealerManagement: React.FC = () => {
  const { dealers, distributors, users, addDealer, updateDealer, deleteDealer } = useData();
  const { can } = usePermissions();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerTarget, setLedgerTarget] = useState('');
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [form, setForm] = useState<Dealer>(emptyDealer);
  const [deleteTarget, setDeleteTarget] = useState<string>('');

  const salesUsers = users.filter(u => u.role === 'SALES' && u.active);

  const filtered = dealers.filter(d =>
    d.dealerName.toLowerCase().includes(search.toLowerCase()) ||
    d.city.toLowerCase().includes(search.toLowerCase()) ||
    (d.territory || '').toLowerCase().includes(search.toLowerCase()) ||
    d.dealerCode.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyDealer, dealerCode: `DLR-${Date.now().toString().slice(-5)}` });
    setDialogOpen(true);
  };

  const openEdit = (d: Dealer) => {
    setEditing(d);
    setForm({ ...d });
    setDialogOpen(true);
  };

  const openDelete = (code: string) => {
    setDeleteTarget(code);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.dealerName || !form.city || !form.assignedSoEmail) {
      toast({ title: 'Missing Fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await updateDealer(editing.dealerCode, form);
        toast({ title: 'Dealer Updated', description: `${form.dealerName} updated successfully.` });
      } else {
        await addDealer(form);
        toast({ title: 'Dealer Added', description: `${form.dealerName} added successfully.` });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save dealer.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDealer(deleteTarget);
      toast({ title: 'Dealer Deleted', description: 'Dealer has been removed.' });
      setDeleteDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete dealer.', variant: 'destructive' });
    }
  };

  const updateForm = (field: keyof Dealer, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Dealer Management</h1>
          <p className="page-subheader">{dealers.length} dealers registered</p>
        </div>
        {can('manage_customers') && <Button className="action-button" onClick={openAdd}><Plus className="w-5 h-5 mr-2" /> Add Dealer</Button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search dealers by name, city, territory, or code..." className="pl-10 h-12" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {filtered.map(d => (
          <Card key={d.dealerCode}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{d.dealerName}</p>
                  <p className="text-xs text-muted-foreground">{d.dealerCode} · {d.city} {d.territory ? `(${d.territory})` : ''}</p>
                </div>
                <Badge variant={d.active ? 'default' : 'destructive'} className="text-[10px]">
                  {d.active ? 'Active' : 'Blocked'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                <div><span className="text-muted-foreground">Credit Limit:</span> <span className="font-medium">₹{d.creditLimit.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Outstanding:</span> <span className="font-medium">₹{d.outstanding.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">SO:</span> <span className="font-medium">{d.assignedSoEmail?.split('@')[0] || 'Unknown'}</span></div>
                <div><span className="text-muted-foreground">Distributor:</span> <span className="font-medium">{d.distributorName || 'Direct'}</span></div>
              </div>
              {can('manage_customers') && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => { setLedgerTarget(d.dealerCode); setLedgerOpen(true); }} className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"><BookOpen className="w-3.5 h-3.5 mr-1" /> Ledger</Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)} className="flex-1"><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => openDelete(d.dealerCode)} className="flex-1"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Code', 'Name', 'City', 'Territory', 'SO', 'Distributor', 'Credit Limit', 'Outstanding', 'Status', ...(can('manage_customers') ? ['Actions'] : [])].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.dealerCode} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{d.dealerCode}</td>
                    <td className="px-4 py-3 font-medium">{d.dealerName}</td>
                    <td className="px-4 py-3">{d.city}</td>
                    <td className="px-4 py-3 font-medium text-xs text-primary">{d.territory || '—'}</td>
                    <td className="px-4 py-3 text-xs">{d.assignedSoEmail?.split('@')[0] || 'Unknown'}</td>
                    <td className="px-4 py-3 text-xs">{d.distributorName || '—'}</td>
                    <td className="px-4 py-3">₹{d.creditLimit.toLocaleString()}</td>
                    <td className="px-4 py-3">₹{d.outstanding.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={d.active ? 'default' : 'destructive'} className="text-[10px]">{d.active ? 'Active' : 'Blocked'}</Badge>
                    </td>
                    {can('manage_customers') && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setLedgerTarget(d.dealerCode); setLedgerOpen(true); }} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors" title="View Ledger"><BookOpen className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openDelete(d.dealerCode)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby="dealer-form-desc">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Dealer' : 'Add New Dealer'}</DialogTitle>
            <DialogDescription id="dealer-form-desc" className="sr-only">
              {editing ? 'Update dealer details, credit limits, and assigned Sales Officer.' : 'Create a new dealer profile in the system.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dealer Code</Label>
                <Input value={form.dealerCode} onChange={e => updateForm('dealerCode', e.target.value)} disabled={!!editing} />
              </div>
              <div className="space-y-2">
                <Label>Dealer Name *</Label>
                <Input value={form.dealerName} onChange={e => updateForm('dealerName', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input value={form.city} onChange={e => updateForm('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Assigned SO *</Label>
                <Select value={form.assignedSoEmail} onValueChange={v => updateForm('assignedSoEmail', v)}>
                  <SelectTrigger><SelectValue placeholder="Select SO" /></SelectTrigger>
                  <SelectContent>
                    {salesUsers.filter(u => u.email).map(u => <SelectItem key={u.email} value={u.email}>{u.name} ({u.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person Name</Label>
                <Input value={form.contactPerson || ''} onChange={e => updateForm('contactPerson', e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={form.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="e.g. 9876543210" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email ID</Label>
                <Input type="email" value={form.email || ''} onChange={e => updateForm('email', e.target.value)} placeholder="e.g. dealer@example.com" />
              </div>
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input value={form.gst || ''} onChange={e => updateForm('gst', e.target.value)} placeholder="e.g. 08ABCDE1234F1Z5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="Enter full address" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distributor</Label>
                <Select value={form.distributorName || 'None'} onValueChange={v => updateForm('distributorName', v === 'None' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select Distributor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None / Direct Dealer</SelectItem>
                    {Array.from(new Set(distributors.map(d => d.distributorName).filter(Boolean))).map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credit Limit</Label>
                <Input type="number" value={form.creditLimit} onChange={e => updateForm('creditLimit', Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outstanding</Label>
                <Input type="number" value={form.outstanding} onChange={e => updateForm('outstanding', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Territory (Area Code)</Label>
                <Input value={form.territory || ''} onChange={e => updateForm('territory', e.target.value)} placeholder="e.g. T-WEST" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.active ? 'active' : 'blocked'} onValueChange={v => updateForm('active', v === 'active')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="action-button">Save Dealer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dealer? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Dealer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LedgerModal 
        isOpen={ledgerOpen} 
        onClose={() => setLedgerOpen(false)} 
        defaultSearch={ledgerTarget}
        restricted={true}
      />
    </div>
  );
};

export default DealerManagement;
