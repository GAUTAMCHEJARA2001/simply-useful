import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSettings } from '@/hooks/inventory/useMasters';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { SafeDataView } from '@/components/SafeDataView';

export const SettingsTab: React.FC = () => {
  const { data: settingsData, isLoading, error, refetch } = useSettings();
  const [form, setForm] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (settingsData) setForm(settingsData);
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put('/masters/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Success', description: 'Settings updated' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  });

  if (!form && !isLoading) return null;

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-bold">App Settings</h1>
      <SafeDataView data={form} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Stock Valuation Method</label>
              <select 
                value={form?.stock_method || 'FIFO'} 
                onChange={e => setForm({ ...form, stock_method: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm"
              >
                <option value="FIFO">FIFO</option>
                <option value="LIFO">LIFO</option>
                <option value="WEIGHTED_AVG">Weighted Average</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="neg" 
                checked={form?.allow_negative_stock || false}
                onChange={e => setForm({ ...form, allow_negative_stock: e.target.checked })} 
                className="rounded" 
              />
              <label htmlFor="neg" className="text-sm font-medium">Allow Negative Stock</label>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Company Name</label>
              <input 
                value={form?.company_name || ''} 
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" 
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Currency Symbol</label>
              <input 
                value={form?.currency_symbol || '₹'} 
                onChange={e => setForm({ ...form, currency_symbol: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" 
              />
            </div>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </SafeDataView>
    </div>
  );
};
