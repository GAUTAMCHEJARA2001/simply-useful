import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/DataTable';

interface ReportsTabProps {
  stock: any[];
  salesSummary: any[];
  Currency: (v: number) => string;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ 
  stock, 
  salesSummary, 
  Currency 
}) => {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Analytics & Reports</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary/80">Current Stock Levels</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            <DataTable 
              columns={['Product', 'Warehouse', 'Stock', 'Unit', 'Min']}
              rows={stock.map(s => [
                s.product_name, 
                s.warehouse_name || 'Any', 
                Math.round(parseFloat(s.current_stock as any)), 
                s.unit, 
                s.minimum_stock
              ])} 
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary/80">Sales Summary (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable 
              columns={['Date', '# Sales', 'Revenue', 'Profit']}
              rows={salesSummary.map(r => [
                r.day, 
                r.total_sales, 
                Currency(r.total_revenue), 
                Currency(r.total_profit)
              ])} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
