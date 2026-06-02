import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus, RotateCcw } from 'lucide-react';
import { useSales, useSaleMutations } from '@/hooks/inventory/useSales';
import { useReturnMutations } from '@/hooks/inventory/useReturns';
import { SalesModal } from '../modals/SalesModal';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';

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
  const { deleteSale } = useSaleMutations();
  const { saveReturn, isSavingReturn } = useReturnMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [returnSale, setReturnSale] = useState<any>(null);
  const [returnForm, setReturnForm] = useState<any>({
    vehicleNumber: '',
    salesReturnBillNumber: '',
    returnDate: new Date().toISOString().split('T')[0],
    returnReason: '',
  });

  const handleEdit = (sale: any) => {
    setSelectedSale(sale);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedSale(null);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale record?')) return;
    await deleteSale(id);
  };

  const openReturn = (sale: any) => {
    setReturnSale(sale);
    setReturnForm({
      vehicleNumber: (sale.vehicleNumber || '').toUpperCase(),
      salesReturnBillNumber: '',
      returnDate: new Date().toISOString().split('T')[0],
      returnReason: '',
    });
  };

  const submitReturn = async () => {
    if (!returnSale) return;
    await saveReturn({
      orderId: returnSale.id,
      vehicleNumber: returnForm.vehicleNumber,
      salesReturnBillNumber: returnForm.salesReturnBillNumber,
      returnDate: returnForm.returnDate,
      returnReason: returnForm.returnReason,
    });
    setReturnSale(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sales (Invoices)</h1>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> New Sale
        </Button>
      </div>

      <SafeDataView data={sales} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Customer', 'Challan', 'Net Amount', 'Date', 'Sales Return']}
          rows={sales.map((s: any) => [
              s.customerName || s.partyName || '—', 
              s.challanNumber || extractChallanNumber(s.narration) || '—', 
              Currency(s.netAmount || s.grandTotal || s.totalAmount || 0), 
              s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—',
              <Button key={s.id} size="sm" variant="outline" onClick={() => openReturn(s)}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Sales Return
              </Button>
          ])}
          onEdit={i => handleEdit(sales[i])}
          onDelete={i => handleDelete(sales[i].id)}
        />
      </SafeDataView>

      <SalesModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        sale={selectedSale} 
      />

      <Modal isOpen={!!returnSale} title="Sales Return" onClose={() => setReturnSale(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold block mb-1">Vehicle Number</label>
              <input value={returnForm.vehicleNumber} onChange={e => setReturnForm({ ...returnForm, vehicleNumber: e.target.value.toUpperCase() })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1">Sales Return Bill Number</label>
              <input value={returnForm.salesReturnBillNumber} onChange={e => setReturnForm({ ...returnForm, salesReturnBillNumber: e.target.value })}
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
            <Button variant="outline" onClick={() => setReturnSale(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReturn} disabled={isSavingReturn}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Confirm Return
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
