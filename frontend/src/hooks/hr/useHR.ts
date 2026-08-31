import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const useHREmployees = () => {
  return useQuery({
    queryKey: ['hr_employees'],
    queryFn: async () => {
      const res = await api.get('/hr/employees');
      return (res.data?.data || res.data || []) as any[];
    },
    refetchInterval: 10000,
  });
};

export const useHRUsers = () => {
  return useQuery({
    queryKey: ['hr_users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return (res.data?.data || res.data || []) as any[];
    },
    refetchInterval: 10000,
  });
};

export const useHRAttendance = (month: string) => {
  return useQuery({
    queryKey: ['hr_attendance', month],
    queryFn: async () => {
      const res = await api.get(`/hr/attendance?month=${month}`);
      return (res.data?.data || res.data || []) as any[];
    },
    refetchInterval: 10000,
    enabled: !!month
  });
};

export const useHRPayroll = (month: string) => {
  return useQuery({
    queryKey: ['hr_payroll', month],
    queryFn: async () => {
      const res = await api.get(`/hr/payroll/generate?month=${month}`);
      return (res.data?.data || res.data || []) as any[];
    },
    refetchInterval: 10000,
    enabled: !!month
  });
};

export const useHREmployeeMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (emp: any) => {
      const id = emp instanceof FormData ? emp.get('id') : emp.id;
      return id 
        ? api.put(`/hr/employees/${id}`, emp)
        : api.post('/hr/employees', emp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_employees'] });
      toast({ title: 'Success', description: 'Employee saved successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_employees'] });
      toast({ title: 'Success', description: 'Employee deactivated' });
    }
  });

  return {
    saveEmployee: saveMutation.mutateAsync,
    deleteEmployee: deleteMutation.mutateAsync,
  };
};

export const useHRAttendanceMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (records: any[]) => api.post('/hr/attendance', { records }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_attendance'] });
      toast({ title: 'Success', description: 'Attendance saved successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    saveAttendance: saveMutation.mutateAsync
  };
};

// --- MASTERS ---

export const useHRDepartments = () => {
  return useQuery({
    queryKey: ['hr_departments'],
    queryFn: async () => {
      const res = await api.get('/hr/departments');
      return (res.data?.data || []) as any[];
    },
    refetchInterval: 10000
  });
};

export const useHRDesignations = () => {
  return useQuery({
    queryKey: ['hr_designations'],
    queryFn: async () => {
      const res = await api.get('/hr/designations');
      return (res.data?.data || []) as any[];
    },
    refetchInterval: 10000
  });
};

export const useHRMasterMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addDepartment = useMutation({
    mutationFn: (name: string) => api.post('/hr/departments', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_departments'] });
      toast({ title: 'Success', description: 'Department added' });
    }
  });
  const deleteDepartment = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/departments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr_departments'] })
  });

  const addDesignation = useMutation({
    mutationFn: (data: { name: string, department_id?: number }) => api.post('/hr/designations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_designations'] });
      toast({ title: 'Success', description: 'Designation added' });
    }
  });
  const deleteDesignation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/designations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr_designations'] })
  });

  return {
    addDepartment: addDepartment.mutateAsync,
    deleteDepartment: deleteDepartment.mutateAsync,
    addDesignation: addDesignation.mutateAsync,
    deleteDesignation: deleteDesignation.mutateAsync
  };
};

export const useEmployeeLedger = (labourId: number | string) => {
  return useQuery({
    queryKey: ['hr_ledger', labourId],
    queryFn: async () => {
      if (!labourId) return null;
      const res = await api.get('/hr/ledger/' + labourId);
      return res.data?.data;
    },
    refetchInterval: 10000,
    enabled: !!labourId
  });
};

