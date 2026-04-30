import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';

interface SuppliersTabProps {
  suppliers: any[];
  onAdd: () => void;
  onEdit: (supplier: any) => void;
  onDelete: (id: string) => void;
  onRowClick: (supplier: any) => void;
  Currency: (v: number) => string;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({ 
  suppliers, 
  onAdd, 
  onEdit, 
  onDelete, 
  onRowClick,
  Currency
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Suppliers</h1>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add
        </Button>
      </div>
      <DataTable 
        columns={['Name', 'Contact', 'Address', 'GST', 'Balance']}
        rows={suppliers.map(s => [s.name, s.contactInfo, s.address, s.gstNumber, Currency(s.balance)])}
        onEdit={i => onEdit(suppliers[i])}
        onDelete={i => onDelete(suppliers[i].id)}
        onRowClick={i => onRowClick(suppliers[i])} 
      />
    </div>
  );
};
