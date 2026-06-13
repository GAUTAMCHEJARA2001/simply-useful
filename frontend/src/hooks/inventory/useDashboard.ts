import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/api/services/inventory.service';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { KPIs, StockItem } from '@/types';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { useWarehouse } from '@/contexts/WarehouseContext';

export const useDashboardKPIs = () => {
  const { selectedFY } = useFinancialYear();
  const { activeWarehouseId } = useWarehouse();
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboardKpis(selectedFY), activeWarehouseId],
    queryFn: async () => {
      const res = await inventoryService.getDashboardKPIs();
      return (res.data?.data || res.data) as KPIs;
    },
  });
};

export const useSalesSummary = () => {
  const { selectedFY } = useFinancialYear();
  const { activeWarehouseId } = useWarehouse();
  return useQuery({
    queryKey: [...QUERY_KEYS.salesSummary(selectedFY), activeWarehouseId],
    queryFn: async () => {
      const res = await inventoryService.getSalesSummary();
      return (res.data?.data || res.data || []) as any[];
    },
  });
};

export const useLowStock = () => {
  // Stock levels are live — not FY-scoped
  const { activeWarehouseId } = useWarehouse();
  return useQuery({
    queryKey: [...QUERY_KEYS.lowStock(), activeWarehouseId],
    queryFn: async () => {
      const res = await inventoryService.getLowStock();
      return (res.data?.data || res.data || []) as StockItem[];
    },
  });
};

export const useDailyReport = () => {
  const { selectedFY } = useFinancialYear();
  const { activeWarehouseId } = useWarehouse();
  return useQuery({
    queryKey: [...QUERY_KEYS.dailyReport(selectedFY), activeWarehouseId],
    queryFn: async () => {
      const res = await inventoryService.getDailyReport();
      return res.data?.data || res.data;
    },
  });
};
