import { useReturns } from '@/hooks/inventory/useReturns';
import { DataTable } from '@/components/DataTable';
import { SafeDataView } from '@/components/SafeDataView';

const Currency = (v: number | string) => `Rs ${Number(v || 0).toLocaleString('en-IN')}`;

export const ReturnsTab: React.FC = () => {
  const { data: returns = [], isLoading, error, refetch } = useReturns();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Return Orders</h1>
      <SafeDataView data={returns} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable
          columns={['Type', 'Return Bill', 'Vehicle', 'Reason', 'Net Amount', 'Return Date']}
          rows={returns.map((r: any) => [
            r.type || '-',
            r.challanNumber || r.challan_number || '-',
            (r.vehicleNumber || r.vehicle_number || '-').toUpperCase(),
            r.returnReason || r.return_reason || '-',
            Currency(r.netAmount || r.total_amount || 0),
            r.returnDate || r.return_date || (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '-')
          ])}
        />
      </SafeDataView>
    </div>
  );
};
