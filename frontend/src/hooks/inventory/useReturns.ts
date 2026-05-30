import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export const useReturns = () => {
  return useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      const res = await api.get('/transactions/returns');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};
