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
import { usePermissions } from '@/hooks/usePermissions';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { useToast } from '@/hooks/use-toast';
import { Modal } from '@/components/Modal';

const ReturnedOrders: React.FC = () => {
  const { orders, products, refreshAll } = useData();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [returnLogs, setReturnLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [revertingLogId, setRevertingLogId] = useState<string | null>(null);

  const productsById = React.useMemo(() => {
    const map = new Map();
    for (const p of products || []) {
      map.set(String(p.id), p);
      if (p.productCode) map.set(p.productCode, p);
      if (p.product_code) map.set(p.product_code, p);
      if (p.productName) map.set(p.productName, p);
      if (p.product_name) map.set(p.product_name, p);
      if (p.name) map.set(p.name, p);
    }
    return map;
  }, [products]);

  // Return Form Modal States
  const [returnSale, setReturnSale] = useState<Order | null>(null);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [returnRemarks, setReturnRemarks] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  const openReturnForm = (order: Order) => {
    setReturnSale(order);
    setReturnRemarks('');
    
    // Initialize return quantities per item
    const initialQtys: Record<string, number> = {};
    (order.items || []).forEach((item: any) => {
      const pId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
      if (pId) {
        const dispatched = item.sentQty || item.qty || 0;
        const alreadyReturned = item.returnedQty || item.returnedqty || 0;
        const returnable = dispatched - alreadyReturned;
        initialQtys[pId] = returnable > 0 ? returnable : 0;
      }
    });
    setReturnItems(initialQtys);
  };

  const submitReturn = async () => {
    if (!returnSale) return;
    setIsReturning(true);
    
    try {
      const itemsPayload = Object.entries(returnItems)
        .map(([productId, qty]) => {
          const oi = returnSale.items?.find((item: any) => {
            const pId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
            return String(pId) === String(productId);
          });
          return {
            productId,
            orderItemId: oi?.id || '',
            qty: Number(qty)
          };
        })
        .filter(item => item.qty > 0);

      if (itemsPayload.length === 0) {
        toast({ title: 'Error', description: 'Enter at least one return quantity.', variant: 'destructive' });
        setIsReturning(false);
        return;
      }

      await orderService.partialReturn(returnSale.id || returnSale.orderId, {
        items: itemsPayload,
        remarks: returnRemarks,
      });

      toast({ title: 'Returned', description: 'Partial return processed and inventory updated.' });
      refreshAll(true);
      setReturnSale(null);
      setSelectedOrder(null); // Close details dialog as well
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || err.message || 'Return failed.', variant: 'destructive' });
    } finally {
      setIsReturning(false);
    }
  };

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

  const { filterBySelectedFY } = useFinancialYear();

  const returnedOrders = filterBySelectedFY(orders, o => o.date || o.createdAt).filter(o => {
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
            <DialogTitle className="flex items-center justify-between text-red-600 w-full pr-6">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Return Details &middot; <span className="text-foreground text-sm md:text-base">{selectedOrder?.order_id || selectedOrder?.orderId || selectedOrder?.id}</span>
              </span>
              {selectedOrder && selectedOrder.status !== 'Returned' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => openReturnForm(selectedOrder)}
                  className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 font-semibold flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Return More
                </Button>
              )}
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
                        <th className="px-3 py-2 text-center font-medium">Qty (Ret/Ord)</th>
                        <th className="px-3 py-2 text-right font-medium">Rate</th>
                        <th className="px-3 py-2 text-left font-medium">Item Remark</th>
                        <th className="px-3 py-2 text-right font-medium">Return Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <tr key={idx} className="bg-card">
                          <td className="px-3 py-2 font-medium whitespace-nowrap animate-none">
                            {/* React crash fix: render friendly name if product is nested object, fallback to product as string */}
                            {item.productName || (typeof item.product === 'object' && item.product ? (item.product as any).name || (item.product as any).productName : item.product)}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            <span className="text-red-500">{item.returnedQty || 0} Ret</span>
                            <span className="text-muted-foreground text-[10px] ml-1">/ {item.qty} Ord</span>
                          </td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.price)}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[150px]" title={item.itemRemark || item.item_remark}>{item.itemRemark || item.item_remark || '—'}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{formatCurrency((item.returnedQty || 0) * (item.price || 0) * (1 + ((item as any).tax_percent || 0)/100))}</td>
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-red-600">{formatDate(log.returnDate)}</span>
                            {(() => {
                              let cleanRemarks = log.remarks || '';
                              const tags: {label: string, value: string, color: string}[] = [];
                              
                              const extractTag = (regex: RegExp, label: string, color: string) => {
                                const match = cleanRemarks.match(regex);
                                if (match) {
                                  tags.push({ label, value: match[1], color });
                                  cleanRemarks = cleanRemarks.replace(regex, '').trim();
                                }
                              };

                              extractTag(/\[VEHICLE:\s*([^\]]+)\]/i, 'Vehicle', 'bg-blue-50 text-blue-700 border-blue-200');
                              extractTag(/\[PR NO:\s*([^\]]+)\]/i, 'PR No', 'bg-purple-50 text-purple-700 border-purple-200');
                              extractTag(/\[SR BILL:\s*([^\]]+)\]/i, 'SR Bill', 'bg-indigo-50 text-indigo-700 border-indigo-200');
                              extractTag(/\[INVOICE:\s*([^\]]+)\]/i, 'Invoice', 'bg-emerald-50 text-emerald-700 border-emerald-200');

                              return (
                                <>
                                  {tags.map((t, i) => (
                                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${t.color}`}>
                                      {t.label}: {t.value}
                                    </span>
                                  ))}
                                  {cleanRemarks && (
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 font-medium">
                                      {cleanRemarks}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
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

      <Modal isOpen={!!returnSale} title="Partial Sales Return" onClose={() => setReturnSale(null)}>
        <div className="space-y-4">
          <div className="border border-border rounded-xl overflow-x-auto max-h-[40vh] w-full">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="py-2 px-3 text-left min-w-[150px]">Product</th>
                  <th className="py-2 px-3 text-center">Ordered</th>
                  <th className="py-2 px-3 text-center">Dispatched</th>
                  <th className="py-2 px-3 text-center">Already Returned</th>
                  <th className="py-2 px-3 text-center">Returnable</th>
                  <th className="py-2 px-3 text-center">Return Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(returnSale?.items || []).map((item: any) => {
                  const pId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
                  const pObj = productsById.get(String(pId)) || productsById.get(pId);
                  const pName = pObj?.name || pObj?.productName || item.productName || (typeof item.product === 'object' ? item.product?.name : null) || item.product || '—';
                  const ordered = item.qty || 0;
                  const dispatched = item.sentQty || item.qty || 0;
                  const alreadyReturned = item.returnedQty || item.returnedqty || 0;
                  const returnable = dispatched - alreadyReturned;
                  const currentVal = returnItems[pId];
                  return (
                    <tr key={pId} className="hover:bg-muted/5">
                      <td className="py-2 px-3 font-medium">{pName}</td>
                      <td className="py-2 px-3 text-center">{ordered}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">{dispatched}</td>
                      <td className="py-2 px-3 text-center">
                        {alreadyReturned > 0 ? <span className="text-orange-600 font-bold">{alreadyReturned}</span> : '0'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {returnable > 0 ? <span className="font-bold text-amber-600">{returnable}</span> : <span className="text-emerald-600 font-semibold">✓</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {returnable > 0 ? (
                          <input
                            type="number"
                            min={0}
                            max={returnable}
                            value={currentVal === undefined ? '' : currentVal}
                            onChange={e => {
                              const val = e.target.value;
                              setReturnItems(prev => ({ 
                                ...prev, 
                                [pId]: val === '' ? 0 : Math.min(returnable, Math.max(0, Number(val))) 
                              }));
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-20 text-center border border-border px-2 py-1 rounded-lg bg-background text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="text-[11px] font-semibold block mb-1">Return Reason / Remarks</label>
            <textarea 
              value={returnRemarks} 
              onChange={e => setReturnRemarks(e.target.value)}
              placeholder="Reason for return..."
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm min-h-[80px] resize-none outline-none focus:ring-2 focus:ring-primary/20" 
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button variant="outline" onClick={() => setReturnSale(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReturn} disabled={isReturning} className="bg-red-600 hover:bg-red-700 text-white">
              <RotateCcw className="w-4 h-4 mr-1.5" /> {isReturning ? 'Processing...' : 'Confirm Partial Return'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReturnedOrders;
