import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';
import { useSales, useSaleMutations } from '@/hooks/inventory/useSales';
import { SalesModal } from '../modals/SalesModal';
import { SafeDataView } from '@/components/SafeDataView';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const SalesTab: React.FC = () => {
  const { data: sales = [], isLoading, error, refetch } = useSales();
  const { deleteSale } = useSaleMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

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
          columns={['Customer', 'Challan', 'Net Amount', 'Profit', 'Date']}
          rows={sales.map((s: any) => [
              s.customerName || s.partyName || '—', 
              s.challanNumber || '—', 
              Currency(s.netAmount || s.totalAmount || 0), 
              Currency(s.totalProfit || 0), 
              s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—'
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
    </div>
  );
};
