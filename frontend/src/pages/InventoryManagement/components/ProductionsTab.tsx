import { useProductions } from '@/hooks/inventory/useProductions';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';
import { SafeDataView } from '@/components/SafeDataView';

export const ProductionsTab: React.FC = () => {
  const { data: productions = [], isLoading, error, refetch } = useProductions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Production Log</h1>
        <Button size="sm" onClick={() => {}}>
          <Plus className="w-4 h-4 mr-1.5" /> New Production Run
        </Button>
      </div>
      <SafeDataView data={productions} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Finished Product', 'Qty Produced', 'Warehouse', 'Date']}
          rows={productions.map((p: any) => [
            p.finishedProductName || p.finished_product?.name || '—', 
            p.quantityProduced || p.quantity_produced || 0, 
            p.warehouseName || p.warehouse?.name || '—', 
            p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'
          ])}
        />
      </SafeDataView>
    </div>
  );
};
