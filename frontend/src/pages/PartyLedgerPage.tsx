import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  CreditCard,
  Building2,
  FileText,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  ShieldAlert,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Filter,
  SlidersHorizontal,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { format } from 'date-fns';

interface PartySummary {
  total_sales_billed: number;
  total_payments_collected: number;
  total_credit_notes: number;
  total_discounts: number;
  total_credits: number;
  current_net_balance: number;
  credit_limit: number;
  payment_modes: {
    CASH: number;
    BANK: number;
    UPI: number;
    CHEQUE: number;
    OTHER: number;
  };
}

interface PartyInfo {
  id: string;
  code: string;
  name: string;
  party_type: 'DEALER' | 'DISTRIBUTOR';
  city?: string;
  phone?: string;
  gst_number?: string;
  credit_limit: number;
  outstanding: number;
  active: boolean;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'SALES' | 'PAYMENT' | 'RETURN' | 'CREDIT_NOTE' | 'DISCOUNT';
  type_label: string;
  voucher_no: string;
  debit: number;
  credit: number;
  running_balance: number;
  narration: string;
  payment_mode?: string;
  status?: string;
  ref_id?: string;
  requested_by_name?: string;
  requested_by_role?: string;
}

interface CNDiscountRequest {
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
  requested_by?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  reviewed_by?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  reviewed_at?: string;
  review_notes?: string;
  accounting_narration?: string;
  created_at: string;
}

