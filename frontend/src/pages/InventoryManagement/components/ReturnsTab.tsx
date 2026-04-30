import React from 'react';
import { DataTable } from '@/components/DataTable';

interface ReturnsTabProps {
  returns: any[];
  onRowClick: (ret: any) => void;
  Currency: (v: number) => string;
}

export const ReturnsTab: React.FC<ReturnsTabProps> = ({ 
  returns, 
  onRowClick,
  Currency
}) => {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Return Orders</h1>
      <DataTable 
        columns={['Type', 'Challan', 'Net Amount', 'Date']}
        rows={returns.map(r => [
          r.type, 
          r.challanNumber, 
          Currency(r.netAmount), 
          new Date(r.createdAt).toLocaleDateString('en-IN')
        ])}
        onRowClick={i => onRowClick(returns[i])} 
      />
    </div>
  );
};
