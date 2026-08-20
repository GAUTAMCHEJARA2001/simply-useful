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
  });
};

export const useHRUsers = () => {
  return useQuery({
    queryKey: ['hr_users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useHRAttendance = (month: string) => {
  return useQuery({
    queryKey: ['hr_attendance', month],
    queryFn: async () => {
      const res = await api.get(`/hr/attendance?month=${month}`);
      return (res.data?.data || res.data || []) as any[];
    },
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
    }
  });
};

export const useHRDesignations = () => {
  return useQuery({
    queryKey: ['hr_designations'],
    queryFn: async () => {
      const res = await api.get('/hr/designations');
      return (res.data?.data || []) as any[];
    }
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
    mutationFn: (name: string) => api.post('/hr/designations', { name }),
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