export const PartyLedgerPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;

  // Active view parameters
  const paramPartyId = searchParams.get('partyId') || '';
  const paramPartyType = (searchParams.get('partyType') || 'DEALER').toUpperCase() as 'DEALER' | 'DISTRIBUTOR';
  const paramTab = searchParams.get('tab') || (paramPartyId ? 'statement' : 'directory');

  // Parties Directory State
  const [dealers, setDealers] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryTypeFilter, setDirectoryTypeFilter] = useState<'ALL' | 'DEALER' | 'DISTRIBUTOR' | 'OVER_LIMIT'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'outstanding' | 'creditLimit'>('outstanding');

  // Selected Party Statement State
  const [selectedPartyType, setSelectedPartyType] = useState<'DEALER' | 'DISTRIBUTOR'>(paramPartyType);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(paramPartyId);
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const [summary, setSummary] = useState<PartySummary | null>(null);
  const [statement, setStatement] = useState<LedgerEntry[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CNDiscountRequest[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Statement Filters
  const [statementFilterType, setStatementFilterType] = useState<string>('ALL');
  const [statementSearch, setStatementSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');



  // Fetch Parties Master Directory
  const fetchParties = async () => {
    setLoadingParties(true);
    try {
      const [dealersRes, distRes] = await Promise.all([
        api.get('/dealers'),
        api.get('/distributors'),
      ]);

      const dList = dealersRes.data?.data || dealersRes.data?.results || dealersRes.data || [];
      const distList = distRes.data?.data || distRes.data?.results || distRes.data || [];

      setDealers(Array.isArray(dList) ? dList : []);
      setDistributors(Array.isArray(distList) ? distList : []);
    } catch (err) {
      console.error('Failed to load parties:', err);
    } finally {
      setLoadingParties(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  // Fetch Live Ledger Statement for a Party
  const fetchLiveLedger = async (pType: 'DEALER' | 'DISTRIBUTOR', pId: string) => {
    if (!pId) return;
    setLoadingLedger(true);
    try {
      const res = await api.get(`/parties/ledger/${pType}/${encodeURIComponent(pId)}`);
      if (res.data?.success && res.data?.data) {
        setPartyInfo(res.data.data.party);
        setSummary(res.data.data.summary);
        const txList = res.data.data.transactions || res.data.data.statement || [];
        setStatement(Array.isArray(txList) ? txList : []);
        setPendingRequests(res.data.data.pending_requests || []);
      } else {
        toast({
          title: 'Ledger Warning',
          description: res.data?.message || 'Could not load ledger statement.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error Loading Ledger',
        description: err.response?.data?.message || err.message || 'Network error fetching ledger.',
        variant: 'destructive',
      });
    } finally {
      setLoadingLedger(false);
    }
  };

  // Sync state and fetch ledger when URL search params change
  useEffect(() => {
    const pId = searchParams.get('partyId') || '';
    const pType = ((searchParams.get('partyType') || 'DEALER').toUpperCase()) as 'DEALER' | 'DISTRIBUTOR';
    const tab = searchParams.get('tab') || (pId ? 'statement' : 'directory');

    setSelectedPartyId(pId);
    setSelectedPartyType(pType);

    if (pId) {
      fetchLiveLedger(pType, pId);
    } else {
      setPartyInfo(null);
      setStatement([]);
      setSummary(null);
      if (tab === 'statement') {
        // If arrived at tab=statement without a selected party, default gracefully to directory
        setSearchParams({ tab: 'directory' });
      }
    }
  }, [searchParams]);

  // Navigate to Party Statement View
  const handleOpenPartyLedger = (pType: 'DEALER' | 'DISTRIBUTOR', pId: string) => {
    setSelectedPartyType(pType);
    setSelectedPartyId(pId);
    setSearchParams({
      tab: 'statement',
      partyType: pType,
      partyId: pId,
    });
    fetchLiveLedger(pType, pId);
  };

  // Back to Directory View
  const handleBackToDirectory = () => {
    setSelectedPartyId('');
    setPartyInfo(null);
    setStatement([]);
    setSummary(null);
    setSearchParams({ tab: 'directory' });
  };

  // Directory Filtered & Sorted List
  const directoryList = useMemo(() => {
    let combined: any[] = [];

    if (directoryTypeFilter === 'ALL' || directoryTypeFilter === 'DEALER') {
      combined = combined.concat(dealers.map(d => ({ ...d, _type: 'DEALER', _id: d.id || d.dealerCode, _name: d.dealerName || d.dealername, _code: d.dealerCode || d.dealercode })));
    }
    if (directoryTypeFilter === 'ALL' || directoryTypeFilter === 'DISTRIBUTOR') {
      combined = combined.concat(distributors.map(d => ({ ...d, _type: 'DISTRIBUTOR', _id: d.id || d.distributorCode, _name: d.distributorName || d.distributorname, _code: d.distributorCode || d.distributorcode })));
    }

    if (directoryTypeFilter === 'OVER_LIMIT') {
      combined = dealers.concat(distributors).map(d => {
        const isDist = !!d.distributorName || !!d.distributorname;
        return {
          ...d,
          _type: isDist ? 'DISTRIBUTOR' : 'DEALER',
          _id: d.id || d.dealerCode || d.distributorCode,
          _name: d.dealerName || d.dealername || d.distributorName || d.distributorname,
          _code: d.dealerCode || d.dealercode || d.distributorCode || d.distributorcode,
        };
      }).filter(p => (p.outstanding || 0) > (p.creditLimit || p.creditlimit || 0) && (p.creditLimit || p.creditlimit || 0) > 0);
    }

    // Search
    if (directorySearch.trim()) {
      const q = directorySearch.toLowerCase();
      combined = combined.filter(p => {
        const name = (p._name || '').toLowerCase();
        const code = (p._code || '').toLowerCase();
        const city = (p.city || p.area || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        return name.includes(q) || code.includes(q) || city.includes(q) || phone.includes(q);
      });
    }

    // Sort
    combined.sort((a, b) => {
      if (sortBy === 'outstanding') {
        return (b.outstanding || 0) - (a.outstanding || 0);
      }
      if (sortBy === 'creditLimit') {
        return (b.creditLimit || b.creditlimit || 0) - (a.creditLimit || a.creditlimit || 0);
      }
      return (a._name || '').localeCompare(b._name || '');
    });

    return combined;
  }, [dealers, distributors, directoryTypeFilter, directorySearch, sortBy]);

  // Aggregate Metrics for Directory
  const directoryTotals = useMemo(() => {
    let totalOut = 0;
    let overLimitCount = 0;
    const all = dealers.concat(distributors);
    for (const p of all) {
      const out = parseFloat(String(p.outstanding || 0).replace(/[^0-9.-]+/g, '')) || 0;
      const lim = parseFloat(String(p.creditLimit || p.creditlimit || 0).replace(/[^0-9.-]+/g, '')) || 0;
      totalOut += out;
      if (out > lim && lim > 0) overLimitCount++;
    }
    return {
      totalOutstanding: Math.round(totalOut * 100) / 100,
      totalCount: all.length,
      dealersCount: dealers.length,
      distributorsCount: distributors.length,
      overLimitCount,
    };
  }, [dealers, distributors]);

  // Filtered Statement Entries
  const filteredStatement = useMemo(() => {
    return statement.filter(entry => {
      if (statementFilterType !== 'ALL') {
        if (statementFilterType === 'SALES' && entry.type !== 'SALES') return false;
        if (statementFilterType === 'PAYMENTS' && entry.type !== 'PAYMENT') return false;
        if (statementFilterType === 'CREDIT_NOTES' && entry.type !== 'CREDIT_NOTE') return false;
        if (statementFilterType === 'DISCOUNTS' && entry.type !== 'DISCOUNT') return false;
        if (statementFilterType === 'RETURNS' && entry.type !== 'RETURN') return false;
      }

      if (fromDate && entry.date && entry.date < fromDate) return false;
      if (toDate && entry.date && entry.date > toDate) return false;

      if (statementSearch.trim()) {
        const q = statementSearch.toLowerCase();
        const nar = (entry.narration || '').toLowerCase();
        const vch = (entry.voucher_no || '').toLowerCase();
        const mode = (entry.payment_mode || '').toLowerCase();
        if (!nar.includes(q) && !vch.includes(q) && !mode.includes(q)) return false;
      }

      return true;
    });
  }, [statement, statementFilterType, fromDate, toDate, statementSearch]);

  const statementTotals = useMemo(() => {
    let debits = 0;
    let credits = 0;
    for (const item of filteredStatement) {
      debits += item.debit || 0;
      credits += item.credit || 0;
    }
    return {
      debits: Math.round(debits * 100) / 100,
      credits: Math.round(credits * 100) / 100,
      net: Math.round((debits - credits) * 100) / 100,
    };
  }, [filteredStatement]);



  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* ── Main Professional Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Finance & Accounts</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">
              {selectedPartyId ? `${partyInfo?.name || 'Party'} Statement` : 'Party Financial Ledgers'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-primary" />
            Party Financial Ledgers & Statements
          </h1>
        </div>

        {/* Global Action Header Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => navigate('/finance/cn-requests')}
            className="text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
          >
            <Percent className="w-4 h-4 mr-1.5" /> CN & Discount Approvals
          </Button>

          {selectedPartyId ? (
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="text-xs h-9 border-slate-300 dark:border-slate-800"
            >
              <Printer className="w-4 h-4 mr-1.5 text-muted-foreground" /> Print Statement
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (selectedPartyId) fetchLiveLedger(selectedPartyType, selectedPartyId);
              fetchParties();
            }}
            title="Refresh"
            className="rounded-full h-9 w-9"
          >
            <RefreshCw className={`w-4 h-4 ${loadingLedger || loadingParties ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackToDirectory}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              !selectedPartyId && paramTab !== 'cn_requests'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Party Accounts Directory ({directoryTotals.totalCount})
          </button>

          {selectedPartyId && (
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Statement: {partyInfo?.name || 'Selected Party'}
            </button>
          )}
        </div>

        {selectedPartyId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDirectory}
            className="text-xs h-8 text-primary hover:underline font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Accounts List
          </Button>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── VIEW 1: MASTER PARTY ACCOUNTS LIST (DEFAULT LIST TYPE UI) ────────── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {!selectedPartyId && paramTab !== 'cn_requests' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          
          {/* Top Quick Accounting Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>TOTAL RECEIVABLES (DR)</span>
                  <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                </span>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  ₹{directoryTotals.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-muted-foreground">Cumulative debt across all registered parties</p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>REGISTERED ACCOUNTS</span>
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                </span>
                <div className="text-2xl font-black text-foreground">
                  {directoryTotals.totalCount}
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">
                    ({directoryTotals.dealersCount} Dealers, {directoryTotals.distributorsCount} Dist)
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Active dealer & distributor profiles</p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>OVER CREDIT LIMIT</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {directoryTotals.overLimitCount} <span className="text-xs font-normal text-muted-foreground">Accounts</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Parties exceeding authorized credit ceiling</p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs bg-card">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>AUDIT READY</span>
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                </span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  100%
                </div>
                <p className="text-[10px] text-muted-foreground">Real-time debit/credit transaction records</p>
              </CardContent>
            </Card>
          </div>

          {/* Directory Filter & Search Tooling Bar */}
          <Card className="border border-border shadow-xs">
            <CardContent className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground font-semibold mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {[
                  { id: 'ALL', label: `All Accounts (${directoryTotals.totalCount})` },
                  { id: 'DEALER', label: `Dealers (${directoryTotals.dealersCount})` },
                  { id: 'DISTRIBUTOR', label: `Distributors (${directoryTotals.distributorsCount})` },
                  { id: 'OVER_LIMIT', label: `Over Limit (${directoryTotals.overLimitCount})` },
                ].map(pill => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setDirectoryTypeFilter(pill.id as any)}
                    className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                      directoryTypeFilter === pill.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Search & Sort */}
              <div className="flex items-center gap-2">
                <div className="relative w-64 sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by party name, code, city or phone..."
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground text-[11px] whitespace-nowrap">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="h-8 text-xs border border-slate-200 dark:border-slate-800 rounded-md px-2 bg-background font-medium"
                  >
                    <option value="outstanding">Highest Outstanding</option>
                    <option value="name">Alphabetical (Name)</option>
                    <option value="creditLimit">Credit Limit</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Master Accounts Table */}
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Account Code</th>
                    <th className="px-4 py-3 min-w-[200px]">Party Name</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-4 py-3">City / Area</th>
                    <th className="px-4 py-3 text-right">Credit Limit (₹)</th>
                    <th className="px-4 py-3 text-right">Outstanding Balance (₹)</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Accounting Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loadingParties ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                        <p className="font-semibold text-foreground">Loading Party Accounts Directory...</p>
                      </td>
                    </tr>
                  ) : directoryList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        <Building2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="font-semibold text-foreground">No matching party accounts found</p>
                        <p className="text-[11px] mt-0.5">Try adjusting your search query or filter.</p>
                      </td>
                    </tr>
                  ) : (
                    directoryList.map((p) => {
                      const limit = p.creditLimit || p.creditlimit || 0;
                      const out = p.outstanding || 0;
                      const isOver = out > limit && limit > 0;
                      const active = p.active !== false;

                      return (
                        <tr
                          key={p._id}
                          onClick={() => handleOpenPartyLedger(p._type, p._id)}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                            {p._code}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {p._name}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {p.phone && <span>📞 {p.phone}</span>}
                              {p.gst_number || p.gst ? <span> &bull; GST: {p.gst_number || p.gst}</span> : null}
                            </div>
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap">
                            <Badge variant="outline" className={`text-[10px] py-0 font-semibold ${
                              p._type === 'DISTRIBUTOR'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300'
                            }`}>
                              {p._type}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {p.city || p.area || '—'}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-medium text-muted-foreground whitespace-nowrap">
                            {limit > 0 ? `₹${limit.toLocaleString()}` : '—'}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap text-sm">
                            <span className={isOver ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}>
                              ₹{out.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] ml-1 font-semibold text-muted-foreground">Dr</span>
                            {isOver && (
                              <span className="block text-[9px] font-bold text-destructive">OVER LIMIT</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <Badge variant={active ? 'default' : 'destructive'} className="text-[9px] py-0 font-semibold">
                              {active ? 'Active' : 'Blocked'}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleOpenPartyLedger(p._type, p._id)}
                                className="h-7 text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-primary font-semibold px-2.5 shadow-xs"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1 text-blue-400" /> Open Ledger
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/finance/cn-requests/new?partyType=${p._type}&partyId=${p._id}`)}
                                title="Raise CN for this party"
                                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                              >
                                + CN
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── VIEW 2: DETAILED LIVE LEDGER STATEMENT FOR A SELECTED PARTY ──────── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {selectedPartyId && paramTab !== 'cn_requests' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          
          {loadingLedger ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-semibold text-foreground">Compiling Live ERP Transaction Statement...</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aggregating Sales, Payments, Credit Notes & Returns</p>
            </Card>
          ) : !partyInfo ? (
            <Card className="p-12 text-center border-dashed">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-bold text-foreground text-lg">No Party Selected</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Please select a customer from the Accounts Directory below to view their live debit & credit ledger statement.
              </p>
              <Button onClick={handleBackToDirectory} className="mt-4 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Accounts Directory ({directoryTotals.totalCount} Parties)
              </Button>
            </Card>
          ) : (
            <>
              {/* Party Particulars & Corporate Header Card */}
              <div className="bg-card rounded-xl border border-border p-4 md:p-5 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                        {partyInfo.name}
                      </h2>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 text-xs font-semibold">
                        {partyInfo.party_type}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                        {partyInfo.code}
                      </Badge>
                      <Badge variant={partyInfo.active ? 'default' : 'destructive'} className="text-[10px] py-0">
                        {partyInfo.active ? 'Active' : 'Blocked'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-0.5">
                      {partyInfo.city && <span>📍 {partyInfo.city}</span>}
                      {partyInfo.phone && <span>📞 {partyInfo.phone}</span>}
                      {partyInfo.gst_number && <span>🏛️ GSTIN: <span className="font-mono font-medium text-foreground">{partyInfo.gst_number}</span></span>}
                    </div>
                  </div>

                  {/* Actions & Alerts */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/finance/cn-requests/new?partyType=${selectedPartyType}&partyId=${partyInfo.id}`)}
                      className="text-xs h-8 bg-primary text-primary-foreground font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Raise CN / Discount
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBackToDirectory}
                      className="text-xs h-8 border-slate-300 dark:border-slate-800"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Change Party
                    </Button>
                  </div>
                </div>

                {/* Accounting Balances Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">CURRENT OUTSTANDING</span>
                    <div className="text-lg md:text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                      ₹{(summary?.current_net_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-xs font-semibold text-muted-foreground ml-1">Dr</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">TOTAL SALES BILLED (DR)</span>
                    <div className="text-lg md:text-xl font-bold font-mono text-foreground">
                      ₹{(summary?.total_sales_billed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">TOTAL COLLECTIONS (CR)</span>
                    <div className="text-lg md:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{(summary?.total_payments_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">CN &amp; DISCOUNTS (CR)</span>
                    <div className="text-lg md:text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                      ₹{((summary?.total_credit_notes || 0) + (summary?.total_discounts || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statement Filters Bar */}
              <Card className="border border-border shadow-xs">
                <CardContent className="p-3.5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Voucher Type Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground font-semibold mr-1 flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" /> Type:
                      </span>
                      {[
                        { id: 'ALL', label: 'All Vouchers' },
                        { id: 'SALES', label: 'Sales (Dr)' },
                        { id: 'PAYMENTS', label: 'Payments (Cr)' },
                        { id: 'CREDIT_NOTES', label: 'Credit Notes (Cr)' },
                        { id: 'DISCOUNTS', label: 'Discounts (Cr)' },
                        { id: 'RETURNS', label: 'Returns (Cr)' },
                      ].map(pill => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setStatementFilterType(pill.id)}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                            statementFilterType === pill.id
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    {/* Date Range Inputs */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">From:</span>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="h-8 text-xs border border-slate-200 dark:border-slate-800 rounded-md px-2 bg-background font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">To:</span>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="h-8 text-xs border border-slate-200 dark:border-slate-800 rounded-md px-2 bg-background font-mono"
                        />
                      </div>
                      {(fromDate || toDate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setFromDate(''); setToDate(''); }}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search voucher number, invoice, narration, or Request ID..."
                      value={statementSearch}
                      onChange={(e) => setStatementSearch(e.target.value)}
                      className="pl-8 text-xs h-8 bg-slate-50/50 dark:bg-slate-900/50"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tally / Enterprise Grade Statement Table */}
              <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-3 py-3">Voucher Type</th>
                        <th className="px-3 py-3 font-mono">Voucher #</th>
                        <th className="px-4 py-3 min-w-[280px]">Particulars / Narration</th>
                        <th className="px-4 py-3 text-right">Debit (Dr) ₹</th>
                        <th className="px-4 py-3 text-right">Credit (Cr) ₹</th>
                        <th className="px-4 py-3 text-right">Running Balance ₹</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredStatement.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                            <Receipt className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="font-semibold text-foreground">No ledger transactions recorded</p>
                            <p className="text-xs mt-0.5">No entries found matching the filter criteria.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredStatement.map((entry) => {
                          const isSales = entry.type === 'SALES';
                          const isPayment = entry.type === 'PAYMENT';
                          const isCN = entry.type === 'CREDIT_NOTE';
                          const isDisc = entry.type === 'DISCOUNT';
                          const isReturn = entry.type === 'RETURN';

                          return (
                            <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                                {entry.date ? format(new Date(entry.date), 'dd-MMM-yyyy') : '—'}
                              </td>

                              <td className="px-3 py-3 whitespace-nowrap">
                                {isSales && (
                                  <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 text-[10px]">
                                    Sales Invoice
                                  </Badge>
                                )}
                                {isPayment && (
                                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px]">
                                    Payment Receipt
                                  </Badge>
                                )}
                                {isCN && (
                                  <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 text-[10px]">
                                    Credit Note
                                  </Badge>
                                )}
                                {isDisc && (
                                  <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 text-[10px]">
                                    Special Discount
                                  </Badge>
                                )}
                                {isReturn && (
                                  <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 text-[10px]">
                                    Sales Return
                                  </Badge>
                                )}
                              </td>

                              <td className="px-3 py-3 font-mono font-bold text-foreground whitespace-nowrap">
                                {entry.voucher_no}
                              </td>

                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <p className="text-foreground leading-relaxed">{entry.narration}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {entry.payment_mode && (
                                      <span className="inline-block text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                        Mode: {entry.payment_mode}
                                      </span>
                                    )}
                                    {entry.requested_by_name && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                                        <span>Raised by:</span>
                                        <strong className="text-foreground">{entry.requested_by_name}</strong>
                                        {entry.requested_by_role && (
                                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 font-semibold text-purple-800 dark:text-purple-200">
                                            {entry.requested_by_role}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                {entry.debit > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400">
                                    ₹{entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                {entry.credit > 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    ₹{entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                <span className={entry.running_balance >= 0 ? 'text-foreground' : 'text-emerald-600'}>
                                  ₹{Math.abs(entry.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  <span className="text-[10px] ml-1 font-semibold text-muted-foreground">
                                    {entry.running_balance >= 0 ? 'Dr' : 'Cr'}
                                  </span>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredStatement.length > 0 && (
                      <tfoot className="bg-muted/60 font-bold border-t border-border text-foreground">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right uppercase text-[11px] tracking-wider">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-rose-600 dark:text-rose-400 text-sm">
                            ₹{statementTotals.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{statementTotals.credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            ₹{Math.abs(statementTotals.net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="text-[10px] ml-1 text-muted-foreground">
                              {statementTotals.net >= 0 ? 'Dr' : 'Cr'}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}



    </div>
  );
};

export default PartyLedgerPage;
