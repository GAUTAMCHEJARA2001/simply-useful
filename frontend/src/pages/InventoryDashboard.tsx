import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Package, CheckCircle, AlertTriangle, Truck, ShoppingBag } from 'lucide-react';
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

  const productDemand = (orders || [])
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Completed')
    .flatMap(o => o.items || [])
    .reduce((acc, item) => {
      // Use name if object, or the string itself
      const productName = (item.product as any)?.name || item.productName || item.product;

      const existing = acc.find(a => a.product === productName);
      if (existing) {
        existing.qty += item.qty;
        existing.orders++;
      } else {
        acc.push({
          product: productName,
          qty: item.qty,
          orders: 1
        });
      }
      return acc;
    }, [] as { product: string; qty: number; orders: number }[])
    .sort((a, b) => b.qty - a.qty);

  // Debug log as requested by user
  console.log('Product Demand Data:', productDemand);

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
    if (status === 'Approved') return [{ next: 'Dispatched' as OrderStatus, label: 'Send Out Now', icon: Truck, color: 'bg-purple-600 hover:bg-purple-700 text-white' }];
    if (status === 'Dispatched') return [
      { next: 'Completed' as OrderStatus, label: 'Finish Order', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white' },
      { next: 'Returned' as OrderStatus, label: 'Return Items', icon: AlertTriangle, color: 'bg-red-600 hover:bg-red-700 text-white' }
    ];
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Stock Room Overview</h1>
          <p className="page-subheader">Track your products and send out orders</p>
        </div>
        <Link to="/inventory/manage">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Package className="w-4 h-4" /> Manage Stock Room →
          </button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ready to Send', value: approvedOrders.length, icon: ShoppingBag, color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Sent Out', value: dispatchedOrders.length, icon: Truck, color: 'bg-purple-500/10 text-purple-600' },
          { label: 'Completed', value: completedOrders.length, icon: CheckCircle, color: 'bg-success/10 text-success' },
          { label: 'Total Items', value: products.length, icon: Package, color: 'bg-primary/10 text-primary' },
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
          <CardHeader className="pb-2"><CardTitle className="text-base">What Customers Need (Active Orders)</CardTitle></CardHeader>
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
              Orders to Pack & Send
              {approvedOrders.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{approvedOrders.length} ready</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingOrders.length === 0 && dispatchedOrders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No orders to fulfill</p>
            )}
            {[...pendingOrders, ...dispatchedOrders].map(o => {
              const action = actionLabel(o.status);
              const orderId = o.orderId || (o as any).order_id;
              return (
                <div key={orderId} className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{orderId}</p>
                      <p className="text-xs text-muted-foreground">{o.partyName || (o as any).party_name} · {o.date}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{(o.items || []).map((i: any) => `${i.productName || (typeof i.product === 'object' ? i.product.name : i.product)} ×${i.qty}`).join(', ')}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-bold">₹{(o.grandTotal || (o as any).grand_total || 0).toLocaleString()}</p>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusStyles[o.status]}`}>{o.status}</span>
                    </div>
                  </div>
                  {isInventory && action && (
                    <div className="flex gap-2 w-full mt-1">
                      {action.map((a: any) => (
                        <button
                          key={a.next}
                          onClick={() => setConfirmOrder({ id: orderId, action: a.next, action_date: new Date().toISOString().split('T')[0] })}
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
