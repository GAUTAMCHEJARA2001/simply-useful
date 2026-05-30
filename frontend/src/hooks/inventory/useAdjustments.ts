import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const useAdjustments = () => {
  return useQuery({
    queryKey: ['adjustments'],
    queryFn: async () => {
      const res = await api.get('/transactions/adjustments');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useAdjustmentMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (adjustment: any) => adjustment.id 
      ? api.put(`/transactions/adjustments/${adjustment.id}`, adjustment)
      : api.post('/transactions/adjustments', adjustment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      toast({ title: 'Success', description: 'Adjustment recorded' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/adjustments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      toast({ title: 'Deleted', description: 'Adjustment removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    saveAdjustment: saveMutation.mutateAsync,
    deleteAdjustment: deleteMutation.mutateAsync,
  };
};
