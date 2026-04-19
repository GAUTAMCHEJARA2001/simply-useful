import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';
import { ShoppingCart, TrendingUp, Clock, Users, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SafeDataView } from '@/components/SafeDataView';


const CHART_COLORS = ['hsl(224, 76%, 33%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const SalesDashboard: React.FC = () => {
  const { user } = useAuth();
  const { orders, dealers, loading, error, refreshAll } = useData();

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
  const myOrders = orders;
  const myDealers = isSalesOnly ? dealers.filter(d => (d.assigned_so_email || '').toLowerCase() === (user?.email || '').toLowerCase() && d.active) : dealers.filter(d => d.active);
  const pendingOrders = myOrders.filter(o => o.status === 'Pending');
    const productCounts = new Map<string, number>();
    myOrders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const current = productCounts.get(item.product_name) || 0;
        productCounts.set(item.product_name, current + (Number(item.qty) || 0));
      });
    });

    const productMixData = Array.from(productCounts.entries()).map(([name, value]) => ({ name, value }));

    const kpis = [
      {
        label: 'Revenue',
        value: `₹${(myOrders.reduce((sum, order) => {
          const orderTotal = Number(order.grand_total) || (order.items || []).reduce((iSum: number, item: any) => iSum + ((Number(item.qty) || 0) * (Number(item.rate) || 0)), 0);
          return sum + (orderTotal || 0);
        }, 0) / 1000).toFixed(1)}K`,
        subtext: 'Monthly actuals',
        icon: IndianRupee,
        trend: '+12.5%',
        trendUp: true,
      },
      {
        label: 'Total Orders',
        value: myOrders.length.toString(),
        subtext: 'Across all dealers',
        icon: ShoppingCart,
        trend: '+3',
        trendUp: true,
      },
      { label: 'Pending Orders', value: pendingOrders.length.toString(), subtext: 'Awaiting approval', icon: Clock, trend: pendingOrders.length > 2 ? 'High' : 'Normal', trendUp: false },
      { label: 'Active Dealers', value: myDealers.length.toString(), subtext: 'Assigned to you', icon: Users },
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
      if (map[o.date]) {
        map[o.date].orders += 1;
        map[o.date].amount += o.grand_total;
      }
    });
    return Object.values(map);
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Sales Dashboard</h1>
          <p className="page-subheader">Welcome back, {user?.name || 'Sales Officer'}</p>
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
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.subtext}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Weekly Orders</CardTitle></CardHeader>
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
          <CardHeader className="pb-2"><CardTitle className="text-base">Product Mix</CardTitle></CardHeader>
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

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <SafeDataView
            data={myOrders}
            isLoading={loading}
            error={error}
            onRetry={refreshAll}
            emptyMessage="No recent orders found"
            className="overflow-x-auto"
            renderItem={() => (
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
                    <tr key={order.order_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{order.order_id}</td>
                      <td className="px-4 py-3">{order.party_name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{order.date}</td>
                      <td className="px-4 py-3 text-right font-medium">₹{order.grand_total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          />
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
  };
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>{status}</span>;
};

export default SalesDashboard;
