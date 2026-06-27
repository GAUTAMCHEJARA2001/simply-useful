import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { ShoppingCart, Clock, Users, ArrowUpRight, ArrowDownRight, IndianRupee, Target, CalendarDays, TrendingUp, MapPin, Store, Building2, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SafeDataView } from '@/components/SafeDataView';
import { useFinancialYear } from '@/contexts/FinancialYearContext';


const CHART_COLORS = ['hsl(224, 76%, 33%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const SalesDashboard: React.FC = () => {
  const { user } = useAuth();
  const { orders, products, dealers, distributors, visits, users, loading, error, refreshAll } = useData();
  const { filterBySelectedFY, fyLabel } = useFinancialYear();

  const { can } = usePermissions();
  const navigate = useNavigate();

  if (!can('view_sales_dashboard')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <p className="text-xl font-bold text-destructive">Access Denied</p>
        <p className="text-muted-foreground text-sm">You do not have permission to view the Sales Dashboard. Contact HR/Admin.</p>
      </div>
    );
  }

  const isSalesOnly = user?.role === 'SALES';
  const currentOfficer = users.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());

  // Filter ALL orders by FY first, then scope to this user if SALES
  const fyOrders = filterBySelectedFY(orders, o => o.date || (o as any).createdAt);
  const myOrders = isSalesOnly
    ? fyOrders.filter(o => (o.soEmail || o.so_email || '').toLowerCase() === (user?.email || '').toLowerCase())
    : fyOrders;
  const myDealers = isSalesOnly ? dealers.filter(d => (d.assignedSoEmail || '').toLowerCase() === (user?.email || '').toLowerCase() && d.active) : dealers.filter(d => d.active);
  const myDistributors = isSalesOnly ? distributors.filter(d => (d.assignedSoEmail || '').toLowerCase() === (user?.email || '').toLowerCase() && d.active) : distributors.filter(d => d.active);
  const pendingOrders = myOrders.filter(o => o.status === 'Pending');
  const now = new Date();
  const monthlyTarget = Number(currentOfficer?.monthlyTarget ?? currentOfficer?.monthly_target) || 500000;
  // For target progress: use FY completed and partially returned orders
  const fyCompletedOrders = myOrders.filter(o => o.status === 'Completed' || o.status === 'Partially Returned');
  const fyAchieved = fyCompletedOrders.reduce((sum, order) => {
    let orderValue = 0;
    
    if (order.items && order.items.length > 0) {
      // Calculate net value: (qty - returnedQty) * price
      orderValue = order.items.reduce((iSum: number, item: any) => {
        const netQty = Math.max(0, (Number(item.qty) || 0) - (Number(item.returnedQty) || Number(item.returnedqty) || 0));
        return iSum + (netQty * (Number(item.price) || 0));
      }, 0);
    } else {
      // Fallback if no items array exists
      orderValue = Number(order.grandTotal) || Number(order.grand_total) || 0;
    }
    
    return sum + orderValue;
  }, 0);
  const targetProgress = monthlyTarget > 0 ? Math.min(100, Math.round((fyAchieved / monthlyTarget) * 100)) : 0;
  const remainingTarget = Math.max(monthlyTarget - fyAchieved, 0);
  const upcomingMeetings = visits
    .filter(v => {
      const soEmail = (v.soEmail || v.so_email || '').toLowerCase();
      const nextTime = v.nextVisitTime || (v as any).next_visit_time;
      const meetingDate = nextTime ? new Date(nextTime) : null;
      return (!isSalesOnly || soEmail === (user?.email || '').toLowerCase())
        && meetingDate
        && !Number.isNaN(meetingDate.getTime())
        && meetingDate >= now;
    })
    .sort((a, b) => new Date(a.nextVisitTime || (a as any).next_visit_time || '').getTime() - new Date(b.nextVisitTime || (b as any).next_visit_time || '').getTime())
    .slice(0, 5);
    const productCounts = new Map<string, number>();
    myOrders.forEach(order => {
      (order.items || []).forEach((item) => {
        const productName = item.productName || 'Unknown';
        const current = productCounts.get(productName) || 0;
        productCounts.set(productName, current + (Number(item.qty) || 0));
      });
    });

    const getOrderWeight = (order: any) => {
      return (order.items || []).reduce((sum: number, item: any) => {
        const prodId = typeof item.product === 'object' ? item.product?.id : (item.productId || item.product);
        const prod = (products || []).find(p => 
          p.id === prodId || 
          p.productCode === prodId || 
          p.product_code === prodId ||
          p.productName === prodId ||
          p.product_name === prodId ||
          p.name === prodId
        );
        if (!prod) return sum;
        const match = (prod.bagSize || prod.bag_size || '').match(/(\d+)/);
        const weight = match ? parseInt(match[1]) : 0;
        return sum + (weight * (item.qty || 0));
      }, 0);
    };

    const totalWeightSold = myOrders.reduce((sum, order) => sum + getOrderWeight(order), 0);

    const kpis = [
      {
        label: `${fyLabel} Target`,
        value: `₹${(monthlyTarget / 1000).toFixed(0)}K`,
        subtext: `${targetProgress}% achieved`,
        icon: Target,
        trend: `₹${(remainingTarget / 1000).toFixed(0)}K left`,
        trendUp: targetProgress >= 75,
      },
      {
        label: `${fyLabel} Sales`,
        value: `₹${(fyAchieved / 1000).toFixed(1)}K`,
        subtext: `${fyCompletedOrders.length} completed orders`,
        icon: TrendingUp,
        trend: targetProgress >= 100 ? 'Done' : 'In progress',
        trendUp: targetProgress >= 50,
      },
      {
        label: 'KG Sold',
        value: `${totalWeightSold.toLocaleString()} kg`,
        subtext: 'Monthly sales',
        icon: Scale,
        trend: '+12.5%',
        trendUp: true,
      },
      {
        label: 'Number of Orders',
        value: myOrders.length.toString(),
        subtext: 'From all your shops',
        icon: ShoppingCart,
        trend: '+3',
        trendUp: true,
      },
      { label: 'Waiting Orders', value: pendingOrders.length.toString(), subtext: 'Waiting for approval', icon: Clock, trend: pendingOrders.length > 2 ? 'High' : 'Normal', trendUp: false },
      { label: 'Active Shops', value: myDealers.length.toString(), subtext: 'Shops assigned to you', icon: Users },
    ];

  const productMix = Array.from(productCounts.entries()).map(([name, value]) => ({ 
    name: name || 'Unknown', 
    value: Number(value) || 0 
  })).filter(item => item.value > 0);

  const weeklyData = (() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    // Build map for the last 7 days
    const map: Record<string, { day: string; orders: number; amount: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map[key] = { day: days[d.getDay()], orders: 0, amount: 0 };
    }
    myOrders.forEach(o => {
      const d = o.date ? o.date.split('T')[0] : '';
      if (map[d]) {
        map[d].orders += 1;
        map[d].amount += (Number(o.grandTotal) || 0);
      }
    });
    return Object.values(map);
  })();

  const formatMeetingTime = (value: string | undefined) => {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not scheduled';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Sales Overview</h1>
          <p className="page-subheader">Hello {user?.name || 'Sales Officer'}, welcome back! Showing data for <span className="font-semibold text-primary">{fyLabel}</span>.</p>
        </div>
        <Button onClick={() => navigate('/sales/order')} className="action-button">
          <ShoppingCart className="w-5 h-5 mr-2" /> New Order
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="kpi-card">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><kpi.icon className="w-5 h-5 text-primary" /></div>
                {kpi.trend && (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${kpi.trendUp ? 'text-success' : 'text-warning'}`}>
                    {kpi.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{kpi.trend}
                  </span>
                )}
              </div>
              <p className="text-xl xl:text-2xl font-bold text-foreground truncate" title={String(kpi.value)}>{kpi.value}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1 truncate" title={kpi.label}>{kpi.label}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate" title={kpi.subtext}>{kpi.subtext}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Monthly Target Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <p className="text-3xl font-extrabold text-foreground">₹{fyAchieved.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">of ₹{monthlyTarget.toLocaleString('en-IN')} target · {fyLabel}</p>
              </div>
              <div className="text-sm font-bold text-primary">{targetProgress}%</div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${targetProgress}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-muted-foreground">Remaining</p>
                <p className="font-bold text-foreground mt-1">₹{remainingTarget.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-muted-foreground">Active Shops</p>
                <p className="font-bold text-foreground mt-1">{myDealers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No upcoming meetings scheduled</p>
            ) : (
              upcomingMeetings.map((visit, index) => (
                <div key={visit.id || `${visit.dealerName || visit.dealer_name}-${index}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{visit.dealerName || visit.dealer_name || 'Meeting'}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{visit.remarks || 'Follow-up visit'}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {formatMeetingTime(visit.nextVisitTime || (visit as any).next_visit_time)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Orders This Week</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(214, 32%, 91%)', fontSize: '12px' }} />
                  <Bar dataKey="amount" fill="hsl(224, 76%, 33%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Popular Products</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={productMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name.split(' ').slice(0, 2).join(' ')} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={10}>
                    {productMix.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Territory — only shown to Sales Officers */}
      {isSalesOnly && (
        <Card className="border border-border/80 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> My Territory
              <span className="ml-auto flex gap-2">
                <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-[10px] font-bold">
                  {myDealers.length} Dealers
                </Badge>
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                  {myDistributors.length} Distributors
                </Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {myDealers.length === 0 && myDistributors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No dealers or distributors assigned yet. Contact your admin.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Dealers */}
                {myDealers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Store className="w-3 h-3" /> Dealers ({myDealers.length})
                    </p>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                      {myDealers.map(d => (
                        <div key={d.dealerCode} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-3 py-2 hover:bg-muted/20 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{d.dealerName}</p>
                            <p className="text-[11px] text-muted-foreground">{d.city}</p>
                          </div>
                          <Badge variant={d.active ? 'default' : 'destructive'} className="text-[9px] shrink-0 ml-2">
                            {d.active ? 'Active' : 'Blocked'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Distributors */}
                {myDistributors.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Distributors ({myDistributors.length})
                    </p>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                      {myDistributors.map(d => (
                        <div key={d.distributorName} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-3 py-2 hover:bg-muted/20 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{d.distributorName}</p>
                            <p className="text-[11px] text-muted-foreground">{d.area}</p>
                          </div>
                          <Badge variant={d.active ? 'default' : 'destructive'} className="text-[9px] shrink-0 ml-2">
                            {d.active ? 'Active' : 'Blocked'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Last 5 Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <SafeDataView
            data={myOrders}
            isLoading={loading}
            error={error}
            onRetry={refreshAll}
            emptyMessage="No recent orders found"
            className="overflow-x-auto"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Order ID</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Party</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.slice(0, 5).map(order => (
                  <tr key={order.orderId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{order.orderId}</td>
                    <td className="px-4 py-3">{order.partyName}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{order.date}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{(() => {
                        let displayTotal = Number(order.grandTotal) || Number(order.grand_total) || 0;
                        if (order.items && order.items.length > 0) {
                          const recalculated = order.items.reduce((sum: number, item: any) => {
                            const netQty = Math.max(0, (Number(item.qty) || 0) - (Number(item.returnedQty) || Number(item.returnedqty) || 0));
                            return sum + (netQty * (Number(item.price) || 0));
                          }, 0);
                          if (recalculated > 0 && order.status !== 'Pending') displayTotal = recalculated;
                        }
                        return displayTotal.toLocaleString();
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SafeDataView>
        </CardContent>

      </Card>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    Pending: 'bg-warning/15 text-warning', Approved: 'bg-accent/15 text-accent',
    Dispatched: 'bg-primary/15 text-primary', Completed: 'bg-success/15 text-success',
    Cancelled: 'bg-destructive/15 text-destructive',
    'Partially Dispatched': 'bg-violet-500/15 text-violet-600',
    Returned: 'bg-orange-500/15 text-orange-600',
    'Partially Returned': 'bg-amber-500/15 text-amber-600'
  };
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>{status}</span>;
};

export default SalesDashboard;
