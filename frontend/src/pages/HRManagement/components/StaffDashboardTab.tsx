import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHREmployees, useHRUsers } from '@/hooks/hr/useHR';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/client';
import { travelService } from '@/api/services/travel.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Clock,
  Gauge,
  Receipt,
  FileBarChart,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Plus,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  UserCheck,
  Building2,
  Award,
  Wallet,
  Zap,
  Target,
  ShoppingCart,
  Factory,
  ArrowUpRight,
  BarChart3,
  Loader2,
  Activity,
  Check
} from 'lucide-react';

interface WorkforceIntel {
  overview: {
    total_headcount: number;
    active_headcount: number;
    fixed_headcount: number;
    variable_headcount: number;
    sales_headcount: number;
    production_headcount: number;
    revenue_per_company_employee: number;
    departments: Record<string, number>;
  };
  sales_ratios: {
    sales_per_rep_monthly: number;
    sales_per_rep_all_time: number;
    daily_sales_per_rep: number;
    total_sales_all_time: number;
    total_orders_all_time: number;
    monthly_sales: number;
    monthly_orders_count: number;
    today_sales: number;
    today_orders_count: number;
    average_order_value: number;
    total_visits: number;
    visit_to_order_ratio_pct: number;
    total_travel_km: number;
    sales_revenue_per_km: number;
    travel_cost_to_revenue_pct: number;
    revenue_per_travel_rupee: number;
  };
  production_ratios: {
    total_units_produced: number;
    total_batches_completed: number;
    units_per_worker: number;
    batches_per_worker: number;
    avg_batch_output: number;
  };
  sales_leaderboard: Array<{
    email: string;
    name: string;
    role: string;
    total_sales: number;
    order_count: number;
    average_order_value: number;
    visits_count: number;
    travel_km: number;
    sales_per_km: number;
    target_amount: number;
    target_achievement_pct: number | null;
  }>;
  production_breakdown: Array<{
    name: string;
    warehouse_name?: string;
    warehouse_id?: string | number;
    email?: string;
    supervisors?: string;
    supervisors_detail?: Array<{
      name: string;
      email: string;
      units: number;
      batches: number;
    }>;
    units_produced: number;
    batches_completed: number;
    avg_batch_size: number;
    contribution_pct: number;
  }>;
}

