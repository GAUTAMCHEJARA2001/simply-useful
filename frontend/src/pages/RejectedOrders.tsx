import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { XCircle, MapPin, User, FileText, Calendar, Box, Activity } from 'lucide-react';
import { Order } from '@/types';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

const RejectedOrders: React.FC = () => {
  const { orders } = useData();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { filterBySelectedFY } = useFinancialYear();
  const rejectedOrders = filterBySelectedFY(orders, o => o.date || o.createdAt).filter(o => o.status === 'Cancelled');

  const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleString('en-IN') : '—';
  const formatCurrency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const extractRejectReason = (narration: string) => {
    if (!narration) return '';
    const match = narration.match(/\[REJECTION REASON:\s*([^\]]+)\]/);
    return match ? match[1] : narration; // Fallback to standard narration if bracket pattern not matched
  };

  const extractRejectDate = (narration: string, updatedAt?: string) => {
    if (!narration) return formatDate(updatedAt);
    const match = narration.match(/\[REJECTION DATE:\s*([^\]]+)\]/);
    return match ? formatDate(match[1]) : formatDate(updatedAt);
  };

  const getCleanNarration = (narration: string) => {
    if (!narration) return '—';
    return narration
      .replace(/\[REJECTION REASON:\s*[^\]]+\]/g, '')
      .replace(/\[REJECTION DATE:\s*[^\]]+\]/g, '')
      .trim() || '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header flex items-center gap-2">
          <XCircle className="w-6 h-6 text-red-600" /> Rejected Orders
        </h1>
        <p className="page-subheader">Review all rejected/cancelled orders and their reasons</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Rejections ({rejectedOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={['Order ID', 'Order Date', 'Party', 'Rejection Date', 'Action']}
            rows={rejectedOrders.map(o => [
              <span key="id" className="font-semibold">{o.orderId || o.order_id || o.id}</span>,
              formatDate(o.date),
              o.partyName || o.party_name || '—',
              extractRejectDate(o.narration, o.createdAt || o.date),
              <Button key="btn" size="sm" variant="outline" onClick={() => setSelectedOrder(o)}>View Details</Button>
            ])}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby="rejection-details-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Rejection Details &middot; <span className="text-foreground">{selectedOrder?.orderId || selectedOrder?.order_id || selectedOrder?.id}</span>
            </DialogTitle>
            <DialogDescription id="rejection-details-desc" className="sr-only">
              View comprehensive details for rejected order {selectedOrder?.orderId || selectedOrder?.order_id || selectedOrder?.id}, including reasons, dates, and items.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 mt-2">
              {/* REASON */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-xs font-bold text-red-800 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Reason for Rejection</h3>
                <p className="text-sm font-medium text-red-900">{extractRejectReason(selectedOrder.narration) || 'No specific reason provided'}</p>
              </div>

              {/* DATES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/30 p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><Calendar className="w-3 h-3"/> Order Date</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(selectedOrder.date)}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border flex flex-col justify-end">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1"><Calendar className="w-3 h-3"/> Rejection Date</p>
                  <p className="text-sm font-bold text-red-600 mt-0.5">{extractRejectDate(selectedOrder.narration, selectedOrder.createdAt || selectedOrder.date)}</p>
                </div>
              </div>

              {/* PARTY & SO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Order Given By</p>
                  <p className="text-sm font-semibold">{selectedOrder.soEmail || selectedOrder.so_email}</p>
                </div>
                <div className="space-y-1 md:text-right">
                  <p className="text-xs text-muted-foreground flex items-center md:justify-end gap-1.5"><MapPin className="w-3.5 h-3.5"/> Dealer/Distributor</p>
                  <p className="text-sm font-semibold">{selectedOrder.partyName || selectedOrder.party_name}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedOrder.partyType || selectedOrder.party_type} • Linked: {selectedOrder.distributor || 'N/A'}</p>
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

export default RejectedOrders;
