import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { 
  TrendingUp, Calendar, Zap, AlertCircle, 
  HelpCircle, Loader2, ArrowUpRight, BarChart3, 
  Sparkles, Layers, Sliders, PlayCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const Num = (v: number | string) => Number(v || 0).toLocaleString('en-IN');
const Percent = (v: number) => `${Number(v || 0).toFixed(1)}%`;

export const PredictiveForecastingTab: React.FC = () => {
  // Fetch forecasts, stockout countdowns, and CRM weighted values
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'predictions'],
    queryFn: async () => {
      const res = await api.get('/analytics/predictions');
      return res.data?.data || res.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 45000,
  });

  const forecasts = (data as any)?.demand_forecasts || [];
  const stockoutRisks = (data as any)?.stockout_risks || [];
  const crmPipeline = (data as any)?.crm_weighted_pipeline || { total_raw_value: 0, total_weighted_value: 0, stages: [] };

  // Group forecasts by SKU to build nice sequential Recharts trend lines
  const skuGroups: Record<string, { date: string, quantity: number }[]> = {};
  forecasts.forEach((f: any) => {
    if (!skuGroups[f.sku]) skuGroups[f.sku] = [];
    // Convert forecast_date to nice month day label
    const dateLabel = new Date(f.forecast_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    skuGroups[f.sku].push({
      date: dateLabel,
      quantity: f.predicted_quantity
    });
  });

  // Re-adjust Recharts structure for a multi-SKU chart
  const dates: any[] = [...new Set(forecasts.map((f: any) => f.forecast_date))].sort();
  const trendData = dates.map((d: any) => {
    const label = new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const row: any = { date: label };
    forecasts.filter((f: any) => f.forecast_date === d).forEach((f: any) => {
      row[f.sku] = f.predicted_quantity;
    });
    return row;
  });

  const skus: any[] = [...new Set(forecasts.map((f: any) => f.sku))];
  const chartColors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-10">
      {/* Tab Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Predictive Intelligence Portal
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          90-Day rolling demand forecasts, stockout velocity metrics, and weighted CRM pipelines.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Running rolling demand & safety stock projections...</span>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl flex gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Projections Unavailable</span>
            <p className="mt-1">Forecast sweeps encountered an error. Recompile the database analytical tables above to restore parameters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Center Grid: Demand Forecasting & CRM pipeline */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* SKU-wise demand projection chart */}
            <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold">Rolling SKU Demand Forecast (Next 90 Days)</CardTitle>
                  <CardDescription>Precomputed rolling 90-day moving averages projected by SKU.</CardDescription>
                </div>
                <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1 rounded-xl text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border/20">
                  <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                  Model: MA_90
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {trendData.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-10">No demand projections compiled yet.</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          {skus.map((sku, i) => (
                            <linearGradient key={sku} id={`color_${sku}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit=" bag" />
                        <Tooltip formatter={(v: any) => [`${v} bags`, 'Quantity']} />
                        {skus.slice(0, 4).map((sku, i) => (
                          <Area 
                            key={sku}
                            type="monotone" 
                            dataKey={sku} 
                            name={`SKU ${sku}`}
                            stroke={chartColors[i % chartColors.length]} 
                            fillOpacity={1} 
                            fill={`url(#color_${sku})`} 
                            strokeWidth={2}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CRM Funnel weighted projection */}
            <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
              <CardHeader className="pb-2">
                <div>
                  <CardTitle className="text-base font-bold">Probability-Weighted CRM Pipeline Funnel</CardTitle>
                  <CardDescription>Converts prospect volume into probability-weighted financial forecasts.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                
                {/* Total Stats Block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/40 rounded-2xl border flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unweighted Raw Pipeline</span>
                      <h4 className="text-xl font-black mt-1">{Currency(crmPipeline.total_raw_value)}</h4>
                    </div>
                    <div className="p-2.5 bg-muted/65 text-muted-foreground rounded-xl">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 rounded-2xl border border-indigo-500/20 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600/80 dark:text-indigo-400/80 uppercase tracking-widest">Probability Weighted Revenue</span>
                      <h4 className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-1">{Currency(crmPipeline.total_weighted_value)}</h4>
                    </div>
                    <div className="p-2.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Stage Bars */}
                <div className="space-y-4">
                  {crmPipeline.stages.filter((s: any) => s.raw_value > 0).map((stage: any, i: number) => {
                    const pctOfRaw = crmPipeline.total_raw_value > 0 ? (stage.raw_value / crmPipeline.total_raw_value) * 100 : 0;
                    
                    return (
                      <div key={stage.stage} className="space-y-1 text-xs">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                            {stage.display_name} <span className="text-[10px] font-normal text-muted-foreground">({stage.lead_count} leads)</span>
                          </span>
                          <span className="font-bold text-foreground/80">
                            {Currency(stage.raw_value)}
                            <span className="text-[10px] font-bold text-muted-foreground ml-2">
                              Weighted: {Currency(stage.weighted_value)} ({Percent(stage.probability * 100)})
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-3.5 bg-muted/60 rounded-full overflow-hidden flex shadow-inner">
                          {/* Probability weighted portion */}
                          <div 
                            className="bg-indigo-600/90 h-full transition-all duration-1000"
                            style={{ width: `${pctOfRaw * stage.probability}%` }}
                          />
                          {/* Remainder raw portion */}
                          <div 
                            className="bg-muted-foreground/10 h-full transition-all duration-1000"
                            style={{ width: `${pctOfRaw * (1 - stage.probability)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Stockout risks & velocity countdowns */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl ring-1 ring-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500 animate-bounce" />
                  Stockout Velocity Countdowns
                </CardTitle>
                <CardDescription>Proactively calculated days remaining before total depletion.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {stockoutRisks.map((item: any) => {
                  const riskColor = 
                    item.status === 'CRITICAL' 
                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                      : item.status === 'WARNING' 
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';

                  const textRiskColor = 
                    item.status === 'CRITICAL' 
                      ? 'text-rose-600' 
                      : item.status === 'WARNING' 
                        ? 'text-amber-600' 
                        : 'text-emerald-600';

                  const riskDaysLabel = item.risk_days > 365 ? '365+ Days' : `${item.risk_days} Days`;
                  
                  return (
                    <div key={item.sku} className="p-3.5 rounded-2xl bg-card border border-border/30 hover:border-primary/20 hover:shadow transition-all duration-200 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group">
                      
                      {/* Metric & Label Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SKU: {item.sku}</span>
                          <h4 className="text-xs font-black text-foreground mt-0.5 truncate max-w-[140px]" title={item.name}>{item.name}</h4>
                        </div>
                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${riskColor} shrink-0`}>
                          {item.status}
                        </div>
                      </div>

                      {/* Velocity and Stock stats */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground mt-1">
                        <div>
                          <span className="block font-bold">Current Stock:</span>
                          <span className="text-xs font-black text-foreground">{Num(item.current_stock)} bags</span>
                        </div>
                        <div>
                          <span className="block font-bold">Daily Velocity:</span>
                          <span className="text-xs font-black text-foreground">{item.daily_velocity} bags/day</span>
                        </div>
                      </div>

                      {/* Micro slider progress / Countdown bar */}
                      <div className="space-y-1.5 mt-2">
                        <div className="flex justify-between items-baseline text-[10px] font-bold">
                          <span className="text-muted-foreground">Depletion Forecast:</span>
                          <span className={`text-xs font-black ${textRiskColor}`}>{riskDaysLabel}</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full ${item.status === 'CRITICAL' ? 'bg-rose-500' : item.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'} transition-all duration-1000`}
                            style={{ width: `${Math.min((item.current_stock / item.safety_stock_threshold) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Models Details */}
            <Card className="border-none shadow-md bg-card/40 backdrop-blur-xl ring-1 ring-border/50">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-foreground/80 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-muted-foreground" />
                  Forecasting SLA Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                <p>
                  Our 90-day demand averages are compiled daily via the transactional analytical warehouse compile loop, ensuring high speed.
                </p>
                <p>
                  Weighted pipelines apply strict probability metrics to active leads inside the SQLite ledger, projecting accurate collections cash flow.
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
};
