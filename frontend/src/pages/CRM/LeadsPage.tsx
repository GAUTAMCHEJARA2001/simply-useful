import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Layers, KanbanSquare, BarChart3, ListFilter, Trash2, Edit } from 'lucide-react';
import { leadService } from '@/api/services/lead.service';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import CRMDashboard from './CRMDashboard';
import PipelineBoard, { Lead } from './PipelineBoard';
import LeadDetails from './LeadDetails';

const PRIORITY_CHOICES = ['LOW', 'MEDIUM', 'HIGH'];
const SOURCE_CHOICES = ['Cold Call', 'Referral', 'Website', 'Event', 'Social Media', 'Other'];

const emptyForm = {
  name: '',
  companyName: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  pincode: '',
  priority: 'MEDIUM' as Lead['priority'],
  value: 0,
  source: 'Cold Call',
  notes: '',
  assignedTo: '',
};

const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.504-5.714-1.464L0 24zm6.59-11.666c.214.593.414 1.02.624 1.387.21.367.437.587.77.92.333.333.714.614 1.154.84.44.227.813.347 1.254.407.44.06.793.02 1.18-.087.387-.107.727-.32 1.02-.647.293-.327.467-.714.52-1.127.053-.413.013-.787-.12-1.087-.133-.3-.414-.493-.84-.707-.427-.213-1.007-.497-1.16-.547-.154-.05-.267-.073-.38.093-.113.167-.44.547-.54.667-.1.12-.2.133-.413.027-.214-.107-.907-.333-1.727-1.06-.633-.567-1.06-1.267-1.187-1.48-.127-.213-.013-.327.093-.433.097-.097.213-.247.32-.373.107-.127.14-.213.213-.36.073-.147.037-.28-.017-.387-.053-.107-.44-1.06-.603-1.453-.16-.39-.337-.337-.463-.343-.12-.006-.26-.006-.4-.006-.14 0-.367.053-.56.26-.193.207-.733.717-.733 1.747 0 1.03.75 2.023.853 2.16.103.137 1.474 2.25 3.57 3.153.5.214.887.34 1.19.437.502.16.96.137 1.32.083.403-.06 1.233-.503 1.407-.99.173-.487.173-.903.12-.99-.053-.087-.193-.137-.413-.247z"/>
  </svg>
);

