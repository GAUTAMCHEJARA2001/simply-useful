import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { useProductions } from '@/hooks/inventory/useProductions';
import { useApprovalMutations } from '@/hooks/inventory/useApprovals';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { useToast } from '@/hooks/use-toast';
import { api as apiClient } from '@/api/client';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

export const ProductionApprovalsTab: React.FC = () => {
  const { data: productions = [], isLoading, error, refetch } = useProductions();
  const { approve, reject, isApproving, isRejecting } = useApprovalMutations();
  const { toast } = useToast();
  
  const [selected, setSelected] = useState<any>(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

  const { filterBySelectedFY } = useFinancialYear();

  const filteredProductions = filterBySelectedFY(productions, (p: any) => p.date || p.createdAt).filter((p: any) => {
    if (statusFilter === 'Pending') return p.status === 'Pending';
    if (statusFilter === 'Approved') return (p.status || '').toUpperCase() === 'APPROVED';
    if (statusFilter === 'Rejected') return p.status === 'Rejected';
    return true;
  });

  const pendingCount = filteredProductions.filter((p: any) => p.status === 'Pending').length;
  const approvedCount = filteredProductions.filter((p: any) => (p.status || '').toUpperCase() === 'APPROVED').length;
  const rejectedCount = filteredProductions.filter((p: any) => p.status === 'Rejected').length;
  const totalCount = filteredProductions.length;

  const handleRowClick = async (idx: number) => {
    const p = filteredProductions[idx];
    setSelected(p);
    setLoadingMaterials(true);
    setMaterials([]);
    try {
      const res = await apiClient.get(`/transactions/productions/${p.id}/materials`);
      const data = res.data?.data || res.data || [];
      setMaterials(data);
    } catch (e: any) {
      toast({ 
        title: 'Error', 
        description: 'Failed to load ingredient details: ' + (e.message || ''), 
        variant: 'destructive' 
      });
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await approve(id);
      setSelected(null);
      refetch();
    } catch (err) {}
  };

  const handleReject = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to reject this production run? This entry will not affect stock levels.')) return;
    try {
      await reject(id);
      setSelected(null);
      refetch();
    } catch (err) {}
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Production Approvals</h1>
        
        {/* Pill filter toggle bar */}
        <div className="flex gap-1 bg-secondary/80 p-1 rounded-xl border border-border/40 shrink-0">
          {[
            { id: 'Pending', label: 'Pending Approval', count: pendingCount },
            { id: 'Approved', label: 'Approved', count: approvedCount },
            { id: 'Rejected', label: 'Rejected', count: rejectedCount },
            { id: 'All', label: 'All', count: totalCount }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                statusFilter === f.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                statusFilter === f.id ? 'bg-secondary text-secondary-foreground' : 'bg-background/80 text-muted-foreground'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <SafeDataView data={filteredProductions} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Finished Product', 'Qty Produced', 'Warehouse', 'Date', 'Status / Action']}
          rows={filteredProductions.map((p: any) => [
            p.finishedProductName || '—', 
            p.quantityProduced || 0, 
            p.warehouseName || '—', 
            p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—',
            p.status === 'Pending' ? (
              <div className="flex gap-2" key={p.id}>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-7 px-2 text-[11px]" 
                  onClick={(e) => handleApprove(p.id, e)}
                >
                  Approve & Effect
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="font-bold h-7 px-2 text-[11px]"
                  onClick={(e) => handleReject(p.id, e)}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                (p.status || '').toUpperCase() === 'APPROVED'
                  ? 'bg-success/15 text-success border-success/30'
                  : 'bg-destructive/15 text-destructive border-destructive/30'
              }`} key={p.id}>
                {p.status}
              </span>
            )
          ])}
          onRowClick={handleRowClick} 
        />
      </SafeDataView>

      <Modal isOpen={!!selected} title="Production Approval Details" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4 text-sm max-h-[75vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4 bg-secondary/50 p-3 rounded-lg border border-border/40">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Finished Product</span>
                <p className="font-bold text-foreground text-sm mt-0.5">{selected.finishedProductName || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quantity</span>
                <p className="font-bold text-foreground text-sm mt-0.5">{selected.quantityProduced || 0}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Warehouse</span>
                <p className="font-semibold text-foreground text-xs mt-0.5">{selected.warehouseName || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Date</span>
                <p className="font-semibold text-foreground text-xs mt-0.5">
                  {selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'}
                </p>
              </div>
            </div>

            {/* Materials table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Raw Materials / Ingredients</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Material</th>
                      <th className="px-3 py-2 text-center font-semibold">Qty Consumed</th>
                      <th className="px-3 py-2 text-center font-semibold">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingMaterials ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                          Loading materials list...
                        </td>
                      </tr>
                    ) : materials.length > 0 ? (
                      materials.map((m: any, idx: number) => (
                        <tr key={idx} className="bg-card">
                          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{m.productName || m.name || '—'}</td>
                          <td className="px-3 py-2 text-center font-bold text-destructive">{Math.abs(m.quantity || m.qty || 0)}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{m.unit || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                          No ingredient consumption recorded for this run
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            {selected.status === 'Pending' && (
              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-2">
                <Button 
                  variant="destructive" 
                  onClick={() => handleReject(selected.id)} 
                  className="px-4 py-2 font-bold h-10 shadow-sm"
                >
                  Reject
                </Button>
                <Button 
                  onClick={() => handleApprove(selected.id)} 
                  className="bg-primary hover:bg-primary/95 text-white px-4 py-2 font-bold h-10 shadow-sm transition-transform hover:scale-[1.01]"
                >
                  Approve & Effect
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
