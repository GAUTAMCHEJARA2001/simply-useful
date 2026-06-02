import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dealer, Distributor, Product, Order, Visit, Expense, OrderStatus } from '@/types';
import { apiService } from '@/api/apiService';

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
  monthlyTarget?: number;
  monthly_target?: number;
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
  updateOrderStatus: (id: string, status: OrderStatus, reason?: string, action_date?: string) => Promise<void>;
  updateOrderItems: (id: string, updatedOrder: any) => Promise<void>;
  visits: Visit[];
  addVisit: (v: Visit) => Promise<void>;
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
  updatePermission: (id: string, isEnabled: boolean) => Promise<void>;
  warehouses: Warehouse[];
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
  { id: '1', role: 'ADMIN', feature: 'view_admin_dashboard', isEnabled: true },
  { id: '2', role: 'ADMIN', feature: 'manage_customers', isEnabled: true },
  { id: '3', role: 'ADMIN', feature: 'view_reports', isEnabled: true },
  { id: '4', role: 'ADMIN', feature: 'access_settings', isEnabled: true },
  { id: '5', role: 'ADMIN', feature: 'view_sales_dashboard', isEnabled: true },
  { id: '6', role: 'ADMIN', feature: 'create_order', isEnabled: true },
  { id: '7', role: 'ADMIN', feature: 'view_own_orders', isEnabled: true },
  { id: '8', role: 'ADMIN', feature: 'view_inventory_dashboard', isEnabled: true },
  { id: '10', role: 'SALES', feature: 'view_sales_dashboard', isEnabled: true },
  { id: '11', role: 'SALES', feature: 'create_order', isEnabled: true },
  { id: '12', role: 'SALES', feature: 'view_own_orders', isEnabled: true },
  { id: '13', role: 'SALES', feature: 'track_visits', isEnabled: true },
  { id: '14', role: 'SALES', feature: 'manage_expenses', isEnabled: true },
  { id: '20', role: 'HR', feature: 'view_reports', isEnabled: true },
  { id: '30', role: 'INVENTORY', feature: 'view_inventory_dashboard', isEnabled: true },
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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const normalizeOrder = (o: any): Order => ({
    ...o,
    orderId: o.orderId || o.order_id || o.id,
    soEmail: o.soEmail || o.so_email,
    partyType: o.partyType || o.party_type,
    partyName: o.partyName || o.party_name,
    grandTotal: o.grandTotal || o.grand_total || 0,
    status: o.status || 'Pending',
    date: o.date || o.createdAt,
    items: (o.items || []).map((i: any) => ({
      ...i,
      productName: i.productName || i.product_name,
      itemRemark: i.itemRemark || i.item_remark || i.remark
    }))
  });

  const refreshAll = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {

      // Fetch in parallel but handle individual failures to prevent entire app lockout
      const results = await Promise.allSettled([
        apiService.parties.getDealers(),
        apiService.parties.getDistributors(),
        apiService.inventory.getAll(),
        apiService.orders.getAll(),
        apiService.users.getAll({ page: 1, limit: 100 }),
        apiService.inventory.getWarehouses()
      ]);

      const [dealerRes, distributorRes, productRes, orderRes, userRes, warehouseRes] = results.map(r => 
        r.status === 'fulfilled' ? r.value.data : null
      );

      // Axios returns data in .data, our backend wraps result in { success, data, ... }
      if (dealerRes?.success) setDealers(dealerRes.data || []);
      if (distributorRes?.success) setDistributors(distributorRes.data || []);
      if (productRes?.success) setProducts(productRes.data || []);
      if (orderRes?.success) setOrders((orderRes.data || []).map(normalizeOrder));
      if (warehouseRes?.success) setWarehouses(warehouseRes.data || []);
      
      if (userRes?.success) {
        // Handle paginated response structure { success: true, data: [...], meta: {...} }
        const rawUsers = Array.isArray(userRes.data) ? userRes.data : (userRes.data || []);
        setUsers(rawUsers);
      }
      
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
    } else {
      setLoading(false);
    }
  }, [user, refreshAll]);


  const addDealer = useCallback(async (d: Dealer) => { 
    const res = await apiService.parties.createDealer(d);
    if (res.data.success) setDealers(prev => [...prev, d]); 
  }, []);

  const updateDealer = useCallback(async (code: string, d: Partial<Dealer>) => {
    const res = await apiService.parties.updateDealer(code, d);
    if (res.data.success) setDealers(prev => prev.map(x => x.dealerCode === code ? { ...x, ...d } : x));
  }, []);

  const deleteDealer = useCallback(async (code: string) => {
    const res = await apiService.parties.deleteDealer(code);
    if (res.data.success) setDealers(prev => prev.filter(x => x.dealerCode !== code));
  }, []);

  const addDistributor = useCallback(async (d: Distributor) => {
    const res = await apiService.parties.createDistributor(d);
    if (res.data.success) setDistributors(prev => [...prev, d]);
  }, []);

  const updateDistributor = useCallback(async (name: string, d: Partial<Distributor>) => {
    const res = await apiService.parties.updateDistributor(name, d);
    if (res.data.success) setDistributors(prev => prev.map(x => x.distributorName === name ? { ...x, ...d } : x));
  }, []);

  const deleteDistributor = useCallback(async (name: string) => {
    const res = await apiService.parties.deleteDistributor(name);
    if (res.data.success) setDistributors(prev => prev.filter(x => x.distributorName !== name));
  }, []);

  const addProduct = useCallback(async (p: Product) => {
    const res = await apiService.inventory.create(p);
    if (res.data.success) setProducts(prev => [...prev, p]);
  }, []);

  const updateProduct = useCallback(async (code: string, p: Partial<Product>) => {
    const res = await apiService.inventory.update(code, p);
    if (res.data.success) setProducts(prev => prev.map(x => x.productCode === code ? { ...x, ...p } : x));
  }, []);

  const deleteProduct = useCallback(async (code: string) => {
    const res = await apiService.inventory.remove(code);
    if (res.data.success) setProducts(prev => prev.filter(x => x.productCode !== code));
  }, []);

  const addOrder = useCallback(async (o: Order) => {
    const res = await apiService.orders.create(o);
    if (res.data.success) setOrders(prev => [...prev, o]);
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus, reason?: string, actionDate?: string) => {
    const res = await apiService.orders.updateStatus(id, { status, reason, actionDate });
    if (res.data.success) setOrders(prev => prev.map(o => o.orderId === id ? { ...o, status, ...(reason ? { narration: reason } : {}), ...(actionDate ? { dispatchDate: actionDate } : {}) } : o));
  }, []);

  const updateOrderItems = useCallback(async (id: string, updatedOrder: any) => {
    const res = await apiService.orders.updateItems(id, updatedOrder);
    if (res.data.success) setOrders(prev => prev.map(o => o.orderId === id ? { ...o, ...updatedOrder } : o));
  }, []);

  const addVisit = useCallback(async (v: Visit) => {
    const res = await apiService.visits.add(v);
    if (res.data.success) setVisits(prev => [...prev, v]);
  }, []);

  const addExpense = useCallback(async (e: Expense) => {
    const res = await apiService.expenses.add(e);
    if (res.data.success && res.data.data) setExpenses(prev => [...prev, res.data.data!]);
  }, []);

  const updateExpenseStatus = useCallback(async (id: string, status: string, rejectReason?: string) => {
    const res = await apiService.expenses.updateStatus(id, status, rejectReason);
    if (res.data.success) setExpenses(prev => prev.map(e => e.id === id ? { ...e, status, rejectReason } : e));
  }, []);


  const updateExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    const res = await apiService.expenses.update(id, data);
    if (res.data.success) setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  }, []);

  const addUser = async (u: Partial<AppUserRecord>) => {
    const res = await apiService.users.create(u);
    if (res.data.success) {
      setUsers(prev => [...prev, res.data.data]);
      return res.data.data;
    }
  };

  const updateUser = async (id: string, u: Partial<AppUserRecord>) => {
    const res = await apiService.users.update(id, u);
    if (res.data.success) {
      setUsers(prev => prev.map(user => user.id === id ? { ...user, ...res.data.data } : user));
      return res.data.data;
    }
  };

  const deleteUser = async (id: string) => {
    const res = await apiService.users.remove(id);
    if (res.data.success) {
      setUsers(prev => prev.filter(user => user.id !== id));
    }
  };

  const updateUserPassword = async (id: string, password: string) => {
    await apiService.users.resetPassword(id, password);
  };

  const updateUserTarget = useCallback(async (id: string, target: number) => {
    const res = await apiService.users.updateTarget(id, target);
    if (res.data.success) setUsers(prev => prev.map(x => x.id === id ? { ...x, monthlyTarget: target } : x));
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    const res = await apiService.settings.update(key, value);
    if (res.data.success) setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePermission = useCallback(async (id: string, isEnabled: boolean) => {
    const res = await apiService.settings.updatePermission(id, isEnabled);
    if (res.data.success) setPermissions(prev => prev.map(p => p.id === id ? { ...p, isEnabled } : p));
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
      warehouses,
      loading, error, refreshAll,
    }}>
      {children}
    </DataContext.Provider>
  );
};
