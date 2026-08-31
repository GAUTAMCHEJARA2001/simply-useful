
// --- LEAVE MANAGEMENT ---
export const useLeaveTypes = () => {
  return useQuery({
    queryKey: ['hr', 'leaveTypes'],
    queryFn: async () => {
      const res = await api.get('/hr/leave-types');
      return res.data.data;
    },
    refetchInterval: 10000
  });
};

export const useLeaveBalances = () => {
  return useQuery({
    queryKey: ['hr', 'leaveBalances'],
    queryFn: async () => {
      const res = await api.get('/hr/leave-balances');
      return res.data.data;
    },
    refetchInterval: 10000
  });
};

export const useLeaveRecords = () => {
  return useQuery({
    queryKey: ['hr', 'leaveRecords'],
    queryFn: async () => {
      const res = await api.get('/hr/leave-records');
      return res.data.data;
    },
    refetchInterval: 10000
  });
};

export const useLeaveMutations = () => {
  const queryClient = useQueryClient();

  const createLeaveType = useMutation({
    mutationFn: async (data: any) => await api.post('/hr/leave-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveTypes'] });
      toast.success('Leave Type created');
    },
    onError: () => toast.error('Failed to create Leave Type')
  });

  const updateLeaveBalance = useMutation({
    mutationFn: async (data: any) => await api.post('/hr/leave-balances', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveBalances'] });
      toast.success('Leave Balance updated');
    },
    onError: () => toast.error('Failed to update balance')
  });

  const recordLeave = useMutation({
    mutationFn: async (data: any) => await api.post('/hr/leave-records', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveBalances'] });
      toast.success('Leave recorded successfully');
    },
    onError: () => toast.error('Failed to record leave')
  });

  return { createLeaveType, updateLeaveBalance, recordLeave };
};
