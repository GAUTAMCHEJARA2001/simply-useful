import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Package, Warehouse as WarehouseIcon, Truck, ShoppingCart, Factory, Search,
  BarChart3, Sliders, Plus, Trash2, RefreshCw,
  TrendingUp, DollarSign, ClipboardList, UserCheck, X
} from 'lucide-react';
import { DashboardTab } from './InventoryManagement/components/DashboardTab';
import { ProductsTab } from './InventoryManagement/components/ProductsTab';
import { CategoriesTab } from './InventoryManagement/components/CategoriesTab';
import { SubCategoriesTab } from './InventoryManagement/components/SubCategoriesTab';
import { BrandsTab } from './InventoryManagement/components/BrandsTab';
import { StockLedgerTab } from './InventoryManagement/components/StockLedgerTab';
import { UnitsTab } from './InventoryManagement/components/UnitsTab';
import { SuppliersTab } from './InventoryManagement/components/SuppliersTab';
import { LabourTab } from './InventoryManagement/components/LabourTab';
import { TotalStockTab } from './InventoryManagement/components/TotalStockTab';
import { SettingsTab } from './InventoryManagement/components/SettingsTab';
import { PurchaseOrdersTab } from './InventoryManagement/components/PurchaseOrdersTab';
import { PurchasesTab } from './InventoryManagement/components/PurchasesTab';
import { SalesTab } from './InventoryManagement/components/SalesTab';
import { ProductionsTab } from './InventoryManagement/components/ProductionsTab';
import { AdjustmentsTab } from './InventoryManagement/components/AdjustmentsTab';
import { AttendanceTab } from './InventoryManagement/components/AttendanceTab';
import { ApprovalsTab } from './InventoryManagement/components/ApprovalsTab';
import { ReturnsTab } from './InventoryManagement/components/ReturnsTab';
import { ReportsTab } from './InventoryManagement/components/ReportsTab';
import { RecipesTab } from './InventoryManagement/components/RecipesTab';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';
import { SafeDataView } from '@/components/SafeDataView';
import { StockItem } from '@/types';


// ─── Type Definitions ─────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'products' | 'categories' | 'sub_categories' | 'brands' | 'units' | 'suppliers' | 'labour' |
  'purchases' | 'sales' | 'productions' | 'adjustments' | 'attendance' | 'approvals' | 'returns' | 'reports' | 'settings' | 'stock_ledger' | 'purchase_orders' | 'total_stock' | 'bom';

// ─── Reusable Modal ───────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  </div>
);

