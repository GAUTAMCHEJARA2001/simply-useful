import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dealer, Distributor, Product, Order, Visit, Expense, OrderStatus } from '@/types';
import { mockDealers, mockDistributors, mockProducts, mockOrders } from '@/data/mockData';

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
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

const defaultPermissions: RolePermission[] = [
  // ADMIN
  { id: '1', role: 'ADMIN', feature: 'view_admin_dashboard', is_enabled: true },
  { id: '2', role: 'ADMIN', feature: 'manage_customers', is_enabled: true },
  { id: '3', role: 'ADMIN', feature: 'view_reports', is_enabled: true },
  { id: '4', role: 'ADMIN', feature: 'access_settings', is_enabled: true },
  { id: '5', role: 'ADMIN', feature: 'view_sales_dashboard', is_enabled: true },
  { id: '6', role: 'ADMIN', feature: 'create_order', is_enabled: true },
  { id: '7', role: 'ADMIN', feature: 'view_own_orders', is_enabled: true },
  { id: '8', role: 'ADMIN', feature: 'view_inventory_dashboard', is_enabled: true },
  // SALES
  { id: '10', role: 'SALES', feature: 'view_sales_dashboard', is_enabled: true },
  { id: '11', role: 'SALES', feature: 'create_order', is_enabled: true },
  { id: '12', role: 'SALES', feature: 'view_own_orders', is_enabled: true },
  { id: '13', role: 'SALES', feature: 'track_visits', is_enabled: true },
  { id: '14', role: 'SALES', feature: 'manage_expenses', is_enabled: true },
  // HR
  { id: '20', role: 'HR', feature: 'view_reports', is_enabled: true },
  // INVENTORY
  { id: '30', role: 'INVENTORY', feature: 'view_inventory_dashboard', is_enabled: true },
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [dealers, setDealers] = useState<Dealer[]>(mockDealers);
  const [distributors, setDistributors] = useState<Distributor[]>(mockDistributors);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<AppUserRecord[]>([
    { id: '1', email: 'sales@tileco.com', name: 'Rajesh Kumar', role: 'SALES', active: true },
    { id: '2', email: 'admin@tileco.com', name: 'Priya Sharma', role: 'ADMIN', active: true },
    { id: '3', email: 'hr@tileco.com', name: 'Amit Patel', role: 'HR', active: true },
    { id: '4', email: 'inventory@tileco.com', name: 'Suresh Gupta', role: 'INVENTORY', active: true },
    { id: '5', email: 'super@tileco.com', name: 'Vikram Singh', role: 'SUPERADMIN', active: true },
  ]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [permissions, setPermissions] = useState<RolePermission[]>(defaultPermissions);
  const loading = false;

  const addDealer = useCallback(async (d: Dealer) => { setDealers(prev => [...prev, d]); }, []);
  const updateDealer = useCallback(async (code: string, d: Partial<Dealer>) => {
    setDealers(prev => prev.map(x => x.dealer_code === code ? { ...x, ...d } : x));
  }, []);
  const deleteDealer = useCallback(async (code: string) => {
    setDealers(prev => prev.filter(x => x.dealer_code !== code));
  }, []);

  const addDistributor = useCallback(async (d: Distributor) => { setDistributors(prev => [...prev, d]); }, []);
  const updateDistributor = useCallback(async (name: string, d: Partial<Distributor>) => {
    setDistributors(prev => prev.map(x => x.distributor_name === name ? { ...x, ...d } : x));
  }, []);
  const deleteDistributor = useCallback(async (name: string) => {
    setDistributors(prev => prev.filter(x => x.distributor_name !== name));
  }, []);

  const addProduct = useCallback(async (p: Product) => { setProducts(prev => [...prev, p]); }, []);
  const updateProduct = useCallback(async (code: string, p: Partial<Product>) => {
    setProducts(prev => prev.map(x => x.product_code === code ? { ...x, ...p } : x));
  }, []);
  const deleteProduct = useCallback(async (code: string) => {
    setProducts(prev => prev.filter(x => x.product_code !== code));
  }, []);

  const addOrder = useCallback(async (o: Order) => { setOrders(prev => [...prev, o]); }, []);
  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus, reason?: string, action_date?: string) => {
    setOrders(prev => prev.map(o => o.order_id === id ? { ...o, status, ...(reason ? { narration: reason } : {}), ...(action_date ? { dispatch_date: action_date } : {}) } : o));
  }, []);
  const updateOrderItems = useCallback(async (id: string, updatedOrder: any) => {
    setOrders(prev => prev.map(o => o.order_id === id ? { ...o, ...updatedOrder } : o));
  }, []);

  const addVisit = useCallback(async (v: Visit) => { setVisits(prev => [...prev, v]); }, []);

  const addExpense = useCallback(async (e: Expense) => {
    setExpenses(prev => [...prev, { ...e, id: Date.now() }]);
  }, []);
  const updateExpenseStatus = useCallback(async (id: number, status: string, reject_reason?: string) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status, reject_reason } : e));
  }, []);
  const updateExpense = useCallback(async (id: number, data: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  }, []);

  const addUser = useCallback(async (u: { email: string; password: string; name: string; role: string; active: boolean }) => {
    setUsers(prev => [...prev, { id: String(Date.now()), email: u.email, name: u.name, role: u.role, active: u.active }]);
  }, []);
  const updateUser = useCallback(async (id: string, u: Partial<AppUserRecord>) => {
    setUsers(prev => prev.map(x => x.id === id ? { ...x, ...u } : x));
  }, []);
  const deleteUser = useCallback(async (id: string) => {
    setUsers(prev => prev.filter(x => x.id !== id));
  }, []);
  const updateUserPassword = useCallback(async (_id: string, _password: string) => {}, []);
  const updateUserTarget = useCallback(async (id: string, target: number) => {
    setUsers(prev => prev.map(x => x.id === id ? { ...x, monthly_target: target } : x));
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePermission = useCallback(async (id: string, is_enabled: boolean) => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, is_enabled } : p));
  }, []);

  const refreshAll = useCallback(async () => {}, []);

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
      loading, refreshAll,
    }}>
      {children}
    </DataContext.Provider>
  );
};
