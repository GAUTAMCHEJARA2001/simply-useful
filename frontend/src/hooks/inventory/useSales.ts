import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { useWarehouse } from '@/contexts/WarehouseContext';

export const useSales = () => {
  const { activeWarehouseId } = useWarehouse();
  return useQuery({
    queryKey: ['sales', activeWarehouseId],
    queryFn: async () => {
      const res = await api.get('/transactions/sales');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useSaleMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (sale: any) => {
      const config = sale.warehouse_id ? { headers: { 'X-Warehouse-ID': String(sale.warehouse_id) } } : undefined;
      return sale.id 
        ? api.put(`/transactions/sales/${sale.id}`, sale, config)
        : api.post('/transactions/sales', sale, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Success', description: 'Sale recorded' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Deleted', description: 'Sale record removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const saveDispatchMutation = useMutation({
    mutationFn: (log: any) => {
      const config = log.warehouse_id ? { headers: { 'X-Warehouse-ID': String(log.warehouse_id) } } : undefined;
      return api.put(`/transactions/dispatch-logs/${log.id}`, log, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Success', description: 'Dispatch updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteDispatchMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/dispatch-logs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({ title: 'Deleted', description: 'Dispatch record removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    saveSale: saveMutation.mutateAsync,
    deleteSale: deleteMutation.mutateAsync,
    saveDispatchLog: saveDispatchMutation.mutateAsync,
    deleteDispatchLog: deleteDispatchMutation.mutateAsync,
  };
};
