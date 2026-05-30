import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { BarChart3, Package, Truck, ShoppingCart, Factory, Sliders, ClipboardList, UserCheck, Warehouse as WarehouseIcon, TrendingUp, DollarSign } from 'lucide-react';
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
import { useInventoryManagement, Tab } from '@/hooks/inventory/useInventoryManagement';

const InventoryManagement: React.FC = () => {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { tab, setTab } = useInventoryManagement();

  if (!can('view_inventory_dashboard')) return <Navigate to="/" replace />;

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

  return (
    <div className="flex flex-col md:flex-row gap-6 relative">
      {/* Sidebar */}
      <nav className="hidden md:block w-56 shrink-0 space-y-4 sticky top-4 self-start h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-6 scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20 transition-colors">
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

        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'sub_categories' && <SubCategoriesTab />}
        {tab === 'brands' && <BrandsTab />}
        {tab === 'total_stock' && <TotalStockTab />}
        {tab === 'units' && <UnitsTab />}
        {tab === 'suppliers' && <SuppliersTab />}
        {tab === 'stock_ledger' && <StockLedgerTab onViewTransaction={() => {}} />}
        {tab === 'labour' && <LabourTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'purchase_orders' && <PurchaseOrdersTab />}
        {tab === 'purchases' && <PurchasesTab />}
        {tab === 'sales' && <SalesTab />}
        {tab === 'productions' && <ProductionsTab />}
        {tab === 'adjustments' && <AdjustmentsTab />}
        {tab === 'attendance' && <AttendanceTab />}
        {tab === 'approvals' && <ApprovalsTab />}
        {tab === 'returns' && <ReturnsTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'bom' && <RecipesTab onRefresh={() => {}} />}
      </div>
    </div>
  );
};

export default InventoryManagement;
