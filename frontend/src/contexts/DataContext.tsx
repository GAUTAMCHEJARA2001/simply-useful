import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Dealer, Distributor, Product, Order, Visit, Expense, OrderStatus, Warehouse } from '@/types';
import { apiService } from '@/api/apiService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';

/**
 * DATA CONTEXT (ENTERPRISE REACT QUERY FACADE)
 * Features:
 * - Backed 100% by TanStack Query RAM cache (5m stale, 15m GC)
 * - Zero startup request stampede (cached across route navigation)
 * - Fine-grained domain invalidation (updating an order only refetches orders)
 * - 100% backward compatibility for all 30+ pages calling useData()
 */

export interface AppUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  phone?: string;
  monthlyTarget?: number;
  monthly_target?: number;
  territory?: string;
}

export interface RolePermission {
  id: string;
  role: string;
  feature: string;
  isEnabled: boolean;
  is_enabled?: boolean;
}

interface DataContextType {
  dealers: Dealer[];
  addDealer: (d: Dealer) => Promise<void>;
  updateDealer: (code: string, d: Partial<Dealer>) => Promise<void>;
  deleteDealer: (code: string) => Promise<void>;
  distributors: Distributor[];
  addDistributor: (d: Distributor) => Promise<void>;
  updateDistributor: (name: string, d: Partial<Distributor>) => Promise<void>;
  deleteDistributor: (name: string) => Promise<void>;
  products: Product[];
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (code: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (code: string) => Promise<void>;
  orders: Order[];
  addOrder: (o: Order) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus, reason?: string, actionDate?: string, extraFields?: any) => Promise<void>;
  updateOrderItems: (id: string, updatedOrder: any) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  visits: Visit[];
  addVisit: (v: Visit) => Promise<void>;
  updateVisitStatus: (id: string, visitStatus: string, hrRemark?: string) => Promise<void>;
  expenses: Expense[];
  addExpense: (e: Expense) => Promise<void>;
  updateExpenseStatus: (id: string, status: string, rejectReason?: string) => Promise<void>;
  updateExpense: (id: string, e: Partial<Expense>) => Promise<void>;
  users: AppUserRecord[];
  addUser: (u: { email: string; password: string; name: string; role: string; active: boolean }) => Promise<void>;
  updateUser: (id: string, u: Partial<AppUserRecord>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUserPassword: (id: string, password: string) => Promise<void>;
  updateUserTarget: (id: string, target: number) => Promise<void>;
  settings: Record<string, any>;
  updateSetting: (key: string, value: any) => Promise<void>;
  permissions: RolePermission[];
  updatePermission: (roleOrId: string, featureOrEnabled: string | boolean, maybeEnabled?: boolean) => Promise<void>;
  warehouses: Warehouse[];
  loading: boolean;
  error: string | null;
  refreshAll: (silent?: boolean) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

const ALL_SYSTEM_FEATURES = [
  'view_sales_dashboard',
  'create_order',
  'view_own_orders',
  'track_visits',
  'manage_expenses',
  'manage_customers',
  'view_inventory_dashboard',
  'view_hr_dashboard',
  'view_reports',
  'view_admin_dashboard',
  'access_settings',
];

export const defaultPermissions: RolePermission[] = [
  // SUPERADMIN - Full Access
  ...ALL_SYSTEM_FEATURES.map(f => ({ id: `SUPERADMIN_${f}`, role: 'SUPERADMIN' as UserRole, feature: f, isEnabled: true })),

  // ADMIN - Full Operations Management
  ...ALL_SYSTEM_FEATURES.map(f => ({ id: `ADMIN_${f}`, role: 'ADMIN' as UserRole, feature: f, isEnabled: true })),

  // SALES - Field & Orders
  { id: 'SALES_view_sales_dashboard', role: 'SALES', feature: 'view_sales_dashboard', isEnabled: true },
  { id: 'SALES_create_order', role: 'SALES', feature: 'create_order', isEnabled: true },
  { id: 'SALES_view_own_orders', role: 'SALES', feature: 'view_own_orders', isEnabled: true },
  { id: 'SALES_track_visits', role: 'SALES', feature: 'track_visits', isEnabled: true },
  { id: 'SALES_manage_expenses', role: 'SALES', feature: 'manage_expenses', isEnabled: true },
  { id: 'SALES_manage_customers', role: 'SALES', feature: 'manage_customers', isEnabled: false },
  { id: 'SALES_view_inventory_dashboard', role: 'SALES', feature: 'view_inventory_dashboard', isEnabled: false },
  { id: 'SALES_view_hr_dashboard', role: 'SALES', feature: 'view_hr_dashboard', isEnabled: false },
  { id: 'SALES_view_reports', role: 'SALES', feature: 'view_reports', isEnabled: false },
  { id: 'SALES_view_admin_dashboard', role: 'SALES', feature: 'view_admin_dashboard', isEnabled: false },
  { id: 'SALES_access_settings', role: 'SALES', feature: 'access_settings', isEnabled: false },

  // HR - Human Resources & Analytics
  { id: 'HR_view_sales_dashboard', role: 'HR', feature: 'view_sales_dashboard', isEnabled: false },
  { id: 'HR_create_order', role: 'HR', feature: 'create_order', isEnabled: false },
  { id: 'HR_view_own_orders', role: 'HR', feature: 'view_own_orders', isEnabled: false },
  { id: 'HR_track_visits', role: 'HR', feature: 'track_visits', isEnabled: false },
  { id: 'HR_manage_expenses', role: 'HR', feature: 'manage_expenses', isEnabled: false },
  { id: 'HR_manage_customers', role: 'HR', feature: 'manage_customers', isEnabled: false },
  { id: 'HR_view_inventory_dashboard', role: 'HR', feature: 'view_inventory_dashboard', isEnabled: true },
  { id: 'HR_view_hr_dashboard', role: 'HR', feature: 'view_hr_dashboard', isEnabled: true },
  { id: 'HR_view_reports', role: 'HR', feature: 'view_reports', isEnabled: true },
  { id: 'HR_view_admin_dashboard', role: 'HR', feature: 'view_admin_dashboard', isEnabled: false },
  { id: 'HR_access_settings', role: 'HR', feature: 'access_settings', isEnabled: false },

  // INVENTORY - Warehouse & Dispatch
  { id: 'INVENTORY_view_sales_dashboard', role: 'INVENTORY', feature: 'view_sales_dashboard', isEnabled: false },
  { id: 'INVENTORY_create_order', role: 'INVENTORY', feature: 'create_order', isEnabled: false },
  { id: 'INVENTORY_view_own_orders', role: 'INVENTORY', feature: 'view_own_orders', isEnabled: false },
  { id: 'INVENTORY_track_visits', role: 'INVENTORY', feature: 'track_visits', isEnabled: false },
  { id: 'INVENTORY_manage_expenses', role: 'INVENTORY', feature: 'manage_expenses', isEnabled: false },
  { id: 'INVENTORY_manage_customers', role: 'INVENTORY', feature: 'manage_customers', isEnabled: false },
  { id: 'INVENTORY_view_inventory_dashboard', role: 'INVENTORY', feature: 'view_inventory_dashboard', isEnabled: true },
  { id: 'INVENTORY_view_hr_dashboard', role: 'INVENTORY', feature: 'view_hr_dashboard', isEnabled: false },
  { id: 'INVENTORY_view_reports', role: 'INVENTORY', feature: 'view_reports', isEnabled: false },
  { id: 'INVENTORY_view_admin_dashboard', role: 'INVENTORY', feature: 'view_admin_dashboard', isEnabled: false },
  { id: 'INVENTORY_access_settings', role: 'INVENTORY', feature: 'access_settings', isEnabled: false },

  // PRODUCTION - Plant, Formulation & BOM
  { id: 'PRODUCTION_view_sales_dashboard', role: 'PRODUCTION', feature: 'view_sales_dashboard', isEnabled: false },
  { id: 'PRODUCTION_create_order', role: 'PRODUCTION', feature: 'create_order', isEnabled: false },
  { id: 'PRODUCTION_view_own_orders', role: 'PRODUCTION', feature: 'view_own_orders', isEnabled: false },
  { id: 'PRODUCTION_track_visits', role: 'PRODUCTION', feature: 'track_visits', isEnabled: false },
  { id: 'PRODUCTION_manage_expenses', role: 'PRODUCTION', feature: 'manage_expenses', isEnabled: false },
  { id: 'PRODUCTION_manage_customers', role: 'PRODUCTION', feature: 'manage_customers', isEnabled: false },
  { id: 'PRODUCTION_view_inventory_dashboard', role: 'PRODUCTION', feature: 'view_inventory_dashboard', isEnabled: true },
  { id: 'PRODUCTION_view_hr_dashboard', role: 'PRODUCTION', feature: 'view_hr_dashboard', isEnabled: false },
  { id: 'PRODUCTION_view_reports', role: 'PRODUCTION', feature: 'view_reports', isEnabled: false },
  { id: 'PRODUCTION_view_admin_dashboard', role: 'PRODUCTION', feature: 'view_admin_dashboard', isEnabled: false },
  { id: 'PRODUCTION_access_settings', role: 'PRODUCTION', feature: 'access_settings', isEnabled: false },
];

const normalizeOrder = (o: any): Order => ({
  ...o,
  orderId: o.orderId || o.order_id || o.id,
  soEmail: o.soEmail || o.so_email,
  partyType: o.partyType || o.party_type,
  partyName: o.partyName || o.party_name,
  grandTotal: o.grandTotal || o.grand_total || 0,
  status: o.status || 'Pending',
  date: o.date || o.createdAt,
  assignedWarehouse: o.assignedWarehouse || o.assigned_warehouse || null,
  items: (o.items || []).map((i: any) => ({
    ...i,
    productName: i.productName || i.product_name,
    itemRemark: i.itemRemark || i.item_remark || i.remark
  }))
});

const normalizeVisit = (v: any): Visit => ({
  ...v,
  soEmail: v.soEmail || v.so_email,
  so_email: v.soEmail || v.so_email,
  dealerName: v.dealerName || v.dealer_name,
  dealer_name: v.dealerName || v.dealer_name,
  nextFollowup: v.nextFollowup || v.next_followup,
  next_followup: v.nextFollowup || v.next_followup,
  visitStatus: v.visitStatus || v.visit_status || 'PENDING',
  visit_status: v.visitStatus || v.visit_status || 'PENDING',
  hrRemark: v.hrRemark || v.hr_remark || null,
  hr_remark: v.hrRemark || v.hr_remark || null,
  verifiedBy: v.verifiedBy || v.verified_by || null,
  verified_by: v.verifiedBy || v.verified_by || null,
  verifiedAt: v.verifiedAt || v.verified_at || null,
  verified_at: v.verifiedAt || v.verified_at || null,
});

const normalizeExpense = (e: any): Expense => ({
  ...e,
  soEmail: e.soEmail || e.so_email,
  so_email: e.soEmail || e.so_email,
  rejectReason: e.rejectReason || e.reject_reason,
  reject_reason: e.rejectReason || e.reject_reason,
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<RolePermission[]>(() => {
    try {
      const specificKey = `kc_role_permissions_${user?.schemaName || 'default'}`;
      const saved = localStorage.getItem(specificKey) || localStorage.getItem('kc_role_permissions_default');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultPermissions;
  });
  const [error, setError] = useState<string | null>(null);

  const isEnabled = !!user && typeof window !== 'undefined' && !!localStorage.getItem('token');

  // 1. Dealers Query
  const dealersQuery = useQuery({
    queryKey: QUERY_KEYS.dealers,
    queryFn: async () => {
      const res = await apiService.parties.getDealers();
      return (res.data?.data || res.data || []) as Dealer[];
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Distributors Query
  const distributorsQuery = useQuery({
    queryKey: QUERY_KEYS.distributors,
    queryFn: async () => {
      const res = await apiService.parties.getDistributors();
      return (res.data?.data || res.data || []) as Distributor[];
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Products Query
  const productsQuery = useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: async () => {
      const res = await apiService.inventory.getAll();
      return (res.data?.data || res.data || []) as Product[];
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // 4. Orders Query
  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await apiService.orders.getAll();
      const raw = res.data?.data || res.data || [];
      return (raw as any[]).map(normalizeOrder);
    },
    enabled: isEnabled,
    staleTime: 2 * 60 * 1000,
  });

  // 5. Warehouses Query
  const warehousesQuery = useQuery({
    queryKey: QUERY_KEYS.warehouses,
    queryFn: async () => {
      const res = await apiService.inventory.getWarehouses();
      return (res.data?.data || res.data || []) as Warehouse[];
    },
    enabled: isEnabled,
    staleTime: 10 * 60 * 1000,
  });

  // 6. Visits Query
  const visitsQuery = useQuery({
    queryKey: QUERY_KEYS.visits,
    queryFn: async () => {
      const res = await apiService.visits.get();
      const raw = res.data?.data || res.data || [];
      return (raw as any[]).map(normalizeVisit);
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // 7. Expenses Query
  const expensesQuery = useQuery({
    queryKey: QUERY_KEYS.expenses,
    queryFn: async () => {
      const res = await apiService.expenses.get();
      const raw = res.data?.data || res.data || [];
      return (raw as any[]).map(normalizeExpense);
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // 8. Users Query
  const usersQuery = useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: async () => {
      const res = await apiService.users.getAll({ page: 1, limit: 100 });
      const raw = res.data?.data || res.data || [];
      return (Array.isArray(raw) ? raw : []) as AppUserRecord[];
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // 9. Settings Query
  const settingsQuery = useQuery({
    queryKey: QUERY_KEYS.settings,
    queryFn: async () => {
      const res = await apiService.settings.get();
      return (res.data?.data || res.data || {}) as Record<string, any>;
    },
    enabled: isEnabled,
    staleTime: 15 * 60 * 1000,
  });

  // Synchronize live backend role permissions into state and localStorage
  useEffect(() => {
    const backendPerms = settingsQuery.data?.role_permissions;
    if (backendPerms && Array.isArray(backendPerms) && backendPerms.length > 0) {
      setPermissions(backendPerms);
      try {
        const specificKey = `kc_role_permissions_${user?.schemaName || 'default'}`;
        localStorage.setItem(specificKey, JSON.stringify(backendPerms));
        localStorage.setItem('kc_role_permissions_default', JSON.stringify(backendPerms));
      } catch {}
    }
  }, [settingsQuery.data?.role_permissions, user?.schemaName]);

  // Rehydrate permissions whenever user schema changes
  useEffect(() => {
    try {
      const specificKey = `kc_role_permissions_${user?.schemaName || 'default'}`;
      const saved = localStorage.getItem(specificKey) || localStorage.getItem('kc_role_permissions_default');
      if (saved) {
        setPermissions(JSON.parse(saved));
      }
    } catch {}
  }, [user?.schemaName]);

  const dealers = dealersQuery.data || [];
  const distributors = distributorsQuery.data || [];
  const products = productsQuery.data || [];
  const orders = ordersQuery.data || [];
  const warehouses = warehousesQuery.data || [];
  const visits = visitsQuery.data || [];
  const expenses = expensesQuery.data || [];
  const users = usersQuery.data || [];
  const settings = settingsQuery.data || {};

  const loading = isEnabled && (ordersQuery.isLoading && !ordersQuery.data);

  // Smooth background refresh of all active query caches
  const refreshAll = useCallback(async (_silent = false) => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dealers }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.distributors }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.warehouses }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.visits }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings }),
        queryClient.invalidateQueries({ queryKey: ['approvals'] }),
      ]);
    } catch (err) {
      console.error('refreshAll error:', err);
      setError('Failed to refresh data.');
    }
  }, [queryClient]);

  // Mutations with automatic cache invalidation
  const addDealer = useCallback(async (d: Dealer) => {
    const res = await apiService.parties.createDealer(d);
    if (res.data.success) {
      queryClient.setQueryData<Dealer[]>(QUERY_KEYS.dealers, prev => [...(prev || []), res.data.data || d]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dealers });
    }
  }, [queryClient]);

  const updateDealer = useCallback(async (code: string, d: Partial<Dealer>) => {
    const res = await apiService.parties.updateDealer(code, d);
    if (res.data.success) {
      queryClient.setQueryData<Dealer[]>(QUERY_KEYS.dealers, prev =>
        (prev || []).map(x => (x.dealerCode === code ? { ...x, ...d } : x))
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dealers });
    }
  }, [queryClient]);

  const deleteDealer = useCallback(async (code: string) => {
    const res = await apiService.parties.deleteDealer(code);
    if (res.data.success) {
      queryClient.setQueryData<Dealer[]>(QUERY_KEYS.dealers, prev =>
        (prev || []).filter(x => x.dealerCode !== code)
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dealers });
    }
  }, [queryClient]);

  const addDistributor = useCallback(async (d: Distributor) => {
    const res = await apiService.parties.createDistributor(d);
    if (res.data.success) {
      queryClient.setQueryData<Distributor[]>(QUERY_KEYS.distributors, prev => [...(prev || []), res.data.data || d]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.distributors });
    }
  }, [queryClient]);

  const updateDistributor = useCallback(async (name: string, d: Partial<Distributor>) => {
    const res = await apiService.parties.updateDistributor(name, d);
    if (res.data.success) {
      queryClient.setQueryData<Distributor[]>(QUERY_KEYS.distributors, prev =>
        (prev || []).map(x => (x.distributorName === name ? { ...x, ...d } : x))
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.distributors });
    }
  }, [queryClient]);

