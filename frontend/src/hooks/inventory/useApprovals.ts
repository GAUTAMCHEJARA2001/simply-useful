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
    refetchInterval: 15_000,        // Auto-refresh every 15 seconds
    refetchOnWindowFocus: true,     // Always refresh when user switches back to tab
    retry: 3,                       // Retry on failure (e.g. after a 500 error)
    staleTime: 5_000,              // Consider data stale after 5 seconds
  });
};

export const useApprovalMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/transactions/approvals/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({ title: 'Success', description: 'Action approved and effect given' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.post(`/transactions/approvals/${id}/dispatch`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast({ title: 'Dispatched', description: 'Order moved to Sales & Stock Management' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/transactions/approvals/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({ title: 'Rejected', description: 'Approval request rejected' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    dispatchOrder: dispatchMutation.mutateAsync,
    isDispatching: dispatchMutation.isPending,
    reject: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
  };
};
