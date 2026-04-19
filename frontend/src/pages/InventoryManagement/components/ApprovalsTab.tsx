import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';

interface ApprovalsTabProps {
  approvals: any[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRowClick: (approval: any) => void;
  userRole: string;
  Currency: (v: number) => string;
}


export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({ 
  approvals, 
  onApprove, 
  onReject, 
  onRowClick,
  userRole,
  Currency
}) => {

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Pending Approvals</h1>
      <DataTable 
        columns={['Type', 'Ref ID', 'Created At', 'Action']}
        rows={approvals.map(a => [
          a.type, 
          a.reference_id || '—', 
          new Date(a.created_at).toLocaleString('en-IN'),
          <div className="flex gap-2" key={a.id}>
            <Button 
              size="sm" 
              variant="default" 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={(e) => { e.stopPropagation(); onApprove(a.id); }}
            >
              Give Effect
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={(e) => { e.stopPropagation(); onReject(a.id); }}
            >
              Reject
            </Button>
          </div>
        ])}
        onRowClick={i => onRowClick(approvals[i])} 
      />
    </div>
  );
};
