import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const useProductions = () => {
  return useQuery({
    queryKey: ['productions'],
    queryFn: async () => {
      const res = await api.get('/transactions/productions');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useProductionMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.post('/transactions/productions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({ title: 'Success', description: 'Production recorded' });
    },
    onError: (e: any) => {
      const errData = e.response?.data || e.data;
      if (errData?.error_type !== 'NEGATIVE_RAW_MATERIALS') {
        toast({ title: 'Error', description: errData?.message || e.message || 'Save failed', variant: 'destructive' });
      }
    }
  });

  return {
    saveProduction: saveMutation.mutateAsync,
  };
};
