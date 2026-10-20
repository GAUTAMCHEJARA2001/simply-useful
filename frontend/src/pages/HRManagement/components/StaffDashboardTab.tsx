import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHREmployees, useHRUsers } from '@/hooks/hr/useHR';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/client';
import { travelService } from '@/api/services/travel.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Clock,
  Gauge,
  Receipt,
  FileBarChart,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Plus,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  UserCheck,
  Building2,
  Award,
  Wallet
} from 'lucide-react';

export const StaffDashboardTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: employees = [], isLoading: empLoading } = useHREmployees();
  const { data: users = [] } = useHRUsers();

  const [travelLogs, setTravelLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // User lookup map for names and emails
  const userMap = useMemo(() => {
    const map: Record<string, { name: string; email: string }> = {};
    users.forEach((u: any) => {
      if (u.id) map[u.id] = { name: u.name || u.email, email: u.email || '' };
      if (u.email) map[u.email.toLowerCase()] = { name: u.name || u.email, email: u.email };
    });
    return map;
  }, [users]);

  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoadingStats(true);
        const [travelRes, expRes] = await Promise.allSettled([
          travelService.getHRLogs({ month: currentMonth }),
          api.get('/expenses/'),
        ]);

        if (travelRes.status === 'fulfilled' && travelRes.value.data?.data) {
          setTravelLogs(travelRes.value.data.data);
        }
        if (expRes.status === 'fulfilled' && expRes.value.data?.data) {
          setExpenses(expRes.value.data.data);
        }
      } catch (err) {
        console.error('Failed to load HR dashboard overview data:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, [currentMonth]);

  // Employee Statistics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e: any) => e.active !== false).length;
  const fixedCount = employees.filter((e: any) => e.employee_type === 'FIXED').length;
  const variableCount = employees.filter((e: any) => e.employee_type === 'VARIABLE').length;

  // Department distribution
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((e: any) => {
      const dept = (e.department || 'OTHER').toUpperCase();
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [employees]);

  // Travel Stats
  const pendingTravelLogs = travelLogs.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const approvedTravelLogs = travelLogs.filter(t => t.status === 'APPROVED');
  const totalKmApproved = approvedTravelLogs.reduce((acc, t) => acc + (Number(t.approved_km ?? t.total_km) || 0), 0);

  // Expense Stats
  const pendingExpenses = expenses.filter(e => e.status === 'PENDING');
  const approvedExpenses = expenses.filter(e => e.status === 'APPROVED');
  const pendingExpenseAmount = pendingExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const approvedExpenseAmount = approvedExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* ── Top Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20 backdrop-blur-xs">
                Staff & HR Operations Suite
              </span>
              <span className="text-xs text-blue-200">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Staff Operations & Workforce Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mt-1">
              Real-time monitoring of team roster, field travel verifications, staff expense claims, attendance records, and monthly payroll processing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => navigate('/hr/manage?tab=travel')}
              className="bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-md text-xs h-9"
            >
              <Plus className="w-4 h-4 mr-1.5 text-blue-700" /> + Add Travel Log (Manual)
            </Button>
            <Button
              onClick={() => navigate('/hr/manage?tab=payroll')}
              className="bg-purple-500/30 hover:bg-purple-500/40 text-white border border-white/30 font-semibold backdrop-blur-xs text-xs h-9"
            >
              <FileBarChart className="w-4 h-4 mr-1.5" /> View Payroll & Slips
            </Button>
          </div>
        </div>

        {/* Decorative backdrop elements */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-12 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <Card className="hover:shadow-md transition-shadow border-blue-100 dark:border-blue-950/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" /> Total Active Staff
              </span>
              <div className="text-2xl font-black text-foreground">
                {empLoading ? '...' : activeEmployees}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  / {totalEmployees} registered
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  {fixedCount} Fixed
                </Badge>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-purple-50 text-purple-700 border-purple-200">
                  {variableCount} Variable
                </Badge>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Travel Approvals */}
        <Card className="hover:shadow-md transition-shadow border-amber-100 dark:border-amber-950/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-600" /> Field Travel & KM
              </span>
              <div className="text-2xl font-black text-foreground flex items-baseline gap-1.5">
                <span>{pendingTravelLogs.length}</span>
                <span className="text-xs font-semibold text-amber-600">Pending Review</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{totalKmApproved.toFixed(1)} KM</span> verified this month
              </div>
            </div>
            <div 
              onClick={() => navigate('/hr/manage?tab=travel')}
              className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0 cursor-pointer hover:bg-amber-100 transition-colors"
              title="Open Travel Approvals"
            >
              <Gauge className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Expense Approvals */}
        <Card className="hover:shadow-md transition-shadow border-emerald-100 dark:border-emerald-950/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Pending Expense Claims
              </span>
              <div className="text-2xl font-black text-foreground flex items-baseline gap-1.5">
                <span>{pendingExpenses.length}</span>
                <span className="text-xs font-semibold text-emerald-600">₹{pendingExpenseAmount.toFixed(0)}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-700">₹{approvedExpenseAmount.toFixed(0)}</span> approved &amp; synced
              </div>
            </div>
            <div 
              onClick={() => navigate('/hr/manage?tab=expenses')}
              className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0 cursor-pointer hover:bg-emerald-100 transition-colors"
              title="Open Expense Approvals"
            >
              <Receipt className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Payroll Readiness */}
        <Card className="hover:shadow-md transition-shadow border-purple-100 dark:border-purple-950/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileBarChart className="w-3.5 h-3.5 text-purple-600" /> Payroll Period
              </span>
              <div className="text-2xl font-black text-foreground">
                {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold cursor-pointer hover:underline" onClick={() => navigate('/hr/manage?tab=payroll')}>
                <span>Generate &amp; Review Slips</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
            <div 
              onClick={() => navigate('/hr/manage?tab=payroll')}
              className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0 cursor-pointer hover:bg-purple-100 transition-colors"
              title="Open Payroll"
            >
              <FileBarChart className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Two Columns: Operations Overview & Navigation Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Pending Approvals & Operations Live Stream */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pending Travel & Field Reviews */}
          <Card>
            <CardHeader className="py-3.5 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-600" />
                <span>Field Travel &amp; KM Approvals Queue</span>
                {pendingTravelLogs.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold border-amber-300">
                    {pendingTravelLogs.length} Need Action
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-primary font-semibold hover:underline"
                onClick={() => navigate('/hr/manage?tab=travel')}
              >
                View All Travel Logs &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {pendingTravelLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground">All field travel logs are reviewed!</p>
                  <p className="mt-0.5">No pending odometer submissions requiring admin review.</p>
                </div>
              ) : (
                pendingTravelLogs.slice(0, 4).map((log) => {
                  const officerName = log.user_name || userMap[log.user_id]?.name || log.user_email || 'Field Officer';
                  const officerEmail = log.user_email || userMap[log.user_id]?.email || '';
                  const initial = (officerName || 'F').charAt(0).toUpperCase();

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{officerName}</span>
                            <Badge variant="outline" className="text-[9px] py-0 border-amber-300 text-amber-700 bg-amber-50">
                              {log.status}
                            </Badge>
                            {(log.is_admin_edited || log.edited_by_admin) && (
                              <Badge className="bg-purple-600 text-white text-[9px] py-0 font-bold">
                                EDITED BY ADMIN
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            {officerEmail && <span>{officerEmail}</span>}
                            {officerEmail && <span>&bull;</span>}
                            <span>Date: {log.date}</span>
                            <span>&bull;</span>
                            <span>Vehicle: {log.vehicle_type}</span>
                            <span>&bull;</span>
                            <span className="font-semibold text-foreground">
                              {log.total_km ? `${log.total_km} KM` : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-amber-300 text-amber-800 hover:bg-amber-50 font-bold"
                        onClick={() => navigate('/hr/manage?tab=travel')}
                      >
                        Review
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Pending Expense Claims */}
          <Card>
            <CardHeader className="py-3.5 px-4 flex flex-row items-center justify-between border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Employee Expense Claims Queue</span>
                {pendingExpenses.length > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-emerald-300">
                    {pendingExpenses.length} Pending
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-primary font-semibold hover:underline"
                onClick={() => navigate('/hr/manage?tab=expenses')}
              >
                View All Expense Claims &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {pendingExpenses.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground">No pending expense claims!</p>
                  <p className="mt-0.5">All employee reimbursement vouchers are up to date.</p>
                </div>
              ) : (
                pendingExpenses.slice(0, 4).map((exp) => {
                  const expEmail = exp.soEmail || exp.soemail || '';
                  const expName = exp.soName || userMap[expEmail.toLowerCase()]?.name || expEmail || 'Employee';
                  const expInitial = (expName || 'E').charAt(0).toUpperCase();

                  return (
                    <div
                      key={exp.id}
                      className="p-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                          {expInitial}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{expName}</span>
                            <Badge variant="outline" className="text-[9px] py-0 border-emerald-300 text-emerald-700 bg-emerald-50">
                              {exp.category || 'General'}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            {expEmail && expEmail !== expName && (
                              <>
                                <span>{expEmail}</span>
                                <span>&bull;</span>
                              </>
                            )}
                            <span>Date: {exp.date?.slice(0, 10)}</span>
                            <span>&bull;</span>
                            <span className="font-bold text-emerald-700">₹{Number(exp.amount || 0).toFixed(2)}</span>
                            {exp.remarks && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate max-w-[200px]">{exp.remarks}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold"
                        onClick={() => navigate('/hr/manage?tab=expenses')}
                      >
                        Verify
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column (1 Col): Team Breakdown & Quick Hub */}
        <div className="space-y-6">
          
          {/* Department Breakdown */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Department Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {Object.keys(departmentCounts).length === 0 ? (
                <div className="text-xs text-muted-foreground">No employee records configured yet.</div>
              ) : (
                Object.entries(departmentCounts).map(([dept, count]) => {
                  const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{dept}</span>
                        <span className="text-muted-foreground">{count} staff ({pct}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quick HR Navigation Hub */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Quick HR Access Hub</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {[
                { label: 'Employee Master', path: '/hr/manage?tab=employees', icon: Users, desc: 'Staff directory & KYC' },
                { label: 'Daily Attendance', path: '/hr/manage?tab=attendance', icon: Clock, desc: 'Biometric punches & shift logs' },
                { label: 'Travel & KM Approvals', path: '/hr/manage?tab=travel', icon: Gauge, desc: 'Field trip odometer reviews' },
                { label: 'Spend & Bill Approvals', path: '/hr/manage?tab=expenses', icon: Receipt, desc: 'Expense reimbursements' },
                { label: 'Payroll & Slips', path: '/hr/manage?tab=payroll', icon: FileBarChart, desc: 'Salary slip generation' },
                { label: 'Employee Ledger', path: '/hr/manage?tab=ledger', icon: Wallet, desc: 'Advance salaries & loans' },
                { label: 'Leave Management', path: '/hr/manage?tab=leaves', icon: CalendarCheck, desc: 'Applications & holidays' },
                { label: 'Official Documents', path: '/hr/manage?tab=documents', icon: Award, desc: 'Letters & ID cards' },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-muted/60 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
