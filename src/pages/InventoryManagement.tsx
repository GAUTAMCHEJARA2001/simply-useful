import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Package, Warehouse, Users, Truck, ShoppingCart, Factory, Search,
  BarChart3, Sliders, Plus, Trash2, RefreshCw, AlertTriangle,
  TrendingUp, DollarSign, ClipboardList, UserCheck, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
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
import { PDFGenerator } from '@/components/PDF/PDFGenerator';

// ─── Type Definitions ─────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'products' | 'categories' | 'sub_categories' | 'brands' | 'units' | 'suppliers' | 'labour' |
  'purchases' | 'sales' | 'productions' | 'adjustments' | 'attendance' | 'approvals' | 'returns' | 'reports' | 'settings' | 'stock_ledger' | 'purchase_orders' | 'total_stock' | 'bom';

interface StockItem { product_id: string; product_name: string; sku: string; unit: string; current_stock: number; minimum_stock: number; warehouse_name: string; }
interface KPIs { total_stock_value: number; month_revenue: number; month_profit: number; month_sales_count: number; low_stock_count: number; top_products: { name: string; qty: number }[]; }

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

// ─── INV API Helper ───────────────────────────────────────────────────────────
const inv = {
  get: <T,>(path: string) => apiClient<T>(`/inv/${path}`),
  post: <T,>(path: string, data: any) => apiClient<T>(`/inv/${path}`, { method: 'POST', data }),
  del: (path: string) => apiClient(`/inv/${path}`, { method: 'DELETE' }),
  put: <T,>(path: string, data: any) => apiClient<T>(`/inv/${path}`, { method: 'PUT', data }),
};

