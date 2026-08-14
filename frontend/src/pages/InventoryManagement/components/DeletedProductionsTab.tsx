import React, { useState } from 'react';
import { useProductions } from '@/hooks/inventory/useProductions';
import { DataTable } from '@/components/DataTable';
import { Search } from 'lucide-react';
import { SafeDataView } from '@/components/SafeDataView';
import { formatDecimal } from '@/utils/format';
import { Input } from '@/components/ui/input';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

export const DeletedProductionsTab: React.FC = () => {
  const { data: productions = [], isLoading, error } = useProductions();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { filterBySelectedFY } = useFinancialYear();

  const filteredProductions = filterBySelectedFY(productions, (p: any) => p.date || p.createdAt).filter((p: any) => {
    if (p.status !== 'Deleted' && !p.isDeleted) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const s = [
      p.finishedProductName, p.finished_product?.name, p.warehouseName, p.warehouse?.name, p.createdAt, p.date
    ].filter(Boolean).join(' ').toLowerCase();
    return s.includes(term);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold">Deleted Production Entries</h2>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search products, warehouses..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border/50 h-10 w-full rounded-xl focus-visible:ring-1"
          />
        </div>
      </div>

      <SafeDataView isLoading={isLoading} error={error} data={filteredProductions}>
        <DataTable 
          columns={['Finished Product', 'Standard Yield', 'Actual Yield', 'Variance', 'Warehouse', 'Date', 'Status']}
          rows={filteredProductions.map((p: any) => {
            const expected = p.expectedQuantity || p.quantityProduced || 0;
            const actual = p.quantityProduced || p.quantity_produced || 0;
            const variance = actual - expected;
            return [
              p.finishedProductName || p.finished_product?.name || '—', 
              formatDecimal(expected),
              formatDecimal(actual),
              <span key="var" className={`font-bold ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {variance > 0 ? '+' : ''}{formatDecimal(variance)}
              </span>,
              p.warehouseName || p.warehouse?.name || '—', 
              p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—',
              <div key={p.id} className="flex flex-col gap-1 items-start">
                <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider bg-destructive/15 text-destructive border-destructive/30`}>
                  DELETED
                </span>
                <div className="text-[10px] text-muted-foreground flex flex-col mt-0.5 whitespace-nowrap">
                  {p.createdBy && <span>Created by {p.createdBy}</span>}
                  {p.deletedBy && <span>Deleted by {p.deletedBy}</span>}
                  {p.deleteReason && <span className="max-w-[150px] truncate" title={p.deleteReason}>Reason: {p.deleteReason}</span>}
                </div>
              </div>
            ];
          })}
        />
      </SafeDataView>
    </div>
  );
};
