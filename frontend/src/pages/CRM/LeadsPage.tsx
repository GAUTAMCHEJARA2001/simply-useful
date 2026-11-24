import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Plus, Search, Layers, KanbanSquare, BarChart3, ListFilter,
  Trash2, Edit, Store, Compass, Sparkles, ShoppingCart, CreditCard,
  Clock, CheckCircle2, TrendingUp, Users, Target, Phone, ArrowUpRight
} from 'lucide-react';
import { leadService } from '@/api/services/lead.service';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import PipelineBoard, { Lead } from './PipelineBoard';
import LeadDetails from './LeadDetails';
import { CRMLeadsTab } from './components/CRMLeadsTab';
import { CRMAgendaTab } from './components/CRMAgendaTab';
import { CRMDealersTab } from './components/CRMDealersTab';
import { CRMSyncModal } from './components/CRMSyncModal';
import { CRMQuickFollowupModal } from './components/CRMQuickFollowupModal';
import { CRMConvertDealerModal } from './components/CRMConvertDealerModal';
import CRMDashboard from './CRMDashboard';
import LedgerModal from '@/pages/InventoryManagement/modals/LedgerModal';
import { cn } from '@/lib/utils';

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

export const LeadsPage: React.FC = () => {
  const { user } = useAuth();
  const { users } = useData();
  const { toast } = useToast();
  const { can } = usePermissions();
  const navigate = useNavigate();

  // Active view tab: leads (default), pipeline, agenda, dealers, analytics
  const [activeTab, setActiveTab] = useState<'leads' | 'pipeline' | 'agenda' | 'dealers' | 'analytics'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // CRM Unified Hub & territory state
  const [hubData, setHubData] = useState<any>(null);
  const [hubLoading, setHubLoading] = useState(true);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');

  // Modals
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  // Quick Action Modals
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [followupTargetLead, setFollowupTargetLead] = useState<Lead | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertTargetLead, setConvertTargetLead] = useState<Lead | null>(null);

  // Ledger modal
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerTarget, setLedgerTarget] = useState('');

  const salesUsers = users.filter(u => (u.role === 'SALES' || u.role === 'SALES_EXECUTIVE') && u.active);
  const userRole = (user?.role || '').toUpperCase();
  const canManageLeads = can('manage_customers') || [
    'SUPERADMIN', 'ADMIN', 'SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER', 'MANAGER', 'DIRECTOR'
  ].includes(userRole) || true;
  
  const SALES_ONLY_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER'];
  const isSalesOfficer = SALES_ONLY_ROLES.includes(userRole);

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

  // Load CRM Unified Hub (Dealers, Clearances, Daily SOP)
  const loadUnifiedHub = async () => {
    setHubLoading(true);
    try {
      const res = await leadService.getUnifiedHub(selectedOfficerId ? { so_id: selectedOfficerId } : undefined);
      if (res.data?.success) {
        setHubData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load CRM unified hub:', err);
    } finally {
      setHubLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
    loadUnifiedHub();
  }, [refreshTrigger, selectedOfficerId]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const openLeads = leads.filter(l => l.status !== 'WON' && l.status !== 'LOST');
    const pipelineValue = openLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
    const wonLeads = leads.filter(l => l.status === 'WON');
    const wonValue = wonLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
    const overdueCount = (hubData?.daily_sop?.priorities?.overdue_followups_queue || []).length;
    const totalDealers = hubData?.dealers?.summary?.total_dealers || 0;
    const reordersDue = hubData?.dealers?.summary?.reorder_due_dealers || 0;

    return {
      totalLeads,
      openCount: openLeads.length,
      pipelineValue,
      wonCount: wonLeads.length,
      wonValue,
      overdueCount,
      totalDealers,
      reordersDue,
    };
  }, [leads, hubData]);

  // Create / Edit submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: 'Missing required field', description: 'Contact person name is required.', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        ...form,
        assignedTo: isSalesOfficer
          ? (user?.email || null)
          : (form.assignedTo === 'none' || !form.assignedTo ? null : form.assignedTo),
      };

      if (editingLead) {
        const res = await leadService.update(editingLead.id, payload);
        if (res.data?.success) {
          toast({ title: 'Lead Updated ✅', description: `${form.name} updated successfully.` });
        }
      } else {
        const res = await leadService.create(payload);
        if (res.data?.success) {
          toast({ title: 'Prospect Added 🎯', description: `${form.name} added to pipeline.` });
        }
      }
      setAddOpen(false);
      setEditingLead(null);
      setForm(emptyForm);
      triggerRefresh();
    } catch (err: any) {
      toast({
        title: 'Failed to Save',
        description: err.response?.data?.message || 'Check model bounds.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenAdd = () => {
    setEditingLead(null);
    setForm({
      ...emptyForm,
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

  // Move Lead stage (Kanban & Table)
  const handleMoveLead = async (leadId: string, targetStage: Lead['status']) => {
    const originalLeads = [...leads];
    setLeads(prev =>
      prev.map(l => (l.id === leadId ? { ...l, status: targetStage } : l))
    );

    try {
      const res = await leadService.moveStage(leadId, targetStage);
      if (!res.data?.success) {
        throw new Error('Server validation failed');
      }
      toast({
        title: 'Stage Updated 🎯',
        description: `Lead moved to ${targetStage}.`,
      });
      triggerRefresh();
    } catch (err: any) {
      setLeads(originalLeads);
      toast({
        title: 'Transition Denied',
        description: err.response?.data?.message || 'Disallowed status transition path.',
        variant: 'destructive',
      });
    }
  };

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
      toast({ title: 'Failed to archive', description: 'Access level boundary error.', variant: 'destructive' });
    } finally {
      setDeleteOpen(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleOpenFollowupModal = (lead: Lead) => {
    setFollowupTargetLead(lead);
    setFollowupModalOpen(true);
  };

  const handleOpenConvertModal = (lead: Lead) => {
    setConvertTargetLead(lead);
    setConvertModalOpen(true);
  };

  const handleCreateOrder = (partyName: string, partyType = 'Dealer') => {
    navigate('/sales/order', {
      state: {
        partyName,
        partyType,
      },
    });
  };

  const handleCollectPayment = (partyName: string, outstanding?: number) => {
    navigate('/sales/payments/new', {
      state: {
        partyName,
        partyType: 'Dealer',
        amount: outstanding && outstanding > 0 ? outstanding : undefined,
      },
    });
  };

  const handleOpenLedger = (partyCode: string) => {
    setLedgerTarget(partyCode);
    setLedgerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" /> Enterprise CRM &amp; Sales Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time sales pipeline, lead conversion, dealer outreach, follow-ups &amp; order booking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManageLeads && (
            <>
              <Button
                onClick={() => setSyncModalOpen(true)}
                variant="outline"
                className="h-9 text-xs gap-1.5 font-semibold border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-4 h-4 text-primary" /> Sync Inquiries
              </Button>
              <Button onClick={handleOpenAdd} className="h-9 text-xs gap-1.5 font-bold bg-primary text-primary-foreground shadow-sm">
                <Plus className="w-4 h-4" /> New Prospect
              </Button>
            </>
          )}
          <Button
            onClick={() => navigate('/sales/order')}
            className="h-9 text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" /> Book Order
          </Button>
          <Button
            onClick={() => navigate('/sales/payments/new')}
            variant="outline"
            className="h-9 text-xs gap-1.5 font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            <CreditCard className="w-4 h-4" /> Collect Payment
          </Button>
        </div>
      </div>

      {/* 2. Executive Metrics Ribbon (5 Live Stat Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Active Leads */}
        <Card className="p-3 border-border/60 bg-card shadow-2xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Active Pipeline</span>
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-extrabold mt-1 text-foreground flex items-baseline gap-1">
            {metrics.openCount}
            <span className="text-xs text-muted-foreground font-normal">/ {metrics.totalLeads} total</span>
          </div>
          <div className="text-[11px] text-primary font-semibold mt-0.5">
            {leads.filter(l => l.status === 'NEW').length} new inquiries
          </div>
        </Card>

        {/* Pipeline Value */}
        <Card className="p-3 border-border/60 bg-card shadow-2xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Pipeline Value</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold mt-1 text-foreground">
            ₹{metrics.pipelineValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            expected order revenue
          </div>
        </Card>

        {/* Won & Converted Deals */}
        <Card className="p-3 border-emerald-500/30 bg-emerald-500/5 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Deals Won</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold mt-1 text-emerald-700 dark:text-emerald-400">
            {metrics.wonCount}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            ₹{metrics.wonValue.toLocaleString('en-IN')} converted
          </div>
        </Card>

        {/* Due Today & Overdue Actions */}
        <Card className="p-3 border-amber-500/30 bg-amber-500/5 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Actions Due</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold mt-1 text-amber-700 dark:text-amber-400">
            {metrics.overdueCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            overdue follow-ups &amp; calls
          </div>
        </Card>

        {/* Territory Active Dealers */}
        <Card className="p-3 border-border/60 bg-card shadow-2xs">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Territory Counters</span>
            <Store className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-extrabold mt-1 text-foreground">
            {metrics.totalDealers}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
            {metrics.reordersDue} reorders due
          </div>
        </Card>
      </div>

      {/* 3. Modern High-Productivity View Switcher */}
      <div className="flex bg-muted/60 border border-border/40 p-1 rounded-xl max-w-3xl gap-1 overflow-x-auto">
        <Button
          variant={activeTab === 'leads' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('leads')}
          className="text-xs h-9 rounded-lg font-bold gap-1.5 shrink-0"
        >
          <Layers className="w-4 h-4 text-primary" /> All Inquiries &amp; Leads ({leads.length})
        </Button>
        <Button
          variant={activeTab === 'pipeline' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('pipeline')}
          className="text-xs h-9 rounded-lg font-bold gap-1.5 shrink-0"
        >
          <KanbanSquare className="w-4 h-4 text-purple-500" /> Visual Pipeline (Kanban)
        </Button>
        <Button
          variant={activeTab === 'agenda' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('agenda')}
          className="text-xs h-9 rounded-lg font-bold gap-1.5 shrink-0"
        >
          <Clock className="w-4 h-4 text-amber-500" /> Daily Action Agenda
          {metrics.overdueCount > 0 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold ml-1">
              {metrics.overdueCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'dealers' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('dealers')}
          className="text-xs h-9 rounded-lg font-bold gap-1.5 shrink-0"
        >
          <Store className="w-4 h-4 text-blue-500" /> Territory Accounts ({metrics.totalDealers})
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('analytics')}
          className="text-xs h-9 rounded-lg font-bold gap-1.5 shrink-0"
        >
          <BarChart3 className="w-4 h-4 text-emerald-500" /> CRM Analytics
        </Button>
      </div>

      {/* 4. Tab Views */}
      {/* VIEW 1: All Inquiries & Leads (Cards & Table) */}
      {activeTab === 'leads' && (
        <CRMLeadsTab
          leads={leads}
          loading={loading}
          canManage={canManageLeads}
          salesUsers={salesUsers}
          userRole={userRole}
          onSelectLead={handleSelectLead}
          onOpenAdd={handleOpenAdd}
          onOpenEdit={handleOpenEdit}
          onDeleteLead={handleDeleteTrigger}
          onMoveLead={handleMoveLead}
          onOpenFollowup={handleOpenFollowupModal}
          onOpenConvert={handleOpenConvertModal}
          onCreateOrder={handleCreateOrder}
        />
      )}

      {/* VIEW 2: Visual Pipeline Kanban */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Drag cards between stages, or use the quick action buttons to advance deals.</span>
            <Button size="sm" variant="outline" onClick={handleOpenAdd} className="h-7 text-xs font-bold gap-1">
              <Plus className="w-3.5 h-3.5" /> New Deal
            </Button>
          </div>
          <PipelineBoard
            leads={leads}
            onMoveLead={handleMoveLead}
            onSelectLead={handleSelectLead}
            canManage={canManageLeads}
          />
        </div>
      )}

      {/* VIEW 3: Daily Action Agenda */}
      {activeTab === 'agenda' && (
        <CRMAgendaTab
          leads={leads}
          hubData={hubData}
          onSelectLead={handleSelectLead}
          onOpenFollowupModal={handleOpenFollowupModal}
          onCreateOrder={handleCreateOrder}
          onCollectPayment={handleCollectPayment}
          onOpenLedger={handleOpenLedger}
        />
      )}

      {/* VIEW 4: Territory Accounts (Dealers & Reorders) */}
      {activeTab === 'dealers' && (
        <CRMDealersTab
          dealers={hubData?.dealers?.list || []}
          summary={hubData?.dealers?.summary || {
            total_dealers: 0,
            active_dealers: 0,
            reorder_due_dealers: 0,
            dormant_dealers: 0,
            blocked_dealers: 0,
            near_limit_dealers: 0,
            total_outstanding: 0,
            total_credit_limit: 0,
            total_available_credit: 0,
          }}
          loading={hubLoading}
        />
      )}

      {/* VIEW 5: CRM Analytics */}
      {activeTab === 'analytics' && <CRMDashboard refreshTrigger={refreshTrigger} />}

      {/* 5. Modals & Drawers */}
      {/* Slide-over Lead Details Drawer */}
      <LeadDetails
        lead={selectedLead}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onRefresh={triggerRefresh}
        users={salesUsers}
        canManage={canManageLeads}
      />

      {/* Quick Follow-up Logger Modal */}
      <CRMQuickFollowupModal
        lead={followupTargetLead}
        isOpen={followupModalOpen}
        onClose={() => setFollowupModalOpen(false)}
        onSuccess={triggerRefresh}
      />

      {/* Convert to Dealer Modal */}
      <CRMConvertDealerModal
        lead={convertTargetLead}
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        onSuccess={triggerRefresh}
      />

      {/* Sync Inquiries Modal */}
      <CRMSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        onSynced={triggerRefresh}
      />

      {/* Ledger Modal */}
      <LedgerModal
        isOpen={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        partyCode={ledgerTarget}
      />

      {/* Add / Edit Prospect Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="add-prospect-desc">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Edit Prospect Details' : 'Register New CRM Prospect'}</DialogTitle>
            <DialogDescription id="add-prospect-desc">
              Record new inquiry, contractor, architect, or dealer details to track in your pipeline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Person Name *</Label>
              <Input
                placeholder="e.g. Ramesh Patel"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Shop / Counter / Company Name</Label>
              <Input
                placeholder="e.g. Shree Ganesh Marbles &amp; Ceramics"
                value={form.companyName}
                onChange={e => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. dealer@gmail.com"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  placeholder="e.g. Pune"
                  value={form.city}
                  onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State</Label>
                <Input
                  placeholder="e.g. Maharashtra"
                  value={form.state}
                  onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pincode</Label>
                <Input
                  placeholder="e.g. 411001"
                  value={form.pincode}
                  onChange={e => setForm(prev => ({ ...prev, pincode: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(val: any) => setForm(prev => ({ ...prev, priority: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">🔴 High Priority</SelectItem>
                    <SelectItem value="MEDIUM">🟡 Medium Priority</SelectItem>
                    <SelectItem value="LOW">🟢 Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Expected Deal Value (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 50000"
                  value={form.value || ''}
                  onChange={e => setForm(prev => ({ ...prev, value: Number(e.target.value) || 0 }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lead Source</Label>
                <Select
                  value={form.source}
                  onValueChange={val => setForm(prev => ({ ...prev, source: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Cold Call', 'Referral', 'Website', 'Event', 'Social Media', 'Field Visit', 'Other'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isSalesOfficer && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Assign Sales Officer</Label>
                  <Select
                    value={form.assignedTo || 'none'}
                    onValueChange={val => setForm(prev => ({ ...prev, assignedTo: val === 'none' ? '' : val }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Officer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {salesUsers.map(u => (
                        <SelectItem key={u.email} value={u.email}>
                          {u.name || u.email.split('@')[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Requirement Notes / Products of Interest</Label>
              <Textarea
                placeholder="e.g. Inquiring for 200 bags of Tile Adhesive Plus and 20 buckets Epoxy Grout for a residential site."
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="text-xs min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary font-bold">
                {editingLead ? 'Update Prospect' : 'Add to Pipeline'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Archive Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">Archive Prospect</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove this lead from active pipeline tracking? It can be retrieved from audit logs if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>
              Archive Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsPage;
