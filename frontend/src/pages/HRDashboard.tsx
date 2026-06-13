import React, { useState, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Expense, Visit } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { 
  Users, Target, TrendingUp, IndianRupee, MapPin, Receipt, 
  Download, Search, ZoomIn, ZoomOut, RotateCw, RefreshCw, X, Award, FileText, CheckCircle2, AlertTriangle, Clock, Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

const COLORS = ['#1e40af', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

type Tab = 'overview' | 'performance' | 'visits' | 'expenses';
type DateRange = 'ALL' | '7D' | '30D' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY';

const HRDashboard: React.FC = () => {
  const { orders, dealers, users, visits, expenses, updateUserTarget, updateExpenseStatus, updateVisitStatus } = useData();
  const { can } = usePermissions();
  const { fyBounds, fyLabel } = useFinancialYear();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Advanced Filters States
  const [selectedSo, setSelectedSo] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>('THIS_FY');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Target Editor Modal States
  const [editingTargetUser, setEditingTargetUser] = useState<{ id: string; name: string; currentTarget: number } | null>(null);
  const [newTargetValue, setNewTargetValue] = useState<string>('');

  // Rejection Reason Modal States
  const [rejectingExpense, setRejectingExpense] = useState<{ id: string; currentSo: string; amount: number } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Visit Verification States
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [flaggingVisit, setFlaggingVisit] = useState<{ id: string; soEmail: string; dealer: string } | null>(null);
  const [flagReason, setFlagReason] = useState<string>('');
  const [visitZoom, setVisitZoom] = useState(1);
  const [visitRotate, setVisitRotate] = useState(0);

  // Lightbox Media States
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);

  if (!can('view_reports')) {
    return <Navigate to="/" replace />;
  }

  const salesUsers = users.filter(u => u.role === 'SALES');

  // Date Filtering Helper
  const matchesDateRange = (dateStr: string) => {
    if (dateRange === 'ALL' || !dateStr) return true;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;
    
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    if (dateRange === 'THIS_FY') {
      if (!fyBounds) return true; // 'ALL' FY selected — show everything
      return itemDate >= fyBounds.start && itemDate < fyBounds.endExclusive;
    }
    if (dateRange === '7D') {
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - 7);
      pastDate.setHours(0, 0, 0, 0);
      return itemDate >= pastDate && itemDate <= now;
    }
    if (dateRange === '30D') {
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - 30);
      pastDate.setHours(0, 0, 0, 0);
      return itemDate >= pastDate && itemDate <= now;
    }
    if (dateRange === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= startOfMonth && itemDate <= now;
    }
    if (dateRange === 'LAST_MONTH') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return itemDate >= startOfLastMonth && itemDate <= endOfLastMonth;
    }
    return true;
  };

  // dynamic filtering of core arrays
  const filteredOrders = orders.filter(o => {
    const matchesSO = selectedSo === 'ALL' || o.so_email === selectedSo;
    const matchesDate = matchesDateRange(o.date);
    return matchesSO && matchesDate;
  });

  const filteredCompletedOrders = filteredOrders.filter(o => o.status === 'Completed');

  const filteredVisits = visits.filter(v => {
    const matchesSO = selectedSo === 'ALL' || v.so_email === selectedSo;
    const matchesDate = matchesDateRange(v.date);
    const matchesSearch = searchQuery === '' || 
      (v.dealer_name ?? v.dealerName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.remarks ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.so_email ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSO && matchesDate && matchesSearch;
  });

  const filteredExpenses = expenses.filter(e => {
    const matchesSO = selectedSo === 'ALL' || e.so_email === selectedSo;
    const matchesDate = matchesDateRange(e.date);
    const matchesSearch = searchQuery === '' ||
      (e.category ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.remarks ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.so_email ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSO && matchesDate && matchesSearch;
  });

  // Per-SO stats based on current Date Filter
  const soStats = salesUsers.map(u => {
    const soOrders = orders.filter(o => o.so_email === u.email && matchesDateRange(o.date));
    const soCompleted = soOrders.filter(o => o.status === 'Completed');
    const soVisits = visits.filter(v => v.so_email === u.email && matchesDateRange(v.date));
    const soExpenses = expenses.filter(e => e.so_email === u.email && matchesDateRange(e.date));
    const achieved = soCompleted.reduce((s, o) => s + (o.grand_total ?? o.grandTotal ?? 0), 0);
    const expTotal = soExpenses.reduce((s, e) => s + e.amount, 0);
    const soDealers = dealers.filter(d => d.assigned_so_email === u.email && d.active).length;
    
    // Reactivity fix: Read both camelCase & snake_case targets
    const target = Number(u.monthlyTarget ?? u.monthly_target) || 500000;
    
    return {
      id: u.id || '',
      name: u.name || u.email.split('@')[0],
      shortName: (u.name || '').split(' ')[0] || 'SO',
      email: u.email,
      target, 
      achieved,
      pct: Math.min(100, Math.round((achieved / target) * 100)),
      orders: soOrders.length,
      completed: soCompleted.length,
      dealers: soDealers,
      visits: soVisits.length,
      expenses: expTotal,
    };
  });

  // KPIs Calculations
  const activeSOsCount = selectedSo === 'ALL' ? salesUsers.length : 1;
  const totalRevenue = filteredCompletedOrders.reduce((s, o) => s + (o.grand_total ?? o.grandTotal ?? 0), 0);
  
  const selectedSoStats = selectedSo === 'ALL' ? soStats : soStats.filter(s => s.email === selectedSo);
  const avgAchievement = selectedSoStats.length > 0 ? selectedSoStats.reduce((s, p) => s + p.pct, 0) / selectedSoStats.length : 0;
  const totalVisitsCount = filteredVisits.length;

  // Visit trends (last 7 days, adjusted for active SO)
  const visitTrend = (() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const map: Record<string, { day: string; visits: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map[key] = { day: days[d.getDay()], visits: 0 };
    }
    const trendVisits = visits.filter(v => selectedSo === 'ALL' || v.so_email === selectedSo);
    trendVisits.forEach(v => { if (map[v.date]) map[v.date].visits += 1; });
    return Object.values(map);
  })();

  // Expense breakdown by category
  const expenseByCategory = filteredExpenses.reduce((acc, e) => {
    const found = acc.find(x => x.name === e.category);
    if (found) found.value += e.amount;
    else acc.push({ name: e.category, value: e.amount });
    return acc;
  }, [] as { name: string; value: number }[]);

  // SO-wise expense total
  const expenseBySO = soStats
    .filter(s => selectedSo === 'ALL' || s.email === selectedSo)
    .map(s => ({ name: s.shortName, expenses: s.expenses }));

  // Tab Details
  const TABS: { id: Tab; label: string; icon: React.FC<any> }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'performance', label: 'SO Performance', icon: Target },
    { id: 'visits', label: 'Visit Reports', icon: MapPin },
    { id: 'expenses', label: 'Expense Reports', icon: Receipt },
  ];

  // Helper for CSV export
  const exportToCSV = (filename: string, headers: string[], rows: string[][]) => {
    const content = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const cleanVal = (val ?? '').toString().replace(/"/g, '""');
        return cleanVal.includes(',') || cleanVal.includes('\n') || cleanVal.includes('"') ? `"${cleanVal}"` : cleanVal;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Trigger Handlers
  const handleExportPerformance = () => {
    const headers = ['SO Name', 'Email', 'Target (INR)', 'Achieved (INR)', 'Achievement %', 'Total Orders', 'Completed Orders', 'Assigned Dealers', 'Visits', 'Expenses (INR)'];
    const rows = soStats.map(s => [
      s.name,
      s.email,
      s.target.toString(),
      s.achieved.toString(),
      `${s.pct}%`,
      s.orders.toString(),
      s.completed.toString(),
      s.dealers.toString(),
      s.visits.toString(),
      s.expenses.toString()
    ]);
    exportToCSV(`SO_Performance_Report_${fyLabel}_${dateRange}.csv`, headers, rows);
  };

  const handleExportVisits = () => {
    const headers = ['Date', 'SO Email', 'Dealer Name', 'Remarks', 'Next Followup'];
    const rows = filteredVisits.map(v => [
      v.date,
      v.so_email ?? v.soEmail ?? '',
      v.dealer_name ?? v.dealerName ?? '',
      v.remarks,
      v.next_followup ?? v.nextFollowup ?? '—'
    ]);
    exportToCSV(`Visit_Logs_${selectedSo}_${fyLabel}_${dateRange}.csv`, headers, rows);
  };

  const handleExportExpenses = () => {
    const headers = ['Date', 'SO Email', 'Category', 'Amount (INR)', 'Status', 'Remarks', 'Rejection Reason', 'Declaration'];
    const rows = filteredExpenses.map(e => [
      e.date,
      e.so_email ?? e.soEmail ?? '',
      e.category,
      e.amount.toString(),
      e.status || 'PENDING',
      e.remarks || '—',
      e.reject_reason ?? e.rejectReason ?? '—',
      e.declaration || '—'
    ]);
    exportToCSV(`Expense_Reports_${selectedSo}_${fyLabel}_${dateRange}.csv`, headers, rows);
  };

  const handleSelectExpense = (expense: Expense | null) => {
    setSelectedExpense(expense);
    setZoom(1);
    setRotate(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">HR Dashboard</h1>
          <p className="page-subheader">Monitor team performance, log reports, and expense claims</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'performance' && (
            <Button onClick={handleExportPerformance} variant="outline" size="sm" className="gap-1.5 border-border/50 bg-card hover:bg-muted transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export Report
            </Button>
          )}
          {activeTab === 'visits' && (
            <Button onClick={handleExportVisits} variant="outline" size="sm" className="gap-1.5 border-border/50 bg-card hover:bg-muted transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export Logs
            </Button>
          )}
          {activeTab === 'expenses' && (
            <Button onClick={handleExportExpenses} variant="outline" size="sm" className="gap-1.5 border-border/50 bg-card hover:bg-muted transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export claims
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <Card className="glass-card border-border/40 p-4 shadow-sm bg-card/65 backdrop-blur-md rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* SO Selector */}
            <div className="flex flex-col gap-1.5 min-w-[220px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Filter by Sales Officer</span>
              <select
                value={selectedSo}
                onChange={(e) => setSelectedSo(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all hover:bg-background/85"
              >
                <option value="ALL">All Sales Officers</option>
                {salesUsers.map(u => (
                  <option key={u.email} value={u.email}>
                    {u.name || u.email.split('@')[0]} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Time Period</span>
              <div className="flex h-10 bg-secondary/80 p-0.5 rounded-lg border border-border/40 overflow-x-auto max-w-full">
                {(
                  [
                    { id: 'ALL', label: 'All Time' },
                    { id: 'THIS_FY', label: fyLabel },
                    { id: '7D', label: '7 Days' },
                    { id: '30D', label: '30 Days' },
                    { id: 'THIS_MONTH', label: 'This Month' },
                    { id: 'LAST_MONTH', label: 'Last Month' }
                  ] as const
                ).map(r => (
                  <button
                    key={r.id}
                    onClick={() => setDateRange(r.id)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                      dateRange === r.id
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Text Query Filter */}
          <div className="flex flex-col gap-1.5 w-full md:w-72">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Search Logs</span>
            <div className="relative">
              <Input
                placeholder="Search remark, dealer, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background/50 pl-3 pr-8 hover:bg-background/80 transition-all text-sm rounded-lg"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                {searchQuery ? (
                  <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Search className="w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active SOs', value: activeSOsCount.toString(), icon: Users, color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
          { label: 'Total Revenue', value: `₹${(totalRevenue / 1000).toFixed(0)}K`, icon: IndianRupee, color: 'from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
          { label: 'Avg Achievement', value: `${avgAchievement.toFixed(0)}%`, icon: Target, color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
          { label: 'Total Visits', value: totalVisitsCount.toString(), icon: MapPin, color: 'from-purple-500/10 to-violet-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="glass-card hover:scale-[1.02] duration-300 transition-all rounded-xl border border-border/40 p-5 flex flex-col justify-between h-full bg-gradient-to-br from-card to-background shadow-sm hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center border shadow-xs`}><kpi.icon className="w-5 h-5" /></div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider">Filtered</span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold tracking-tight text-foreground">{kpi.value}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-1 bg-secondary/80 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-background shadow-xs text-foreground font-bold border border-border/20' 
                : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
            }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-card border-border/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground">Target vs Achievement</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={soStats}>
                      <defs>
                        <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.85}/>
                          <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorAchieved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1e40af" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        formatter={(v: number) => [`₹${v.toLocaleString()}`, undefined]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar dataKey="target" fill="url(#colorTarget)" radius={[4, 4, 0, 0]} name="Target" />
                      <Bar dataKey="achieved" fill="url(#colorAchieved)" radius={[4, 4, 0, 0]} name="Achieved" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground">Achievement % per SO</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-2">
                {soStats.map(so => (
                  <div key={so.email} className="group">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{so.name}</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        so.pct >= 100 ? 'bg-green-500/10 text-green-600' :
                        so.pct >= 50 ? 'bg-amber-500/10 text-amber-600' :
                        'bg-red-500/10 text-red-600'
                      }`}>{so.pct}%</span>
                    </div>
                    <div className="h-2.5 bg-secondary rounded-full overflow-hidden border border-border/20 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${so.pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-all ${
                          so.pct >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                          so.pct >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                          'bg-gradient-to-r from-red-500 to-rose-600'
                        }`} 
                      />
                    </div>
                  </div>
                ))}
                {soStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No SO records detected</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── SO Performance Tab ──────────────────────────────── */}
        {activeTab === 'performance' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.15 }} className="space-y-4">
            <Card className="glass-card border-border/40 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">Detailed SO Target & KPI Performance</CardTitle>
                <span className="text-xs text-muted-foreground">Click target icon to modify target amount</span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {['SO Name', 'Email Address', 'Target Goal', 'Achieved', 'Status Bar', 'Orders Total', 'Completed', 'Assigned Dealers', 'Visits Logged', 'Claimed Expenses'].map(h => (
                          <th key={h} className="text-left px-4 py-3.5 text-muted-foreground font-bold whitespace-nowrap text-xs uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {soStats.map(so => (
                        <tr key={so.email} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-foreground whitespace-nowrap">{so.name}</td>
                          <td className="px-4 py-3.5 text-muted-foreground text-xs">{so.email}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">₹{so.target.toLocaleString()}</span>
                              <button 
                                onClick={() => {
                                  setEditingTargetUser({ id: so.id, name: so.name, currentTarget: so.target });
                                  setNewTargetValue(so.target.toString());
                                }} 
                                className="text-muted-foreground hover:text-primary transition-colors p-1 hover:bg-primary/5 rounded" 
                                title="Edit Monthly Target"
                              >
                                <Target className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-primary dark:text-blue-400">₹{so.achieved.toLocaleString()}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 bg-secondary rounded-full overflow-hidden border border-border/20">
                                <div className={`h-full rounded-full ${
                                  so.pct >= 100 ? 'bg-green-500' : so.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`} style={{ width: `${so.pct}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${
                                so.pct >= 100 ? 'text-green-600' : so.pct >= 50 ? 'text-amber-600' : 'text-red-500'
                              }`}>{so.pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center font-medium">{so.orders}</td>
                          <td className="px-4 py-3.5 text-center font-medium text-green-600">{so.completed}</td>
                          <td className="px-4 py-3.5 text-center font-medium">{so.dealers}</td>
                          <td className="px-4 py-3.5 text-center font-medium text-purple-600">{so.visits}</td>
                          <td className="px-4 py-3.5 font-semibold text-amber-600">₹{so.expenses.toLocaleString()}</td>
                        </tr>
                      ))}
                      {soStats.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground font-medium">No sales officers mapped</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Visit Reports Tab ──────────────────────────────── */}
        {activeTab === 'visits' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-card border-border/40 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground">Daily Visit Trend (Last 7 Days)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visitTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="visits" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4, stroke: '#1d4ed8', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} name="Visits" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/40 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground">Visits by SO</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={soStats.filter(s => selectedSo === 'ALL' || s.email === selectedSo)}>
                      <defs>
                        <linearGradient id="colorVisitsSO" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Bar dataKey="visits" fill="url(#colorVisitsSO)" radius={[4, 4, 0, 0]} name="Visits" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 glass-card border-border/40 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">Recent Visits Log</CardTitle>
                <span className="text-xs text-muted-foreground">{filteredVisits.length} logs found</span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {['Log Date', 'Officer Email', 'Dealer Name', 'Visit Remarks & Details', 'Target Follow-up Date', 'HR Status', 'Proof', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3.5 text-muted-foreground font-bold text-xs uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisits.slice().reverse().slice(0, 20).map((v, i) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/15 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{v.date}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-foreground">{v.so_email ?? v.soEmail}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{v.dealer_name ?? v.dealerName}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-sm truncate text-xs" title={v.remarks}>{v.remarks}</td>
                          <td className="px-4 py-3">
                            {v.next_followup ?? v.nextFollowup ? (
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                                {v.next_followup ?? v.nextFollowup}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </td>
                          {/* HR Verification Status Badge */}
                          <td className="px-4 py-3">
                            {(() => {
                              const vs = (v.visitStatus ?? v.visit_status ?? 'PENDING').toUpperCase();
                              if (vs === 'VERIFIED') return (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Verified
                                </span>
                              );
                              if (vs === 'FLAGGED') return (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-600 border border-red-500/20" title={v.hrRemark ?? v.hr_remark ?? ''}>
                                  <AlertTriangle className="w-3 h-3" /> Flagged
                                </span>
                              );
                              return (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 animate-pulse">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              );
                            })()}
                          </td>
                          {/* Photo proof */}
                          <td className="px-4 py-3">
                            {v.photo ? (
                              <button
                                onClick={() => { setSelectedVisit(v); setVisitZoom(1); setVisitRotate(0); }}
                                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                              >
                                <Image className="w-3.5 h-3.5" /> View Photo
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </td>
                          {/* Verify / Flag action buttons */}
                          <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                            {(() => {
                              const vs = (v.visitStatus ?? v.visit_status ?? 'PENDING').toUpperCase();
                              if (vs === 'VERIFIED' || vs === 'FLAGGED') {
                                return (
                                  <button
                                    onClick={async () => { if (v.id) await updateVisitStatus(v.id, 'PENDING'); }}
                                    className="px-2 py-1 rounded bg-secondary text-foreground font-bold text-xs hover:bg-secondary/80 border border-border shadow-sm"
                                    title="Reset to Pending"
                                  >
                                    Reset
                                  </button>
                                );
                              }
                              return (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={async () => { if (v.id) await updateVisitStatus(v.id, 'VERIFIED'); }}
                                    className="px-2 py-1 rounded bg-green-600 text-white font-bold text-xs hover:bg-green-700 shadow-sm hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!v.id) return;
                                      setFlaggingVisit({ id: v.id, soEmail: v.so_email ?? v.soEmail ?? '', dealer: v.dealer_name ?? v.dealerName ?? '' });
                                      setFlagReason('');
                                    }}
                                    className="px-2 py-1 rounded bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-sm hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                  >
                                    Flag
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                      {filteredVisits.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground font-medium">No visit logs matched current filters</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Expense Reports Tab ─────────────────────────────── */}
        {activeTab === 'expenses' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-card border-border/40 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground">Expenses by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50} paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true} fontSize={10} fontWeight={500}>
                        {expenseByCategory.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border/40 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground">Expenses by SO</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseBySO}>
                      <defs>
                        <linearGradient id="colorExpensesSO" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Bar dataKey="expenses" fill="url(#colorExpensesSO)" radius={[4, 4, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 glass-card border-border/40 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">Detailed Expense Claims Log</CardTitle>
                <span className="text-xs text-muted-foreground">{filteredExpenses.length} claims filtered</span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {['Date', 'Sales Officer', 'Category', 'Amount', 'Claim Status', 'Receipt File', 'Remarks & Reasons', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3.5 text-muted-foreground font-bold text-xs uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.slice().reverse().slice(0, 40).map((e, i) => (
                        <tr 
                          key={e.id || i} 
                          className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-all"
                          onClick={() => handleSelectExpense(e)}
                        >
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{e.date}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-foreground">{e.so_email ?? e.soEmail}</td>
                          <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary border border-border">{e.category}</span></td>
                          <td className="px-4 py-3 font-extrabold text-foreground">₹{e.amount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                               e.status === 'APPROVED' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                               e.status === 'REJECTED' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                               "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 animate-pulse"
                             }`}>
                               {e.status || 'PENDING'}
                             </span>
                          </td>
                          <td className="px-4 py-3">
                            {e.photo ? (
                              <button 
                                onClick={(ev) => { ev.stopPropagation(); handleSelectExpense(e); }} 
                                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                              >
                                <FileText className="w-3.5 h-3.5"/> View Receipt
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate" title={e.remarks}>
                             <div>{e.remarks || '—'}</div>
                             {(e.reject_reason ?? e.rejectReason) && <span className="text-[10px] text-red-500 block font-semibold mt-0.5">Rejected: {e.reject_reason ?? e.rejectReason}</span>}
                          </td>
                          <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                             {(!e.status || e.status === 'PENDING') ? (
                               <div className="flex gap-1.5">
                                 <button 
                                   onClick={async () => {
                                      await updateExpenseStatus(e.id!, 'APPROVED');
                                   }} 
                                   className="px-2 py-1 rounded bg-green-600 text-white font-bold text-xs hover:bg-green-700 shadow-sm hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                 >
                                   Approve
                                 </button>
                                 <button 
                                   onClick={() => {
                                     setRejectingExpense({ id: e.id!, currentSo: e.so_email ?? e.soEmail ?? 'Sales Officer', amount: e.amount });
                                     setRejectionReason('');
                                   }} 
                                   className="px-2 py-1 rounded bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-sm hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                 >
                                   Reject
                                 </button>
                               </div>
                             ) : (
                               <span className="text-xs text-muted-foreground/50">—</span>
                             )}
                          </td>
                        </tr>
                      ))}
                      {filteredExpenses.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground font-medium">No expense logs matched current filters</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Target Editor Dialog Modal */}
      <Dialog open={!!editingTargetUser} onOpenChange={(open) => { if (!open) setEditingTargetUser(null); }}>
        <DialogContent className="max-w-md bg-card border-border shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Set Monthly Sales Target</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adjust the sales performance metrics goal for <span className="font-bold text-foreground">{editingTargetUser?.name}</span>. Targets determine achievement percentages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-secondary/50 border border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Current Monthly Target</span>
              <div className="text-xl font-extrabold text-foreground">
                ₹{editingTargetUser?.currentTarget.toLocaleString()}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Target Value (₹)</Label>
              <Input
                type="number"
                placeholder="Enter target amount (e.g. 500000)"
                value={newTargetValue}
                onChange={(e) => setNewTargetValue(e.target.value)}
                className="w-full bg-background/50 h-11"
              />
            </div>

            {/* Quick target presets */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Quick Presets</span>
              <div className="grid grid-cols-4 gap-2">
                {[100000, 250000, 500000, 1000000].map(val => (
                  <Button
                    key={val}
                    type="button"
                    variant="outline"
                    className="text-xs border-border hover:bg-primary/10 hover:text-primary transition-all font-semibold rounded-lg h-9 shadow-xs"
                    onClick={() => setNewTargetValue(val.toString())}
                  >
                    ₹{(val / 100000).toFixed(1)}L
                  </Button>
                ))}
              </div>
            </div>

            {/* Increment/Decrement visual indicators */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 text-xs font-bold h-9 hover:bg-secondary/90 shadow-xs"
                onClick={() => {
                  const val = Number(newTargetValue) || editingTargetUser?.currentTarget || 0;
                  setNewTargetValue(Math.max(0, val - 50000).toString());
                }}
              >
                - ₹50K
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1 text-xs font-bold h-9 hover:bg-secondary/90 shadow-xs"
                onClick={() => {
                  const val = Number(newTargetValue) || editingTargetUser?.currentTarget || 0;
                  setNewTargetValue((val + 50000).toString());
                }}
              >
                + ₹50K
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setEditingTargetUser(null)}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
              disabled={!newTargetValue || isNaN(Number(newTargetValue)) || Number(newTargetValue) < 0}
              onClick={async () => {
                if (editingTargetUser && newTargetValue) {
                  await updateUserTarget(editingTargetUser.id, Number(newTargetValue));
                  setEditingTargetUser(null);
                }
              }}
            >
              Update Target Amount
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Rejection Dialog Modal */}
      <Dialog open={!!rejectingExpense} onOpenChange={(open) => { if (!open) setRejectingExpense(null); }}>
        <DialogContent className="max-w-md bg-card border-border shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive"><Receipt className="w-5 h-5 text-destructive" /> Reject Expense Claim</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide a reason for rejecting the claim of <span className="font-bold text-foreground">₹{rejectingExpense?.amount.toLocaleString()}</span> filed by <span className="font-bold text-foreground">{rejectingExpense?.currentSo}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rejection Reason</Label>
              <Textarea
                placeholder="Details of the rejection reason (minimum 5 characters)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full min-h-[100px] bg-background/50 text-sm p-3 rounded-lg border border-border"
              />
              <span className="text-[10px] text-muted-foreground text-right font-semibold">{rejectionReason.length} characters</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setRejectingExpense(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={rejectionReason.trim().length < 5}
              onClick={async () => {
                if (rejectingExpense && rejectionReason.trim().length >= 5) {
                  await updateExpenseStatus(rejectingExpense.id, 'REJECTED', rejectionReason.trim());
                  setRejectingExpense(null);
                  setRejectionReason('');
                  // If detailed expense dialog is open, update selectedExpense to show rejection detail
                  if (selectedExpense && selectedExpense.id === rejectingExpense.id) {
                     setSelectedExpense(prev => prev ? { ...prev, status: 'REJECTED', reject_reason: rejectionReason.trim() } : null);
                  }
                }
              }}
            >
              Reject Claim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Expense Details Dialog */}
      {selectedExpense && (
        <Dialog open={!!selectedExpense} onOpenChange={(open) => { if (!open) handleSelectExpense(null); }}>
          <DialogContent className="max-w-md bg-card border-border shadow-lg rounded-xl" aria-describedby="expense-details-desc">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Expense Claim Invoice</DialogTitle>
              <DialogDescription id="expense-details-desc" className="text-xs text-muted-foreground">
                Detailed reporting and verification records for specific expense logs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
               <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg bg-secondary/40 border border-border/40">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Officer</span>
                    <p className="font-semibold text-foreground text-xs truncate mt-0.5">{selectedExpense.so_email || selectedExpense.soEmail}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Log Date</span>
                    <p className="font-semibold text-foreground mt-0.5 text-xs">{selectedExpense.date}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Category</span>
                    <p className="font-bold text-foreground text-xs mt-0.5"><span className="px-1.5 py-0.5 rounded bg-secondary border text-[10px]">{selectedExpense.category}</span></p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Amount Claimed</span>
                    <p className="font-extrabold text-primary text-sm mt-0.5">₹{selectedExpense.amount.toLocaleString()}</p>
                  </div>
               </div>
               
               <div className="text-sm flex items-center gap-4">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Claim Status</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border inline-block ${
                      selectedExpense.status === 'APPROVED' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                      selectedExpense.status === 'REJECTED' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                      "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }`}>
                      {selectedExpense.status || 'PENDING'}
                    </span>
                  </div>
               </div>

               {selectedExpense.remarks && (
                 <div className="text-xs p-2.5 rounded-lg border bg-background/50">
                   <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Remarks</span>
                   <p className="text-foreground">{selectedExpense.remarks}</p>
                 </div>
               )}
               
               {selectedExpense.declaration && (
                 <div className="text-xs bg-blue-500/5 p-2.5 rounded-lg border border-blue-500/20">
                   <span className="text-[10px] font-bold text-blue-600 block mb-0.5">Owner Declaration</span>
                   <p className="text-blue-600 font-medium">{selectedExpense.declaration}</p>
                 </div>
               )}
               
               {(selectedExpense.reject_reason ?? selectedExpense.rejectReason) && (
                 <div className="text-xs bg-red-500/5 p-2.5 rounded-lg border border-red-500/20">
                   <span className="text-[10px] font-bold text-red-600 block mb-0.5">Rejection Reason</span>
                   <p className="text-red-600 font-medium">{selectedExpense.reject_reason ?? selectedExpense.rejectReason}</p>
                 </div>
               )}

               {/* Zoomable receipt photo lightbox container */}
               {selectedExpense.photo && (
                 <div className="space-y-1.5">
                   <div className="flex justify-between items-center">
                     <span className="text-[9px] uppercase font-bold text-muted-foreground">Receipt Photo Evidence</span>
                     <div className="flex gap-1.5">
                       <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} title="Zoom Out"><ZoomOut className="w-3 h-3"/></Button>
                       <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-[9px] border-border font-bold" onClick={() => setZoom(1)} title="Reset">1x</Button>
                       <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border" onClick={() => setZoom(z => Math.min(3, z + 0.25))} title="Zoom In"><ZoomIn className="w-3 h-3"/></Button>
                       <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border" onClick={() => setRotate(r => r + 90)} title="Rotate"><RotateCw className="w-3 h-3"/></Button>
                     </div>
                   </div>
                   <div className="border border-border rounded-lg overflow-hidden w-full aspect-video relative bg-black/10 flex items-center justify-center p-1">
                      <img 
                        src={selectedExpense.photo} 
                        alt="Receipt" 
                        className="max-h-full max-w-full object-contain transition-transform duration-200" 
                        style={{ transform: `scale(${zoom}) rotate(${rotate}deg)` }}
                      />
                   </div>
                 </div>
               )}
            </div>

            {(!selectedExpense.status || selectedExpense.status === 'PENDING') && (
              <div className="flex gap-2 border-t border-border pt-4 mt-2">
                 <Button 
                   className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 shadow-sm" 
                   onClick={async () => { 
                     await updateExpenseStatus(selectedExpense.id!, 'APPROVED'); 
                     handleSelectExpense(null); 
                   }}
                 >
                   Approve Claim
                  </Button>
                 <Button 
                   variant="destructive" 
                   className="w-full font-bold h-10 shadow-sm" 
                   onClick={() => {
                     setRejectingExpense({ id: selectedExpense.id!, currentSo: selectedExpense.so_email ?? selectedExpense.soEmail ?? 'Sales Officer', amount: selectedExpense.amount });
                     setRejectionReason('');
                   }}
                 >
                   Reject Claim
                 </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Flag Visit Dialog ───────────────────────────────── */}
      <Dialog open={!!flaggingVisit} onOpenChange={(open) => { if (!open) setFlaggingVisit(null); }}>
        <DialogContent className="max-w-md bg-card border-border shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Flag Visit Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Flag the visit to <span className="font-bold text-foreground">{flaggingVisit?.dealer}</span> by{' '}
              <span className="font-bold text-foreground">{flaggingVisit?.soEmail}</span> as suspicious or unverified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Flag Reason</Label>
              <Textarea
                placeholder="Explain why this visit is being flagged (minimum 5 characters)..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full min-h-[100px] bg-background/50 text-sm p-3 rounded-lg border border-border"
              />
              <span className="text-[10px] text-muted-foreground text-right font-semibold">{flagReason.length} characters</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setFlaggingVisit(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={flagReason.trim().length < 5}
              onClick={async () => {
                if (flaggingVisit && flagReason.trim().length >= 5) {
                  await updateVisitStatus(flaggingVisit.id, 'FLAGGED', flagReason.trim());
                  setFlaggingVisit(null);
                  setFlagReason('');
                }
              }}
            >
              Flag Visit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Visit Photo Lightbox Dialog ─────────────────────── */}
      {selectedVisit && (
        <Dialog open={!!selectedVisit} onOpenChange={(open) => { if (!open) setSelectedVisit(null); }}>
          <DialogContent className="max-w-2xl bg-card border-border shadow-lg rounded-xl" aria-describedby="visit-proof-desc">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Verified Visit Proof
              </DialogTitle>
              <DialogDescription id="visit-proof-desc" className="text-xs text-muted-foreground">
                GPS-sealed visit proof for <span className="font-bold text-foreground">{selectedVisit.dealer_name ?? selectedVisit.dealerName}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg bg-secondary/40 border border-border/40">
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Sales Officer</span>
                  <p className="font-semibold text-foreground text-xs truncate mt-0.5">{selectedVisit.so_email ?? selectedVisit.soEmail}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Visit Date</span>
                  <p className="font-semibold text-foreground mt-0.5 text-xs">{selectedVisit.date}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Dealer / Contact</span>
                  <p className="font-bold text-foreground text-xs mt-0.5">{selectedVisit.dealer_name ?? selectedVisit.dealerName}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">GPS Location</span>
                  <p className="font-semibold text-foreground mt-0.5 text-xs">{(selectedVisit as any).gpsLocation ?? (selectedVisit as any).gpslocation ?? '—'}</p>
                </div>
              </div>

              <div className="text-sm flex items-center gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">HR Verification Status</span>
                  {(() => {
                    const vs = (selectedVisit.visitStatus ?? selectedVisit.visit_status ?? 'PENDING').toUpperCase();
                    if (vs === 'VERIFIED') return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3" /> Verified</span>;
                    if (vs === 'FLAGGED') return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 bg-red-500/10 text-red-600 border-red-500/20"><AlertTriangle className="w-3 h-3" /> Flagged</span>;
                    return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3" /> Pending Verification</span>;
                  })()}
                </div>
              </div>

              {selectedVisit.remarks && (
                <div className="text-xs p-2.5 rounded-lg border bg-background/50">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Visit Notes</span>
                  <p className="text-foreground">{selectedVisit.remarks}</p>
                </div>
              )}

              {(selectedVisit.hrRemark ?? selectedVisit.hr_remark) && (
                <div className="text-xs bg-red-500/5 p-2.5 rounded-lg border border-red-500/20">
                  <span className="text-[10px] font-bold text-red-600 block mb-0.5">HR Flag Reason</span>
                  <p className="text-red-600 font-medium">{selectedVisit.hrRemark ?? selectedVisit.hr_remark}</p>
                </div>
              )}

              {selectedVisit.photo && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">GPS-Sealed Visit Photo</span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border" onClick={() => setVisitZoom(z => Math.max(0.5, z - 0.25))} title="Zoom Out"><ZoomOut className="w-3 h-3"/></Button>
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0 text-[9px] border-border font-bold" onClick={() => setVisitZoom(1)} title="Reset">1x</Button>
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border" onClick={() => setVisitZoom(z => Math.min(3, z + 0.25))} title="Zoom In"><ZoomIn className="w-3 h-3"/></Button>
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border" onClick={() => setVisitRotate(r => r + 90)} title="Rotate"><RotateCw className="w-3 h-3"/></Button>
                    </div>
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden w-full aspect-video relative bg-black/10 flex items-center justify-center p-1">
                    <img
                      src={selectedVisit.photo}
                      alt="Visit Proof"
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                      style={{ transform: `scale(${visitZoom}) rotate(${visitRotate}deg)` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Inline verify/flag from within the lightbox */}
            {(() => {
              const vs = (selectedVisit.visitStatus ?? selectedVisit.visit_status ?? 'PENDING').toUpperCase();
              if (vs !== 'VERIFIED' && vs !== 'FLAGGED') return (
                <div className="flex gap-2 border-t border-border pt-4 mt-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 shadow-sm"
                    onClick={async () => {
                      if (selectedVisit.id) {
                        await updateVisitStatus(selectedVisit.id, 'VERIFIED');
                        setSelectedVisit(prev => prev ? { ...prev, visitStatus: 'VERIFIED', visit_status: 'VERIFIED' } : null);
                      }
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Verify Visit
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full font-bold h-10 shadow-sm"
                    onClick={() => {
                      if (!selectedVisit.id) return;
                      setFlaggingVisit({ id: selectedVisit.id, soEmail: selectedVisit.so_email ?? selectedVisit.soEmail ?? '', dealer: selectedVisit.dealer_name ?? selectedVisit.dealerName ?? '' });
                      setFlagReason('');
                      setSelectedVisit(null);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Flag Visit
                  </Button>
                </div>
              );
              return null;
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default HRDashboard;
