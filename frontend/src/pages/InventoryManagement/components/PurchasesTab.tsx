import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';

interface PurchasesTabProps {
  purchases: any[];
  onAdd: () => void;
  onEdit: (purchase: any) => void;
  onDelete: (id: string) => void;
  onRowClick: (purchase: any) => void;
  Currency: (v: number) => string;
}

export const PurchasesTab: React.FC<PurchasesTabProps> = ({ 
  purchases, 
  onAdd, 
  onEdit, 
  onDelete, 
  onRowClick,
  Currency
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Purchases</h1>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> New Purchase
        </Button>
      </div>
      <DataTable 
        columns={['Supplier', 'Challan', 'Vehicle', 'Tax', 'Net Amount', 'Date']}
        rows={purchases.map(p => [
          p.supplierName, 
          p.challanNumber, 
          p.vehicleNumber, 
          Currency(p.totalTax), 
          Currency(p.netAmount), 
          p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'
        ])}
        onEdit={i => onEdit(purchases[i])}
        onDelete={i => onDelete(purchases[i].id)}
        onRowClick={i => onRowClick(purchases[i])} 
      />
    </div>
  );
};
