import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { 
  Clock, ArrowRight, ShieldAlert, Search, Filter,
  Loader2, Activity, AlertTriangle, CheckCircle2, History
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';

export const ProcessBottlenecksTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<'ALL' | 'ORDER' | 'LEAD'>('ALL');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'bottlenecks'],
    queryFn: async () => {
      const res = await api.get('/analytics/bottlenecks');
      return res.data?.data || res.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Analyzing lifecycle stage velocities & event audit ledgers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl flex gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <div>
          <span className="font-bold">Bottleneck Analysis Unavailable</span>
          <p className="mt-1">Analytical database ledger calculations failed. Ensure that database tables and ETL logs compile correctly.</p>
        </div>
      </div>
    );
  }

  const orderStages = data?.order_stage_hours || {};
  const leadStages = data?.lead_stage_days || {};
  const bottlenecks = data?.bottlenecks || [];
  const eventLedger = data?.event_ledger || [];

  // Filtered Event Ledger for Interactive Search
  const filteredEvents = eventLedger.filter((evt: any) => {
    const matchesSearch = 
      evt.entity_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.old_state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.new_state?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      entityFilter === 'ALL' || 
      evt.entity_type?.toUpperCase() === entityFilter;

    return matchesSearch && matchesFilter;
  });

  const getSlaStatus = (actual: number, benchmark: number) => {
    if (actual > benchmark) {
      return {
        label: 'SLA Breach',
        color: 'text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-400',
        barColor: 'bg-rose-500',
        cardBorder: 'border-rose-500/30 shadow-rose-500/5'
      };
    } else if (actual > benchmark * 0.8) {
      return {
        label: 'Near Breach',
        color: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400',
        barColor: 'bg-amber-500',
        cardBorder: 'border-amber-500/30 shadow-amber-500/5'
      };
    }
    return {
      label: 'Optimal Velocity',
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400',
      barColor: 'bg-emerald-500',
      cardBorder: 'border-border'
    };
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Info */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Process Bottleneck & Velocity Cockpit
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kimball-style immutable Event Ledger tracking stage conversion velocities, SLA warnings, and operational backlogs.
        </p>
      </div>

      {/* SLA Alarm Center & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Funnels and Visual Flows */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Processing Pipeline */}
          <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                Order Processing Lifecycle velocities
              </CardTitle>
              <CardDescription>Average processing hours spent by stage vs SLA targets</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Stage 1: Pending */}
                {(() => {
                  const actual = orderStages.Pending || 0;
                  const bench = orderStages.benchmarks?.Pending || 24;
                  const pct = Math.min((actual / bench) * 100, 100);
                  const status = getSlaStatus(actual, bench);
                  return (
                    <div className={`p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.01] transition-all duration-200 ${status.cardBorder}`}>
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">1. Pending Approval</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h4 className="text-2xl font-black mt-2 text-foreground">{actual}h</h4>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Average wait for administrator approval</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${status.barColor}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>Actual: {actual}h</span>
                          <span>Limit: {bench}h</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stage 2: Approved */}
                {(() => {
                  const actual = orderStages.Approved || 0;
                  const bench = orderStages.benchmarks?.Approved || 48;
                  const pct = Math.min((actual / bench) * 100, 100);
                  const status = getSlaStatus(actual, bench);
                  return (
                    <div className={`p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.01] transition-all duration-200 ${status.cardBorder}`}>
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">2. Approved Lag</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h4 className="text-2xl font-black mt-2 text-foreground">{actual}h</h4>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Average dispatch queue turnaround duration</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${status.barColor}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>Actual: {actual}h</span>
                          <span>Limit: {bench}h</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stage 3: Dispatched */}
                {(() => {
                  const actual = orderStages.Dispatched || 0;
                  const bench = orderStages.benchmarks?.Dispatched || 24;
                  const pct = Math.min((actual / bench) * 100, 100);
                  const status = getSlaStatus(actual, bench);
                  return (
                    <div className={`p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.01] transition-all duration-200 ${status.cardBorder}`}>
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">3. Transit Duration</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h4 className="text-2xl font-black mt-2 text-foreground">{actual}h</h4>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Transit lead time from warehouse to dealer</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${status.barColor}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>Actual: {actual}h</span>
                          <span>Limit: {bench}h</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* CRM Leads Lifecycle Pipeline */}
          <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                CRM Leads Conversion Pipeline
              </CardTitle>
              <CardDescription>Average days spent in sales funnel stages vs SLA benchmarks</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Stage 1: New */}
                {(() => {
                  const actual = leadStages.New || 0;
                  const bench = leadStages.benchmarks?.New || 3;
                  const pct = Math.min((actual / bench) * 100, 100);
                  const status = getSlaStatus(actual, bench);
                  return (
                    <div className={`p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.01] transition-all duration-200 ${status.cardBorder}`}>
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">1. New Lead</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${status.color}`}>
                            {status.label.split(' ')[0]}
                          </span>
                        </div>
                        <h4 className="text-xl font-black mt-2 text-foreground">{actual} Days</h4>
                        <p className="text-[9px] text-muted-foreground/60 mt-1">Average lag prior to first user assignment</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                          <div className={`h-full rounded-full ${status.barColor}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>Act: {actual}d</span>
                          <span>Lim: {bench}d</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stage 2: Contacted */}
                {(() => {
                  const actual = leadStages.Contacted || 0;
                  const bench = leadStages.benchmarks?.Contacted || 5;
                  const pct = Math.min((actual / bench) * 100, 100);
                  const status = getSlaStatus(actual, bench);
                  return (
                    <div className={`p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.01] transition-all duration-200 ${status.cardBorder}`}>
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">2. Contacted</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${status.color}`}>
                            {status.label.split(' ')[0]}
                          </span>
                        </div>
                        <h4 className="text-xl font-black mt-2 text-foreground">{actual} Days</h4>
                        <p className="text-[9px] text-muted-foreground/60 mt-1">Stagnancy during qualification cycle</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                          <div className={`h-full rounded-full ${status.barColor}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>Act: {actual}d</span>
                          <span>Lim: {bench}d</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stage 3: Proposal */}
                {(() => {
                  const actual = leadStages.Proposal || 0;
                  const bench = leadStages.benchmarks?.Proposal || 10;
                  const pct = Math.min((actual / bench) * 100, 100);
                  const status = getSlaStatus(actual, bench);
                  return (
                    <div className={`p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.01] transition-all duration-200 ${status.cardBorder}`}>
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">3. Proposal</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${status.color}`}>
                            {status.label.split(' ')[0]}
                          </span>
                        </div>
                        <h4 className="text-xl font-black mt-2 text-foreground">{actual} Days</h4>
                        <p className="text-[9px] text-muted-foreground/60 mt-1">Wait duration during quotation drafting</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                          <div className={`h-full rounded-full ${status.barColor}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>Act: {actual}d</span>
                          <span>Lim: {bench}d</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stage 4: Negotiation */}
                {(() => {
                  const actual = leadStages.Negotiation || 0;
                  const bench = leadStages.benchmarks?.Negotiation || 7;
                  const pct = Math.min((actual / bench) * 100, 100);
                  const status = getSlaStatus(actual, bench);
                  return (
                    <div className={`p-4 bg-card border rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:scale-[1.01] transition-all duration-200 ${status.cardBorder}`}>
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">4. Negotiation</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${status.color}`}>
                            {status.label.split(' ')[0]}
                          </span>
                        </div>
                        <h4 className="text-xl font-black mt-2 text-foreground">{actual} Days</h4>
                        <p className="text-[9px] text-muted-foreground/60 mt-1">Final commercial review before deal close</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                          <div className={`h-full rounded-full ${status.barColor}`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                          <span>Act: {actual}d</span>
                          <span>Lim: {bench}d</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Active SLA Warning Cards */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-b from-card/85 to-card/45 backdrop-blur-xl ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
                Active SLA Bottleneck Alarms
              </CardTitle>
              <CardDescription>Real-time system alarms flagging operational stagnancy</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {bottlenecks.length === 0 ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl flex flex-col items-center justify-center text-center gap-2 py-8 dark:text-emerald-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">All Velocities Nominal</span>
                  <p className="text-[10px] text-muted-foreground/80">No SLA benchmark violations currently detected across operations.</p>
                </div>
              ) : (
                bottlenecks.map((item: any, i: number) => {
                  const colorClass = item.severity === 'CRITICAL' 
                    ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50' 
                    : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50';
                  
                  return (
                    <div key={i} className={`p-4 border rounded-2xl flex flex-col gap-2 shadow-sm transition-all duration-200 ${colorClass}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className={`w-4 h-4 ${item.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'}`} />
                          <span className="text-[10px] font-bold tracking-wider uppercase text-foreground">{item.entity} Stage Lag</span>
                        </div>
                        <span className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full border ${item.severity === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400'}`}>
                          {item.severity}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-foreground">{item.stage}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-normal">{item.desc}</p>
                      </div>
                      <div className="flex justify-between text-[9px] font-semibold border-t border-border/10 pt-2 text-muted-foreground/75 mt-1">
                        <span>Average: <strong className="text-foreground">{item.val}</strong></span>
                        <span>SLA Threshold: <strong className="text-foreground">{item.limit}</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Operational observations info card */}
          <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
                <History className="w-4 h-4 text-primary" />
                Ledger Observability Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
              <p>
                * Average stage durations are computed strictly by taking the difference between consecutive state modification logs in SQLite.
              </p>
              <p>
                * In cases of empty initial ledger state, the engine dynamically extracts transactional seed updates from core tables as a high-fidelity starting baseline.
              </p>
              <div className="p-2.5 bg-muted/60 border border-border/40 text-[9px] font-mono rounded-xl leading-normal">
                Ledger Mode: IMMUTABLE WRITE-ONCE<br />
                Observer Trigger: Django Signals<br />
                Precision Rank: Hour-level (Orders) / Day-level (CRM Leads)
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Immutable Event Audit Ledger Log Table */}
      <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            Immutable Process Event Audit Ledger Log
          </CardTitle>
          <CardDescription>Complete database event log capturing every operational state conversion with precise stage timings.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Interactive Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ledger by Entity ID, actor email, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-muted/30 border border-border hover:border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div className="flex gap-1.5 shrink-0 bg-muted/30 p-1 rounded-xl border border-border">
              {(['ALL', 'ORDER', 'LEAD'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setEntityFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    entityFilter === filter
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Table display */}
          <div className="overflow-hidden">
            {filteredEvents.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No matching process events found in audit log ledger.</p>
            ) : (
              <DataTable 
                columns={['Timestamp', 'Entity Class', 'Entity ID', 'From Stage', 'To Stage', 'Time Spent', 'Trigger Email']}
                rows={filteredEvents.map((row: any) => {
                  const isOrder = row.entity_type === 'Order';
                  return [
                    row.timestamp ? row.timestamp.replace('T', ' ').split('.')[0] : '—',
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                      isOrder 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                        : 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400'
                    }`}>
                      {row.entity_type}
                    </span>,
                    <span className="font-mono text-xs text-foreground font-bold">{row.entity_id}</span>,
                    <span className="text-muted-foreground font-medium text-xs">{row.old_state || '—'}</span>,
                    <span className="text-foreground font-bold text-xs">{row.new_state || '—'}</span>,
                    <span className="text-indigo-600 font-bold text-xs dark:text-indigo-400">{row.duration_label}</span>,
                    <span className="text-muted-foreground font-mono text-xs">{row.user_email || 'system'}</span>
                  ];
                })}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
