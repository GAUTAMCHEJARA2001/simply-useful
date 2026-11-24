import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, LayoutGrid, Table as TableIcon, Phone, Mail, Building2,
  User, Store, Plus, ShoppingCart, CreditCard, ChevronRight, Edit,
  Trash2, MessageSquare, ArrowUpRight, CheckCircle2, Clock, MapPin,
  Sparkles, Filter, MoreHorizontal, UserCheck
} from 'lucide-react';
import { Lead, PRIORITY_STYLES, STAGES, ALLOWED_TRANSITIONS } from '../PipelineBoard';
import { cn } from '@/lib/utils';

interface CRMLeadsTabProps {
  leads: Lead[];
  loading?: boolean;
  canManage: boolean;
  salesUsers: any[];
  userRole?: string;
  onSelectLead: (lead: Lead) => void;
  onOpenAdd: () => void;
  onOpenEdit: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onMoveLead: (leadId: string, targetStage: Lead['status']) => void;
  onOpenFollowup: (lead: Lead) => void;
  onOpenConvert: (lead: Lead) => void;
  onCreateOrder: (partyName: string, partyType?: string) => void;
}

const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.504-5.714-1.464L0 24zm6.59-11.666c.214.593.414 1.02.624 1.387.21.367.437.587.77.92.333.333.714.614 1.154.84.44.227.813.347 1.254.407.44.06.793.02 1.18-.087.387-.107.727-.32 1.02-.647.293-.327.467-.714.52-1.127.053-.413.013-.787-.12-1.087-.133-.3-.414-.493-.84-.707-.427-.213-1.007-.497-1.16-.547-.154-.05-.267-.073-.38.093-.113.167-.44.547-.54.667-.1.12-.2.133-.413.027-.214-.107-.907-.333-1.727-1.06-.633-.567-1.06-1.267-1.187-1.48-.127-.213-.013-.327.093-.433.097-.097.213-.247.32-.373.107-.127.14-.213.213-.36.073-.147.037-.28-.017-.387-.053-.107-.44-1.06-.603-1.453-.16-.39-.337-.337-.463-.343-.12-.006-.26-.006-.4-.006-.14 0-.367.053-.56.26-.193.207-.733.717-.733 1.747 0 1.03.75 2.023.853 2.16.103.137 1.474 2.25 3.57 3.153.5.214.887.34 1.19.437.502.16.96.137 1.32.083.403-.06 1.233-.503 1.407-.99.173-.487.173-.903.12-.99-.053-.087-.193-.137-.413-.247z"/>
  </svg>
);

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New Lead',
  CONTACTED: 'Contacted',
  PROPOSAL: 'Proposal Made',
  NEGOTIATION: 'Negotiation',
  WON: 'Won (Converted)',
  LOST: 'Lost',
};

const STAGE_BADGE_STYLES: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  CONTACTED: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  PROPOSAL: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  NEGOTIATION: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  WON: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  LOST: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
};