const LeadsPage: React.FC = () => {
  const { user } = useAuth();
  const { users } = useData();
  const { toast } = useToast();
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'list'>('board');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search and Filter states
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Dialog and details states
  const [addOpen, setAddOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  const salesUsers = users.filter(u => (u.role === 'SALES' || u.role === 'SALES_EXECUTIVE') && u.active);
  const canManageLeads = can('manage_customers') || user?.role === 'SUPERADMIN' || user?.role === 'ADMIN' || user?.role === 'SALES' || (user?.role as string) === 'MANAGER';
  
  // Sales Officers always own their leads — they cannot reassign to others
  const SALES_ONLY_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER'];
  const isSalesOfficer = SALES_ONLY_ROLES.includes((user?.role || '').toUpperCase());

  // Load leads
  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await leadService.getAll();
      if (res.data?.success) {
        setLeads(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Connection Failed',
        description: 'Failed to load lead lists from server.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [refreshTrigger]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Add / Edit submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: 'Missing required field', description: 'Contact person name is required.', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        ...form,
        // Sales Officers are always self-assigned; prevent payload manipulation
        assignedTo: isSalesOfficer
          ? (user?.email || null)
          : (form.assignedTo === 'none' || !form.assignedTo ? null : form.assignedTo),
      };

      if (editingLead) {
        const res = await leadService.update(editingLead.id, payload);
        if (res.data?.success) {
          toast({ title: 'Lead Updated', description: `${form.name} updated successfully.` });
        }
      } else {
        const res = await leadService.create(payload);
        if (res.data?.success) {
          toast({ title: 'Lead Created', description: `${form.name} added to pipeline.` });
        }
      }
      setAddOpen(false);
      setEditingLead(null);
      setForm(emptyForm);
      triggerRefresh();
    } catch (err: any) {
      toast({
        title: 'Failed to save',
        description: err.response?.data?.message || 'Check model bounds.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenAdd = () => {
    setEditingLead(null);
    setForm({
      ...emptyForm,
      // Pre-fill assignee with own email for sales officers
      assignedTo: isSalesOfficer ? (user?.email || '') : '',
    });
    setAddOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      companyName: lead.companyName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      city: lead.city || '',
      state: lead.state || '',
      pincode: lead.pincode || '',
      priority: lead.priority,
      value: Number(lead.value) || 0,
      source: lead.source || 'Cold Call',
      notes: lead.notes || '',
      assignedTo: lead.assignedTo || '',
    });
    setAddOpen(true);
  };

  // Move Lead stage (optimistic/Kanban)
  const handleMoveLead = async (leadId: string, targetStage: Lead['status']) => {
    const originalLeads = [...leads];
    // Optimistic UI update
    setLeads(prev =>
      prev.map(l => (l.id === leadId ? { ...l, status: targetStage } : l))
    );

    try {
      const res = await leadService.moveStage(leadId, targetStage);
      if (!res.data?.success) {
        throw new Error('Server validation failed');
      }
      triggerRefresh();
    } catch (err: any) {
      setLeads(originalLeads); // rollback
      toast({
        title: 'Transition Denied',
        description: err.response?.data?.message || 'Disallowed status transition path.',
        variant: 'destructive',
      });
    }
  };

  // Delete/Archive lead
  const handleDeleteTrigger = (id: string) => {
    setDeleteTargetId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await leadService.remove(deleteTargetId);
      if (res.data?.success) {
        toast({ title: 'Lead Archived', description: 'Lead removed from active pipeline.' });
        triggerRefresh();
      }
    } catch (err: any) {
      toast({ title: 'Failed to archive', description: 'Access level boundaries error.', variant: 'destructive' });
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  // Filtering list
  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || '').includes(search) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase());

    const matchesPriority = priorityFilter === 'all' || l.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchesAssignee = assigneeFilter === 'all' || (assigneeFilter === 'none' ? !l.assignedTo : l.assignedTo === assigneeFilter);

    return matchesSearch && matchesPriority && matchesStatus && matchesAssignee;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">CRM & Lead Pipeline</h1>
          <p className="page-subheader">{leads.length} active prospects in marketing</p>
        </div>
        {canManageLeads && (
          <Button onClick={handleOpenAdd} className="action-button">
            <Plus className="w-5 h-5 mr-2" /> Add Prospect
          </Button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-muted/60 border border-border/40 p-1 rounded-xl max-w-sm gap-1">
        <Button
          variant={activeTab === 'board' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('board')}
          className="flex-1 text-xs h-9 rounded-lg"
        >
          <KanbanSquare className="w-4 h-4 mr-1.5" /> Pipeline
        </Button>
        <Button
          variant={activeTab === 'list' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('list')}
          className="flex-1 text-xs h-9 rounded-lg"
        >
          <Layers className="w-4 h-4 mr-1.5" /> List View
        </Button>
        <Button
          variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('dashboard')}
          className="flex-1 text-xs h-9 rounded-lg"
        >
          <BarChart3 className="w-4 h-4 mr-1.5" /> Analytics
        </Button>
      </div>

      {/* Main workspace */}
      {activeTab === 'dashboard' && <CRMDashboard refreshTrigger={refreshTrigger} />}

      {(activeTab === 'board' || activeTab === 'list') && (
        <div className="space-y-4">
          {/* Filters Box */}
          <div className="flex flex-col sm:flex-row gap-3 bg-muted/20 p-3 rounded-xl border border-border/40">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, company, email, phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 bg-background"
              />
            </div>
            <div className="flex gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="HIGH">🔴 High</SelectItem>
                  <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                  <SelectItem value="LOW">🟢 Low</SelectItem>
                </SelectContent>
              </Select>

              {activeTab === 'list' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="PROPOSAL">Proposal</SelectItem>
                    <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || (user?.role as string) === 'MANAGER') && (
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-[150px] bg-background">
                    <SelectValue placeholder="Assigned Exec" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Execs</SelectItem>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {salesUsers.map(u => (
                      <SelectItem key={u.email} value={u.email}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {activeTab === 'board' ? (
            <PipelineBoard
              leads={filteredLeads}
              onMoveLead={handleMoveLead}
              onSelectLead={handleSelectLead}
              canManage={canManageLeads}
            />
          ) : (
            /* Desktop List View Table */
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        {['Prospect Name', 'Company Name', 'Value', 'Priority', 'Stage', 'Assigned Exec', 'Created', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map(lead => (
                        <tr
                          key={lead.id}
                          onClick={() => handleSelectLead(lead)}
                          className="border-b border-border/40 hover:bg-muted/10 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3.5 font-bold text-foreground">{lead.name}</td>
                          <td className="px-4 py-3.5 text-muted-foreground">{lead.companyName || '—'}</td>
                          <td className="px-4 py-3.5 font-semibold text-foreground">₹{(Number(lead.value) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 uppercase`}>
                              {lead.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge className="text-[10px] px-2 py-0.5 uppercase tracking-wide">
                              {lead.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            {lead.assignedTo ? lead.assignedTo.split('@')[0] : <span className="text-muted-foreground italic">None</span>}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">
                            {new Date(lead.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex gap-2.5 items-center" onClick={e => e.stopPropagation()}>
                              {lead.phone && (
                                <a
                                  href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                                  title="WhatsApp chat"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {canManageLeads && (
                                <>
                                  <button onClick={() => handleOpenEdit(lead)} className="p-1.5 rounded hover:bg-muted" title="Edit details">
                                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                  <button onClick={() => handleDeleteTrigger(lead.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Archive lead">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-muted-foreground italic">
                            No prospects matches the filter guidelines.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="add-prospect-desc">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Edit Prospect' : 'Add New CRM Prospect'}</DialogTitle>
            <DialogDescription id="add-prospect-desc">
              Register detailed contact metadata and scope metrics to start nurturing leads.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Name *</Label>
              <Input
                placeholder="e.g. Gautam Chejara"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Company/Dealer Name</Label>
              <Input
                placeholder="e.g. Apex Hardware Stores"
                value={form.companyName}
                onChange={e => setForm(prev => ({ ...prev, companyName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. +919876543210"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. example@gmail.com"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="e.g. Surat"
                  value={form.city}
                  onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  placeholder="e.g. Gujarat"
                  value={form.state}
                  onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  placeholder="e.g. 395003"
                  value={form.pincode}
                  onChange={e => setForm(prev => ({ ...prev, pincode: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deal Value (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.value}
                  onChange={e => setForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v: Lead['priority']) => setForm(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_CHOICES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select
                  value={form.source}
                  onValueChange={v => setForm(prev => ({ ...prev, source: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_CHOICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee — hidden for Sales Officers who are always self-assigned */}
              {!isSalesOfficer && (
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={form.assignedTo || 'none'}
                    onValueChange={v => setForm(prev => ({ ...prev, assignedTo: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Assignee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {salesUsers.map(u => (
                        <SelectItem key={u.email} value={u.email}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nurturing Notes & Description</Label>
              <Textarea
                placeholder="List major customer requirements, timelines, brand choices..."
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="resize-none min-h-[80px]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="action-button">
                {editingLead ? 'Update Prospect' : 'Add Prospect'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Slide-over details pane */}
      <LeadDetails
        lead={selectedLead}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onRefresh={triggerRefresh}
        users={salesUsers}
        canManage={canManageLeads}
      />

      {/* Delete/Archive lead confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm" aria-describedby="delete-lead-desc">
          <DialogHeader>
            <DialogTitle>Archive Prospect?</DialogTitle>
            <DialogDescription id="delete-lead-desc">
              Soft deleted leads are archived and hidden from Kanban views.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to soft delete and hide this prospect from active pipeline charts?</p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Archive Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsPage;
