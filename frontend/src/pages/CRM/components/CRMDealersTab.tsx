import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Store, Search, Phone, ShoppingCart, CreditCard, FileText,
  AlertCircle, CheckCircle2, AlertTriangle, Clock, ArrowUpRight, ShieldCheck, ShieldAlert,
  Users, Activity, Sparkles
} from 'lucide-react';
import LedgerModal from '@/pages/InventoryManagement/modals/LedgerModal';
import { cn } from '@/lib/utils';

export interface DealerItem {
  id: string;
  code: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  contact_person: string;
  brand: string;
  distributor_name: string;
  credit_limit: number;
  outstanding: number;
  available_credit: number;
  utilization_pct: number;
  credit_status: 'SAFE' | 'WARNING' | 'BLOCKED';
  payment_clearance: 'CLEARED' | 'APPROVAL_REQUIRED' | 'PAYMENT_DUE';
  last_order_date: string | null;
  last_order_amount: number;
  days_since_last_order: number | null;
  activity_status: 'ACTIVE' | 'REORDER_DUE' | 'DORMANT';
}

interface CRMDealersTabProps {
  dealers: DealerItem[];
  summary: {
    total_dealers: number;
    active_dealers: number;
    reorder_due_dealers: number;
    dormant_dealers: number;
    blocked_dealers: number;
    near_limit_dealers: number;
    total_outstanding: number;
    total_credit_limit: number;
    total_available_credit: number;
  };
  loading?: boolean;
}

const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.504-5.714-1.464L0 24zm6.59-11.666c.214.593.414 1.02.624 1.387.21.367.437.587.77.92.333.333.714.614 1.154.84.44.227.813.347 1.254.407.44.06.793.02 1.18-.087.387-.107.727-.32 1.02-.647.293-.327.467-.714.52-1.127.053-.413.013-.787-.12-1.087-.133-.3-.414-.493-.84-.707-.427-.213-1.007-.497-1.16-.547-.154-.05-.267-.073-.38.093-.113.167-.44.547-.54.667-.1.12-.2.133-.413.027-.214-.107-.907-.333-1.727-1.06-.633-.567-1.06-1.267-1.187-1.48-.127-.213-.013-.327.093-.433.097-.097.213-.247.32-.373.107-.127.14-.213.213-.36.073-.147.037-.28-.017-.387-.053-.107-.44-1.06-.603-1.453-.16-.39-.337-.337-.463-.343-.12-.006-.26-.006-.4-.006-.14 0-.367.053-.56.26-.193.207-.733.717-.733 1.747 0 1.03.75 2.023.853 2.16.103.137 1.474 2.25 3.57 3.153.5.214.887.34 1.19.437.502.16.96.137 1.32.083.403-.06 1.233-.503 1.407-.99.173-.487.173-.903.12-.99-.053-.087-.193-.137-.413-.247z"/>
  </svg>
);

