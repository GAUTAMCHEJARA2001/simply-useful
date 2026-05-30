import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, TrendingUp, RefreshCw, Layers, 
  ArrowUpRight, ArrowDownRight, Activity, Zap
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import apiClient from '@/api/client';
import { SafeDataView } from '@/components/SafeDataView';
import { KPIs, StockItem } from '@/types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const Num = (v: number | string) => Number(v || 0).toLocaleString('en-IN');

import { 
  useDashboardKPIs, 
  useSalesSummary, 
  useLowStock, 
  useDailyReport 
} from '@/hooks/inventory/useDashboard';

export const DashboardTab: React.FC = () => {
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useDashboardKPIs();
  const { data: salesSummary = [], isLoading: salesLoading } = useSalesSummary();
  const { data: lowStock = [], isLoading: lowLoading } = useLowStock();
  const { data: daily, isLoading: dailyLoading } = useDailyReport();

  const loading = kpisLoading || salesLoading || lowLoading || dailyLoading;
  const error = kpisError ? (kpisError as any).message : null;

  // Mock data for Category Distribution (Pie Chart) if kpis doesn't have it yet
  const categoryData = [
    { name: 'Standard', value: 400, color: '#3b82f6' },
    { name: 'Premium', value: 300, color: '#10b981' },
    { name: 'Raw', value: 300, color: '#6366f1' },
    { name: 'Grout', value: 200, color: '#f59e0b' },
  ];

  return (
    <SafeDataView data={kpis ? [kpis] : []} isLoading={loading} error={error}>
      <div className="space-y-8 pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Inventory Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">Real-time oversight and predictive insights</p>
          </div>
          <div className="flex items-center gap-2 bg-card/50 border border-border/50 px-4 py-2 rounded-2xl backdrop-blur-md shadow-sm">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {daily?.date ? new Date(daily.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Syncing...'}
            </span>
          </div>
        </div>

        {/* Global Performance KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Asset Valuation', value: Currency(kpis?.revenue || 0), sub: '+12.5% from last month', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10', trend: 'up' },
            { label: 'Active SKUs', value: Num(kpis?.products || 0), sub: 'Across 4 categories', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 'neutral' },
            { label: 'Order Velocity', value: Num(kpis?.orders || 0), sub: 'Today (Completed)', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 'up' },
            { label: 'Approval Queue', value: Num(daily?.pendingCount || 0), sub: 'Waiting for action', icon: RefreshCw, color: 'text-indigo-500', bg: 'bg-indigo-500/10', trend: 'down' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
              className="kpi-card group hover:ring-2 hover:ring-primary/20 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.label === 'Approval Queue' && (daily?.pendingCount || 0) > 0 ? 'animate-spin-slow' : ''}`} />
                </div>
                {kpi.trend !== 'neutral' && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.trend === 'up' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpi.trend === 'up' ? 'High' : 'Low'}
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-black tracking-tight">{kpi.value}</h3>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-2">{kpi.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Dynamic Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trends (Main Chart) */}
          <Card className="lg:col-span-2 border-none shadow-xl bg-card/40 backdrop-blur-xl overflow-hidden ring-1 ring-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold">Revenue Performance</CardTitle>
                <p className="text-xs text-muted-foreground">Daily transactional analysis</p>
              </div>
              <div className="flex gap-2">
                 <div className="h-6 w-16 bg-primary/10 rounded-md border border-primary/20" />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesSummary.length > 0 ? salesSummary : [{name: 'Empty', total: 0}]}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Overlay */}
          <div className="space-y-4">
            <Card className="border-none shadow-lg bg-emerald-500/5 ring-1 ring-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Top Movers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(kpis?.topProducts || []).slice(0, 3).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <p className="text-xs font-semibold group-hover:text-primary transition-colors">{p.name}</p>
                    </div>
                    <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">{Num(p.qty)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-orange-500/5 ring-1 ring-orange-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-orange-600 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Low Stock Warning
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[140px] overflow-auto px-4 space-y-3 pb-4">
                  {lowStock.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <p className="text-xs truncate max-w-[140px]">{s.productName}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-orange-200/30 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${(s.currentStock / s.minimumStock) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-orange-600">{s.currentStock}</span>
                      </div>
                    </div>
                  ))}
                  {lowStock.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center italic">All inventory levels optimized</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Operational Transactions Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-none shadow-lg glass-card h-fit">
            <CardHeader className="pb-0 pt-6">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                 <Layers className="w-4 h-4 text-primary" /> Stock Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] mt-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Total Assets</span>
                  <span className="text-xl font-black">1.2K</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryData.map(c => (
                  <div key={c.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 text-[11px] font-medium">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="ml-auto font-bold">{Math.round((c.value/1200)*100)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-lg glass-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/5 pb-4 border-b border-border/50">
              <CardTitle className="text-base font-bold">Activity Pulse (Today)</CardTitle>
              <button className="text-[10px] uppercase font-black text-primary hover:underline tracking-widest">View All Insights</button>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-border/30">
                  {daily?.sales?.list.length > 0 ? daily.sales.list.slice(0, 5).map((s: any, idx: number) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-all cursor-default">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <ArrowUpRight className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-xs font-bold text-foreground/90 uppercase tracking-tight">{s.challanNumber || `SAL-${s.id}`}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">{s.customerName || 'Direct Sale'}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-black text-emerald-600">{Currency(s.netAmount)}</p>
                         <p className="text-[10px] text-muted-foreground font-medium">{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="p-12 text-center">
                       <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                       <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Awaiting Transactions</p>
                    </div>
                  )}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SafeDataView>
  );
};
