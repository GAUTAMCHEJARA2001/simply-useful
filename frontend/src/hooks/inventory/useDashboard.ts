import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/api/services/inventory.service';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { KPIs, StockItem } from '@/types';

export const useDashboardKPIs = () => {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardKpis,
    queryFn: async () => {
      const res = await inventoryService.getDashboardKPIs();
      return (res.data?.data || res.data) as KPIs;
    },
  });
};

export const useSalesSummary = () => {
  return useQuery({
    queryKey: ['reports', 'sales-summary'],
    queryFn: async () => {
      const res = await inventoryService.getSalesSummary();
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useLowStock = () => {
  return useQuery({
    queryKey: ['reports', 'low-stock'],
    queryFn: async () => {
      const res = await inventoryService.getLowStock();
      return (res.data?.data || res.data || []) as StockItem[];
    },
  });
};

export const useDailyReport = () => {
  return useQuery({
    queryKey: ['reports', 'daily'],
    queryFn: async () => {
      const res = await inventoryService.getDailyReport();
      return res.data?.data || res.data;
    },
  });
};
