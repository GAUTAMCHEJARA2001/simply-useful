import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/api/client';

export type Tab = 'dashboard' | 'products' | 'categories' | 'sub_categories' | 'brands' | 'units' | 'suppliers' |
  'purchases' | 'sales' | 'productions' | 'deleted_productions' | 'adjustments' | 'approvals' | 'sales_returns' | 'purchase_returns' | 'reports' | 'settings' | 'stock_ledger' | 'purchase_orders' | 'total_stock' | 'bom' | 'production_approvals';

const VALID_TABS = new Set<string>([
  'dashboard', 'products', 'categories', 'sub_categories', 'brands', 'units', 'suppliers',
  'purchases', 'sales', 'productions', 'deleted_productions', 'adjustments', 'approvals',
  'sales_returns', 'purchase_returns', 'reports', 'settings', 'stock_ledger', 'purchase_orders',
  'total_stock', 'bom', 'production_approvals'
]);

export const useInventoryManagement = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawUrlTab = searchParams.get('tab');
  const urlTab = rawUrlTab && VALID_TABS.has(rawUrlTab) ? (rawUrlTab as Tab) : null;

  const [tab, setTabState] = useState<Tab>(() => {
    if (urlTab) return urlTab;
    const cached = localStorage.getItem('inventory_active_tab');
    return (cached && VALID_TABS.has(cached) ? (cached as Tab) : 'dashboard');
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (urlTab && urlTab !== tab) {
      setTabState(urlTab);
      try {
        localStorage.setItem('inventory_active_tab', urlTab);
      } catch {}
    }
  }, [urlTab]);

  const changeTab = (newTab: Tab) => {
    setTabState(newTab);
    try {
      localStorage.setItem('inventory_active_tab', newTab);
    } catch {}
    setSearchParams({ tab: newTab });
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
