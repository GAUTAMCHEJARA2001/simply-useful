import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Expense } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, Target, TrendingUp, Award, FileText, IndianRupee, MapPin, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

const COLORS = ['#1e40af', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

type Tab = 'overview' | 'performance' | 'visits' | 'expenses';

const HRDashboard: React.FC = () => {
  const { orders, dealers, users, visits, expenses, updateUserTarget, updateExpenseStatus } = useData();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  if (!can('view_reports')) {
    return <Navigate to="/" replace />;
  }

  const salesUsers = users.filter(u => u.role === 'SALES');
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalRevenue = completedOrders.reduce((s, o) => s + (o.grand_total ?? o.grandTotal ?? 0), 0);

  // Per-SO stats
  const soStats = salesUsers.map(u => {
    const soOrders = orders.filter(o => o.so_email === u.email);
    const soCompleted = soOrders.filter(o => o.status === 'Completed');
    const soVisits = visits.filter(v => v.so_email === u.email);
    const soExpenses = expenses.filter(e => e.so_email === u.email);
    const achieved = soCompleted.reduce((s, o) => s + (o.grand_total ?? o.grandTotal ?? 0), 0);
    const expTotal = soExpenses.reduce((s, e) => s + e.amount, 0);
    const soDealers = dealers.filter(d => d.assigned_so_email === u.email && d.active).length;
    const target = Number(u.monthly_target) || 500000;
    return {
      id: u.id,
      name: u.name || u.email.split('@')[0],
      shortName: (u.name || '').split(' ')[0] || 'SO',
      email: u.email,
      target, achieved,
      pct: Math.min(100, Math.round((achieved / target) * 100)),
      orders: soOrders.length,
      completed: soCompleted.length,
      dealers: soDealers,
      visits: soVisits.length,
      expenses: expTotal,
    };
  });

  const avgAchievement = soStats.length > 0 ? soStats.reduce((s, p) => s + p.pct, 0) / soStats.length : 0;

  // Visit trends (last 7 days)
  const visitTrend = (() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const map: Record<string, { day: string; visits: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map[key] = { day: days[d.getDay()], visits: 0 };
    }
    visits.forEach(v => { if (map[v.date]) map[v.date].visits += 1; });
    return Object.values(map);
  })();

  // Expense breakdown by category
  const expenseByCategory = expenses.reduce((acc, e) => {
    const found = acc.find(x => x.name === e.category);
    if (found) found.value += e.amount;
    else acc.push({ name: e.category, value: e.amount });
    return acc;
  }, [] as { name: string; value: number }[]);

  // SO-wise expense total for bar chart
  const expenseBySO = soStats.map(s => ({ name: s.shortName, expenses: s.expenses }));

  const TABS: { id: Tab; label: string; icon: React.FC<any> }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'performance', label: 'SO Performance', icon: Target },
    { id: 'visits', label: 'Visit Reports', icon: MapPin },
    { id: 'expenses', label: 'Expense Reports', icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">HR Dashboard</h1>
        <p className="page-subheader">Team performance, visits & expense reports</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active SOs', value: salesUsers.length.toString(), icon: Users, color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Total Revenue', value: `₹${(totalRevenue / 1000).toFixed(0)}K`, icon: IndianRupee, color: 'bg-green-500/10 text-green-600' },
          { label: 'Avg Achievement', value: `${avgAchievement.toFixed(0)}%`, icon: Target, color: 'bg-warning/10 text-warning' },
          { label: 'Total Visits', value: visits.length.toString(), icon: MapPin, color: 'bg-purple-500/10 text-purple-600' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="kpi-card">
              <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center mb-3`}><kpi.icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Target vs Achievement</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={soStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="target" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Target" />
                    <Bar dataKey="achieved" fill="#1e40af" radius={[4, 4, 0, 0]} name="Achieved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Achievement % per SO</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-2">
              {soStats.map(so => (
                <div key={so.email}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{so.shortName}</span>
                    <span className="text-muted-foreground">{so.pct}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${so.pct}%` }} />
                  </div>
                </div>
              ))}
              {soStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No SO data</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SO Performance Tab ──────────────────────────────── */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Detailed SO Report</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['SO Name', 'Email', 'Target', 'Achieved', 'Achievement %', 'Total Orders', 'Completed', 'Dealers', 'Visits', 'Expenses'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {soStats.map(so => (
                      <tr key={so.email} className="border-b border-border/50">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{so.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{so.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            ₹{so.target.toLocaleString()}
                            <button onClick={() => {
                              const newVal = prompt(`Enter new monthly target for ${so.shortName}:`, so.target.toString());
                              if (newVal && !isNaN(Number(newVal))) {
                                updateUserTarget(so.id, Number(newVal));
                              }
                            }} className="text-muted-foreground hover:text-primary transition-colors" title="Edit Target">
                              <Target className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">₹{so.achieved.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${so.pct}%` }} />
                            </div>
                            <span className={`text-xs font-medium ${so.pct >= 100 ? 'text-green-600' : so.pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{so.pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{so.orders}</td>
                        <td className="px-4 py-3 text-center">{so.completed}</td>
                        <td className="px-4 py-3 text-center">{so.dealers}</td>
                        <td className="px-4 py-3 text-center">{so.visits}</td>
                        <td className="px-4 py-3">₹{so.expenses.toLocaleString()}</td>
                      </tr>
                    ))}
                    {soStats.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Visit Reports Tab ──────────────────────────────── */}
      {activeTab === 'visits' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Daily Visit Trend (Last 7 Days)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="visits" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} name="Visits" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Visits by SO</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={soStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="visits" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Visits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent Visits Log</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    {['Date', 'SO Email', 'Dealer', 'Remarks', 'Follow-up'].map(h => <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {visits.slice().reverse().slice(0, 20).map((v, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-4 py-3 text-muted-foreground">{v.date}</td>
                        <td className="px-4 py-3 text-xs">{v.so_email}</td>
                        <td className="px-4 py-3 font-medium">{v.dealer_name}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{v.remarks}</td>
                        <td className="px-4 py-3">{v.next_followup || '—'}</td>
                      </tr>
                    ))}
                    {visits.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No visits logged yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Expense Reports Tab ─────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Expenses by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {expenseByCategory.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Expenses by SO</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBySO}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Detailed Expense Log</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    {['Date', 'SO Email', 'Category', 'Amount', 'Status', 'Receipt', 'Remarks', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {expenses.slice().reverse().slice(0, 40).map((e, i) => (
                      <tr key={e.id || i} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedExpense(e)}>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{e.date}</td>
                        <td className="px-4 py-3 text-xs">{e.so_email}</td>
                        <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{e.category}</span></td>
                        <td className="px-4 py-3 font-medium text-primary">₹{e.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                           <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                             e.status === 'APPROVED' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                             e.status === 'REJECTED' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                             "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                           }`}>
                             {e.status || 'PENDING'}
                           </span>
                        </td>
                        <td className="px-4 py-3">
                          {e.photo ? (
                            <button onClick={() => window.open(e.photo, '_blank')} className="text-xs text-primary hover:underline flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> View</button>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                           <div>{e.remarks || '—'}</div>
                           {e.reject_reason && <span className="text-xs text-red-500 block">Reason: {e.reject_reason}</span>}
                           {e.declaration && <span className="text-xs text-blue-500 block">Decl: {e.declaration}</span>}
                        </td>
                        <td className="px-4 py-3">
                           {e.status === 'PENDING' || !e.status ? (
                             <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                               <button onClick={() => updateExpenseStatus(e.id!, 'APPROVED')} className="px-1.5 py-0.5 rounded bg-green-600 text-white text-xs hover:bg-green-700">Approve</button>
                               <button onClick={() => {
                                 const r = prompt('Rejection reason:');
                                 if (r) updateExpenseStatus(e.id!, 'REJECTED', r);
                               }} className="px-1.5 py-0.5 rounded bg-red-600 text-white text-xs hover:bg-red-700">Reject</button>
                             </div>
                           ) : '—'}
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No expenses logged yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {selectedExpense && (
        <Dialog open={!!selectedExpense} onOpenChange={(open) => { if (!open) setSelectedExpense(null); }}>
          <DialogContent className="max-w-md" aria-describedby="expense-details-desc">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
              <DialogDescription id="expense-details-desc" className="sr-only">
                Review specific expense details, receipt photos, and official declarations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
               <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Officer</p><p className="font-medium text-xs truncate">{selectedExpense.so_email}</p></div>
                  <div><p className="text-muted-foreground text-xs">Date</p><p className="font-medium">{selectedExpense.date}</p></div>
                  <div><p className="text-muted-foreground text-xs">Category</p><p className="font-medium px-1.5 py-0.5 rounded bg-secondary text-xs inline-block mt-0.5">{selectedExpense.category}</p></div>
                  <div><p className="text-muted-foreground text-xs">Amount</p><p className="font-bold text-primary">₹{selectedExpense.amount.toLocaleString()}</p></div>
               </div>
               
               <div className="text-sm">
                  <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium border inline-block ${
                    selectedExpense.status === 'APPROVED' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                    selectedExpense.status === 'REJECTED' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                    "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  }`}>
                    {selectedExpense.status || 'PENDING'}
                  </span>
               </div>

               {selectedExpense.remarks && <div className="text-sm"><p className="text-muted-foreground text-xs">Remarks</p><p className="text-foreground">{selectedExpense.remarks}</p></div>}
               {selectedExpense.declaration && <div className="text-sm bg-blue-500/5 p-2 rounded border border-blue-100"><p className="text-blue-600 font-semibold text-xs">Owner Declaration</p><p className="text-blue-600">{selectedExpense.declaration}</p></div>}
               {selectedExpense.reject_reason && <div className="text-sm bg-destructive/5 p-2 rounded border border-destructive/20"><p className="text-destructive font-semibold text-xs">Rejection Reason</p><p className="text-destructive">{selectedExpense.reject_reason}</p></div>}

               {selectedExpense.photo && (
                 <div>
                   <p className="text-sm text-muted-foreground mb-1">Receipt / Photo</p>
                   <div className="border rounded-lg overflow-hidden w-full aspect-video relative group cursor-pointer bg-black/5 flex items-center justify-center" onClick={() => window.open(selectedExpense.photo, '_blank')}>
                      <img src={selectedExpense.photo} alt="Receipt" className="max-h-full max-w-full object-contain" />
                   </div>
                 </div>
               )}
            </div>

            {selectedExpense.status === 'PENDING' && (
              <div className="flex gap-2 mt-2">
                 <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => { updateExpenseStatus(selectedExpense.id!, 'APPROVED'); setSelectedExpense(null); }}>Approve</Button>
                 <Button variant="destructive" className="w-full" onClick={() => {
                   const r = prompt('Rejection reason:');
                   if (r) { updateExpenseStatus(selectedExpense.id!, 'REJECTED', r); setSelectedExpense(null); }
                 }}>Reject</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default HRDashboard;
