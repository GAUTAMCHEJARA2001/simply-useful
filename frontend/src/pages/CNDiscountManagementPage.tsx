import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Building2,
  FileText,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  ExternalLink,
  DollarSign,
  Percent,
  Wallet,
  Camera,
} from 'lucide-react';
import { format } from 'date-fns';

export interface CNDiscountRequest {
  id: string;
  request_id: string;
  party_type: 'DEALER' | 'DISTRIBUTOR';
  party_id: string;
  party_name: string;
  request_type: 'CREDIT_NOTE' | 'DISCOUNT';
  amount: number;
  reason: string;
  related_order_id?: string;
  invoice_number?: string;
  photo_url?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by_id?: string;
  requested_by_name?: string;
  requested_by_role?: string;
  requested_by_email?: string;
  requested_by?: {
    id?: string | null;
    name: string;
    email: string;
    role: string;
  };
  reviewed_by_id?: string;
  reviewed_by_name?: string;
  reviewed_by_role?: string;
  reviewed_by_email?: string;
  reviewed_by?: {
    id?: string | null;
    name: string;
    email: string;
    role: string;
  };
  reviewed_at?: string;
  review_notes?: string;
  accounting_narration?: string;
  created_at: string;
}

export const CNDiscountManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;

  // Requests Queue State
  const [requestsList, setRequestsList] = useState<CNDiscountRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsFilterStatus, setRequestsFilterStatus] = useState<string>('ALL');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'ALL' | 'DEALER' | 'DISTRIBUTOR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // SuperAdmin Review Dialog State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequestToReview, setSelectedRequestToReview] = useState<CNDiscountRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch CN & Discount Requests
  const fetchRequestsQueue = async () => {
    setLoadingRequests(true);
    try {
      let url = '/parties/cn-requests';
      if (requestsFilterStatus !== 'ALL') {
        url += `?status=${requestsFilterStatus}`;
      }
      const res = await api.get(url);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setRequestsList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch requests queue:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequestsQueue();
  }, [requestsFilterStatus]);

  // Copy Narration for Accounting Voucher in Tally/Busy
  const handleCopyNarration = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: 'Narration Copied!',
      description: 'Copied Request ID & narration for Tally/Busy accounting voucher.',
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const openReviewModal = (req: CNDiscountRequest, action: 'APPROVE' | 'REJECT') => {
    setSelectedRequestToReview(req);
    setReviewAction(action);
    setReviewNotes('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequestToReview) return;
    setSubmittingReview(true);
    try {
      const res = await api.patch(`/parties/cn-requests/${selectedRequestToReview.id}/review`, {
        action: reviewAction,
        review_notes: reviewNotes.trim(),
      });

      if (res.data?.success) {
        toast({
          title: reviewAction === 'APPROVE' ? 'Approved & Credited!' : 'Request Rejected',
          description: res.data.data?.message || `Request ${selectedRequestToReview.request_id} processed.`,
        });
        setReviewModalOpen(false);
        setSelectedRequestToReview(null);
        fetchRequestsQueue();
      } else {
        toast({ title: 'Review Failed', description: res.data?.message || 'Error updating request', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Review Error',
        description: err.response?.data?.message || err.message || 'Failed to submit review.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return requestsList.filter((req) => {
      if (partyTypeFilter !== 'ALL' && req.party_type !== partyTypeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const rid = (req.request_id || '').toLowerCase();
        const pName = (req.party_name || '').toLowerCase();
        const reason = (req.reason || '').toLowerCase();
        const inv = (req.invoice_number || '').toLowerCase();
        const ord = (req.related_order_id || '').toLowerCase();
        if (!rid.includes(q) && !pName.includes(q) && !reason.includes(q) && !inv.includes(q) && !ord.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [requestsList, partyTypeFilter, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let approvedCount = 0;
    let approvedAmount = 0;
    let rejectedCount = 0;

    for (const r of requestsList) {
      const amt = Number(r.amount) || 0;
      if (r.status === 'PENDING') {
        pendingCount++;
        pendingAmount += amt;
      } else if (r.status === 'APPROVED') {
        approvedCount++;
        approvedAmount += amt;
      } else if (r.status === 'REJECTED') {
        rejectedCount++;
      }
    }

    return {
      total: requestsList.length,
      pendingCount,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      approvedCount,
      approvedAmount: Math.round(approvedAmount * 100) / 100,
      rejectedCount,
    };
  }, [requestsList]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* ── Main Professional Navigation Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Finance & Accounts</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">Credit Notes & Special Discounts</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Percent className="w-7 h-7 text-primary" />
            CN & Discount Approvals Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage Credit Notes & Special Discounts requests. SuperAdmin reviews, approves and synchronizes live accounting credit entries.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => navigate('/finance/cn-requests/new')}
            className="action-button shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" /> + Raise CN / Discount
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/finance/ledger')}
            className="text-xs h-9 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold"
          >
            <Wallet className="w-4 h-4 mr-1.5" /> Party Financial Ledgers
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchRequestsQueue}
            title="Refresh"
            className="rounded-full h-9 w-9"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>PENDING SUPERADMIN APPROVAL</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {metrics.pendingCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (₹{metrics.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Requests waiting for SuperAdmin examination</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>APPROVED & CREDITED</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{metrics.approvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground">{metrics.approvedCount} requests approved & credited</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>REJECTED REQUESTS</span>
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
            </span>
            <div className="text-2xl font-black text-foreground">
              {metrics.rejectedCount} <span className="text-xs font-normal text-muted-foreground">Requests</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Requests declined during audit</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>TOTAL REQUESTS LOGGED</span>
              <FileText className="w-3.5 h-3.5 text-blue-500" />
            </span>
            <div className="text-2xl font-black text-foreground">
              {metrics.total} <span className="text-xs font-normal text-muted-foreground">Total records</span>
            </div>
            <p className="text-[10px] text-muted-foreground">All historical CN & Discount requests</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Data Table Card ── */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Audit & Approvals Queue
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                SuperAdmin review workflow. Approving immediately credits party balance and issues unique Request ID for Tally/Busy narration.
              </p>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-background border border-border rounded-lg p-0.5">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestsFilterStatus(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      requestsFilterStatus === st
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st}
                  </button>
                ))}
              </div>

              <div className="flex items-center bg-background border border-border rounded-lg p-0.5">
                {(['ALL', 'DEALER', 'DISTRIBUTOR'] as const).map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setPartyTypeFilter(pt)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      partyTypeFilter === pt
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pt === 'ALL' ? 'All Parties' : pt === 'DEALER' ? 'Dealers' : 'Distributors'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="pt-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Request ID, Party Name, Reason, Invoice #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background border-border/80"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground text-left">
                  <th className="p-3 w-32">Request ID</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3 w-28">Type</th>
                  <th className="p-3 text-right w-28">Amount</th>
                  <th className="p-3">Reason / Justification</th>
                  <th className="p-3">Invoice / Order Ref</th>
                  <th className="p-3">Requested By</th>
                  <th className="p-3 text-center w-28">Status</th>
                  <th className="p-3 text-right w-44">{isSuperAdmin ? 'SuperAdmin Action' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading Credit Note & Discount requests...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No requests found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((req) => {
                    const isPending = req.status === 'PENDING';
                    const isApproved = req.status === 'APPROVED';
                    const isRejected = req.status === 'REJECTED';
                    const creatorName = req.requested_by?.name || req.requested_by_name || 'Admin';
                    const creatorRole = req.requested_by?.role || req.requested_by_role || '';
                    const creatorEmail = req.requested_by?.email || req.requested_by_email || '';

                    return (
                      <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-foreground">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-border/60">
                            {req.request_id}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {req.party_name}
                            <button
                              onClick={() => navigate(`/finance/ledger?partyType=${req.party_type}&partyId=${req.party_id}`)}
                              title="Open Party Ledger"
                              className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {req.party_type} • ID: {req.party_id?.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="p-3">
                          {req.request_type === 'CREDIT_NOTE' ? (
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 text-[10px] font-bold">
                              Credit Note
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 text-[10px] font-bold">
                              Special Discount
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{Number(req.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 max-w-xs">
                          <p className="line-clamp-2 text-foreground">{req.reason}</p>
                          {req.review_notes && (
                            <p className="text-[10px] text-muted-foreground italic mt-0.5">
                              Reviewer note: {req.review_notes}
                            </p>
                          )}
                          {req.photo_url && (
                            <a
                              href={req.photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline mt-1 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20"
                            >
                              <Camera className="w-3 h-3 text-primary" /> View Proof / Calculation
                            </a>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {req.invoice_number ? (
                            <div>Inv: {req.invoice_number}</div>
                          ) : req.related_order_id ? (
                            <div>Ord: {req.related_order_id}</div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground text-xs">
                              {creatorName}
                            </span>
                            {creatorRole && (
                              <Badge
                                variant="outline"
                                className={`text-[9px] py-0 px-1 font-semibold uppercase ${
                                  creatorRole.includes('SUPERADMIN')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200'
                                    : creatorRole.includes('ADMIN')
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                                }`}
                              >
                                {creatorRole}
                              </Badge>
                            )}
                          </div>
                          {creatorEmail && creatorEmail !== creatorName && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[170px]" title={creatorEmail}>
                              {creatorEmail}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono">
                            {req.created_at ? format(new Date(req.created_at), 'dd MMM yyyy, hh:mm a') : '—'}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {isPending && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 text-[10px] font-bold">
                              <Clock className="w-3 h-3 mr-1" /> Pending
                            </Badge>
                          )}
                          {isApproved && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 text-[10px] font-bold">
                              <XCircle className="w-3 h-3 mr-1" /> Rejected
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isSuperAdmin && isPending && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => openReviewModal(req, 'APPROVE')}
                                  className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReviewModal(req, 'REJECT')}
                                  className="h-7 px-2.5 text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200"
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {isApproved && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleCopyNarration(
                                    req.accounting_narration ||
                                      `SuperAdmin Approved ${req.request_type} Ref: ${req.request_id} for ${req.party_name}. Reason: ${req.reason}`,
                                    req.id
                                  )
                                }
                                title="Copy voucher narration for Tally/Busy"
                                className="h-7 px-2 text-[10px] font-semibold border-slate-300 dark:border-slate-700"
                              >
                                {copiedId === req.id ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1 text-emerald-600" /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" /> Copy Narration
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── SuperAdmin Examination & Review Modal ── */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {reviewAction === 'APPROVE' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600" />
              )}
              {reviewAction === 'APPROVE' ? 'Examine & Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {reviewAction === 'APPROVE'
                ? 'Approving will immediately deduct this amount from party outstanding balance and credit their live ledger.'
                : 'Rejecting will flag this request as declined. No changes will be made to the ledger.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequestToReview && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/80 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Request ID:</span>
                  <span className="font-mono font-bold text-foreground">{selectedRequestToReview.request_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Party:</span>
                  <span className="font-semibold text-foreground">{selectedRequestToReview.party_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Amount:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{Number(selectedRequestToReview.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Type:</span>
                  <span className="font-semibold">{selectedRequestToReview.request_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Requested By:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {selectedRequestToReview.requested_by?.name || selectedRequestToReview.requested_by_name || 'Admin'}
                    {(selectedRequestToReview.requested_by?.role || selectedRequestToReview.requested_by_role) && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold uppercase">
                        {selectedRequestToReview.requested_by?.role || selectedRequestToReview.requested_by_role}
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/60">
                  <span className="font-medium">Reason: </span>
                  {selectedRequestToReview.reason}
                </div>

                {selectedRequestToReview.photo_url && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-primary" />
                      Attached Proof / Calculation Sheet:
                    </span>
                    <div className="relative group rounded-lg overflow-hidden border border-border bg-slate-950/5 max-h-56 flex items-center justify-center p-1">
                      <img
                        src={selectedRequestToReview.photo_url}
                        alt="Calculation Proof"
                        className="max-h-52 w-auto object-contain rounded-md"
                      />
                      <a
                        href={selectedRequestToReview.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] px-2 py-1 rounded font-semibold flex items-center gap-1 hover:bg-slate-900 shadow-sm backdrop-blur-xs"
                      >
                        <ExternalLink className="w-3 h-3" /> View Full Image
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reviewNotes" className="text-xs font-semibold">
                  Audit Notes / Narration (Optional)
                </Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="e.g., Verified return goods receipt / Agreed in sales negotiation..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewModalOpen(false)}
              disabled={submittingReview}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className={`text-xs font-bold ${
                reviewAction === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {submittingReview ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing...
                </>
              ) : reviewAction === 'APPROVE' ? (
                'Confirm & Credit Party'
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CNDiscountManagementPage;
