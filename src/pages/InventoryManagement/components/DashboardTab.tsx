import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Package, TrendingUp, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { apiClient } from '@/api/client';

const Currency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const Num = (v: number) => Number(v || 0).toLocaleString('en-IN');

interface KPIs {
  total_stock_value: number;
  month_revenue: number;
  month_profit: number;
  month_sales_count: number;
  low_stock_count: number;
  top_products: { name: string; qty: number }[];
}

export const DashboardTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [salesSummary, setSalesSummary] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  const [daily, setDaily] = useState<any | null>(null);

  const loadKpis = useCallback(async () => {
    setLoading(true);
    try {
      const [k, s, ls, d] = await Promise.all([
        apiClient<KPIs>('/inv/reports/dashboard-kpis').catch(() => null),
        apiClient<any[]>('/inv/reports/sales-summary').catch(() => []),
        apiClient<any[]>('/inv/reports/low-stock').catch(() => []),
        apiClient<any>('/inv/reports/daily').catch(() => null)
      ]);
      setKpis(k);
      setSalesSummary(s || []);
      setLowStock(ls || []);
      setDaily(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  if (loading && !kpis) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading Dashboard…
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory Dashboard</h1>
        <div className="text-sm font-medium text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border">
          {daily?.date ? new Date(daily.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Loading...'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Stock Value', value: Currency(kpis?.total_stock_value || 0), icon: Package, color: 'bg-blue-500/10 text-blue-600' },
          { label: "Today's Sales", value: `${Num(daily?.sales?.count || 0)} Entries`, icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-600' },
          { label: "Today's Purchases", value: `${Num(daily?.purchases?.count || 0)} Entries`, icon: Package, color: 'bg-indigo-500/10 text-indigo-600' },
          { label: "Pending Approvals", value: `${Num(daily?.pendingCount || 0)} Waiting`, icon: RefreshCw, color: 'bg-orange-500/10 text-orange-600' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-5 h-5 ${kpi.label === 'Pending Approvals' && daily?.pendingCount > 0 ? 'animate-spin-slow' : ''}`} />
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-emerald-600">Today's Sales</CardTitle>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
              {daily?.sales?.count || 0}
            </span>
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-auto">
            <DataTable columns={['Challan', 'Customer', 'Amount', 'Time']}
              rows={(daily?.sales?.list || []).map((s: any) => [
                s.challan_number || '—',
                s.customer || '—',
                Currency(s.net_amount),
                new Date(s.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              ])} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-indigo-600">Today's Purchases</CardTitle>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">
              {daily?.purchases?.count || 0}
            </span>
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-auto">
            <DataTable columns={['Challan', 'Supplier', 'Amount', 'Time']}
              rows={(daily?.purchases?.list || []).map((p: any) => [
                p.challan_number || '—',
                p.supplier || '—',
                Currency(p.net_amount),
                new Date(p.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              ])} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-purple-600">Today's Returns</CardTitle>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600">
              {daily?.returns?.count || 0}
            </span>
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-auto">
            <DataTable columns={['Challan', 'Party', 'Type', 'Amount']}
              rows={(daily?.returns?.list || []).map((r: any) => [
                r.challan_number || '—',
                r.party || '—',
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.type === 'SALE' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{r.type}</span>,
                Currency(r.net_amount)
              ])} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Low Stock Alert</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable columns={['Product', 'SKU', 'Current', 'Min', 'Unit']}
              rows={lowStock.map(s => [s.product_name, s.sku, s.current_stock, s.minimum_stock, s.unit])} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Products (by sales qty)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable columns={['Product', 'Qty Sold']}
              rows={(kpis?.top_products || []).map(p => [p.name, Num(p.qty)])} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
