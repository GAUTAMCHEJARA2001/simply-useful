import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dealer, Distributor, Product, Order, Visit, Expense, OrderStatus } from '@/types';
import apiClient from '@/api/client';
import { inventoryApi } from '@/api/inventory.api';
import { salesApi } from '@/api/sales.api';

/**
 * DATA CONTEXT (ELITE)
 * Features: Standardized state management, feature-based API usage, and resilience.
 */

export interface AppUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  monthly_target?: number;
}

export interface RolePermission {
  id: string;
  role: string;
  feature: string;
  is_enabled: boolean;
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
  updateOrderStatus: (id: string, status: OrderStatus, reason?: string, action_date?: string) => Promise<void>;
  updateOrderItems: (id: string, updatedOrder: any) => Promise<void>;
  visits: Visit[];
  addVisit: (v: Visit) => Promise<void>;
  expenses: Expense[];
  addExpense: (e: Expense) => Promise<void>;
  updateExpenseStatus: (id: number, status: string, reject_reason?: string) => Promise<void>;
  updateExpense: (id: number, e: Partial<Expense>) => Promise<void>;
  users: AppUserRecord[];
  addUser: (u: { email: string; password: string; name: string; role: string; active: boolean }) => Promise<void>;
  updateUser: (id: string, u: Partial<AppUserRecord>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUserPassword: (id: string, password: string) => Promise<void>;
  updateUserTarget: (id: string, target: number) => Promise<void>;
  settings: Record<string, any>;
  updateSetting: (key: string, value: any) => Promise<void>;
  permissions: RolePermission[];
  updatePermission: (id: string, is_enabled: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

// Default permissions could be moved to config/constants.ts later
const defaultPermissions: RolePermission[] = [
  { id: '1', role: 'ADMIN', feature: 'view_admin_dashboard', is_enabled: true },
  { id: '2', role: 'ADMIN', feature: 'manage_customers', is_enabled: true },
  { id: '3', role: 'ADMIN', feature: 'view_reports', is_enabled: true },
  { id: '4', role: 'ADMIN', feature: 'access_settings', is_enabled: true },
  { id: '5', role: 'ADMIN', feature: 'view_sales_dashboard', is_enabled: true },
  { id: '6', role: 'ADMIN', feature: 'create_order', is_enabled: true },
  { id: '7', role: 'ADMIN', feature: 'view_own_orders', is_enabled: true },
  { id: '8', role: 'ADMIN', feature: 'view_inventory_dashboard', is_enabled: true },
  { id: '10', role: 'SALES', feature: 'view_sales_dashboard', is_enabled: true },
  { id: '11', role: 'SALES', feature: 'create_order', is_enabled: true },
  { id: '12', role: 'SALES', feature: 'view_own_orders', is_enabled: true },
  { id: '13', role: 'SALES', feature: 'track_visits', is_enabled: true },
  { id: '14', role: 'SALES', feature: 'manage_expenses', is_enabled: true },
  { id: '20', role: 'HR', feature: 'view_reports', is_enabled: true },
  { id: '30', role: 'INVENTORY', feature: 'view_inventory_dashboard', is_enabled: true },
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [permissions, setPermissions] = useState<RolePermission[]>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the new API modules to fetch data
      const [dealerRes, distributorRes, productRes, orderRes, userRes] = await Promise.all([
        apiClient<Dealer[]>('/dealers'),
        apiClient<Distributor[]>('/distributors'),
        inventoryApi.getAll(),
        salesApi.getSales(),
        apiClient<AppUserRecord[]>('/users')
      ]);

      if (dealerRes.success) setDealers(dealerRes.data || []);
      if (distributorRes.success) setDistributors(distributorRes.data || []);
      if (productRes.success) setProducts(productRes.data || []);
      if (orderRes.success) setOrders(orderRes.data || []);
      if (userRes.success) setUsers(userRes.data || []);
      
    } catch (err: any) {
      console.error('🔥 DataContext Load Failure:', err);
      setError('Failed to sync data with server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user, refreshAll]);

  const addDealer = useCallback(async (d: Dealer) => { 
    const res = await apiClient('/dealers', { method: 'POST', data: d });
    if (res.success) setDealers(prev => [...prev, d]); 
  }, []);

  const updateDealer = useCallback(async (code: string, d: Partial<Dealer>) => {
    const res = await apiClient(`/dealers/${code}`, { method: 'PUT', data: d });
    if (res.success) setDealers(prev => prev.map(x => x.dealer_code === code ? { ...x, ...d } : x));
  }, []);

  const deleteDealer = useCallback(async (code: string) => {
    const res = await apiClient(`/dealers/${code}`, { method: 'DELETE' });
    if (res.success) setDealers(prev => prev.filter(x => x.dealer_code !== code));
  }, []);

  const addDistributor = useCallback(async (d: Distributor) => {
    const res = await apiClient('/distributors', { method: 'POST', data: d });
    if (res.success) setDistributors(prev => [...prev, d]);
  }, []);

  const updateDistributor = useCallback(async (name: string, d: Partial<Distributor>) => {
    const res = await apiClient(`/distributors/${name}`, { method: 'PUT', data: d });
    if (res.success) setDistributors(prev => prev.map(x => x.distributor_name === name ? { ...x, ...d } : x));
  }, []);

  const deleteDistributor = useCallback(async (name: string) => {
    const res = await apiClient(`/distributors/${name}`, { method: 'DELETE' });
    if (res.success) setDistributors(prev => prev.filter(x => x.distributor_name !== name));
  }, []);

  const addProduct = useCallback(async (p: Product) => {
    const res = await inventoryApi.create(p);
    if (res.success) setProducts(prev => [...prev, p]);
  }, []);

  const updateProduct = useCallback(async (code: string, p: Partial<Product>) => {
    const res = await inventoryApi.update(code, p);
    if (res.success) setProducts(prev => prev.map(x => x.product_code === code ? { ...x, ...p } : x));
  }, []);

  const deleteProduct = useCallback(async (code: string) => {
    const res = await inventoryApi.delete(code);
    if (res.success) setProducts(prev => prev.filter(x => x.product_code !== code));
  }, []);

  const addOrder = useCallback(async (o: Order) => {
    const res = await salesApi.createSale(o);
    if (res.success) setOrders(prev => [...prev, o]);
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus, reason?: string, action_date?: string) => {
    const res = await apiClient(`/orders/${id}/status`, { method: 'PUT', data: { status, reason, action_date } });
    if (res.success) setOrders(prev => prev.map(o => o.order_id === id ? { ...o, status, ...(reason ? { narration: reason } : {}), ...(action_date ? { dispatch_date: action_date } : {}) } : o));
  }, []);

  const updateOrderItems = useCallback(async (id: string, updatedOrder: any) => {
    const res = await apiClient(`/orders/${id}/items`, { method: 'PUT', data: updatedOrder });
    if (res.success) setOrders(prev => prev.map(o => o.order_id === id ? { ...o, ...updatedOrder } : o));
  }, []);

  const addVisit = useCallback(async (v: Visit) => {
    const res = await apiClient('/visits', { method: 'POST', data: v });
    if (res.success) setVisits(prev => [...prev, v]);
  }, []);

  const addExpense = useCallback(async (e: Expense) => {
    const res = await apiClient<Expense>('/expenses', { method: 'POST', data: e });
    if (res.success && res.data) setExpenses(prev => [...prev, res.data!]);
  }, []);

  const updateExpenseStatus = useCallback(async (id: number, status: string, reject_reason?: string) => {
    const res = await apiClient(`/expenses/${id}/status`, { method: 'PUT', data: { status, reject_reason } });
    if (res.success) setExpenses(prev => prev.map(e => e.id === id ? { ...e, status, reject_reason } : e));
  }, []);

  const updateExpense = useCallback(async (id: number, data: Partial<Expense>) => {
    const res = await apiClient(`/expenses/${id}`, { method: 'PUT', data });
    if (res.success) setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  }, []);

  const addUser = useCallback(async (u: { email: string; password: string; name: string; role: string; active: boolean }) => {
    const res = await apiClient<AppUserRecord>('/users', { method: 'POST', data: u });
    if (res.success && res.data) setUsers(prev => [...prev, res.data!]);
  }, []);

  const updateUser = useCallback(async (id: string, u: Partial<AppUserRecord>) => {
    const res = await apiClient(`/users/${id}`, { method: 'PUT', data: u });
    if (res.success) setUsers(prev => prev.map(x => x.id === id ? { ...x, ...u } : x));
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const res = await apiClient(`/users/${id}`, { method: 'DELETE' });
    if (res.success) setUsers(prev => prev.filter(x => x.id !== id));
  }, []);

  const updateUserPassword = useCallback(async (id: string, password: string) => {
    await apiClient(`/users/${id}/password`, { method: 'PUT', data: { password } });
  }, []);

  const updateUserTarget = useCallback(async (id: string, target: number) => {
    const res = await apiClient(`/users/${id}/target`, { method: 'PUT', data: { target } });
    if (res.success) setUsers(prev => prev.map(x => x.id === id ? { ...x, monthly_target: target } : x));
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    const res = await apiClient('/settings', { method: 'PUT', data: { key, value } });
    if (res.success) setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePermission = useCallback(async (id: string, is_enabled: boolean) => {
    const res = await apiClient(`/permissions/${id}`, { method: 'PUT', data: { is_enabled } });
    if (res.success) setPermissions(prev => prev.map(p => p.id === id ? { ...p, is_enabled } : p));
  }, []);

  return (
    <DataContext.Provider value={{
      dealers, addDealer, updateDealer, deleteDealer,
      distributors, addDistributor, updateDistributor, deleteDistributor,
      products, addProduct, updateProduct, deleteProduct,
      orders, addOrder, updateOrderStatus, updateOrderItems,
      visits, addVisit,
      expenses, addExpense, updateExpenseStatus, updateExpense,
      users, addUser, updateUser, deleteUser, updateUserPassword, updateUserTarget,
      settings, updateSetting,
      permissions, updatePermission,
      loading, error, refreshAll,
    }}>
      {children}
    </DataContext.Provider>
  );
};