export const StaffDashboardTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: employees = [], isLoading: empLoading } = useHREmployees();
  const { data: users = [] } = useHRUsers();

  const [travelLogs, setTravelLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [workforceIntel, setWorkforceIntel] = useState<WorkforceIntel | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeRatioTab, setActiveRatioTab] = useState<'ALL' | 'SALES' | 'PRODUCTION' | 'TRAVEL'>('ALL');

  // User lookup map for names and emails
  const userMap = useMemo(() => {
    const map: Record<string, { name: string; email: string }> = {};
    users.forEach((u: any) => {
      if (u.id) map[u.id] = { name: u.name || u.email, email: u.email || '' };
      if (u.email) map[u.email.toLowerCase()] = { name: u.name || u.email, email: u.email };
    });
    return map;
  }, [users]);

  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const roleUpper = (user?.role || '').toUpperCase();
  const isAdminOrSuperAdmin = ['SUPERADMIN', 'ADMIN', 'SUPER_ADMIN', 'OWNER'].includes(roleUpper);

  useEffect(() => {
    if (!isAdminOrSuperAdmin) {
      setLoadingStats(false);
      return;
    }
    const fetchDashboardData = async () => {
      try {
        setLoadingStats(true);
        const [travelRes, expRes, intelRes] = await Promise.allSettled([
          travelService.getHRLogs({ month: currentMonth }),
          api.get('/expenses/'),
          api.get(`/hr/workforce-intelligence?month=${currentMonth}`),
        ]);

        if (travelRes.status === 'fulfilled' && travelRes.value.data?.data) {
          setTravelLogs(travelRes.value.data.data);
        }
        if (expRes.status === 'fulfilled' && expRes.value.data?.data) {
          setExpenses(expRes.value.data.data);
        }
        if (intelRes.status === 'fulfilled' && intelRes.value.data?.data) {
          setWorkforceIntel(intelRes.value.data.data);
        }
      } catch (err) {
        console.error('Failed to load HR dashboard overview data:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, [currentMonth, isAdminOrSuperAdmin]);

  // Employee Statistics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e: any) => e.active !== false).length;
  const fixedCount = employees.filter((e: any) => e.employee_type === 'FIXED').length;
  const variableCount = employees.filter((e: any) => e.employee_type === 'VARIABLE').length;

  // Department distribution
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((e: any) => {
      const dept = (e.department || 'OTHER').toUpperCase();
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [employees]);

  // Travel Stats
  const pendingTravelLogs = travelLogs.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const approvedTravelLogs = travelLogs.filter(t => t.status === 'APPROVED');
  const totalKmApproved = approvedTravelLogs.reduce((acc, t) => acc + (Number(t.approved_km ?? t.total_km) || 0), 0);

  // Expense Stats
  const pendingExpenses = expenses.filter(e => e.status === 'PENDING');
  const approvedExpenses = expenses.filter(e => e.status === 'APPROVED');
  const pendingExpenseAmount = pendingExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const approvedExpenseAmount = approvedExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  if (!isAdminOrSuperAdmin) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed">
        <h3 className="text-sm font-semibold text-foreground">Access Restricted</h3>
        <p className="text-xs text-muted-foreground mt-1">
          The Staff Operations & Workforce Dashboard is exclusively accessible to Administrators.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* ── Top Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20 backdrop-blur-xs">
                Staff & HR Operations Suite
              </span>
              <span className="text-xs text-blue-200">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Staff Operations & Workforce Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mt-1">
              Workforce intelligence analytics: monitoring daily product output per worker, sales productivity per employee, field travel efficiency, and monthly payroll.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => navigate('/finance/ledger')}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold backdrop-blur-xs text-xs h-9 border border-white/30"
            >
              <Wallet className="w-4 h-4 mr-1.5 text-blue-200" /> Party Ledgers & CN
            </Button>
            <Button
              onClick={() => navigate('/hr/manage?tab=travel')}
              className="bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-md text-xs h-9"
            >
              <Plus className="w-4 h-4 mr-1.5 text-blue-700" /> + Add Travel Log (Manual)
            </Button>
            <Button
              onClick={() => navigate('/hr/manage?tab=payroll')}
              className="bg-purple-500/30 hover:bg-purple-500/40 text-white border border-white/30 font-semibold backdrop-blur-xs text-xs h-9"
            >
              <FileBarChart className="w-4 h-4 mr-1.5" /> View Payroll & Slips
            </Button>
          </div>
        </div>

        {/* Decorative backdrop elements */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-12 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <Card className="hover:shadow-md transition-shadow border-blue-100 dark:border-blue-950/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" /> Total Active Staff
              </span>
              <div className="text-2xl font-black text-foreground">
                {empLoading ? '...' : activeEmployees}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  / {totalEmployees} registered
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  {fixedCount} Fixed
                </Badge>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-purple-50 text-purple-700 border-purple-200">
                  {variableCount} Variable
                </Badge>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Travel Approvals */}
        <Card className="hover:shadow-md transition-shadow border-amber-100 dark:border-amber-950/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-600" /> Field Travel & KM
              </span>
              <div className="text-2xl font-black text-foreground flex items-baseline gap-1.5">
                <span>{pendingTravelLogs.length}</span>
                <span className="text-xs font-semibold text-amber-600">Pending Review</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{totalKmApproved.toFixed(1)} KM</span> verified this month
              </div>
            </div>
            <div 
              onClick={() => navigate('/hr/manage?tab=travel')}
              className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0 cursor-pointer hover:bg-amber-100 transition-colors"
              title="Open Travel Approvals"
            >
              <Gauge className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Expense Approvals */}
        <Card className="hover:shadow-md transition-shadow border-emerald-100 dark:border-emerald-950/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Pending Expense Claims
              </span>
              <div className="text-2xl font-black text-foreground flex items-baseline gap-1.5">
                <span>{pendingExpenses.length}</span>
                <span className="text-xs font-semibold text-emerald-600">₹{pendingExpenseAmount.toFixed(0)}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-700">₹{approvedExpenseAmount.toFixed(0)}</span> approved &amp; synced
              </div>
            </div>
            <div 
              onClick={() => navigate('/hr/manage?tab=expenses')}
              className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0 cursor-pointer hover:bg-emerald-100 transition-colors"
              title="Open Expense Approvals"
            >
              <Receipt className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Payroll Readiness */}
        <Card className="hover:shadow-md transition-shadow border-purple-100 dark:border-purple-950/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileBarChart className="w-3.5 h-3.5 text-purple-600" /> Payroll Period
              </span>
              <div className="text-2xl font-black text-foreground">
                {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold cursor-pointer hover:underline" onClick={() => navigate('/hr/manage?tab=payroll')}>
                <span>Generate &amp; Review Slips</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
            <div 
              onClick={() => navigate('/hr/manage?tab=payroll')}
              className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0 cursor-pointer hover:bg-purple-100 transition-colors"
              title="Open Payroll"
            >
              <FileBarChart className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* ── HUMAN CAPITAL & WORKFORCE PRODUCTIVITY RATIOS (NEW HIGH-VALUE HUB) ── */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-950">
        <CardHeader className="py-4 px-5 border-b border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/15">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-base md:text-lg font-bold text-foreground">
                Human Capital & Workforce Productivity Ratios
              </CardTitle>
              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 text-[10px] font-bold">
                Workforce Intelligence
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Cross-departmental productivity: daily product output per worker, sales revenue per employee, field travel ROI, and basket conversion.
            </p>
          </div>

          {/* Filter Pills Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-background text-xs">
            {[
              { id: 'ALL', label: 'All Ratios' },
              { id: 'SALES', label: 'Sales Force' },
              { id: 'PRODUCTION', label: 'Plant & Production' },
              { id: 'TRAVEL', label: 'Travel ROI' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRatioTab(tab.id as any)}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  activeRatioTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Key 6 Ratio Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            
            {/* Ratio 1: Monthly Sales per Sales Rep */}
            <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center justify-between">
                <span>SALES / REP (MO)</span>
                <ShoppingCart className="w-3.5 h-3.5" />
              </span>
              <div className="text-lg font-black text-blue-950 dark:text-blue-100">
                ₹{((workforceIntel?.sales_ratios?.sales_per_rep_monthly || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                All-time: ₹{((workforceIntel?.sales_ratios?.sales_per_rep_all_time || 0) / 100000).toFixed(2)}L / rep
              </p>
            </div>

            {/* Ratio 2: Units per Plant Worker */}
            <div className="p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center justify-between">
                <span>OUTPUT / WORKER</span>
                <Factory className="w-3.5 h-3.5" />
              </span>
              <div className="text-lg font-black text-purple-950 dark:text-purple-100">
                {(workforceIntel?.production_ratios?.units_per_worker || 0).toLocaleString()} <span className="text-xs font-semibold">Units</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {workforceIntel?.production_ratios?.batches_per_worker || 0} batches / worker
              </p>
            </div>

            {/* Ratio 3: Field Travel ROI (Sales / KM) */}
            <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                <span>SALES / KM (ROI)</span>
                <Gauge className="w-3.5 h-3.5" />
              </span>
              <div className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                ₹{(workforceIntel?.sales_ratios?.sales_revenue_per_km || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Revenue per travelled KM
              </p>
            </div>

            {/* Ratio 4: Average Order Basket Size */}
            <div className="p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>AVG ORDER BASKET</span>
                <DollarSign className="w-3.5 h-3.5" />
              </span>
              <div className="text-lg font-black text-amber-950 dark:text-amber-100">
                ₹{(workforceIntel?.sales_ratios?.average_order_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Across {workforceIntel?.sales_ratios?.total_orders_all_time || 0} total orders
              </p>
            </div>

            {/* Ratio 5: Strike Rate (Orders / Visits) */}
            <div className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center justify-between">
                <span>VISIT CONVERSION</span>
                <Target className="w-3.5 h-3.5" />
              </span>
              <div className="text-lg font-black text-rose-950 dark:text-rose-100">
                {(workforceIntel?.sales_ratios?.visit_to_order_ratio_pct || 0)}%
              </div>
              <p className="text-[10px] text-muted-foreground">
                Orders vs logged dealer visits
              </p>
            </div>

            {/* Ratio 6: Company Revenue per Staff */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>REVENUE / STAFF</span>
                <Award className="w-3.5 h-3.5" />
              </span>
              <div className="text-lg font-black text-slate-900 dark:text-white">
                ₹{(workforceIntel?.overview?.revenue_per_company_employee || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Total Sales ÷ {workforceIntel?.overview?.total_headcount || 16} staff
              </p>
            </div>
          </div>

          {/* Conditional Sub-View Tables based on activeRatioTab */}
          {(activeRatioTab === 'ALL' || activeRatioTab === 'SALES' || activeRatioTab === 'TRAVEL') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  Sales Force Human Performance & Productivity Scorecard
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Individual revenue generation, order size & field travel efficiency
                </span>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-3 py-2.5">Rank</th>
                        <th className="px-3 py-2.5">Sales Officer</th>
                        <th className="px-3 py-2.5">Role</th>
                        <th className="px-3 py-2.5 text-right">Orders</th>
                        <th className="px-3 py-2.5 text-right">Total Revenue (₹)</th>
                        <th className="px-3 py-2.5 text-right">Avg Order (₹)</th>
                        <th className="px-3 py-2.5 text-right">Visits</th>
                        <th className="px-3 py-2.5 text-right">Travel (KM)</th>
                        <th className="px-3 py-2.5 text-right">Field ROI (₹/KM)</th>
                        <th className="px-3 py-2.5 text-center">Target %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(!workforceIntel?.sales_leaderboard || workforceIntel.sales_leaderboard.length === 0) ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-muted-foreground">
                            No sales rep records found.
                          </td>
                        </tr>
                      ) : (
                        workforceIntel.sales_leaderboard.map((so, idx) => (
                          <tr key={so.email} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-muted-foreground">
                              #{idx + 1}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-foreground">
                              {so.name}
                              <span className="block text-[10px] font-normal text-muted-foreground font-mono">{so.email}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant="outline" className="text-[9px] py-0 border-blue-200 text-blue-700 bg-blue-50">
                                {so.role}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold">
                              {so.order_count}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              ₹{so.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-foreground">
                              ₹{so.average_order_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {so.visits_count}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {so.travel_km > 0 ? `${so.travel_km} KM` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                              {so.sales_per_km > 0 ? `₹${so.sales_per_km.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/KM` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {so.target_achievement_pct !== null ? (
                                <Badge className={`text-[10px] ${
                                  so.target_achievement_pct >= 100
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : so.target_achievement_pct >= 60
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}>
                                  {so.target_achievement_pct}%
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Standard</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Plant & Production Labour Efficiency Table */}
          {(activeRatioTab === 'ALL' || activeRatioTab === 'PRODUCTION') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-purple-600" />
                  Plant & Warehouse Production Output Breakdown
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Finished goods units produced, manufacturing batches handled & facility contribution share
                </span>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-3 py-2.5">Rank</th>
                        <th className="px-3 py-2.5">Manufacturing Facility / Plant</th>
                        <th className="px-3 py-2.5 text-right">Units Produced</th>
                        <th className="px-3 py-2.5 text-right">Batches Handled</th>
                        <th className="px-3 py-2.5 text-right">Avg Batch Size</th>
                        <th className="px-3 py-2.5 text-right">Factory Contribution %</th>
                        <th className="px-4 py-2.5 min-w-[140px]">Production Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(!workforceIntel?.production_breakdown || workforceIntel.production_breakdown.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-muted-foreground">
                            No production batch logs recorded yet.
                          </td>
                        </tr>
                      ) : (
                        workforceIntel.production_breakdown.map((op, idx) => (
                          <tr key={op.name + idx} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-muted-foreground">
                              #{idx + 1}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <Factory className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span className="font-bold text-foreground text-xs">{op.warehouse_name || op.name}</span>
                              </div>
                              {op.supervisors && (
                                <div className="text-[10px] font-normal text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Supervisors:</span>
                                  <span>{op.supervisors}</span>
                                </div>
                              )}
                              {op.supervisors_detail && op.supervisors_detail.length > 1 && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {op.supervisors_detail.map(sup => (
                                    <span key={sup.email} className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                      <span className="font-medium">{sup.name}:</span>
                                      <span className="font-mono font-bold">{sup.units.toLocaleString()} u</span>
                                      <span className="text-muted-foreground font-normal">({sup.batches} b)</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                              {op.units_produced.toLocaleString()} <span className="text-[10px] font-normal">units</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold">
                              {op.batches_completed} batches
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                              {op.avg_batch_size} units/batch
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                              {op.contribution_pct}%
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-purple-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, op.contribution_pct)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Two Columns: Operations Overview & Navigation Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Pending Approvals & Operations Live Stream */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pending Travel & Field Reviews */}
          <Card>
            <CardHeader className="py-3.5 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-600" />
                <span>Field Travel &amp; KM Approvals Queue</span>
                {pendingTravelLogs.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold border-amber-300">
                    {pendingTravelLogs.length} Need Action
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-primary font-semibold hover:underline"
                onClick={() => navigate('/hr/manage?tab=travel')}
              >
                View All Travel Logs &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {pendingTravelLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground">All field travel logs are reviewed!</p>
                  <p className="mt-0.5">No pending odometer submissions requiring admin review.</p>
                </div>
              ) : (
                pendingTravelLogs.slice(0, 4).map((log) => {
                  const officerName = log.user_name || userMap[log.user_id]?.name || log.user_email || 'Field Officer';
                  const officerEmail = log.user_email || userMap[log.user_id]?.email || '';
                  const initial = (officerName || 'F').charAt(0).toUpperCase();

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{officerName}</span>
                            <Badge variant="outline" className="text-[9px] py-0 border-amber-300 text-amber-700 bg-amber-50">
                              {log.status}
                            </Badge>
                            {(log.is_admin_edited || log.edited_by_admin) && (
                              <Badge className="bg-purple-600 text-white text-[9px] py-0 font-bold">
                                EDITED BY ADMIN
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            {officerEmail && <span>{officerEmail}</span>}
                            {officerEmail && <span>&bull;</span>}
                            <span>Date: {log.date}</span>
                            <span>&bull;</span>
                            <span>Vehicle: {log.vehicle_type}</span>
                            <span>&bull;</span>
                            <span className="font-semibold text-foreground">
                              {log.total_km ? `${log.total_km} KM` : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-amber-300 text-amber-800 hover:bg-amber-50 font-bold"
                        onClick={() => navigate('/hr/manage?tab=travel')}
                      >
                        Review
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Pending Expense Claims */}
          <Card>
            <CardHeader className="py-3.5 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Employee Expense Claims Queue</span>
                {pendingExpenses.length > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-emerald-300">
                    {pendingExpenses.length} Pending
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-primary font-semibold hover:underline"
                onClick={() => navigate('/hr/manage?tab=expenses')}
              >
                View All Expense Claims &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {pendingExpenses.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground">No pending expense claims!</p>
                  <p className="mt-0.5">All employee reimbursement vouchers are up to date.</p>
                </div>
              ) : (
                pendingExpenses.slice(0, 4).map((exp) => {
                  const expEmail = exp.soEmail || exp.soemail || '';
                  const expName = exp.soName || userMap[expEmail.toLowerCase()]?.name || expEmail || 'Employee';
                  const expInitial = (expName || 'E').charAt(0).toUpperCase();

                  return (
                    <div
                      key={exp.id}
                      className="p-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                          {expInitial}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{expName}</span>
                            <Badge variant="outline" className="text-[9px] py-0 border-emerald-300 text-emerald-700 bg-emerald-50">
                              {exp.category || 'General'}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            {expEmail && expEmail !== expName && (
                              <>
                                <span>{expEmail}</span>
                                <span>&bull;</span>
                              </>
                            )}
                            <span>Date: {exp.date?.slice(0, 10)}</span>
                            <span>&bull;</span>
                            <span className="font-bold text-emerald-700">₹{Number(exp.amount || 0).toFixed(2)}</span>
                            {exp.remarks && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate max-w-[200px]">{exp.remarks}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold"
                        onClick={() => navigate('/hr/manage?tab=expenses')}
                      >
                        Verify
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column (1 Col): Team Breakdown & Quick Hub */}
        <div className="space-y-6">
          
          {/* Department Breakdown */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Department Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {Object.keys(departmentCounts).length === 0 ? (
                <div className="text-xs text-muted-foreground">No employee records configured yet.</div>
              ) : (
                Object.entries(departmentCounts).map(([dept, count]) => {
                  const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{dept}</span>
                        <span className="text-muted-foreground">{count} staff ({pct}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quick HR Navigation Hub */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Quick HR Access Hub</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {[
                { label: 'Party Ledgers & CN', path: '/finance/ledger', icon: Wallet, desc: 'Live ERP party statement & balance' },
                { label: 'Employee Master', path: '/hr/manage?tab=employees', icon: Users, desc: 'Staff directory & KYC' },
                { label: 'Daily Attendance', path: '/hr/manage?tab=attendance', icon: Clock, desc: 'Biometric punches & shift logs' },
                { label: 'SO Field Visits', path: '/hr/manage?tab=visits', icon: MapPin, desc: 'Beat visit tracker & dealer stops' },
                { label: 'Travel & KM Approvals', path: '/hr/manage?tab=travel', icon: Gauge, desc: 'Field trip odometer reviews' },
                { label: 'Spend & Bill Approvals', path: '/hr/manage?tab=expenses', icon: Receipt, desc: 'Expense reimbursements' },
                { label: 'Payroll & Slips', path: '/hr/manage?tab=payroll', icon: FileBarChart, desc: 'Salary slip generation' },
                { label: 'Employee Ledger', path: '/hr/manage?tab=ledger', icon: Wallet, desc: 'Advance salaries & loans' },
                { label: 'Leave Management', path: '/hr/manage?tab=leaves', icon: CalendarCheck, desc: 'Applications & holidays' },
                { label: 'Official Documents', path: '/hr/manage?tab=documents', icon: Award, desc: 'Letters & ID cards' },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-muted/60 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default StaffDashboardTab;
