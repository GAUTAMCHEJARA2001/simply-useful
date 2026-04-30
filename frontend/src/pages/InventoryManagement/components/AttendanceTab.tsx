import React from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Plus } from 'lucide-react';

interface AttendanceTabProps {
  attendance: any[];
  onAdd: () => void;
  onEdit: (attendance: any) => void;
  onDelete: (id: string) => void;
  onRowClick: (attendance: any) => void;
  Currency: (v: number) => string;
}


export const AttendanceTab: React.FC<AttendanceTabProps> = ({ 
  attendance, 
  onAdd, 
  onEdit,
  onDelete,
  onRowClick,
  Currency
}) => {

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Labour Attendance</h1>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Mark Attendance
        </Button>
      </div>
      <DataTable 
        columns={['Labour', 'Date', 'Status', 'Wage Calculated']}
        rows={attendance.map(a => [
          a.labourName,
          a.date,
          <span key={a.id} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.status === 'PRESENT' ? 'bg-green-100 text-green-700' : a.status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>,
          Currency(a.wageCalculated)
        ])}
        onEdit={i => onEdit(attendance[i])}
        onDelete={i => onDelete(attendance[i].id)}
        onRowClick={i => onRowClick(attendance[i])} 
      />

    </div>
  );
};
