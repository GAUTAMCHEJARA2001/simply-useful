import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { directorService, DirectorDashboardData, DirectorDashboardParams } from '@/api/services/director.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Factory,
  Users,
  Wallet,
  Activity,
  Layers,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Calendar,
  Filter,
  Eye,
  EyeOff,
  Printer,
  ChevronRight,
  RefreshCw,
  Gauge,
  ShieldCheck,
  Building2,
  FileText,
  Percent,
  Check,
  Briefcase
} from 'lucide-react';

export const DirectorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [period, setPeriod] = useState<'today' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'>('mtd');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [privacyMask, setPrivacyMask] = useState(false);
  const [unitMode, setUnitMode] = useState<'LAKHS' | 'FULL'>('LAKHS');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DirectorDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Role validation
  const roleUpper = (user?.role || '').toUpperCase();
  const isPrivileged = ['SUPERADMIN', 'ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleUpper);

  const fetchDashboard = useCallback(async (params?: DirectorDashboardParams) => {
    try {
      setLoading(true);
      setError(null);
      const res = await directorService.getDashboard(params);
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to compute boardroom intelligence');
      }
    } catch (err: any) {
      console.error('Director dashboard fetch error:', err);
      setError(err?.response?.data?.message || 'Failed to load Director Command Center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period === 'custom') {
      if (customStart && customEnd) {
        fetchDashboard({ period: 'custom', start_date: customStart, end_date: customEnd });
      }
    } else {
      fetchDashboard({ period });
    }
  }, [period, customStart, customEnd, fetchDashboard]);

  // Number formatting with Privacy Mask & Unit Mode
  const formatCurrency = useCallback((val: number | null | undefined, forceFull = false) => {
    if (val === null || val === undefined) return '₹ 0';
    if (privacyMask) return '₹ •••••••';

    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';

    if (!forceFull && unitMode === 'LAKHS') {
      if (absVal >= 10000000) {
        return `${sign}₹ ${(absVal / 10000000).toFixed(2)} Cr`;
      }
      if (absVal >= 100000) {
        return `${sign}₹ ${(absVal / 100000).toFixed(2)} L`;
      }
      return `${sign}₹ ${Math.round(absVal).toLocaleString('en-IN')}`;
    }

    return `${sign}₹ ${Math.round(absVal).toLocaleString('en-IN')}`;
  }, [privacyMask, unitMode]);

  const ticker = data?.ticker;
  const plant = data?.operations?.plant;
  const field = data?.operations?.field;
  const pending = data?.operations?.pending_actions;
  const meta = data?.meta;

  if (!isPrivileged) {
    return (
      <div className="flex-1 w-full min-w-0 p-6 flex items-center justify-center">
        <Card className="max-w-md p-8 text-center border-dashed border-red-200">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Director Boardroom Access Restricted</h2>
          <p className="text-xs text-muted-foreground mt-2">
            The Executive Boardroom Command Center contains confidential company P&L, consumption, and margin intelligence reserved exclusively for Company Directors & Superadmins.
          </p>
          <Button onClick={() => navigate('/')} className="mt-5 w-full text-xs font-semibold">
            Return to Main Workspace
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-w-0 p-3 sm:p-5 lg:p-6 bg-slate-50/60 dark:bg-background overflow-y-auto space-y-6 print:p-0 print:bg-white">
      
      {/* ── TOP EXECUTIVE BANNER & CONTROLS ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 sm:p-7 shadow-2xl border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-md flex items-center gap-1.5">
                <Briefcase className="w-3 h-3 text-indigo-400" />
                Executive Boardroom Command Center
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {meta?.company_name || 'Kamla Enterprises Pvt Ltd'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-indigo-300 font-semibold">
                {meta?.period_label || 'Current Period'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Director Executive Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Consolidated enterprise health: real-time gross revenue, raw material consumption (COGS), payroll overhead, collections velocity, and plant operations.
            </p>
          </div>

          {/* Executive Utility Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Unit Toggle */}
            <div className="inline-flex rounded-lg bg-white/10 p-1 border border-white/15 text-xs font-semibold backdrop-blur-md">
              <button
                type="button"
                onClick={() => setUnitMode('LAKHS')}
                className={`px-2.5 py-1 rounded-md transition-all ${unitMode === 'LAKHS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
              >
                ₹ Lakhs
              </button>
              <button
                type="button"
                onClick={() => setUnitMode('FULL')}
                className={`px-2.5 py-1 rounded-md transition-all ${unitMode === 'FULL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
              >
                Full ₹
              </button>
            </div>

            {/* Privacy Mask Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrivacyMask(prev => !prev)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9 backdrop-blur-md"
              title="Mask confidential figures for boardroom presentations"
            >
              {privacyMask ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 mr-1.5 text-amber-300" /> Unmask ₹
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-300" /> Mask Confidential
                </>
              )}
            </Button>

            {/* Print / PDF Briefing */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9 backdrop-blur-md"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-blue-300" /> Board Briefing PDF
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboard(period === 'custom' ? { period: 'custom', start_date: customStart, end_date: customEnd } : { period })}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9 backdrop-blur-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ── TIME PERIOD FILTER STRIP ── */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Period:
            </span>
            {[
              { id: 'today', label: 'Today (Live)' },
              { id: 'wtd', label: 'This Week (WTD)' },
              { id: 'mtd', label: 'This Month (MTD)' },
              { id: 'qtd', label: 'Quarter (QTD)' },
              { id: 'ytd', label: 'Financial Year (YTD)' },
              { id: 'custom', label: '📅 Custom Range' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id as any);
                  if (p.id === 'custom') setShowCustomPicker(true);
                  else setShowCustomPicker(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  period === p.id
                    ? 'bg-white text-slate-900 shadow-md scale-102'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400">
            Window: <span className="text-white font-mono">{meta?.start_date}</span> to <span className="text-white font-mono">{meta?.end_date}</span> ({meta?.days_in_period || 30} days)
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {period === 'custom' && (
          <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/15 flex flex-wrap items-center gap-3 animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">From:</span>
              <Input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="h-8 text-xs bg-slate-900 text-white border-slate-700 w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">To:</span>
              <Input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="h-8 text-xs bg-slate-900 text-white border-slate-700 w-36"
              />
            </div>
            <Button
              size="sm"
              disabled={!customStart || !customEnd}
              onClick={() => fetchDashboard({ period: 'custom', start_date: customStart, end_date: customEnd })}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 font-bold"
            >
              Apply Filter
            </Button>
          </div>
        )}
      </div>

      {/* ── EXECUTIVE NOTIFICATION BANNER (IF PENDING BOARD ACTIONS) ── */}
      {pending && (pending.pending_cns_count > 0 || pending.pending_exp_count > 0) && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200">Director Sign-off Pending: </span>
              <span className="text-amber-800 dark:text-amber-300">
                {pending.pending_cns_count > 0 && `${pending.pending_cns_count} Credit Note/Discount requests (₹${pending.pending_cns_amount.toLocaleString('en-IN')})`}
                {pending.pending_cns_count > 0 && pending.pending_exp_count > 0 && ' and '}
                {pending.pending_exp_count > 0 && `${pending.pending_exp_count} Expense vouchers (₹${pending.pending_exp_amount.toLocaleString('en-IN')})`}
                {' require executive approval.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pending.pending_cns_count > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/finance/cn-requests')}
                className="h-8 text-[11px] font-bold border-amber-400 text-amber-900 hover:bg-amber-100"
              >
                Review CN Requests ➔
              </Button>
            )}
            {pending.pending_exp_count > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/hr/manage?tab=expenses')}
                className="h-8 text-[11px] font-bold border-amber-400 text-amber-900 hover:bg-amber-100"
              >
                Review Expenses ➔
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ── 1. THE BOARDROOM FINANCIAL TICKER (6 CORE ENTERPRISE PILLARS) ── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        
        {/* Card 1: Net Operating Surplus (EBITDA Proxy) */}
        <Card className="border border-emerald-200 dark:border-emerald-950 bg-gradient-to-b from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              <span>NET OPERATING SURPLUS</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-black ${((ticker?.net_operating_surplus || 0) >= 0) ? 'text-emerald-950 dark:text-emerald-100' : 'text-rose-600'}`}>
              {formatCurrency(ticker?.net_operating_surplus)}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
              <span className="text-muted-foreground font-medium">Net Margin:</span>
              <Badge className={`${((ticker?.net_operating_margin_pct || 0) >= 20) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold`}>
                {ticker?.net_operating_margin_pct || 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Gross Billed Sales */}
        <Card className="border border-blue-200 dark:border-blue-950 bg-gradient-to-b from-white to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
              <span>GROSS BILLED SALES</span>
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100">
              {formatCurrency(ticker?.gross_sales)}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-100 dark:border-blue-900/40">
              <span className="text-muted-foreground font-medium">Orders / Items:</span>
              <span className="font-bold text-foreground">
                {ticker?.order_count || 0} ord / {ticker?.units_sold || 0} units
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Raw Material Consumption (COGS) */}
        <Card className="border border-amber-200 dark:border-amber-950 bg-gradient-to-b from-white to-amber-50/40 dark:from-slate-900 dark:to-amber-950/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              <span>RM CONSUMPTION (COGS)</span>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100">
              {formatCurrency(ticker?.rm_consumption)}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-amber-100 dark:border-amber-900/40">
              <span className="text-muted-foreground font-medium">COGS % of Sales:</span>
              <Badge variant="outline" className="text-amber-800 dark:text-amber-300 font-bold text-[10px] border-amber-300">
                {ticker?.cogs_ratio_pct || 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Workforce Payroll */}
        <Card className="border border-purple-200 dark:border-purple-950 bg-gradient-to-b from-white to-purple-50/40 dark:from-slate-900 dark:to-purple-950/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-400">
              <span>TOTAL PAYROLL (SALARY)</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-950 dark:text-purple-100">
              {formatCurrency(ticker?.total_payroll)}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-purple-100 dark:border-purple-900/40">
              <span className="text-muted-foreground font-medium">Fixed / Variable:</span>
              <span className="font-bold text-foreground">
                {ticker?.fixed_headcount || 0} Fix / {ticker?.variable_headcount || 0} Var
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Payment Collections */}
        <Card className="border border-teal-200 dark:border-teal-950 bg-gradient-to-b from-white to-teal-50/40 dark:from-slate-900 dark:to-teal-950/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
              <span>PAYMENT COLLECTIONS</span>
              <Wallet className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-teal-950 dark:text-teal-100">
              {formatCurrency(ticker?.collections)}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-teal-100 dark:border-teal-900/40">
              <span className="text-muted-foreground font-medium">Collection Strike:</span>
              <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 font-bold text-[10px]">
                {ticker?.collection_strike_pct || 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Market Receivables & DSO */}
        <Card className="border border-slate-300 dark:border-slate-800 bg-gradient-to-b from-white to-slate-100/50 dark:from-slate-900 dark:to-slate-950 shadow-sm relative overflow-hidden">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <span>DEBTOR RECEIVABLES</span>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(ticker?.receivables_outstanding)}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-muted-foreground font-medium">DSO Cycle:</span>
              <span className="font-bold text-foreground">
                {ticker?.dso_days || 0} Days
              </span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ── 2. EXECUTIVE P&L WATERFALL & 6-MONTH TREND ── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Panel A: The Executive Profit & Loss Waterfall Step-Down (7 cols) */}
        <Card className="lg:col-span-7 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-4 px-5 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Director P&L Contribution & Waterfall Step-Down
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Distribution of gross sales into raw materials, payroll, operating expenses, and realized surplus.
              </p>
            </div>
            <Badge className="bg-indigo-100 text-indigo-900 dark:bg-indigo-950 text-[10px] font-bold">
              Gross Margin: {ticker?.gross_margin_pct || 0}%
            </Badge>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {data?.waterfall?.map((step, idx) => {
              const isPositive = step.amount >= 0;
              const isTotal = step.type === 'TOTAL';
              const isSubtotal = step.type === 'SUBTOTAL';

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={`flex items-center gap-2 ${isTotal ? 'text-emerald-700 dark:text-emerald-400 font-extrabold text-sm' : isSubtotal ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-foreground'}`}>
                      {isTotal ? '🏁 ' : isSubtotal ? '➔ ' : '• '}
                      {step.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {step.pct > 0 ? `+${step.pct}%` : `${step.pct}%`}
                      </span>
                      <span className={`font-mono ${isTotal ? 'text-sm font-extrabold text-emerald-600 dark:text-emerald-400' : isPositive ? 'text-foreground font-bold' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(step.amount, true)}
                      </span>
                    </div>
                  </div>

                  {/* Progress visualization */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTotal
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : isSubtotal
                          ? 'bg-indigo-500'
                          : step.type === 'REVENUE'
                          ? 'bg-blue-600'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.abs(step.pct))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Panel B: Top 5 Margin-Yielding Finished Goods (5 cols) */}
        <Card className="lg:col-span-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <CardHeader className="py-4 px-5 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                Top Margin-Yielding Finished Goods
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Highest gross profit contribution across sold products.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inventory/manage?tab=products')}
              className="text-[11px] h-7 text-indigo-600"
            >
              Catalog ➔
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-[10px] uppercase">
                  <th className="px-3.5 py-2.5">Product SKU</th>
                  <th className="px-2 py-2.5 text-right">Sold</th>
                  <th className="px-2 py-2.5 text-right">Gross Rev</th>
                  <th className="px-3 py-2.5 text-right">Gross Profit</th>
                  <th className="px-3 py-2.5 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.top_margin_products && data.top_margin_products.length > 0 ? (
                  data.top_margin_products.map((sku, idx) => (
                    <tr key={sku.id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3.5 py-2.5 font-semibold text-foreground max-w-[140px] truncate" title={sku.name}>
                        <div>{sku.name}</div>
                        <span className="text-[10px] text-muted-foreground font-mono">{sku.code}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-muted-foreground">
                        {sku.units_sold}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono">
                        {formatCurrency(sku.revenue)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(sku.gross_profit)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Badge className={`${sku.margin_pct >= 40 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950' : 'bg-slate-100 text-slate-800 dark:bg-slate-800'} text-[10px] font-bold`}>
                          {sku.margin_pct}%
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">
                      No order items found in the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ── 3. BRIEF OF OPERATIONS (FACTORY MANUFACTURING & FIELD SALES) ── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Operations Card 1: Factory & Plant Manufacturing Command */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-4 px-5 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory className="w-4 h-4 text-purple-600" />
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Plant & Factory Manufacturing Intelligence
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {plant?.facility_name || 'Navsari Manufacturing Facility'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inventory/manage?tab=productions')}
              className="text-[11px] h-7 font-semibold"
            >
              Batch Logs ➔
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400 block">UNITS PRODUCED</span>
                <span className="text-lg font-black text-purple-950 dark:text-purple-100">
                  {plant?.units_produced?.toLocaleString() || 0}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Finished Bags/Pails</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 block">BATCHES DONE</span>
                <span className="text-lg font-black text-blue-950 dark:text-blue-100">
                  {plant?.batches_completed || 0}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">{plant?.avg_batch_units || 0} avg units/batch</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">CAPACITY UTILIZATION</span>
                <span className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                  {plant?.capacity_utilization_pct || 0}%
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Rated 22k/mo capacity</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">RECIPE YIELD</span>
                <span className="text-lg font-black text-slate-950 dark:text-white">
                  {plant?.material_yield_pct || 98.4}%
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Theoretical vs Actual</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground">Active Plant Supervisors:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {plant?.supervisors?.map((sup, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] font-semibold bg-purple-50/50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200">
                    👷 {sup}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations Card 2: Field Sales Force & Market Intelligence */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-4 px-5 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Field Sales & Beat Market Intelligence
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Sales Officer beat stops, travel efficiency, and order conversion.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/hr/manage?tab=visits')}
              className="text-[11px] h-7 font-semibold"
            >
              Field Tracker ➔
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 block">DEALER VISITS</span>
                <span className="text-lg font-black text-blue-950 dark:text-blue-100">
                  {field?.total_visits || 0}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Field Beat Stops</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">CONVERSION RATE</span>
                <span className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                  {field?.strike_rate_pct || 0}%
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">{field?.converted_orders || 0} orders booked</span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400 block">TRAVEL LOGGED</span>
                <span className="text-lg font-black text-indigo-950 dark:text-indigo-100">
                  {field?.travel_km?.toLocaleString() || 0} <span className="text-xs font-semibold">KM</span>
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Odometer Verified</span>
              </div>

              <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
                <span className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400 block">REVENUE / KM</span>
                <span className="text-lg font-black text-teal-950 dark:text-teal-100">
                  ₹{Math.round(field?.revenue_per_km || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Travel ROI</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground">Field Travel Cost-to-Sales:</span>
              <span className="font-bold text-foreground">
                {field?.field_cost_ratio_pct || 0}% of Gross Sales
              </span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ── 4. SIX-MONTH LIQUIDITY & SALES HISTORICAL RUN-RATE ── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="py-4 px-5 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              6-Month Enterprise Trajectory (Sales vs Collections vs Consumption)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical performance: comparing invoiced sales against cash collections and raw material depletion.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Last 6 Months
          </Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-[10px] uppercase">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Gross Sales Billed</th>
                <th className="px-4 py-3 text-right">RM Consumption (COGS)</th>
                <th className="px-4 py-3 text-right">Cash Collections</th>
                <th className="px-4 py-3 text-right">Collection Realization %</th>
                <th className="px-4 py-3 text-right">Production Surplus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {data?.trend && data.trend.length > 0 ? (
                data.trend.map((row, idx) => {
                  const collectionPct = row.sales > 0 ? Math.round((row.collections / row.sales) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground font-sans">
                        {row.month}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-900 dark:text-blue-200">
                        {formatCurrency(row.sales)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-300">
                        {formatCurrency(row.cogs)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-teal-700 dark:text-teal-300">
                        {formatCurrency(row.collections)}
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <Badge className={`${collectionPct >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold`}>
                          {collectionPct}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.surplus)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">
                    No historical data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
};

export default DirectorDashboardPage;