  const deleteDistributor = useCallback(async (name: string) => {
    const res = await apiService.parties.deleteDistributor(name);
    if (res.data.success) {
      queryClient.setQueryData<Distributor[]>(QUERY_KEYS.distributors, prev =>
        (prev || []).filter(x => x.distributorName !== name)
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.distributors });
    }
  }, [queryClient]);

  const addProduct = useCallback(async (p: Product) => {
    const res = await apiService.inventory.create(p);
    if (res.data.success) {
      queryClient.setQueryData<Product[]>(QUERY_KEYS.products, prev => [...(prev || []), res.data.data || p]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    }
  }, [queryClient]);

  const updateProduct = useCallback(async (code: string, p: Partial<Product>) => {
    const res = await apiService.inventory.update(code, p);
    if (res.data.success) {
      queryClient.setQueryData<Product[]>(QUERY_KEYS.products, prev =>
        (prev || []).map(x => (x.productCode === code ? { ...x, ...p } : x))
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    }
  }, [queryClient]);

  const deleteProduct = useCallback(async (code: string) => {
    const res = await apiService.inventory.remove(code);
    if (res.data.success) {
      queryClient.setQueryData<Product[]>(QUERY_KEYS.products, prev =>
        (prev || []).filter(x => x.productCode !== code)
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    }
  }, [queryClient]);

  const addOrder = useCallback(async (o: Order) => {
    const res = await apiService.orders.create(o);
    if (res.data.success) {
      const created = normalizeOrder(res.data.data || o);
      queryClient.setQueryData<Order[]>(['orders'], prev => [...(prev || []), created]);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    }
  }, [queryClient]);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus, reason?: string, actionDate?: string, extraFields?: any) => {
    const res = await apiService.orders.updateStatus(id, { status, reason, actionDate, ...extraFields });
    if (res.data.success) {
      queryClient.setQueryData<Order[]>(['orders'], prev =>
        (prev || []).map(o =>
          (o.orderId === id || o.id === id || (o as any).order_id === id)
            ? { ...o, status, ...(reason ? { narration: reason } : {}), ...(actionDate ? { dispatchDate: actionDate } : {}), ...extraFields }
            : o
        )
      );
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    }
  }, [queryClient]);

  const updateOrderItems = useCallback(async (id: string, updatedOrder: any) => {
    const res = await apiService.orders.updateItems(id, updatedOrder);
    if (res.data.success) {
      queryClient.setQueryData<Order[]>(['orders'], prev =>
        (prev || []).map(o =>
          (o.orderId === id || o.id === id || (o as any).order_id === id)
            ? { ...o, ...updatedOrder }
            : o
        )
      );
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    }
  }, [queryClient]);

  const deleteOrder = useCallback(async (id: string) => {
    try {
      await apiService.orders.delete(id);
    } catch (err) {
      console.warn('Backend deleteOrder error (will still remove from state if not found):', err);
    }
    queryClient.setQueryData<Order[]>(['orders'], prev =>
      (prev || []).filter(o => o.orderId !== id && o.id !== id && (o as any).order_id !== id)
    );
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['approvals'] });
  }, [queryClient]);

  const addVisit = useCallback(async (v: Visit) => {
    const res = await apiService.visits.add(v);
    if (res.data.success) {
      const created = normalizeVisit(res.data.data || v);
      queryClient.setQueryData<Visit[]>(QUERY_KEYS.visits, prev => [...(prev || []), created]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.visits });
    }
  }, [queryClient]);

  const updateVisitStatus = useCallback(async (id: string, visitStatus: string, hrRemark?: string) => {
    const res = await apiService.visits.updateStatus(id, visitStatus, hrRemark);
    if (res.data.success) {
      queryClient.setQueryData<Visit[]>(QUERY_KEYS.visits, prev =>
        (prev || []).map(v =>
          v.id === id
            ? {
                ...v,
                visitStatus,
                visit_status: visitStatus,
                hrRemark: hrRemark ?? v.hrRemark,
                hr_remark: hrRemark ?? v.hr_remark,
                verifiedBy: res.data.data?.verifiedBy ?? v.verifiedBy,
                verified_by: res.data.data?.verifiedBy ?? v.verified_by,
                verifiedAt: res.data.data?.verifiedAt ?? v.verifiedAt,
                verified_at: res.data.data?.verifiedAt ?? v.verified_at,
              }
            : v
        )
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.visits });
    }
  }, [queryClient]);

  const addExpense = useCallback(async (e: Expense) => {
    const res = await apiService.expenses.add(e);
    if (res.data.success && res.data.data) {
      const created = normalizeExpense(res.data.data);
      queryClient.setQueryData<Expense[]>(QUERY_KEYS.expenses, prev => [...(prev || []), created]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
    }
  }, [queryClient]);

  const updateExpenseStatus = useCallback(async (id: string, status: string, rejectReason?: string) => {
    const res = await apiService.expenses.updateStatus(id, status, rejectReason);
    if (res.data.success) {
      queryClient.setQueryData<Expense[]>(QUERY_KEYS.expenses, prev =>
        (prev || []).map(e => (e.id === id ? { ...e, status, rejectReason } : e))
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
    }
  }, [queryClient]);

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    const res = await apiService.expenses.update(id, data);
    if (res.data.success) {
      queryClient.setQueryData<Expense[]>(QUERY_KEYS.expenses, prev =>
        (prev || []).map(e => (e.id === id ? { ...e, ...data } : e))
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
    }
  }, [queryClient]);

  const addUser = async (u: any) => {
    const res = await apiService.users.create(u);
    if (res.data.success) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
      return res.data.data;
    }
  };

  const updateUser = async (id: string, u: Partial<AppUserRecord>) => {
    const res = await apiService.users.update(id, u);
    if (res.data.success) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
      return res.data.data;
    }
  };

  const deleteUser = async (id: string) => {
    const res = await apiService.users.remove(id);
    if (res.data.success) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    }
  };

  const updateUserPassword = async (id: string, password: string) => {
    await apiService.users.resetPassword(id, password);
  };

  const updateUserTarget = useCallback(async (id: string, target: number) => {
    const res = await apiService.users.updateTarget(id, target);
    if (res.data.success) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    }
  }, [queryClient]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    const res = await apiService.settings.update(key, value);
    if (res.data.success) {
      queryClient.setQueryData<Record<string, any>>(QUERY_KEYS.settings, prev => ({ ...(prev || {}), [key]: value }));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
    }
  }, [queryClient]);

  const updatePermission = useCallback(async (roleOrId: string, featureOrEnabled: string | boolean, maybeEnabled?: boolean) => {
    let role = '';
    let feature = '';
    let isEnabledVal = false;

    if (typeof featureOrEnabled === 'boolean') {
      const parts = roleOrId.split('_');
      role = parts[0];
      feature = parts.slice(1).join('_');
      isEnabledVal = featureOrEnabled;
    } else {
      role = roleOrId;
      feature = featureOrEnabled;
      isEnabledVal = Boolean(maybeEnabled);
    }

    setPermissions(prev => {
      const matchIndex = prev.findIndex(p => 
        p.id === `${role}_${feature}` || (p.role === role && p.feature === feature)
      );
      let updated: RolePermission[];
      if (matchIndex >= 0) {
        updated = prev.map((p, idx) => idx === matchIndex ? { ...p, isEnabled: isEnabledVal } : p);
      } else {
        updated = [...prev, { id: `${role}_${feature}`, role: role as UserRole, feature, isEnabled: isEnabledVal }];
      }
      try {
        const specificKey = `kc_role_permissions_${user?.schemaName || 'default'}`;
        localStorage.setItem(specificKey, JSON.stringify(updated));
        localStorage.setItem('kc_role_permissions_default', JSON.stringify(updated));
      } catch {}
      apiService.settings.update('role_permissions', updated).catch(() => {});
      queryClient.setQueryData<Record<string, any>>(QUERY_KEYS.settings, prev => ({
        ...(prev || {}),
        role_permissions: updated
      }));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
      return updated;
    });
  }, [user?.schemaName, queryClient]);

  return (
    <DataContext.Provider value={{
      dealers, addDealer, updateDealer, deleteDealer,
      distributors, addDistributor, updateDistributor, deleteDistributor,
      products, addProduct, updateProduct, deleteProduct,
      orders, addOrder, updateOrderStatus, updateOrderItems, deleteOrder,
      visits, addVisit, updateVisitStatus,
      expenses, addExpense, updateExpenseStatus, updateExpense,
      users, addUser, updateUser, deleteUser, updateUserPassword, updateUserTarget,
      settings, updateSetting,
      permissions, updatePermission,
      warehouses,
      loading, error, refreshAll,
    }}>
      {children}
    </DataContext.Provider>
  );
};
