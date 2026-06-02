import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { RefreshCw, MapPin, User, FileText, Calendar, Box, Activity } from 'lucide-react';
import { Order } from '@/types';

const ReturnedOrders: React.FC = () => {
  const { orders } = useData();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const returnedOrders = orders.filter(o => o.status === 'Returned');

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
      <div>
        <h1 className="page-header flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-red-600" /> Returned Orders
        </h1>
        <p className="page-subheader">Review all returned orders and their reasons</p>
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
              formatDate(extractReturnDate(o.narration, o.updatedAt || o.date || o.createdAt)),
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
                  <p className="text-sm font-bold text-red-600 mt-0.5">{formatDate(extractReturnDate(selectedOrder.narration, selectedOrder.updatedAt || selectedOrder.date || selectedOrder.createdAt))}</p>
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
