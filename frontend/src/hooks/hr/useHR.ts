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
    mutationFn: (emp: any) => emp.id 
      ? api.put(`/hr/employees/${emp.id}`, emp)
      : api.post('/hr/employees', emp),
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
