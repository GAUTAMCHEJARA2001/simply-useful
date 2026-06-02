import { useMemo } from 'react';
import { Order, Visit, Expense } from '@/types';
import { AppUserRecord } from '@/contexts/DataContext';

export interface SOPerformanceReport {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  approvedOrders: number;
  revenue: number;
  avgOrderValue: number;
  visits: number;
  claims: number;
  targetAmount: number;
  achievedAmount: number;
  ratio: number; // Claims to revenue ratio (%)
}

interface UseSOPerformanceParams {
  orders: Order[];
  visits: Visit[];
  expenses: Expense[];
  users: AppUserRecord[];
  startDate: Date;
  endDate: Date;
  selectedSOEmail: string;
}

export function useSOPerformance({
  orders,
  visits,
  expenses,
  users,
  startDate,
  endDate,
  selectedSOEmail
}: UseSOPerformanceParams): SOPerformanceReport[] {
  return useMemo(() => {
    // 1. Gather all unique Sales Officers from users array
    const soUsers = users.filter(u => u.role === 'SALES' || u.role === 'SALES_OFFICER');
    
    // Fallback: collect emails from transactions if users array is empty
    const uniqueEmails = new Set<string>(soUsers.map(u => u.email.toLowerCase()));
    
    orders.forEach(o => {
      const email = o.soEmail || (o as any).so_email;
      if (email) uniqueEmails.add(email.toLowerCase());
    });

    const soList = Array.from(uniqueEmails).map(email => {
      const matchedUser = soUsers.find(u => u.email.toLowerCase() === email);
      return {
        id: matchedUser?.id || email,
        name: matchedUser?.name || email.split('@')[0],
        email: email,
        targetAmount: matchedUser?.monthlyTarget || matchedUser?.monthly_target || 0
      };
    });

    // 2. Filter list by selected Sales Officer if specified
    const filteredList = selectedSOEmail
      ? soList.filter(so => so.email.toLowerCase() === selectedSOEmail.toLowerCase())
      : soList;

    // 3. Compute metrics for each Sales Officer within date bounds
    return filteredList.map(so => {
      const soOrders = orders.filter(o => {
        const oEmail = o.soEmail || (o as any).so_email;
        if (!oEmail || oEmail.toLowerCase() !== so.email) return false;
        const oDate = new Date(o.date || (o as any).createdAt);
        return oDate >= startDate && oDate <= endDate;
      });

      const approvedOrdersList = soOrders.filter(o => o.status === 'Completed' || o.status === 'Approved');
      const totalOrdersCount = soOrders.length;
      const approvedOrdersCount = approvedOrdersList.length;

      const revenueSum = approvedOrdersList.reduce(
        (sum, o) => sum + (o.grandTotal || o.grand_total || 0),
        0
      );

      const avgOrderVal = approvedOrdersCount > 0 ? revenueSum / approvedOrdersCount : 0;

      // Count visits within bounds
      const visitsCount = visits.filter(v => {
        const vEmail = v.soEmail || (v as any).so_email;
        if (!vEmail || vEmail.toLowerCase() !== so.email) return false;
        const vDate = new Date(v.date || (v as any).createdAt || (v as any).nextFollowup);
        return vDate >= startDate && vDate <= endDate;
      }).length;

      // Approved travel expense claims within bounds
      const claimsSum = expenses.filter(e => {
        const eEmail = e.soEmail || (e as any).so_email;
        if (!eEmail || eEmail.toLowerCase() !== so.email) return false;
        if (e.status !== 'Approved') return false;
        const eDate = new Date(e.date || (e as any).createdAt);
        return eDate >= startDate && eDate <= endDate;
      }).reduce((sum, e) => sum + (e.amount || 0), 0);

      const expToRevRatio = revenueSum > 0 ? (claimsSum / revenueSum) * 100 : 0;

      return {
        id: so.id,
        name: so.name,
        email: so.email,
        totalOrders: totalOrdersCount,
        approvedOrders: approvedOrdersCount,
        revenue: revenueSum,
        avgOrderValue: avgOrderVal,
        visits: visitsCount,
        claims: claimsSum,
        targetAmount: so.targetAmount,
        achievedAmount: revenueSum,
        ratio: Number(expToRevRatio.toFixed(2))
      };
    });
  }, [orders, visits, expenses, users, startDate, endDate, selectedSOEmail]);
}