// ─────────────────────────────────────────────────────────────────────────────
const InventoryManagement: React.FC = () => {
  const navigate = useNavigate(); // Navigation hook for PO creation redirection
  const { users, loading: dataLoading } = useData();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);

  // Data states
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [labours, setLabours] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
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
        order_id: item.order_id || item.reference_id,
        so_name: item.so_name || null,
        so_email: item.so_email || null,
        customer_name: item.customer_name || null,
        dispatch_date: item.dispatch_date || item.created_at
      };
    }
    setViewDetails({ type, data: item, items, order: orderDetails });
  };

  const loadKpis = useCallback(async () => {
    try {
      const [k, s, ls] = await Promise.all([
        inv.get<KPIs>('reports/dashboard-kpis'),
        inv.get<any[]>('reports/sales-summary'),
        inv.get<any[]>('reports/low-stock'),
      ]);
      setKpis(k); setSalesSummary(s); setLowStock(ls);
    } catch { /* ignore */ }
  }, []);

  const loadTabData = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard':
          await loadKpis();
          break;
        case 'products':
          const [p, cat, br, un] = await Promise.all([
            inv.get<any[]>('masters/products'),
            inv.get<any[]>('masters/categories'),
            inv.get<any[]>('masters/brands'),
            inv.get<any[]>('masters/units')
          ]);
          setProducts(p); setCategories(cat); setBrands(br); setUnits(un);
          break;
        case 'total_stock':
          const [st, aggSt] = await Promise.all([
            inv.get<any[]>('reports/current-stock'),
            inv.get<any[]>('reports/aggregate-stock')
          ]);
          setStock(st); setAggregateStock(aggSt);
          break;
        case 'units':
          setUnits(await inv.get<any[]>('masters/units'));
          break;
        case 'suppliers':
          setSuppliers(await inv.get<any[]>('masters/suppliers'));
          break;
        case 'labour':
          setLabours(await inv.get<any[]>('masters/labours'));
          break;
        case 'purchases':
          const [pur, sups, whs] = await Promise.all([
            inv.get<any[]>('transactions/purchases'),
            inv.get<any[]>('masters/suppliers'),
            inv.get<any[]>('masters/warehouses')
          ]);
          setPurchases(pur); setSuppliers(sups); setWarehouses(whs);
          break;
        case 'sales':
          const [sal, custs, apprs, stck, prods] = await Promise.all([
            inv.get<any[]>('transactions/sales'),
            inv.get<any[]>('masters/customers'),
            inv.get<any[]>('transactions/approvals'),
            inv.get<any[]>('reports/current-stock'),
            inv.get<any[]>('masters/products')
          ]);
          setSales(sal); setCustomers(custs); setApprovals(apprs); setStock(stck); setProducts(prods);
          break;
        case 'productions':
          const [prod, bms, whs2, prds] = await Promise.all([
            inv.get<any[]>('transactions/productions'),
            inv.get<any[]>('bom'),
            inv.get<any[]>('masters/warehouses'),
            inv.get<any[]>('masters/products')
          ]);
          setProductions(prod); setBoms(bms); setWarehouses(whs2); setProducts(prds);
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
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [loadKpis, toast]);

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

  const addLineItem = () => setLineItems(prev => [...prev, { product_id: '', quantity: 1, rate: 0, tax_percent: 0, selling_rate: 0, quantity_used: 0 }]);
  const removeLineItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLineItem = (i: number, key: string, val: any) => setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const stockForProduct = (product_id: string) => {
    const s = stock.find(s => s.product_id === product_id);
    return s ? parseFloat(s.current_stock as any) : 0;
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

  const Currency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const Num = (v: number) => Number(v || 0).toLocaleString('en-IN');

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
        <div className={tab === 'dashboard' ? '' : 'hidden'}><DashboardTab /></div>
        <div className={tab === 'products' ? '' : 'hidden'}><ProductsTab /></div>
        <div className={tab === 'categories' ? '' : 'hidden'}><CategoriesTab /></div>
        <div className={tab === 'sub_categories' ? '' : 'hidden'}><SubCategoriesTab /></div>
        <div className={tab === 'brands' ? '' : 'hidden'}><BrandsTab /></div>

        <div className={tab === 'dashboard' ? '' : 'hidden'}><DashboardTab /></div>
        <div className={tab === 'products' ? '' : 'hidden'}><ProductsTab /></div>
        <div className={tab === 'categories' ? '' : 'hidden'}><CategoriesTab /></div>
        <div className={tab === 'sub_categories' ? '' : 'hidden'}><SubCategoriesTab /></div>
        <div className={tab === 'brands' ? '' : 'hidden'}><BrandsTab /></div>

        <div className={tab === 'total_stock' ? '' : 'hidden'}>
          <TotalStockTab aggregateStock={aggregateStock} stock={stock} />
        </div>

        <div className={tab === 'units' ? '' : 'hidden'}>
          <UnitsTab units={units} userRole={user?.role || ''} onAdd={() => { setForm({}); setModal('unit'); }} onEdit={u => handleEdit('unit', u)} onDelete={id => handleDelete('masters', 'units', id)} onRowClick={u => handleRowClick('unit', u)} />
        </div>

        <div className={tab === 'suppliers' ? '' : 'hidden'}>
          <SuppliersTab suppliers={suppliers} onAdd={() => { setForm({}); setModal('supplier'); }} onEdit={s => handleEdit('supplier', s)} onDelete={id => handleDelete('masters', 'suppliers', id)} onRowClick={s => handleRowClick('supplier', s)} Currency={Currency} />
        </div>

        <div className={tab === 'stock_ledger' ? '' : 'hidden'}>
          <StockLedgerTab onViewTransaction={(type, refId) => handleRowClick(type, { id: refId })} />
        </div>

        <div className={tab === 'labour' ? '' : 'hidden'}>
          <LabourTab labours={labours} onAdd={() => { setForm({}); setModal('labour'); }} onEdit={l => handleEdit('labour', l)} onDelete={id => handleDelete('masters', 'labours', id)} onRowClick={l => handleRowClick('labour', l)} Currency={Currency} />
        </div>

        <div className={tab === 'settings' ? '' : 'hidden'}>
          <SettingsTab settings={settings} setSettings={setSettings} onSave={() => { setForm(settings); setModal('settings'); handleSave(); }} />
        </div>

        <div className={tab === 'purchase_orders' ? '' : 'hidden'}>
          <PurchaseOrdersTab purchaseOrders={purchaseOrders} onAdd={() => navigate('/inventory/purchase-orders/new')} onRowClick={po => handleRowClick('PURCHASE_ORDER', po)} Currency={Currency} />
        </div>

        <div className={tab === 'purchases' ? '' : 'hidden'}>
          <PurchasesTab purchases={purchases} onAdd={() => { setForm({}); setLineItems([{ product_id: '', quantity: 1, rate: 0, tax_percent: 0 }]); setModal('purchase'); }} onEdit={async p => {
            const s = suppliers.find(sup => sup.id === p.supplier_id);
            setForm({ ...p, supplier_contact_person: s ? s.contact_person : '', supplier_contact: s ? s.contact_info : '', supplier_email: s ? s.email : '', supplier_address: s ? s.address : '' });
            const items = await inv.get<any[]>(`transactions/purchases/${p.id}/items`);
            setLineItems(items.map(it => ({ product_id: it.product_id, quantity: parseFloat(it.quantity), rate: parseFloat(it.rate), tax_percent: parseFloat(it.tax_percent || 0), remark: it.remark || '' })));
            setModal('purchase');
          }} onDelete={id => handleDelete('transactions', 'purchases', id)} onRowClick={p => handleRowClick('purchase', p)} Currency={Currency} />
        </div>

        <div className={tab === 'sales' ? '' : 'hidden'}>
          <SalesTab sales={sales} onAdd={() => { setForm({}); setLineItems([{ product_id: '', quantity: 1, selling_rate: 0, tax_percent: 0 }]); setModal('sale'); }} onDelete={id => handleDelete('transactions', 'sales', id)} onRowClick={s => handleRowClick('sale', s)} Currency={Currency} />
        </div>

        <div className={tab === 'productions' ? '' : 'hidden'}>
          <ProductionsTab productions={productions} onAdd={() => { setForm({}); setLineItems([{ product_id: '', quantity_used: 1 }]); setModal('production'); }} onRowClick={p => handleRowClick('production', p)} />
        </div>

        <div className={tab === 'adjustments' ? '' : 'hidden'}>
          <AdjustmentsTab adjustments={adjustments} onAdd={() => { setForm({}); setModal('adjustment'); }} onRowClick={a => handleRowClick('adjustment', a)} />
        </div>

        <div className={tab === 'attendance' ? '' : 'hidden'}>
          <AttendanceTab attendance={attendance} onAdd={() => { setForm({ date: new Date().toISOString().split('T')[0], status: 'PRESENT' }); setModal('attendance'); }} onRowClick={a => handleRowClick('attendance', a)} Currency={Currency} />
        </div>

        <div className={tab === 'approvals' ? '' : 'hidden'}>
          <ApprovalsTab approvals={approvals} onApprove={id => { setForm({ id }); setModal('approve_warehouse'); }} onReject={handleReject} onRowClick={a => handleRowClick('approval', a)} />
        </div>

        <div className={tab === 'returns' ? '' : 'hidden'}>
          <ReturnsTab returns={returns} onRowClick={r => handleRowClick('return', r)} Currency={Currency} />
        </div>

        <div className={tab === 'reports' ? '' : 'hidden'}>
          <ReportsTab stock={stock} salesSummary={salesSummary} Currency={Currency} />
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {modal === 'product' && (
        <Modal title="Add Product" onClose={() => setModal(null)}>
          <div className="space-y-4">
            {[['sku', 'SKU', 'text'], ['name', 'Product Name', 'text'], ['minimum_stock', 'Minimum Stock', 'number'], ['default_price', 'Default Price', 'number']].map(([k, lbl, type]) => (
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
            {[['name', 'Name'], ['location', 'Location'], ['gst_number', 'GST Number']].map(([k, lbl]) => (
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
            {[['name', 'Name'], ['contact_person', 'Contact Person'], ['contact_info', 'Contact'], ['email', 'Email'], ['address', 'Address'], ['gst_number', 'GST Number']].map(([k, lbl]) => (
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
            <div><label className="text-sm font-medium block mb-1">Daily Wage (₹)</label><input type="number" value={form.daily_wage || ''} onChange={e => setForm({ ...form, daily_wage: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
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
                <input value={form.challan_number || ''} onChange={e => setForm({ ...form, challan_number: e.target.value })} placeholder="E.g., CH-4589" className="w-full border border-border rounded-lg px-3 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all" />
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
                        <select value={item.product_id} onChange={e => updateLineItem(i, 'product_id', e.target.value)} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs focus:ring-1 focus:ring-primary/40">
                          <option value="">-- Product --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Unit</label>
                        <input value={getProductUnit(item.product_id)} disabled className="w-full border border-border rounded-md px-2 py-1.5 bg-muted/60 text-muted-foreground cursor-not-allowed text-xs" />
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
                  const app = approvals.find(a => a.reference_id === orderId);
                  if (app) {
                    const d = typeof app.data === 'string' ? JSON.parse(app.data) : app.data;
                    setForm({
                      ...form,
                      order_id: orderId,
                      challan_number: d.challan_number || orderId,
                      vehicle_number: d.vehicle_number || '',
                      warehouse_id: form.warehouse_id || d.warehouse_id || '',
                      party_name: d.party_name || '',
                      so_email: d.so_email || '',
                      dispatch_date: d.dispatch_date || '',
                      weight: d.items ? d.items.reduce((sum: number, i: any) => {
                        const prod = products.find((p: any) => p.id === i.product_id || p.product_name === i.product);
                        const bag_size = prod ? (prod.bag_size || '') : '';
                        const bag_match = bag_size.match(/(\d+)/);
                        const bag_weight = bag_match ? parseInt(bag_match[1]) : 0;
                        const w = prod ? (parseFloat(prod.weight || 0) > 0 ? parseFloat(prod.weight) : bag_weight) : 0;
                        return sum + (parseFloat(i.qty || i.quantity || 0) * w);
                      }, 0) : 0
                    });
                    setLineItems(d.items ? d.items.map((it: any) => ({
                      product_id: it.product_id || products.find(p => p.product_name === it.product)?.id || '',
                      quantity: parseFloat(it.qty || it.quantity || 0),
                      selling_rate: parseFloat(it.price || it.rate || 0),
                      tax_percent: parseFloat(it.tax_percent || 0)
                    })) : []);
                  }
                }} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Manual / Choose Approval --</option>
                  {approvals.filter(a => a.type === 'DISPATCH' || a.type === 'SALE').map(a => <option key={a.id} value={a.reference_id}>{a.reference_id}</option>)}
                </select>
              </div>
            </div>

            {form.party_name && (
                <div className="col-span-2 bg-muted/40 p-3 rounded-xl border border-border/40 text-xs space-y-1 animate-in fade-in-20">
                  <p><span className="font-semibold text-muted-foreground mr-1">Party:</span> {form.party_name}</p>
                  <p><span className="font-semibold text-muted-foreground mr-1">Created By:</span> {form.so_email}</p>
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
                  setForm({ ...form, customer_id: cId, customer_name: c ? c.name : '' });
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
              <div><label className="text-sm font-medium block mb-1">Challan #</label><input value={form.challan_number || ''} onChange={e => setForm({ ...form, challan_number: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
              <div><label className="text-sm font-medium block mb-1">Vehicle #</label><input value={form.vehicle_number || ''} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Line Items</p>
                <button onClick={addLineItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Row</button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, i) => {
                  const avail = stockForProduct(item.product_id);
                  const insufficient = item.product_id && item.quantity > avail;
                  return (
                    <div key={i} className={`grid grid-cols-4 gap-2 items-end rounded-lg p-2 ${insufficient ? 'bg-red-50 border border-red-200' : 'bg-muted/30'}`}>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Product</label>
                        <select value={item.product_id} onChange={e => updateLineItem(i, 'product_id', e.target.value)} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs">
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
                      value={bomSearch || (boms.find(b => b.id === form.bom_id)?.name || '')}
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
                      {boms.filter(b => b.name.toLowerCase().includes(bomSearch.toLowerCase()) || (b.product_name || '').toLowerCase().includes(bomSearch.toLowerCase())).map(b => (
                        <button key={b.id} onClick={async () => {
                          const bId = b.id;
                          setBomSearch(b.name);
                          try {
                            const details = await inv.get<any>(`bom/${bId}`);
                            const yieldVal = parseFloat(details.output_quantity || 1);
                            const prodQty = parseFloat(form.quantity_produced || 1);
                            const prefilledItems = (details.items || []).map((it: any) => ({
                              product_id: it.product_id,
                              quantity_used: Number(((parseFloat(it.quantity) / yieldVal) * prodQty).toFixed(2))
                            }));
                            setForm({ ...form, bom_id: bId, finished_product_id: b.product_id });
                            setLineItems(prefilledItems);
                            toast({ title: `Recipe "${b.name}" loaded` });
                          } catch (e) {
                            toast({ title: 'Failed to load recipe items', variant: 'destructive' });
                          }
                        }} className="w-full text-left px-4 py-2.5 hover:bg-primary/5 rounded-lg transition-colors group">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold group-hover:text-primary transition-colors">{b.name}</span>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded tracking-tighter">Yield: {b.output_quantity}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">For: {b.product_name || 'Unspecified'}</p>
                        </button>
                      ))}
                      {boms.filter(b => b.name.toLowerCase().includes(bomSearch.toLowerCase()) || (b.product_name || '').toLowerCase().includes(bomSearch.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">No recipes found.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className={form.bom_id ? "opacity-60 pointer-events-none" : ""}>
                <label className="text-sm font-medium block mb-1">Finished Product</label>
                <select value={form.finished_product_id || ''} onChange={e => setForm({ ...form, finished_product_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Select --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Warehouse</label>
                <select value={form.warehouse_id || ''} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Select --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Quantity to Produce</label>
                <input type="number" min="1" value={form.quantity_produced || 1} 
                  onChange={async e => {
                    const newQty = parseFloat(e.target.value) || 1;
                    setForm({ ...form, quantity_produced: newQty });
                    
                    if (form.bom_id) {
                       try {
                         const details = await inv.get<any>(`bom/${form.bom_id}`);
                         const yieldVal = parseFloat(details.output_quantity || 1);
                         setLineItems(prev => (details.items || []).map((it: any) => ({
                           product_id: it.product_id,
                           quantity_used: Number(((parseFloat(it.quantity) / yieldVal) * newQty).toFixed(2))
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
                  const avail = stockForProduct(item.product_id);
                  const insufficient = item.product_id && item.quantity_used > avail;
                  return (
                    <div key={i} className={`grid grid-cols-3 gap-2 items-end rounded-lg p-2 ${insufficient ? 'bg-red-50 border border-red-200' : 'bg-muted/30 border border-transparent'}`}>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground uppercase text-[10px] font-bold">Raw Material</label>
                        <select value={item.product_id} onChange={e => updateLineItem(i, 'product_id', e.target.value)} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs shadow-sm">
                          <option value="">-- Select --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} · Stock: {stockForProduct(p.id)}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end gap-1">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground uppercase text-[10px] font-bold">Qty Used</label>
                          <input type="number" min="0" value={item.quantity_used} onChange={e => updateLineItem(i, 'quantity_used', parseFloat(e.target.value))} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs shadow-sm" />
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
              <select value={form.product_id || ''} onChange={e => setForm({ ...form, product_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) · Stock: {stockForProduct(p.id)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Warehouse</label>
              <select value={form.warehouse_id || ''} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Quantity Change (use negative to deduct)</label>
              <input type="number" value={form.quantity_change || ''} onChange={e => setForm({ ...form, quantity_change: parseFloat(e.target.value) })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="+10 or -5" />
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
              <select value={form.labour_id || ''} onChange={e => setForm({ ...form, labour_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Select --</option>
                {labours.map(l => <option key={l.id} value={l.id}>{l.name} (₹{l.daily_wage}/day)</option>)}
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
              {form.labour_id && form.status && (
                <p className="text-xs text-muted-foreground mt-2">
                  Wage: {Currency(
                    form.status === 'PRESENT' ? (labours.find(l => l.id === form.labour_id)?.daily_wage || 0) :
                      form.status === 'HALF_DAY' ? (labours.find(l => l.id === form.labour_id)?.daily_wage || 0) / 2 : 0
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
                <select value={form.product_id || ''} onChange={e => setForm({ ...form, product_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                  <option value="">-- Select Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Output Quantity</label>
                <input type="number" value={form.output_quantity || 1} onChange={e => setForm({ ...form, output_quantity: parseFloat(e.target.value) })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
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
                      <select value={item.product_id} onChange={e => updateLineItem(i, 'product_id', e.target.value)} className="w-full border border-border rounded-md px-2 py-1.5 bg-background text-xs">
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
              <select value={form.warehouse_id || ''} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="">-- Choose Warehouse --</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Invoice Number (Challan)</label>
              <input value={form.challan_number || ''} onChange={e => setForm({ ...form, challan_number: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="e.g. CH-4589" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Vehicle Details</label>
              <input value={form.vehicle_number || ''} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" placeholder="e.g. GJ-01-XX-XXXX" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Invoice Date</label>
              <input type="date" value={form.invoice_date || ''} onChange={e => setForm({ ...form, invoice_date: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={async () => {
                  if (!form.warehouse_id) { toast({ title: 'Select warehouse', variant: 'destructive' }); return; }
                  try {
                    await inv.post(`transactions/approvals/${form.id}/approve`, { 
                        warehouse_id: form.warehouse_id,
                        vehicle_number: form.vehicle_number,
                        challan_number: form.challan_number,
                        invoice_date: form.invoice_date
                    });
                    toast({ title: 'Approved and effect given' });
                    setModal(null); setForm({});
                    // refresh handled by state
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
              <select value={form.stock_method || settings.stock_method} onChange={e => setForm({ ...form, stock_method: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm">
                <option value="FIFO">FIFO</option>
                <option value="WEIGHTED_AVG">Weighted Average</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="neg2" checked={!!form.allow_negative_stock} onChange={e => setForm({ ...form, allow_negative_stock: e.target.checked })} />
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
                    <span className="text-sm font-bold text-foreground">{viewDetails.data.finished_product_name || '—'}</span>
                  </div>
                  <div className="col-span-1 border-l border-border/20 pl-4">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Warehouse</span>
                    <span className="text-sm font-bold text-foreground text-primary/80">{viewDetails.data.warehouse_name || '—'}</span>
                  </div>
                  <div className="col-span-1 mt-1">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Quantity Produced</span>
                    <span className="text-lg font-black text-primary">{viewDetails.data.quantity_produced || 0}</span>
                  </div>
                  <div className="col-span-1 border-l border-border/20 pl-4 mt-1">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Production Date</span>
                    <span className="text-sm font-medium text-foreground">{viewDetails.data.created_at ? new Date(viewDetails.data.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                </>
              ) : viewDetails.type === 'PURCHASE_ORDER' ? (
                <>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">PO Number</span>
                    <span className="font-bold text-primary">{viewDetails.data.po_number || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Supplier Name</span>
                    <span className="font-medium text-foreground">{viewDetails.data.supplier_name || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Expected Date</span>
                    <span className="font-medium text-foreground">{viewDetails.data.expected_date ? new Date(viewDetails.data.expected_date).toLocaleDateString('en-IN') : '—'}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Status:</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">{viewDetails.data.status}</span>
                  </div>
                  <div className="col-span-2 pt-4 flex gap-3">
                    <PDFGenerator 
                      type={viewDetails.type === 'purchase' ? 'PURCHASE_ORDER' : 'SALES_ORDER'} 
                      data={{
                        orderNo: viewDetails.data.po_number || viewDetails.data.challan_number || viewDetails.data.order_id || viewDetails.data.id || '—',
                        date: new Date(viewDetails.data.created_at || new Date()).toLocaleDateString('en-IN'),
                        party: {
                          name: viewDetails.data.supplier_name || viewDetails.data.customer_name || viewDetails.data.party_name || '—',
                          address: viewDetails.data.supplier_address || viewDetails.data.address || '—',
                          gst: viewDetails.data.gst_number || viewDetails.data.gst || '—',
                          contact: viewDetails.data.supplier_contact || viewDetails.data.contact_info || viewDetails.data.contact || '—',
                        },
                        items: (viewDetails.items || []).map((it: any) => ({
                          product_name: products.find(p => p.id === it.product_id)?.product_name || it.product || it.product_name || 'Unknown Item',
                          qty: parseFloat(it.quantity || it.qty || 0),
                          unit: products.find(p => p.id === it.product_id)?.unit || 'Bags',
                          rate: parseFloat(it.rate || it.selling_rate || it.price || 0),
                          total: it.line_total || it.total || (parseFloat(it.quantity || it.qty || 0) * parseFloat(it.rate || it.selling_rate || it.price || 0))
                        })),
                        totals: {
                          subtotal: viewDetails.data.net_amount || 0,
                          grandTotal: viewDetails.data.net_amount || 0
                        }
                      }}
                      filename={`${viewDetails.data.po_number || viewDetails.data.challan_number || 'Record'}.pdf`}
                      buttonLabel="Print / Download PDF"
                    />
                    
                    {viewDetails.data.status !== 'RECEIVED' && (
                      <Button 
                        onClick={() => {
                          const po = viewDetails.data;
                          const poItems = viewDetails.items;
                          const s = suppliers.find(sup => sup.id === po.supplier_id);
                          
                          setViewDetails(null);
                          setModal('purchase');
                          setForm({ 
                            supplier_id: po.supplier_id,
                            warehouse_id: po.warehouse_id,
                            challan_number: `REF-${po.po_number}`,
                            source_po_id: po.id,
                            supplier_contact_person: s ? s.contact_person : '',
                            supplier_contact: s ? s.contact_info : '',
                            supplier_email: s ? s.email : '',
                            supplier_address: s ? s.address : ''
                          });
                          setLineItems(poItems.map(it => ({
                            product_id: it.product_id,
                            quantity: parseFloat(it.quantity),
                            rate: parseFloat(it.rate),
                            tax_percent: parseFloat(it.tax_percent || 0),
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
                    <span className="font-medium text-foreground">{viewDetails.order?.order_id || viewDetails.data.order_id || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Customer Name</span>
                    <span className="font-medium text-foreground">{viewDetails.data.customer_name || viewDetails.data.party_name || (viewDetails.data.data?.party_name) || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Order Given By</span>
                    <span className="font-medium text-foreground">{viewDetails.order?.so_name || viewDetails.data.so_name || viewDetails.order?.so_email || viewDetails.data.customer_name || viewDetails.order?.customer_name || 'System'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Dispatch Date</span>
                    <span className="font-medium text-foreground">{viewDetails.order?.dispatch_date ? new Date(viewDetails.order.dispatch_date).toLocaleDateString('en-IN') : (viewDetails.data.created_at ? new Date(viewDetails.data.created_at).toLocaleDateString('en-IN') : '—')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Bill No / Challan #</span>
                    <span className="font-medium text-foreground">{viewDetails.data.challan_number || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Bill Date</span>
                    <span className="font-medium text-foreground">{viewDetails.data.created_at ? new Date(viewDetails.data.created_at).toLocaleDateString('en-IN') : '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Vehicle Number</span>
                    <span className="font-medium text-foreground">{viewDetails.data.vehicle_number || viewDetails.data.data?.vehicle_number || '—'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground block text-xs uppercase">Net Amount</span>
                    <span className="font-medium text-foreground">{(viewDetails.data.net_amount !== null && viewDetails.data.net_amount !== undefined) ? Currency(viewDetails.data.net_amount) : (viewDetails.data.data?.net_amount !== undefined ? Currency(viewDetails.data.data.net_amount) : '—')}</span>
                  </div>
                </>
              )}
              {viewDetails.type === 'BOM' && (
                <div className="col-span-2">
                  <span className="font-semibold text-muted-foreground block text-xs uppercase border-b border-border/20 pb-1 mb-2">Recipe Profile</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                         <p className="text-[10px] text-muted-foreground uppercase font-bold">Planned Yield</p>
                         <p className="text-lg font-black text-primary">{viewDetails.data.output_quantity} Units</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="col-span-2 pt-2 border-t border-border/20">
                <span className="font-semibold text-muted-foreground block text-xs uppercase">{viewDetails.type === 'production' ? 'Production Remarks' : 'Order Remark / Narration'}</span>
                <p className="font-medium text-foreground italic bg-secondary/10 p-2 rounded-lg mt-1 border border-border/10">
                  {viewDetails.data.remarks || viewDetails.data.remark || viewDetails.data.narration || viewDetails.order?.remark || viewDetails.data.data?.narration || 'No remarks provided'}
                </p>
              </div>
            </div>

            {viewDetails.type === 'production' && (
              <div className="flex gap-2 justify-end pt-2">
                <Button size="sm" variant="outline" className="text-xs h-8 border-primary/20 hover:bg-primary/5" onClick={async () => { 
                  const pData = viewDetails.data;
                  // Load materials if missing
                  let mats = viewDetails.items || [];
                  if (mats.length === 0) {
                     try { mats = await inv.get<any[]>(`transactions/productions/${pData.id}/materials`); } catch {}
                  }
                  
                  setForm({
                    ...pData,
                    warehouse_id: pData.warehouse_id,
                    finished_product_id: pData.finished_product_id,
                    quantity_produced: pData.quantity_produced,
                    remarks: pData.remarks
                  });
                  setLineItems(mats.map((it: any) => ({
                    product_id: it.product_id,
                    quantity_used: it.quantity_used
                  })));
                  setModal('production');
                  setViewDetails(null);
                }}>
                  <Plus className="w-3 h-3 mr-1" /> Edit Production
                </Button>
                <Button size="sm" variant="destructive" className="text-xs h-8 shadow-sm" onClick={() => {
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
                    <p><span className="font-semibold text-muted-foreground mr-1">Origin Order:</span> {viewDetails.order.order_id}</p>
                    <p><span className="font-semibold text-muted-foreground mr-1">Created By:</span> {viewDetails.order.so_email}</p>
                    {viewDetails.order.dispatch_date && <p><span className="font-semibold text-muted-foreground mr-1">Dispatch Date:</span> {new Date(viewDetails.order.dispatch_date).toLocaleDateString('en-IN')}</p>}
                  </>
                )}
                <p><span className="font-semibold text-muted-foreground mr-1">Total Order Weight:</span> <span className="font-medium text-secondary-foreground">
                  {viewDetails.items.reduce((sum: number, i: any) => {
                    const prod = products.find((p: any) => p.id === i.product_id);
                    const bag_size = prod ? (prod.bag_size || '') : '';
                    const bag_match = bag_size.match(/(\d+)/);
                    const bag_weight = bag_match ? parseInt(bag_match[1]) : 0;
                    const w = prod ? (parseFloat(prod.weight || 0) > 0 ? parseFloat(prod.weight) : bag_weight) : 0;
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
                        const qty = parseFloat(it.quantity || it.qty || it.quantity_used || 0);
                        const rate = parseFloat(it.rate || it.selling_rate || it.price || 0);
                        const tax = parseFloat(it.tax_percent || 0);
                        const total = it.line_total || (qty * rate * (1 + tax/100));
                        return (
                          <tr key={j} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="px-3 py-2 text-[11px] font-medium">{products.find(p => p.id === it.product_id)?.product_name || it.product || it.product_name || 'Unknown Item'}</td>
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
