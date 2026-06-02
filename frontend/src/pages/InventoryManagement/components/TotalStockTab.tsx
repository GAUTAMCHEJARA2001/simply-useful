import React, { useState, useEffect } from 'react';
import { Package, Warehouse, Filter } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { useStockReport, useAggregateStock } from '@/hooks/inventory/useStock';
import { useWarehouses } from '@/hooks/inventory/useMasters';
import { SafeDataView } from '@/components/SafeDataView';
import { useAuth } from '@/contexts/AuthContext';

export const TotalStockTab: React.FC = () => {
  const { user } = useAuth();
  const isInventoryOnly = user?.role === 'INVENTORY';
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(isInventoryOnly ? '' : 'all');
  
  const { data: stock = [], isLoading: stockLoading, error: stockError, refetch: refetchStock } = useStockReport();
  const { data: aggregateStock = [], isLoading: aggLoading, error: aggError, refetch: refetchAgg } = useAggregateStock();
  const { data: warehouses = [], isLoading: whLoading } = useWarehouses();

  useEffect(() => {
    if (isInventoryOnly && warehouses.length > 0 && (selectedWarehouseId === 'all' || selectedWarehouseId === '')) {
      setSelectedWarehouseId(warehouses[0].id.toString());
    }
  }, [isInventoryOnly, warehouses, selectedWarehouseId]);

  const loading = stockLoading || aggLoading || whLoading;
  const error = (stockError || aggError) ? ((stockError || aggError) as any).message : null;

  const filteredStock = selectedWarehouseId === 'all' 
    ? stock
    : selectedWarehouseId === ''
      ? []
      : stock.filter(s => s.warehouseId?.toString() === selectedWarehouseId);

  const selectedWarehouseName = selectedWarehouseId === 'all' 
    ? 'All Warehouses' 
    : warehouses.find(w => w.id?.toString() === selectedWarehouseId)?.name || 'Filtered Warehouse';

  const onRetry = () => { refetchStock(); refetchAgg(); };

  return (
    <SafeDataView data={aggregateStock} isLoading={loading} error={error} onRetry={onRetry}>
      <div className="space-y-8 pb-10">
        {!isInventoryOnly && (
          <section>
            <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Aggregate Stock (Unified View)
            </h1>
            <DataTable 
              columns={['Product', 'SKU', 'Category', 'Total Stock', 'Unit']}
              rows={(aggregateStock || []).map(s => [
                s.productName, 
                s.sku, 
                s.categoryName, 
                Math.round(parseFloat(s.totalStock || 0)), 
                s.unit?.name || (typeof s.unit === 'string' ? s.unit : '') || '—'
              ])}
            />
          </section>
        )}

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-4 border-t border-border">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-primary" />
              Stock Breakdown: <span className="text-muted-foreground font-medium">{selectedWarehouseName}</span>
            </h1>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold whitespace-nowrap">Filter Warehouse:</Label>
                <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                  <SelectTrigger className="h-8 w-[180px] border-none bg-transparent shadow-none focus:ring-0">
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {!isInventoryOnly && <SelectItem value="all">All Warehouses</SelectItem>}
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DataTable 
            columns={['Product', 'SKU', 'Warehouse', 'Current Stock', 'Unit', 'Status']}
            rows={filteredStock.map(s => [
              s.productName, 
              `${s.sku}-${s.warehouseName || 'Unassigned'}`,
              s.warehouseName || 'Unassigned', 
              Math.round(parseFloat(s.currentStock as any || 0)), 
              s.unit?.name || (typeof s.unit === 'string' ? s.unit : '') || '—',
              <span key={(s.productId || '') + (s.warehouseId || '')} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${parseFloat(s.currentStock as any || 0) <= (s.minimumStock || 0) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {parseFloat(s.currentStock as any || 0) <= (s.minimumStock || 0) ? 'LOW' : 'OK'}
              </span>
            ])}
          />
          {filteredStock.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border mt-4">
              <Package className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-sm">No stock records found for this selection.</p>
            </div>
          )}
        </section>
      </div>
    </SafeDataView>
  );
};
