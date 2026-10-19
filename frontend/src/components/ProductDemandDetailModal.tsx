import React from 'react';
import { Modal } from './Modal';
import { Button } from './ui/button';
import { Eye, Package, Calendar, User, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ContributingOrder {
  orderId: string;
  orderDbId?: string;
  partyName: string;
  partyType?: string;
  qtyNeeded: number;
  orderedQty: number;
  sentQty: number;
  status: string;
  soEmail?: string;
  date?: string;
  rawOrder?: any;
}

export interface DemandProductInfo {
  product: string;
  qty: number;
  readyQty: number;
  deficit: number;
  orders: number;
  orderBreakdown: ContributingOrder[];
}

interface ProductDemandDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productDemand: DemandProductInfo | null;
  onViewOrder?: (order: any) => void;
}

export const ProductDemandDetailModal: React.FC<ProductDemandDetailModalProps> = ({
  isOpen,
  onClose,
  productDemand,
  onViewOrder
}) => {
  if (!productDemand) return null;

  const { product = 'Product', qty = 0, readyQty = 0, deficit = 0, orderBreakdown = [] } = productDemand;

  const statusStyles: Record<string, string> = {
    Pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    Approved: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    'Partially Dispatched': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Orders Requiring · ${product}`} 
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Total Needed</span>
            <span className="text-xl font-bold text-primary">{qty.toLocaleString()}</span>
          </div>

          <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Ready Stock</span>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">
              {readyQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Stock Deficit</span>
            <span className={`text-xl font-bold ${deficit > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
              {deficit > 0 ? deficit.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0 (Fulfilled)'}
            </span>
          </div>

          <div className="p-3 bg-muted/40 border border-border/70 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Active Orders</span>
            <span className="text-xl font-bold text-foreground">{orderBreakdown.length}</span>
          </div>
        </div>

        {/* Stock Status Notice */}
        {deficit > 0 ? (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Stock Shortage:</strong> You need <strong>{deficit.toLocaleString()}</strong> more units of <strong>{product}</strong> to fulfill all pending customer orders.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              <strong>Stock Sufficient:</strong> Current ready stock ({readyQty.toLocaleString()}) covers all active demand ({qty.toLocaleString()} units).
            </span>
          </div>
        )}

        {/* Breakdown Table */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
          <div className="p-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Customer Order Breakdown
            </h3>
            <span className="text-xs text-muted-foreground">
              Showing which party needs what quantity
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold text-[11px]">
                  <th className="text-left px-3.5 py-2.5">Order ID</th>
                  <th className="text-left px-3.5 py-2.5">Customer / Party Name</th>
                  <th className="text-right px-3.5 py-2.5 font-bold text-primary">Qty Needed</th>
                  <th className="text-right px-3.5 py-2.5">Total Ordered</th>
                  <th className="text-right px-3.5 py-2.5">Already Sent</th>
                  <th className="text-center px-3.5 py-2.5">Status</th>
                  <th className="text-right px-3.5 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orderBreakdown.map((item, idx) => {
                  const style = statusStyles[item.status] || 'bg-muted text-foreground border-border';
                  const formattedDate = item.date ? new Date(item.date).toLocaleDateString() : '';

                  return (
                    <tr key={`${item.orderId}-${idx}`} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3.5 py-2.5 font-bold text-foreground">
                        <div className="font-mono text-[11px] text-primary">{item.orderId}</div>
                        {formattedDate && <span className="text-[10px] text-muted-foreground">{formattedDate}</span>}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-foreground">
                        <div>{item.partyName}</div>
                        {item.soEmail && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            SO: {item.soEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-black text-sm text-primary">
                        {item.qtyNeeded.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-muted-foreground">
                        {item.orderedQty.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-medium">
                        <span className={item.sentQty > 0 ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                          {item.sentQty.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${style}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        {onViewOrder && item.rawOrder && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                            onClick={() => onViewOrder(item.rawOrder)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orderBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No active orders found for this product.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border/70">
          <Button variant="default" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
