import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const useReturns = () => {
  return useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      const res = await api.get('/transactions/returns');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useReturnMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.post('/transactions/returns', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast({ title: 'Returned', description: 'Return processed and inventory updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    saveReturn: saveMutation.mutateAsync,
    isSavingReturn: saveMutation.isPending,
  };
};
