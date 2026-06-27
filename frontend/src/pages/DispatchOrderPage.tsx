import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Truck, AlertTriangle } from 'lucide-react';
import { orderService } from '@/api/services/order.service';
import { useToast } from '@/hooks/use-toast';
import { Order } from '@/types';

const DispatchOrderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, warehouses, products, refreshAll } = useData();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [dispatchItems, setDispatchItems] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [invoiceDetails, setInvoiceDetails] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [warehouseDetails, setWarehouseDetails] = useState(warehouses[0]?.name || '');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispatchTime, setDispatchTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [reason, setReason] = useState('');

  const initializedRef = useRef(false);

  useEffect(() => {
    if (id && orders.length > 0) {
      const found = orders.find(o => String(o.id) === id || o.orderId === id || (o as any).order_id === id);
      if (found) {
        setOrder(found);
        
        // Only initialize quantities if we haven't done so yet, 
        // to prevent overriding user input on background refresh
        if (!initializedRef.current) {
          const initialQtys: Record<string, number> = {};
          (found.items || []).forEach((item: any) => {
            const pId = item.productId || item.productid_id || (typeof item.product === 'object' ? item.product?.id : item.product);
            if (pId) {
              const ordered = item.qty || 0;
              const sent = item.sentQty || 0;
              const remaining = ordered - sent;
              initialQtys[pId] = remaining > 0 ? remaining : 0;
            }
          });
          setDispatchItems(initialQtys);
          initializedRef.current = true;
        }
      }
    }
  }, [id, orders]);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertTriangle className="w-12 h-12 text-yellow-500" />
        <h2 className="text-xl font-semibold">Order not found</h2>
        <Button onClick={() => navigate('/inventory')}>Back to Inventory</Button>
      </div>
    );
  }

  const handleConfirmDispatch = async () => {
    try {
      setLoading(true);
      
      const itemsPayload = Object.entries(dispatchItems)
        .map(([productId, qty]) => ({ productId, qty: Number(qty) }))
        .filter(item => item.qty > 0);

      if (itemsPayload.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please specify at least one item to dispatch.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      await orderService.partialDispatch(order.id || order.orderId, {
        items: itemsPayload,
        invoiceNumber: invoiceDetails,
        vehicleNumber: vehicleDetails,
        driverName: driverName,
        driverMobile: driverMobile,
        warehouseDetails: warehouseDetails,
        remarks: reason,
        actionDate: dispatchDate,
        actionTime: dispatchTime
      });

      toast({
        title: 'Dispatch Successful',
        description: `Order ${order.orderId || order.id} has been dispatched.`,
      });

      refreshAll(true);
      navigate('/inventory');
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Dispatch Failed',
        description: err.message || 'An error occurred during dispatch.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6 text-purple-600" />
              Dispatch Order {order.orderId || order.id}
            </h1>
            {order.partyName && (
              <p className="text-muted-foreground mt-1 ml-8">
                <span className="font-medium text-foreground">Customer:</span> {order.partyName}
              </p>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items to Dispatch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-xl">
            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-border/40">
              {order.items?.map((item: any) => {
                const pId = item.productId || item.productid_id || (typeof item.product === 'object' ? item.product?.id : item.product);
                const pObj = products.find((p: any) => String(p.id) === String(pId) || p.productCode === pId || p.name === pId);
                const pName = pObj?.name || pObj?.productName || item.productName || (typeof item.product === 'object' ? item.product?.name : null) || item.product || 'Unknown Product';
                
                const ordered = item.qty || 0;
                const sent = item.sentQty || 0;
                const remaining = ordered - sent;
                const currentVal = dispatchItems[pId];

                return (
                  <div key={pId} className="p-4 space-y-3">
                    <div className="font-semibold text-sm">{pName}</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Ordered: <span className="font-medium text-foreground">{ordered}</span></span>
                      <span className="text-muted-foreground">
                        Remaining: {remaining > 0 ? (
                          <span className="font-bold text-amber-600 ml-1">{remaining}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold ml-1">✓ Done</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-xs font-semibold">Dispatch Qty:</span>
                      {remaining > 0 ? (
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={currentVal === undefined ? '' : currentVal}
                          onChange={e => {
                            const val = e.target.value;
                            setDispatchItems(prev => ({
                              ...prev,
                              [pId]: val === '' ? 0 : Math.min(remaining, Math.max(0, Number(val)))
                            }));
                          }}
                          onFocus={e => e.target.select()}
                          className="w-24 text-center border border-border px-2 py-1.5 rounded-lg bg-background font-bold focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Product</th>
                    <th className="py-3 px-4 text-center font-semibold">Ordered</th>
                    <th className="py-3 px-4 text-center font-semibold">Remaining</th>
                    <th className="py-3 px-4 text-center font-semibold min-w-[120px]">Dispatch Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {order.items?.map((item: any) => {
                    const pId = item.productId || item.productid_id || (typeof item.product === 'object' ? item.product?.id : item.product);
                    const pObj = products.find((p: any) => String(p.id) === String(pId) || p.productCode === pId || p.name === pId);
                    const pName = pObj?.name || pObj?.productName || item.productName || (typeof item.product === 'object' ? item.product?.name : null) || item.product || 'Unknown Product';
                    
                    const ordered = item.qty || 0;
                    const sent = item.sentQty || 0;
                    const remaining = ordered - sent;
                    const currentVal = dispatchItems[pId];

                    return (
                      <tr key={pId} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-medium">{pName}</td>
                        <td className="py-3 px-4 text-center">{ordered}</td>
                        <td className="py-3 px-4 text-center">
                          {remaining > 0 ? (
                            <span className="font-bold text-amber-600">{remaining}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                              ✓ Done
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {remaining > 0 ? (
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              value={currentVal === undefined ? '' : currentVal}
                              onChange={e => {
                                const val = e.target.value;
                                setDispatchItems(prev => ({
                                  ...prev,
                                  [pId]: val === '' ? 0 : Math.min(remaining, Math.max(0, Number(val)))
                                }));
                              }}
                              onFocus={e => e.target.select()}
                              className="w-24 text-center border border-border px-2 py-1.5 rounded-lg bg-background font-bold focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Delivery Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Invoice / Challan Number</label>
              <input 
                type="text" 
                placeholder="e.g. INV-1001"
                value={invoiceDetails} 
                onChange={e => setInvoiceDetails(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Vehicle Details</label>
              <input 
                type="text" 
                placeholder="e.g. UP-32-AB-1234"
                value={vehicleDetails} 
                onChange={e => setVehicleDetails(e.target.value.toUpperCase())}
                className="w-full border border-border rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Warehouse</label>
              <select
                value={warehouseDetails}
                onChange={e => setWarehouseDetails(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse: any) => (
                  <option key={warehouse.id || warehouse.name} value={warehouse.name}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Driver Name</label>
              <input 
                type="text" 
                placeholder="e.g. Ramesh Kumar"
                value={driverName} 
                onChange={e => setDriverName(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Driver Mobile Number</label>
              <input 
                type="text" 
                placeholder="e.g. +91 98765 43210"
                value={driverMobile} 
                onChange={e => setDriverMobile(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Dispatch Date</label>
              <input 
                type="date"
                value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Dispatch Time</label>
              <input 
                type="time"
                value={dispatchTime}
                onChange={e => setDispatchTime(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="text-sm font-semibold">Remarks / Notes (Optional)</label>
              <textarea 
                placeholder="Any comments or remarks..."
                value={reason} 
                onChange={e => setReason(e.target.value)}
                className="w-full border border-border rounded-lg p-3 bg-background min-h-[80px] focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]" 
              onClick={handleConfirmDispatch}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm Dispatch'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispatchOrderPage;
