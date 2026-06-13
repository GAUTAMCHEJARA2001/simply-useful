import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Award, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { leadService } from '@/api/services/lead.service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin } from 'lucide-react';

interface DashboardMetrics {
  totalLeads: number;
  wonLeads: number;
  pipelineValue: number;
  highPriority: number;
  overdueFollowups: number;
}

interface LeadsByStage {
  name: string;
  value: number;
}

const STAGE_COLORS: Record<string, string> = {
  'NEW': 'hsl(215, 60%, 50%)',
  'CONTACTED': 'hsl(195, 60%, 50%)',
  'PROPOSAL': 'hsl(260, 60%, 50%)',
  'NEGOTIATION': 'hsl(35, 75%, 50%)',
  'WON': 'hsl(140, 60%, 45%)',
  'LOST': 'hsl(0, 60%, 50%)',
};

const CRMDashboard: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger = 0 }) => {
  const { toast } = useToast();
  const { fyBounds, selectedFY, fyLabel } = useFinancialYear();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeads: 0,
    wonLeads: 0,
    pipelineValue: 0,
    highPriority: 0,
    overdueFollowups: 0,
  });
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [stageData, setStageData] = useState<LeadsByStage[]>([]);
  const [loading, setLoading] = useState(true);

  // New filters
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [pincodeFilter, setPincodeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Build FY date filter params for the API
      const fyParams = fyBounds
        ? { start: fyBounds.start.toISOString().split('T')[0], end: fyBounds.endExclusive.toISOString().split('T')[0] }
        : {};
      try {
        const [metricsRes, leadsRes] = await Promise.all([
          leadService.getDashboardMetrics(fyParams),
          leadService.getAll(fyParams)
        ]);
        
        if (metricsRes.data?.success) {
          setMetrics(prev => ({ ...prev, overdueFollowups: metricsRes.data.data.overdueFollowups || 0 }));
        }

        if (leadsRes.data?.success) {
          setAllLeads(leadsRes.data.data);
        }
      } catch (err: any) {
        console.error('CRM Dashboard error:', err);
        toast({
          title: 'Error loading CRM metrics',
          description: err.message || 'Server connection failed',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger, toast, selectedFY, fyBounds]);

  // Recalculate metrics when leads or filters change
  useEffect(() => {
    if (!allLeads) return;

    // Filter leads
    const filtered = allLeads.filter(l => {
      const matchCity = !cityFilter || (l.city || '').toLowerCase().includes(cityFilter.toLowerCase());
      const matchState = !stateFilter || (l.state || '').toLowerCase().includes(stateFilter.toLowerCase());
      const matchPincode = !pincodeFilter || (l.pincode || '').includes(pincodeFilter);
      const matchSource = sourceFilter === 'all' || l.source === sourceFilter;
      return matchCity && matchState && matchPincode && matchSource;
    });

    // Compute metrics
    const total = filtered.length;
    const won = filtered.filter(l => l.status === 'WON').length;
    const high = filtered.filter(l => l.priority === 'HIGH').length;
    const pipelineVal = filtered
      .filter(l => ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION'].includes(l.status))
      .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

    setMetrics(prev => ({
      ...prev,
      totalLeads: total,
      wonLeads: won,
      highPriority: high,
      pipelineValue: pipelineVal,
    }));

    // Compute chart data
    const stages = ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    const counts = stages.map(stage => ({
      name: stage.charAt(0) + stage.slice(1).toLowerCase(),
      value: filtered.filter((l: any) => l.status === stage).length,
      rawStage: stage,
    }));
    setStageData(counts);
  }, [allLeads, cityFilter, stateFilter, pincodeFilter, sourceFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Active Leads Pipeline',
      value: metrics.totalLeads.toString(),
      subtext: `${metrics.wonLeads} deals successfully closed`,
      icon: Users,
      colorClass: 'bg-primary/10 text-primary',
    },
    {
      label: 'Est. Pipeline Value',
      value: `₹${metrics.pipelineValue.toLocaleString('en-IN')}`,
      subtext: 'Sum of value for active leads',
      icon: TrendingUp,
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'High Priority Deals',
      value: metrics.highPriority.toString(),
      subtext: 'Require immediate attention',
      icon: AlertCircle,
      colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Overdue Follow-ups',
      value: metrics.overdueFollowups.toString(),
      subtext: 'Next contact date exceeded',
      icon: Clock,
      colorClass: metrics.overdueFollowups > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Analytics Filters Box */}
      <div className="bg-muted/20 p-3 rounded-xl border border-border/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter by City"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="pl-9 h-10 bg-background text-sm"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter by State"
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="pl-9 h-10 bg-background text-sm"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter by Pincode"
            value={pincodeFilter}
            onChange={e => setPincodeFilter(e.target.value)}
            className="pl-9 h-10 bg-background text-sm"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="bg-background h-10">
            <SelectValue placeholder="Filter Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="Cold Call">Cold Call</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
            <SelectItem value="Website">Website</SelectItem>
            <SelectItem value="Event">Event</SelectItem>
            <SelectItem value="Social Media">Social Media</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="kpi-card border border-border/60 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-start justify-between">
                <div>
                   <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate" title={kpi.label}>{kpi.label}</p>
                   <p className="text-2xl xl:text-3xl font-extrabold text-foreground mt-2 truncate" title={String(kpi.value)}>{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.colorClass}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                {kpi.label === 'Active Leads Pipeline' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                {kpi.subtext}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart and Detail Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Leads by Pipeline Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(214, 32%, 91%)',
                      fontSize: '12px'
                    }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                  />
                  <Bar dataKey="value" name="Leads count" radius={[6, 6, 0, 0]}>
                    {stageData.map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.rawStage] || 'hsl(215, 60%, 50%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Conversion Box */}
        <Card className="shadow-sm border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base">CRM Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-36 h-36">
                  <circle className="text-muted/30" strokeWidth="8" stroke="currentColor" fill="transparent" r="58" cx="72" cy="72" />
                  <circle
                    className="text-primary transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 * (1 - (metrics.totalLeads > 0 ? (metrics.wonLeads / (metrics.totalLeads + metrics.wonLeads)) : 0))}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="58"
                    cx="72"
                    cy="72"
                    transform="rotate(-90 72 72)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold text-foreground">
                    {metrics.totalLeads > 0
                      ? Math.round((metrics.wonLeads / (metrics.totalLeads + metrics.wonLeads)) * 100)
                      : 0}%
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">Won Ratio</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Total Deals Processed</span>
                <span className="font-semibold text-foreground">{metrics.totalLeads + metrics.wonLeads}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Won & Converted</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{metrics.wonLeads}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-muted-foreground">Active in Pipeline</span>
                <span className="font-semibold text-foreground">{metrics.totalLeads}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMDashboard;
