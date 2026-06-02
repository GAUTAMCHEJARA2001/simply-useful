import React, { useState, useMemo, useDeferredValue } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

// Utilities & Helpers
import { DatePreset, resolveDateRange } from './reports/utils/dateRanges';
import { sortRows } from './reports/utils/sorting';

// Modular Hooks
import { useSOPerformance, SOPerformanceReport } from './reports/hooks/useSOPerformance';
import { useInventoryReports, StockInventoryReport } from './reports/hooks/useInventoryReports';
import { usePartnerReports, PartnerReportRow } from './reports/hooks/usePartnerReports';
import { useMonthlyFinancials, MonthlyFinancialRow } from './reports/hooks/useMonthlyFinancials';
import {
  useSalesAnalysis,
  SalesSubView,
  BrandSalesRow,
  ItemSalesRow,
  CounterSalesRow,
  AreaSalesRow,
  CategorySalesRow,
} from './reports/hooks/useSalesAnalysis';

// Reusable Components
import { ReportsFilters } from './reports/components/ReportsFilters';
import { ReportsTable, ColumnDefinition } from './reports/components/ReportsTable';
import { ReportsCharts } from './reports/components/ReportsCharts';
import { ExportButton } from './reports/components/ExportButton';
import { SalesHeatMap } from './reports/components/SalesHeatMap';

