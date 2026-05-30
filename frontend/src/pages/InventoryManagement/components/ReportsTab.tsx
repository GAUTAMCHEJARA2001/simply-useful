import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/DataTable';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { SafeDataView } from '@/components/SafeDataView';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export const ReportsTab: React.FC = () => {
  const { data: stock = [], isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['reports', 'stock'],
    queryFn: async () => {
      const res = await api.get('/reports/current-stock');
      return (res.data?.data || res.data || []) as any[];
    }
  });

  const { data: salesSummary = [], isLoading: salesLoading, error: salesError } = useQuery({
    queryKey: ['reports', 'sales-summary'],
    queryFn: async () => {
      const res = await api.get('/reports/sales-summary');
      return (res.data?.data || res.data || []) as any[];
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Analytics & Reports</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary/80">Current Stock Levels</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            <SafeDataView data={stock} isLoading={stockLoading} error={stockError}>
              <DataTable 
                columns={['Product', 'Warehouse', 'Stock', 'Unit', 'Min']}
                rows={stock.map((s: any) => [
                  s.product_name || s.product?.name || '—', 
                  s.warehouse_name || 'Any', 
                  Math.round(parseFloat(s.current_stock as any || 0)), 
                  s.unit?.name || (typeof s.unit === 'string' ? s.unit : '') || '—', 
                  s.minimum_stock
                ])} 
              />
            </SafeDataView>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary/80">Sales Summary (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SafeDataView data={salesSummary} isLoading={salesLoading} error={salesError}>
              <DataTable 
                columns={['Date', '# Sales', 'Revenue', 'Profit']}
                rows={salesSummary.map((r: any) => [
                  r.day || r.date || '—', 
                  r.total_sales || 0, 
                  Currency(r.total_revenue || 0), 
                  Currency(r.total_profit || 0)
                ])} 
              />
            </SafeDataView>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
