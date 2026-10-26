import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const useLabour = () => {
  return useQuery({
    queryKey: ['labours'],
    queryFn: async () => {
      const res = await api.get('/masters/labours');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useLabourMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (labour: any) => labour.id 
      ? api.put(`/masters/labours/${labour.id}`, labour)
      : api.post('/masters/labours', labour),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labours'] });
      toast({ title: 'Success', description: 'Labour saved' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/masters/labours/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labours'] });
      toast({ title: 'Deleted', description: 'Labour removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    saveLabour: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteLabour: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
