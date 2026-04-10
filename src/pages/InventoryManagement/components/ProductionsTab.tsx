import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';

interface ProductionsTabProps {
  productions: any[];
  onAdd: () => void;
  onRowClick: (production: any) => void;
}

export const ProductionsTab: React.FC<ProductionsTabProps> = ({ 
  productions, 
  onAdd, 
  onRowClick 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Production Log</h1>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> New Production Run
        </Button>
      </div>
      <DataTable 
        columns={['Finished Product', 'Qty Produced', 'Warehouse', 'Date']}
        rows={productions.map(p => [
          p.finished_product_name, 
          p.quantity_produced, 
          p.warehouse_name, 
          p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—'
        ])}
        onRowClick={i => onRowClick(productions[i])} 
      />
    </div>
  );
};
