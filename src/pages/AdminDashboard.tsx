import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, ShoppingCart, TrendingUp, Package, CheckCircle, XCircle, Clock, Truck, Star, Warehouse, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { Order } from '@/types';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';

const statusStyles: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-blue-100 text-blue-700',
  Dispatched: 'bg-purple-100 text-purple-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { orders, dealers, users, updateOrderStatus } = useData();
  const { toast } = useToast();
  const { can } = usePermissions();
  const [confirmOrder, setConfirmOrder] = useState<{ order: Order; action: 'Approved' | 'Cancelled'; reason?: string; action_date?: string } | null>(null);

  if (!can('view_admin_dashboard')) {
    return <Navigate to="/" replace />;
  }

  // Pipeline counts
  const pipeline = {
    Pending: orders.filter(o => o.status === 'Pending').length,
    Approved: orders.filter(o => o.status === 'Approved').length,
    Dispatched: orders.filter(o => o.status === 'Dispatched').length,
    Completed: orders.filter(o => o.status === 'Completed').length,
    Cancelled: orders.filter(o => o.status === 'Cancelled').length,
  };
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const totalDealers = dealers.filter(d => d.active).length;
  const totalRevenue = orders.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.grand_total || 0), 0);
  const formattedRevenue = totalRevenue >= 100000 ? `₹${(totalRevenue / 100000).toFixed(2)}L` : `₹${(totalRevenue / 1000).toFixed(0)}K`;
  const completionRate = orders.length > 0 ? Math.round((pipeline.Completed / orders.length) * 100) : 0;

  const kpis = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: 'bg-primary/10 text-primary' },
    { label: 'Active Dealers', value: totalDealers, icon: Users, color: 'bg-success/10 text-success' },
    { label: 'Revenue', value: formattedRevenue, icon: TrendingUp, color: 'bg-accent/10 text-accent' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: Star, color: 'bg-purple-500/10 text-purple-600' },
  ];

  const pipelineItems = [
    { label: 'Pending', count: pipeline.Pending, color: '#eab308', icon: Clock },
    { label: 'Approved', count: pipeline.Approved, color: '#3b82f6', icon: CheckCircle },
    { label: 'Dispatched', count: pipeline.Dispatched, color: '#a855f7', icon: Truck },
    { label: 'Completed', count: pipeline.Completed, color: '#22c55e', icon: CheckCircle },
    { label: 'Cancelled', count: pipeline.Cancelled, color: '#f87171', icon: XCircle },
  ];

  const salesUsers = users.filter(u => u.role === 'SALES');
  const soData = salesUsers.map(u => ({
    name: (u.name || '').split(' ')[0] || 'User',
    orders: orders.filter(o => o.so_email === u.email).length,
    revenue: orders.filter(o => o.so_email === u.email && o.status === 'Completed').reduce((s, o) => s + o.grand_total, 0),
  }));

  const quickLinks = [
    { label: 'Warehouse Master', path: '/admin/warehouses', icon: Warehouse },
    { label: 'Manage Dealers', path: '/admin/dealers', icon: Users },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'BOM (Recipes)', path: '/admin/bom', icon: ClipboardList },
  ];

  const handleAction = async () => {
    if (!confirmOrder) return;
    if (confirmOrder.action === 'Cancelled') {
      if (!confirmOrder.reason?.trim()) {
        toast({ title: 'Reason Required', description: 'Please provide a reason for rejecting this order.', variant: 'destructive' });
        return;
      }
      if (!confirmOrder.action_date) {
        toast({ title: 'Date Required', description: 'Please provide the rejection date.', variant: 'destructive' });
        return;
      }
    }
    await updateOrderStatus(confirmOrder.order.order_id, confirmOrder.action, confirmOrder.reason, confirmOrder.action_date);
    toast({
      title: confirmOrder.action === 'Approved' ? '✅ Order Approved' : '❌ Order Cancelled',
      description: `${confirmOrder.order.order_id} — ${confirmOrder.order.party_name} has been ${confirmOrder.action.toLowerCase()}. Inventory team notified.`,
    });
    setConfirmOrder(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="page-header">Admin Dashboard</h1>
      <p className="page-subheader">System overview and order pipeline management</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="kpi-card">
              <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center mb-3`}><kpi.icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Order Pipeline ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">📦 Order Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {pipelineItems.map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                className="flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 relative`}
                  style={{ background: `color-mix(in srgb, ${item.color} 15%, transparent)` }}>
                  <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  {item.count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ background: item.color }}>{item.count}</span>
                  )}
                </div>
                <p className="text-xl font-bold">{item.count}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{item.label}</p>
              </motion.div>
            ))}
          </div>
          {orders.length > 0 && (
            <>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {pipelineItems.map(item => item.count > 0 && (
                  <div key={item.label} className="h-full transition-all rounded-full"
                    style={{ width: `${(item.count / orders.length) * 100}%`, background: item.color }}
                    title={`${item.label}: ${item.count}`} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Pipeline Progress</span>
                <span>{orders.length} total orders · {completionRate}% completed</span>
              </div>
            </>
          )}
          {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>}
        </CardContent>
      </Card>

      {/* Pending Approval Queue */}
      {pendingOrders.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Pending Approval ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingOrders.map(o => (
              <div key={o.order_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{o.order_id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyles[o.status]}`}>{o.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{o.party_name} · SO: {o.so_email}</p>
                  <p className="text-xs text-muted-foreground">{o.items.map(i => `${i.product} ×${i.qty}`).join(' | ')}</p>
                  {o.narration && (
                    <p className="text-[11px] text-yellow-700 bg-yellow-500/10 px-1.5 py-0.5 rounded mt-1 w-fit border border-yellow-500/20">
                      📝 General Narration: {o.narration}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-primary mt-1">₹{o.grand_total.toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3"
                    onClick={() => setConfirmOrder({ order: o, action: 'Approved' })}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs px-3"
                    onClick={() => setConfirmOrder({ order: o, action: 'Cancelled', action_date: new Date().toISOString().split('T')[0] })}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SO Performance Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">SO Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={soData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="hsl(224, 76%, 33%)" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map(link => (
              <button key={link.path} onClick={() => navigate(link.path)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-muted transition-colors text-left">
                <link.icon className="w-5 h-5 text-primary" /><span className="font-medium text-sm">{link.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Approve / Reject Confirm Dialog */}
      <Dialog open={!!confirmOrder} onOpenChange={() => setConfirmOrder(null)}>
        <DialogContent className="max-w-md" aria-describedby="order-approval-desc">
          <DialogHeader>
            <DialogTitle>{confirmOrder?.action === 'Approved' ? '✅ Approve Order?' : '❌ Reject Order?'}</DialogTitle>
            <DialogDescription id="order-approval-desc" className="sr-only">
              Review order details, items, and total amount for {confirmOrder?.order.order_id} before finalizing approval or rejection.
            </DialogDescription>
          </DialogHeader>
          {confirmOrder && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-semibold text-foreground">{confirmOrder.order.order_id}</span></p>
              <p>Party: {confirmOrder.order.party_name}</p>
              <p>SO: {confirmOrder.order.so_email}</p>
              <p>Amount: <span className="font-bold text-primary">₹{confirmOrder.order.grand_total.toLocaleString()}</span></p>
              
              {confirmOrder.order.narration && (
                <div className="mt-2 p-2 bg-secondary/50 rounded-lg text-foreground text-xs">
                  <span className="font-semibold">📝 General Narration:</span> {confirmOrder.order.narration}
                </div>
              )}

              <div className="mt-3 border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-border text-[11px]">
                  <thead className="bg-secondary/50 text-foreground font-medium">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Product</th>
                      <th className="px-2 py-1.5 text-center">Qty</th>
                      <th className="px-2 py-1.5 text-right">Rate</th>
                      <th className="px-2 py-1.5 text-left">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {confirmOrder.order.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5 font-medium text-foreground">{it.product}</td>
                        <td className="px-2 py-1.5 text-center">{it.qty}</td>
                        <td className="px-2 py-1.5 text-right">₹{(it.price || 0).toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[100px]" title={it.item_remark}>{it.item_remark || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {confirmOrder.action === 'Cancelled' && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs font-medium block mb-1">Rejection Date <span className="text-red-500">*</span></label>
                    <input type="date" value={confirmOrder.action_date || ''} onChange={e => setConfirmOrder({...confirmOrder, action_date: e.target.value})} className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background" />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Rejection Reason <span className="text-red-500">*</span></label>
                    <textarea value={confirmOrder.reason || ''} onChange={e => setConfirmOrder({...confirmOrder, reason: e.target.value})} placeholder="Why is this order being rejected?" className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background min-h-[60px]" />
                  </div>
                </div>
              )}

              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                {confirmOrder.action === 'Approved'
                  ? 'This will move the order to the Inventory queue for dispatch.'
                  : 'This will cancel the order and notify the Sales Officer.'}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 mt-3 flex-col sm:flex-row">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setConfirmOrder(null)} className="flex-1">Cancel</Button>
              {confirmOrder && (
                <PDFGenerator 
                  type="SALES_ORDER" 
                  data={{
                    orderNo: confirmOrder.order.order_id,
                    date: new Date(confirmOrder.order.created_at || new Date()).toLocaleDateString('en-IN'),
                    party: {
                      name: confirmOrder.order.party_name || '—',
                      address: confirmOrder.order.address || '—',
                      contact: confirmOrder.order.contact || '—',
                      gst: confirmOrder.order.gst || '—',
                    },
                    items: confirmOrder.order.items.map((it: any) => ({
                      product_name: it.product,
                      qty: it.qty,
                      unit: it.unit || 'Bags',
                      rate: it.price || it.rate || 0,
                      total: it.total || (it.qty * (it.price || it.rate || 0)),
                      remark: it.item_remark || it.remark
                    })),
                    totals: {
                      subtotal: confirmOrder.order.grand_total,
                      grandTotal: confirmOrder.order.grand_total
                    }
                  }}
                  filename={`Order_${confirmOrder.order.order_id}.pdf`}
                  buttonLabel="Preview PDF"
                />
              )}
            </div>
            <Button
              className={confirmOrder?.action === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}
              onClick={handleAction}
            >
              {confirmOrder?.action === 'Approved' ? 'Approve' : 'Reject Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