// ─── INV API Helper (Extraction layers for direct data access) ──────────
const inv = {
  get: async <T,>(path: string): Promise<T> => {
    const res = await apiClient<T>(path.startsWith('/') ? path : `/${path}`);
    if (!res.success) throw new Error(res.message);
    return res.data as T;
  },
  post: async <T,>(path: string, data: any): Promise<T> => {
    const res = await apiClient<T>(path.startsWith('/') ? path : `/${path}`, { method: 'POST', data });
    if (!res.success) throw new Error(res.message);
    return res.data as T;
  },
  del: async (path: string): Promise<any> => {
    const res = await apiClient<any>(path.startsWith('/') ? path : `/${path}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.message);
    return res.data;
  },
  put: async <T,>(path: string, data: any): Promise<T> => {
    const res = await apiClient<T>(path.startsWith('/') ? path : `/${path}`, { method: 'PUT', data });
    if (!res.success) throw new Error(res.message);
    return res.data as T;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
const InventoryManagement: React.FC = () => {
  const navigate = useNavigate(); // Navigation hook for PO creation redirection
  const { loading: dataLoading } = useData();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Data states
  const [stock, setStock] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [labours, setLabours] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([
    { id: '1', challanNumber: 'PUR-001', supplierName: 'RawChem Industries', warehouseName: 'Main Warehouse', netAmount: 185000, createdAt: '2026-03-10T10:00:00Z' },
    { id: '2', challanNumber: 'PUR-002', supplierName: 'Polymer World', warehouseName: 'South Depot', netAmount: 92000, createdAt: '2026-03-15T14:30:00Z' },
    { id: '3', challanNumber: 'PUR-003', supplierName: 'Cement Corp', warehouseName: 'Main Warehouse', netAmount: 310000, createdAt: '2026-03-22T09:15:00Z' },
  ]);
  const [sales, setSales] = useState<any[]>([
    { id: '1', challanNumber: 'SAL-001', customerName: 'Sharma Tiles', warehouseName: 'Main Warehouse', netAmount: 45000, createdAt: '2026-03-12T11:00:00Z' },
    { id: '2', challanNumber: 'SAL-002', customerName: 'Patel Hardware', warehouseName: 'Main Warehouse', netAmount: 78000, createdAt: '2026-03-18T16:00:00Z' },
    { id: '3', challanNumber: 'SAL-003', customerName: 'Singh Building Materials', warehouseName: 'South Depot', netAmount: 120000, createdAt: '2026-03-25T13:45:00Z' },
  ]);
  const [productions, setProductions] = useState<any[]>([
    { id: '1', productName: 'TileFix Standard', quantity: 200, warehouseName: 'Main Warehouse', status: 'Completed', createdAt: '2026-03-08T08:00:00Z' },
    { id: '2', productName: 'TileFix Premium', quantity: 150, warehouseName: 'Main Warehouse', status: 'Completed', createdAt: '2026-03-14T07:30:00Z' },
    { id: '3', productName: 'GroutMaster White', quantity: 100, warehouseName: 'East Hub', status: 'In Progress', createdAt: '2026-04-01T09:00:00Z' },
  ]);
  const [adjustments, setAdjustments] = useState<any[]>([
    { id: '1', productName: 'TileFix Standard', type: 'Decrease', quantity: 5, reason: 'Damaged in transit', warehouseName: 'Main Warehouse', createdAt: '2026-03-20T10:00:00Z' },
    { id: '2', productName: 'GroutMaster Color', type: 'Increase', quantity: 10, reason: 'Found in audit', warehouseName: 'South Depot', createdAt: '2026-03-28T15:00:00Z' },
  ]);
  const [attendance, setAttendance] = useState<any[]>([
    { id: '1', labourName: 'Ramesh Yadav', date: '2026-04-10', status: 'Present', hours: 8 },
    { id: '2', labourName: 'Sunil Sharma', date: '2026-04-10', status: 'Present', hours: 8 },
    { id: '3', labourName: 'Anil Kumar', date: '2026-04-10', status: 'Absent', hours: 0 },
  ]);
  const [approvals, setApprovals] = useState<any[]>([
    { id: '1', referenceId: 'ORD-001', customerName: 'Sharma Tiles', soName: 'Rajesh Kumar', status: 'Pending', grandTotal: 23100, createdAt: '2026-04-05T12:00:00Z' },
    { id: '2', referenceId: 'ORD-002', customerName: 'Patel Hardware', soName: 'Rajesh Kumar', status: 'Approved', grandTotal: 15600, createdAt: '2026-04-06T10:30:00Z' },
  ]);
  const [returns, setReturns] = useState<any[]>([
    { id: '1', type: 'Purchase Return', challanNumber: 'PR-001', netAmount: 12000, createdAt: '2026-03-30T11:00:00Z' },
    { id: '2', type: 'Sales Return', challanNumber: 'SR-001', netAmount: 8500, createdAt: '2026-04-02T14:00:00Z' },
  ]);
  const [customers, setCustomers] = useState<any[]>([
    { id: '1', name: 'Sharma Tiles', contact: '9876500001', address: 'Mumbai' },
    { id: '2', name: 'Patel Hardware', contact: '9876500002', address: 'Ahmedabad' },
    { id: '3', name: 'Singh Building Materials', contact: '9876500003', address: 'Delhi' },
  ]);
  const [settings, setSettings] = useState<any>({ companyName: 'TileCo Industries', gstNumber: '27AABCT1234F1ZN', currency: 'INR' });
  
  const [boms, setBoms] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [aggregateStock, setAggregateStock] = useState<any[]>([]);

  // Modal state
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [bomSearch, setBomSearch] = useState('');
  const [viewDetails, setViewDetails] = useState<{ type: string; data: any; items?: any[], order?: any } | null>(null);

  const handleRowClick = async (type: string, item: any) => {
    let items = [];
    let orderDetails = null;
    if (type === 'purchase' || type === 'sale' || type === 'production' || type === 'return' || type === 'PURCHASE_ORDER') {
      try {
        const endpoint = type === 'production' ? `transactions/productions/${item.id}/materials` : 
                       (type === 'PURCHASE_ORDER' ? `transactions/purchase-orders/${item.id}/items` : `transactions/${type}s/${item.id}/items`);
        items = await inv.get<any[]>(endpoint);
        if (type === 'sale' && item.order_id) {
          try {
            orderDetails = await inv.get<any>(`transactions/approvals/${item.order_id}`);
          } catch { /* ignored */ }
        }
      } catch (e) {
        console.error(`Failed to load ${type} items`, e);
      }
    } else if (type === 'approval') {
      const itArr = typeof item.items === 'string' ? JSON.parse(item.items) : (item.items || []);
      items = itArr;
      orderDetails = {
        order_id: item.order_id || item.referenceId,
        soName: item.soName || null,
        soEmail: item.soEmail || null,
        customerName: item.customerName || null,
        dispatch_date: item.dispatch_date || item.createdAt
      };
    }
    setViewDetails({ type, data: item, items, order: orderDetails });
  };


  const loadTabData = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'dashboard':
          break;
        case 'products':
          const [p, cat, br, un] = await Promise.all([
            inv.get<any[]>('masters/products').catch(() => []),
            inv.get<any[]>('masters/categories').catch(() => []),
            inv.get<any[]>('masters/brands').catch(() => []),
            inv.get<any[]>('masters/units').catch(() => [])
          ]);
          setProducts(p || []); setCategories(cat || []); setBrands(br || []); setUnits(un || []);
          break;
        case 'total_stock':
          const [st, aggSt] = await Promise.all([
            inv.get<any[]>('reports/current-stock').catch(() => []),
            inv.get<any[]>('reports/aggregate-stock').catch(() => [])
          ]);
          setStock(st || []); setAggregateStock(aggSt || []);
          break;
        case 'units':
          setUnits((await inv.get<any[]>('masters/units').catch(() => [])) || []);
          break;
        case 'suppliers':
          setSuppliers((await inv.get<any[]>('masters/suppliers').catch(() => [])) || []);
          break;
        case 'labour':
          setLabours((await inv.get<any[]>('masters/labours').catch(() => [])) || []);
          break;
        case 'purchases':
          const [pur, sups, whs] = await Promise.all([
            inv.get<any[]>('transactions/purchases').catch(() => []),
            inv.get<any[]>('masters/suppliers').catch(() => []),
            inv.get<any[]>('masters/warehouses').catch(() => [])
          ]);
          setPurchases(pur || []); setSuppliers(sups || []); setWarehouses(whs || []);
          break;
        case 'sales':
          const [sal, custs, apprs, stck, prods] = await Promise.all([
            inv.get<any[]>('transactions/sales').catch(() => []),
            inv.get<any[]>('masters/customers').catch(() => []),
            inv.get<any[]>('transactions/approvals').catch(() => []),
            inv.get<any[]>('reports/current-stock').catch(() => []),
            inv.get<any[]>('masters/products').catch(() => [])
          ]);
          setSales(sal || []); setCustomers(custs || []); setApprovals(apprs || []); setStock(stck || []); setProducts(prods || []);
          break;
        case 'productions':
          const [prod, bms, whs2, prds] = await Promise.all([
            inv.get<any[]>('transactions/productions').catch(() => []),
            inv.get<any[]>('bom').catch(() => []),
            inv.get<any[]>('masters/warehouses').catch(() => []),
            inv.get<any[]>('masters/products').catch(() => [])
          ]);
          setProductions(prod || []); setBoms(bms || []); setWarehouses(whs2 || []); setProducts(prds || []);
          break;
        case 'adjustments':
          setAdjustments(await inv.get<any[]>('transactions/adjustments'));
          break;
        case 'attendance':
          setAttendance(await inv.get<any[]>('transactions/attendance'));
          break;
        case 'approvals':
          setApprovals(await inv.get<any[]>('transactions/approvals'));
          break;
        case 'returns':
          setReturns(await inv.get<any[]>('transactions/returns'));
          break;
        case 'purchase_orders':
          setPurchaseOrders(await inv.get<any[]>('transactions/purchase-orders'));
          break;
        case 'settings':
          setSettings(await inv.get<any>('masters/settings'));
          break;
        case 'reports':
          const [st2, ss] = await Promise.all([
            inv.get<any[]>('reports/current-stock'),
            inv.get<any[]>('reports/sales-summary')
          ]);
          setStock(st2); setSalesSummary(ss);
          break;
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load tab data');
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);


  // Load basic dependencies needed for initial view or shared across modals
  useEffect(() => {
    const init = async () => {
      try {
        const [p, w, u, c] = await Promise.all([
          inv.get<any[]>('masters/products').catch(() => []),
          inv.get<any[]>('masters/warehouses').catch(() => []),
          inv.get<any[]>('masters/units').catch(() => []),
          inv.get<any[]>('masters/categories').catch(() => [])
        ]);
        setProducts(p); setWarehouses(w); setUnits(u); setCategories(c);
        loadTabData(tab);
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    loadTabData(tab);
  }, [tab, loadTabData]);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!can('view_inventory_dashboard')) return <Navigate to="/" replace />;

  const addLineItem = () => setLineItems(prev => [...prev, { productId: '', quantity: 1, rate: 0, tax_percent: 0, selling_rate: 0, quantityUsed: 0 }]);
  const removeLineItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLineItem = (i: number, key: string, val: any) => setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const stockForProduct = (productId: string) => {
    const s = stock.find(s => s.productId === productId);
    return s ? parseFloat(s.currentStock as any) : 0;
  };

  const handleEdit = (type: string, item: any) => {
    setForm(item);
    setModal(type);
    if (item.items) setLineItems(item.items);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const isEdit = !!form.id;

      if (['category', 'brand', 'unit', 'warehouse', 'supplier', 'labour', 'attendance', 'adjustment', 'settings', 'bom'].includes(modal!)) {
        const pathMap: any = { category: 'masters/categories', brand: 'masters/brands', unit: 'masters/units', warehouse: 'masters/warehouses', supplier: 'masters/suppliers', labour: 'masters/labours', settings: 'masters/settings', attendance: 'transactions/attendance', adjustment: 'transactions/adjustments', bom: 'bom' };
        let path = pathMap[modal!];
        if (isEdit) path += `/${form.id}`;
        await (isEdit ? inv.put(path, form) : inv.post(path, form));
        toast({ title: `${modal} saved` });
      } else if (modal === 'product') {
        if (isEdit) {
          await inv.put(`masters/products/${form.id}`, form);
          toast({ title: 'Product updated' });
        } else {
          const skuRes = await inv.post<any>('masters/products', form);
          toast({ title: 'Product created', description: skuRes.sku });
        }
      } else if (modal === 'purchase') {
        const data = { ...form, items: lineItems };
        if (isEdit) {
          await inv.put(`transactions/purchases/${form.id}`, data);
          toast({ title: 'Purchase updated' });
        } else {
          await inv.post('transactions/purchases', data);
          toast({ title: 'Purchase recorded' });
        }
      } else if (modal === 'sale') {
        await inv.post('transactions/sales', { ...form, items: lineItems });
        toast({ title: 'Sale recorded' });
      } else if (modal === 'production') {
        const data = { ...form, raw_materials: lineItems };
        if (isEdit) {
          await inv.put(`transactions/productions/${form.id}`, data);
          toast({ title: 'Production updated' });
        } else {
          await inv.post('transactions/productions', data);
          toast({ title: 'Production recorded' });
        }
      }
      setModal(null); setForm({}); setLineItems([]);
      // refresh handled by state
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Something went wrong', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleDelete = async (group: 'masters' | 'transactions', type: string, id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      await inv.del(`${group}/${type}/${id}`);
      toast({ title: 'Deleted' });
      // refresh handled by state
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const navItems: { id: Tab; label: string; icon: any; group: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, group: 'Overview' },
    { id: 'reports', label: 'Reports', icon: TrendingUp, group: 'Overview' },
    { id: 'total_stock', label: 'Total Stock', icon: Package, group: 'Overview' },
    { id: 'stock_ledger', label: 'Stock Ledger', icon: ClipboardList, group: 'Overview' },
    { id: 'products', label: 'Products', icon: Package, group: 'Masters' },
    { id: 'categories', label: 'Categories', icon: Sliders, group: 'Masters' },
    { id: 'sub_categories', label: 'Sub Categories', icon: ClipboardList, group: 'Masters' },
    { id: 'brands', label: 'Brands', icon: Package, group: 'Masters' },
    { id: 'units', label: 'Units', icon: Sliders, group: 'Masters' },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, group: 'Masters' },
    { id: 'labour', label: 'Labour', icon: UserCheck, group: 'Masters' },
    { id: 'settings', label: 'Settings', icon: Sliders, group: 'Masters' },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: ClipboardList, group: 'Transactions' },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart, group: 'Transactions' },
    { id: 'sales', label: 'Sales', icon: DollarSign, group: 'Transactions' },
    { id: 'productions', label: 'Production', icon: Factory, group: 'Transactions' },
    { id: 'adjustments', label: 'Adjustments', icon: ClipboardList, group: 'Transactions' },
    { id: 'attendance', label: 'Attendance', icon: UserCheck, group: 'Transactions' },
    { id: 'approvals', label: 'Approvals', icon: ClipboardList, group: 'Transactions' },
    { id: 'returns', label: 'Returns', icon: ShoppingCart, group: 'Transactions' },
  ];

  const groups = [...new Set(navItems.map(n => n.group))];
  
  const getProductUnit = (productId: string) => {
    const p = products.find(prod => prod.id === productId);
    return p ? p.unit : '—';
  };

  const handleApprove = async (id: string) => {
    try { await inv.post(`transactions/approvals/${id}/approve`, {}); toast({ title: 'Approved and effect given' });  } 
    catch (e: any) { toast({ title: 'Approval failed', description: e.message, variant: 'destructive' }); }
  };
  const handleReject = async (id: string) => {
    try { await inv.post(`transactions/approvals/${id}/reject`, {}); toast({ title: 'Rejected' });  } 
    catch (e: any) { toast({ title: 'Rejection failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 relative">
      {/* Sidebar */}
      <nav className="hidden md:block w-52 shrink-0 space-y-4 sticky top-4 self-start">
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-6">
          <div className="flex items-center gap-3 mb-1">
             <div className="p-2 rounded-xl bg-primary/10 text-primary">
               <WarehouseIcon className="w-5 h-5" />
             </div>
             <div>
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Storage</p>
               <p className="text-sm font-bold truncate">Main Depot</p>
             </div>
          </div>
        </div>
        {groups.map(group => (
          <div key={group}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1">{group}</p>
            {navItems
              .filter(n => n.group === group)
              .filter(n => n.id !== 'bom' || user?.role === 'SUPERADMIN')
              .map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${tab === n.id ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                <n.icon className="w-4 h-4 shrink-0" />{n.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Navbar */}
        <div className="block md:hidden mb-4 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex gap-2 whitespace-nowrap">
            {navItems
              .filter(n => n.id !== 'bom' || user?.role === 'SUPERADMIN')
              .map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${tab === n.id ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground'}`}>
                <n.icon className="w-3.5 h-3.5" />{n.label}
              </button>
            ))}
          </div>
        </div>
        {loading && tab !== 'dashboard' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        )}
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'sub_categories' && <SubCategoriesTab />}
        {tab === 'brands' && <BrandsTab />}

        {tab === 'total_stock' && (
          <SafeDataView data={aggregateStock} isLoading={loading} error={error} onRetry={() => loadTabData('total_stock')} emptyMessage="No stock data found">
            <TotalStockTab aggregateStock={aggregateStock} stock={stock} warehouses={warehouses} />
          </SafeDataView>
        )}
        {tab === 'units' && (
          <SafeDataView data={units} isLoading={loading} error={error} onRetry={() => loadTabData('units')} emptyMessage="No units found">
            <UnitsTab units={units} userRole={user?.role || ''} onAdd={() => { setForm({}); setModal('unit'); }} onEdit={u => handleEdit('unit', u)} onDelete={id => handleDelete('masters', 'units', id)} onRowClick={u => handleRowClick('unit', u)} />
          </SafeDataView>
        )}
        {tab === 'suppliers' && (
          <SafeDataView data={suppliers} isLoading={loading} error={error} onRetry={() => loadTabData('suppliers')} emptyMessage="No suppliers found">
            <SuppliersTab suppliers={suppliers} onAdd={() => { setForm({}); setModal('supplier'); }} onEdit={s => handleEdit('supplier', s)} onDelete={id => handleDelete('masters', 'suppliers', id)} onRowClick={s => handleRowClick('supplier', s)} Currency={Currency} />
          </SafeDataView>
        )}
        {tab === 'stock_ledger' && <StockLedgerTab onViewTransaction={(type, refId) => handleRowClick(type, { id: refId })} />}
        {tab === 'labour' && (
          <SafeDataView data={labours} isLoading={loading} error={error} onRetry={() => loadTabData('labour')} emptyMessage="No labour found">
            <LabourTab labours={labours} onAdd={() => { setForm({}); setModal('labour'); }} onEdit={l => handleEdit('labour', l)} onDelete={id => handleDelete('masters', 'labours', id)} onRowClick={l => handleRowClick('labour', l)} Currency={Currency} />
          </SafeDataView>
        )}

        {tab === 'settings' && <SettingsTab settings={settings} setSettings={setSettings} onSave={() => { setForm(settings); setModal('settings'); handleSave(); }} />}
        {tab === 'purchase_orders' && (
          <SafeDataView data={purchaseOrders} isLoading={loading} error={error} onRetry={() => loadTabData('purchase_orders')} emptyMessage="No purchase orders found">
            <PurchaseOrdersTab purchaseOrders={purchaseOrders} onAdd={() => navigate('/inventory/purchase-orders/new')} onRowClick={po => handleRowClick('PURCHASE_ORDER', po)} Currency={Currency} />
          </SafeDataView>
        )}
        {tab === 'purchases' && (
          <SafeDataView data={purchases} isLoading={loading} error={error} onRetry={() => loadTabData('purchases')} emptyMessage="No purchases found">
            <PurchasesTab purchases={purchases} onAdd={() => { setForm({}); setLineItems([{ productId: '', quantity: 1, rate: 0, tax_percent: 0 }]); setModal('purchase'); }} onEdit={async p => {
              const s = suppliers.find(sup => sup.id === p.supplier_id);
              setForm({ ...p, supplier_contact_person: s ? s.contact_person : '', supplier_contact: s ? s.contact_info : '', supplier_email: s ? s.email : '', supplier_address: s ? s.address : '' });
              const items = await inv.get<any[]>(`transactions/purchases/${p.id}/items`);
              setLineItems(items.map(it => ({ productId: it.productId, quantity: parseFloat(it.quantity), rate: parseFloat(it.rate), tax_percent: parseFloat(it.tax_percent || 0), remark: it.remark || '' })));
              setModal('purchase');
            }} onDelete={id => handleDelete('transactions', 'purchases', id)} onRowClick={p => handleRowClick('purchase', p)} Currency={Currency} />
          </SafeDataView>
        )}
        {tab === 'sales' && (
          <SafeDataView data={sales} isLoading={loading} error={error} onRetry={() => loadTabData('sales')} emptyMessage="No sales found">
            <SalesTab sales={sales} onAdd={() => { setForm({}); setLineItems([{ productId: '', quantity: 1, selling_rate: 0, tax_percent: 0 }]); setModal('sale'); }} onDelete={id => handleDelete('transactions', 'sales', id)} onRowClick={s => handleRowClick('sale', s)} Currency={Currency} />
          </SafeDataView>
        )}
        {tab === 'productions' && (
          <SafeDataView data={productions} isLoading={loading} error={error} onRetry={() => loadTabData('productions')} emptyMessage="No production records found">
            <ProductionsTab productions={productions} onAdd={() => { setForm({}); setLineItems([{ productId: '', quantityUsed: 1 }]); setModal('production'); }} onRowClick={p => handleRowClick('production', p)} />
          </SafeDataView>
        )}
        {tab === 'adjustments' && (
          <SafeDataView data={adjustments} isLoading={loading} error={error} onRetry={() => loadTabData('adjustments')} emptyMessage="No adjustments found">
            <AdjustmentsTab adjustments={adjustments} onAdd={() => { setForm({}); setModal('adjustment'); }} onEdit={a => handleEdit('adjustment', a)} onDelete={id => handleDelete('transactions', 'adjustments', id)} onRowClick={a => handleRowClick('adjustment', a)} />
          </SafeDataView>
        )}
        {tab === 'attendance' && (
          <SafeDataView data={attendance} isLoading={loading} error={error} onRetry={() => loadTabData('attendance')} emptyMessage="No attendance records found">
            <AttendanceTab attendance={attendance} onAdd={() => { setForm({}); setModal('attendance'); }} onEdit={a => handleEdit('attendance', a)} onDelete={id => handleDelete('transactions', 'attendance', id)} onRowClick={a => handleRowClick('attendance', a)} Currency={Currency} />
          </SafeDataView>
        )}

        {tab === 'approvals' && (
          <SafeDataView data={approvals} isLoading={loading} error={error} onRetry={() => loadTabData('approvals')} emptyMessage="No pending approvals found">
            <ApprovalsTab approvals={approvals} onRowClick={a => handleRowClick('approval', a)} onApprove={handleApprove} onReject={handleReject} userRole={user?.role || ''} Currency={Currency} />
          </SafeDataView>
        )}
        {tab === 'returns' && (
          <SafeDataView data={returns} isLoading={loading} error={error} onRetry={() => loadTabData('returns')} emptyMessage="No returns found">
            <ReturnsTab returns={returns} onRowClick={r => handleRowClick('return', r)} Currency={Currency} />
          </SafeDataView>
        )}
        {tab === 'reports' && (
          <SafeDataView data={stock} isLoading={loading} error={error} onRetry={() => loadTabData('reports')}>
            <ReportsTab stock={stock} salesSummary={salesSummary} Currency={Currency} />
          </SafeDataView>
        )}
        {tab === 'bom' && <RecipesTab onRefresh={() => loadTabData('bom')} />}
      </div>

      {/* ─── MODALS ─── */}

      {modal === 'product' && (
        <Modal title="Add Product" onClose={() => setModal(null)}>
          <div className="space-y-4">
            {[['sku', 'SKU', 'text'], ['name', 'Product Name', 'text'], ['minimumStock', 'Minimum Stock', 'number'], ['default_price', 'Default Price', 'number']].map(([k, lbl, type]) => (
              <div key={k as string}>
                <label className="text-sm font-medium block mb-1">{lbl as string}</label>
                <input type={type as string} value={form[k as string] || ''} onChange={e => setForm({ ...form, [k as string]: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium block mb-1">Unit</label>
              <select value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select Unit --</option>
                {(units || []).map((u: any) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- None --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Brand</label>
              <select value={form.brand_id || ''} onChange={e => setForm({ ...form, brand_id: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- None --</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Warehouse</label>
              <select value={form.default_warehouse_id || ''} onChange={e => setForm({ ...form, default_warehouse_id: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- None --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'category' && (
        <Modal title={form.id ? "Edit Category" : "Add Category"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            {(tab === 'sub_categories' || form.parent_id) && (
              <div>
                <label className="text-sm font-medium block mb-1">Parent Category</label>
                <select value={form.parent_id || ''} onChange={e => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="" disabled>-- Select Parent --</option>
                  {categories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'unit' && (
        <Modal title={form.id ? "Edit Unit" : "Add Unit"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'brand' && (
        <Modal title="Add Brand" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'warehouse' && (
        <Modal title="Add Warehouse" onClose={() => setModal(null)}>
          <div className="space-y-4">
            {[['name', 'Name'], ['location', 'Location'], ['gstNumber', 'GST Number']].map(([k, lbl]) => (
              <div key={k}><label className="text-sm font-medium block mb-1">{lbl}</label>
                <input value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
            ))}
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'supplier' && (
        <Modal title="Add Supplier" onClose={() => setModal(null)}>
          <div className="space-y-4">
            {[['name', 'Name'], ['contact_person', 'Contact Person'], ['contact_info', 'Contact'], ['email', 'Email'], ['address', 'Address'], ['gstNumber', 'GST Number']].map(([k, lbl]) => (
              <div key={k}><label className="text-sm font-medium block mb-1">{lbl}</label>
                <input value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
            ))}
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'labour' && (
        <Modal title="Add Labour" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium block mb-1">Name</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
            <div><label className="text-sm font-medium block mb-1">Daily Wage (₹)</label><input type="number" value={form.dailyWage || ''} onChange={e => setForm({ ...form, dailyWage: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'purchase' && (
        <Modal title={form.id ? 'Edit Purchase Order' : 'New Purchase Registration'} onClose={() => setModal(null)}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            
            {/* 🏷️ SECTION 1: SUPPLIER & WAREHOUSE */}
            <div className="bg-gradient-to-br from-primary/5 via-background to-muted/20 p-4 rounded-xl border border-border/40 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/60"></div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                Supplier Profile Details
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground/80 block mb-1">Select Supplier</label>
                  <select value={form.supplier_id || ''} onChange={e => {
                    const s = suppliers.find(sup => sup.id === e.target.value);
                    setForm({ 
                      ...form, 
                      supplier_id: e.target.value,
                      supplier_contact_person: s ? s.contact_person : '',
                      supplier_contact: s ? s.contact_info : '',
                      supplier_email: s ? s.email : '',
                      supplier_address: s ? s.address : ''
                    });
                  }} className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all">
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {form.supplier_id && (
                <div className="mt-2 grid grid-cols-3 gap-2 bg-background/60 backdrop-blur-sm p-3 rounded-lg border border-border/30 shadow-sm animate-in fade-in-20 duration-200">
                  <div>
                    <label className="text-[10px] text-muted-foreground block font-medium">Contact Person</label>
                    <input value={form.supplier_contact_person || '—'} readOnly className="w-full border-none p-0 bg-transparent text-[11px] focus:ring-0 cursor-default font-semibold text-foreground/90" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block font-medium">Phone</label>
                    <input value={form.supplier_contact || '—'} readOnly className="w-full border-none p-0 bg-transparent text-[11px] focus:ring-0 cursor-default font-semibold text-foreground/90" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block font-medium">Email</label>
                    <input value={form.supplier_email || '—'} readOnly className="w-full border-none p-0 bg-transparent text-[11px] focus:ring-0 cursor-default font-semibold text-foreground/90" />
                  </div>
                  <div className="col-span-3 border-t border-border/20 pt-1.5 mt-0.5">
                    <label className="text-[10px] text-muted-foreground block font-medium">Address</label>
                    <input value={form.supplier_address || '—'} readOnly className="w-full border-none p-0 bg-transparent text-[11px] focus:ring-0 cursor-default font-semibold text-foreground/90" />
                  </div>
                </div>
              )}
            </div>

            {/* 📄 SECTION 2: INVOICE IDENTIFICATION & WAREHOUSE */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-secondary/10 rounded-xl border border-border/30">
              <div>
                <label className="text-[11px] font-semibold text-foreground/80 block mb-1">Destination Warehouse</label>
                <select value={form.warehouse_id || ''} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all">
                  <option value="">-- Choose Warehouse --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground/80 block mb-1">Challan/Bill/Invoice Number</label>
                <input value={form.challanNumber || ''} onChange={e => setForm({ ...form, challanNumber: e.target.value })} placeholder="E.g., CH-4589" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground/80 block mb-1">Vehicle Details</label>
                <input value={form.vehicle_number || ''} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} placeholder="E.g., HR-55-A-1234" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all" />
              </div>
            </div>

            {/* 📦 SECTION 3: LINE ITEMS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-border/30">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/70">Invoice Line Items</p>
                <button onClick={addLineItem} className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-md border border-primary/10 transition-colors"><Plus className="w-3.5 h-3.5" /> Add Row</button>
              </div>
              
              <div className="space-y-2">
                {lineItems.map((item, i) => (
                  <div key={i} className="space-y-2 border border-border/50 hover:border-border/80 rounded-xl p-3 bg-muted/10 hover:bg-muted/20 shadow-sm relative overflow-hidden transition-all duration-150">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary/50"></div>
                    <div className="grid grid-cols-6 gap-2 items-end">
                      <div className="col-span-2">
                        <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Product</label>
                        <select value={item.productId} onChange={e => updateLineItem(i, 'productId', e.target.value)} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40">
                          <option value="">-- Product --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Unit</label>
                        <input value={getProductUnit(item.productId)} disabled className="w-full border border-border rounded-md px-2 py-1.5 bg-muted/60 text-muted-foreground cursor-not-allowed text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Qty</label>
                        <input type="number" min="0" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value))} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Rate ₹</label>
                        <input type="number" min="0" value={item.rate} onChange={e => updateLineItem(i, 'rate', parseFloat(e.target.value))} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Tax %</label>
                        <input type="number" min="0" max="100" value={item.tax_percent} onChange={e => updateLineItem(i, 'tax_percent', parseFloat(e.target.value))} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40" />
                      </div>
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      <label className="text-[10px] text-muted-foreground font-semibold block">Item Remark / Notes</label>
                      <input value={item.remark || ''} onChange={e => updateLineItem(i, 'remark', e.target.value)} placeholder="Batch, Expiry, special condition..." className="w-full border border-border/60 rounded-md px-2 py-1.5 bg-background text-[11px] focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all shadow-sm" />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/30 mt-1">
                      <div className="font-semibold text-foreground/80">Item Total: <span className="text-secondary-foreground font-bold">{Currency(item.quantity * item.rate * (1 + (item.tax_percent || 0) / 100))}</span></div>
                      <button onClick={() => removeLineItem(i)} className="p-1 rounded-full hover:bg-destructive/10 text-destructive/80 hover:text-destructive flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 💰 SUM BANNER */}
              <div className="bg-gradient-to-r from-primary via-primary/95 to-primary/85 text-primary-foreground px-4 py-3 rounded-xl flex items-center justify-between shadow-md shadow-primary/5 mt-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">Grand Total Payable</div>
                <div className="text-xl font-black tracking-tight font-mono">
                  {Currency(lineItems.reduce((acc, it) => acc + (it.quantity || 0) * (it.rate || 0) * (1 + (it.tax_percent || 0) / 100), 0))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
              <Button variant="outline" size="sm" onClick={() => setModal(null)} className="rounded-lg text-xs font-medium">Cancel</Button>
              <Button onClick={handleSave} size="sm" className="rounded-lg text-xs font-semibold shadow-sm bg-primary hover:bg-primary/90">Save Purchase Record</Button>
            </div>
          </div>
        </Modal>
      )}


      {modal === 'sale' && (
        <Modal title="New Sale" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Manual Order ID (Optional)</label>
                  <input value={form.order_id || ''} onChange={e => setForm({ ...form, order_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="e.g. ORD-123456" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Auto-fill Lookup</label>
                <select onChange={e => {
                  const orderId = e.target.value;
                  if (!orderId) return;
                  const app = approvals.find(a => a.referenceId === orderId);
                  if (app) {
                    const d = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
                    setForm({
                      ...form,
                      order_id: orderId,
                      challanNumber: d.challanNumber || orderId,
                      vehicle_number: d.vehicle_number || '',
                      warehouse_id: form.warehouse_id || d.warehouse_id || '',
                      party_name: d.party_name || '',
                      soEmail: d.soEmail || '',
                      dispatch_date: d.dispatch_date || '',
                      weight: d.items ? d.items.reduce((sum: number, i: any) => {
                        const prod = products.find((p: any) => p.id === i.productId || p.productName === i.product);
                        const bag_size = prod ? (prod.bag_size || '') : '';
                        const bag_match = bag_size.match(/(\d+)/);
                        const bag_weight = bag_match ? parseInt(bag_match[1]) : 0;
                        const w = prod ? (parseFloat(prod.weight || 0) > 0 ? parseFloat(prod.weight) : bag_weight) : 0;
                        return sum + (parseFloat(i.qty || i.quantity || 0) * w);
                      }, 0) : 0
                    });
                    setLineItems(d.items ? d.items.map((it: any) => ({
                      productId: it.productId || products.find(p => p.productName === it.product)?.id || '',
                      quantity: parseFloat(it.qty || it.quantity || 0),
                      selling_rate: parseFloat(it.price || it.rate || 0),
                      tax_percent: parseFloat(it.tax_percent || 0)
                    })) : []);
                  }
                }} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Manual / Choose Approval --</option>
                  {approvals.filter(a => a.type === 'DISPATCH' || a.type === 'SALE').map(a => <option key={a.id} value={a.referenceId}>{a.referenceId}</option>)}
                </select>
              </div>
            </div>

            {form.party_name && (
                <div className="col-span-2 bg-muted/40 p-3 rounded-xl border border-border/40 text-xs space-y-1 animate-in fade-in-20">
                  <p><span className="font-semibold text-muted-foreground mr-1">Party:</span> {form.party_name}</p>
                  <p><span className="font-semibold text-muted-foreground mr-1">Created By:</span> {form.soEmail}</p>
                  {form.dispatch_date && <p><span className="font-semibold text-muted-foreground mr-1">Dispatch Date:</span> {new Date(form.dispatch_date).toLocaleDateString('en-IN')}</p>}
                  <p><span className="font-semibold text-muted-foreground mr-1">Est. Total Weight:</span> <span className="font-medium text-secondary-foreground">{form.weight} kg</span></p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="text-sm font-medium block mb-1">Customer</label>
                <select value={form.customer_id || ''} onChange={e => {
                  const cId = e.target.value;
                  const c = customers.find(c => c.id === cId);
                  setForm({ ...form, customer_id: cId, customerName: c ? c.name : '' });
                }} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Select --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Warehouse</label>
                <select value={form.warehouse_id || ''} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Select --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Challan #</label><input value={form.challanNumber || ''} onChange={e => setForm({ ...form, challanNumber: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1">Vehicle #</label><input value={form.vehicle_number || ''} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Line Items</p>
                <button onClick={addLineItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Row</button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, i) => {
                  const avail = stockForProduct(item.productId);
                  const insufficient = item.productId && item.quantity > avail;
                  return (
                    <div key={i} className={`grid grid-cols-4 gap-2 items-end rounded-lg p-2 ${insufficient ? 'bg-red-50 border border-red-200' : 'bg-muted/30'}`}>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Product</label>
                        <select value={item.productId} onChange={e => updateLineItem(i, 'productId', e.target.value)} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs">
                          <option value="">-- Select --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) · Stock: {stockForProduct(p.id)}</option>)}
                        </select>
                        {insufficient && <p className="text-[10px] text-red-600 mt-0.5">⚠ Only {avail} in stock</p>}
                      </div>
                      <div><label className="text-xs text-muted-foreground">Qty</label><input type="number" min="0" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value))} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs" /></div>
                      <div><label className="text-xs text-muted-foreground">Rate ₹</label><input type="number" min="0" value={item.selling_rate} onChange={e => updateLineItem(i, 'selling_rate', parseFloat(e.target.value))} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs" /></div>
                      <div className="flex items-end justify-between col-span-2">
                        <div><label className="text-xs text-muted-foreground">Tax %</label><input type="number" min="0" max="100" value={item.tax_percent} onChange={e => updateLineItem(i, 'tax_percent', parseFloat(e.target.value))} className="w-24 border border-border rounded-md px-2 py-1.5 bg-background text-xs" /></div>
                        <button onClick={() => removeLineItem(i)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><X className="w-3 h-3" /></button>
                      </div>
                      <div className="col-span-2 text-xs text-right text-muted-foreground">Line Total: {Currency(item.quantity * item.selling_rate * (1 + (item.tax_percent || 0) / 100))}</div>
                    </div>
                  );
                })}
              </div>
              <div className="text-right mt-2 font-bold text-sm">
                Grand Total: {Currency(lineItems.reduce((acc, it) => acc + it.quantity * it.selling_rate * (1 + (it.tax_percent || 0) / 100), 0))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save Sale</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'production' && (
        <Modal title="New Production Run" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-primary/5 p-4 rounded-xl border border-primary/10 mb-4">
              <div className="col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">Recipe / BOM (Pre-fills materials)</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                    <input
                      type="text"
                      placeholder="Search recipe by name or finished product..."
                      value={bomSearch || (boms.find((b: any) => b.id === form.bom_id)?.name || '')}
                      onChange={e => {
                        setBomSearch(e.target.value);
                        if (form.bom_id) setForm({ ...form, bom_id: '' });
                      }}
                      className="w-full border border-primary/20 rounded-lg pl-10 pr-4 py-2 bg-background text-sm font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    {form.bom_id && (
                      <button onClick={() => { setForm({ ...form, bom_id: '' }); setBomSearch(''); }} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {bomSearch && !form.bom_id && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-1 border-primary/10">
                      <button onClick={() => { setForm({ ...form, bom_id: '' }); setBomSearch(''); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-primary/5 rounded-lg transition-colors border-b border-border/40 mb-1">
                        -- Manual Entry (No Recipe) --
                      </button>
                      {boms.filter((b: any) => b.name.toLowerCase().includes(bomSearch.toLowerCase()) || (b.productName || '').toLowerCase().includes(bomSearch.toLowerCase())).map((b: any) => (
                        <button key={b.id} onClick={async () => {
                          const bId = b.id;
                          setBomSearch(b.name);
                          try {
                            const details = await inv.get<any>(`bom/${bId}`);
                            const yieldVal = parseFloat(details.outputQuantity || 1);
                            const prodQty = parseFloat(form.quantityProduced || 1);
                            const prefilledItems = (details.items || []).map((it: any) => ({
                              productId: it.productId,
                              quantityUsed: Number(((parseFloat(it.quantity) / yieldVal) * prodQty).toFixed(2))
                            }));
                            setForm({ ...form, bomId: bId, finishedProductId: b.productId });
                            setLineItems(prefilledItems);
                            toast({ title: `Recipe "${b.name}" loaded` });
                          } catch (e) {
                            toast({ title: 'Failed to load recipe items', variant: 'destructive' });
                          }
                        }} className="w-full text-left px-4 py-2.5 hover:bg-primary/5 rounded-lg transition-colors group">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold group-hover:text-primary transition-colors">{b.name}</span>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded tracking-tighter">Yield: {b.outputQuantity}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">For: {b.productName || 'Unspecified'}</p>
                        </button>
                      ))}
                      {boms.filter((b: any) => b.name.toLowerCase().includes(bomSearch.toLowerCase()) || (b.productName || '').toLowerCase().includes(bomSearch.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">No recipes found.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className={form.bomId ? "opacity-60 pointer-events-none" : ""}>
                <label className="text-sm font-medium block mb-1">Finished Product</label>
                <select value={form.finishedProductId || ''} onChange={e => setForm({ ...form, finishedProductId: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Select --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Warehouse</label>
                <select value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Select --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Quantity to Produce</label>
                <input type="number" min="1" value={form.quantityProduced || 1} 
                  onChange={async e => {
                    const newQty = parseFloat(e.target.value) || 1;
                    setForm({ ...form, quantityProduced: newQty });
                    
                    if (form.bomId) {
                       try {
                         const details = await inv.get<any>(`bom/${form.bomId}`);
                         const yieldVal = parseFloat(details.outputQuantity || 1);
                         setLineItems(_ => (details.items || []).map((it: any) => ({
                           productId: it.productId,
                           quantityUsed: Number(((parseFloat(it.quantity) / yieldVal) * newQty).toFixed(2))
                         })));
                       } catch {}
                    }
                  }} 
                  className="w-full border border-primary/10 rounded-lg px-3 py-2 bg-background text-sm font-bold text-lg" 
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground uppercase text-[10px] font-bold">Remarks</label>
                <textarea 
                  value={form.remarks || ''} 
                  onChange={e => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Add any production notes here..."
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-xs min-h-[60px]"
                />
              </div>
            </div>

            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                  {form.bom_id ? 'Recipe Raw Materials (Editable)' : 'Manual Raw Materials'}
                </p>
                <button onClick={addLineItem} className="text-xs text-primary hover:bg-primary/5 px-2 py-1 rounded border border-primary/20 flex items-center gap-1 transition-all"><Plus className="w-3 h-3" /> Add Material</button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, i) => {
                  const avail = stockForProduct(item.productId);
                  const insufficient = item.productId && item.quantityUsed > avail;
                  return (
                    <div key={i} className={`grid grid-cols-3 gap-2 items-end rounded-lg p-2 ${insufficient ? 'bg-red-50 border border-red-200' : 'bg-muted/30 border border-transparent'}`}>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground uppercase text-[10px] font-bold">Raw Material</label>
                        <select value={item.productId} onChange={e => updateLineItem(i, 'productId', e.target.value)} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs shadow-sm">
                          <option value="">-- Select --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} · Stock: {stockForProduct(p.id)}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end gap-1">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground uppercase text-[10px] font-bold">Qty Used</label>
                          <input type="number" min="0" value={item.quantityUsed} onChange={e => updateLineItem(i, 'quantityUsed', parseFloat(e.target.value))} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs shadow-sm" />
                        </div>
                        <button onClick={() => removeLineItem(i)} className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive mb-0.5"><X className="w-3 h-3" /></button>
                      </div>
                      {insufficient && <p className="col-span-3 text-[10px] text-red-600 font-semibold px-1">⚠ Critical: Only {avail} available in stock.</p>}
                    </div>
                  );
                })}
                {lineItems.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">No raw materials added yet.</p>}
              </div>
            </motion.div>


            <div className="flex justify-end gap-2 pt-4 border-t border-border/20">
              <Button variant="outline" onClick={() => setModal(null)} className="rounded-lg">Cancel</Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 rounded-lg shadow-lg shadow-primary/20">Record Production</Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'adjustment' && (
        <Modal title="Stock Adjustment" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Product</label>
              <select value={form.productId || ''} onChange={e => setForm({ ...form, productId: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) · Stock: {stockForProduct(p.id)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Warehouse</label>
              <select value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Quantity Change (use negative to deduct)</label>
              <input type="number" value={form.quantityChange || ''} onChange={e => setForm({ ...form, quantityChange: parseFloat(e.target.value) })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="+10 or -5" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Reason</label>
              <input value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'attendance' && (
        <Modal title="Mark Attendance" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Labour</label>
              <select value={form.labourId || ''} onChange={e => setForm({ ...form, labourId: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select --</option>
                {labours.map(l => <option key={l.id} value={l.id}>{l.name} (₹{l.dailyWage}/day)</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Date</label>
              <input type="date" value={form.date || new Date().toISOString().split('T')[0]} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Status</label>
              <div className="flex gap-3">
                {['PRESENT', 'HALF_DAY', 'ABSENT'].map(s => (
                  <button key={s} onClick={() => setForm({ ...form, status: s })}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.status === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>{s.replace('_', ' ')}</button>
                ))}
              </div>
              {form.labourId && form.status && (
                <p className="text-xs text-muted-foreground mt-2">
                  Wage: {Currency(
                    form.status === 'PRESENT' ? (labours.find(l => l.id === form.labourId)?.dailyWage || 0) :
                      form.status === 'HALF_DAY' ? (labours.find(l => l.id === form.labourId)?.dailyWage || 0) / 2 : 0
                  )}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Mark</Button></div>
          </div>
        </Modal>
      )}

      {modal === 'bom' && (
        <Modal title={form.id ? "Edit BOM" : "Create New BOM (Recipe)"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Recipe Name</label>
                <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard Tile Adhesive Mix" className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Finished Product</label>
                <select value={form.productId || ''} onChange={e => setForm({ ...form, productId: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Select Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Output Quantity</label>
                <input type="number" value={form.outputQuantity || 1} onChange={e => setForm({ ...form, outputQuantity: parseFloat(e.target.value) })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Ingredients (Raw Materials)</p>
                <button onClick={addLineItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Ingredient</button>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {lineItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-end bg-muted/30 p-2 rounded-lg relative group">
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold">Material</label>
                      <select value={item.productId} onChange={e => updateLineItem(i, 'productId', e.target.value)} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs">
                        <option value="">-- Choose --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-bold">Qty Needs</label>
                      <div className="flex items-center gap-1">
                        <input type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value))} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs" />
                        <button onClick={() => removeLineItem(i)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={() => {
                const data = { ...form, items: lineItems };
                setForm(data);
                handleSave();
              }}>Save Recipe</Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'approve_warehouse' && (
        <Modal title="Select Warehouse for Effect" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Select Warehouse</label>
              <select value={form.warehouseId || ''} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Choose Warehouse --</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Invoice Number (Challan)</label>
              <input value={form.challanNumber || ''} onChange={e => setForm({ ...form, challanNumber: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="e.g. CH-4589" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Vehicle Details</label>
              <input value={form.vehicleNumber || ''} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="e.g. GJ-01-XX-XXXX" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Invoice Date</label>
              <input type="date" value={form.invoiceDate || ''} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={async () => {
                  if (!form.warehouseId) { toast({ title: 'Select warehouse', variant: 'destructive' }); return; }
                  try {
                    await inv.post(`transactions/approvals/${form.id}/approve`, { 
                        warehouseId: form.warehouseId,
                        vehicleNumber: form.vehicleNumber,
                        challanNumber: form.challanNumber,
                        invoiceDate: form.invoiceDate
                    });
                    toast({ title: 'Approved and effect given' });
                    setModal(null); setForm({});
                  } catch (e: any) { toast({ title: 'Approval failed', description: e.message, variant: 'destructive' }); }
              }}>Give Effect</Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'settings' && settings && (
        <Modal title="App Settings" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Stock Valuation Method</label>
              <select value={form.stockMethod || settings.stockMethod} onChange={e => setForm({ ...form, stockMethod: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="FIFO">FIFO</option>
                <option value="WEIGHTED_AVG">Weighted Average</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="neg2" checked={!!form.allowNegativeStock} onChange={e => setForm({ ...form, allowNegativeStock: e.target.checked })} />
              <label htmlFor="neg2" className="text-sm font-medium">Allow Negative Stock</label>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
          </div>
        </Modal>
      )}

      {viewDetails && (
        <Modal title={`${viewDetails.type.toUpperCase()} Details`} onClose={() => setViewDetails(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-xl border border-border/40">
              {viewDetails.type === 'production' ? (
                <>
                  <div className="col-span-1">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Finished Product</span>
                    <span className="text-sm font-bold text-foreground">{viewDetails.data?.finishedProductName || '—'}</span>
                  </div>
                  <div className="col-span-1 border-l border-border/20 pl-4">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Warehouse</span>
                    <span className="text-sm font-bold text-foreground text-primary/80">{viewDetails.data?.warehouseName || '—'}</span>
                  </div>
                  <div className="col-span-1 mt-1">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Quantity Produced</span>
                    <span className="text-lg font-black text-primary">{viewDetails.data?.quantityProduced || 0}</span>
                  </div>
                  <div className="col-span-1 border-l border-border/20 pl-4 mt-1">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Production Date</span>
                    <span className="text-sm font-medium text-foreground">{viewDetails.data?.createdAt ? new Date(viewDetails.data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                </>
              ) : viewDetails.type === 'PURCHASE_ORDER' ? (
                <>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">PO Number</span>
                    <span className="font-bold text-primary">{viewDetails.data?.poNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Supplier Name</span>
                    <span className="font-medium text-foreground">{viewDetails.data?.supplierName || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Expected Date</span>
                    <span className="font-medium text-foreground">{viewDetails.data?.expectedDate ? new Date(viewDetails.data.expectedDate).toLocaleDateString('en-IN') : '—'}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Status:</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">{viewDetails.data?.status}</span>
                  </div>
                  <div className="col-span-2 pt-4 flex gap-3">
                    <PDFGenerator 
                      type={viewDetails.type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER' : 'SALES_ORDER'} 
                      data={{
                        orderNo: viewDetails.data?.poNumber || viewDetails.data?.challanNumber || viewDetails.data?.orderId || viewDetails.data?.id || '—',
                        date: new Date(viewDetails.data?.createdAt || new Date()).toLocaleDateString('en-IN'),
                        party: {
                          name: viewDetails.data?.supplierName || viewDetails.data?.customerName || viewDetails.data?.partyName || '—',
                          address: viewDetails.data?.supplierAddress || viewDetails.data?.address || '—',
                          gst: viewDetails.data?.gstNumber || viewDetails.data?.gst || '—',
                          contact: viewDetails.data?.supplierContact || viewDetails.data?.contactInfo || viewDetails.data?.contact || '—',
                        },
                        items: (viewDetails.items || []).map((it: any) => ({
                          productName: products.find(p => p.id === it.productId)?.name || it.product || it.productName || 'Unknown Item',
                          qty: parseFloat(it.quantity || it.qty || 0),
                          unit: products.find(p => p.id === it.productId)?.unit || 'Bags',
                          rate: parseFloat(it.rate || it.sellingRate || it.price || 0),
                          total: it.lineTotal || it.total || (parseFloat(it.quantity || it.qty || 0) * parseFloat(it.rate || it.sellingRate || it.price || 0))
                        })),
                        totals: {
                          subtotal: viewDetails.data?.netAmount || 0,
                          grandTotal: viewDetails.data?.netAmount || 0
                        }
                      }}
                      filename={`${viewDetails.data?.poNumber || viewDetails.data?.challanNumber || 'Record'}.pdf`}
                      buttonLabel="Print / Download PDF"
                    />
                    
                    {viewDetails.data.status !== 'RECEIVED' && (
                      <Button 
                        onClick={() => {
                          const po = viewDetails.data;
                          const poItems = viewDetails?.items || [];
                          const s = suppliers.find(sup => sup.id === po.supplierId);
                          
                          setViewDetails(null);
                          setModal('purchase');
                          setForm({ 
                            supplierId: po.supplierId,
                            warehouseId: po.warehouseId,
                            challanNumber: `REF-${po.poNumber}`,
                            sourcePoId: po.id,
                            supplierContactPerson: s ? s.contactPerson : '',
                            supplierContact: s ? s.contactInfo : '',
                            supplierEmail: s ? s.email : '',
                            supplierAddress: s ? s.address : ''
                          });
                          setLineItems(poItems.map(it => ({
                            productId: it.productId,
                            quantity: parseFloat(it.quantity),
                            rate: parseFloat(it.rate),
                            taxPercent: parseFloat(it.taxPercent || 0),
                            remark: it.remark || ''
                          })));
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" /> Convert to Purchase (Inward)
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Order ID</span>
                    <span className="font-medium text-foreground">{viewDetails.order?.orderId || viewDetails.data.orderId || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Customer Name</span>
                    <span className="font-medium text-foreground">{viewDetails.data.customerName || viewDetails.data.partyName || (viewDetails.data.data?.partyName) || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Order Given By</span>
                    <span className="font-medium text-foreground">{viewDetails.order?.soName || viewDetails.data.soName || viewDetails.order?.soEmail || viewDetails.data.customerName || viewDetails.order?.customerName || 'System'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Dispatch Date</span>
                    <span className="font-medium text-foreground">{viewDetails.order?.dispatchDate ? new Date(viewDetails.order.dispatchDate).toLocaleDateString('en-IN') : (viewDetails.data?.createdAt ? new Date(viewDetails.data.createdAt).toLocaleDateString('en-IN') : '—')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Bill No / Challan #</span>
                    <span className="font-medium text-foreground">{viewDetails.data?.challanNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Bill Date</span>
                    <span className="font-medium text-foreground">{viewDetails.data?.createdAt ? new Date(viewDetails.data.createdAt).toLocaleDateString('en-IN') : '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Vehicle Number</span>
                    <span className="font-medium text-foreground">{viewDetails.data?.vehicleNumber || viewDetails.data?.data?.vehicleNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Net Amount</span>
                    <span className="font-medium text-foreground">{(viewDetails.data?.netAmount !== null && viewDetails.data?.netAmount !== undefined) ? Currency(viewDetails.data.netAmount) : (viewDetails.data?.data?.netAmount !== undefined ? Currency(viewDetails.data.data.netAmount) : '—')}</span>
                  </div>
                </>
              )}
              {viewDetails.type === 'BOM' && (
                <div className="col-span-2">
                  <span className="font-semibold text-muted-foreground block text-xs uppercase border-b border-border/20 pb-1 mb-2">Recipe Profile</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                         <p className="text-[10px] text-muted-foreground uppercase font-bold">Planned Yield</p>
                         <p className="text-lg font-black text-primary">{viewDetails.data?.outputQuantity} Units</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="col-span-2 pt-2 border-t border-border/20">
                <span className="font-semibold text-muted-foreground block text-xs uppercase">{viewDetails.type === 'production' ? 'Production Remarks' : 'Order Remark / Narration'}</span>
                <p className="font-medium text-foreground italic bg-secondary/10 p-2 rounded-lg mt-1 border border-border/10">
                  {viewDetails.data?.remarks || viewDetails.data?.remark || viewDetails.data?.narration || viewDetails.order?.remark || viewDetails.data?.data?.narration || 'No remarks provided'}
                </p>
              </div>
            </div>

            {viewDetails.type === 'production' && (
              <div className="flex gap-2 justify-end pt-2">
                <Button size="sm" variant="outline" className="text-xs h-8 border-primary/20 hover:bg-primary/5" onClick={async () => { 
                  const pData = viewDetails.data;
                  if (!pData) return;
                  // Load materials if missing
                  let mats = viewDetails.items || [];
                  if (mats.length === 0) {
                     try { mats = await inv.get<any[]>(`transactions/productions/${pData.id}/materials`); } catch {}
                  }
                  
                  setForm({
                    ...pData,
                    warehouseId: pData.warehouseId,
                    finishedProductId: pData.finishedProductId,
                    quantityProduced: pData.quantityProduced,
                    remarks: pData.remarks
                  });
                  setLineItems(mats.map((it: any) => ({
                    productId: it.productId,
                    quantityUsed: it.quantityUsed
                  })));
                  setModal('production');
                  setViewDetails(null);
                }}>
                  <Plus className="w-3 h-3 mr-1" /> Edit Production
                </Button>
                <Button size="sm" variant="destructive" className="text-xs h-8 shadow-sm" onClick={() => {
                   if (!viewDetails.data?.id) return;
                   if(confirm('Delete this production record and reverse its stock effects?')) {
                      handleDelete('transactions', 'productions', viewDetails.data.id);
                      setViewDetails(null);
                   }
                }}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            )}

            {viewDetails.type === 'sale' && viewDetails.items && (
              <div className="bg-secondary/30 p-3 rounded-xl border border-border/30 text-xs mb-3 space-y-1">
                {viewDetails.order && (
                  <>
                    <p><span className="font-semibold text-muted-foreground mr-1">Origin Order:</span> {viewDetails.order.orderId}</p>
                    <p><span className="font-semibold text-muted-foreground mr-1">Created By:</span> {viewDetails.order.soEmail}</p>
                    {viewDetails.order.dispatchDate && <p><span className="font-semibold text-muted-foreground mr-1">Dispatch Date:</span> {new Date(viewDetails.order.dispatchDate).toLocaleDateString('en-IN')}</p>}
                  </>
                )}
                <p><span className="font-semibold text-muted-foreground mr-1">Total Order Weight:</span> <span className="font-medium text-secondary-foreground">
                  {viewDetails.items.reduce((sum: number, i: any) => {
                    const prod = products.find((p: any) => p.id === i.productId);
                    const bagSizeStr = prod ? (prod.bagSize || '') : '';
                    const bagMatch = bagSizeStr.match(/(\d+)/);
                    const bagWeight = bagMatch ? parseInt(bagMatch[1]) : 0;
                    const w = prod ? (parseFloat(prod.weight || 0) > 0 ? parseFloat(prod.weight) : bagWeight) : 0;
                    return sum + (parseFloat(i.qty || i.quantity || 0) * w);
                  }, 0)} kg
                </span></p>
              </div>
            )}

            {viewDetails.items && viewDetails.items.length > 0 && (
              <div className="space-y-2">
                <p className="font-bold text-sm uppercase tracking-wider text-foreground/70">{viewDetails.type === 'production' ? 'Product Use (Materials Consumed)' : 'Line Items'}</p>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        {viewDetails.type === 'production' ? (
                          <th className="px-3 py-2 text-right">Qty Used</th>
                        ) : (
                          <>
                            <th className="px-3 py-2 text-left">Remark</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Rate</th>
                            <th className="px-3 py-2 text-right">Tax%</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {viewDetails.items.map((it: any, j: number) => {
                        const qty = parseFloat(it.quantity || it.qty || it.quantityUsed || 0);
                        const rate = parseFloat(it.rate || it.sellingRate || it.price || 0);
                        const tax = parseFloat(it.taxPercent || 0);
                        const total = it.lineTotal || (qty * rate * (1 + tax/100));
                        return (
                          <tr key={j} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="px-3 py-2 text-[11px] font-medium">{products.find(p => p.id === it.productId)?.name || it.product || it.productName || 'Unknown Item'}</td>
                            {viewDetails.type === 'production' ? (
                              <td className="px-3 py-2 text-right font-bold text-primary">{qty}</td>
                            ) : (
                              <>
                                <td className="px-3 py-2 text-[10px] italic text-muted-foreground">{it.remark || it.remarks || it.note || '—'}</td>
                                <td className="px-3 py-2 text-right">{qty}</td>
                                <td className="px-3 py-2 text-right">{Currency(rate)}</td>
                                <td className="px-3 py-2 text-right">{tax}%</td>
                                <td className="px-3 py-2 text-right font-semibold text-primary/80">{Currency(total)}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InventoryManagement;
