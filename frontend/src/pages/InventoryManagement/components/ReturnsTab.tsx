import { useState } from 'react';
import { useReturns } from '@/hooks/inventory/useReturns';
import { DataTable } from '@/components/DataTable';
import { SafeDataView } from '@/components/SafeDataView';
import { Button } from '@/components/ui/button';
import { Eye, Plus } from 'lucide-react';
import { ReturnOrderModal } from '../modals/ReturnOrderModal';

interface ReturnsTabProps {
  returnType?: 'Sales Return' | 'Purchase Return';
}

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const ReturnsTab: React.FC<ReturnsTabProps> = ({ returnType }) => {
  const { data: returns = [], isLoading, error, refetch } = useReturns();
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (returnOrder: any = null) => {
    setSelectedReturn(returnOrder);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">{returnType ? `${returnType}s` : 'Return Orders'}</h1>
        <Button onClick={() => handleOpenModal(null)}>
          <Plus className="w-4 h-4 mr-2" /> Add Return
        </Button>
      </div>
      <SafeDataView data={returns} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable
          columns={['Type', 'Customer/Supplier', 'Return Bill', 'Vehicle', 'Reason', 'Net Amount', 'Return Date', 'Action']}
          rows={returns.map((r: any) => [
            r.type || '-',
            r.party?.name || r.party?.dealerName || r.party?.distributorName || r.partyName || '-',
            r.challanNumber || r.challan_number || '-',
            (r.vehicleNumber || r.vehicle_number || '-').toUpperCase(),
            r.returnReason || r.return_reason || '-',
            Currency(r.netAmount || r.total_amount || 0),
            r.returnDate || r.return_date || (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '-'),
            <Button key={r.id} size="sm" variant="outline" onClick={() => handleOpenModal(r)}>
              <Eye className="w-4 h-4 mr-1.5" /> View / Edit
            </Button>
          ])}
        />
      </SafeDataView>

      <ReturnOrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        returnOrder={selectedReturn}
        defaultType={returnType}
      />
    </div>
  );
};
