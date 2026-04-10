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
          r.challan_number, 
          Currency(r.net_amount), 
          new Date(r.created_at).toLocaleDateString('en-IN')
        ])}
        onRowClick={i => onRowClick(returns[i])} 
      />
    </div>
  );
};
