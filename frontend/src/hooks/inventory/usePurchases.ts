import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const usePurchases = () => {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await api.get('/transactions/purchases');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const usePurchaseMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (purchase: any) => purchase.id 
      ? api.put(`/transactions/purchases/${purchase.id}`, purchase)
      : api.post('/transactions/purchases', purchase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast({ title: 'Success', description: 'Purchase recorded' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast({ title: 'Deleted', description: 'Purchase record removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    savePurchase: saveMutation.mutateAsync,
    deletePurchase: deleteMutation.mutateAsync,
  };
};
