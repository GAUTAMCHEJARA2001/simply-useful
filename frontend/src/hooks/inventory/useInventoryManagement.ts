import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/api/client';

export type Tab = 'dashboard' | 'products' | 'categories' | 'sub_categories' | 'brands' | 'units' | 'suppliers' | 'labour' |
  'purchases' | 'sales' | 'productions' | 'adjustments' | 'attendance' | 'approvals' | 'sales_returns' | 'purchase_returns' | 'reports' | 'settings' | 'stock_ledger' | 'purchase_orders' | 'total_stock' | 'bom';

export const useInventoryManagement = () => {
  const { toast } = useToast();
  const [tab, setTabState] = useState<Tab>(() => {
    return (localStorage.getItem('inventory_active_tab') as Tab) || 'dashboard';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note: Tab data is now mostly handled by self-fetching components.
  // This hook can manage cross-tab state or global inventory actions if needed.

  const changeTab = (newTab: Tab) => {
    setTabState(newTab);
    localStorage.setItem('inventory_active_tab', newTab);
  };

  return {
    tab,
    setTab: changeTab,
    loading,
    setLoading,
    error,
    setError,
  };
};
