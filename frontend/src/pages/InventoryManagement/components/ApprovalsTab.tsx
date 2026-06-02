import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { useApprovals, useApprovalMutations } from '@/hooks/inventory/useApprovals';
import { useWarehouses } from '@/hooks/inventory/useMasters';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { Send, Truck } from 'lucide-react';

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

const getCleanNarration = (narration: string) => {
  if (!narration) return '—';
  return narration
    .replace(/\[INVOICE:\s*[^\]]+\]/gi, '')
    .replace(/\[VEHICLE:\s*[^\]]+\]/gi, '')
    .replace(/\[DRIVER:\s*[^\]]+\]/gi, '')
    .replace(/\[DISPATCH TIME:\s*[^\]]+\]/gi, '')
    .replace(/\[REJECTION REASON:\s*[^\]]+\]/gi, '')
    .replace(/\[REJECTION DATE:\s*[^\]]+\]/gi, '')
    .replace(/\[RETURN REASON:\s*[^\]]+\]/gi, '')
    .replace(/\[RETURN DATE:\s*[^\]]+\]/gi, '')
    .trim() || '—';
};

export const ApprovalsTab: React.FC = () => {
  const { data: approvals = [], isLoading, error, refetch } = useApprovals();
  const { approve, reject, dispatchOrder, isDispatching } = useApprovalMutations();
  const { data: warehouses = [] } = useWarehouses();
  const [selected, setSelected] = useState<any>(null);
  const [dispatchTarget, setDispatchTarget] = useState<any>(null);
  const [dispatchForm, setDispatchForm] = useState<any>({
    dispatchDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    warehouseId: '',
    vehicleNumber: '',
    driverName: '',
    driverMobileNumber: '',
  });
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Ready' | 'History' | 'All'>('Pending');

  const pendingCount = approvals.filter((a: any) => a.status === 'Pending').length;
  const readyCount = approvals.filter((a: any) => a.status === 'Approved').length;
  const historyCount = approvals.filter((a: any) => !['Pending', 'Approved'].includes(a.status)).length;
  const totalCount = approvals.length;

  const filteredApprovals = approvals.filter((a: any) => {
    if (statusFilter === 'Pending') return a.status === 'Pending';
    if (statusFilter === 'Ready') return a.status === 'Approved';
    if (statusFilter === 'History') return !['Pending', 'Approved'].includes(a.status);
    return true;
  });

  const openDispatch = (approval: any) => {
    setDispatchTarget(approval);
    setDispatchForm({
      dispatchDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      warehouseId: warehouses[0]?.id || '',
      vehicleNumber: '',
      driverName: '',
      driverMobileNumber: '',
    });
  };

  const submitDispatch = async () => {
    if (!dispatchTarget) return;
    await dispatchOrder({ id: dispatchTarget.id, payload: dispatchForm });
    setDispatchTarget(null);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Approvals Manager</h1>
        
        {/* Pill filter toggle bar */}
        <div className="flex gap-1 bg-secondary/80 p-1 rounded-xl border border-border/40 shrink-0">
          {[
            { id: 'Pending', label: 'Pending', count: pendingCount },
            { id: 'Ready', label: 'Ready to Dispatch', count: readyCount },
            { id: 'History', label: 'History / Finished', count: historyCount },
            { id: 'All', label: 'All', count: totalCount }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                statusFilter === f.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                statusFilter === f.id ? 'bg-secondary text-secondary-foreground' : 'bg-background/80 text-muted-foreground'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <SafeDataView data={filteredApprovals} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Type', 'Ref ID', 'Created At', 'Status / Action']}
          rows={filteredApprovals.map((a: any) => [
            a.type, 
            a.referenceId || '—', 
            new Date(a.createdAt).toLocaleString('en-IN'),
            a.status === 'Pending' ? (
              <div className="flex gap-2" key={a.id}>
                <Button 
                  size="sm" 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold" 
                  onClick={(e) => { e.stopPropagation(); approve(a.id); }}
                >
                  Give Effect
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="font-bold"
                  onClick={(e) => { e.stopPropagation(); reject(a.id); }}
                >
                  Reject
                </Button>
              </div>
            ) : a.status === 'Approved' ? (
              <Button
                key={a.id}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={(e) => { e.stopPropagation(); openDispatch(a); }}
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Dispatch
              </Button>
            ) : (
              <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                a.status === 'Approved' || a.status === 'Completed'
                  ? 'bg-success/15 text-success border-success/30'
                  : a.status === 'Cancelled' || a.status === 'Rejected'
                  ? 'bg-destructive/15 text-destructive border-destructive/30'
                  : 'bg-primary/15 text-primary border-primary/30'
              }`} key={a.id}>
                {a.status}
              </span>
            )
          ])}
          onRowClick={i => setSelected(filteredApprovals[i])} 
        />
      </SafeDataView>

      <Modal isOpen={!!selected} title="Approval Details" onClose={() => setSelected(null)}>
        {selected && (() => {
          const order = selected.data || {};
          const orderItems = order.items || [];
          const isSalesOrder = selected.type === 'SALES_ORDER';

          const formatDate = (dateStr: any) => {
            if (!dateStr) return '—';
            try {
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return '—';
              return d.toLocaleString('en-IN');
            } catch {
              return '—';
            }
          };

          const formatCurrency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

          return (
            <div className="space-y-4 text-sm max-h-[75vh] overflow-y-auto pr-1">
              {/* Type and Ref ID Banner */}
              <div className="grid grid-cols-2 gap-2 bg-secondary/50 p-3 rounded-lg border border-border/40">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Type</span>
                  <p className="font-semibold text-foreground text-xs mt-0.5">{selected.type}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Ref ID</span>
                  <p className="font-bold text-foreground text-xs mt-0.5">{selected.referenceId}</p>
                </div>
              </div>

              {isSalesOrder ? (
                <div className="space-y-4">
                  {/* Party & Sales Officer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-3 border-border/60">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Customer / Party Name</span>
                      <p className="font-bold text-foreground text-sm">{order.partyName || order.party_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.partyType || order.party_type || 'Party'} 
                        {order.distributor && ` · Distributor: ${order.distributor}`}
                      </p>
                    </div>
                    <div className="space-y-1 md:text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Order Placed By</span>
                      <p className="font-semibold text-foreground text-sm">{order.soEmail || order.so_email || '—'}</p>
                      <p className="text-xs text-muted-foreground">Placed At: {formatDate(order.date || selected.createdAt)}</p>
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Order Items</h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Product</th>
                            <th className="px-3 py-2 text-center font-semibold">Qty</th>
                            <th className="px-3 py-2 text-right font-semibold">Rate</th>
                            <th className="px-3 py-2 text-left font-semibold">Remark</th>
                            <th className="px-3 py-2 text-right font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {orderItems.map((item: any, idx: number) => {
                            const displayName = item.productName || item.product_name || 
                              (typeof item.product === 'object' && item.product ? item.product.name || item.product.productName : item.product);
                            return (
                              <tr key={idx} className="bg-card">
                                <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{displayName || 'Unknown Product'}</td>
                                <td className="px-3 py-2 text-center font-bold text-primary">{item.qty}</td>
                                <td className="px-3 py-2 text-right">{formatCurrency(item.price)}</td>
                                <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]" title={item.itemRemark || item.item_remark}>
                                  {item.itemRemark || item.item_remark || '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-foreground">{formatCurrency(item.total)}</td>
                              </tr>
                            );
                          })}
                          {orderItems.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No items in this order</td></tr>
                          )}
                         </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Dispatch Transit Details Card */}
                  {(() => {
                    const dispatch = extractDispatchDetails(order.narration);
                    if (!dispatch) return null;
                    return (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 animate-none" /> Dispatch Transit Details
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Invoice / Challan</span>
                            <span className="font-semibold text-foreground mt-0.5 block">{dispatch.invoice}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Vehicle Details</span>
                            <span className="font-semibold text-foreground mt-0.5 block">{dispatch.vehicle}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Driver Details</span>
                            <span className="font-semibold text-foreground mt-0.5 block">
                              {dispatch.driver} {dispatch.mobile && `(${dispatch.mobile})`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Dispatch Time</span>
                            <span className="font-semibold text-foreground mt-0.5 block">{dispatch.time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Weight, Grand Total & General Narration */}
                  <div className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-3 border-border/80">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">General Narration / Remarks</span>
                      <p className="text-xs text-foreground bg-secondary/40 p-2.5 rounded-lg border border-border/20 min-h-[40px] italic">
                        {getCleanNarration(order.narration)}
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0 flex flex-col justify-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Order Grand Total</span>
                      <p className="text-xl font-extrabold text-success mt-0.5">{formatCurrency(order.grandTotal || order.grand_total)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Fallback to JSON for other approval types */
                <div className="border-t pt-2 mt-2">
                  <h3 className="font-bold mb-1">Payload Data</h3>
                  <pre className="bg-muted p-2.5 rounded text-[10px] overflow-auto max-h-40 font-mono">
                    {JSON.stringify(selected.data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              {selected.status === 'Pending' && (
                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-2">
                   <Button variant="destructive" onClick={() => { reject(selected.id); setSelected(null); }} className="px-4 py-2 font-bold h-10 shadow-sm">Reject</Button>
                   <Button onClick={() => { approve(selected.id); setSelected(null); }} className="bg-primary hover:bg-primary/95 text-white px-4 py-2 font-bold h-10 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-transform">Approve & Effect</Button>
                </div>
              )}
              {selected.status === 'Approved' && (
                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-2">
                  <Button onClick={() => openDispatch(selected)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-bold h-10 shadow-sm">
                    <Send className="w-4 h-4 mr-1.5" /> Dispatch
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={!!dispatchTarget} title="Dispatch Order" onClose={() => setDispatchTarget(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold block mb-1">Dispatch Date</label>
              <input type="date" value={dispatchForm.dispatchDate} onChange={e => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Invoice Number</label>
              <input value={dispatchForm.invoiceNumber} onChange={e => setDispatchForm({ ...dispatchForm, invoiceNumber: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Warehouse</label>
              <select value={dispatchForm.warehouseId} onChange={e => setDispatchForm({ ...dispatchForm, warehouseId: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">Select Warehouse</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Vehicle Number</label>
              <input value={dispatchForm.vehicleNumber} onChange={e => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value.toUpperCase() })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Driver Name</label>
              <input value={dispatchForm.driverName} onChange={e => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Driver Mobile Number</label>
              <input value={dispatchForm.driverMobileNumber} onChange={e => setDispatchForm({ ...dispatchForm, driverMobileNumber: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDispatchTarget(null)}>Cancel</Button>
            <Button onClick={submitDispatch} disabled={isDispatching}>
              <Send className="w-4 h-4 mr-1.5" /> Dispatch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ApprovalsTab;
