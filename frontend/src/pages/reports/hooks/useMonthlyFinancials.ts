import { useMemo } from 'react';
import { Order } from '@/types';

export interface MonthlyFinancialRow {
  id: string;
  month: string; // "YYYY-MM"
  ordersCount: number;
  revenue: number;
  profit: number;
}

interface UseMonthlyFinancialsParams {
  orders: Order[];
  startDate: Date;
  endDate: Date;
}

export function useMonthlyFinancials({
  orders,
  startDate,
  endDate
}: UseMonthlyFinancialsParams): MonthlyFinancialRow[] {
  return useMemo(() => {
    // 1. Filter orders within date bounds
    const inScopeOrders = orders.filter(o => {
      const oDate = new Date(o.date || (o as any).createdAt);
      return oDate >= startDate && oDate <= endDate;
    });

    const completed = inScopeOrders.filter(o => o.status === 'Completed' || o.status === 'Approved');

    // 2. Group by month
    const groups: Record<string, { count: number; rev: number; profit: number }> = {};

    completed.forEach(o => {
      const d = o.date || (o as any).createdAt || new Date().toISOString();
      const monthKey = typeof d === 'string' ? d.substring(0, 7) : new Date(d).toISOString().substring(0, 7); // "YYYY-MM"

      if (!groups[monthKey]) {
        groups[monthKey] = { count: 0, rev: 0, profit: 0 };
      }

      const rev = o.grandTotal || o.grand_total || 0;
      groups[monthKey].count += 1;
      groups[monthKey].rev += rev;

      // Estimate profit dynamically (standard fallback: 30% gross margin if product average costs are missing)
      let orderProfit = 0;
      if (o.items && o.items.length > 0) {
        let orderCost = 0;
        o.items.forEach((item: any) => {
          const qty = item.qty || item.quantity || 0;
          const price = item.price || 0;
          
          // Match cost bounds or fallback
          const cost = (item.product as any)?.costPrice || (item.product as any)?.avgcost || (price * 0.7);
          orderCost += qty * cost;
        });
        orderProfit = rev - orderCost;
      } else {
        orderProfit = rev * 0.3; // 30% margin fallback
      }

      groups[monthKey].profit += orderProfit;
    });

    // 3. Convert to sorted array
    return Object.entries(groups)
      .map(([month, val]) => ({
        id: month,
        month,
        ordersCount: val.count,
        revenue: Math.round(val.rev),
        profit: Math.round(val.profit)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [orders, startDate, endDate]);
}
