import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';
import { usePurchases, usePurchaseMutations } from '@/hooks/inventory/usePurchases';
import { PurchaseModal } from '../modals/PurchaseModal';
import { SafeDataView } from '@/components/SafeDataView';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const PurchasesTab: React.FC = () => {
  const { data: purchases = [], isLoading, error, refetch } = usePurchases();
  const { deletePurchase } = usePurchaseMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

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
          columns={['Supplier', 'Items', 'Qty', 'Challan', 'Vehicle', 'Tax', 'Net Amount', 'Date']}
          rows={purchases.map((p: any) => [
            p.supplierName || p.supplier?.name || '—', 
            (p.items || []).map((it: any) => it.productName || it.product_name || '—').join(', ') || '—',
            (p.items || []).map((it: any) => `${Number(it.qty || it.quantity || 0).toLocaleString('en-IN')}`).join(', ') || '—',
            p.challanNumber || '—', 
            (p.vehicleNumber || p.vehicle_number || '—').toUpperCase(), 
            Currency(p.totalTax || 0), 
            Currency(p.netAmount || p.total_amount || p.grandTotal || 0), 
            p.date || p.createdAt ? new Date(p.date || p.createdAt).toLocaleDateString('en-IN') : '—'
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
    </div>
  );
};
