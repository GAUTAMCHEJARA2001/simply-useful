import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await api.get('/transactions/purchase-orders');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};
