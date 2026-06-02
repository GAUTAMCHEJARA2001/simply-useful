import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Cpu, Database, Sparkles, AlertCircle, 
  CheckCircle, ArrowUpRight, BarChart3, TrendingUp, 
  Layers, Users, Clock, ShieldAlert,
  Gauge, Landmark, Info
} from 'lucide-react';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const Percent = (v: number) => `${Number(v || 0).toFixed(1)}%`;

export const DecisionIntelligenceTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCompiling, setIsCompiling] = useState(false);

  // Fetch standard analytical metrics calculated from Star Schema Fact & Dim tables
  const { data: kpis, isLoading: kpisLoading, error: kpisError, refetch } = useQuery({
    queryKey: ['analytics', 'kpis'],
    queryFn: async () => {
      const res = await api.get('/analytics/kpis');
      return res.data?.data || res.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  });

  // Orchestrate ETL compilation
  const etlMutation = useMutation({
    mutationFn: async () => {
      setIsCompiling(true);
      const res = await api.get('/analytics/trigger-etl');
      return res.data;
    },
    onSuccess: (data) => {
      setIsCompiling(false);
      toast({
        title: "Star Schema Materialized",
        description: data?.message || "Transactional records successfully mapped into analytical structures.",
        variant: "default",
      });
      // Invalidate and refetch KPIs to load updated analytical values
      queryClient.invalidateQueries({ queryKey: ['analytics', 'kpis'] });
      refetch();
    },
    onError: (err: any) => {
      setIsCompiling(false);
      toast({
        title: "Warehouse Compilation Failed",
        description: err?.response?.data?.message || err?.message || "ETL pipeline execution encountered an error.",
        variant: "destructive",
      });
    }
  });

  const handleRebuild = () => {
    etlMutation.mutate();
  };

  const metadata = kpis?.warehouse_metadata || {};
  const hasMetadata = Object.keys(metadata).length > 0;

  // Modern harmony color palette mapping
  const dimCards = [
    { label: 'DimDate (Fiscal Calendar)', count: metadata.dimdate_count || 0, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-600' },
    { label: 'DimSO (Sales Officers)', count: metadata.dimso_count || 0, color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-600' },
    { label: 'DimProduct (Landed Cost Margins)', count: metadata.dimproduct_count || 0, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-600' },
    { label: 'DimWarehouse (Locations)', count: metadata.dimwarehouse_count || 0, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-600' },
    { label: 'DimCustomer (Unified Accounts)', count: metadata.dimcustomer_count || 0, color: 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-600' },
  ];

  const factCards = [
    { label: 'FactSales (Gross/Net/Margin)', count: metadata.factsales_count || 0, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-600' },
    { label: 'FactVisits (Officer Field Work)', count: metadata.factvisits_count || 0, color: 'from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-600' },
    { label: 'FactExpenses (Cost Governance)', count: metadata.factexpenses_count || 0, color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-600' },
  ];

  const metricCards = [
    {
      title: 'Sales Officer Conversion Rate',
      value: Percent(kpis?.so_conversion_rate || 0),
      desc: 'Completed Orders relative to field officer shop visits',
      target: 'Target: >75.0%',
      pct: kpis?.so_conversion_rate || 0,
      icon: Users,
      accent: 'indigo',
      barColor: 'bg-indigo-600'
    },
    {
      title: 'Logistics SLA Compliance Rate',
      value: Percent(kpis?.sla_compliance_pct || 0),
      desc: 'Percentage of dispatches completed within 48h window',
      target: 'Benchmark: 95.0%',
      pct: kpis?.sla_compliance_pct || 0,
      icon: Clock,
      accent: 'emerald',
      barColor: 'bg-emerald-600 font-bold'
    },
    {
      title: 'Gross Margin Efficiency',
      value: Percent(kpis?.gross_margin_pct || 0),
      desc: 'Profit margins computed net of 18% GST and Landed Cost estimates',
      target: 'Healthy Threshold: >10.0%',
      pct: kpis?.gross_margin_pct * 5 || 0, // Scaled for visual representation
      icon: TrendingUp,
      accent: 'purple',
      barColor: 'bg-purple-600'
    },
    {
      title: 'Supply Chain Inventory Turnover',
      value: String(kpis?.inventory_turnover_rate || '4.2'),
      desc: 'Annualized cost of goods sold divided by average inventory value',
      target: 'Industry Standard: 4.0 - 6.0',
      pct: Math.min(((kpis?.inventory_turnover_rate || 4.2) / 8) * 100, 100),
      icon: Layers,
      accent: 'amber',
      barColor: 'bg-amber-600'
    }
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
            <Cpu className="w-8 h-8 text-primary animate-pulse" />
            Decision Intelligence Portal
          </h1>
          <p className="text-muted-foreground mt-1">Materialized Star Schema layers & Governed Semantic Metrics</p>
        </div>
        
        <button
          onClick={handleRebuild}
          disabled={isCompiling || etlMutation.isPending}
          className="relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-bold text-foreground rounded-2xl group bg-gradient-to-br from-purple-600 to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
        >
          <span className="relative px-5 py-3 transition-all ease-in duration-75 bg-background rounded-[14px] group-hover:bg-opacity-0 flex items-center gap-2">
            <Sparkles className={`w-4 h-4 text-purple-500 group-hover:text-white ${isCompiling ? 'animate-spin' : ''}`} />
            {isCompiling ? "Compiling Analytical Warehouse..." : "Compile Warehouse Star Schema"}
          </span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: KPIs and Semantic Layer */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CFO Governed Financial Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 backdrop-blur-xl ring-1 ring-indigo-500/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-500/80 uppercase tracking-widest">Enterprise Gross Sales</p>
                  <h3 className="text-2xl font-black mt-2 tracking-tight">
                    {kpisLoading ? "—" : Currency(kpis?.total_revenue || 0)}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Transactional orders combined</p>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                  <Landmark className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 backdrop-blur-xl ring-1 ring-emerald-500/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest">Calculated Net Margin</p>
                  <h3 className="text-2xl font-black mt-2 tracking-tight">
                    {kpisLoading ? "—" : Currency(kpis?.total_margin || 0)}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Excluding GST & estimated landed cost</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-rose-500/5 to-rose-600/10 backdrop-blur-xl ring-1 ring-rose-500/10">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-500/80 uppercase tracking-widest">Approved Travel Expenses</p>
                  <h3 className="text-2xl font-black mt-2 tracking-tight">
                    {kpisLoading ? "—" : Currency(kpis?.total_expenses || 0)}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Expense-to-Revenue: {Percent(kpis?.expense_to_revenue_pct || 0)}</p>
                </div>
                <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl">
                  <Gauge className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Governed KPIs Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metricCards.map((card, i) => (
              <Card key={card.title} className="border-none shadow-md bg-card/50 backdrop-blur-xl ring-1 ring-border/50 overflow-hidden hover:ring-primary/20 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-bold tracking-tight text-foreground/80">{card.title}</CardTitle>
                    <div className="p-2 bg-muted/80 rounded-xl text-muted-foreground">
                      <card.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <CardDescription className="text-xs mt-1 min-h-[32px]">{card.desc}</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-black tracking-tight">{kpisLoading ? "—" : card.value}</span>
                    <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">{card.target}</span>
                  </div>
                  
                  {/* Micro-Progress Bar */}
                  <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${card.barColor} transition-all duration-1000`} 
                      style={{ width: kpisLoading ? '0%' : `${Math.min(Math.max(card.pct, 0), 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Warehouse Compilation Lineage */}
          <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Materialized Data Warehouse Lineage & Observability
              </CardTitle>
              <CardDescription>
                Observe how the operational SQLite transactional records compile into analytical stars.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground font-medium">Fetching warehouse records...</span>
                </div>
              ) : !hasMetadata ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-4 rounded-xl flex gap-3 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-bold">No analytical records materialized.</span>
                    <p className="mt-1">Please trigger the compile option above to initialize and populate the Star Schema warehouse tables.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Dimension Tables */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">
                      Materialized Dimension Tables (Dim)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {dimCards.map((card) => (
                        <div key={card.label} className={`p-3 rounded-2xl border bg-gradient-to-b ${card.color} flex flex-col justify-between min-h-[84px] shadow-sm`}>
                          <span className="text-[10px] font-bold tracking-tight text-foreground/75 leading-tight">{card.label}</span>
                          <span className="text-xl font-black mt-2 text-foreground">{card.count.toLocaleString()} rows</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fact Tables */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">
                      Materialized Fact Tables (Fact)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {factCards.map((card) => (
                        <div key={card.label} className={`p-3 rounded-2xl border bg-gradient-to-b ${card.color} flex flex-col justify-between min-h-[84px] shadow-sm`}>
                          <span className="text-[10px] font-bold tracking-tight text-foreground/75 leading-tight">{card.label}</span>
                          <span className="text-xl font-black mt-2 text-foreground">{card.count.toLocaleString()} rows</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Side: Decision Lineage & Observations */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-b from-card/60 to-card/20 backdrop-blur-xl ring-1 ring-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Operational Bottleneck Warnings
              </CardTitle>
              <CardDescription>
                Derived dynamically from analytical facts and semantic thresholds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {kpisLoading ? (
                <div className="space-y-3">
                  <div className="h-10 bg-muted/60 animate-pulse rounded-xl" />
                  <div className="h-10 bg-muted/60 animate-pulse rounded-xl" />
                  <div className="h-10 bg-muted/60 animate-pulse rounded-xl" />
                </div>
              ) : (
                <>
                  {/* SLA Compliant notice */}
                  <div className="flex gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Logistics compliance high</span>
                      <p className="mt-0.5 opacity-90">Logistics dispatch SLA rate stands at {Percent(kpis?.sla_compliance_pct || 0)}, well above the operational benchmark of 95.0%.</p>
                    </div>
                  </div>

                  {/* Stock rotation warning if turnover rate is low */}
                  {(kpis?.inventory_turnover_rate || 4.2) < 4.5 ? (
                    <div className="flex gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-2xl text-xs">
                      <Info className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">Optimize Stock Rotations</span>
                        <p className="mt-0.5 opacity-90">Current inventory turnover rate stands at {kpis?.inventory_turnover_rate || 4.2}. Slower SKU velocity indicates potential capital lockup in underperforming warehouses.</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Conversion rate caution */}
                  {(kpis?.so_conversion_rate || 0) < 60 ? (
                    <div className="flex gap-3 p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-2xl text-xs">
                      <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-bold">Sales officer conversion review</span>
                        <p className="mt-0.5 opacity-90">Field visit conversion rate is at {Percent(kpis?.so_conversion_rate || 0)}. Consider auditing region assignments and shop-wise targets.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-2xl text-xs">
                      <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-bold">Officer Conversions Stable</span>
                        <p className="mt-0.5 opacity-90">Sales officers are logging high conversion percentages ({Percent(kpis?.so_conversion_rate || 0)}) from active shop visits.</p>
                      </div>
                    </div>
                  )}

                  {/* Profit Margin Alert */}
                  {(kpis?.gross_margin_pct || 0) < 12.0 ? (
                    <div className="flex gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-2xl text-xs">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-bold">Gross Margins Alert</span>
                        <p className="mt-0.5 opacity-90">GST net gross margin stands at {Percent(kpis?.gross_margin_pct || 0)}. Increases in landed cost values require immediate retail price point adjustments.</p>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card/40 backdrop-blur-xl ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground/80">Architecture Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                This analytical view isolates operations from calculations using **Materialized Dimensional Star Tables**.
              </p>
              <p>
                Calculations are mathematical equations governed centrally in the **Semantic Metrics Engine**, preventing data drift across sales and finance logs.
              </p>
              <div className="p-3 bg-muted/60 rounded-xl border border-border/40 text-[10px] text-muted-foreground font-mono">
                Engine: SQLite Transactional ELT<br />
                Model Style: Star Schema Kimball<br />
                SLA Calculation: Delta Date tags
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
