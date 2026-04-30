import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';

interface LabourTabProps {
  labours: any[];
  onAdd: () => void;
  onEdit: (labour: any) => void;
  onDelete: (id: string) => void;
  onRowClick: (labour: any) => void;
  Currency: (v: number) => string;
}

export const LabourTab: React.FC<LabourTabProps> = ({ 
  labours, 
  onAdd, 
  onEdit, 
  onDelete, 
  onRowClick,
  Currency
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Labour Master (Staff)</h1>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Labour
        </Button>
      </div>
      <DataTable 
        columns={['Name', 'Daily Wage']}
        rows={labours.map(l => [l.name, Currency(l.dailyWage)])}
        onEdit={i => onEdit(labours[i])}
        onDelete={i => onDelete(labours[i].id)}
        onRowClick={i => onRowClick(labours[i])} 
      />
    </div>
  );
};