export const useLedgerMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const finalizePayroll = useMutation({
    mutationFn: (data: { month: string, slips: any[] }) => api.post('/hr/payroll/finalize', data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Payroll finalized successfully' });
      queryClient.invalidateQueries({ queryKey: ['hr_payroll'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const recordPayment = useMutation({
    mutationFn: (data: { labour_id: number, amount: number, description?: string, date?: string }) => api.post('/hr/ledger/payment', data),
    onSuccess: (_, variables) => {
      toast({ title: 'Success', description: 'Payment recorded successfully' });
      queryClient.invalidateQueries({ queryKey: ['hr_ledger', variables.labour_id] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  const markSlipPaid = useMutation({
    mutationFn: async (data: { labour_id: number; month: string; amount: number; date?: string; payment_mode?: string; payment_reference?: string; remark?: string }) => {
      const res = await api.post('/hr/payroll/mark-paid', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_payroll'] });
      queryClient.invalidateQueries({ queryKey: ['hr_ledger'] });
    }
  });

  return { finalizePayroll: finalizePayroll.mutateAsync, recordPayment: recordPayment.mutateAsync, markSlipPaid: markSlipPaid.mutateAsync };
};



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
  const { toast } = useToast();

  const createLeaveType = useMutation({
    mutationFn: async (data: any) => await api.post('/hr/leave-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveTypes'] });
      toast({ title: 'Success', description: 'Leave Type created' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create Leave Type', variant: 'destructive' })
  });

  const updateLeaveBalance = useMutation({
    mutationFn: async (data: any) => await api.post('/hr/leave-balances', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveBalances'] });
      toast({ title: 'Success', description: 'Leave Balance updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update balance', variant: 'destructive' })
  });

  const recordLeave = useMutation({
    mutationFn: async (data: any) => await api.post('/hr/leave-records', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveBalances'] });
      toast({ title: 'Success', description: 'Leave recorded successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to record leave', variant: 'destructive' })
  });

  const updateLeaveRecord = useMutation({
    mutationFn: async ({ id, ...data }: any) => await api.put(`/hr/leave-records/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveBalances'] });
      toast({ title: 'Success', description: 'Leave record updated' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update leave record', variant: 'destructive' })
  });

  const deleteLeaveRecord = useMutation({
    mutationFn: async (id: string | number) => await api.delete(`/hr/leave-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveRecords'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveBalances'] });
      toast({ title: 'Success', description: 'Leave record deleted' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete leave record', variant: 'destructive' })
  });

  const autoFetchLeaves = useMutation({
    mutationFn: async () => await api.post('/hr/leaves/auto-fetch'),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveRecords'] });
      toast({ title: 'Auto Fetch Complete', description: res?.data?.message || 'Leave records synchronized with attendance.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to auto fetch leaves', variant: 'destructive' })
  });

  return { createLeaveType, updateLeaveBalance, recordLeave, updateLeaveRecord, deleteLeaveRecord, autoFetchLeaves };
};

export const useLeavePolicies = () => {
  return useQuery({
    queryKey: ['hr', 'leavePolicies'],
    queryFn: async () => {
      const res = await api.get('/hr/leave-policies');
      return res.data?.data || [];
    },
    refetchInterval: 10000
  });
};

export const useLeavePolicyMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createPolicy = useMutation({
    mutationFn: async (data: any) => await api.post('/hr/leave-policies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leavePolicies'] });
      toast({ title: 'Success', description: 'Leave Policy created' });
    }
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => await api.put(`/hr/leave-policies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leavePolicies'] });
      toast({ title: 'Success', description: 'Leave Policy updated' });
    }
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: number) => await api.delete(`/hr/leave-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leavePolicies'] });
      toast({ title: 'Success', description: 'Leave Policy deleted' });
    }
  });

  const allocateLeaves = useMutation({
    mutationFn: async () => await api.post('/hr/leaves/allocate', {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveBalances'] });
      toast({ title: 'Success', description: res.data?.message || 'Leaves allocated successfully' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to allocate leaves', variant: 'destructive' });
    }
  });

  return { createPolicy, updatePolicy, deletePolicy, allocateLeaves };
};
