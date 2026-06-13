import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, Eye, Printer, Calendar, FileText, Landmark, User, DollarSign, Edit, XCircle } from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/inventory/usePurchaseOrders';
import { SafeDataView } from '@/components/SafeDataView';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/Modal';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/api/client';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const Qty = (v: unknown) => Number(v || 0).toLocaleString('en-IN');

const getPoQtySummary = (po: any) => {
  return (po.items || []).reduce((acc: any, item: any) => ({
    ordered: acc.ordered + Number(item.quantity || item.qty || 0),
    received: acc.received + Number(item.receivedQuantity || item.received_quantity || 0),
    pending: acc.pending + Number(item.pendingQuantity || item.pending_quantity || 0),
    extra: acc.extra + Number(item.extraReceivedQuantity || item.extra_received_quantity || 0),
  }), { ordered: 0, received: 0, pending: 0, extra: 0 });
};

export const PurchaseOrdersTab: React.FC = () => {
  const navigate = useNavigate();
  const { data: purchaseOrders = [], isLoading, error, refetch } = usePurchaseOrders();
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const filteredOrders = purchaseOrders.filter((po: any) => {
    const matchesSearch = !search || 
      (po.po_number || po.poNumber || '').toLowerCase().includes(search.toLowerCase()) || 
      (po.supplier_name || po.supplier?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (po.status || '').toUpperCase() === statusFilter;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const orderDateStr = po.order_date || po.orderDate || po.created_at || po.createdAt;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() + 86400000 : Infinity; // Include the whole end day
        matchesDate = orderDate >= start && orderDate <= end;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const viewPoDetails = (po: any) => {
    setSelectedPO(po);
  };

  const handleCancelPO = async (po: any) => {
    const confirmed = window.confirm(`Are you sure you want to cancel Purchase Order ${po.po_number || po.poNumber}?`);
    if (!confirmed) return;

    try {
      const res = await apiClient<any>(`/inv/transactions/purchase-orders/${po.id}`, {
        method: 'PUT',
        data: { status: 'CANCELLED' }
      });
      if (res.success) {
        toast({ title: 'Order Cancelled', description: `Purchase Order ${po.po_number || po.poNumber} has been successfully cancelled.` });
        refetch();
        if (selectedPO && selectedPO.id === po.id) {
          setSelectedPO({ ...selectedPO, status: 'CANCELLED' });
        }
      } else {
        toast({ title: 'Cancellation Failed', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'An error occurred while cancelling the order.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Purchase Orders</h1>
        <Button size="sm" onClick={() => navigate('/inventory/purchase-orders/new')} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Create New PO
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-2xl border border-border/50">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Search by PO Number or Supplier..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <input 
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            title="Start Date"
          />
          <input 
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            title="End Date"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-border rounded-xl px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ORDERED">Ordered</option>
          <option value="PENDING">Pending</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <SafeDataView data={filteredOrders} isLoading={isLoading} error={error} onRetry={() => refetch()} emptyMessage="No purchase orders found matching your filters.">
        <DataTable 
          columns={['PO #', 'Supplier', 'Ordered', 'Received', 'Pending', 'Extra', 'Status', 'Actions']}
          rows={filteredOrders.map((po: any) => {
            const qty = getPoQtySummary(po);
            return [
              po.po_number || po.poNumber || '---',
              po.supplier_name || po.supplier?.name || '---',
              Qty(qty.ordered),
              Qty(qty.received),
              <span key={`pending-${po.id}`} className={qty.pending > 0 ? 'font-bold text-blue-700' : 'text-muted-foreground'}>{Qty(qty.pending)}</span>,
              <span key={`extra-${po.id}`} className={qty.extra > 0 ? 'font-bold text-red-700' : 'text-muted-foreground'}>{Qty(qty.extra)}</span>,
              <span key={po.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                qty.extra > 0 ? 'bg-red-100 text-red-700' :
                (po.status || '').toUpperCase() === 'DRAFT' ? 'bg-muted text-muted-foreground' : 
                ((po.status || '').toUpperCase() === 'ORDERED' || (po.status || '').toUpperCase() === 'PENDING') ? 'bg-blue-100 text-blue-700' : 
                (po.status || '').toUpperCase() === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>{qty.extra > 0 ? 'OVER RECEIVED' : po.status}</span>,
              <div key={`actions-${po.id}`} className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); viewPoDetails(po); }} className="w-8 h-8 rounded-full" title="View Details">
                  <Eye className="w-4 h-4 text-primary" />
                </Button>
                {(po.status || '').toUpperCase() !== 'CANCELLED' && (po.status || '').toUpperCase() !== 'RECEIVED' && (
                  <>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/inventory/purchase-orders/edit/${po.id}`); }} className="w-8 h-8 rounded-full" title="Edit Order">
                      <Edit className="w-4 h-4 text-amber-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCancelPO(po); }} className="w-8 h-8 rounded-full" title="Cancel Order">
                      <XCircle className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ];
          })}
          onRowClick={i => viewPoDetails(filteredOrders[i])}
        />
      </SafeDataView>

      {/* PO View Modal */}
      {selectedPO && (
        <Modal 
          isOpen={!!selectedPO} 
          title={`Purchase Order: ${selectedPO.po_number || selectedPO.poNumber}`} 
          onClose={() => setSelectedPO(null)}
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            
            {/* Header badges */}
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {selectedPO.po_number || selectedPO.poNumber}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Issued on {new Date(selectedPO.date || selectedPO.created_at || selectedPO.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                (selectedPO.status || '').toUpperCase() === 'DRAFT' ? 'bg-muted text-muted-foreground' : 
                ((selectedPO.status || '').toUpperCase() === 'ORDERED' || (selectedPO.status || '').toUpperCase() === 'PENDING') ? 'bg-blue-100 text-blue-700' : 
                (selectedPO.status || '').toUpperCase() === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>{selectedPO.status}</span>
            </div>

            {/* Supplier & PO Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Supplier Info */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <User className="w-3.5 h-3.5" /> Supplier Information
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {selectedPO.supplier?.name || selectedPO.supplier_name || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                    {selectedPO.supplier?.address || '—'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40 text-[11px]">
                    <div>
                      <span className="font-semibold block text-muted-foreground uppercase text-[9px] tracking-wider">GST Number</span>
                      <span className="font-mono text-foreground font-medium">{selectedPO.supplier?.gst_number || selectedPO.supplier?.gstNumber || '—'}</span>
                    </div>
                    <div>
                      <span className="font-semibold block text-muted-foreground uppercase text-[9px] tracking-wider">Contact Info</span>
                      <span className="text-foreground font-medium">{selectedPO.supplier?.contact_info || selectedPO.supplier?.contactInfo || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery / PO Info */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" /> Logistics & Schedule
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Expected Date:</span>
                    <span className="font-semibold text-foreground">
                      {selectedPO.expected_date || selectedPO.expectedDate 
                        ? new Date(selectedPO.expected_date || selectedPO.expectedDate).toLocaleDateString('en-IN') 
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Warehouse Destination:</span>
                    <span className="font-semibold text-foreground">Main Warehouse Depot</span>
                  </div>
                  <div className="flex flex-col gap-0.5 pt-1">
                    <span className="text-muted-foreground">Remarks / Instructions:</span>
                    <span className="text-[11px] italic text-foreground leading-relaxed mt-0.5">
                      {selectedPO.remarks || 'No remarks provided.'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Line Items Table */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ordered Items</p>
              <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 font-bold border-b border-border/50 text-muted-foreground">
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3 text-right">Ordered</th>
                      <th className="py-2.5 px-3 text-right">Received</th>
                      <th className="py-2.5 px-3 text-right">Pending</th>
                      <th className="py-2.5 px-3 text-right">Extra</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Tax %</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPO.items || []).map((it: any, idx: number) => {
                      const qty = it.quantity || 0;
                      const received = Number(it.receivedQuantity || it.received_quantity || 0);
                      const pending = Number(it.pendingQuantity || it.pending_quantity || 0);
                      const extra = Number(it.extraReceivedQuantity || it.extra_received_quantity || 0);
                      const rate = it.rate || 0;
                      const tax = it.tax_percent || 0;
                      const total = it.line_total || it.lineTotal || (qty * rate * (1 + tax / 100));
                      return (
                        <tr key={it.id || idx} className="border-b border-border/40 hover:bg-muted/5 font-medium">
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {it.product_name || it.productName || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">{Qty(qty)} Bags</td>
                          <td className="py-2.5 px-3 text-right font-semibold">{Qty(received)} Bags</td>
                          <td className={`py-2.5 px-3 text-right font-semibold ${pending > 0 ? 'text-blue-700' : 'text-muted-foreground'}`}>{Qty(pending)} Bags</td>
                          <td className={`py-2.5 px-3 text-right font-semibold ${extra > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>{Qty(extra)} Bags</td>
                          <td className="py-2.5 px-3 text-right font-mono">{Currency(rate)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{tax}%</td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-foreground">{Currency(total)}</td>
                        </tr>
                      );
                    })}
                    {(!selectedPO.items || selectedPO.items.length === 0) && (
                      <tr>
                        <td colSpan={8} className="py-4 text-center text-muted-foreground italic">
                          No items loaded for this purchase order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 space-y-2">
              <div className="flex justify-between text-xs opacity-90 font-medium">
                <span>Subtotal (Excl. Tax)</span>
                <span className="font-mono">
                  {Currency((selectedPO.net_amount || selectedPO.netAmount || 0) - (selectedPO.total_tax || selectedPO.totalTax || 0))}
                </span>
              </div>
              <div className="flex justify-between text-xs opacity-90 font-medium pb-2 border-b border-primary-foreground/20">
                <span>Integrated GST Amount</span>
                <span className="font-mono">{Currency(selectedPO.total_tax || selectedPO.totalTax || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs uppercase font-bold tracking-wider">Grand Net Total</span>
                <span className="text-2xl font-bold font-mono">{Currency(selectedPO.net_amount || selectedPO.netAmount || 0)}</span>
              </div>
            </div>

            {/* Modal Actions & PDF Print Integration */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
              {(selectedPO.status || '').toUpperCase() !== 'CANCELLED' && (selectedPO.status || '').toUpperCase() !== 'RECEIVED' && (
                <Button variant="destructive" onClick={() => handleCancelPO(selectedPO)}>
                  Cancel Purchase Order
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedPO(null)}>
                Close
              </Button>
              <PDFGenerator 
                type="PURCHASE_ORDER"
                data={{
                  orderNo: selectedPO.po_number || selectedPO.poNumber,
                  date: new Date(selectedPO.date || selectedPO.created_at || selectedPO.createdAt).toLocaleDateString('en-IN'),
                  party: {
                    name: selectedPO.supplier?.name || selectedPO.supplier_name || '—',
                    address: selectedPO.supplier?.address || '—',
                    gst: selectedPO.supplier?.gst_number || selectedPO.supplier?.gstNumber || '—',
                    contact: selectedPO.supplier?.contact_info || selectedPO.supplier?.contactInfo || '—',
                  },
                  totals: {
                    subtotal: (selectedPO.net_amount || selectedPO.netAmount || 0) - (selectedPO.total_tax || selectedPO.totalTax || 0),
                    tax: selectedPO.total_tax || selectedPO.totalTax || 0,
                    grandTotal: selectedPO.net_amount || selectedPO.netAmount || 0,
                  },
                  items: (selectedPO.items || []).map((it: any) => ({
                    product_id: it.product_id || it.productId || '',
                    product_name: it.product_name || it.productName || '—',
                    qty: it.quantity || it.qty || 0,
                    unit: 'Bags',
                    rate: it.rate || 0,
                    total: it.line_total || it.lineTotal || (it.quantity * it.rate * (1 + it.tax_percent / 100)),
                    remark: it.remark || ''
                  }))
                }}
                filename={`${selectedPO.po_number || selectedPO.poNumber}.pdf`}
                buttonLabel="Print Purchase Order"
              />
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};