// UI icons
import { TrendingUp, Users, Package, Calendar, Award, ShoppingCart, Tag, Box, MapPin, Flame, LayoutGrid, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

type DomainType = 'so-performance' | 'inventory' | 'partners' | 'monthly' | 'sales-analysis';

const SALES_SUB_VIEWS: { id: SalesSubView; label: string; icon: React.FC<any> }[] = [
  { id: 'brand',    label: 'Brand-wise',    icon: Tag },
  { id: 'item',     label: 'Item-wise',     icon: Box },
  { id: 'counter',  label: 'Counter-wise',  icon: Users },
  { id: 'area',     label: 'Area-wise',     icon: MapPin },
  { id: 'heatmap',  label: 'Activity Heat Map', icon: Flame },
  { id: 'category', label: 'Category-wise', icon: LayoutGrid },
];

const Reports: React.FC = () => {
  const { user } = useAuth();
  const { orders, visits, expenses, users, products, warehouses, dealers, distributors } = useData();

  // Route security
  if (user?.role !== 'SUPERADMIN') {
    return <Navigate to="/" replace />;
  }

  // 1. Report Customizer States
  const [activeDomain, setActiveDomain] = useState<DomainType>('so-performance');
  const [activeSalesView, setActiveSalesView] = useState<SalesSubView>('brand');
  const [preset, setPreset] = useState<DatePreset>('this-fy');
  
  // Custom Date inputs
  const defaultDates = useMemo(() => {
    const now = new Date();
    const startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
    const endStr = now.toISOString().substring(0, 10);
    return { startStr, endStr };
  }, []);
  
  const [customStart, setCustomStart] = useState<string>(defaultDates.startStr);
  const [customEnd, setCustomEnd] = useState<string>(defaultDates.endStr);

  // Filter criteria states
  const [selectedSO, setSelectedSO] = useState<string>('all');
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [selectedInventoryProducts, setSelectedInventoryProducts] = useState<string[]>([]);
  const [partnerType, setPartnerType] = useState<'all' | 'dealer' | 'distributor'>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedStockStatuses, setSelectedStockStatuses] = useState<string[]>([]);
  const [chartStyle, setChartStyle] = useState<'bar' | 'line' | 'pie' | 'none'>('bar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [selectedSalesProducts, setSelectedSalesProducts] = useState<string[]>([]);

  // Sorting states
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const deferredSearch = useDeferredValue(searchTerm);

  // Compute sorted unique territory options from both dealers and distributors
  const territoryOptions = useMemo(() => {
    const codes = new Set<string>();
    dealers.forEach(d => {
      const t = d.territory?.trim();
      if (t) codes.add(t);
    });
    distributors.forEach(d => {
      const t = d.territory?.trim();
      if (t) codes.add(t);
    });
    return Array.from(codes).sort();
  }, [dealers, distributors]);

  // Compute sorted unique brand options from products
  const brandOptions = useMemo(() => {
    const brands = new Set<string>();
    products.forEach(p => {
      const bName = p.brand?.name || '';
      if (bName) brands.add(bName);
    });
    return Array.from(brands).sort();
  }, [products]);

  // 2. Fetch Operational Stock levels dynamically via react-query
  const { data: stockData = [], isLoading: stockLoading } = useQuery({
    queryKey: ['reports', 'stock'],
    queryFn: async () => {
      const res = await api.get('/reports/current-stock');
      return (res.data?.data || res.data || []) as any[];
    },
    enabled: activeDomain === 'inventory',
  });

  // Reset sorting fields on domain switch
  const handleDomainChange = (domain: DomainType) => {
    setActiveDomain(domain);
    setSortBy(null);
    setSortOrder('desc');
    setSelectedTerritories([]);
    setSelectedBrands([]);
    setSelectedPartners([]);
    setSelectedSalesProducts([]);
    setSelectedWarehouses([]);
    setSelectedInventoryProducts([]);
    setSelectedStockStatuses([]);
  };

  const handleSalesViewChange = (view: SalesSubView) => {
    setActiveSalesView(view);
    setSortBy(null);
    setSortOrder('desc');
    setSelectedBrands([]);
    setSelectedSalesProducts([]);
    setSelectedPartners([]);
  };

  // 3. Centralized Date Range Resolution
  const dateBounds = useMemo(() => {
    return resolveDateRange(preset, customStart, customEnd);
  }, [preset, customStart, customEnd]);

  // 4. Domain Calculations
  const soPerformanceData = useSOPerformance({
    orders,
    visits,
    expenses,
    users,
    startDate: dateBounds.start,
    endDate: dateBounds.end,
    selectedSOEmail: selectedSO === 'all' ? '' : selectedSO
  });

  const inventoryData = useInventoryReports({
    stockData,
    products,
    selectedWarehouseNames: selectedWarehouses,
    selectedProductIds: selectedInventoryProducts,
    selectedStockStatuses: selectedStockStatuses
  });

  const partnerData = usePartnerReports({
    orders,
    dealers,
    distributors,
    startDate: dateBounds.start,
    endDate: dateBounds.end,
    partnerTypeFilter: partnerType,
    selectedState: selectedState,
    selectedPartnerName: 'all'
  });

  const monthlyFinancialData = useMonthlyFinancials({
    orders,
    startDate: dateBounds.start,
    endDate: dateBounds.end
  });

  const { rows: salesRows, heatMap } = useSalesAnalysis({
    orders,
    products,
    dealers,
    distributors,
    startDate: dateBounds.start,
    endDate: dateBounds.end,
    activeSalesView,
    selectedBrands,
    selectedTerritories,
    selectedProducts: activeSalesView === 'item' ? selectedSalesProducts : [],
    selectedPartners: activeSalesView === 'counter' ? selectedPartners : [],
  });

  // 5. Schema Column Definitions
  const salesAnalysisColumns: Record<SalesSubView, ColumnDefinition<any>[]> = {
    brand: [
      { key: 'brand', label: 'Brand Name', sortable: true, align: 'left' },
      { key: 'ordersCount', label: 'Orders', sortable: true, align: 'right' },
      { key: 'qty', label: 'Total Qty Sold', sortable: true, align: 'right' },
      { key: 'revenue', label: 'Gross Revenue', sortable: true, align: 'right', render: formatCurrency },
      { key: 'avgPrice', label: 'Avg Unit Price', sortable: true, align: 'right', render: formatCurrency },
    ],
    item: [
      { key: 'product', label: 'Product Name', sortable: true, align: 'left' },
      { key: 'sku', label: 'SKU / Code', sortable: true, align: 'left' },
      { key: 'category', label: 'Category', sortable: true, align: 'left' },
      { key: 'brand', label: 'Brand', sortable: true, align: 'left' },
      { key: 'ordersCount', label: 'Orders', sortable: true, align: 'right' },
      { key: 'qty', label: 'Qty Sold', sortable: true, align: 'right' },
      { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', render: formatCurrency },
      { key: 'avgPrice', label: 'Avg Unit Price', sortable: true, align: 'right', render: formatCurrency },
    ],
    counter: [
      { key: 'name', label: 'Counter / Party', sortable: true, align: 'left' },
      {
        key: 'type', label: 'Type', sortable: true, align: 'center',
        render: (v: string) => (
          <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider',
            v === 'Distributor' ? 'bg-indigo-50 text-indigo-700' : v === 'Dealer' ? 'bg-sky-50 text-sky-700' : 'bg-zinc-100 text-zinc-600'
          )}>{v}</span>
        )
      },
      { key: 'city', label: 'City', sortable: true, align: 'left' },
      { key: 'state', label: 'State', sortable: true, align: 'left' },
      { key: 'ordersCount', label: 'Orders', sortable: true, align: 'right' },
      { key: 'revenue', label: 'Total Billing', sortable: true, align: 'right', render: formatCurrency },
      { key: 'avgOrder', label: 'Avg Order Value', sortable: true, align: 'right', render: formatCurrency },
    ],
    area: [
      { key: 'state', label: 'State', sortable: true, align: 'left' },
      { key: 'city', label: 'City', sortable: true, align: 'left' },
      { key: 'partners', label: 'Counters Active', sortable: true, align: 'right' },
      { key: 'ordersCount', label: 'Orders', sortable: true, align: 'right' },
      { key: 'revenue', label: 'Area Revenue', sortable: true, align: 'right', render: formatCurrency },
    ],
    heatmap: [], // Not used — rendered by SalesHeatMap
    category: [
      { key: 'category', label: 'Product Category', sortable: true, align: 'left' },
      { key: 'ordersCount', label: 'Orders', sortable: true, align: 'right' },
      { key: 'qty', label: 'Qty Sold', sortable: true, align: 'right' },
      { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', render: formatCurrency },
      {
        key: 'sharePercent', label: 'Revenue Share', sortable: true, align: 'right',
        render: (v: number) => (
          <div className="flex items-center gap-2 justify-end">
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(v, 100)}%` }} />
            </div>
            <span className="font-mono text-xs">{v}%</span>
          </div>
        )
      },
    ],
  };

  const columnsMap: Record<DomainType, ColumnDefinition<any>[]> = {
    'so-performance': [
      { key: 'name', label: 'Sales Officer', sortable: true, align: 'left' },
      { key: 'email', label: 'Email Address', sortable: true, align: 'left' },
      { key: 'totalOrders', label: 'Total Orders', sortable: true, align: 'right' },
      { key: 'approvedOrders', label: 'Approved', sortable: true, align: 'right' },
      { key: 'revenue', label: 'Gross Revenue', sortable: true, align: 'right', render: formatCurrency },
      { key: 'avgOrderValue', label: 'Avg Order Value', sortable: true, align: 'right', render: formatCurrency },
      { key: 'visits', label: 'Lead Visits', sortable: true, align: 'center' },
      { key: 'claims', label: 'Approved Claims', sortable: true, align: 'right', render: formatCurrency },
      { key: 'ratio', label: 'Expense-to-Rev', sortable: true, align: 'right', render: (v: number) => `${v}%` }
    ],
    'inventory': [
      { key: 'product', label: 'Product Description', sortable: true, align: 'left' },
      { key: 'sku', label: 'SKU Suffix', sortable: true, align: 'left' },
      { key: 'warehouse', label: 'Warehouse Location', sortable: true, align: 'left' },
      { key: 'currentStock', label: 'Current Stock', sortable: true, align: 'right' },
      { key: 'minStock', label: 'Min Safety Limit', sortable: true, align: 'right' },
      {
        key: 'status',
        label: 'Safety Status',
        sortable: true,
        align: 'center',
        render: (status: 'healthy' | 'low' | 'critical') => {
          const colors = {
            healthy: 'bg-green-100 text-green-800 border-green-200',
            low: 'bg-amber-100 text-amber-800 border-amber-200',
            critical: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
          };
          return (
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", colors[status])}>
              {status}
            </span>
          );
        }
      },
      { key: 'rate', label: 'Dealer Rate', sortable: true, align: 'right', render: formatCurrency },
      { key: 'valuation', label: 'Est. Valuation', sortable: true, align: 'right', render: formatCurrency }
    ],
    'partners': [
      { key: 'name', label: 'Partner / Client Name', sortable: true, align: 'left' },
      { key: 'type', label: 'Party Type', sortable: true, align: 'left', render: (v) => (
        <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider", v === 'Distributor' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700')}>
          {v}
        </span>
      )},
      { key: 'city', label: 'City', sortable: true, align: 'left' },
      { key: 'state', label: 'State', sortable: true, align: 'left' },
      { key: 'totalOrders', label: 'Orders Count', sortable: true, align: 'right' },
      { key: 'totalAmount', label: 'Total Purchased', sortable: true, align: 'right', render: formatCurrency },
      { key: 'lastOrderDate', label: 'Last Order', sortable: true, align: 'center' }
    ],
    'monthly': [
      { key: 'month', label: 'Accounting Period (Month)', sortable: true, align: 'left' },
      { key: 'ordersCount', label: 'Orders volume', sortable: true, align: 'right' },
      { key: 'revenue', label: 'Gross Revenue', sortable: true, align: 'right', render: formatCurrency },
      { key: 'profit', label: 'Est. Profit (COGS)', sortable: true, align: 'right', render: formatCurrency }
    ],
    'sales-analysis': activeSalesView !== 'heatmap' ? salesAnalysisColumns[activeSalesView] : [],
  };

  // 6. Resolve active raw rows
  const rawReportRows = useMemo(() => {
    switch (activeDomain) {
      case 'so-performance': return soPerformanceData;
      case 'inventory': return inventoryData;
      case 'partners': return partnerData;
      case 'monthly': return monthlyFinancialData;
      case 'sales-analysis': return activeSalesView === 'heatmap' ? [] : salesRows;
    }
  }, [activeDomain, activeSalesView, soPerformanceData, inventoryData, partnerData, monthlyFinancialData, salesRows]);

  // Apply keyword search
  const filteredReportRows = useMemo(() => {
    if (!deferredSearch) return rawReportRows;
    const query = deferredSearch.toLowerCase();
    return rawReportRows.filter(row =>
      Object.values(row).some(val => String(val || '').toLowerCase().includes(query))
    );
  }, [rawReportRows, deferredSearch]);

  // Apply sorting
  const finalSortedReportRows = useMemo(() => {
    return sortRows(filteredReportRows, sortBy, sortOrder);
  }, [filteredReportRows, sortBy, sortOrder]);

  // 7. Memoized Totals
  const totalsAggregates = useMemo(() => {
    const rows = finalSortedReportRows;
    if (rows.length === 0) return undefined;

    switch (activeDomain) {
      case 'so-performance': {
        const totalOrders = rows.reduce((s, r: SOPerformanceReport) => s + r.totalOrders, 0);
        const approvedOrders = rows.reduce((s, r: SOPerformanceReport) => s + r.approvedOrders, 0);
        const revenue = rows.reduce((s, r: SOPerformanceReport) => s + r.revenue, 0);
        const claims = rows.reduce((s, r: SOPerformanceReport) => s + r.claims, 0);
        const visits = rows.reduce((s, r: SOPerformanceReport) => s + r.visits, 0);
        const avgOrderValue = approvedOrders > 0 ? revenue / approvedOrders : 0;
        const ratio = revenue > 0 ? (claims / revenue) * 100 : 0;
        return { totalOrders, approvedOrders, revenue, avgOrderValue, visits, claims, ratio: Number(ratio.toFixed(2)) };
      }
      case 'inventory': {
        const currentStock = rows.reduce((s, r: StockInventoryReport) => s + r.currentStock, 0);
        const minStock = rows.reduce((s, r: StockInventoryReport) => s + r.minStock, 0);
        const valuation = rows.reduce((s, r: StockInventoryReport) => s + r.valuation, 0);
        return { currentStock, minStock, valuation };
      }
      case 'partners': {
        const totalOrders = rows.reduce((s, r: PartnerReportRow) => s + r.totalOrders, 0);
        const totalAmount = rows.reduce((s, r: PartnerReportRow) => s + r.totalAmount, 0);
        return { totalOrders, totalAmount };
      }
      case 'monthly': {
        const ordersCount = rows.reduce((s, r: MonthlyFinancialRow) => s + r.ordersCount, 0);
        const revenue = rows.reduce((s, r: MonthlyFinancialRow) => s + r.revenue, 0);
        const profit = rows.reduce((s, r: MonthlyFinancialRow) => s + r.profit, 0);
        return { ordersCount, revenue, profit };
      }
      case 'sales-analysis': {
        if (activeSalesView === 'heatmap') return undefined;
        if (activeSalesView === 'brand') {
          return {
            ordersCount: rows.reduce((s, r: BrandSalesRow) => s + r.ordersCount, 0),
            qty: rows.reduce((s, r: BrandSalesRow) => s + r.qty, 0),
            revenue: rows.reduce((s, r: BrandSalesRow) => s + r.revenue, 0),
          };
        }
        if (activeSalesView === 'item') {
          return {
            ordersCount: rows.reduce((s, r: ItemSalesRow) => s + r.ordersCount, 0),
            qty: rows.reduce((s, r: ItemSalesRow) => s + r.qty, 0),
            revenue: rows.reduce((s, r: ItemSalesRow) => s + r.revenue, 0),
          };
        }
        if (activeSalesView === 'counter') {
          return {
            ordersCount: rows.reduce((s, r: CounterSalesRow) => s + r.ordersCount, 0),
            revenue: rows.reduce((s, r: CounterSalesRow) => s + r.revenue, 0),
          };
        }
        if (activeSalesView === 'area') {
          return {
            ordersCount: rows.reduce((s, r: AreaSalesRow) => s + r.ordersCount, 0),
            revenue: rows.reduce((s, r: AreaSalesRow) => s + r.revenue, 0),
            partners: rows.reduce((s, r: AreaSalesRow) => s + r.partners, 0),
          };
        }
        if (activeSalesView === 'category') {
          return {
            ordersCount: rows.reduce((s, r: CategorySalesRow) => s + r.ordersCount, 0),
            qty: rows.reduce((s, r: CategorySalesRow) => s + r.qty, 0),
            revenue: rows.reduce((s, r: CategorySalesRow) => s + r.revenue, 0),
          };
        }
        return undefined;
      }
    }
  }, [finalSortedReportRows, activeDomain, activeSalesView]);

  // 8. Chart dataset
  const chartDataset = useMemo(() => {
    return finalSortedReportRows.map(row => {
      if (activeDomain === 'so-performance') {
        const r = row as SOPerformanceReport;
        return { name: r.name, value: r.revenue };
      }
      if (activeDomain === 'inventory') {
        const r = row as StockInventoryReport;
        return { name: `${r.product} (${r.warehouse})`, value: r.currentStock };
      }
      if (activeDomain === 'partners') {
        const r = row as PartnerReportRow;
        return { name: r.name, value: r.totalAmount };
      }
      if (activeDomain === 'monthly') {
        const r = row as MonthlyFinancialRow;
        return { name: r.month, value: r.revenue, profit: r.profit };
      }
      // Sales Analysis
      const revenueKey = (row as any).revenue ?? 0;
      let nameKey = '—';
      if (activeDomain === 'sales-analysis') {
        if (activeSalesView === 'brand') {
          nameKey = (row as BrandSalesRow).brand || '—';
        } else if (activeSalesView === 'item') {
          nameKey = (row as ItemSalesRow).product || '—';
        } else if (activeSalesView === 'counter') {
          nameKey = (row as CounterSalesRow).name || '—';
        } else if (activeSalesView === 'area') {
          nameKey = `${(row as AreaSalesRow).city}, ${(row as AreaSalesRow).state}` || '—';
        } else if (activeSalesView === 'category') {
          nameKey = (row as CategorySalesRow).category || '—';
        }
      }
      return { name: nameKey, value: revenueKey };
    });
  }, [finalSortedReportRows, activeDomain, activeSalesView]);

  const salesChartLabel: Record<SalesSubView, string> = {
    brand: 'Brand-wise Revenue (Top 10)',
    item: 'Item-wise Revenue (Top 10)',
    counter: 'Counter-wise Billing (Top 10)',
    area: 'Area-wise Revenue (Top 10)',
    heatmap: '',
    category: 'Category Revenue Share (Top 10)',
  };

  const chartFormatter = useMemo(() => {
    if (activeDomain === 'inventory') return (v: number) => `${v.toLocaleString()}`;
    return (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
  }, [activeDomain]);

  // 9. CSV Export
  const handleCSVExportRows = () => {
    return finalSortedReportRows.map(row => {
      switch (activeDomain) {
        case 'so-performance': {
          const r = row as SOPerformanceReport;
          return [r.name, r.email, r.totalOrders, r.approvedOrders, r.revenue, r.avgOrderValue, r.visits, r.claims, `${r.ratio}%`];
        }
        case 'inventory': {
          const r = row as StockInventoryReport;
          return [r.product, r.sku, r.warehouse, r.currentStock, r.minStock, r.status, r.rate, r.valuation];
        }
        case 'partners': {
          const r = row as PartnerReportRow;
          return [r.name, r.type, r.city, r.state, r.totalOrders, r.totalAmount, r.lastOrderDate];
        }
        case 'monthly': {
          const r = row as MonthlyFinancialRow;
          return [r.month, r.ordersCount, r.revenue, r.profit];
        }
        case 'sales-analysis': {
          if (activeSalesView === 'brand') {
            const r = row as BrandSalesRow;
            return [r.brand, r.ordersCount, r.qty, r.revenue, r.avgPrice];
          }
          if (activeSalesView === 'item') {
            const r = row as ItemSalesRow;
            return [r.product, r.sku, r.category, r.brand, r.ordersCount, r.qty, r.revenue, r.avgPrice];
          }
          if (activeSalesView === 'counter') {
            const r = row as CounterSalesRow;
            return [r.name, r.type, r.city, r.state, r.ordersCount, r.revenue, r.avgOrder];
          }
          if (activeSalesView === 'area') {
            const r = row as AreaSalesRow;
            return [r.state, r.city, r.partners, r.ordersCount, r.revenue];
          }
          if (activeSalesView === 'category') {
            const r = row as CategorySalesRow;
            return [r.category, r.ordersCount, r.qty, r.revenue, `${r.sharePercent}%`];
          }
          return [];
        }
      }
    });
  };

  const currentColumns = columnsMap[activeDomain];
  const exportHeaders = currentColumns.map(c => c.label);
  const exportFilename = `Report_${activeDomain}${activeDomain === 'sales-analysis' ? `_${activeSalesView}` : ''}_${new Date().toISOString().substring(0, 10)}`;

  const handleSort = (key: any) => {
    if (sortBy === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const domainTabs = [
    { id: 'so-performance', label: 'SO Performance', icon: Award },
    { id: 'inventory', label: 'Inventory Stock', icon: Package },
    { id: 'partners', label: 'Dealer & Distributor', icon: Users },
    { id: 'monthly', label: 'Monthly Financials', icon: Calendar },
    { id: 'sales-analysis', label: 'Sales Analysis', icon: ShoppingCart },
  ];

  const isHeatMap = activeDomain === 'sales-analysis' && activeSalesView === 'heatmap';

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" /> Reports Workspace
          </h1>
          <p className="page-subheader">Customizable and interactive analytical reports dashboard</p>
        </div>
        
        {/* CSV Export Button */}
        {!isHeatMap && (
          <ExportButton
            headers={exportHeaders}
            filename={exportFilename}
            getExportRows={handleCSVExportRows}
            disabled={finalSortedReportRows.length === 0}
          />
        )}
      </div>

      {/* Primary Domain tabs */}
      <div className="flex border-b border-border/80 bg-card/40 backdrop-blur-md p-1.5 rounded-2xl gap-1.5 ring-1 ring-border/50 overflow-x-auto scrollbar-none whitespace-nowrap">
        {domainTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeDomain === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleDomainChange(tab.id as DomainType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all select-none shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sales Analysis — inner sub-tab strip */}
      {activeDomain === 'sales-analysis' && (
        <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-border/50 overflow-x-auto scrollbar-none whitespace-nowrap">
          <BarChart2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
          {SALES_SUB_VIEWS.map(sv => {
            const SubIcon = sv.icon;
            const isActive = activeSalesView === sv.id;
            return (
              <button
                key={sv.id}
                onClick={() => handleSalesViewChange(sv.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all select-none shrink-0",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}
              >
                <SubIcon className="w-3.5 h-3.5" />
                {sv.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Customized Filters Panel */}
      <ReportsFilters
        preset={preset}
        onChangePreset={setPreset}
        customStart={customStart}
        onChangeCustomStart={setCustomStart}
        customEnd={customEnd}
        onChangeCustomEnd={setCustomEnd}
        activeDomain={activeDomain}
        
        selectedSO={selectedSO}
        onChangeSO={setSelectedSO}
        
        selectedWarehouses={selectedWarehouses}
        onChangeWarehouses={setSelectedWarehouses}
        
        selectedInventoryProducts={selectedInventoryProducts}
        onChangeInventoryProducts={setSelectedInventoryProducts}
        
        partnerType={partnerType}
        onChangePartnerType={setPartnerType}
        
        selectedState={selectedState}
        onChangeState={setSelectedState}
        
        selectedStockStatuses={selectedStockStatuses}
        onChangeStockStatuses={setSelectedStockStatuses}
        
        chartStyle={chartStyle}
        onChangeChartStyle={setChartStyle}
        
        searchTerm={searchTerm}
        onChangeSearchTerm={setSearchTerm}

        activeSalesView={activeSalesView}
        selectedBrands={selectedBrands}
        onChangeBrands={setSelectedBrands}
        brandOptions={brandOptions}
        selectedTerritories={selectedTerritories}
        onChangeTerritories={setSelectedTerritories}
        territoryOptions={territoryOptions}
        selectedPartners={selectedPartners}
        onChangePartners={setSelectedPartners}
        selectedSalesProducts={selectedSalesProducts}
        onChangeSalesProducts={setSelectedSalesProducts}
        dealers={dealers}
        distributors={distributors}
        
        users={users}
        warehouses={warehouses}
        products={products}
      />

      {/* Heat Map — special rendering */}
      {isHeatMap ? (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            Order Activity Heat Map — Day of Week × Hour of Day
          </h2>
          <SalesHeatMap data={heatMap} />
        </div>
      ) : (
        <>
          {/* Visual Chart Card */}
          <ReportsCharts
            chartStyle={chartStyle}
            data={chartDataset}
            domain={activeDomain}
            formatter={chartFormatter}
            chartLabel={activeDomain === 'sales-analysis' ? salesChartLabel[activeSalesView] : undefined}
          />

          {/* Customized Data Table */}
          <ReportsTable
            columns={currentColumns}
            rows={finalSortedReportRows}
            totals={totalsAggregates}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            isLoading={activeDomain === 'inventory' && stockLoading}
            emptyMessage={`No report rows matched search query "${searchTerm}" under selected bounds.`}
          />
        </>
      )}
    </div>
  );
};

export default Reports;