export const CRMLeadsTab: React.FC<CRMLeadsTabProps> = ({
  leads,
  loading = false,
  canManage,
  salesUsers,
  userRole = '',
  onSelectLead,
  onOpenAdd,
  onOpenEdit,
  onDeleteLead,
  onMoveLead,
  onOpenFollowup,
  onOpenConvert,
  onCreateOrder,
}) => {
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  // Stage counts for quick filter pills
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: leads.length,
      NEW: 0,
      CONTACTED: 0,
      PROPOSAL: 0,
      NEGOTIATION: 0,
      WON: 0,
      LOST: 0,
    };
    leads.forEach((l) => {
      if (counts[l.status] !== undefined) {
        counts[l.status]++;
      }
    });
    return counts;
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.companyName || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q);

      const matchStage = stageFilter === 'ALL' || l.status === stageFilter;
      const matchPriority = priorityFilter === 'ALL' || l.priority === priorityFilter;
      const matchAssignee =
        assigneeFilter === 'ALL' ||
        (assigneeFilter === 'none' ? !l.assignedTo : l.assignedTo === assigneeFilter);

      return matchSearch && matchStage && matchPriority && matchAssignee;
    });
  }, [leads, search, stageFilter, priorityFilter, assigneeFilter]);

  const getWhatsAppLink = (phone: string, leadName: string, companyName?: string) => {
    const pClean = phone.replace(/[^0-9]/g, '');
    const greeting = companyName ? `${leadName} (${companyName})` : leadName;
    const msg = encodeURIComponent(
      `Hello ${greeting}, greetings from BuildPro! We specialize in premium tile adhesives, epoxy grouts, and waterproofing systems. How can we support your project requirements today?`
    );
    return `https://wa.me/${pClean}?text=${msg}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search, Filter Pills & View Switcher */}
      <div className="bg-card p-3.5 rounded-xl border border-border/60 shadow-xs space-y-3">
        {/* Main Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads by contact name, shop, city, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm bg-background font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          {/* Priority & Assignee Selectors */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] h-10 text-xs bg-background">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="HIGH">🔴 High Priority</SelectItem>
                <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                <SelectItem value="LOW">🟢 Low</SelectItem>
              </SelectContent>
            </Select>

            {['SUPERADMIN', 'ADMIN', 'MANAGER', 'DIRECTOR'].includes(userRole.toUpperCase()) && (
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[150px] h-10 text-xs bg-background">
                  <SelectValue placeholder="Assigned Officer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Officers</SelectItem>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {salesUsers.map((u) => (
                    <SelectItem key={u.email} value={u.email}>
                      {u.name || u.email.split('@')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Layout Toggle */}
            <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={cn(
                  'p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all',
                  viewMode === 'CARDS'
                    ? 'bg-background shadow-2xs text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={cn(
                  'p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all',
                  viewMode === 'TABLE'
                    ? 'bg-background shadow-2xs text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Data Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>

            {canManage && (
              <Button
                onClick={onOpenAdd}
                className="h-10 text-xs gap-1.5 font-bold bg-primary text-primary-foreground shrink-0 shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Prospect
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Stage Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-border/30 pt-2.5">
          <button
            type="button"
            onClick={() => setStageFilter('ALL')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all border flex items-center gap-1.5',
              stageFilter === 'ALL'
                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                : 'bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground'
            )}
          >
            <span>All Leads</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1 font-bold">
              {stageCounts.ALL}
            </Badge>
          </button>

          {STAGES.map((s) => {
            const count = stageCounts[s.id] || 0;
            const isSelected = stageFilter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStageFilter(s.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all border flex items-center gap-1.5',
                  isSelected
                    ? 'bg-foreground text-background border-foreground font-bold shadow-xs'
                    : 'bg-background text-foreground/80 border-border/60 hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{s.title}</span>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] py-0 px-1 font-bold', isSelected ? 'bg-background text-foreground' : '')}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Count Status Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> total prospects
          {stageFilter !== 'ALL' && ` in ${STAGE_LABELS[stageFilter] || stageFilter}`}
        </span>
        {(search || stageFilter !== 'ALL' || priorityFilter !== 'ALL' || assigneeFilter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStageFilter('ALL');
              setPriorityFilter('ALL');
              setAssigneeFilter('ALL');
            }}
            className="text-primary hover:underline font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Zero State */}
      {filteredLeads.length === 0 && (
        <Card className="border border-dashed border-border/60 p-12 text-center space-y-3">
          <Store className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
          <h3 className="font-bold text-base text-foreground">No matching leads found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search
              ? `No inquiries match "${search}". Try another term or clear your filters.`
              : 'Start building your sales pipeline by recording new inquiries and dealer prospects.'}
          </p>
          {canManage && (
            <Button onClick={onOpenAdd} className="mt-2 text-xs font-bold gap-1.5">
              <Plus className="w-4 h-4" /> Add First Prospect
            </Button>
          )}
        </Card>
      )}

      {/* MODE 1: RICH CARDS GRID VIEW */}
      {viewMode === 'CARDS' && filteredLeads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredLeads.map((lead) => {
            const phoneClean = (lead.phone || '').replace(/[^0-9]/g, '');
            const hasPhone = !!lead.phone;
            return (
              <Card
                key={lead.id}
                className="border border-border/60 bg-card hover:border-primary/50 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Card Header: Contact & Deal Value */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div
                        onClick={() => onSelectLead(lead)}
                        className="font-bold text-base text-foreground group-hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <User className="w-4 h-4 text-primary shrink-0" />
                        <span>{lead.name}</span>
                      </div>
                      {lead.companyName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                          <span className="font-medium text-foreground/90">{lead.companyName}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Deal Value</div>
                      <div className="text-base font-extrabold text-foreground">
                        ₹{(Number(lead.value) || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Badges: Stage & Priority */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                      {/* 1-Click Stage Dropdown */}
                      <Select
                        value={lead.status}
                        onValueChange={(newStage: Lead['status']) => onMoveLead(lead.id, newStage)}
                        disabled={!canManage}
                      >
                        <SelectTrigger className={cn('h-6 text-[10px] font-bold px-2 py-0 border', STAGE_BADGE_STYLES[lead.status])}>
                          <SelectValue>{STAGE_LABELS[lead.status] || lead.status}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs font-semibold">
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Badge variant="outline" className={cn('text-[9px] font-bold px-1.5 py-0 uppercase', PRIORITY_STYLES[lead.priority])}>
                        {lead.priority}
                      </Badge>
                    </div>

                    {lead.city && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {lead.city}
                      </span>
                    )}
                  </div>

                  {/* Notes / Last remarks */}
                  {lead.notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/20 p-2 rounded-lg border border-border/30">
                      {lead.notes}
                    </p>
                  )}

                  {/* Contact pills */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    {hasPhone ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${lead.phone}`}
                          className="font-mono text-xs text-foreground/80 hover:text-primary flex items-center gap-1 font-semibold"
                        >
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </a>
                      </div>
                    ) : (
                      <span className="text-[11px] italic text-muted-foreground">No phone recorded</span>
                    )}

                    {lead.assignedTo && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={lead.assignedTo}>
                        By: <strong>{lead.assignedTo.split('@')[0]}</strong>
                      </span>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1 flex-wrap">
                    {/* Direct Contact Buttons */}
                    <div className="flex items-center gap-1">
                      {hasPhone && (
                        <>
                          <a
                            href={getWhatsAppLink(lead.phone!, lead.name, lead.companyName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                            title="Chat on WhatsApp (Product Catalog)"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>
                          <a
                            href={`tel:${lead.phone}`}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Call Phone"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => onOpenFollowup(lead)}
                        title="Log Interaction or Set Reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" /> Log
                      </Button>
                    </div>

                    {/* Business Execution Buttons */}
                    <div className="flex items-center gap-1">
                      {lead.status !== 'WON' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2 font-bold gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => onOpenConvert(lead)}
                          title="Convert to Registered Dealer"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Convert
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-[11px] px-2.5 font-bold gap-1 bg-primary text-primary-foreground"
                        onClick={() => onCreateOrder(lead.companyName || lead.name, 'Dealer')}
                        title="Create Order"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODE 2: HIGH-DENSITY PROFESSIONAL DATA TABLE */}
      {viewMode === 'TABLE' && filteredLeads.length > 0 && (
        <Card className="border border-border/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30 text-muted-foreground font-semibold">
                  <th className="text-left px-3.5 py-2.5">Prospect &amp; Shop</th>
                  <th className="text-left px-3.5 py-2.5">Contact Details</th>
                  <th className="text-left px-3.5 py-2.5">Territory / City</th>
                  <th className="text-left px-3.5 py-2.5">Pipeline Value</th>
                  <th className="text-left px-3.5 py-2.5">Pipeline Stage</th>
                  <th className="text-left px-3.5 py-2.5">Priority</th>
                  <th className="text-left px-3.5 py-2.5">Assigned Officer</th>
                  <th className="text-right px-4 py-2.5">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const phoneClean = (lead.phone || '').replace(/[^0-9]/g, '');
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="border-b border-border/40 hover:bg-muted/15 cursor-pointer transition-colors"
                    >
                      {/* Name & Company */}
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          {lead.name}
                        </div>
                        {lead.companyName && (
                          <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                            {lead.companyName}
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-foreground font-semibold">{lead.phone}</span>
                            <a
                              href={getWhatsAppLink(lead.phone, lead.name, lead.companyName)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                              title="WhatsApp"
                            >
                              <WhatsAppIcon className="w-3 h-3" />
                            </a>
                            <a
                              href={`tel:${lead.phone}`}
                              className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                              title="Call"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">None</span>
                        )}
                      </td>

                      {/* City */}
                      <td className="px-3.5 py-3 text-muted-foreground">
                        {lead.city || '—'}
                      </td>

                      {/* Value */}
                      <td className="px-3.5 py-3">
                        <strong className="text-foreground font-extrabold text-sm">
                          ₹{(Number(lead.value) || 0).toLocaleString('en-IN')}
                        </strong>
                      </td>

                      {/* Stage Selector */}
                      <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={lead.status}
                          onValueChange={(newStage: Lead['status']) => onMoveLead(lead.id, newStage)}
                          disabled={!canManage}
                        >
                          <SelectTrigger className={cn('h-6 text-[10px] font-bold px-2 py-0 border w-[130px]', STAGE_BADGE_STYLES[lead.status])}>
                            <SelectValue>{STAGE_LABELS[lead.status] || lead.status}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs font-semibold">
                                {s.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Priority */}
                      <td className="px-3.5 py-3">
                        <Badge variant="outline" className={cn('text-[9px] font-bold px-1.5 py-0 uppercase', PRIORITY_STYLES[lead.priority])}>
                          {lead.priority}
                        </Badge>
                      </td>

                      {/* Assigned Exec */}
                      <td className="px-3.5 py-3 text-muted-foreground">
                        {lead.assignedTo ? lead.assignedTo.split('@')[0] : <span className="italic">Unassigned</span>}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status !== 'WON' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 font-bold text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              onClick={() => onOpenConvert(lead)}
                              title="Convert to Dealer"
                            >
                              <UserCheck className="w-3 h-3 mr-0.5" /> Convert
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-[10px] px-2.5 font-bold bg-primary text-primary-foreground"
                            onClick={() => onCreateOrder(lead.companyName || lead.name, 'Dealer')}
                            title="Create Sales Order"
                          >
                            <ShoppingCart className="w-3 h-3 mr-0.5" /> Order
                          </Button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => onOpenEdit(lead)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Edit Lead"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteLead(lead.id)}
                                className="p-1 rounded text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                title="Archive Lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
