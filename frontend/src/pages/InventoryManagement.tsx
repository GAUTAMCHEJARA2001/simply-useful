import React, { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

import { DashboardTab } from './InventoryManagement/components/DashboardTab';
import { ProductsTab } from './InventoryManagement/components/ProductsTab';
import { CategoriesTab } from './InventoryManagement/components/CategoriesTab';
import { SubCategoriesTab } from './InventoryManagement/components/SubCategoriesTab';
import { BrandsTab } from './InventoryManagement/components/BrandsTab';
import { StockLedgerTab } from './InventoryManagement/components/StockLedgerTab';
import { UnitsTab } from './InventoryManagement/components/UnitsTab';
import { SuppliersTab } from './InventoryManagement/components/SuppliersTab';
import { TotalStockTab } from './InventoryManagement/components/TotalStockTab';
import { SettingsTab } from './InventoryManagement/components/SettingsTab';
import { PurchaseOrdersTab } from './InventoryManagement/components/PurchaseOrdersTab';
import { PurchasesTab } from './InventoryManagement/components/PurchasesTab';
import { SalesTab } from './InventoryManagement/components/SalesTab';
import { DeletedSalesTab } from './InventoryManagement/components/DeletedSalesTab';
import { ProductionsTab } from './InventoryManagement/components/ProductionsTab';
import { DeletedProductionsTab } from './InventoryManagement/components/DeletedProductionsTab';
import { AdjustmentsTab } from './InventoryManagement/components/AdjustmentsTab';
import { ApprovalsTab } from './InventoryManagement/components/ApprovalsTab';
import { ReturnsTab } from './InventoryManagement/components/ReturnsTab';
import { RecipesTab } from './InventoryManagement/components/RecipesTab';
import { ProductionApprovalsTab } from './InventoryManagement/components/ProductionApprovalsTab';
import { GlobalTransactionViewer } from './InventoryManagement/components/GlobalTransactionViewer';
import { useInventoryManagement } from '@/hooks/inventory/useInventoryManagement';

const InventoryManagement: React.FC = () => {
  const { can } = usePermissions();
  const { tab, setTab } = useInventoryManagement();
  const [viewerTx, setViewerTx] = useState<{type: string, refId: string} | null>(null);

  if (!can('view_inventory_dashboard')) return <Navigate to="/" replace />;

  return (
    <div className="flex-1 w-full min-w-0 p-3 sm:p-5 lg:p-6 bg-background overflow-y-auto space-y-5">

      {/* ── ACTIVE TAB MODULE VIEW ── */}
      <div className="w-full">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'products' && <ProductsTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'sub_categories' && <SubCategoriesTab />}
        {tab === 'brands' && <BrandsTab />}
        {tab === 'total_stock' && <TotalStockTab />}
        {tab === 'units' && <UnitsTab />}
        {tab === 'suppliers' && <SuppliersTab />}
        {tab === 'stock_ledger' && <StockLedgerTab onViewTransaction={(type, refId) => setViewerTx({ type, refId })} />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'purchase_orders' && <PurchaseOrdersTab />}
        {tab === 'purchases' && <PurchasesTab />}
        {tab === 'sales' && <SalesTab />}
        {tab === 'deleted_sales' && <DeletedSalesTab />}
        {tab === 'productions' && <ProductionsTab onTabChange={setTab} />}
        {tab === 'deleted_productions' && <DeletedProductionsTab />}
        {tab === 'production_approvals' && <ProductionApprovalsTab />}
        {tab === 'adjustments' && <AdjustmentsTab />}
        {tab === 'approvals' && <ApprovalsTab />}
        {tab === 'purchase_returns' && <ReturnsTab returnType="Purchase Return" />}
        {tab === 'sales_returns' && <ReturnsTab returnType="Sales Return" />}
        {tab === 'bom' && <RecipesTab onRefresh={() => {}} />}
      </div>

      <GlobalTransactionViewer 
        type={viewerTx?.type || null} 
        referenceId={viewerTx?.refId || null} 
        onClose={() => setViewerTx(null)} 
      />
    </div>
  );
};

export default InventoryManagement;
