import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/api/services/inventory.service';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { api } from '@/api/client';

export const useStockReport = () => {
  return useQuery({
    queryKey: [...QUERY_KEYS.inventory, 'report'],
    queryFn: async () => {
      const res = await api.get('/reports/current-stock');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useAggregateStock = () => {
  return useQuery({
    queryKey: [...QUERY_KEYS.inventory, 'aggregate'],
    queryFn: async () => {
      const res = await api.get('/reports/aggregate-stock');
      return (res.data?.data || res.data || []) as any[];
    },
  });
};
