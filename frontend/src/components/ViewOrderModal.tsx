import React from 'react';
import { Modal } from './Modal';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PDFGenerator } from './PDF/PDFGenerator';
import { Truck, XCircle, Calendar, User, Building2, Package, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface ViewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  warehouses?: any[];
  products?: any[];
}

export const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  warehouses = [],
  products = []
}) => {
  if (!order) return null;

  const orderId = order.orderId || order.order_id || order.id || 'N/A';
  const partyName = order.partyName || order.party_name || 'N/A';
  const partyType = order.partyType || order.party_type || 'Party';
  const soEmail = order.soEmail || order.so_email || 'Unassigned';
  const status = (order.status || 'Pending').trim();
  const dateStr = order.date ? new Date(order.date).toLocaleDateString() : 'N/A';
  const narration = order.narration || order.reason || '';

  // Resolve warehouse name
  const whId = order.assignedWarehouse || order.warehouseId || order.warehouseid;
  const whMatch = warehouses.find(w => String(w.id) === String(whId) || w.name === whId);
  const warehouseName = whMatch?.name || (typeof whId === 'string' && isNaN(Number(whId)) ? whId : `Warehouse #${whId || '-'}`);

  const items: any[] = order.items || [];

  // Map products for names & bag weights if needed
  const productsMap = new Map<string, any>();
  products.forEach(p => {
    productsMap.set(String(p.id), p);
    if (p.productCode) productsMap.set(p.productCode, p);
    if (p.name) productsMap.set(p.name, p);
  });

  const totalWeight = items.reduce((sum, item) => {
    const pId = typeof item.product === 'object' ? item.product?.id : (item.productId || item.product);
    const prod = productsMap.get(String(pId)) || productsMap.get(pId);
    if (!prod) return sum;
    const match = (prod.bagSize || prod.bag_size || '').match(/(\d+)/);
    const weight = match ? parseInt(match[1]) : 0;
    return sum + (weight * (Number(item.qty) || 0));
  }, 0);

  const grandTotal = (() => {
    let total = Number(order.grandTotal) || Number(order.grand_total) || 0;
    if (items.length > 0) {
      const calculated = items.reduce((sum, i) => {
        const netQty = Math.max(0, (Number(i.qty) || 0) - (Number(i.returnedQty || i.returnedqty) || 0));
        return sum + (netQty * (Number(i.price) || 0));
      }, 0);
      if (calculated > 0 && status !== 'Pending') {
        total = calculated;
      }
    }
    return total;
  })();

  const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
    Pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-500/25' },
    Approved: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/25' },
    'Partially Dispatched': { bg: 'bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-500/25' },
    Dispatched: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/25' },
    Completed: { bg: 'bg-green-500/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-500/25' },
    Cancelled: { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-500/25' },
    'Partially Returned': { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/25' },
    Returned: { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-500/25' },
  };

  const currentStyle = statusStyles[status] || { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' };

  // Dispatch transit details
  const extractDispatch = () => {
    if (order.invoiceNumber || order.vehicleNumber || order.driverName || order.dispatchDate) {
      return {
        invoice: order.invoiceNumber || '-',
        vehicle: order.vehicleNumber || '-',
        driver: order.driverName || '-',
        mobile: order.driverMobile || '',
        time: order.dispatchDate || '-'
      };
    }
    const narr = order.narration || '';
    if (!narr) return null;
    const invoiceMatch = narr.match(/\[INVOICE:\s*([^\]]+)\]/i);
    const vehicleMatch = narr.match(/\[VEHICLE:\s*([^\]]+)\]/i);
    const driverMatch = narr.match(/\[DRIVER:\s*([^\]]+)\]/i);
    const mobileMatch = narr.match(/\[DRIVER MOBILE:\s*([^\]]+)\]/i);
    const timeMatch = narr.match(/\[DISPATCH TIME:\s*([^\]]+)\]/i);
    if (!invoiceMatch && !vehicleMatch && !driverMatch && !timeMatch) return null;
    return {
      invoice: invoiceMatch ? invoiceMatch[1].trim() : '-',
      vehicle: vehicleMatch ? vehicleMatch[1].trim() : '-',
      driver: driverMatch ? driverMatch[1].trim() : '-',
      mobile: mobileMatch ? mobileMatch[1].trim() : '',
      time: timeMatch ? timeMatch[1].trim() : '-'
    };
  };

  const dispatch = extractDispatch();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order Details · ${orderId}`} maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="bg-muted/30 border border-border/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-foreground tracking-tight">{orderId}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}>
                {status}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Ordered: <span className="font-semibold text-foreground">{dateStr}</span>
              </span>
              {(order.expectedDeliveryDate || order.expected_delivery_date) && (
                <span className="flex items-center gap-1.5 text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <Clock className="w-3.5 h-3.5" /> Delivery: {new Date(order.expectedDeliveryDate || order.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-xs text-muted-foreground block">Order Amount</span>
            <span className="text-xl font-black text-primary">₹{grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Customer & Assignment Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-primary" /> {partyType}
            </span>
            <p className="text-xs font-bold text-foreground leading-snug">{partyName}</p>
          </div>

          <div className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary" /> Sales Officer
            </span>
            <p className="text-xs font-medium text-foreground truncate" title={soEmail}>{soEmail}</p>
          </div>

          <div className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-primary" /> Warehouse
            </span>
            <p className="text-xs font-medium text-foreground">{warehouseName}</p>
          </div>
        </div>

        {/* Dispatch Details if Available */}
        {dispatch && (
          <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400">
              <Truck className="w-4 h-4" /> Dispatch Transit Details
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="font-semibold text-muted-foreground block">Invoice / Challan</span>
                <span className="font-medium text-foreground">{dispatch.invoice}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block">Vehicle Number</span>
                <span className="font-medium text-foreground">{dispatch.vehicle}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block">Driver</span>
                <span className="font-medium text-foreground">{dispatch.driver} {dispatch.mobile && `(${dispatch.mobile})`}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground block">Dispatch Time</span>
                <span className="font-medium text-foreground">{dispatch.time}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Reason if Cancelled */}
        {status === 'Cancelled' && narration && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1 text-red-700 dark:text-red-400">
            <span className="font-bold flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Reason for Cancellation / Rejection
            </span>
            <p className="opacity-90">{narration}</p>
          </div>
        )}

        {/* Items Table */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
          <div className="p-3 bg-muted/40 border-b border-border/70 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Ordered Products ({items.length})
            </h3>
            {totalWeight > 0 && (
              <span className="text-xs text-muted-foreground">
                Total Weight: <strong className="text-foreground">{totalWeight} kg</strong>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold text-[11px]">
                  <th className="text-left px-3.5 py-2.5">#</th>
                  <th className="text-left px-3.5 py-2.5">Product Name</th>
                  <th className="text-right px-3.5 py-2.5">Ordered Qty</th>
                  <th className="text-right px-3.5 py-2.5">Dispatched</th>
                  <th className="text-right px-3.5 py-2.5">Unit Price</th>
                  <th className="text-right px-3.5 py-2.5">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((item, idx) => {
                  const pId = typeof item.product === 'object' ? item.product?.id : (item.productId || item.product);
                  const prod = productsMap.get(String(pId)) || productsMap.get(pId);
                  const fallbackName = typeof item.product === 'object' 
                    ? (item.product?.name || item.product?.productName) 
                    : (item.productName || item.product_name || item.product);
                  const name = prod?.name || prod?.productName || fallbackName || 'Item';
                  const code = prod?.productCode || prod?.product_code || '';
                  const qty = Number(item.qty) || 0;
                  const sent = Number(item.sentQty || item.sentqty) || 0;
                  const price = Number(item.price) || 0;
                  const lineTotal = qty * price;

                  return (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3.5 py-2.5 text-muted-foreground text-[11px]">{idx + 1}</td>
                      <td className="px-3.5 py-2.5 font-medium text-foreground">
                        <div>{name}</div>
                        {code && <span className="text-[10px] text-muted-foreground">{code}</span>}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-foreground">{qty}</td>
                      <td className="px-3.5 py-2.5 text-right font-medium">
                        <span className={sent >= qty && qty > 0 ? 'text-green-600 font-semibold' : sent > 0 ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'}>
                          {sent}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-muted-foreground">₹{price.toLocaleString()}</td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-foreground">₹{lineTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No items in this order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks / Narration */}
        {narration && status !== 'Cancelled' && (
          <div className="p-3 bg-muted/20 border border-border/60 rounded-xl text-xs space-y-1">
            <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">Remarks / Notes:</span>
            <p className="text-foreground break-words">{narration}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/70">
          <PDFGenerator 
            type="SALES_ORDER" 
            data={order}
            filename={`Order_${orderId}.pdf`}
            buttonLabel="Print Sales Order"
            variant="outline"
          />

          <Button variant="default" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
