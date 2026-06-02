import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, AlertOctagon, 
  Clock, RotateCw, HelpCircle, Loader2, Database, AlertCircle
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';

export const DataQualityTab: React.FC = () => {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['analytics', 'data-quality'],
    queryFn: async () => {
      const res = await api.get('/analytics/data-quality');
      return res.data?.data || res.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Scanning analytical schema tables & executing data assertions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl flex gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <div>
          <span className="font-bold">Data Quality Report Unavailable</span>
          <p className="mt-1">Validation tests failed to compile. Re-run ETL compilation to repair analytical schema references.</p>
        </div>
      </div>
    );
  }

  const healthScore = data?.health_score ?? 100.0;
  const criticalViolations = data?.critical_violations ?? 0;
  const rules = data?.rules ?? [];
  const sync = data?.sync_freshness ?? { hours_since_sync: 0.0, status: 'Optimal', last_sync_time: '—' };

  // Determine colors based on Health Score
  const getHealthColors = (score: number) => {
    if (score >= 90.0) {
      return {
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
        glow: 'shadow-emerald-500/5',
        ringColor: '#10b981'
      };
    } else if (score >= 70.0) {
      return {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
        glow: 'shadow-amber-500/5',
        ringColor: '#f59e0b'
      };
    }
    return {
      text: 'text-rose-600 dark:text-rose-400',
      bg: 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
      glow: 'shadow-rose-500/5',
      ringColor: '#ef4444'
    };
  };

  const health = getHealthColors(healthScore);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data Quality & Schema Observability Cockpit
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated integrity assertions enforcing foreign key constraints, value limits, invoice uniqueness, casing rules, and warehouse sync intervals.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border transition-all"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Run Assertions
        </button>
      </div>

      {/* Overview Aggregates Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Data Integrity Health Score */}
        <Card className={`border-none shadow-lg bg-gradient-to-br ${health.bg} backdrop-blur-xl ring-1 ring-border/50 ${health.glow}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Overall Data Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex items-center justify-between">
            <div>
              <h3 className={`text-4xl font-black ${health.text} tracking-tight`}>
                {healthScore}%
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                {healthScore >= 90.0 
                  ? 'All core database constraints fully compliant with warehouse requirements.' 
                  : 'Minor formatting or sync exceptions require administrative adjustments.'}
              </p>
            </div>
            
            {/* Minimal Circular Progress Bar */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="rgba(0,0,0,0.05)" strokeWidth="5" fill="transparent" />
                <circle cx="32" cy="32" r="26" stroke={health.ringColor} strokeWidth="5" fill="transparent"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - healthScore / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute text-[10px] font-black text-foreground">
                {healthScore >= 90.0 ? <ShieldCheck className="w-6 h-6 text-emerald-500" /> : <ShieldAlert className={`w-6 h-6 ${health.text}`} />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Sync Freshness Meter */}
        <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Database Sync Freshness
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex items-center justify-between gap-3">
            <div>
              <h3 className={`text-3xl font-black tracking-tight ${sync.hours_since_sync <= 6.0 ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'}`}>
                {sync.hours_since_sync} Hours
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${sync.hours_since_sync <= 6.0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></span>
                <span className="text-[10px] text-muted-foreground font-semibold">{sync.status}</span>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-2xl text-muted-foreground">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Critical Violations */}
        <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Total Validation Violations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex items-center justify-between gap-3">
            <div>
              <h3 className={`text-3xl font-black tracking-tight ${criticalViolations === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {criticalViolations}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                {criticalViolations === 0 
                  ? 'Zero data integrity issues detected across warehouse.' 
                  : 'Total records failing active schema validation criteria.'}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-2xl text-muted-foreground">
              <AlertCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Performance Detail Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Active Database Assertions Grid ({rules.length} Rules Checked)
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rules.map((rule: any, idx: number) => {
            const isPass = rule.status === 'PASS';
            const statusColor = isPass 
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/2'
              : 'border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 shadow-rose-500/2';
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className={`p-4 border rounded-2xl flex flex-col gap-3 shadow-sm transition-all duration-200 hover:scale-[1.01] ${statusColor}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-2 items-start">
                    <div className="mt-0.5 shrink-0">
                      {isPass ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertOctagon className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{rule.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{rule.description}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full border ${isPass ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                    {rule.status}
                  </span>
                </div>

                {!isPass && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-[10px] rounded-xl flex flex-col gap-2 leading-relaxed">
                    <div className="flex justify-between font-bold text-foreground">
                      <span>Violations Count:</span>
                      <span>{rule.failure_count} records</span>
                    </div>
                    {rule.samples && (
                      <div className="border-t border-rose-500/10 pt-2 font-mono text-[9px] break-all leading-normal text-rose-700 dark:text-rose-300">
                        <strong>Samples:</strong> {rule.samples}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Historical Audit Log Ledger */}
      <Card className="border-none shadow-lg bg-card/30 backdrop-blur-xl ring-1 ring-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            Data Quality Audit Ledger
          </CardTitle>
          <CardDescription>Live database audit record of core assertions, validation thresholds, and timestamp tracking.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <DataTable 
            columns={['Checked Rule', 'Metric Audited', 'Audit Status', 'Violation Count', 'Checked Timestamp']}
            rows={rules.map((rule: any) => [
              <span className="font-bold text-foreground text-xs">{rule.name}</span>,
              <span className="text-muted-foreground text-xs">{rule.description.split('.')[0]}</span>,
              <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black tracking-wider ${
                rule.status === 'PASS' 
                  ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-rose-500/15 border-rose-500/25 text-rose-600 dark:text-rose-400'
              }`}>
                {rule.status}
              </span>,
              <span className={`font-mono text-xs font-bold ${rule.failure_count > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-muted-foreground'}`}>
                {rule.failure_count}
              </span>,
              <span className="text-muted-foreground text-xs font-mono">{rule.timestamp ? rule.timestamp.split('.')[0] : '—'}</span>
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
};
