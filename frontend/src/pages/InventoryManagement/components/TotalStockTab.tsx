import React from 'react';
import { Package, Warehouse } from 'lucide-react';
import { DataTable } from '@/components/DataTable';

interface TotalStockTabProps {
  aggregateStock: any[];
  stock: any[];
}

export const TotalStockTab: React.FC<TotalStockTabProps> = ({ aggregateStock, stock }) => {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Aggregate Stock (Unified View)
        </h1>
        <DataTable 
          columns={['Product', 'SKU', 'Category', 'Total Stock', 'Unit']}
          rows={(aggregateStock || []).map(s => [
            s.product_name, 
            s.sku, 
            s.category_name, 
            Math.round(parseFloat(s.total_stock)), 
            s.unit
          ])}
        />
      </section>

      <section>
        <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-primary" />
          Stock Breakdown by Warehouse
        </h1>
        <DataTable 
          columns={['Product', 'Warehouse', 'Current Stock', 'Unit', 'Status']}
          rows={(stock || []).map(s => [
            s.product_name, 
            s.warehouse_name || 'Unassigned', 
            Math.round(parseFloat(s.current_stock as any)), 
            s.unit,
            <span key={s.product_id + s.warehouse_id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${parseFloat(s.current_stock as any) <= s.minimum_stock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {parseFloat(s.current_stock as any) <= s.minimum_stock ? 'LOW' : 'OK'}
            </span>
          ])}
        />
      </section>
    </div>
  );
};
