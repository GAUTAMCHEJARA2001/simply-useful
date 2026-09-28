import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Target, IndianRupee, ShoppingBag, TrendingUp, Award,
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck,
  ChevronRight, Users, Eye, ArrowUpRight, BarChart3,
  Calendar, Layers, RefreshCw, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  salesTargetService,
  OfficerSalesTargetRecord,
  SalesTargetListResponse
} from '@/api/services/salesTarget.service';
import { cn } from '@/lib/utils';
import { formatIndianCurrency, formatIndianNumber } from '@/utils/format';

interface SalesOfficerTargetSectionProps {
  compact?: boolean;
  initialUserId?: string;
  onSelectOfficer?: (userId: string) => void;
  showManagementLink?: boolean;
}

export const SalesOfficerTargetSection: React.FC<SalesOfficerTargetSectionProps> = ({
  compact = false,
  initialUserId,
  onSelectOfficer,
  showManagementLink = true,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userRole = (user?.role || '').toUpperCase();
  const isSuperUser = (user as any)?.is_superuser || ['SUPERUSER', 'SUPER_USER'].includes(userRole);
  const isAdmin = isSuperUser || ['ADMIN', 'SUPERADMIN', 'HR', 'MANAGEMENT', 'DIRECTOR', 'VP'].includes(userRole);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SalesTargetListResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || '');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

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
      console.error('Failed to load sales targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [selectedYear, selectedMonth]);

  // Determine active officer record
  const currentRecord = useMemo<OfficerSalesTargetRecord | null>(() => {
    if (!data?.officers || data.officers.length === 0) return null;
    if (selectedUserId) {
      const match = data.officers.find(o => o.user.id === selectedUserId);
      if (match) return match;
    }
    // If regular sales officer, find by email or take first
    const myMatch = data.officers.find(o => o.user.email?.toLowerCase() === user?.email?.toLowerCase());
    return myMatch || data.officers[0];
  }, [data, selectedUserId, user]);

  const t = currentRecord?.targets;
  const a = currentRecord?.actuals;
  const f = currentRecord?.fulfillment;

  // Custom targets list
  const customTargets = t?.custom_targets || [];

  return (
    <div className="space-y-4">
      {/* Top Banner / Card */}
      <Card className="border-primary/20 shadow-md bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                    {isAdmin && !selectedUserId ? 'Sales Targets & Field Performance' : 'My Monthly Sales Targets & Incentives'}
                  </CardTitle>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[11px] font-semibold">
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {isAdmin
                    ? 'HR-allocated quotas, dynamic UOM categories, and tiered incentive slabs (SIP)'
                    : `Assigned by HR & Management for ${currentRecord?.user.name || user?.name || 'Sales Officer'}`}
                </CardDescription>
              </div>
            </div>

            {/* Controls: Month Selector + Switch Officer (if Admin) + Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Month Selector */}
              <div className="flex items-center gap-1.5 bg-background border border-border/70 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent font-semibold text-foreground focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value={8}>Aug 2026 (Active Orders)</option>
                  <option value={9}>Sep 2026 (Current)</option>
                  <option value={10}>Oct 2026</option>
                  <option value={11}>Nov 2026</option>
                  <option value={12}>Dec 2026</option>
                </select>
              </div>

              {isAdmin && data?.officers && data.officers.length > 1 && (
                <div className="flex items-center gap-1.5 bg-background border border-border/70 rounded-lg px-2.5 py-1 text-xs">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">Officer:</span>
                  <select
                    value={selectedUserId || ''}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      if (onSelectOfficer) onSelectOfficer(e.target.value);
                    }}
                    className="bg-transparent font-bold text-primary focus:outline-hidden cursor-pointer text-xs"
                  >
                    <option value="">Team Summary ({data.officers.length})</option>
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
                className="h-8 text-xs gap-1.5"
                onClick={() => navigate('/sales/targets')}
              >
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Full Scheme & Simulator</span>
              </Button>

              {isAdmin && showManagementLink && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs gap-1.5 shadow-xs"
                  onClick={() => navigate('/hr/manage?tab=targets')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Set Targets (HR)</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-5">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
              Loading sales targets and live incentive metrics...
            </div>
          ) : !currentRecord ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No sales target data found for this period.
            </div>
          ) : (
            <>
              {/* PRIMARY KPI METRICS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Revenue Quota */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                      Sales Revenue
                    </span>
                    <Badge variant="secondary" className={cn(
                      "text-[10px] font-bold px-1.5 py-0.2",
                      (f?.revenue_pct || 0) >= 100 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                      (f?.revenue_pct || 0) >= 80 ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" :
                      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    )}>
                      {f?.revenue_pct || 0}% Achieved
                    </Badge>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold tracking-tight">
                      {formatIndianCurrency(a?.actual_revenue || 0)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Target: <span className="font-semibold text-foreground">{formatIndianCurrency(t?.target_revenue || 0)}</span>
                    </div>
                  </div>
                  <Progress value={Math.min(100, f?.revenue_pct || 0)} className="h-1.5 bg-muted" />
                </div>

                {/* 2. Bags / Product Unit Volume */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                      {t?.product_targets?.length ? 'Product Quota' : 'Bag Volume'}
                    </span>
                    <Badge variant="secondary" className={cn(
                      "text-[10px] font-bold px-1.5 py-0.2",
                      (f?.bags_pct || 0) >= 100 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                      (f?.bags_pct || 0) >= 80 ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" :
                      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    )}>
                      {f?.bags_pct || 0}% Achieved
                    </Badge>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold tracking-tight">
                      {formatIndianNumber(a?.actual_bags || 0)} <span className="text-xs font-normal text-muted-foreground">units</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Target: <span className="font-semibold text-foreground">{formatIndianNumber(t?.target_bags || 0)} units</span>
                      {t?.product_targets?.length ? ` (${t.product_targets.length} SKUs)` : ''}
                    </div>
                  </div>
                  <Progress value={Math.min(100, f?.bags_pct || 0)} className="h-1.5 bg-muted" />
                </div>

                {/* 3. Collection Safety Gate */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Payment Collections
                    </span>
                    <Badge variant="secondary" className={cn(
                      "text-[10px] font-bold px-1.5 py-0.2",
                      (f?.collection_pct || 0) >= (t?.min_collection_pct_for_incentive || 70)
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    )}>
                      {(f?.collection_pct || 0) >= (t?.min_collection_pct_for_incentive || 70) ? 'Gate Cleared' : 'Gate Pending'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-lg font-extrabold tracking-tight">
                      {formatIndianCurrency(a?.actual_collection || 0)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Target: <span className="font-semibold text-foreground">{formatIndianCurrency(t?.target_collection || 0)}</span> ({f?.collection_pct || 0}%)
                    </div>
                  </div>
                  <Progress value={Math.min(100, f?.collection_pct || 0)} className="h-1.5 bg-muted" />
                </div>

                {/* 4. Tiered SIP Incentive Earned */}
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 hover:border-emerald-500/50 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      Incentive Earned (Live)
                    </span>
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] text-white px-1.5 py-0 font-bold">
                      {f?.active_tier || 'Base Tier'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                      {formatIndianCurrency(f?.estimated_incentive || 0)}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>Gross: {formatIndianCurrency(f?.gross_incentive || 0)}</span>
                      {(f?.dealer_bounty_earned || 0) > 0 && (
                        <span className="text-primary font-medium">+{formatIndianCurrency(f?.dealer_bounty_earned || 0)} Bounty</span>
                      )}
                    </div>
                  </div>
                  {f?.collection_penalty_applied ? (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      50% held: Collections below {t?.min_collection_pct_for_incentive || 70}% gate
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      Eligible for 100% full payout
                    </p>
                  )}
                </div>
              </div>

              {/* NEXT TIER ACCELERATOR CALLOUT */}
              {f?.next_tier && (
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-purple-900 dark:text-purple-200">
                        {f.next_tier.headline}
                      </div>
                      <div className="text-[11px] text-purple-700/80 dark:text-purple-300">
                        Next Target: <span className="font-semibold">{f.next_tier.tier_name}</span> at {f.next_tier.target_pct}% achievement (Need {formatIndianNumber(f.next_tier.bags_needed)} units)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Badge className="bg-purple-600 text-white font-bold text-xs px-2.5 py-1">
                      +{formatIndianCurrency(f.next_tier.extra_cash)} Boost
                    </Badge>
                  </div>
                </div>
              )}

              {/* PRODUCT TARGETS (SKUs) ACCORDION/GRID */}
              {t?.product_targets && t.product_targets.length > 0 && (
                <div className="p-3 rounded-lg border border-purple-200/70 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-purple-800 dark:text-purple-200">
                      <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                      Product, Category &amp; Brand Quotas (ERP Auto-Counted)
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">{t.product_targets.length} Quotas Monitored</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                        <div key={idx} className="p-2.5 rounded-md bg-background border border-border/60 space-y-1 text-xs">
                          <div className="flex items-center justify-between font-medium">
                            <div className="flex items-center gap-1 truncate" title={displayName}>
                              <Badge variant="outline" className={cn("text-[8px] px-1 py-0 font-bold uppercase shrink-0", badgeColor)}>
                                {badgeLabel}
                              </Badge>
                              <span className="text-foreground font-bold truncate">{displayName}</span>
                            </div>
                            <Badge variant="outline" className={cn("text-[9px] px-1 py-0 font-bold shrink-0", ach >= 100 ? "bg-emerald-50 text-emerald-700" : "bg-muted")}>
                              {ach}%
                            </Badge>
                          </div>
                          <div className="flex items-baseline justify-between text-muted-foreground text-[11px]">
                            <span>Booked: <strong className="text-foreground font-bold">{formatIndianNumber(pt.actual_qty || 0)}</strong> units</span>
                            <span>Target: {formatIndianNumber(pt.target_qty)}</span>
                          </div>
                          <Progress value={Math.min(100, ach)} className="h-1 bg-muted" />
                          {pt.actual_amount ? (
                            <div className="text-[10px] text-muted-foreground pt-0.5">
                              Revenue: {formatIndianCurrency(pt.actual_amount)}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CHANNEL SPLIT & CUSTOM MEETS/VISITS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 border-t border-border/40">
                {/* Channel Split (Dealer vs Non-Dealer) */}
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Channel Distribution
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">Dealer vs Direct / Projects</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-md bg-background border border-border/50">
                      <div className="text-[11px] text-muted-foreground font-medium">Dealer Network</div>
                      <div className="font-bold text-foreground">
                        {formatIndianNumber(a?.actual_dealer_bags || 0)} / {formatIndianNumber(t?.target_dealer_bags || 0)} units
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatIndianCurrency(a?.actual_dealer_revenue || 0)}
                      </div>
                    </div>
                    <div className="p-2 rounded-md bg-background border border-border/50">
                      <div className="text-[11px] text-muted-foreground font-medium">Projects / Direct Sites</div>
                      <div className="font-bold text-foreground">
                        {formatIndianNumber(a?.actual_non_dealer_bags || 0)} / {formatIndianNumber(t?.target_non_dealer_bags || 0)} units
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatIndianCurrency(a?.actual_non_dealer_revenue || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field Activity & Meeting Quotas */}
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Field Activities &amp; Meets
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">{customTargets.length} Quotas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {customTargets.slice(0, 4).map((ct, idx) => {
                      const ach = ct.target_val > 0 ? Math.round(((ct.actual_val || 0) / ct.target_val) * 100) : 0;
                      return (
                        <div key={ct.id || idx} className="p-2 rounded-md bg-background border border-border/50 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground truncate">{ct.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase bg-muted/40">
                              {ct.uom}
                            </Badge>
                          </div>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="font-bold text-foreground">
                              {ct.uom === '₹' ? formatIndianCurrency(ct.actual_val || 0) : formatIndianNumber(ct.actual_val || 0)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              / {ct.uom === '₹' ? formatIndianCurrency(ct.target_val) : formatIndianNumber(ct.target_val)}
                            </span>
                          </div>
                          <Progress value={Math.min(100, ach)} className="h-1 mt-1.5 bg-muted" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesOfficerTargetSection;
