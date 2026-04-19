import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Package, Clock, CheckCircle, AlertTriangle, Truck, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate, Link } from 'react-router-dom';
import { OrderStatus } from '@/types';

const statusStyles: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Approved: 'bg-blue-100 text-blue-700 border-blue-200',
  Dispatched: 'bg-purple-100 text-purple-700 border-purple-200',
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const InventoryDashboard: React.FC = () => {
  const { user } = useAuth();
  const { orders, products, updateOrderStatus, loading: dataLoading } = useData();
  const { can } = usePermissions();
  const { toast } = useToast();
  const [confirmOrder, setConfirmOrder] = useState<{ id: string; action: OrderStatus; reason?: string; action_date?: string } | null>(null);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!can('view_inventory_dashboard')) {
    return <Navigate to="/" replace />;
  }

  const isInventory = user?.role === 'INVENTORY' || user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  const approvedOrders = orders.filter(o => o.status === 'Approved');
  const dispatchedOrders = orders.filter(o => o.status === 'Dispatched');
  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Approved');
  const completedOrders = orders.filter(o => o.status === 'Completed');

  const productDemand = orders
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Completed')
    .flatMap(o => o.items)
    .reduce((acc, item) => {
      const e = acc.find(a => a.product === item.product);
      if (e) { e.qty += item.qty; e.orders++; }
      else acc.push({ product: item.product, qty: item.qty, orders: 1 });
      return acc;
    }, [] as { product: string; qty: number; orders: number }[])
    .sort((a, b) => b.qty - a.qty);

  const handleAction = async () => {
    if (!confirmOrder) return;
    if (confirmOrder.action === 'Returned' && !confirmOrder.reason?.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a return reason.', variant: 'destructive' });
      return;
    }
    if ((confirmOrder.action === 'Dispatched' || confirmOrder.action === 'Returned') && !confirmOrder.action_date) {
      toast({ title: 'Date required', description: `Please select a ${confirmOrder.action === 'Dispatched' ? 'dispatch' : 'return'} date.`, variant: 'destructive' });
      return;
    }
    await updateOrderStatus(confirmOrder.id, confirmOrder.action, confirmOrder.reason, confirmOrder.action_date);
    const label = confirmOrder.action === 'Dispatched' ? 'dispatched' : confirmOrder.action === 'Returned' ? 'returned' : 'completed';
    toast({
      title: `Order ${label}`,
      description: `Order ${confirmOrder.id} marked as ${confirmOrder.action}. SO and Admin have been notified in the system.`,
    });
    setConfirmOrder(null);
  };

  const actionLabel = (status: string) => {
    if (status === 'Approved') return [{ next: 'Dispatched' as OrderStatus, label: 'Mark Dispatched', icon: Truck, color: 'bg-purple-600 hover:bg-purple-700 text-white' }];
    if (status === 'Dispatched') return [
      { next: 'Completed' as OrderStatus, label: 'Mark Completed', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white' },
      { next: 'Returned' as OrderStatus, label: 'Return Order', icon: AlertTriangle, color: 'bg-red-600 hover:bg-red-700 text-white' }
    ];
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Inventory Dashboard</h1>
          <p className="page-subheader">Stock management &amp; order fulfillment</p>
        </div>
        <Link to="/inventory/manage">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Package className="w-4 h-4" /> Inventory Management →
          </button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ready to Dispatch', value: approvedOrders.length, icon: ShoppingBag, color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Dispatched', value: dispatchedOrders.length, icon: Truck, color: 'bg-purple-500/10 text-purple-600' },
          { label: 'Completed', value: completedOrders.length, icon: CheckCircle, color: 'bg-success/10 text-success' },
          { label: 'Total Products', value: products.length, icon: Package, color: 'bg-primary/10 text-primary' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product Demand Table */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Product Demand (Active Orders)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Product</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Qty Needed</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Orders</th>
              </tr></thead>
              <tbody>
                {productDemand.map(p => (
                  <tr key={p.product} className="border-b border-border/50">
                    <td className="px-4 py-3 font-medium">{p.product}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{p.qty}</td>
                    <td className="px-4 py-3 text-right">{p.orders}</td>
                  </tr>
                ))}
                {productDemand.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No active orders</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Orders Queue with Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Order Fulfillment Queue
              {approvedOrders.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{approvedOrders.length} ready</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingOrders.length === 0 && dispatchedOrders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No orders to fulfill</p>
            )}
            {[...pendingOrders, ...dispatchedOrders].map(o => {
              const action = actionLabel(o.status);
              return (
                <div key={o.order_id} className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{o.order_id}</p>
                      <p className="text-xs text-muted-foreground">{o.party_name} · {o.date}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{o.items.map(i => `${i.product} ×${i.qty}`).join(', ')}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-bold">₹{o.grand_total.toLocaleString()}</p>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusStyles[o.status]}`}>{o.status}</span>
                    </div>
                  </div>
                  {isInventory && action && (
                    <div className="flex gap-2 w-full mt-1">
                      {action.map((a: any) => (
                        <button
                          key={a.next}
                          onClick={() => setConfirmOrder({ id: o.order_id, action: a.next, action_date: new Date().toISOString().split('T')[0] })}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${a.color}`}
                        >
                          <a.icon className="w-3.5 h-3.5" /> {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {o.status === 'Pending' && (
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Waiting for Admin approval</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmOrder} onOpenChange={() => setConfirmOrder(null)}>
        <DialogContent className="max-w-sm" aria-describedby="order-fulfillment-desc">
          <DialogHeader>
            <DialogTitle>
              {confirmOrder?.action === 'Dispatched' ? '🚚 Confirm Dispatch' : confirmOrder?.action === 'Returned' ? '⚠️ Confirm Return' : '✅ Confirm Completion'}
            </DialogTitle>
            <DialogDescription id="order-fulfillment-desc" className="sr-only">
              Confirm status change for order {confirmOrder?.id}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {confirmOrder?.action === 'Dispatched'
                ? `Mark order ${confirmOrder?.id} as DISPATCHED? This will notify the Sales Officer and Admin.`
                : confirmOrder?.action === 'Returned'
                ? `Return order ${confirmOrder?.id}? Please provide a reason below.`
                : `Mark order ${confirmOrder?.id} as COMPLETED? This confirms delivery and updates revenue.`}
            </p>

            {(confirmOrder?.action === 'Dispatched' || confirmOrder?.action === 'Returned') && (
              <div>
                <label className="text-sm font-medium block mb-1.5">{confirmOrder.action === 'Dispatched' ? 'Dispatch Date' : 'Return Date'}</label>
                <input 
                  type="date"
                  value={confirmOrder.action_date || ''}
                  onChange={e => setConfirmOrder({ ...confirmOrder, action_date: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background mb-3"
                />
              </div>
            )}

            {confirmOrder?.action === 'Returned' && (
              <div>
                <label className="text-sm font-medium block mb-1.5">Return Reason</label>
                <textarea 
                  value={confirmOrder.reason || ''} 
                  onChange={e => setConfirmOrder({ ...confirmOrder, reason: e.target.value })}
                  placeholder="Required: Reason for order return..."
                  className="w-full text-sm border border-border rounded-lg p-2 bg-background min-h-[80px]"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmOrder(null)}>Cancel</Button>
            <Button
              className={confirmOrder?.action === 'Dispatched' ? 'bg-purple-600 hover:bg-purple-700' : confirmOrder?.action === 'Returned' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
              onClick={handleAction}
            >
              {confirmOrder?.action === 'Dispatched' ? 'Confirm Dispatch' : confirmOrder?.action === 'Returned' ? 'Confirm Return' : 'Confirm Completion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryDashboard;
