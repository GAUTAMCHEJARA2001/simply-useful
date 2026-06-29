import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { Search, RefreshCw, Activity, Calendar, User, MapPin, Box, FileText, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Order } from '@/types';
import { orderService } from '@/api/services/order.service';
import { useToast } from '@/hooks/use-toast';

const ReturnedOrders: React.FC = () => {
  const { orders, refreshAll } = useData();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [returnLogs, setReturnLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [revertingLogId, setRevertingLogId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedOrder) {
      setLoadingLogs(true);
      orderService.getReturnLogs(selectedOrder.id || selectedOrder.orderId)
        .then(res => {
          setReturnLogs(res.data?.data || res.data || []);
        })
        .catch(err => {
          console.error('Error fetching return logs:', err);
        })
        .finally(() => {
          setLoadingLogs(false);
        });
    } else {
      setReturnLogs([]);
    }
  }, [selectedOrder]);

  const handleRevertReturn = async (logId: string) => {
    if (!selectedOrder) return;
    if (!window.confirm('Are you sure you want to revert this return log? This will deduct the returned items from inventory stock levels.')) {
      return;
    }

    try {
      setRevertingLogId(logId);
      await orderService.revertReturnLog(selectedOrder.id || selectedOrder.orderId, logId);
      toast({
        title: 'Success',
        description: 'Return log has been reverted and inventory stock level updated successfully.',
      });
      refreshAll(true);
      setSelectedOrder(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to revert return log',
        variant: 'destructive',
      });
    } finally {
      setRevertingLogId(null);
    }
  };

  const returnedOrders = orders.filter(o => {
    const isReturned = o.status === 'Returned' || o.status === 'Partially Returned';
    if (!isReturned) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const s = [
        o.id, o.order_id, o.orderId, o.partyName, o.party_name, o.narration
      ].filter(Boolean).join(' ').toLowerCase();
      return s.includes(term);
    }
    return true;
  });

  const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleString('en-IN') : '—';
  const formatCurrency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const extractReturnReason = (narration: string) => {
    if (!narration) return '';
    const match = narration.match(/\[RETURN REASON:\s*([^\]]+)\]/);
    return match ? match[1] : '';
  };

  const extractDispatchDate = (narration: string, fallback: string | undefined) => {
    if (!narration) return fallback || '';
    const matchTime = narration.match(/\[DISPATCH TIME:\s*([^\]\s]+)(?:\s+[^\]]+)?\]/i);
    if (matchTime) return matchTime[1];
    const matchDate = narration.match(/\[DISPATCH DATE:\s*([^\]]+)\]/i);
    return matchDate ? matchDate[1] : (fallback || '');
  };

  const extractReturnDate = (narration: string, fallback: string | undefined) => {
    if (!narration) return fallback || '';
    const match = narration.match(/\[RETURN DATE:\s*([^\]]+)\]/i);
    return match ? match[1] : (fallback || '');
  };

  const getCleanNarration = (narration: string) => {
    if (!narration) return '—';
    return narration
      .replace(/\[INVOICE:\s*[^\]]+\]/gi, '')
      .replace(/\[VEHICLE:\s*[^\]]+\]/gi, '')
      .replace(/\[DRIVER:\s*[^\]]+\]/gi, '')
      .replace(/\[DISPATCH TIME:\s*[^\]]+\]/gi, '')
      .replace(/\[DISPATCH DATE:\s*[^\]]+\]/gi, '')
      .replace(/\[RETURN REASON:\s*[^\]]+\]/gi, '')
      .replace(/\[RETURN DATE:\s*[^\]]+\]/gi, '')
      .trim() || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-red-600" /> Returned Orders
          </h1>
          <p className="page-subheader">Review all returned orders and their reasons</p>
        </div>
        
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, Party, Vehicle..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Returns ({returnedOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={['Order ID', 'Order Date', 'Party', 'Dispatch Date', 'Return Date', 'Action']}
            rows={returnedOrders.map(o => [
              <span key="id" className="font-semibold">{o.order_id || o.orderId || o.id}</span>,
              formatDate(o.date),
              o.party_name || o.partyName || '—',
              formatDate(extractDispatchDate(o.narration, o.date || o.createdAt)),
              formatDate(extractReturnDate(o.narration, (o as any).updatedAt || o.date || o.createdAt)),
              <Button key="btn" size="sm" variant="outline" onClick={() => setSelectedOrder(o)}>View Details</Button>
            ])}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby="return-details-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <RefreshCw className="w-5 h-5" />
              Return Details &middot; <span className="text-foreground">{selectedOrder?.order_id || selectedOrder?.orderId || selectedOrder?.id}</span>
            </DialogTitle>
            <DialogDescription id="return-details-desc" className="sr-only">
              View comprehensive details for returned order {selectedOrder?.order_id || selectedOrder?.orderId || selectedOrder?.id}, including reasons, dates, and items.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 mt-2">
              {/* REASON */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-xs font-bold text-red-800 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Reason for Return</h3>
                <p className="text-sm font-medium text-red-900">{extractReturnReason(selectedOrder.narration) || 'No specific reason provided'}</p>
              </div>

              {/* DATES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/30 p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><Calendar className="w-3 h-3"/> Order Date</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(selectedOrder.date)}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><Calendar className="w-3 h-3"/> Dispatch Date</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(extractDispatchDate(selectedOrder.narration, selectedOrder.date || selectedOrder.createdAt))}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border flex flex-col justify-end">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><Calendar className="w-3 h-3"/> Return Date</p>
                  <p className="text-sm font-bold text-red-600 mt-0.5">{formatDate(extractReturnDate(selectedOrder.narration, (selectedOrder as any).updatedAt || selectedOrder.date || selectedOrder.createdAt))}</p>
                </div>
              </div>

              {/* PARTY & SO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Order Given By</p>
                  <p className="text-sm font-semibold">{selectedOrder.so_email || selectedOrder.soEmail}</p>
                </div>
                <div className="space-y-1 md:text-right">
                  <p className="text-xs text-muted-foreground flex items-center md:justify-end gap-1.5"><MapPin className="w-3.5 h-3.5"/> Dealer/Distributor</p>
                  <p className="text-sm font-semibold">{selectedOrder.party_name || selectedOrder.partyName}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedOrder.party_type || selectedOrder.partyType} • Linked: {selectedOrder.distributor || 'N/A'}</p>
                </div>
              </div>

              {/* ITEMS */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Box className="w-4 h-4"/> Order Items</h3>
                <div className="border border-border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Product</th>
                        <th className="px-3 py-2 text-center font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Rate</th>
                        <th className="px-3 py-2 text-left font-medium">Item Remark</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <tr key={idx} className="bg-card">
                          <td className="px-3 py-2 font-medium whitespace-nowrap animate-none">
                            {/* React crash fix: render friendly name if product is nested object, fallback to product as string */}
                            {item.productName || (typeof item.product === 'object' && item.product ? (item.product as any).name || (item.product as any).productName : item.product)}
                          </td>
                          <td className="px-3 py-2 text-center text-primary font-bold">{item.qty}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.price)}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[150px]" title={item.itemRemark || item.item_remark}>{item.itemRemark || item.item_remark || '—'}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RETURN LOGS (OPTION A) */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Return Logs History</h3>
                {loadingLogs ? (
                  <div className="text-xs text-muted-foreground animate-pulse py-2">Loading return logs...</div>
                ) : returnLogs.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2 italic border border-dashed rounded-lg p-3 bg-muted/10">No detailed return logs found.</div>
                ) : (
                  <div className="space-y-3">
                    {returnLogs.map((log) => (
                      <div key={log.id} className="border border-border/80 rounded-xl p-3 bg-muted/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-600">{formatDate(log.returnDate)}</span>
                            {log.remarks && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 font-medium">
                                {log.remarks}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-semibold text-foreground">Returned: </span>
                            {(log.items || []).map((it: any, index: number) => {
                              const pName = it.product?.name || it.product?.productName || it.productId;
                              return (
                                <span key={it.id}>
                                  {pName} (x{it.qty}){index < log.items.length - 1 ? ', ' : ''}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-medium"
                          onClick={() => handleRevertReturn(log.id)}
                          disabled={revertingLogId === log.id}
                        >
                          <RotateCcw className="w-3 h-3" />
                          {revertingLogId === log.id ? 'Reverting...' : 'Revert Return'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GENERAL REMARK */}
              <div>
                <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5"><FileText className="w-4 h-4"/> General Remark</h3>
                <div className="bg-secondary/50 p-3 rounded-lg border border-border text-sm text-foreground min-h-[60px]">
                  {getCleanNarration(selectedOrder.narration)}
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnedOrders;
