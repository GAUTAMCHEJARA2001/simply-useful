import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, RotateCcw, Eye } from 'lucide-react';
import { useSales, useSaleMutations } from '@/hooks/inventory/useSales';
import { SalesModal } from '../modals/SalesModal';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { orderService } from '@/api/services/order.service';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const extractChallanNumber = (narration: string) => {
  if (!narration) return '';
  let match = narration.match(/\[CHALLAN:\s*([^\]]+)\]/i);
  if (!match) {
    match = narration.match(/\[INVOICE:\s*([^\]]+)\]/i);
  }
  return match ? match[1] : '';
};

export const SalesTab: React.FC = () => {
  const { data: sales = [], isLoading, error, refetch } = useSales();
  const { deleteSale, deleteDispatchLog } = useSaleMutations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [returnSale, setReturnSale] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [returnRemarks, setReturnRemarks] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  const handleEdit = (sale: any) => {
    setSelectedSale(sale);
    setViewOnly(false);
    setModalOpen(true);
  };

  const handleView = (sale: any) => {
    setSelectedSale(sale);
    setViewOnly(true);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedSale(null);
    setViewOnly(false);
    setModalOpen(true);
  };

  const handleDelete = async (id: string, isDispatchLog?: boolean) => {
    if (!confirm(isDispatchLog ? 'Delete this dispatch transaction?' : 'Delete this sale record?')) return;
    if (isDispatchLog) {
      await deleteDispatchLog(id);
    } else {
      await deleteSale(id);
    }
  };

  const openReturn = (sale: any) => {
    setReturnSale(sale);
    setReturnRemarks('');
    
    // Initialize return quantities per item
    const initialQtys: Record<string, number> = {};
    (sale.items || []).forEach((item: any) => {
      const pId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
      if (pId) {
        const dispatched = item.sentQty || item.qty || 0;
        const alreadyReturned = item.returnedQty || 0;
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
        .map(([productId, qty]) => ({ productId, qty }))
        .filter(item => item.qty > 0);

      if (itemsPayload.length === 0) {
        toast({ title: 'Error', description: 'Enter at least one return quantity.', variant: 'destructive' });
        setIsReturning(false);
        return;
      }

      let finalRemarks = returnRemarks;
      if (returnSale.invoiceNumber || returnSale.challanNumber) {
        finalRemarks = `[INVOICE: ${returnSale.invoiceNumber || returnSale.challanNumber}] ${returnRemarks}`.trim();
      }

      await orderService.partialReturn(returnSale.originalOrderId || returnSale.id, {
        items: itemsPayload,
        remarks: finalRemarks,
      });

      toast({ title: 'Returned', description: 'Partial return processed and inventory updated.' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setReturnSale(null);
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || err.message || 'Return failed.', variant: 'destructive' });
    } finally {
      setIsReturning(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredSales = sales.filter((s: any) => {
    const customer = (s.customerName || s.partyName || '').toLowerCase();
    const challan = (s.challanNumber || s.invoiceNumber || extractChallanNumber(s.narration) || '').toLowerCase();
    const status = s.status || 'Pending';
    
    const matchesSearch = customer.includes(searchTerm.toLowerCase()) || challan.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Sales (Invoices)</h1>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by customer or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[250px] text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:ring-1 focus:ring-primary/50"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:ring-1 focus:ring-primary/50"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Partially Dispatched">Partially Dispatched</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Partially Returned">Partially Returned</option>
            <option value="Returned">Returned</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <Button size="sm" onClick={handleAdd} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> New Sale
          </Button>
        </div>
      </div>

      <SafeDataView data={sales} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Customer', 'Challan', 'Net Amount', 'Status', 'Date', 'Sales Return']}
          rows={filteredSales.map((s: any) => {
            const cleanNarration = s.narration ? s.narration
              .replace(/\[INVOICE:\s*[^\]]+\]/gi, '')
              .replace(/\[CHALLAN:\s*[^\]]+\]/gi, '')
              .replace(/\[WAREHOUSE:\s*[^\]]+\]/gi, '')
              .replace(/\[WAREHOUSE ID:\s*[^\]]+\]/gi, '')
              .replace(/\[VEHICLE:\s*[^\]]+\]/gi, '')
              .replace(/\[DRIVER:\s*[^\]]+\]/gi, '')
              .replace(/\[DRIVER MOBILE:\s*[^\]]+\]/gi, '')
              .replace(/\[DISPATCH DATE:\s*[^\]]+\]/gi, '')
              .replace(/\[DISPATCH TIME:\s*[^\]]+\]/gi, '')
              .replace(/\[REJECTION REASON:\s*[^\]]+\]/gi, '')
              .replace(/\[REJECTION DATE:\s*[^\]]+\]/gi, '')
              .replace(/\[RETURN REASON:\s*[^\]]+\]/gi, '')
              .replace(/\[RETURN DATE:\s*[^\]]+\]/gi, '')
              .replace(/\[LAST.*?\]/gi, '')
              .trim() : '';

            const status = s.status || 'Pending';
            const statusColor = 
              status === 'Partially Returned' ? 'bg-amber-100 text-amber-700 border-amber-200' :
              status === 'Returned' ? 'bg-orange-100 text-orange-700 border-orange-200' :
              status === 'Partially Dispatched' ? 'bg-violet-100 text-violet-700 border-violet-200' :
              status === 'Dispatched' ? 'bg-purple-100 text-purple-700 border-purple-200' :
              status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
              'bg-gray-100 text-gray-700 border-gray-200';

            return [
              s.customerName || s.partyName || '—', 
              s.challanNumber || s.invoiceNumber || extractChallanNumber(s.narration) || '—', 
              Currency(s.netAmount || s.grandTotal || s.totalAmount || 0),
              <span key={s.id + '-st'} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusColor}`}>{status}</span>,
              s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—',
              <div key={s.id} className="flex items-center gap-1.5 flex-wrap min-w-[140px]">
                <Button size="sm" variant="secondary" onClick={() => handleView(s)} className="h-7 text-[10px] px-2" title="View Transaction">
                  <Eye className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => openReturn(s)} className="h-7 text-[10px] px-2"
                  disabled={status === 'Returned' || status === 'Pending' || status === 'Cancelled'}>
                  <RotateCcw className="w-3 h-3 mr-1" /> {status === 'Partially Returned' ? 'Return More' : 'Return'}
                </Button>
              </div>
            ];
          })}
          onEdit={i => handleEdit(filteredSales[i])}
          onDelete={i => handleDelete(filteredSales[i].id, filteredSales[i].isDispatchLog)}
        />
      </SafeDataView>

      <SalesModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        sale={selectedSale} 
        readOnly={viewOnly}
        isDispatchLog={selectedSale?.isDispatchLog}
      />

      <Modal isOpen={!!returnSale} title="Partial Sales Return" onClose={() => setReturnSale(null)}>
        <div className="space-y-4">
          {/* Per-item return quantities */}
          <div className="border border-border rounded-xl overflow-x-auto overflow-y-auto max-h-[40vh] w-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 px-3 text-left min-w-[150px]">Product</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Ordered</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Dispatched</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Already Returned</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Returnable</th>
                  <th className="py-2 px-3 text-center whitespace-nowrap">Return Qty</th>
                </tr>
              </thead>
              <tbody>
                {(returnSale?.items || []).map((item: any) => {
                  const pId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
                  const pName = (typeof item.product === 'object' ? item.product?.name : null) || item.productName || item.product || '—';
                  const ordered = item.qty || 0;
                  const dispatched = item.sentQty || item.qty || 0;
                  const alreadyReturned = item.returnedQty || 0;
                  const returnable = dispatched - alreadyReturned;
                  const currentVal = returnItems[pId];
                  return (
                    <tr key={pId} className="border-t border-border/40">
                      <td className="py-2 px-3 font-medium">{pName}</td>
                      <td className="py-2 px-3 text-center">{ordered}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">{dispatched}</td>
                      <td className="py-2 px-3 text-center">
                        {alreadyReturned > 0 ? <span className="text-orange-600 font-bold">{alreadyReturned}</span> : '0'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {returnable > 0 ? <span className="font-bold text-amber-600">{returnable}</span> : <span className="text-emerald-600">✓</span>}
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
                            className="w-20 text-center border border-border px-2 py-1 rounded-lg bg-background text-xs font-bold focus:ring-2 focus:ring-primary/20"
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
            <textarea value={returnRemarks} onChange={e => setReturnRemarks(e.target.value)}
              placeholder="Reason for return..."
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm min-h-20 resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReturnSale(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReturn} disabled={isReturning}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> {isReturning ? 'Processing...' : 'Confirm Partial Return'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
