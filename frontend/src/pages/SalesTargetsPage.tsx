import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Target, IndianRupee, ShoppingBag, TrendingUp, Award,
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck,
  Users, ChevronRight, Calculator, Calendar, ArrowRight,
  ExternalLink, Layers, Info, Check, RefreshCw, Send,
  Eye, Clock, Search, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/Modal';
import {
  salesTargetService,
  OfficerSalesTargetRecord,
  SalesTargetListResponse,
  CustomTargetItem
} from '@/api/services/salesTarget.service';
import { formatIndianCurrency, formatIndianNumber } from '@/utils/format';
import { cn } from '@/lib/utils';

export const SalesTargetsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userRole = (user?.role || '').toUpperCase();
  const isSuperUser = (user as any)?.is_superuser || ['SUPERUSER', 'SUPER_USER'].includes(userRole);
  const isAdmin = isSuperUser || ['ADMIN', 'SUPERADMIN', 'HR', 'MANAGEMENT', 'DIRECTOR', 'VP'].includes(userRole);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SalesTargetListResponse | null>(null);

  // Incentive Simulator State (Supports User Providing / Simulating Their Own Target)
  const [simTargetBags, setSimTargetBags] = useState<number>(400);
  const [simTargetRevenue, setSimTargetRevenue] = useState<number>(1000000);
  const [simBags, setSimBags] = useState<number>(0);
  const [simDealers, setSimDealers] = useState<number>(0);
  const [isSubmittingCommitment, setIsSubmittingCommitment] = useState(false);
  const [commitmentSuccess, setCommitmentSuccess] = useState<string | null>(null);

  // Contributing Orders & Collections Breakdown Modal State
  const [breakdownModal, setBreakdownModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    badgeLabel?: string;
    orders: any[];
    collections?: any[];
    totalActualUnits?: number;
    totalActualRevenue?: number;
    mode?: 'orders' | 'collections';
  }>({
    isOpen: false,
    title: '',
    orders: [],
    collections: [],
    mode: 'orders',
  });
  const [orderSearch, setOrderSearch] = useState<string>('');

  const filteredBreakdownOrders = useMemo(() => {
    if (!breakdownModal.orders || breakdownModal.orders.length === 0) return [];
    if (!orderSearch.trim()) return breakdownModal.orders;
    const q = orderSearch.toLowerCase().trim();
    return breakdownModal.orders.filter((o: any) =>
      (o.order_id && o.order_id.toLowerCase().includes(q)) ||
      (o.party_name && o.party_name.toLowerCase().includes(q)) ||
      (o.product_name && o.product_name.toLowerCase().includes(q)) ||
      (o.category_name && o.category_name.toLowerCase().includes(q)) ||
      (o.status && o.status.toLowerCase().includes(q))
    );
  }, [breakdownModal.orders, orderSearch]);

  const filteredBreakdownCollections = useMemo(() => {
    if (!breakdownModal.collections || breakdownModal.collections.length === 0) return [];
    if (!orderSearch.trim()) return breakdownModal.collections;
    const q = orderSearch.toLowerCase().trim();
    return breakdownModal.collections.filter((c: any) =>
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.party_name && c.party_name.toLowerCase().includes(q)) ||
      (c.payment_mode && c.payment_mode.toLowerCase().includes(q)) ||
      (c.status && c.status.toLowerCase().includes(q)) ||
      (c.remarks && c.remarks.toLowerCase().includes(q))
    );
  }, [breakdownModal.collections, orderSearch]);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const res = await salesTargetService.getTargets({
        year: selectedYear,
        month: selectedMonth,
      });
      setData(res.data);
      if (!selectedUserId && res.data.officers?.length > 0) {
        if (!isAdmin) {
          setSelectedUserId(res.data.officers[0]?.user.id);
        }
      }
    } catch (err) {
      console.error('Failed to load targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [selectedYear, selectedMonth]);

  const currentRecord = useMemo<OfficerSalesTargetRecord | null>(() => {
    if (!data?.officers || data.officers.length === 0) return null;
    if (selectedUserId) {
      const match = data.officers.find(o => o.user.id === selectedUserId);
      if (match) return match;
    }
    const myMatch = data.officers.find(o => o.user.email?.toLowerCase() === user?.email?.toLowerCase());
    return myMatch || data.officers[0];
  }, [data, selectedUserId, user]);

  const t = currentRecord?.targets;
  const a = currentRecord?.actuals;
  const f = currentRecord?.fulfillment;
  const customTargets: CustomTargetItem[] = t?.custom_targets || [];
  const targetBags = t?.target_bags || 400;

  // Initialize simulator values when record changes
  useEffect(() => {
    if (currentRecord) {
      setSimBags(currentRecord.actuals.actual_bags || 0);
      setSimDealers(currentRecord.actuals.actual_new_dealers || 0);
      setSimTargetBags(currentRecord.targets.target_bags || 400);
      setSimTargetRevenue(currentRecord.targets.target_revenue || 1000000);
    }
  }, [currentRecord]);

  // Simulator calculation (User can provide / test their own target)
  const effectiveTargetBags = simTargetBags > 0 ? simTargetBags : (t?.target_bags || 1);
  const simAchievementPct = Math.round((simBags / (effectiveTargetBags || 1)) * 100);
  const slabs = t?.incentive_slabs && t.incentive_slabs.length > 0 ? t.incentive_slabs : [];
  const simActiveSlab = slabs.find(s => simAchievementPct >= s.min_pct && simAchievementPct <= s.max_pct);
  const simRatePerBag = simActiveSlab ? simActiveSlab.rate_per_bag : 0;
  const simBaseIncentive = simBags * simRatePerBag;
  const simBountyRate = t?.new_dealer_bounty || 500;
  const simBounty = simDealers * simBountyRate;
  const simTotalIncentive = simBaseIncentive + simBounty;

  const handleCommitTarget = async () => {
    if (!currentRecord) return;
    try {
      setIsSubmittingCommitment(true);
      await salesTargetService.saveTarget({
        user_id: currentRecord.user.id,
        target_bags: simTargetBags,
        target_revenue: simTargetRevenue,
        target_collection: Math.round(simTargetRevenue * 0.5),
        target_visits: currentRecord.targets.target_visits || 80,
        target_new_dealers: currentRecord.targets.target_new_dealers || 3,
        target_travel_days: currentRecord.targets.target_travel_days || 22,
        month: selectedMonth,
        year: selectedYear,
        fiscal_year: data?.filter.fiscal_year || '2026-2027',
        notes: `Target Commitment submitted by ${user?.name || user?.email || 'Officer'}: ${simTargetBags} units, ₹${simTargetRevenue.toLocaleString('en-IN')}`,
      });
      setCommitmentSuccess(`Your target commitment of ${formatIndianNumber(simTargetBags)} units (${formatIndianCurrency(simTargetRevenue)}) was submitted to HR!`);
      fetchTargets();
      setTimeout(() => setCommitmentSuccess(null), 6000);
    } catch (err: any) {
      console.error('Failed to submit target commitment:', err);
    } finally {
      setIsSubmittingCommitment(false);
    }
  };

  const monthOptions = [
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER WITH CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                Sales Targets & Incentive Scheme
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Official targets allocated by HR, category quotas, and tiered sales incentives
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month / Year */}
          <div className="flex items-center gap-1.5 bg-muted/30 border border-border rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-foreground focus:outline-hidden cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m.num} value={m.num}>{m.name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-foreground focus:outline-hidden cursor-pointer"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Officer Selector (for Admin & Superuser) */}
          {isAdmin && data?.officers && (
            <div className="flex items-center gap-1.5 bg-muted/30 border border-border rounded-lg px-2.5 py-1 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-transparent font-bold text-primary focus:outline-hidden cursor-pointer"
              >
                {data.officers.map(o => (
                  <option key={o.user.id} value={o.user.id}>
                    {o.user.name} ({o.user.territory || 'General'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTargets}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          {isAdmin && (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/hr/manage?tab=targets')}
              className="h-8 text-xs gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Manage in HR Module</span>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-xs text-muted-foreground">Loading target schemes and actuals...</p>
        </div>
      ) : !currentRecord ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          No sales target record found for this period.
        </Card>
      ) : (
        <>
          {/* TOP OFFICER PROFILE & TARGET STATUS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                {currentRecord.user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground">{currentRecord.user.name}</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {currentRecord.user.territory || 'General Territory'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {currentRecord.user.role || 'Sales Officer'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Period: <span className="font-medium text-foreground">{data?.filter.date_range_label}</span> | FY {currentRecord.period.fiscal_year}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentRecord.is_configured ? (
                <Badge className="bg-emerald-600 text-white gap-1 text-xs py-1 px-2.5">
                  <Check className="w-3 h-3" /> HR Target Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1 text-xs py-1 px-2.5">
                  <Info className="w-3 h-3" /> Default Benchmark Target
                </Badge>
              )}
            </div>
          </div>

          {/* Zero ERP Data Contextual Notice */}
          {a?.order_count === 0 && a?.actual_revenue === 0 && (
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    No ERP sales orders or collections logged for {monthOptions.find(m => m.num === selectedMonth)?.name || 'this month'} {selectedYear} yet.
                  </div>
                  <div className="text-muted-foreground dark:text-blue-300/80 mt-0.5">
                    Target parameters are active. Actuals automatically accumulate from newly placed ERP orders and verified payment receipts in real time.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedMonth !== 8 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedMonth(8); setSelectedYear(2026); }}
                    className="text-xs font-semibold border-blue-300 bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> View August 2026 Data
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => navigate('/sales/order')}
                  className="text-xs font-semibold"
                >
                  <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Place New Order
                </Button>
              </div>
            </div>
          )}

          {/* 4 PRIMARY PILLAR CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <Card 
              onClick={() => {
                setOrderSearch('');
                setBreakdownModal({
                  isOpen: true,
                  title: 'Revenue Target Breakdown',
                  subtitle: `All billed & dispatched orders contributing to ${selectedMonth}/${selectedYear} revenue`,
                  badgeLabel: 'REVENUE',
                  orders: a?.orders || [],
                  collections: [],
                  totalActualUnits: a?.actual_bags || 0,
                  totalActualRevenue: a?.actual_revenue || 0,
                  mode: 'orders',
                });
              }}
              className="border shadow-xs hover:border-blue-500/60 hover:shadow-md transition-all cursor-pointer group"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                    Revenue Target (₹)
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                      <Eye className="w-3 h-3" /> Breakdown
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {f?.revenue_pct || 0}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black tracking-tight text-foreground">
                  {formatIndianCurrency(a?.actual_revenue || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Target: <span className="font-semibold text-foreground">{formatIndianCurrency(t?.target_revenue || 0)}</span>
                </div>
                <Progress value={Math.min(100, f?.revenue_pct || 0)} className="h-2 bg-muted" />
              </CardContent>
            </Card>

            {/* Volume / Product Quota */}
            <Card 
              onClick={() => {
                setOrderSearch('');
                setBreakdownModal({
                  isOpen: true,
                  title: t?.product_targets?.length ? 'Product Quota Breakdown' : 'Volume Bags Quota Breakdown',
                  subtitle: `Dispatched orders and line items accounted towards product/volume quota`,
                  badgeLabel: 'VOLUME',
                  orders: a?.orders || [],
                  collections: [],
                  totalActualUnits: a?.actual_bags || 0,
                  totalActualRevenue: a?.actual_revenue || 0,
                  mode: 'orders',
                });
              }}
              className="border shadow-xs hover:border-purple-500/60 hover:shadow-md transition-all cursor-pointer group"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                    {t?.product_targets?.length ? 'Product Quota' : 'Bags Quota'}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                      <Eye className="w-3 h-3" /> Breakdown
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {f?.bags_pct || 0}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black tracking-tight text-foreground">
                  {formatIndianNumber(a?.actual_bags || 0)} <span className="text-xs font-normal text-muted-foreground">units</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Target: <span className="font-semibold text-foreground">{formatIndianNumber(t?.target_bags || 0)} units</span>
                  {t?.product_targets?.length ? ` (${t.product_targets.length} SKUs)` : ''}
                </div>
                <Progress value={Math.min(100, f?.bags_pct || 0)} className="h-2 bg-muted" />
              </CardContent>
            </Card>

            {/* Payment Recovery & Safety Gate */}
            <Card 
              onClick={() => {
                setOrderSearch('');
                setBreakdownModal({
                  isOpen: true,
                  title: 'Collections Recovery Breakdown',
                  subtitle: `Verified payment receipts and collections recorded in ${selectedMonth}/${selectedYear}`,
                  badgeLabel: 'COLLECTIONS',
                  orders: [],
                  collections: a?.collections || [],
                  totalActualUnits: (a?.collections || []).length,
                  totalActualRevenue: a?.actual_collection || 0,
                  mode: 'collections',
                });
              }}
              className="border shadow-xs hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer group"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Collections Recovery
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                      <Eye className="w-3 h-3" /> Breakdown
                    </span>
                    <Badge variant="secondary" className={cn(
                      "text-[10px] font-bold",
                      (f?.collection_pct || 0) >= (t?.min_collection_pct_for_incentive || 70)
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    )}>
                      {(f?.collection_pct || 0) >= (t?.min_collection_pct_for_incentive || 70) ? 'Gate Passed' : 'Below Gate'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black tracking-tight text-foreground">
                  {formatIndianCurrency(a?.actual_collection || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Target: <span className="font-semibold text-foreground">{formatIndianCurrency(t?.target_collection || 0)}</span> ({f?.collection_pct || 0}%)
                </div>
                <Progress value={Math.min(100, f?.collection_pct || 0)} className="h-2 bg-muted" />
              </CardContent>
            </Card>

            {/* Live SIP Incentive Earned */}
            <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-xs hover:border-emerald-500/50 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    Live Incentive Earned
                  </CardTitle>
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                    {f?.active_tier || 'Base Tier'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                  {formatIndianCurrency(f?.estimated_incentive || 0)}
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>Gross: {formatIndianCurrency(f?.gross_incentive || 0)}</span>
                  {(f?.dealer_bounty_earned || 0) > 0 && (
                    <span className="text-primary font-semibold">+{formatIndianCurrency(f?.dealer_bounty_earned || 0)} Bounty</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {f?.collection_penalty_applied
                    ? f?.collection_penalty_msg
                    : '100% payout eligible (safety gate cleared)'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NEXT TIER ACCELERATOR BANNER */}
          {f?.next_tier && (
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/80 dark:bg-purple-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-purple-950 dark:text-purple-100">
                    {f.next_tier.headline}
                  </div>
                  <div className="text-xs text-purple-800/80 dark:text-purple-300">
                    Milestone: Reach <span className="font-bold">{f.next_tier.tier_name}</span> ({f.next_tier.target_pct}% achievement) by booking {formatIndianNumber(f.next_tier.bags_needed)} more bags.
                  </div>
                </div>
              </div>
              <Badge className="bg-purple-600 text-white font-black text-xs px-3 py-1.5 self-end sm:self-center">
                +{formatIndianCurrency(f.next_tier.extra_cash)} Payout Boost
              </Badge>
            </div>
          )}

          {/* PRODUCT TARGETS (SKUs) BREAKDOWN */}
          {t?.product_targets && t.product_targets.length > 0 && (
            <Card className="border border-purple-200 dark:border-purple-900/60 shadow-xs bg-purple-50/20 dark:bg-purple-950/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-900 dark:text-purple-200">
                    <ShoppingBag className="w-4 h-4 text-purple-600" />
                    Product, Category &amp; Brand Quotas (ERP Auto-Counted)
                  </CardTitle>
                  <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold text-xs border-purple-200">
                    {t.product_targets.length} Quotas Monitored
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Line items from completed &amp; dispatched sales orders are automatically tracked against each product, category, or brand quota.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {t.product_targets.map((pt, idx) => {
                    const ach = pt.target_qty > 0 ? Math.round(((pt.actual_qty || 0) / pt.target_qty) * 100) : 0;
                    const tType = pt.target_type || 'product';
                    const badgeLabel = tType === 'category' ? 'CAT' : (tType === 'brand' ? 'BRAND' : 'SKU');
                    const badgeColor = tType === 'category' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200' 
                      : (tType === 'brand' 
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200' 
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200');
                    const displayName = pt.display_name || pt.product_name || 'Item';
                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setOrderSearch('');
                          setBreakdownModal({
                            isOpen: true,
                            title: displayName,
                            subtitle: `${badgeLabel} Quota Breakdown — Orders Calculated`,
                            badgeLabel,
                            orders: pt.orders || [],
                            totalActualUnits: pt.actual_qty || 0,
                            totalActualRevenue: pt.actual_amount || 0,
                          });
                        }}
                        className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2 hover:border-primary/60 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate max-w-[180px]" title={displayName}>
                            <Badge variant="outline" className={cn("text-[8px] px-1 py-0 font-bold uppercase shrink-0", badgeColor)}>
                              {badgeLabel}
                            </Badge>
                            <span className="font-bold text-xs text-foreground truncate">
                              {displayName}
                            </span>
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0 shrink-0", ach >= 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted")}>
                            {ach}%
                          </Badge>
                        </div>
                        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                          <span>Actual: <strong className="text-foreground font-bold">{formatIndianNumber(pt.actual_qty || 0)}</strong> units</span>
                          <span>Target: {formatIndianNumber(pt.target_qty)}</span>
                        </div>
                        <Progress value={Math.min(100, ach)} className="h-1.5 bg-muted" />
                        {pt.actual_amount ? (
                          <div className="text-[11px] text-muted-foreground pt-0.5 flex justify-between">
                            <span>Billed Revenue:</span>
                            <span className="font-semibold text-foreground">{formatIndianCurrency(pt.actual_amount)}</span>
                          </div>
                        ) : null}
                        {pt.booked_qty && pt.booked_qty > (pt.actual_qty || 0) ? (
                          <div className="text-[10.5px] text-amber-600/90 pt-0.5 flex justify-between font-medium">
                            <span>Pending Dispatch:</span>
                            <span>{formatIndianNumber(pt.booked_qty - (pt.actual_qty || 0))} units placed</span>
                          </div>
                        ) : null}
                        <div className="text-[10px] text-primary/70 group-hover:text-primary font-medium flex items-center justify-end gap-1 pt-0.5 border-t border-border/40 mt-1">
                          <Eye className="w-3 h-3" /> View Orders Breakdown
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CHANNEL SPLIT & DYNAMIC CUSTOM QUOTAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Split */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Sales Channel Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Performance across Dealer Network vs Direct Projects & Non-Dealer channels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => {
                      const allOrders = a?.orders || [];
                      const dealerOrders = allOrders.filter((o: any) => (o.party_type || '').toLowerCase() === 'dealer');
                      setOrderSearch('');
                      setBreakdownModal({
                        isOpen: true,
                        title: 'Dealer Network Channel',
                        subtitle: 'Orders contributing to Dealer Network volume & revenue',
                        badgeLabel: 'DEALER',
                        orders: dealerOrders,
                        totalActualUnits: a?.actual_dealer_bags || 0,
                        totalActualRevenue: a?.actual_dealer_revenue || 0,
                      });
                    }}
                    className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1.5 hover:border-blue-500/60 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Dealer Network</span>
                      <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> View
                      </span>
                    </div>
                    <div className="text-base font-bold text-foreground">
                      {formatIndianNumber(a?.actual_dealer_bags || 0)} / {formatIndianNumber(t?.target_dealer_bags || 0)} <span className="text-xs font-normal">bags</span>
                    </div>
                    <div className="text-xs font-medium text-blue-600">
                      {formatIndianCurrency(a?.actual_dealer_revenue || 0)}
                    </div>
                    <Progress
                      value={t?.target_dealer_bags ? Math.min(100, Math.round(((a?.actual_dealer_bags || 0) / t.target_dealer_bags) * 100)) : 0}
                      className="h-1.5 bg-muted"
                    />
                  </div>

                  <div 
                    onClick={() => {
                      const allOrders = a?.orders || [];
                      const nonDealerOrders = allOrders.filter((o: any) => (o.party_type || '').toLowerCase() !== 'dealer');
                      setOrderSearch('');
                      setBreakdownModal({
                        isOpen: true,
                        title: 'Non-Dealer / Direct Projects',
                        subtitle: 'Orders contributing to Direct Project volume & revenue',
                        badgeLabel: 'DIRECT',
                        orders: nonDealerOrders,
                        totalActualUnits: a?.actual_non_dealer_bags || 0,
                        totalActualRevenue: a?.actual_non_dealer_revenue || 0,
                      });
                    }}
                    className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1.5 hover:border-purple-500/60 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Non-Dealer / Direct Projects</span>
                      <span className="text-[10px] text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> View
                      </span>
                    </div>
                    <div className="text-base font-bold text-foreground">
                      {formatIndianNumber(a?.actual_non_dealer_bags || 0)} / {formatIndianNumber(t?.target_non_dealer_bags || 0)} <span className="text-xs font-normal">bags</span>
                    </div>
                    <div className="text-xs font-medium text-purple-600">
                      {formatIndianCurrency(a?.actual_non_dealer_revenue || 0)}
                    </div>
                    <Progress
                      value={t?.target_non_dealer_bags ? Math.min(100, Math.round(((a?.actual_non_dealer_bags || 0) / t.target_non_dealer_bags) * 100)) : 0}
                      className="h-1.5 bg-muted"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-background text-xs space-y-1.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Field Tour Discipline Target:</span>
                    <span className="font-semibold text-foreground">{a?.actual_travel_days || 0} / {t?.target_travel_days || 22} Travel Days</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Counter Visits Target:</span>
                    <span className="font-semibold text-foreground">{a?.actual_visits || 0} / {t?.target_visits || 80} Visits</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>New Dealer Onboardings:</span>
                    <span className="font-semibold text-foreground">{a?.actual_new_dealers || 0} / {t?.target_new_dealers || 3} Dealers (Earned {formatIndianCurrency((a?.actual_new_dealers || 0) * (t?.new_dealer_bounty || 500))})</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Custom Categories */}
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Dynamic Category Quotas & Custom UOMs
                </CardTitle>
                <CardDescription className="text-xs">
                  Category quotas configured with specific Units of Measurement (UOM)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {customTargets.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center">
                    No custom category quotas assigned for this month.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {customTargets.map((ct, idx) => {
                      const ach = ct.target_val > 0 ? Math.round(((ct.actual_val || 0) / ct.target_val) * 100) : 0;
                      const hasOrders = (ct as any).orders && (ct as any).orders.length > 0;
                      return (
                        <div 
                          key={ct.id || idx} 
                          onClick={() => {
                            if (hasOrders) {
                              setOrderSearch('');
                              setBreakdownModal({
                                isOpen: true,
                                title: ct.name,
                                subtitle: `Custom Category Quota — Orders Calculated (${ct.uom})`,
                                badgeLabel: ct.uom,
                                orders: (ct as any).orders || [],
                                totalActualUnits: ct.actual_val || 0,
                                totalActualRevenue: 0,
                              });
                            }
                          }}
                          className={cn(
                            "p-3 rounded-xl border border-border/70 bg-card space-y-2",
                            hasOrders ? "hover:border-primary/60 hover:shadow-md transition-all cursor-pointer group" : ""
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-foreground">{ct.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase bg-muted font-bold">
                                {ct.uom}
                              </Badge>
                              {(ct.incentive_rate || 0) > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 font-semibold">
                                  +₹{ct.incentive_rate}/{ct.uom}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs font-extrabold text-foreground">{ach}%</span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Actual: <strong className="text-foreground">
                                {ct.uom === '₹' ? formatIndianCurrency(ct.actual_val || 0) : formatIndianNumber(ct.actual_val || 0)}
                              </strong> {ct.uom}
                            </span>
                            <span>
                              Target: <strong className="text-foreground">
                                {ct.uom === '₹' ? formatIndianCurrency(ct.target_val) : formatIndianNumber(ct.target_val)}
                              </strong> {ct.uom}
                            </span>
                          </div>
                          <Progress value={Math.min(100, ach)} className="h-1.5 bg-muted" />

                          {hasOrders && (
                            <div className="text-[10px] text-primary/70 group-hover:text-primary font-medium flex items-center justify-end gap-1 pt-0.5 border-t border-border/40 mt-1">
                              <Eye className="w-3 h-3" /> View Orders Breakdown
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ENTERPRISE TIERED INCENTIVE LADDER (SIP) */}
          {slabs.length > 0 && (
            <>
              <Card className="border shadow-xs bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Sales Incentive Plan (SIP) Slabs & Gatekeeper Rules
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Progressive volume accelerator matrix and compliance conditions
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold self-start sm:self-center">
                  Active Tier: {f?.active_tier || 'Base Tier'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {slabs.map((slab, i) => {
                  const isActive = (f?.overall_pct || 0) >= slab.min_pct && (f?.overall_pct || 0) <= slab.max_pct;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "p-4 rounded-xl border transition-all space-y-2",
                        isActive
                          ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">{slab.label}</span>
                        {isActive && (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            Current Tier
                          </Badge>
                        )}
                      </div>
                      <div className="text-lg font-extrabold text-foreground">
                        ₹{slab.rate_per_bag.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ bag</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Achievement Band: <span className="font-semibold text-foreground">{slab.min_pct}% - {slab.max_pct > 500 ? 'Above' : `${slab.max_pct}%`}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Volume Range: <span className="font-semibold text-foreground">{formatIndianNumber(Math.round(targetBags * (slab.min_pct / 100)))} - {slab.max_pct > 500 ? '∞' : formatIndianNumber(Math.round(targetBags * (slab.max_pct / 100)))} bags</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Safety Gatekeeper Notice */}
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Enterprise Collection Gatekeeper:</span> Sales officers must achieve a minimum of <strong>{t?.min_collection_pct_for_incentive || 70}%</strong> payment recovery on outstanding dues. If collections fall below {t?.min_collection_pct_for_incentive || 70}%, 50% of the volume incentive is withheld until overdue amounts are cleared.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* INTERACTIVE INCENTIVE CALCULATOR / SIMULATOR */}
          <Card className="border-primary/30 shadow-md bg-gradient-to-br from-primary/5 via-card to-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    Interactive Incentive Simulator (What-If Calculator)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Provide your target goals and projected sales volumes to simulate your estimated monthly payout live!
                  </CardDescription>
                </div>
                {commitmentSuccess && (
                  <Badge className="bg-emerald-600 text-white text-xs gap-1 py-1 px-3">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {commitmentSuccess}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Inputs Section */}
                <div className="space-y-4">
                  {/* Row 1: Target Quota (User Can Provide Their Target Here!) */}
                  <div className="p-3 rounded-xl border border-border/80 bg-background/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-purple-600" />
                        <span>Target Quota (Units / Bags)</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          Official: {formatIndianNumber(t?.target_bags || 0)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSimTargetBags(t?.target_bags || 400);
                            setSimTargetRevenue(t?.target_revenue || 1000000);
                          }}
                          className="h-6 px-2 text-[10px] text-primary hover:text-primary gap-1"
                          title="Reset to official HR target"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Reset</span>
                        </Button>
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={simTargetBags}
                      onChange={(e) => setSimTargetBags(Number(e.target.value) || 0)}
                      className="text-sm font-bold text-purple-700 bg-purple-50/30 border-purple-200"
                      placeholder="Enter Target Units..."
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Target Revenue:</span>
                      <div className="flex items-center gap-1">
                        <span>₹</span>
                        <input
                          type="number"
                          value={simTargetRevenue}
                          onChange={(e) => setSimTargetRevenue(Number(e.target.value) || 0)}
                          className="w-28 text-right font-medium text-foreground bg-transparent border-b border-border/70 focus:outline-hidden text-xs"
                          placeholder="Revenue ₹"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Projected Sales Volume */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <Label className="font-semibold text-foreground">Projected / Simulated Sales Volume</Label>
                      <span className="font-extrabold text-primary">{formatIndianNumber(simBags)} units</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={simBags}
                      onChange={(e) => setSimBags(Number(e.target.value) || 0)}
                      className="text-sm font-bold"
                      placeholder="Enter Projected Sales..."
                    />
                    <div className="text-[11px] text-muted-foreground flex justify-between items-center pt-0.5">
                      <span>Target Baseline: <strong className="text-foreground">{formatIndianNumber(effectiveTargetBags)} units</strong></span>
                      <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0", simAchievementPct >= 100 ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-muted")}>
                        {simAchievementPct}% Achievement
                      </Badge>
                    </div>
                  </div>

                  {/* Row 3: New Dealers Onboarded */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <Label className="font-semibold text-foreground">New Dealers Onboarded</Label>
                      <span className="font-extrabold text-primary">{simDealers} Dealers</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={simDealers}
                      onChange={(e) => setSimDealers(Number(e.target.value) || 0)}
                      className="text-sm font-bold"
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Bounty Rate: ₹{simBountyRate} per verified dealer
                    </div>
                  </div>
                </div>

                {/* Simulated Result Card */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Projected Take-Home Incentive
                    </div>
                    <div className="text-3xl font-black text-primary tracking-tight mt-1">
                      {formatIndianCurrency(simTotalIncentive)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Projected Tier: <strong className="text-foreground">{simActiveSlab?.label || 'Below Threshold (<80%)'}</strong> (₹{simRatePerBag}/unit)
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-primary/20 pt-3 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Volume Incentive ({formatIndianNumber(simBags)} units × ₹{simRatePerBag}):</span>
                      <span className="font-bold text-foreground">{formatIndianCurrency(simBaseIncentive)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>New Dealer Bounty ({simDealers} × ₹{simBountyRate}):</span>
                      <span className="font-bold text-foreground">{formatIndianCurrency(simBounty)}</span>
                    </div>
                  </div>

                  {/* Submit Target Commitment Button */}
                  <div className="pt-2 border-t border-primary/20">
                    <Button
                      type="button"
                      onClick={handleCommitTarget}
                      disabled={isSubmittingCommitment}
                      className="w-full text-xs font-bold gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingCommitment ? 'Submitting Commitment...' : 'Submit as My Monthly Target Commitment to HR'}</span>
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center mt-1">
                      Commits your proposed target of {formatIndianNumber(simTargetBags)} units to HR.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </>
      )}

      {/* Contributing Orders & Collections Breakdown Modal */}
      <Modal
        isOpen={breakdownModal.isOpen}
        onClose={() => setBreakdownModal(prev => ({ ...prev, isOpen: false }))}
        title={breakdownModal.title || 'Breakdown'}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          {/* Header Summary Cards */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{breakdownModal.title}</span>
                {breakdownModal.badgeLabel && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 uppercase font-bold bg-primary/10 text-primary border-primary/20">
                    {breakdownModal.badgeLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {breakdownModal.subtitle || 'All entries accounted towards this target calculation.'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {breakdownModal.mode === 'collections' ? (
                <>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Total Verified Receipts</div>
                    <div className="text-base font-extrabold text-foreground">
                      {formatIndianNumber((breakdownModal.collections || []).length)} <span className="text-xs font-normal text-muted-foreground">receipts</span>
                    </div>
                  </div>
                  <div className="text-right border-l border-border/60 pl-4">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Total Recovered</div>
                    <div className="text-base font-extrabold text-emerald-600">
                      {formatIndianCurrency(breakdownModal.totalActualRevenue || 0)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground">Counted Actual Units</div>
                    <div className="text-base font-extrabold text-foreground">
                      {formatIndianNumber(breakdownModal.totalActualUnits || 0)} <span className="text-xs font-normal text-muted-foreground">units</span>
                    </div>
                  </div>
                  {(breakdownModal.totalActualRevenue ?? 0) > 0 && (
                    <div className="text-right border-l border-border/60 pl-4">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Billed Revenue</div>
                      <div className="text-base font-extrabold text-emerald-600">
                        {formatIndianCurrency(breakdownModal.totalActualRevenue || 0)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Search / Filter Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={breakdownModal.mode === 'collections' ? "Search by Party, Mode, Status, Ref #..." : "Search by Order ID, Party, Product..."}
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {breakdownModal.mode === 'collections' ? (
                <>Showing <strong className="text-foreground">{filteredBreakdownCollections.length}</strong> of {(breakdownModal.collections || []).length} receipts</>
              ) : (
                <>Showing <strong className="text-foreground">{filteredBreakdownOrders.length}</strong> of {breakdownModal.orders.length} order items</>
              )}
            </div>
          </div>

          {/* Breakdown Content */}
          {breakdownModal.mode === 'collections' ? (
            filteredBreakdownCollections.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-border/80 text-muted-foreground space-y-2">
                <FileText className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-xs font-medium">No verified payment receipts found for this period.</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Only verified/approved payment receipts submitted for this officer count towards collections recovery.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold border-b border-border/80">
                    <tr>
                      <th className="py-2.5 px-3">Receipt / Ref #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Party / Customer</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredBreakdownCollections.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">
                          {c.id || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {c.date || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-foreground line-clamp-1">{c.party_name || '—'}</div>
                          <div className="text-[10px] text-muted-foreground">{c.party_type || 'Customer'}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase bg-muted">
                            {c.payment_mode || 'Online'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatIndianCurrency(c.amount || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold whitespace-nowrap">
                            {c.status || 'VERIFIED'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {c.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            filteredBreakdownOrders.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-border/80 text-muted-foreground space-y-2">
                <FileText className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-xs font-medium">No order line items match this quota or search filter.</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Only confirmed orders with warehouse dispatches contribute to actual volume and incentive payouts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold border-b border-border/80">
                    <tr>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Party / Customer</th>
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-3 text-right">Ordered Qty</th>
                      <th className="py-2.5 px-3 text-right">Counted Dispatched</th>
                      <th className="py-2.5 px-3 text-right">Billed Value</th>
                      <th className="py-2.5 px-3 text-center">Status in Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredBreakdownOrders.map((o: any, idx: number) => {
                      const isCounted = (o.dispatched_qty || 0) > 0;
                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">
                            {o.order_id || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                            {o.date || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground line-clamp-1">{o.party_name || '—'}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {o.party_type || 'Customer'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-foreground line-clamp-1">{o.product_name || '—'}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {o.product_code || o.category_name || ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                            {formatIndianNumber(o.ordered_qty || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            <span className={cn(isCounted ? "text-foreground" : "text-muted-foreground")}>
                              {formatIndianNumber(o.dispatched_qty || 0)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            <span className={isCounted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                              {formatIndianCurrency(o.dispatched_value || 0)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isCounted ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold whitespace-nowrap">
                                Counted in Target
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold whitespace-nowrap">
                                Pending Dispatch
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Footer Guidance */}
          <div className="text-[11px] text-muted-foreground/80 flex items-center justify-between pt-2 border-t border-border/50">
            <span>
              <strong>Target Calculation Policy:</strong> Targets & incentives strictly calculate from confirmed warehouse dispatches & verified payment receipts.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBreakdownModal(prev => ({ ...prev, isOpen: false }))}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SalesTargetsPage;
