import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';

interface AdjustmentsTabProps {
  adjustments: any[];
  onAdd: () => void;
  onEdit: (adjustment: any) => void;
  onDelete: (id: string) => void;
  onRowClick: (adjustment: any) => void;
}


export const AdjustmentsTab: React.FC<AdjustmentsTabProps> = ({ 
  adjustments, 
  onAdd, 
  onEdit,
  onDelete,
  onRowClick 
}) => {

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock Adjustments (Manual)</h1>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> New Adjustment
        </Button>
      </div>
      <DataTable 
        columns={['Product', 'Warehouse', 'Change', 'Reason', 'Date']}
        rows={adjustments.map(a => [
          a.productName, 
          a.warehouseName, 
          (a.quantityChange > 0 ? `+${a.quantityChange}` : a.quantityChange) || 0, 
          a.reason, 
          a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '—'
        ])}
        onEdit={i => onEdit(adjustments[i])}
        onDelete={i => onDelete(adjustments[i].id)}
        onRowClick={i => onRowClick(adjustments[i])} 
      />

    </div>
  );
};
