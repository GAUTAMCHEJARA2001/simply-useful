import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { travelService, SOScorecardData, SOScorecardOfficer } from '@/api/services/travel.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatIndianCurrency, formatIndianNumber } from '@/utils/format';
import {
  Trophy,
  Award,
  Crown,
  Medal,
  TrendingUp,
  Target,
  ShoppingBag,
  MapPin,
  IndianRupee,
  UserPlus,
  Car,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Filter,
  BarChart3,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SOScorecardTabProps {
  initialSoEmail?: string;
}

export const SOScorecardTab: React.FC<SOScorecardTabProps> = ({ initialSoEmail }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Period Selection: WEEKLY | MONTHLY | YEARLY
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Data & Loading state
  const [loading, setLoading] = useState<boolean>(true);
  const [scorecardData, setScorecardData] = useState<SOScorecardData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('ALL');

  // Drilldown Modal
  const [drilldownOfficer, setDrilldownOfficer] = useState<SOScorecardOfficer | null>(null);

  // Determine if current user is Sales Officer or Executive Admin
  const isSalesUser = useMemo(() => {
    const role = (user?.role || '').toUpperCase();
    return ['SALES', 'SALES_OFFICER', 'SALES OFFICER', 'SALES_EXECUTIVE', 'SO'].includes(role);
  }, [user]);

  const isAdmin = useMemo(() => {
    if (scorecardData?.is_admin !== undefined) {
      return Boolean(scorecardData.is_admin);
    }
    const role = (user?.role || '').toUpperCase();
    return ['SUPERADMIN', 'ADMIN', 'HR', 'MANAGEMENT'].includes(role) || Boolean((user as any)?.is_superuser);
  }, [user, scorecardData]);

  const myOfficer = useMemo(() => {
    if (!scorecardData?.officers || scorecardData.officers.length === 0) return null;
    if (!isAdmin) {
      return scorecardData.officers[0];
    }
    return scorecardData.officers.find(o => o.email?.toLowerCase() === user?.email?.toLowerCase()) || scorecardData.officers[0];
  }, [scorecardData, isAdmin, user]);

  // Fetch Scorecard Data
  const fetchScorecard = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        period,
        year: selectedYear,
        month: selectedMonth,
      };
      if (period === 'WEEKLY') {
        params.week = selectedWeek;
      }
      if (initialSoEmail) {
        params.so_email = initialSoEmail;
      }

      const res = await travelService.getSOScorecard(params);
      if (res.data?.data) {
        setScorecardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load SO scorecard:', err);
    } finally {
      setLoading(false);
    }
  }, [period, selectedYear, selectedMonth, selectedWeek, initialSoEmail]);

  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  // Handle Step Forward / Backward in Time
  const handleStepPeriod = (direction: 'PREV' | 'NEXT') => {
    if (period === 'WEEKLY') {
      if (direction === 'PREV') {
        if (selectedWeek > 1) setSelectedWeek(w => w - 1);
        else {
          if (selectedMonth > 1) {
            setSelectedMonth(m => m - 1);
            setSelectedWeek(4);
          } else {
            setSelectedYear(y => y - 1);
            setSelectedMonth(12);
            setSelectedWeek(4);
          }
        }
      } else {
        if (selectedWeek < 4) setSelectedWeek(w => w + 1);
        else {
          if (selectedMonth < 12) {
            setSelectedMonth(m => m + 1);
            setSelectedWeek(1);
          } else {
            setSelectedYear(y => y + 1);
            setSelectedMonth(1);
            setSelectedWeek(1);
          }
        }
      }
    } else if (period === 'MONTHLY') {
      if (direction === 'PREV') {
        if (selectedMonth > 1) setSelectedMonth(m => m - 1);
        else {
          setSelectedYear(y => y - 1);
          setSelectedMonth(12);
        }
      } else {
        if (selectedMonth < 12) setSelectedMonth(m => m + 1);
        else {
          setSelectedYear(y => y + 1);
          setSelectedMonth(1);
        }
      }
    } else if (period === 'YEARLY') {
      setSelectedYear(y => (direction === 'PREV' ? y - 1 : y + 1));
    }
  };

  // Unique Territories for Filtering
  const territories = useMemo(() => {
    if (!scorecardData?.officers) return [];
    const set = new Set<string>();
    scorecardData.officers.forEach(o => {
      if (o.territory) set.add(o.territory);
    });
    return Array.from(set).sort();
  }, [scorecardData]);

  // Filtered Officers List
  const filteredOfficers = useMemo(() => {
    if (!scorecardData?.officers) return [];
    return scorecardData.officers.filter(o => {
      const matchSearch =
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.territory.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTerritory = selectedTerritory === 'ALL' || o.territory === selectedTerritory;
      return matchSearch && matchTerritory;
    });
  }, [scorecardData, searchQuery, selectedTerritory]);

  // Top 3 Podium Officers (from raw sorted list)
  const podium = useMemo(() => {
    if (!scorecardData?.officers || scorecardData.officers.length === 0) return [];
    return scorecardData.officers.slice(0, 3);
  }, [scorecardData]);

  // Export to CSV
  const handleExportCSV = () => {
    const listToExport = isAdmin ? (scorecardData?.officers || []) : (myOfficer ? [myOfficer] : []);
    if (listToExport.length === 0) return;
    const headers = [
      'Rank',
      'Name',
      'Email',
      'Territory',
      'Composite Score',
      'Grade',
      'Sales Target (Rs)',
      'Gross Revenue (Rs)',
      'Order Bags Actual',
      'Order Bags Target (Est)',
      'Total Visits',
      'Beat Adherence %',
      'Payment Collected',
      'New Dealers Onboarded',
      'Active Travel Days',
    ];
    const rows = listToExport.map(o => [
      isAdmin ? o.rank : 1,
      `"${o.name}"`,
      `"${o.email}"`,
      `"${o.territory}"`,
      o.composite_score,
      o.grade,
      o.pillars.orders.target_revenue || 0,
      o.pillars.orders.actual_revenue,
      o.pillars.orders.actual_bags,
      o.pillars.orders.target_bags,
      o.pillars.visits.effective_visits,
      o.pillars.visits.beat_adherence_pct,
      o.pillars.payments.actual_collection,
      o.pillars.onboarding.new_dealers,
      o.pillars.discipline.active_days,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const labelSlug = (scorecardData?.date_range.label || '').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = isAdmin
      ? `SO_Scorecard_Team_${period}_${labelSlug}.csv`
      : `My_Scorecard_${(myOfficer?.name || 'Personal').replace(/[^a-zA-Z0-9]/g, '_')}_${period}_${labelSlug}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGradeTheme = (grade: string) => {
    switch (grade) {
      case 'A+':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
          badge: 'bg-emerald-600 text-white',
          ring: 'text-emerald-500',
        };
      case 'A':
        return {
          bg: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
          badge: 'bg-blue-600 text-white',
          ring: 'text-blue-500',
        };
      case 'B':
        return {
          bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
          badge: 'bg-amber-500 text-white',
          ring: 'text-amber-500',
        };
      case 'C':
        return {
          bg: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
          badge: 'bg-orange-500 text-white',
          ring: 'text-orange-500',
        };
      default:
        return {
          bg: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
          badge: 'bg-rose-600 text-white',
          ring: 'text-rose-500',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & PERIOD SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>{isAdmin ? 'Sales Officer Performance Scorecard & Leaderboard' : 'My Performance Scorecard'}</span>
                <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 text-primary border-primary/20">
                  100-Point KPI Model
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? 'Executive overview of Order Booking, Counter Visits, Payment Collections, Dealer Onboarding & Field Discipline'
                  : 'Your personal 100-point KPI evaluation, target achievements, and coaching insights'}
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Segmented Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Toggle: WEEKLY / MONTHLY / YEARLY */}
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border">
            <button
              type="button"
              onClick={() => setPeriod('WEEKLY')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                period === 'WEEKLY' ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              📅 Weekly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('MONTHLY')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                period === 'MONTHLY' ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              🗓️ Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('YEARLY')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                period === 'YEARLY' ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              📆 Yearly
            </button>
          </div>

          {/* Stepper Navigator */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => handleStepPeriod('PREV')}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold text-foreground px-2 whitespace-nowrap min-w-[120px] text-center">
              {scorecardData?.date_range.label || 'Loading period...'}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => handleStepPeriod('NEXT')}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Export CSV */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || !scorecardData?.officers?.length}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
            title="Download Scorecard CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAdmin ? 'Export Team' : 'Export My Score'}</span>
          </Button>
        </div>
      </div>

      {/* 2. CONDITIONAL VIEW: EXECUTIVE LEADERBOARD (Admin/HR) vs PERSONAL SCORECARD (Sales Officer) */}
      {isAdmin ? (
        <>
          {/* TEAM OVERVIEW STATS BANNER */}
          {scorecardData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="shadow-2xs border bg-gradient-to-br from-primary/5 via-card to-card">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-primary" />
                    Team Avg Score
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-foreground">{scorecardData.summary.team_avg_score}</span>
                    <span className="text-xs font-bold text-muted-foreground">/ 100</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Across {scorecardData.summary.total_officers} officers</p>
                </CardContent>
              </Card>

              <Card className="shadow-2xs border bg-card">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-purple-500" />
                    Total Order Bags
                  </span>
                  <div className="text-xl font-black text-foreground">
                    {formatIndianNumber(Math.round(scorecardData.summary.total_team_bags))}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium">Bags booked</p>
                </CardContent>
              </Card>

              <Card className="shadow-2xs border bg-card">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    Gross Revenue
                  </span>
                  <div className="text-lg font-black text-foreground truncate" title={formatIndianCurrency(scorecardData.summary.total_team_revenue)}>
                    {formatIndianCurrency(scorecardData.summary.total_team_revenue)}
                  </div>
                  <p className="text-[10px] text-muted-foreground">From approved orders</p>
                </CardContent>
              </Card>

              <Card className="shadow-2xs border bg-card">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    Dealer Visits
                  </span>
                  <div className="text-xl font-black text-foreground">
                    {formatIndianNumber(scorecardData.summary.total_team_visits)}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Counter touchpoints</p>
                </CardContent>
              </Card>

              <Card className="shadow-2xs border bg-card">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                    Collections
                  </span>
                  <div className="text-lg font-black text-foreground truncate" title={formatIndianCurrency(scorecardData.summary.total_team_collections)}>
                    {formatIndianCurrency(scorecardData.summary.total_team_collections)}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium">Receipts &amp; stop recovery</p>
                </CardContent>
              </Card>

              <Card className="shadow-2xs border bg-card">
                <CardContent className="p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-rose-500" />
                    New Dealers
                  </span>
                  <div className="text-xl font-black text-foreground">
                    {scorecardData.summary.total_team_new_dealers}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Onboarded &amp; converted</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TOP 3 LEADERBOARD PODIUM */}
          {podium.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Top Performing Sales Officers • Leaderboard Podium</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {podium.map((officer, index) => {
                  const isGold = index === 0;
                  const isSilver = index === 1;
                  const isBronze = index === 2;

                  return (
                    <div
                      key={officer.user_id}
                      onClick={() => setDrilldownOfficer(officer)}
                      className={cn(
                        "relative rounded-2xl p-4 border transition-all cursor-pointer overflow-hidden shadow-xs hover:shadow-md",
                        isGold && "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-card border-amber-500/40 ring-1 ring-amber-500/30",
                        isSilver && "bg-gradient-to-br from-slate-400/15 via-slate-400/5 to-card border-slate-400/40",
                        isBronze && "bg-gradient-to-br from-amber-700/15 via-amber-700/5 to-card border-amber-700/40"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                            isGold && "bg-amber-500 text-white shadow-xs",
                            isSilver && "bg-slate-400 text-white shadow-xs",
                            isBronze && "bg-amber-700 text-white shadow-xs"
                          )}>
                            {isGold ? <Crown className="w-4 h-4" /> : `#${officer.rank}`}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-foreground leading-snug">{officer.name}</h4>
                            <p className="text-[11px] text-muted-foreground">{officer.territory}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-black text-foreground">{officer.composite_score}</div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Grade {officer.grade}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Bags</span>
                          <span className="font-bold text-foreground">{Math.round(officer.pillars.orders.actual_bags || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Visits</span>
                          <span className="font-bold text-foreground">{officer.pillars.visits.effective_visits}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Collected</span>
                          <span className="font-bold text-emerald-600 truncate block">₹{(officer.pillars.payments.actual_collection / 1000).toFixed(0)}K</span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-primary font-semibold">
                        <span>View Full Evaluation</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEARCH, FILTER & FULL OFFICER SCORECARD TABLE/CARDS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>All Sales Officers</span>
                  <span className="text-xs font-normal text-muted-foreground">({filteredOfficers.length} officers evaluated)</span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search officer, territory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-lg"
                  />
                </div>

                {/* Territory Filter */}
                {territories.length > 0 && (
                  <select
                    value={selectedTerritory}
                    onChange={(e) => setSelectedTerritory(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border text-xs font-semibold bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="ALL">All Territories</option>
                    {territories.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Empty State */}
            {!loading && filteredOfficers.length === 0 && (
              <div className="border border-dashed rounded-2xl p-10 text-center space-y-2 bg-muted/10">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                <h4 className="text-sm font-bold text-foreground">No Sales Officers Found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No sales officers match your search or have recorded activity in this period.
                </p>
              </div>
            )}

            {/* Scorecard Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOfficers.map((officer) => {
                const isSelf = officer.email === user?.email;

                return (
                  <Card
                    key={officer.user_id}
                    className={cn(
                      "border rounded-2xl shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden",
                      isSelf && "ring-2 ring-primary/40 bg-primary/5"
                    )}
                    onClick={() => setDrilldownOfficer(officer)}
                  >
                    <CardContent className="p-4 space-y-4">
                      {/* Officer Header Bar */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 text-sm">
                            #{officer.rank}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-bold text-foreground">{officer.name}</h4>
                              {isSelf && (
                                <Badge className="text-[9px] bg-primary text-white font-bold px-1.5 py-0">YOU</Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                                {officer.territory}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{officer.email}</p>
                          </div>
                        </div>

                        {/* Total Composite Score Badge */}
                        <div className="text-right shrink-0">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-2xl font-black text-foreground">{officer.composite_score}</span>
                            <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
                          </div>
                          <Badge className={cn("text-[10px] font-bold px-2 py-0.5", officer.badge_color)}>
                            Grade {officer.grade} • {officer.grade_label}
                          </Badge>
                        </div>
                      </div>

                      {/* 5 Pillar Progress Bars */}
                      <div className="space-y-2 pt-2 border-t">
                        {/* Pillar 1: Orders */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                              <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                              <span>Orders &amp; Target ({officer.pillars.orders.weight_pct}%)</span>
                            </span>
                            <span className="font-bold text-foreground text-[11px]">
                              {officer.pillars.orders.score} / 30 pts ({officer.pillars.orders.fulfillment_pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, officer.pillars.orders.percentage)}%` }}
                            />
                          </div>
                        </div>

                        {/* Pillar 2: Visits */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              <span>Visits &amp; Beat ({officer.pillars.visits.weight_pct}%)</span>
                            </span>
                            <span className="font-bold text-foreground text-[11px]">
                              {officer.pillars.visits.score} / 25 pts ({officer.pillars.visits.effective_visits} visits)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, officer.pillars.visits.percentage)}%` }}
                            />
                          </div>
                        </div>

                        {/* Pillar 3: Payments */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Collections ({officer.pillars.payments.weight_pct}%)</span>
                            </span>
                            <span className="font-bold text-foreground text-[11px]">
                              {officer.pillars.payments.score} / 20 pts
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, officer.pillars.payments.percentage)}%` }}
                            />
                          </div>
                        </div>

                        {/* Pillar 4: Onboarding */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                              <UserPlus className="w-3.5 h-3.5 text-rose-600" />
                              <span>New Dealers ({officer.pillars.onboarding.weight_pct}%)</span>
                            </span>
                            <span className="font-bold text-foreground text-[11px]">
                              {officer.pillars.onboarding.score} / 15 pts ({officer.pillars.onboarding.new_dealers} added)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-rose-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, officer.pillars.onboarding.percentage)}%` }}
                            />
                          </div>
                        </div>

                        {/* Pillar 5: Discipline */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                              <Car className="w-3.5 h-3.5 text-amber-600" />
                              <span>Travel Discipline ({officer.pillars.discipline.weight_pct}%)</span>
                            </span>
                            <span className="font-bold text-foreground text-[11px]">
                              {officer.pillars.discipline.score} / 10 pts ({officer.pillars.discipline.active_days} days)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-amber-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, officer.pillars.discipline.percentage)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Highlights & Coaching tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t">
                        {officer.strengths.slice(0, 1).map((s, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {s}
                          </span>
                        ))}
                        {officer.improvements.slice(0, 1).map((imp, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {imp}
                          </span>
                        ))}
                      </div>

                      {/* Footer link */}
                      <div className="flex items-center justify-end text-xs font-bold text-primary gap-1 pt-1">
                        <span>View Full Breakdown</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* ========================================================================= */
        /* INDIVIDUAL SALES OFFICER VIEW (Strictly their score only, no team/others) */
        /* ========================================================================= */
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">Calculating your personal performance scorecard...</p>
            </div>
          ) : !myOfficer ? (
            <div className="border border-dashed rounded-2xl p-12 text-center space-y-3 bg-card">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
              <h4 className="text-base font-bold text-foreground">Scorecard Data Not Available</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No orders, visits, or activity recorded for your account in {scorecardData?.date_range.label || 'this period'}.
              </p>
            </div>
          ) : (
            <>
              {/* 1. HERO CARD: 100-PT SCORE GAUGE & SNAPSHOT */}
              <Card className="shadow-xs border rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
                    {/* Score Dial & Details */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                      <div className="relative flex items-center justify-center shrink-0">
                        <div className="w-28 h-28 rounded-full border-4 border-primary/20 flex flex-col items-center justify-center bg-background shadow-xs">
                          <span className="text-3xl font-black text-foreground">{myOfficer.composite_score}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Out of 100</span>
                        </div>
                        <div className="absolute -bottom-1">
                          <Badge className={cn("text-[10px] font-extrabold px-2.5 py-0.5 shadow-xs", myOfficer.badge_color)}>
                            {myOfficer.grade}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                          <h3 className="text-xl font-black text-foreground">{myOfficer.name}</h3>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {myOfficer.territory || 'My Territory'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{myOfficer.email}</p>
                        <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start flex-wrap">
                          <Badge className={cn("text-xs font-bold px-2.5 py-0.5", myOfficer.badge_color)}>
                            Grade {myOfficer.grade} • {myOfficer.grade_label}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            Evaluation: <strong>{scorecardData?.date_range.label}</strong>
                          </span>
                        </div>
                        <p className="text-xs font-medium text-primary pt-0.5">
                          {myOfficer.composite_score >= 85
                            ? '🏆 Outstanding Performance! You are in the Elite performance tier.'
                            : myOfficer.composite_score >= 70
                            ? '🎯 Achiever! You are performing well against company targets.'
                            : myOfficer.composite_score >= 50
                            ? '📈 Consistent Momentum! Follow the growth tips below to reach the next tier.'
                            : '⚡ Needs Focus! Review the coaching tips below to accelerate your results.'}
                        </p>
                      </div>
                    </div>

                    {/* Quick 4 Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 w-full lg:w-auto min-w-[280px]">
                      <div className="p-3 rounded-xl border bg-background/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <ShoppingBag className="w-3.5 h-3.5 text-purple-500" />
                          <span>Order Bags</span>
                        </div>
                        <div className="text-base font-black text-foreground">
                          {formatIndianNumber(Math.round(myOfficer.pillars.orders.actual_bags || 0))} <span className="text-xs font-normal text-muted-foreground">/ {formatIndianNumber(Math.round(myOfficer.pillars.orders.target_bags || 0))} bags</span>
                        </div>
                        <p className="text-[10px] text-emerald-600 font-semibold">{myOfficer.pillars.orders.fulfillment_pct}% target achieved</p>
                      </div>

                      <div className="p-3 rounded-xl border bg-background/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                          <span>Sales Revenue</span>
                        </div>
                        <div className="text-base font-black text-foreground truncate" title={formatIndianCurrency(myOfficer.pillars.orders.actual_revenue)}>
                          {formatIndianCurrency(myOfficer.pillars.orders.actual_revenue)}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate" title={`Target: ${formatIndianCurrency(myOfficer.pillars.orders.target_revenue || 0)}`}>
                          Target: {formatIndianCurrency(myOfficer.pillars.orders.target_revenue || 0)}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border bg-background/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                          <span>Dealer Visits</span>
                        </div>
                        <div className="text-base font-black text-foreground">
                          {myOfficer.pillars.visits.effective_visits} <span className="text-xs font-normal text-muted-foreground">counters</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{myOfficer.pillars.visits.beat_adherence_pct}% beat plan adherence</p>
                      </div>

                      <div className="p-3 rounded-xl border bg-background/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Collections</span>
                        </div>
                        <div className="text-base font-black text-foreground truncate" title={formatIndianCurrency(myOfficer.pillars.payments.actual_collection)}>
                          {formatIndianCurrency(myOfficer.pillars.payments.actual_collection)}
                        </div>
                        <p className="text-[10px] text-emerald-600 font-semibold">{myOfficer.pillars.payments.fulfillment_pct}% collected</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* HR Assigned Targets & Tiered Incentive Slabs Banner */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Official HR Targets &amp; Sales Incentive Plan (SIP)</h5>
                    <p className="text-[11px] text-muted-foreground">
                      Track your progressive slab accelerators, dealer bounties, and category quotas in real time.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/sales/targets')}
                  className="h-8 text-xs font-bold gap-1.5 shrink-0 bg-background hover:bg-muted"
                >
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span>View Targets &amp; SIP Scheme</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* 2. 5-PILLAR EVALUATION CARDS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span>Your 5 Performance Pillars</span>
                  </h4>
                  <span className="text-xs text-muted-foreground font-medium">Weighted Composite Total: 100 Pts</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Pillar 1: Orders */}
                  <Card className="shadow-2xs border bg-card rounded-2xl hover:border-purple-500/30 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-foreground">Order Booking &amp; Revenue</h5>
                            <span className="text-[10px] text-muted-foreground">Weight: 30%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-purple-600">{myOfficer.pillars.orders.score}</span>
                          <span className="text-xs font-bold text-muted-foreground"> / 30</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-muted-foreground">Achievement Rate</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.orders.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, myOfficer.pillars.orders.percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/30 border space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sales Target (₹):</span>
                          <span className="font-bold text-foreground">{formatIndianCurrency(myOfficer.pillars.orders.target_revenue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gross Revenue:</span>
                          <span className="font-bold text-foreground">{formatIndianCurrency(myOfficer.pillars.orders.actual_revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual Bags:</span>
                          <span className="font-bold text-foreground">{formatIndianNumber(Math.round(myOfficer.pillars.orders.actual_bags || 0))} bags</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target Bags (est.):</span>
                          <span className="font-bold text-foreground">{formatIndianNumber(Math.round(myOfficer.pillars.orders.target_bags || 0))} bags</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Orders Booked:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.orders.order_count} orders</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t text-[11px]">
                          <span className="text-muted-foreground">Dealer Channel:</span>
                          <span className="font-semibold text-foreground">{formatIndianNumber(Math.round(myOfficer.pillars.orders.actual_dealer_bags || 0))} / {formatIndianNumber(Math.round(myOfficer.pillars.orders.target_dealer_bags || 0))} bags</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Direct / Non-Dealer:</span>
                          <span className="font-semibold text-foreground">{formatIndianNumber(Math.round(myOfficer.pillars.orders.actual_non_dealer_bags || 0))} / {formatIndianNumber(Math.round(myOfficer.pillars.orders.target_non_dealer_bags || 0))} bags</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pillar 2: Visits */}
                  <Card className="shadow-2xs border bg-card rounded-2xl hover:border-blue-500/30 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-foreground">Dealer Visits &amp; Beat Plan</h5>
                            <span className="text-[10px] text-muted-foreground">Weight: 25%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-blue-600">{myOfficer.pillars.visits.score}</span>
                          <span className="text-xs font-bold text-muted-foreground"> / 25</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-muted-foreground">Achievement Rate</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.visits.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, myOfficer.pillars.visits.percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/30 border space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Effective Visits:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.visits.effective_visits} counters</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Beat Plan Adherence:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.visits.beat_adherence_pct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Geo Proof Compliance:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.visits.proof_compliance_pct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Counter Strike Rate:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.visits.strike_rate_pct}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pillar 3: Payments */}
                  <Card className="shadow-2xs border bg-card rounded-2xl hover:border-emerald-500/30 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <IndianRupee className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-foreground">Payment &amp; Collections</h5>
                            <span className="text-[10px] text-muted-foreground">Weight: 20%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-600">{myOfficer.pillars.payments.score}</span>
                          <span className="text-xs font-bold text-muted-foreground"> / 20</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-muted-foreground">Achievement Rate</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.payments.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, myOfficer.pillars.payments.percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/30 border space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Recovered:</span>
                          <span className="font-bold text-foreground">{formatIndianCurrency(myOfficer.pillars.payments.actual_collection)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Collection Target:</span>
                          <span className="font-bold text-foreground">{formatIndianCurrency(myOfficer.pillars.payments.collection_target)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target Fulfillment:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.payments.fulfillment_pct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Verified Receipts:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.payments.receipt_count} receipts</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pillar 4: Onboarding */}
                  <Card className="shadow-2xs border bg-card rounded-2xl hover:border-rose-500/30 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-foreground">New Dealer Onboarding</h5>
                            <span className="text-[10px] text-muted-foreground">Weight: 15%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-rose-600">{myOfficer.pillars.onboarding.score}</span>
                          <span className="text-xs font-bold text-muted-foreground"> / 15</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-muted-foreground">Achievement Rate</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.onboarding.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-rose-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, myOfficer.pillars.onboarding.percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/30 border space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Dealers Added:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.onboarding.new_dealers} dealers</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Approved:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.onboarding.approved_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">First Order Converted:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.onboarding.converted_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requests Submitted:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.onboarding.submitted_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pillar 5: Discipline */}
                  <Card className="shadow-2xs border bg-card rounded-2xl hover:border-amber-500/30 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-foreground">Field Travel Discipline</h5>
                            <span className="text-[10px] text-muted-foreground">Weight: 10%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-amber-600">{myOfficer.pillars.discipline.score}</span>
                          <span className="text-xs font-bold text-muted-foreground"> / 10</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-muted-foreground">Achievement Rate</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.discipline.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-amber-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, myOfficer.pillars.discipline.percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/30 border space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Active Travel Days:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.discipline.active_days} / {myOfficer.pillars.discipline.benchmark_days} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Attendance Rate:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.discipline.attendance_pct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distance Traveled:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.discipline.total_km} KM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Odometer Compliance:</span>
                          <span className="font-bold text-foreground">{myOfficer.pillars.discipline.odometer_compliance_pct}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* SPECIALIZED ROLE TARGETS WITH CUSTOM UOM */}
              {myOfficer.pillars.orders.custom_targets && myOfficer.pillars.orders.custom_targets.length > 0 && (
                <Card className="shadow-2xs border bg-card rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-primary" />
                      <span>Role-Specific Custom Targets &amp; Quotas</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Custom metrics assigned by HR with specific Units of Measurement (UOM)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {myOfficer.pillars.orders.custom_targets.map((ct: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-muted/30 border space-y-1">
                          <div className="flex justify-between text-xs font-bold text-foreground">
                            <span className="truncate" title={ct.name}>{ct.name}</span>
                            <span className="text-primary">{ct.achievement_pct || 0}%</span>
                          </div>
                          <div className="text-sm font-bold text-foreground">
                            {formatIndianNumber(ct.actual_val || 0)}{' '}
                            <span className="text-xs font-normal text-muted-foreground">
                              / {formatIndianNumber(ct.target_val)} {ct.uom}
                            </span>
                          </div>
                          {ct.incentive_rate > 0 && (
                            <p className="text-[10px] text-emerald-600 font-semibold">
                              Reward: +₹{ct.incentive_rate} / {ct.uom}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 3. STRENGTHS & COACHING INSIGHTS */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <Card className="shadow-2xs border bg-card rounded-2xl border-emerald-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Your Key Strengths &amp; Wins</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Where you consistently excel this period</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {myOfficer.strengths.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No primary strength tags recorded for this period yet.</p>
                    ) : (
                      myOfficer.strengths.map((s, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-foreground">{s}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Coaching Tips */}
                <Card className="shadow-2xs border bg-card rounded-2xl border-amber-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Coaching Advice to Maximize Your Earnings</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Specific high-impact focus areas to raise your grade</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {myOfficer.improvements.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">All KPI pillars are performing at benchmark levels!</p>
                    ) : (
                      myOfficer.improvements.map((imp, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-foreground">{imp}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. INTERACTIVE DRILL-DOWN DOSSIER MODAL */}
      <Dialog open={!!drilldownOfficer} onOpenChange={(open) => !open && setDrilldownOfficer(null)}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 rounded-2xl">
          {drilldownOfficer && (
            <div className="space-y-5">
              <DialogHeader className="text-left space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-base">
                      #{drilldownOfficer.rank}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                        <span>{drilldownOfficer.name}</span>
                        <Badge className={cn("text-[10px] font-bold px-2 py-0.5", drilldownOfficer.badge_color)}>
                          Grade {drilldownOfficer.grade}
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        {drilldownOfficer.email} • {drilldownOfficer.territory} ({scorecardData?.date_range.label})
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-foreground">{drilldownOfficer.composite_score}</div>
                    <span className="text-[11px] font-semibold text-muted-foreground">Score out of 100</span>
                  </div>
                </div>
              </DialogHeader>

              {/* 5 Pillars In-Depth Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  <span>5-Pillar Score Evaluation Breakdown</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pillar 1 Detail */}
                  <div className="p-3 rounded-xl border bg-card space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1 text-purple-600">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Order Booking &amp; Revenue</span>
                      </span>
                      <span>{drilldownOfficer.pillars.orders.score} / 30 pts</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <p>• Sales Target: <strong>{formatIndianCurrency(drilldownOfficer.pillars.orders.target_revenue || 0)}</strong></p>
                      <p>• Gross Revenue: <strong>{formatIndianCurrency(drilldownOfficer.pillars.orders.actual_revenue)}</strong> ({drilldownOfficer.pillars.orders.fulfillment_pct}%)</p>
                      <p>• Actual Bags: <strong>{Math.round(drilldownOfficer.pillars.orders.actual_bags || 0)}</strong> / Est. Target: {Math.round(drilldownOfficer.pillars.orders.target_bags || 0)} bags</p>
                      <p>• Dealer Channel: <strong>{Math.round(drilldownOfficer.pillars.orders.actual_dealer_bags || 0)} / {Math.round(drilldownOfficer.pillars.orders.target_dealer_bags || 0)} bags</strong></p>
                      <p>• Direct / Non-Dealer: <strong>{Math.round(drilldownOfficer.pillars.orders.actual_non_dealer_bags || 0)} / {Math.round(drilldownOfficer.pillars.orders.target_non_dealer_bags || 0)} bags</strong></p>
                      <p>• Orders Booked: <strong>{drilldownOfficer.pillars.orders.order_count} orders</strong></p>
                    </div>
                  </div>

                  {/* Pillar 2 Detail */}
                  <div className="p-3 rounded-xl border bg-card space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1 text-blue-600">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Dealer Visits &amp; Beat Plan</span>
                      </span>
                      <span>{drilldownOfficer.pillars.visits.score} / 25 pts</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <p>• Total Visits: <strong>{drilldownOfficer.pillars.visits.effective_visits} counters</strong></p>
                      <p>• Beat Plan Adherence: <strong>{drilldownOfficer.pillars.visits.beat_adherence_pct}%</strong></p>
                      <p>• Geo &amp; Photo Proof Rate: <strong>{drilldownOfficer.pillars.visits.proof_compliance_pct}%</strong></p>
                      <p>• Order Strike Rate: <strong>{drilldownOfficer.pillars.visits.strike_rate_pct}%</strong></p>
                    </div>
                  </div>

                  {/* Pillar 3 Detail */}
                  <div className="p-3 rounded-xl border bg-card space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>Payment Collections</span>
                      </span>
                      <span>{drilldownOfficer.pillars.payments.score} / 20 pts</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <p>• Collected Value: <strong>{formatIndianCurrency(drilldownOfficer.pillars.payments.actual_collection)}</strong></p>
                      <p>• Target Fulfillment: <strong>{drilldownOfficer.pillars.payments.fulfillment_pct}%</strong></p>
                      <p>• Verified Receipts: <strong>{formatIndianCurrency(drilldownOfficer.pillars.payments.verified_receipts_sum)}</strong></p>
                      <p>• Payment Slips Logged: <strong>{drilldownOfficer.pillars.payments.receipt_count} receipts</strong></p>
                    </div>
                  </div>

                  {/* Pillar 4 Detail */}
                  <div className="p-3 rounded-xl border bg-card space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1 text-rose-600">
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>New Dealer Onboarding</span>
                      </span>
                      <span>{drilldownOfficer.pillars.onboarding.score} / 15 pts</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <p>• New Counters Expansion: <strong>{drilldownOfficer.pillars.onboarding.new_dealers} dealers</strong></p>
                      <p>• Document Requests Approved: <strong>{drilldownOfficer.pillars.onboarding.approved_count}</strong></p>
                      <p>• Spot Route Conversions: <strong>{drilldownOfficer.pillars.onboarding.converted_count}</strong></p>
                    </div>
                  </div>

                  {/* Pillar 5 Detail */}
                  <div className="p-3 rounded-xl border bg-card space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1 text-amber-600">
                        <Car className="w-3.5 h-3.5" />
                        <span>Field Travel Discipline &amp; Attendance</span>
                      </span>
                      <span>{drilldownOfficer.pillars.discipline.score} / 10 pts</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground grid grid-cols-2 gap-2">
                      <p>• Active Field Days: <strong>{drilldownOfficer.pillars.discipline.active_days}</strong> / {drilldownOfficer.pillars.discipline.benchmark_days} target days</p>
                      <p>• Attendance Rate: <strong>{drilldownOfficer.pillars.discipline.attendance_pct}%</strong></p>
                      <p>• Total Traveled: <strong>{drilldownOfficer.pillars.discipline.total_km} KM</strong></p>
                      <p>• Odometer Photo Compliance: <strong>{drilldownOfficer.pillars.discipline.odometer_compliance_pct}%</strong></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths & Growth Areas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Key Performance Strengths</span>
                  </h5>
                  <ul className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1 list-disc pl-4">
                    {drilldownOfficer.strengths.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                  <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Areas for Coaching &amp; Growth</span>
                  </h5>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc pl-4">
                    {drilldownOfficer.improvements.map((imp, idx) => (
                      <li key={idx}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDrilldownOfficer(null)}
                  className="w-full sm:w-auto text-xs"
                >
                  Close Dossier
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SOScorecardTab;
