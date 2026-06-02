import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';

interface UnitsTabProps {
  units: any[];
  userRole: string;
  onAdd: () => void;
  onEdit: (unit: any) => void;
  onDelete: (id: string) => void;
  onRowClick: (unit: any) => void;
}

export const UnitsTab: React.FC<UnitsTabProps> = ({ 
  units, 
  userRole, 
  onAdd, 
  onEdit, 
  onDelete, 
  onRowClick 
}) => {
  const canManage = ['SUPERADMIN', 'ADMIN', 'INVENTORY', 'INVENTORY_MANAGER', 'MANAGER'].includes(userRole);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Units</h1>
        {canManage && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Add
          </Button>
        )}
      </div>
      <DataTable 
        columns={['Name']}
        rows={units.map(u => [u.name])}
        onEdit={canManage ? i => onEdit(units[i]) : undefined}
        onDelete={canManage ? i => onDelete(units[i].id) : undefined}
        onRowClick={i => onRowClick(units[i])} 
      />
    </div>
  );
};
