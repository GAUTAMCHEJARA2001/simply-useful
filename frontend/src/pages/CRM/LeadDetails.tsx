import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lead } from './PipelineBoard';
import { leadService } from '@/api/services/lead.service';
import { Phone, Mail, Building2, Calendar, DollarSign, Clock, MessageSquare, ShieldAlert, Award, RefreshCw, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LeadDetailsProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  users: any[]; // Sales users for assignment
  canManage: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New Lead',
  CONTACTED: 'Contacted',
  PROPOSAL: 'Proposal Made',
  NEGOTIATION: 'Negotiation',
  WON: 'Won (Converted)',
  LOST: 'Lost',
};

const STAGE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  NEW: 'outline',
  CONTACTED: 'secondary',
  PROPOSAL: 'secondary',
  NEGOTIATION: 'secondary',
  WON: 'default',
  LOST: 'destructive',
};

const WhatsAppIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.504-5.714-1.464L0 24zm6.59-11.666c.214.593.414 1.02.624 1.387.21.367.437.587.77.92.333.333.714.614 1.154.84.44.227.813.347 1.254.407.44.06.793.02 1.18-.087.387-.107.727-.32 1.02-.647.293-.327.467-.714.52-1.127.053-.413.013-.787-.12-1.087-.133-.3-.414-.493-.84-.707-.427-.213-1.007-.497-1.16-.547-.154-.05-.267-.073-.38.093-.113.167-.44.547-.54.667-.1.12-.2.133-.413.027-.214-.107-.907-.333-1.727-1.06-.633-.567-1.06-1.267-1.187-1.48-.127-.213-.013-.327.093-.433.097-.097.213-.247.32-.373.107-.127.14-.213.213-.36.073-.147.037-.28-.017-.387-.053-.107-.44-1.06-.603-1.453-.16-.39-.337-.337-.463-.343-.12-.006-.26-.006-.4-.006-.14 0-.367.053-.56.26-.193.207-.733.717-.733 1.747 0 1.03.75 2.023.853 2.16.103.137 1.474 2.25 3.57 3.153.5.214.887.34 1.19.437.502.16.96.137 1.32.083.403-.06 1.233-.503 1.407-.99.173-.487.173-.903.12-.99-.053-.087-.193-.137-.413-.247z"/>
  </svg>
);

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, open, onClose, onRefresh, users, canManage }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const SALES_ONLY_ROLES = ['SALES', 'SALES_EXECUTIVE', 'SALES_OFFICER', 'SALES OFFICER'];
  const isSalesOfficer = SALES_ONLY_ROLES.includes((user?.role || '').toUpperCase());
  
  // Follow-up state
  const [followupType, setFollowupType] = useState<'CALL' | 'EMAIL' | 'VISIT' | 'MEETING'>('CALL');
  const [followupNotes, setFollowupNotes] = useState('');
  const [nextDate, setNextDate] = useState('');

  // Edit fields state
  const [assignedToId, setAssignedToId] = useState('');
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  if (!lead) return null;

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupNotes.trim()) {
      toast({ title: 'Missing notes', description: 'Please enter outcome notes.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await leadService.addFollowup(lead.id, followupType, followupNotes, nextDate || undefined);
      if (res.data?.success) {
        toast({ title: 'Follow-up logged', description: 'Activity outcome has been recorded.' });
        setFollowupNotes('');
        setNextDate('');
        onRefresh();
      }
    } catch (err: any) {
      toast({
        title: 'Error saving activity',
        description: err.response?.data?.message || 'Server error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignee = async (value: string) => {
    setUpdatingAssignee(true);
    try {
      const res = await leadService.update(lead.id, { assignedTo: value || null });
      if (res.data?.success) {
        toast({ title: 'Assignee updated', description: 'Sales officer has been changed.' });
        onRefresh();
      }
    } catch (err: any) {
      toast({
        title: 'Error updating assignee',
        description: err.response?.data?.message || 'Failed to update',
        variant: 'destructive',
      });
    } finally {
      setUpdatingAssignee(false);
    }
  };

  const handleConvertDealer = async () => {
    if (!lead.phone) {
      toast({
        title: 'Conversion Failed',
        description: 'Lead must have a valid phone number registered before active Dealer conversion.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await leadService.convertToDealer(lead.id);
      if (res.data?.success) {
        toast({
          title: 'CONVERTED SUCCESSFULLY!',
          description: `Dealer record created. Code: ${res.data.data.dealerCode}`,
          variant: 'default',
        });
        onRefresh();
        onClose();
      }
    } catch (err: any) {
      toast({
        title: 'Conversion Failed',
        description: err.response?.data?.message || 'Conflict during Dealer conversion.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsLost = async () => {
    setLoading(true);
    try {
      const res = await leadService.moveStage(lead.id, 'LOST');
      if (res.data?.success) {
        toast({
          title: 'Lead Marked as Lost',
          description: `${lead.name} has been moved to Lost stage.`,
        });
        onRefresh();
        onClose();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to update',
        description: err.response?.data?.message || 'Failed to mark as lost.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (val: string) => {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Convert histories and stage histories
  const followups = (lead as any).history || [];
  const stageHistory = (lead as any).stageHistory || [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" aria-describedby="lead-desc">
        <SheetHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Badge variant={STAGE_VARIANTS[lead.status] || 'outline'} className="text-xs px-2.5 py-0.5 font-semibold">
              {STAGE_LABELS[lead.status] || lead.status}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">ID: {lead.id}</span>
          </div>
          <SheetTitle className="text-xl font-extrabold text-foreground flex items-center gap-2 mt-2">
            {lead.name}
          </SheetTitle>
          <SheetDescription id="lead-desc">
            {lead.companyName ? `Company: ${lead.companyName}` : 'Lead details and action triggers'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Action Trigger Card - CONVERT TO DEALER */}
          {lead.status !== 'WON' && lead.status !== 'LOST' && canManage && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex gap-2.5 items-start">
                  <Award className="w-5 h-5 text-primary shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Close Deal & Convert to Dealer</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This will automatically create a fully operational Dealer record in the ERP under the company scopes, flag this Lead as Won, and write audit history logs.
                    </p>
                  </div>
                </div>
                {!lead.phone && (
                  <div className="flex gap-1.5 items-center text-xs text-destructive bg-destructive/10 p-2 rounded">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>A phone number is required on this lead before converting to a dealer!</span>
                  </div>
                )}
                <Button
                  className="w-full mt-1 action-button bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  disabled={loading || !lead.phone}
                  onClick={handleConvertDealer}
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                  Convert to Active Dealer
                </Button>
                <Button
                  className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 text-xs rounded-lg shadow-sm border border-rose-500/10 flex items-center justify-center transition-all"
                  disabled={loading}
                  onClick={handleMarkAsLost}
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                  Mark Lead as Lost
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-border/40">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Contact Details</span>
              <div className="space-y-1.5 pt-1">
                {lead.phone && (
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors text-foreground/90 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {lead.phone}
                    </a>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 rounded-full hover:bg-emerald-500/20 transition-all border border-emerald-500/15"
                      title="Send WhatsApp message"
                    >
                      <WhatsAppIcon className="w-3 h-3" /> WhatsApp
                    </a>
                  </div>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 hover:text-primary transition-colors text-foreground/90 truncate">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {lead.email}
                  </a>
                )}
                {lead.companyName && (
                  <div className="flex items-center gap-2 text-foreground/90">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> {lead.companyName}
                  </div>
                )}
                {(lead.city || lead.state || lead.pincode) && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">
                    <span className="font-bold uppercase text-[9px] tracking-wider text-muted-foreground/75 mt-0.5">Address:</span>
                    <span className="text-foreground/90 font-medium">
                      {[lead.city, lead.state, lead.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Financial & Scope</span>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> ₹{(Number(lead.value) || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-muted-foreground">
                  Source: <span className="font-semibold text-foreground/80">{lead.source || 'N/A'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: <span className="font-semibold text-foreground/80">{new Date(lead.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Assignee / Sales Manager Box */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Sales Executive</Label>
            {canManage && !isSalesOfficer ? (
              <Select defaultValue={lead.assignedTo || ''} onValueChange={handleUpdateAssignee} disabled={updatingAssignee}>
                <SelectTrigger className="w-full bg-background border-border/50">
                  <SelectValue placeholder="Unassigned - Select Sales Executive" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm font-semibold text-foreground bg-muted/30 p-2.5 rounded border border-border/30">
                {users.find(u => u.email === lead.assignedTo)?.name || lead.assignedTo || 'Unassigned'}
              </div>
            )}
          </div>

          {/* Lead Notes */}
          {lead.notes && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primary Requirements</Label>
              <div className="text-sm text-foreground bg-muted/40 p-3 rounded-lg border border-border/30 whitespace-pre-wrap">
                {lead.notes}
              </div>
            </div>
          )}

          {/* Follow-up Logger Form */}
          {lead.status !== 'WON' && lead.status !== 'LOST' && (
            <form onSubmit={handleAddFollowup} className="space-y-4 border-t border-border/40 pt-6">
              <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" /> Log Activity / Follow-up
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Activity Type</Label>
                  <Select value={followupType} onValueChange={(v: any) => setFollowupType(v)}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL">📞 Phone Call</SelectItem>
                      <SelectItem value="EMAIL">📧 Email Sent</SelectItem>
                      <SelectItem value="VISIT">🚗 On-site Visit</SelectItem>
                      <SelectItem value="MEETING">🤝 Office Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Next Action Date</Label>
                  <Input type="datetime-local" className="bg-background" value={nextDate} onChange={e => setNextDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Outcome Notes *</Label>
                <Textarea
                  placeholder="Record what was discussed and the next action requirements..."
                  value={followupNotes}
                  onChange={e => setFollowupNotes(e.target.value)}
                  className="bg-background resize-none min-h-[80px]"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full action-button">
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : 'Log Activity'}
              </Button>
            </form>
          )}

          {/* Activity Timeline / History */}
          <div className="space-y-4 border-t border-border/40 pt-6">
            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" /> Activity Timeline
            </h4>
            <div className="space-y-4 relative pl-4 border-l border-border/60 ml-2">
              {followups.map((act: any, idx: number) => (
                <div key={act.id || idx} className="relative group">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background group-hover:scale-125 transition-transform" />
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-semibold py-0">
                      {act.type}
                    </Badge>
                    <span>{formatDateTime(act.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground mt-1 bg-muted/20 p-2.5 rounded border border-border/20 whitespace-pre-wrap">
                    {act.notes}
                  </p>
                  {act.nextFollowupDate && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5" /> Next: {formatDateTime(act.nextFollowupDate)}
                    </div>
                  )}
                </div>
              ))}

              {stageHistory.map((hist: any, idx: number) => (
                <div key={hist.id || idx} className="relative group">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background group-hover:scale-125 transition-transform" />
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Stage Shifted</span>
                    <span>{formatDateTime(hist.changedAt)}</span>
                  </div>
                  <p className="text-xs text-foreground/80 mt-1">
                    Moved from <span className="font-semibold">{hist.oldStatus}</span> to <span className="font-bold text-foreground">{hist.newStatus}</span> by <span className="font-semibold">{hist.changedBy || 'System'}</span>
                  </p>
                </div>
              ))}

              {followups.length === 0 && stageHistory.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 italic">No timeline logs found on this lead.</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetails;
