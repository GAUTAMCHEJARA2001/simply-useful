import React, { useState } from 'react';
import { useProductions } from '@/hooks/inventory/useProductions';
import { DataTable } from '@/components/DataTable';
import { Search, Loader2 } from 'lucide-react';
import { SafeDataView } from '@/components/SafeDataView';
import { formatDecimal } from '@/utils/format';
import { Input } from '@/components/ui/input';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { Modal } from '@/components/Modal';
import apiClient from '@/api/client';

export const DeletedProductionsTab: React.FC = () => {
  const { data: productions = [], isLoading, error } = useProductions();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { filterBySelectedFY } = useFinancialYear();

  const [viewModal, setViewModal] = useState<boolean>(false);
  const [viewData, setViewData] = useState<any>(null);
  const [viewMaterials, setViewMaterials] = useState<any[]>([]);
  const [isViewing, setIsViewing] = useState<boolean>(false);

  const filteredProductions = filterBySelectedFY(productions, (p: any) => p.date || p.createdAt).filter((p: any) => {
    if ((p.status || '').toUpperCase() !== 'DELETED' && !p.isDeleted && !p.is_deleted) return false;
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
        {isViewing && (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching details...
          </div>
        )}
        <DataTable 
          columns={['Finished Product', 'Standard Yield', 'Actual Yield', 'Variance', 'Warehouse', 'Date', 'Status']}
          onView={async (idx: number) => {
            const p = filteredProductions[idx];
            try {
              setIsViewing(true);
              const matRes = await apiClient<any[]>(`/inv/transactions/productions/${p.id}/materials`);
              const mats = matRes && matRes.data ? matRes.data : (Array.isArray(matRes) ? matRes : []);
              setViewData(p);
              setViewMaterials(mats);
              setViewModal(true);
            } catch (err) {
              console.error(err);
            } finally {
              setIsViewing(false);
            }
          }}
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

      {viewModal && viewData && (
        <Modal
          isOpen={true}
          title="Deleted Production Details"
          onClose={() => setViewModal(false)}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Finished Product</label>
                <div className="font-medium">{viewData.finishedProductName || viewData.finished_product?.name || '—'}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Warehouse</label>
                <div className="font-medium">{viewData.warehouseName || viewData.warehouse?.name || '—'}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Standard Yield</label>
                <div className="font-medium">{formatDecimal(viewData.expectedQuantity || viewData.quantityProduced || 0)}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Actual Yield</label>
                <div className="font-medium">{formatDecimal(viewData.quantityProduced || viewData.quantity_produced || 0)}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Raw Materials Consumed</h4>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs">
                    <tr>
                      <th className="p-3 font-medium">Material</th>
                      <th className="p-3 font-medium text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewMaterials.length > 0 ? viewMaterials.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3">{item.productName || item.product_name || '—'}</td>
                        <td className="p-3 text-right">{formatDecimal(item.quantity || item.qty || 0)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-muted-foreground">No materials recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm border border-destructive/20">
              <h4 className="font-bold mb-1">Deletion Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div><span className="opacity-70">Deleted By:</span> {viewData.deletedBy || 'System'}</div>
                <div><span className="opacity-70">Reason:</span> {viewData.deleteReason || 'No reason provided'}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
