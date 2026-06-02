import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';

interface SalesTabProps {
  sales: any[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRowClick: (sale: any) => void;
  Currency: (v: number) => string;
}

export const SalesTab: React.FC<SalesTabProps> = ({ 
  sales, 
  onAdd, 
  onDelete, 
  onRowClick,
  Currency
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sales (Invoices)</h1>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> New Sale
        </Button>
      </div>
      <DataTable 
        columns={['Customer', 'Challan', 'Net Amount', 'Profit', 'Date']}
        rows={sales.map(s => [
            s.customerName, 
            s.challanNumber, 
            Currency(s.netAmount), 
            Currency(s.totalProfit), 
            s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—'
        ])}
        onDelete={i => onDelete(sales[i].id)}
        onRowClick={i => onRowClick(sales[i])} 
      />
    </div>
  );
};
