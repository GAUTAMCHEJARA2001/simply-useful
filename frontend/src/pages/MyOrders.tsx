import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Truck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const extractDispatchDetails = (narration: string) => {
  if (!narration) return null;
  const invoiceMatch = narration.match(/\[INVOICE:\s*([^\]]+)\]/i);
  const vehicleMatch = narration.match(/\[VEHICLE:\s*([^\]]+)\]/i);
  const driverMatch = narration.match(/\[DRIVER:\s*([^\]]+)\]/i);
  const mobileMatch = narration.match(/\[DRIVER MOBILE:\s*([^\]]+)\]/i);
  const timeMatch = narration.match(/\[DISPATCH TIME:\s*([^\]]+)\]/i);
  
  if (!invoiceMatch && !vehicleMatch && !driverMatch && !timeMatch) return null;
  
  return {
    invoice: invoiceMatch ? invoiceMatch[1].trim() : '—',
    vehicle: vehicleMatch ? vehicleMatch[1].trim().toUpperCase() : '—',
    driver: driverMatch ? driverMatch[1].trim() : '—',
    mobile: mobileMatch ? mobileMatch[1].trim() : '',
    time: timeMatch ? timeMatch[1].trim() : '—',
  };
};

const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const { orders, products, users, updateOrderItems } = useData();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const { filterBySelectedFY, fyLabel } = useFinancialYear();
  const { toast } = useToast();

  const salesOfficers = useMemo(() => {
    return (users || []).filter(u => (u.role === 'SALES' || u.role === 'SALES_OFFICER') && u.active);
  }, [users]);

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

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAllTime, setShowAllTime] = useState(false);

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const getDisplayStatus = (statusStr: string) => {
    const s = (statusStr || 'Pending').trim().toLowerCase();
    if (s === 'pending') return 'Pending';
    if (s === 'approved') return 'Approved';
    if (s === 'dispatched') return 'Dispatched';
    if (s === 'completed' || s === 'complete') return 'Completed';
    if (s === 'cancelled' || s === 'rejected') return 'Cancelled';
    return statusStr || 'Pending';
  };

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

  const statusStyles: Record<string, string> = {
    Pending: 'bg-warning/15 text-warning', 
    Approved: 'bg-accent/15 text-accent',
    Dispatched: 'bg-primary/15 text-primary', 
    Completed: 'bg-success/15 text-success',
    Cancelled: 'bg-destructive/15 text-destructive',
  };

  // Filtered dataset
  const fyFilteredOrders = showAllTime
    ? (orders || [])
    : filterBySelectedFY(orders || [], o => o.date || (o as any).createdAt);
  const totalPlacedCount = fyFilteredOrders.length;
  const filteredOrders = fyFilteredOrders.filter(order => {
    if (statusFilter === 'All') return true;
    const orderStatus = getDisplayStatus(order.status);
    return orderStatus === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-header">My Orders</h1>
        <p className="page-subheader">
          {showAllTime
            ? `${totalPlacedCount} orders (All Time)`
            : statusFilter === 'All'
              ? `${totalPlacedCount} orders in ${fyLabel}`
              : `${filteredOrders.length} ${statusFilter} orders in ${fyLabel} (${totalPlacedCount} total)`}
          {' '}
          <button
            onClick={() => setShowAllTime(v => !v)}
            className="text-primary underline text-xs ml-1"
          >
            {showAllTime ? `Show ${fyLabel}` : 'Show All Time'}
          </button>
        </p>
      </div>

      {/* Pill Filter Bar */}
      <div className="flex gap-1.5 bg-secondary/80 p-1 rounded-xl overflow-x-auto border border-border/40 max-w-full">
        {(
          [
            { id: 'All', label: 'All' },
            { id: 'Pending', label: 'Pending' },
            { id: 'Approved', label: 'Approved' },
            { id: 'Dispatched', label: 'Dispatched' },
            { id: 'Completed', label: 'Completed' },
            { id: 'Cancelled', label: 'Cancelled' }
          ] as const
        ).map(f => {
          const count = f.id === 'All' 
            ? totalPlacedCount 
            : fyFilteredOrders.filter(o => getDisplayStatus(o.status) === f.id).length;
            
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-background shadow-xs text-foreground font-bold border border-border/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/25'
              }`}
            >
              <span>{f.label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === f.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order Cards */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card className="bg-secondary/20 border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              {statusFilter === 'All' 
                ? 'No orders placed yet. Select "New Order" to place one.' 
                : `No orders currently match the status "${statusFilter}".`}
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map(order => {
            const orderItems = order.items || [];
            const displayId = order.orderId || order.order_id || order.id || 'Unknown ID';
            const displayPartyName = order.partyName || order.party_name || 'Unknown Party';
            const displayPartyType = order.partyType || order.party_type || 'Party';
            const displayStatus = getDisplayStatus(order.status);
            
            return (
              <Card key={order.id || order.orderId || order.order_id || Math.random().toString()} className="border border-border/60 hover:shadow-xs transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-base text-foreground">{displayId}</p>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{formatDate(order.date)}</span>
                        <span>·</span>
                        <span>{displayPartyType}: {displayPartyName}</span>
                        <span>·</span>
                        {isAdmin ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-semibold text-foreground/80 text-[11px]">SO:</span>
                            {(() => {
                              const activeSO = [...salesOfficers];
                              const currentEmail = order.soEmail;
                              if (currentEmail && !activeSO.some(u => u.email.toLowerCase() === currentEmail.toLowerCase())) {
                                const match = (users || []).find(u => u.email.toLowerCase() === currentEmail.toLowerCase());
                                if (match) {
                                  activeSO.push(match);
                                } else {
                                  activeSO.push({ id: currentEmail, email: currentEmail, name: currentEmail, role: 'SALES', active: false } as any);
                                }
                              }
                              return (
                                <Select 
                                  value={currentEmail || ''} 
                                  onValueChange={(val) => handleReassignSO(displayId, val)}
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
                        ) : (
                          <span>SO: {order.soEmail || 'Unassigned'}</span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                      displayStatus === 'Completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                      displayStatus === 'Cancelled' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                      displayStatus === 'Dispatched' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                      displayStatus === 'Approved' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                      'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    }`}>
                      {displayStatus}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-3 bg-secondary/35 rounded-lg p-2.5 border border-border/20">
                    <span className="font-medium text-foreground">{orderItems.length} item(s):</span>{' '}
                    {orderItems.map((i: any) => {
                      const prodId = typeof i.product === 'object' ? i.product?.id : (i.productId || i.product);
                      const prod = (products || []).find(p => 
                        p.id === prodId || 
                        p.productName === prodId || 
                        p.name === prodId
                      );
                      const fallbackName = typeof i.product === 'object' 
                        ? (i.product?.name || i.product?.productName) 
                        : (i.productName || i.product_name || i.product);
                      return prod?.name || prod?.productName || fallbackName || 'Unknown Product';
                    }).join(', ')}
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/80">
                    <span className="text-xs text-muted-foreground">Total Weight</span>
                    <span className="font-bold text-primary">{getOrderWeight(order)} kg</span>
                  </div>
                  
                  {(isAdmin || true) && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-muted-foreground">Grand Total</span>
                      <span className="font-bold text-success">
                        ₹{(order.grandTotal || order.grand_total || 0).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Rejection / Cancellation Reason */}
                  {displayStatus === 'Cancelled' && (order.narration || (order as any).reason) && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1 text-red-700">
                      <span className="font-bold flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> 
                        Reason for Cancellation
                      </span>
                      <p className="opacity-90">{order.narration || (order as any).reason}</p>
                    </div>
                  )}

                  {/* Dispatch transit details */}
                  {(() => {
                    const dispatch = extractDispatchDetails(order.narration);
                    if (!dispatch) return null;
                    return (
                      <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-purple-700">
                          <Truck className="w-3.5 h-3.5 animate-none" /> Dispatch Transit Details
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                          <div>
                            <span className="font-bold text-foreground/80 block">Challan / Invoice</span>
                            {dispatch.invoice}
                          </div>
                          <div>
                            <span className="font-bold text-foreground/80 block">Vehicle Details</span>
                            {dispatch.vehicle}
                          </div>
                          <div>
                            <span className="font-bold text-foreground/80 block">Driver Details</span>
                            {dispatch.driver} {dispatch.mobile && `(${dispatch.mobile})`}
                          </div>
                          <div>
                            <span className="font-bold text-foreground/80 block">Dispatch Time</span>
                            {dispatch.time}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {displayStatus === 'Pending' && (
                    <div className="flex justify-end mt-4 gap-2 border-t pt-3 border-border/50">
                      <PDFGenerator 
                        type="SALES_ORDER" 
                        data={order}
                        filename={`Order_${displayId}.pdf`}
                        buttonLabel="Print"
                        variant="outline"
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs h-8 px-3" 
                        onClick={() => navigate(`/sales/order/${order.orderId || order.order_id || order.id}`)}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1 text-primary" /> Edit Order
                      </Button>
                    </div>
                  )}
                  
                  {displayStatus !== 'Pending' && (
                    <div className="flex justify-end mt-4 gap-2 border-t pt-3 border-border/50">
                      <PDFGenerator 
                        type="SALES_ORDER" 
                        data={order}
                        filename={`Order_${displayId}.pdf`}
                        buttonLabel="Print Invoice"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyOrders;
