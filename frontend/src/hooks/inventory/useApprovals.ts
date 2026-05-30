import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const useApprovals = () => {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const res = await api.get('/transactions/approvals');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useApprovalMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/transactions/approvals/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast({ title: 'Success', description: 'Action approved and effect given' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/transactions/approvals/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast({ title: 'Rejected', description: 'Approval request rejected' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    reject: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
  };
};
