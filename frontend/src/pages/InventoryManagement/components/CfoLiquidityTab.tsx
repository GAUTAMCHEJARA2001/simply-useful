import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { 
  DollarSign, Landmark, ArrowUpRight, ArrowDownRight, 
  HelpCircle, Loader2, BarChart3, Star, Layers,
  Activity, Landmark as TreasuryIcon, Award, TrendingUp
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const Num = (v: number | string) => Number(v || 0).toLocaleString('en-IN');
const Percent = (v: number) => `${Number(v || 0).toFixed(1)}%`;

export const CfoLiquidityTab: React.FC = () => {
  const { data: liquidity, isLoading, error } = useQuery({
    queryKey: ['analytics', 'cfo-liquidity'],
    queryFn: async () => {
      const res = await api.get('/analytics/cfo-liquidity');
      return res.data?.data || res.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 45000,
  });

  const matrix = liquidity?.so_profitability_matrix || [];

  return (
    <div className="space-y-8 pb-10">
      {/* Tab Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <TreasuryIcon className="w-5 h-5 text-primary" />
          Treasury & Liquidity Cockpit
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Days Outstanding metrics, Cash Conversion Cycle tracking, and Sales Officer net profitability margins.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Computing working capital & sales officer contributions...</span>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl flex gap-3 text-xs">
          <DollarSign className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Liquidity KPIs Unavailable</span>
            <p className="mt-1">Financial calculations failed. Re-run Star Schema ETL above to compile latest ledger balances.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Cash Conversion Cycle and Outstanding Days */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Days Outstanding Gauges Card */}
            <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
              <CardHeader>
                <CardTitle className="text-base font-bold">CFO Cash Conversion Cycle (CCC)</CardTitle>
                <CardDescription>Tracks cash rotation speed: CCC = DIO (Stock) + DSO (Sales) - DPO (Suppliers)</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                
                {/* Unified Cycle Indicator */}
                <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-3xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600/80 dark:text-indigo-400/80 uppercase tracking-widest block mb-1">
                      Cash Conversion Cycle (CCC)
                    </span>
                    <h3 className="text-3xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">
                      {liquidity?.ccc} Days
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Capital takes approximately {Math.abs(Math.round(liquidity?.ccc))} days to rotate back into cash.
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Activity className="w-8 h-8" />
                  </div>
                </div>

                {/* CCC Decomposition */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* DSO */}
                  <div className="p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:border-primary/20 transition-all">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Days Sales Outstanding (DSO)</span>
                      <h4 className="text-2xl font-black mt-2 text-foreground">{liquidity?.dso} Days</h4>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Collection lag from accounts receivable</p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-t border-border/10 pt-2 text-muted-foreground/80 mt-1">
                      <span>Receivables:</span>
                      <span className="font-bold text-foreground">{Currency(liquidity?.total_receivables)}</span>
                    </div>
                  </div>

                  {/* DIO */}
                  <div className="p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:border-primary/20 transition-all">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Days Inventory Outstanding (DIO)</span>
                      <h4 className="text-2xl font-black mt-2 text-foreground">{liquidity?.dio} Days</h4>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Capital lockup duration inside warehouses</p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-t border-border/10 pt-2 text-muted-foreground/80 mt-1">
                      <span>Inventory Value:</span>
                      <span className="font-bold text-foreground">{Currency(liquidity?.total_inventory_val)}</span>
                    </div>
                  </div>

                  {/* DPO */}
                  <div className="p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:border-primary/20 transition-all">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Days Payable Outstanding (DPO)</span>
                      <h4 className="text-2xl font-black mt-2 text-foreground">{liquidity?.dpo} Days</h4>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Settlement terms lag with raw suppliers</p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-t border-border/10 pt-2 text-muted-foreground/80 mt-1">
                      <span>Suppliers Payables:</span>
                      <span className="font-bold text-foreground">{Currency(liquidity?.total_payables)}</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Sales Officer Net Profitability Matrix */}
            <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Sales Officer Net Profitability Matrix</CardTitle>
                <CardDescription>Centralized CFO audit:completed Sales Margin minus travel claims.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                {matrix.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-10">No Sales Officer profitability metrics compiled.</p>
                ) : (
                  <DataTable 
                    columns={['Sales Officer', 'Gross Revenue', 'Gross Margin', 'Travel Claims', 'Net Profit Contribution', 'Expense Ratio']}
                    rows={matrix.map((row: any) => {
                      const netProfitColor = row.net_profit_contribution >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
                      return [
                        row.name || row.so_email.split('@')[0],
                        Currency(row.gross_revenue),
                        Currency(row.gross_margin),
                        Currency(row.travel_expenses),
                        <span className={netProfitColor}>{Currency(row.net_profit_contribution)}</span>,
                        <span className={row.expense_to_revenue_pct > 15.0 ? 'text-rose-600 font-bold' : 'text-muted-foreground'}>
                          {Percent(row.expense_to_revenue_pct)}
                        </span>
                      ];
                    })}
                  />
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Financial Governance Leaderboard & Observations */}
          <div className="space-y-6">
            
            {/* Efficiency Award Leaderboard */}
            <Card className="border-none shadow-lg bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl ring-1 ring-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500 animate-pulse" />
                  Profitability Leaderboard
                </CardTitle>
                <CardDescription>Ranking officers by net commercial margin contributions.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {matrix.slice(0, 3).map((item: any, i: number) => {
                  const medalColors = ['bg-amber-500/20 text-amber-600 border-amber-500/30', 'bg-slate-500/20 text-slate-600 border-slate-500/30', 'bg-orange-500/20 text-orange-600 border-orange-500/30'];
                  
                  return (
                    <div key={item.so_email} className="p-3 bg-card border rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-primary/20 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black shrink-0 ${medalColors[i] || 'bg-muted text-muted-foreground border-border'}`}>
                          #{i + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground truncate max-w-[120px]">{item.name}</h4>
                          <span className="text-[9px] text-muted-foreground/80 block uppercase tracking-widest">Ratio: {Percent(item.expense_to_revenue_pct)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-muted-foreground/60 block uppercase tracking-widest">Net Contribution</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{Currency(item.net_profit_contribution)}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* CFO working capital warnings */}
            <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  CFO Financial Observations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
                <p>
                  * DSO lags are calculated strictly against real accounts outstanding values inside Dealer/Distributor tables.
                </p>
                <p>
                  * Negative Cash Conversion Cycles (CCC) represent highly favorable terms where supplier payables exceed inventory lockup.
                </p>
                <div className="p-2.5 bg-muted/60 border border-border/40 text-[9px] font-mono rounded-xl">
                  Collection Standard: Net-45 Days<br />
                  Supplier Payment terms: Net-30 Days<br />
                  GST Valuation basis: 18.0% exclusive
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
};
