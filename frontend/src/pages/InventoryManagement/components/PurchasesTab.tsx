import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, RotateCcw } from 'lucide-react';
import { usePurchases, usePurchaseMutations } from '@/hooks/inventory/usePurchases';
import { useReturnMutations } from '@/hooks/inventory/useReturns';
import { PurchaseModal } from '../modals/PurchaseModal';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const PurchasesTab: React.FC = () => {
  const { data: purchases = [], isLoading, error, refetch } = usePurchases();
  const { deletePurchase } = usePurchaseMutations();
  const { saveReturn, isSavingReturn } = useReturnMutations();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  
  const [returnPurchase, setReturnPurchase] = useState<any>(null);
  const [returnForm, setReturnForm] = useState<any>({
    vehicleNumber: '',
    returnBillNumber: '',
    returnDate: new Date().toISOString().split('T')[0],
    returnReason: '',
  });

  const handleEdit = (purchase: any) => {
    setSelectedPurchase(purchase);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedPurchase(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this purchase record?')) return;
    await deletePurchase(id);
  };

  const openReturn = (purchase: any) => {
    setReturnPurchase(purchase);
    setReturnForm({
      vehicleNumber: (purchase.vehicleNumber || '').toUpperCase(),
      returnBillNumber: '',
      returnDate: new Date().toISOString().split('T')[0],
      returnReason: '',
    });
  };

  const submitReturn = async () => {
    if (!returnPurchase) return;
    await saveReturn({
      returnType: 'PURCHASE',
      purchaseId: returnPurchase.id,
      vehicleNumber: returnForm.vehicleNumber,
      returnBillNumber: returnForm.returnBillNumber,
      returnDate: returnForm.returnDate,
      returnReason: returnForm.returnReason,
    });
    setReturnPurchase(null);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Purchases</h1>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> New Purchase
        </Button>
      </div>

      <SafeDataView data={purchases} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Supplier', 'Items', 'Qty', 'Challan', 'Vehicle', 'Tax', 'Net Amount', 'Date', 'Return']}
          rows={purchases.map((p: any) => [
            p.supplierName || p.supplier?.name || '—', 
            (p.items || []).map((it: any) => it.productName || it.product_name || '—').join(', ') || '—',
            (p.items || []).map((it: any) => `${Number(it.qty || it.quantity || 0).toLocaleString('en-IN')}`).join(', ') || '—',
            p.challanNumber || '—', 
            (p.vehicleNumber || p.vehicle_number || '—').toUpperCase(), 
            Currency(p.totalTax || 0), 
            Currency(p.netAmount || p.total_amount || p.grandTotal || 0), 
            p.date || p.createdAt ? new Date(p.date || p.createdAt).toLocaleDateString('en-IN') : '—',
            (p.status === 'Returned' || p.status === 'CANCELLED') ? (
              <span key={`ret-${p.id}`} className="text-muted-foreground text-xs">{p.status}</span>
            ) : (
              <Button key={p.id} size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openReturn(p); }}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Return
              </Button>
            )
          ])}
          onEdit={i => handleEdit(purchases[i])}
          onDelete={i => handleDelete(purchases[i].id)}
        />
      </SafeDataView>

      <PurchaseModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        purchase={selectedPurchase} 
      />

      <Modal isOpen={!!returnPurchase} title="Purchase Return" onClose={() => setReturnPurchase(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold block mb-1">Vehicle Number</label>
              <input value={returnForm.vehicleNumber} onChange={e => setReturnForm({ ...returnForm, vehicleNumber: e.target.value.toUpperCase() })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Purchase Return Bill Number</label>
              <input value={returnForm.returnBillNumber} onChange={e => setReturnForm({ ...returnForm, returnBillNumber: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Return Date</label>
              <input type="date" value={returnForm.returnDate} onChange={e => setReturnForm({ ...returnForm, returnDate: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold block mb-1">Return Reason</label>
              <textarea value={returnForm.returnReason} onChange={e => setReturnForm({ ...returnForm, returnReason: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm min-h-24" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReturnPurchase(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReturn} disabled={isSavingReturn}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Confirm Return
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
