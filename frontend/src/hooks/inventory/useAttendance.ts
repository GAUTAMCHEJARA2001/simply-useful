import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';

export const useAttendance = () => {
  return useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const res = await api.get('/transactions/attendance');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useAttendanceMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: (attendance: any) => attendance.id 
      ? api.put(`/transactions/attendance/${attendance.id}`, attendance)
      : api.post('/transactions/attendance', attendance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Success', description: 'Attendance marked' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/attendance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Deleted', description: 'Attendance record removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    saveAttendance: saveMutation.mutateAsync,
    deleteAttendance: deleteMutation.mutateAsync,
  };
};