export const CRMDealersTab: React.FC<CRMDealersTabProps> = ({
  dealers = [],
  summary,
  loading = false,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  // Quadrant matrix filter:
  // ALL: All dealers
  // ACTIVE_PAID: Purchasing recently & safe credit
  // NOT_PAYING: Outstanding > 0 or credit blocked
  // NOT_PURCHASING: Has safe credit, but stopped ordering (30-60d reorder due)
  // DORMANT: >60 days inactive
  const [matrixFilter, setMatrixFilter] = useState<'ALL' | 'ACTIVE_PAID' | 'NOT_PAYING' | 'NOT_PURCHASING' | 'DORMANT'>('ALL');

  // Ledger modal state
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerTarget, setLedgerTarget] = useState('');

  const openLedger = (partyCode: string) => {
    setLedgerTarget(partyCode);
    setLedgerOpen(true);
  };

  const handleCreateOrder = (dealer: DealerItem) => {
    navigate('/sales/order', {
      state: {
        partyName: dealer.name,
        partyType: 'Dealer',
        dealerCode: dealer.code,
      }
    });
  };

  const handleCollectPayment = (dealer: DealerItem) => {
    navigate('/sales/payments/new', {
      state: {
        partyName: dealer.name,
        partyType: 'Dealer',
        amount: dealer.outstanding > 0 ? dealer.outstanding : undefined,
      }
    });
  };

  // Compute quadrant matrix counts
  const matrixCounts = useMemo(() => {
    let activePaid = 0;
    let notPaying = 0;
    let notPurchasing = 0;
    let dormant = 0;

    dealers.forEach(d => {
      const isOwed = Number(d.outstanding || 0) > 0 || d.credit_status === 'BLOCKED' || d.credit_status === 'WARNING';
      const isRecentBuyer = d.activity_status === 'ACTIVE';
      const isReorderDue = d.activity_status === 'REORDER_DUE';
      const isDormant = d.activity_status === 'DORMANT';

      if (isOwed) {
        notPaying++;
      }
      if (isRecentBuyer && d.credit_status === 'SAFE') {
        activePaid++;
      }
      if (isReorderDue && d.credit_status === 'SAFE') {
        notPurchasing++;
      }
      if (isDormant) {
        dormant++;
      }
    });

    return {
      all: dealers.length,
      activePaid,
      notPaying,
      notPurchasing,
      dormant,
    };
  }, [dealers]);

  const filteredDealers = useMemo(() => {
    return dealers.filter((d) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        (d.phone || '').includes(q) ||
        (d.contact_person || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (matrixFilter === 'ACTIVE_PAID') {
        return d.activity_status === 'ACTIVE' && d.credit_status === 'SAFE';
      }
      if (matrixFilter === 'NOT_PAYING') {
        return Number(d.outstanding || 0) > 0 || d.credit_status === 'BLOCKED' || d.credit_status === 'WARNING';
      }
      if (matrixFilter === 'NOT_PURCHASING') {
        return d.activity_status === 'REORDER_DUE' && d.credit_status === 'SAFE';
      }
      if (matrixFilter === 'DORMANT') {
        return d.activity_status === 'DORMANT';
      }

      return true;
    });
  }, [dealers, search, matrixFilter]);

  // Smart Context-Aware WhatsApp Message Generator
  const getSmartWhatsAppLink = (dealer: DealerItem) => {
    const pClean = (dealer.phone || '').replace(/[^0-9]/g, '');
    let msg = '';

    if (dealer.outstanding > 0) {
      // Payment Collection message
      msg = `Hello ${dealer.name}, greetings from BuildPro! Kindly note your pending account balance is ₹${Number(dealer.outstanding).toLocaleString('en-IN')}. Please arrange payment or share remittance slip so we can keep your dispatches smooth.`;
    } else if (dealer.days_since_last_order !== null && dealer.days_since_last_order >= 30) {
      // Reorder replenishment message
      msg = `Hello ${dealer.name}, greetings from BuildPro! It has been ${dealer.days_since_last_order} days since your last order. We have fresh batches of Tile Adhesive, Epoxy Grout & Waterproofing ready for immediate dispatch. What can we book for your counter today?`;
    } else {
      // Regular customer check-in
      msg = `Hello ${dealer.name}, greetings from BuildPro! Checking in to see if you need replenishment stock of Tile Adhesive or Waterproofing this week?`;
    }

    return `https://wa.me/${pClean}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Explanatory Intelligence Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-4 rounded-xl border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Dealer Purchase &amp; Payment Intelligence Matrix
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instantly see who purchases regularly, who owes pending payments, and who has stopped purchasing so your sales officers know exactly what action to take.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            🟢 {matrixCounts.activePaid} Regular Buyers
          </Badge>
          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-bold">
            🔴 {matrixCounts.notPaying} Owes Payment
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
            🟡 {matrixCounts.notPurchasing} Reorders Due
          </Badge>
        </div>
      </div>

      {/* 2. Quick Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 border-border/50">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Assigned Counters</div>
          <div className="text-xl font-bold mt-1 text-foreground flex items-baseline gap-1">
            {summary.total_dealers}
            <span className="text-xs text-muted-foreground font-normal">parties</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {summary.active_dealers} active this month
          </div>
        </Card>

        <Card className="p-3 border-emerald-500/30 bg-emerald-500/5">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Regular &amp; Paid</div>
          <div className="text-xl font-extrabold mt-1 text-emerald-700 dark:text-emerald-400">
            {matrixCounts.activePaid}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">purchasing &amp; safe</div>
        </Card>

        <Card className="p-3 border-rose-500/30 bg-rose-500/5">
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Owes Payment</div>
          <div className="text-xl font-extrabold mt-1 text-rose-600">
            {matrixCounts.notPaying}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">₹{summary.total_outstanding.toLocaleString('en-IN')} debt</div>
        </Card>

        <Card className="p-3 border-amber-500/30 bg-amber-500/5">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Stopped Buying</div>
          <div className="text-xl font-extrabold mt-1 text-amber-700 dark:text-amber-400">
            {matrixCounts.notPurchasing}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">30-60d reorder due</div>
        </Card>

        <Card className="p-3 border-border/50">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Dormant Accounts</div>
          <div className="text-xl font-bold mt-1 text-foreground">
            {matrixCounts.dormant}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">&gt;60 days inactive</div>
        </Card>

        <Card className="p-3 border-emerald-500/20 bg-emerald-500/5">
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Safe Headroom</div>
          <div className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">
            ₹{summary.total_available_credit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">available credit</div>
        </Card>
      </div>

      {/* 3. Quadrant Filter Chips & Search Bar */}
      <div className="bg-card p-3.5 rounded-xl border border-border/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search dealer by name, code, city, phone..."
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

          <span className="text-xs text-muted-foreground hidden sm:inline">
            Showing <strong>{filteredDealers.length}</strong> of <strong>{dealers.length}</strong> counters
          </span>
        </div>

        {/* 4 Quadrant Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-border/40">
          <Button
            type="button"
            size="sm"
            variant={matrixFilter === 'ALL' ? 'default' : 'outline'}
            className="h-8 text-xs font-semibold px-2.5 shrink-0"
            onClick={() => setMatrixFilter('ALL')}
          >
            All Counters ({matrixCounts.all})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={matrixFilter === 'ACTIVE_PAID' ? 'default' : 'outline'}
            className={cn(
              "h-8 text-xs font-bold px-2.5 shrink-0 gap-1",
              matrixFilter === 'ACTIVE_PAID'
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            )}
            onClick={() => setMatrixFilter(matrixFilter === 'ACTIVE_PAID' ? 'ALL' : 'ACTIVE_PAID')}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 Regular Buyers &amp; Cleared ({matrixCounts.activePaid})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={matrixFilter === 'NOT_PAYING' ? 'default' : 'outline'}
            className={cn(
              "h-8 text-xs font-bold px-2.5 shrink-0 gap-1",
              matrixFilter === 'NOT_PAYING'
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            )}
            onClick={() => setMatrixFilter(matrixFilter === 'NOT_PAYING' ? 'ALL' : 'NOT_PAYING')}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> 🔴 Owes Payment / Not Paying ({matrixCounts.notPaying})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={matrixFilter === 'NOT_PURCHASING' ? 'default' : 'outline'}
            className={cn(
              "h-8 text-xs font-bold px-2.5 shrink-0 gap-1",
              matrixFilter === 'NOT_PURCHASING'
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            )}
            onClick={() => setMatrixFilter(matrixFilter === 'NOT_PURCHASING' ? 'ALL' : 'NOT_PURCHASING')}
          >
            <Clock className="w-3.5 h-3.5" /> 🟡 Stopped Buying / Reorder Due ({matrixCounts.notPurchasing})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={matrixFilter === 'DORMANT' ? 'default' : 'outline'}
            className="h-8 text-xs font-semibold px-2.5 shrink-0 text-muted-foreground"
            onClick={() => setMatrixFilter(matrixFilter === 'DORMANT' ? 'ALL' : 'DORMANT')}
          >
            💤 Dormant (&gt;60d) ({matrixCounts.dormant})
          </Button>
        </div>
      </div>

      {/* 4. Dealers Table */}
      <Card className="border border-border/50 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold text-xs">Dealer &amp; Contact</TableHead>
                <TableHead className="font-bold text-xs">City &amp; Area</TableHead>
                <TableHead className="font-bold text-xs">Purchase &amp; Payment Status</TableHead>
                <TableHead className="font-bold text-xs">Credit &amp; Outstanding</TableHead>
                <TableHead className="font-bold text-xs">Last Order</TableHead>
                <TableHead className="text-right font-bold text-xs pr-4">Direct Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDealers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No territory counters match this status filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDealers.map((d) => {
                  const phoneClean = (d.phone || '').replace(/[^0-9]/g, '');
                  const hasDebt = Number(d.outstanding || 0) > 0;
                  const isBlocked = d.credit_status === 'BLOCKED';
                  const isReorderDue = d.activity_status === 'REORDER_DUE';
                  const isDormant = d.activity_status === 'DORMANT';
                  const isActive = d.activity_status === 'ACTIVE';

                  return (
                    <TableRow key={d.id} className="hover:bg-muted/20 transition-colors">
                      {/* Name & Code */}
                      <TableCell className="font-medium">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                          {d.name}
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active regular buyer" />
                          )}
                          {hasDebt && (
                            <span className="w-2 h-2 rounded-full bg-rose-500" title="Has pending debt" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{d.code}</span>
                          {d.contact_person && <span>• {d.contact_person}</span>}
                        </div>
                        {d.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={`tel:${d.phone}`}
                              className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 font-mono"
                            >
                              <Phone className="w-3 h-3" /> {d.phone}
                            </a>
                            <a
                              href={getSmartWhatsAppLink(d)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold hover:bg-emerald-500/20"
                              title="Send Contextual WhatsApp Reminder"
                            >
                              <WhatsAppIcon className="w-2.5 h-2.5" /> WA
                            </a>
                          </div>
                        )}
                      </TableCell>

                      {/* City */}
                      <TableCell className="text-xs text-foreground/80">
                        <div>{d.city || '—'}</div>
                        {d.brand && <div className="text-[11px] text-muted-foreground">{d.brand}</div>}
                      </TableCell>

                      {/* Purchase & Payment Intelligence Pill */}
                      <TableCell>
                        {hasDebt ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-xs font-bold py-0.5">
                              🔴 Not Paying: ₹{Number(d.outstanding).toLocaleString('en-IN')} Due
                            </Badge>
                            <p className="text-[10px] text-rose-600">
                              {isBlocked ? 'Dispatches Blocked' : 'Payment Clearance Required'}
                            </p>
                          </div>
                        ) : isReorderDue ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-bold py-0.5">
                              🟡 Reorder Due: {d.days_since_last_order}d Inactive
                            </Badge>
                            <p className="text-[10px] text-emerald-600">Safe credit available</p>
                          </div>
                        ) : isDormant ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs font-semibold py-0.5">
                              💤 Dormant (&gt;60 Days)
                            </Badge>
                            <p className="text-[10px] text-muted-foreground">Needs field re-engagement</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold py-0.5">
                              🟢 Regular Buyer &amp; Cleared
                            </Badge>
                            <p className="text-[10px] text-emerald-600">Active within 30 days</p>
                          </div>
                        )}
                      </TableCell>

                      {/* Credit & Outstanding */}
                      <TableCell className="min-w-[170px]">
                        <div className="flex items-baseline justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Out: <strong className={hasDebt ? 'text-rose-600 font-extrabold' : 'text-foreground'}>₹{d.outstanding.toLocaleString('en-IN')}</strong></span>
                          <span className="text-[11px] text-muted-foreground">Limit: ₹{d.credit_limit.toLocaleString('en-IN')}</span>
                        </div>
                        <Progress
                          value={Math.min(100, d.utilization_pct)}
                          className={`h-1.5 ${
                            d.credit_status === 'BLOCKED'
                              ? '[&>div]:bg-rose-600'
                              : d.credit_status === 'WARNING'
                              ? '[&>div]:bg-amber-500'
                              : '[&>div]:bg-emerald-500'
                          }`}
                        />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                          <span>{d.utilization_pct}% used</span>
                          <span className={d.available_credit <= 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-medium'}>
                            Avail: ₹{d.available_credit.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </TableCell>

                      {/* Last Order */}
                      <TableCell className="text-xs">
                        {d.last_order_date ? (
                          <div>
                            <div className="font-semibold text-foreground">₹{d.last_order_amount.toLocaleString('en-IN')}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {d.days_since_last_order !== null ? `${d.days_since_last_order} days ago` : 'Recent'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">No order yet</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {hasDebt ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                              onClick={() => handleCollectPayment(d)}
                              title="Collect and record payment for this dealer"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Collect ₹{d.outstanding.toLocaleString('en-IN')}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs font-bold gap-1 bg-primary hover:bg-primary/90 shadow-2xs"
                              onClick={() => handleCreateOrder(d)}
                              title="Create and book a new order for this dealer"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> {isReorderDue ? 'Reorder' : 'Order'}
                            </Button>
                          )}

                          {/* Live Ledger */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => openLedger(d.code)}
                            title="View statement of accounts"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ledger
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Ledger Modal for Live Statement */}
      <LedgerModal
        isOpen={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        partyCode={ledgerTarget}
      />
    </div>
  );
};
