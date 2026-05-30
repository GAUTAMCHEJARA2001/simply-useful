import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { useApprovals, useApprovalMutations } from '@/hooks/inventory/useApprovals';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';

export const ApprovalsTab: React.FC = () => {
  const { data: approvals = [], isLoading, error, refetch } = useApprovals();
  const { approve, reject } = useApprovalMutations();
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Pending Approvals</h1>
      
      <SafeDataView data={approvals} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <DataTable 
          columns={['Type', 'Ref ID', 'Created At', 'Action']}
          rows={approvals.map((a: any) => [
            a.type, 
            a.referenceId || '—', 
            new Date(a.createdAt).toLocaleString('en-IN'),
            <div className="flex gap-2" key={a.id}>
              <Button 
                size="sm" 
                variant="default" 
                className="bg-green-600 hover:bg-green-700 text-white" 
                onClick={(e) => { e.stopPropagation(); approve(a.id); }}
              >
                Give Effect
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={(e) => { e.stopPropagation(); reject(a.id); }}
              >
                Reject
              </Button>
            </div>
          ])}
          onRowClick={i => setSelected(approvals[i])} 
        />
      </SafeDataView>

      <Modal isOpen={!!selected} title="Approval Details" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground font-medium">Type:</span><span>{selected.type}</span>
              <span className="text-muted-foreground font-medium">Ref ID:</span><span>{selected.referenceId}</span>
              <span className="text-muted-foreground font-medium">Created:</span><span>{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <h3 className="font-bold mb-1">Payload Data</h3>
              <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-40">
                {JSON.stringify(selected.data, null, 2)}
              </pre>
            </div>
            <div className="flex justify-end gap-2 pt-2">
               <Button variant="destructive" onClick={() => { reject(selected.id); setSelected(null); }}>Reject</Button>
               <Button onClick={() => { approve(selected.id); setSelected(null); }}>Approve & Effect</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
