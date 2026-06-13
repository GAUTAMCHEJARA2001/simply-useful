import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import apiClient, { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Package, CheckCircle, AlertTriangle, Truck, ShoppingBag, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { orders, products, warehouses, updateOrderStatus, updateOrderItems, loading: dataLoading } = useData();
  const { can } = usePermissions();
  const { toast } = useToast();

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
  const [confirmOrder, setConfirmOrder] = useState<{
    id: string;
    action: OrderStatus;
    reason?: string;
    action_date?: string;
    action_time?: string;
    invoiceDetails?: string;
    warehouseDetails?: string;
    vehicleDetails?: string;
    driverName?: string;
    driverMobile?: string;
    subAction?: 'Reject' | 'Cancel';
  } | null>(null);

  const [boms, setBoms] = useState<any[]>([]);
  const [loadingBoms, setLoadingBoms] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const fetchBoms = async () => {
      try {
        const res = await api.get<any>('/bom');
        if (active) {
          const list = res && res.data && res.data.data ? res.data.data : (res && res.data ? res.data : (Array.isArray(res) ? res : []));
          setBoms(list);
        }
      } catch (err) {
        console.error('Failed to load BOMs:', err);
      } finally {
        if (active) {
          setLoadingBoms(false);
        }
      }
    };
    fetchBoms();
    return () => {
      active = false;
    };
  }, []);

  // Helper to check stock shortage for an order
  const checkOrderShortage = (order: any) => {
    const shortages: {
      productId: string;
      productName: string;
      productCode: string;
      requiredQty: number;
      availableStock: number;
      shortageQty: number;
      sourceWarehouse: string;
    }[] = [];

    const items = order.items || [];
    let hasFgShortage = false;

    for (const item of items) {
      // Find product by id
      const itemProductId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
      const finishedGood = products.find(p => p.id === itemProductId || p.productCode === item.product || p.name === item.product);
      
      const fgAvailable = finishedGood
        ? (finishedGood.availableStock !== undefined ? finishedGood.availableStock : (finishedGood.stockQty !== undefined ? finishedGood.stockQty : 0))
        : 0;

      if (finishedGood && fgAvailable >= item.qty) {
        // Stock of finished good is sufficient
        continue;
      }

      hasFgShortage = true;

      // Stock of finished good is NOT sufficient. Check if there's a BOM recipe
      const bom = boms.find(b => 
        (finishedGood && b.productId === finishedGood.id) || 
        (finishedGood && b.productCode === finishedGood.productCode) || 
        (finishedGood && finishedGood.product_code && b.productCode === finishedGood.product_code) ||
        (finishedGood && b.name === `BOM for ${finishedGood.name}`) ||
        (finishedGood && b.productName === finishedGood.name)
      );

      if (bom && bom.items && bom.items.length > 0) {
        // Resolve raw materials from BOM recipe
        for (const bomItem of bom.items) {
          const bomItemQty = bomItem.quantity || bomItem.qty || 0;
          const outputQty = bom.outputQuantity || 1;
          const rawRequired = item.qty * (bomItemQty / outputQty);

          // Find the raw material product in our products list
          const rawMaterialName = bomItem.productName || bomItem.materialName || bomItem.materialname;
          const rawMaterial = products.find(p => 
            p.id === bomItem.productId || 
            p.name === rawMaterialName ||
            p.productName === rawMaterialName ||
            p.product_name === rawMaterialName
          );

          const rmAvailable = rawMaterial 
            ? (rawMaterial.availableStock !== undefined ? rawMaterial.availableStock : (rawMaterial.stockQty !== undefined ? rawMaterial.stockQty : 0))
            : 0;

          const rmShortage = Math.max(0, rawRequired - rmAvailable);

          // Get default warehouse for raw material
          let whName = '—';
          if (rawMaterial && rawMaterial.defaultWarehouseId) {
            const wh = warehouses.find(w => String(w.id) === String(rawMaterial.defaultWarehouseId));
            if (wh) whName = wh.name;
          }

          shortages.push({
            productId: rawMaterial?.id || bomItem.productId || '',
            productName: rawMaterialName || 'Unknown Material',
            productCode: rawMaterial?.productCode || rawMaterial?.product_code || '',
            requiredQty: rawRequired,
            availableStock: rmAvailable,
            shortageQty: rmShortage,
            sourceWarehouse: whName,
          });
        }
      } else {
        // No BOM defined, show the finished good itself
        const shortageQty = item.qty - fgAvailable;

        let whName = '—';
        if (finishedGood && finishedGood.defaultWarehouseId) {
          const wh = warehouses.find(w => String(w.id) === String(finishedGood.defaultWarehouseId));
          if (wh) whName = wh.name;
        }

        shortages.push({
          productId: finishedGood?.id || itemProductId || '',
          productName: finishedGood?.name || finishedGood?.productName || item.productName || 'Unknown Product',
          productCode: finishedGood?.productCode || finishedGood?.product_code || '',
          requiredQty: item.qty,
          availableStock: fgAvailable,
          shortageQty: shortageQty,
          sourceWarehouse: whName,
        });
      }
    }

    // Determine status
    let status: 'Available' | 'Partial' | 'Unavailable' = 'Available';
    if (hasFgShortage) {
      // If we have shortages of raw materials
      const totalShortageQty = shortages.reduce((acc, s) => acc + s.shortageQty, 0);
      if (totalShortageQty === 0) {
        status = 'Partial'; // Finished goods are short, but we have enough raw materials to make them
      } else {
        // We have raw material shortages. Check if we have at least some stock of short items
        const anyAvailableStock = shortages.some(s => s.availableStock > 0);
        status = anyAvailableStock ? 'Partial' : 'Unavailable';
      }
    }

    return {
      status,
      shortages,
    };
  };

  if (dataLoading || loadingBoms) {
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

  // Only show orders that have a warehouse assigned
  const assignedOrders = orders.filter(o => o.assignedWarehouse != null);

  const approvedOrders = assignedOrders.filter(o => o.status === 'Approved');
  const dispatchedOrders = assignedOrders.filter(o => o.status === 'Dispatched');
  const pendingOrders = assignedOrders.filter(o => o.status === 'Pending' || o.status === 'Approved');
  const completedOrders = assignedOrders.filter(o => o.status === 'Completed');

  const productDemand = (assignedOrders || [])
    .filter(o => o.status !== 'Cancelled' && o.status !== 'Completed')
    .flatMap(o => o.items || [])
    .reduce((acc, item) => {
      const itemProductId = item.productId || item.productid_id || (typeof item.product === 'object' ? item.product?.id : item.product);
      const pObj = products.find((p: any) => p.id === itemProductId || p.productCode === itemProductId || p.name === itemProductId);
      const productName = pObj?.name || pObj?.productName || (item.product as any)?.name || item.productName || item.product || 'Unknown Product';

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

  const setFormConfirmField = (field: string, value: any) => {
    if (!confirmOrder) return;
    setConfirmOrder({ ...confirmOrder, [field]: value });
  };

  const handleAction = async () => {
    if (!confirmOrder) return;

    if (confirmOrder.action === 'Returned' && !confirmOrder.reason?.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a return reason.', variant: 'destructive' });
      return;
    }

    if (confirmOrder.action === 'Cancelled') {
      if (!confirmOrder.reason?.trim()) {
        toast({
          title: 'Reason required',
          description: `Please provide a reason for order ${confirmOrder.subAction === 'Reject' ? 'rejection' : 'cancellation'}.`,
          variant: 'destructive',
        });
        return;
      }
      if (!confirmOrder.action_date) {
        toast({ title: 'Date required', description: 'Please select a date.', variant: 'destructive' });
        return;
      }
    }

    if (confirmOrder.action === 'Dispatched') {
      if (!confirmOrder.invoiceDetails?.trim()) {
        toast({ title: 'Invoice Details required', description: 'Please provide the Invoice/Challan details.', variant: 'destructive' });
        return;
      }
      if (!confirmOrder.warehouseDetails?.trim()) {
        toast({ title: 'Warehouse required', description: 'Please select the dispatch warehouse.', variant: 'destructive' });
        return;
      }
      if (!confirmOrder.vehicleDetails?.trim()) {
        toast({ title: 'Vehicle Details required', description: 'Please provide the Vehicle details.', variant: 'destructive' });
        return;
      }
      if (!confirmOrder.driverName?.trim()) {
        toast({ title: 'Driver Name required', description: 'Please provide the Driver name.', variant: 'destructive' });
        return;
      }
      if (!confirmOrder.driverMobile?.trim()) {
        toast({ title: 'Driver Mobile required', description: 'Please provide the Driver mobile number.', variant: 'destructive' });
        return;
      }
      if (!confirmOrder.action_date) {
        toast({ title: 'Date required', description: 'Please select a dispatch date.', variant: 'destructive' });
        return;
      }
      if (!confirmOrder.action_time) {
        toast({ title: 'Time required', description: 'Please select a dispatch time.', variant: 'destructive' });
        return;
      }
    } else if (confirmOrder.action === 'Returned') {
      if (!confirmOrder.action_date) {
        toast({ title: 'Date required', description: 'Please select a return date.', variant: 'destructive' });
        return;
      }
    }

    let narrationStr = confirmOrder.reason || '';
    if (confirmOrder.action === 'Dispatched') {
      narrationStr = `[INVOICE: ${confirmOrder.invoiceDetails.trim()}] [WAREHOUSE: ${confirmOrder.warehouseDetails.trim()}] [VEHICLE: ${confirmOrder.vehicleDetails.trim()}] [DRIVER: ${confirmOrder.driverName.trim()}] [DRIVER MOBILE: ${confirmOrder.driverMobile.trim()}] [DISPATCH TIME: ${confirmOrder.action_date} ${confirmOrder.action_time}] ${narrationStr}`.trim();
    } else if (confirmOrder.action === 'Returned') {
      narrationStr = `[RETURN REASON: ${confirmOrder.reason.trim()}] [RETURN DATE: ${confirmOrder.action_date}] ${narrationStr}`.trim();
    }

    await updateOrderStatus(confirmOrder.id, confirmOrder.action, narrationStr, confirmOrder.action_date);
    const label = confirmOrder.action === 'Dispatched' 
      ? 'dispatched' 
      : confirmOrder.action === 'Returned' 
      ? 'returned' 
      : confirmOrder.action === 'Approved'
      ? 'approved'
      : confirmOrder.action === 'Cancelled'
      ? (confirmOrder.subAction === 'Reject' ? 'rejected' : 'cancelled')
      : 'completed';

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
              <p className="text-xl xl:text-2xl font-bold text-foreground truncate" title={String(kpi.value)}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate" title={kpi.label}>{kpi.label}</p>
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
                {productDemand.map((p, index) => (
                   <tr key={`${p.product || 'unknown-product'}-${index}`} className="border-b border-border/50">
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
                      <p className="text-xs text-muted-foreground mt-0.5">{(o.items || []).map((i: any) => {
                        const itemProductId = i.productId || i.productid_id || (typeof i.product === 'object' ? i.product?.id : i.product);
                        const pObj = products.find((p: any) => p.id === itemProductId || p.productCode === itemProductId || p.name === itemProductId);
                        const pName = pObj?.name || pObj?.productName || i.productName || i.product?.name || i.product || 'Unknown Product';
                        return `${pName} ×${i.qty}`;
                      }).join(', ')}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-bold">₹{(o.grandTotal || (o as any).grand_total || 0).toLocaleString()}</p>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusStyles[o.status]}`}>{o.status}</span>
                    </div>
                  </div>
                  {/* Warehouse Assignment */}
                  <div className="flex items-center gap-1.5 mt-1 mb-1">
                    <span className="font-semibold text-foreground/80 text-[11px]">🏭 Warehouse:</span>
                    {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') ? (
                      warehouses.length > 0 ? (
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
                      )
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {(() => {
                          const whId = (o as any).assignedWarehouse;
                          if (!whId) return 'Not assigned';
                          const wh = warehouses.find(w => String(w.id) === String(whId));
                          return wh?.name || `Warehouse #${whId}`;
                        })()}
                      </span>
                    )}
                  </div>
                  {isInventory && action && (
                    <div className="flex gap-2 w-full mt-1">
                      {action.map((a: any) => (
                        <button
                          key={a.next}
                          onClick={() => {
                            const now = new Date();
                            setConfirmOrder({ 
                              id: orderId, 
                              action: a.next, 
                              action_date: now.toISOString().split('T')[0],
                              action_time: now.toTimeString().split(' ')[0].slice(0, 5),
                              invoiceDetails: '',
                              warehouseDetails: warehouses[0]?.name || '',
                              vehicleDetails: '',
                              driverName: '',
                              driverMobile: '',
                              reason: ''
                            });
                          }}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${a.color}`}
                        >
                          <a.icon className="w-3.5 h-3.5" /> {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {o.status === 'Pending' && (() => {
                    const checkResult = checkOrderShortage(o);
                    
                    const badgeStyles: Record<string, string> = {
                      Available: 'bg-green-100 text-green-700 border-green-200',
                      Partial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                      Unavailable: 'bg-red-100 text-red-700 border-red-200',
                    };

                    const badgeTexts: Record<string, string> = {
                      Available: '✅ Stock Available',
                      Partial: '⚠️ Partial Stock',
                      Unavailable: '❌ Stock Not Available',
                    };

                    const isAdminOrSuper = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

                    return (
                      <div className="space-y-3 mt-2 border-t pt-2 border-border/40">
                        {/* Stock Check Summary */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground">Stock Status:</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeStyles[checkResult.status]}`}>
                            {badgeTexts[checkResult.status]}
                          </span>
                        </div>

                        {/* Shortage table if status is not 'Available' */}
                        {checkResult.status !== 'Available' && checkResult.shortages.length > 0 && (
                          <div className="overflow-x-auto border border-border/40 rounded-lg">
                            <table className="w-full text-[10px] text-left">
                              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/40">
                                <tr>
                                  <th className="px-2 py-1.5 text-left">Material/Product</th>
                                  <th className="px-2 py-1.5 text-right">Req Qty</th>
                                  <th className="px-2 py-1.5 text-right">Available</th>
                                  <th className="px-2 py-1.5 text-right">Shortage</th>
                                  <th className="px-2 py-1.5 text-left">Source Wh</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/20 bg-card">
                                {checkResult.shortages.map((s, idx) => (
                                  <tr key={idx} className={s.shortageQty > 0 ? "bg-red-500/5" : ""}>
                                    <td className="px-2 py-1.5 font-medium max-w-[120px] truncate" title={s.productName}>{s.productName}</td>
                                    <td className="px-2 py-1.5 text-right font-medium">{s.requiredQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td className="px-2 py-1.5 text-right">{s.availableStock.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td className={`px-2 py-1.5 text-right font-bold ${s.shortageQty > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {s.shortageQty > 0 ? s.shortageQty.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[80px]" title={s.sourceWarehouse}>{s.sourceWarehouse}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Admin Action Buttons */}
                        {isAdminOrSuper ? (
                          <div className="flex gap-2 w-full pt-1">
                            <button
                              onClick={() => {
                                setConfirmOrder({
                                  id: orderId,
                                  action: 'Approved',
                                  action_date: new Date().toISOString().split('T')[0],
                                  reason: ''
                                });
                              }}
                              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setConfirmOrder({
                                  id: orderId,
                                  action: 'Cancelled',
                                  subAction: 'Reject',
                                  action_date: new Date().toISOString().split('T')[0],
                                  reason: ''
                                });
                              }}
                              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button
                              onClick={() => {
                                setConfirmOrder({
                                  id: orderId,
                                  action: 'Cancelled',
                                  subAction: 'Cancel',
                                  action_date: new Date().toISOString().split('T')[0],
                                  reason: ''
                                });
                              }}
                              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground text-center mt-1">Waiting for Admin approval</p>
                        )}
                      </div>
                    );
                  })()}
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
              {confirmOrder?.action === 'Dispatched' 
                ? '🚚 Confirm Dispatch' 
                : confirmOrder?.action === 'Returned' 
                ? '⚠️ Confirm Return' 
                : confirmOrder?.action === 'Approved'
                ? '✅ Confirm Approval'
                : confirmOrder?.action === 'Cancelled'
                ? (confirmOrder.subAction === 'Reject' ? '❌ Reject Order' : '🚫 Cancel Order')
                : '✅ Confirm Completion'}
            </DialogTitle>
            <DialogDescription id="order-fulfillment-desc" className="sr-only">
              Confirm status change for order {confirmOrder?.id}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {confirmOrder?.action === 'Dispatched'
                ? `Enter delivery and transport details to dispatch order ${confirmOrder?.id}:`
                : confirmOrder?.action === 'Returned'
                ? `Return order ${confirmOrder?.id}? Please provide details below.`
                : confirmOrder?.action === 'Approved'
                ? `Are you sure you want to approve order ${confirmOrder?.id}? This will authorize production/dispatch.`
                : confirmOrder?.action === 'Cancelled'
                ? `Please enter details to ${confirmOrder.subAction === 'Reject' ? 'reject' : 'cancel'} order ${confirmOrder?.id}:`
                : `Mark order ${confirmOrder?.id} as COMPLETED? This confirms delivery and updates revenue.`}
            </p>

            {confirmOrder?.action === 'Dispatched' && (
              <div className="space-y-3 mt-2 border-t pt-3 border-border/40">
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Invoice / Challan Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. INV-1001"
                    value={confirmOrder.invoiceDetails || ''} 
                    onChange={e => setFormConfirmField('invoiceDetails', e.target.value)}
                    className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Vehicle Details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. UP-32-AB-1234"
                    value={confirmOrder.vehicleDetails || ''} 
                    onChange={e => setFormConfirmField('vehicleDetails', e.target.value.toUpperCase())}
                    className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Warehouse</label>
                  <select
                    value={confirmOrder.warehouseDetails || ''}
                    onChange={e => setFormConfirmField('warehouseDetails', e.target.value)}
                    className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse: any) => (
                      <option key={warehouse.id || warehouse.name} value={warehouse.name}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Driver Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ramesh Kumar"
                    value={confirmOrder.driverName || ''} 
                    onChange={e => setFormConfirmField('driverName', e.target.value)}
                    className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Driver Mobile Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +91 98765 43210"
                    value={confirmOrder.driverMobile || ''} 
                    onChange={e => setFormConfirmField('driverMobile', e.target.value)}
                    className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Dispatch Date</label>
                    <input 
                      type="date"
                      value={confirmOrder.action_date || ''}
                      onChange={e => setFormConfirmField('action_date', e.target.value)}
                      className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Dispatch Time</label>
                    <input 
                      type="time"
                      value={confirmOrder.action_time || ''}
                      onChange={e => setFormConfirmField('action_time', e.target.value)}
                      className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Remarks / Notes (Optional)</label>
                  <textarea 
                    placeholder="Any comments or remarks..."
                    value={confirmOrder.reason || ''} 
                    onChange={e => setFormConfirmField('reason', e.target.value)}
                    className="w-full text-xs border border-border rounded-lg p-2 bg-background min-h-[50px]"
                  />
                </div>
              </div>
            )}

            {confirmOrder?.action === 'Returned' && (
              <div className="space-y-3 mt-2 border-t pt-3 border-border/40">
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Return Date</label>
                  <input 
                    type="date"
                    value={confirmOrder.action_date || ''}
                    onChange={e => setFormConfirmField('action_date', e.target.value)}
                    className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1">Return Reason</label>
                  <textarea 
                    value={confirmOrder.reason || ''} 
                    onChange={e => setFormConfirmField('reason', e.target.value)}
                    placeholder="Required: Reason for order return..."
                    className="w-full text-xs border border-border rounded-lg p-2 bg-background min-h-[70px]"
                  />
                </div>
              </div>
            )}

            {confirmOrder?.action === 'Cancelled' && (
              <div className="space-y-3 mt-2 border-t pt-3 border-border/40">
                <div>
                  <label className="text-[11px] font-semibold block mb-1">
                    {confirmOrder.subAction === 'Reject' ? 'Rejection Date' : 'Cancellation Date'}
                  </label>
                  <input 
                    type="date"
                    value={confirmOrder.action_date || ''}
                    onChange={e => setFormConfirmField('action_date', e.target.value)}
                    className="w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold block mb-1">
                    {confirmOrder.subAction === 'Reject' ? 'Rejection Reason' : 'Cancellation Reason'}
                  </label>
                  <textarea 
                    value={confirmOrder.reason || ''} 
                    onChange={e => setFormConfirmField('reason', e.target.value)}
                    placeholder={confirmOrder.subAction === 'Reject' ? "Required: Why is this order being rejected?" : "Required: Why is this order being cancelled?"}
                    className="w-full text-xs border border-border rounded-lg p-2 bg-background min-h-[70px]"
                  />
                </div>
              </div>
            )}

            {confirmOrder?.action === 'Approved' && (
              <p className="text-xs text-muted-foreground italic mt-2">
                This will move the order to the Approved queue for dispatch.
              </p>
            )}

            {confirmOrder?.action === 'Completed' && (
              <p className="text-xs text-muted-foreground italic mt-2">
                This will mark the order as delivered and finalize stock changes.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmOrder(null)}>Cancel</Button>
            <Button
              className={
                confirmOrder?.action === 'Dispatched' 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : confirmOrder?.action === 'Returned' 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : confirmOrder?.action === 'Approved'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : confirmOrder?.action === 'Cancelled'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
              onClick={handleAction}
            >
              {confirmOrder?.action === 'Dispatched' 
                ? 'Confirm Dispatch' 
                : confirmOrder?.action === 'Returned' 
                ? 'Confirm Return' 
                : confirmOrder?.action === 'Approved'
                ? 'Confirm Approval'
                : confirmOrder?.action === 'Cancelled'
                ? (confirmOrder.subAction === 'Reject' ? 'Confirm Rejection' : 'Confirm Cancellation')
                : 'Confirm Completion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryDashboard;
