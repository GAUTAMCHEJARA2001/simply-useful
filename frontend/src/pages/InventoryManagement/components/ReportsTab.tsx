import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/DataTable';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { SafeDataView } from '@/components/SafeDataView';
import { useAuth } from '@/contexts/AuthContext';
import { DecisionIntelligenceTab } from './DecisionIntelligenceTab';
import { ExceptionAlertsTab } from './ExceptionAlertsTab';
import { PredictiveForecastingTab } from './PredictiveForecastingTab';
import { CfoLiquidityTab } from './CfoLiquidityTab';
import { ProcessBottlenecksTab } from './ProcessBottlenecksTab';
import { DataQualityTab } from './DataQualityTab';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const ReportsTab: React.FC = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'operational' | 'analytics'>('operational');
  const [analyticsView, setAnalyticsView] = useState<'kpi' | 'alerts' | 'forecast' | 'liquidity' | 'bottlenecks' | 'quality'>('kpi');

  const { data: stock = [], isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['reports', 'stock'],
    queryFn: async () => {
      const res = await api.get('/reports/current-stock');
      return (res.data?.data || res.data || []) as any[];
    }
  });

  const { data: salesSummary = [], isLoading: salesLoading, error: salesError } = useQuery({
    queryKey: ['reports', 'sales-summary'],
    queryFn: async () => {
      const res = await api.get('/reports/sales-summary');
      return (res.data?.data || res.data || []) as any[];
    }
  });

  const showAnalytics = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Premium Tab Selector for Admins */}
      {showAnalytics && (
        <div className="flex border-b border-border/80 mb-6 bg-card/40 backdrop-blur-md p-1 rounded-2xl gap-1 ring-1 ring-border/50 max-w-md">
          <button
            onClick={() => setActiveSubTab('operational')}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'operational'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            Operational Reports
          </button>
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'analytics'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            Decision Intelligence
          </button>
        </div>
      )}

      {activeSubTab === 'operational' ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold">Operational Reports</h1>
            <p className="text-xs text-muted-foreground">Standard stock and 30-day sales statistics</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-primary/80">Current Stock Levels</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                <SafeDataView data={stock} isLoading={stockLoading} error={stockError}>
                  <DataTable 
                    columns={['Product', 'Warehouse', 'Stock', 'Unit', 'Min']}
                    rows={stock.map((s: any) => [
                      s.product_name || s.product?.name || '—', 
                      s.warehouse_name || 'Any', 
                      Math.round(parseFloat(s.current_stock as any || 0)), 
                      s.unit?.name || (typeof s.unit === 'string' ? s.unit : '') || '—', 
                      s.minimum_stock
                    ])} 
                  />
                </SafeDataView>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-primary/80">Sales Summary (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SafeDataView data={salesSummary} isLoading={salesLoading} error={salesError}>
                  <DataTable 
                    columns={['Date', '# Sales', 'Revenue', 'Profit']}
                    rows={salesSummary.map((r: any) => [
                      r.day || r.date || '—', 
                      r.total_sales || 0, 
                      Currency(r.total_revenue || 0), 
                      Currency(r.total_profit || 0)
                    ])} 
                  />
                </SafeDataView>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Secondary Sub-tab Navigation Bar */}
          <div className="flex gap-2 border-b border-border/60 pb-3 mb-6 overflow-x-auto scrollbar-none whitespace-nowrap">
            {[
              { id: 'kpi', label: 'KPI Dashboard' },
              { id: 'alerts', label: 'Exception Alerts' },
              { id: 'forecast', label: 'Predictive Projections' },
              { id: 'liquidity', label: 'CFO Liquidity' },
              { id: 'bottlenecks', label: 'Process Bottlenecks' },
              { id: 'quality', label: 'Data Quality' }
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setAnalyticsView(view.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  analyticsView === view.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {analyticsView === 'kpi' && <DecisionIntelligenceTab />}
          {analyticsView === 'alerts' && <ExceptionAlertsTab />}
          {analyticsView === 'forecast' && <PredictiveForecastingTab />}
          {analyticsView === 'liquidity' ? <CfoLiquidityTab /> : null}
          {analyticsView === 'bottlenecks' && <ProcessBottlenecksTab />}
          {analyticsView === 'quality' && <DataQualityTab />}
        </div>
      )}
    </div>
  );
};
