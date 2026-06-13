import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, ShoppingCart, TrendingUp, CheckCircle, XCircle, Clock, Truck, Star, Warehouse, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { Order } from '@/types';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';
import { reportService } from '@/api/services/report.service';
import { useQuery } from '@tanstack/react-query';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusStyles: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-blue-100 text-blue-700',
  Dispatched: 'bg-purple-100 text-purple-700',
  Completed: 'bg-green-100 text-green-700',
  Returned: 'bg-orange-100 text-orange-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { orders, dealers, users, warehouses, updateOrderStatus, updateOrderItems } = useData();
  const { toast } = useToast();

  const salesOfficers = useMemo(() => {
    return (users || []).filter(u => (u.role === 'SALES' || u.role === 'SALES_OFFICER') && u.active);
  }, [users]);

  const handleAssignWarehouse = async (orderId: string, warehouseId: string) => {
    try {
      const wh = warehouses.find(w => String(w.id) === warehouseId);
      await updateOrderItems(orderId, { assignedWarehouse: Number(warehouseId) });
      toast({
        title: 'Warehouse Assigned',
        description: `Order ${orderId} allocated to warehouse "${wh?.name || warehouseId}".`,
      });
    } catch (err: any) {
      toast({
        title: 'Allocation Failed',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleReassignSO = async (orderId: string, soEmail: string) => {
    try {
      await updateOrderItems(orderId, { soEmail });
      toast({
        title: 'Sales Officer Reassigned',
        description: `Order ${orderId} is now assigned to ${soEmail}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Reassignment Failed',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };
  const { can } = usePermissions();
  const { filterBySelectedFY, fyLabel, selectedFY } = useFinancialYear();
  const [confirmOrder, setConfirmOrder] = useState<{ order: Order; action: 'Approved' | 'Cancelled'; reason?: string; action_date?: string } | null>(null);

  if (!can('view_admin_dashboard')) {
    return <Navigate to="/" replace />;
  }

  // Fetch real KPIs from backend
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard-kpis', selectedFY],
    queryFn: () => reportService.dashboard().then(res => res.data.data),
    staleTime: 30000,
  });

  // Filter orders to selected FY
  const fyOrders = filterBySelectedFY(orders, o => o.date || (o as any).createdAt);

  // Pipeline counts
  const pipeline = {
    Pending: fyOrders.filter(o => o.status === 'Pending').length,
    Approved: fyOrders.filter(o => o.status === 'Approved').length,
    Dispatched: fyOrders.filter(o => o.status === 'Dispatched').length,
    Completed: fyOrders.filter(o => o.status === 'Completed').length,
    Returned: fyOrders.filter(o => o.status === 'Returned').length,
    Cancelled: fyOrders.filter(o => o.status === 'Cancelled').length,
  };
  const pendingOrders = fyOrders.filter(o => o.status === 'Pending');
  const totalDealers = dealers.filter(d => d.active).length;
  const totalRevenue = dashboardData?.revenue || 0;
  const formattedRevenue = totalRevenue >= 100000 ? `₹${(totalRevenue / 100000).toFixed(2)}L` : `₹${(totalRevenue / 1000).toFixed(0)}K`;
  const completionRate = fyOrders.length > 0 ? Math.round((pipeline.Completed / fyOrders.length) * 100) : 0;

  const kpis = [
    { label: 'Total Orders', value: dashboardData?.orders || fyOrders.length, icon: ShoppingCart, color: 'bg-primary/10 text-primary' },
    { label: 'Active Dealers', value: dashboardData?.dealers || totalDealers, icon: Users, color: 'bg-success/10 text-success' },
    { label: 'Revenue', value: formattedRevenue, icon: TrendingUp, color: 'bg-accent/10 text-accent' },
    { label: 'Total Products', value: dashboardData?.products || 0, icon: Warehouse, color: 'bg-purple-500/10 text-purple-600' },
  ];

  const pipelineItems = [
    { label: 'Pending', count: pipeline.Pending, color: '#eab308', icon: Clock },
    { label: 'Approved', count: pipeline.Approved, color: '#3b82f6', icon: CheckCircle },
    { label: 'Dispatched', count: pipeline.Dispatched, color: '#a855f7', icon: Truck },
    { label: 'Completed', count: pipeline.Completed, color: '#22c55e', icon: CheckCircle },
    { label: 'Returned', count: pipeline.Returned, color: '#f97316', icon: Truck },
    { label: 'Cancelled', count: pipeline.Cancelled, color: '#f87171', icon: XCircle },
  ];

  const salesUsers = users.filter(u => u.role === 'SALES');
  const soData = salesUsers.map(u => ({
    name: (u.name || '').split(' ')[0] || 'User',
    orders: fyOrders.filter(o => (o.soEmail || o.so_email) === u.email).length,
    revenue: fyOrders.filter(o => (o.soEmail || o.so_email) === u.email && o.status === 'Completed').reduce((s, o) => s + (o.grandTotal ?? o.grand_total ?? 0), 0),
  }));

  const quickLinks = [
    { label: 'Warehouse List', path: '/admin/warehouses', icon: Warehouse },
    { label: 'Manage Shops', path: '/admin/dealers', icon: Users },
    { label: 'Manage Staff', path: '/admin/users', icon: Users },
    { label: 'Product Recipes', path: '/admin/bom', icon: ClipboardList },
  ];

  const handleAction = async () => {
    if (!confirmOrder) return;
    const orderId = confirmOrder.order.orderId || confirmOrder.order.order_id || confirmOrder.order.id || '';
    const partyName = confirmOrder.order.partyName || confirmOrder.order.party_name || 'Party';
    
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
    await updateOrderStatus(orderId, confirmOrder.action, confirmOrder.reason, confirmOrder.action_date);
    toast({
      title: confirmOrder.action === 'Approved' ? '✅ Order Approved' : '❌ Order Cancelled',
      description: `${orderId} — ${partyName} has been ${confirmOrder.action.toLowerCase()}. Inventory team notified.`,
    });
    setConfirmOrder(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="page-header">Admin Overview</h1>
      <p className="page-subheader">See all orders and manage the system &middot; <span className="font-semibold text-primary">{fyLabel}</span></p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="kpi-card">
              <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center mb-3`}><kpi.icon className="w-5 h-5" /></div>
              <p className="text-xl xl:text-2xl font-bold text-foreground truncate" title={String(kpi.value)}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate" title={kpi.label}>{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Order Pipeline ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">📦 Order Flow</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-3 mb-4">
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
          {fyOrders.length > 0 && (
            <>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {pipelineItems.map(item => item.count > 0 && (
                  <div key={item.label} className="h-full transition-all rounded-full"
                    style={{ width: `${(item.count / fyOrders.length) * 100}%`, background: item.color }}
                    title={`${item.label}: ${item.count}`} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Pipeline Progress</span>
                <span>{fyOrders.length} total orders · {completionRate}% completed</span>
              </div>
            </>
          )}
          {fyOrders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>}
        </CardContent>
      </Card>

      {/* Pending Approval Queue */}
      {pendingOrders.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Orders Waiting for Approval ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingOrders.map(o => {
              const orderId = o.orderId || o.order_id || o.id || 'Unknown ID';
              const partyName = o.partyName || o.party_name || 'Party';
              const soEmail = o.soEmail || o.so_email || 'SO';
              const grandTotal = o.grandTotal ?? o.grand_total ?? 0;
              const displayStatus = o.status || 'Pending';
              
              return (
                <div key={orderId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{orderId}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyles[displayStatus]}`}>{displayStatus}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{partyName}</span>
                      <span>·</span>
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-semibold text-foreground/80 text-[11px]">SO:</span>
                        {(() => {
                          const activeSO = [...salesOfficers];
                          if (soEmail && !activeSO.some(u => u.email.toLowerCase() === soEmail.toLowerCase())) {
                            const match = (users || []).find(u => u.email.toLowerCase() === soEmail.toLowerCase());
                            if (match) {
                              activeSO.push(match);
                            } else {
                              activeSO.push({ id: soEmail, email: soEmail, name: soEmail, role: 'SALES', active: false } as any);
                            }
                          }
                          return (
                            <Select 
                              value={soEmail || ''} 
                              onValueChange={(val) => handleReassignSO(orderId, val)}
                            >
                              <SelectTrigger className="h-7 py-0 px-2 text-[11px] min-w-[140px] bg-background border border-border/85 rounded-md">
                                <SelectValue placeholder="Select SO" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeSO.map(so => (
                                  <SelectItem key={so.id} value={so.email} className="text-xs">
                                    {so.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{o.items.map(i => `${i.productName || (typeof i.product === 'object' && i.product ? (i.product as any).name || (i.product as any).productName : i.product)} ×${i.qty}`).join(' | ')}</p>
                    {o.narration && (
                      <p className="text-[11px] text-yellow-700 bg-yellow-500/10 px-1.5 py-0.5 rounded mt-1 w-fit border border-yellow-500/20">
                        📝 General Narration: {o.narration}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-primary mt-1">₹{grandTotal.toLocaleString()}</p>
                    {/* Allocate Warehouse */}
                    <div className="inline-flex items-center gap-1.5 mt-1.5">
                      <span className="font-semibold text-foreground/80 text-[11px]">🏭 Warehouse:</span>
                      {warehouses.length > 0 ? (
                        <Select
                          value={String((o as any).assignedWarehouse || '')}
                          onValueChange={(val) => handleAssignWarehouse(orderId, val)}
                        >
                          <SelectTrigger className="h-7 py-0 px-2 text-[11px] min-w-[140px] bg-background border border-border/85 rounded-md">
                            <SelectValue placeholder="Assign Warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map(wh => (
                              <SelectItem key={wh.id} value={String(wh.id)} className="text-xs">
                                {wh.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">No warehouses</span>
                      )}
                    </div>
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
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SO Performance Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sales Staff Performance</CardTitle></CardHeader>
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
          <CardHeader className="pb-2"><CardTitle className="text-base">Quick Shortcuts</CardTitle></CardHeader>
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
              Review order details, items, and total amount before finalizing approval or rejection.
            </DialogDescription>
          </DialogHeader>
          {confirmOrder && (() => {
            const orderId = confirmOrder.order.orderId || confirmOrder.order.order_id || confirmOrder.order.id || '';
            const partyName = confirmOrder.order.partyName || confirmOrder.order.party_name || 'Party';
            const soEmail = confirmOrder.order.soEmail || confirmOrder.order.so_email || 'SO';
            const grandTotal = confirmOrder.order.grandTotal ?? confirmOrder.order.grand_total ?? 0;
            
            return (
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-semibold text-foreground">{orderId}</span></p>
                <p>Party: {partyName}</p>
                <p>SO: {soEmail}</p>
                <p>Amount: <span className="font-bold text-primary">₹{grandTotal.toLocaleString()}</span></p>
                
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
                          <td className="px-2 py-1.5 font-medium text-foreground">{it.productName || (typeof it.product === 'object' && it.product ? (it.product as any).name || (it.product as any).productName : it.product)}</td>
                          <td className="px-2 py-1.5 text-center">{it.qty}</td>
                          <td className="px-2 py-1.5 text-right">₹{(it.price || 0).toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[100px]" title={it.itemRemark || it.item_remark}>{it.itemRemark || it.item_remark || '-'}</td>
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
            );
          })()}
          <DialogFooter className="gap-2 mt-3 flex-col sm:flex-row">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setConfirmOrder(null)} className="flex-1">Cancel</Button>
              {confirmOrder && (() => {
                const orderId = confirmOrder.order.orderId || confirmOrder.order.order_id || confirmOrder.order.id || '';
                const partyName = confirmOrder.order.partyName || confirmOrder.order.party_name || '—';
                const grandTotal = confirmOrder.order.grandTotal ?? confirmOrder.order.grand_total ?? 0;
                
                return (
                  <PDFGenerator 
                    type="SALES_ORDER" 
                    data={{
                      orderNo: orderId,
                      date: new Date(confirmOrder.order.createdAt || new Date()).toLocaleDateString('en-IN'),
                      party: {
                        name: partyName,
                        address: confirmOrder.order.address || '—',
                        contact: confirmOrder.order.contact || '—',
                        gst: confirmOrder.order.gst || '—',
                      },
                      items: confirmOrder.order.items.map((it: any) => ({
                        product_name: it.productName || it.product_name || (typeof it.product === 'object' && it.product ? (it.product as any).name || (it.product as any).productName : it.product),
                        qty: it.qty,
                        unit: it.unit || 'Bags',
                        rate: it.price || it.rate || 0,
                        total: it.total || (it.qty * (it.price || it.rate || 0)),
                        remark: it.item_remark || it.remark
                      })),
                      totals: {
                        subtotal: grandTotal,
                        grandTotal: grandTotal
                      }
                    }}
                    filename={`Order_${orderId}.pdf`}
                    buttonLabel="Preview PDF"
                  />
                );
              })()}
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
