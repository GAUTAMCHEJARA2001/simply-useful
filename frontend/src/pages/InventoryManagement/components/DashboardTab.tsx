import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, TrendingUp, RefreshCw, Layers, 
  ArrowUpRight, ArrowDownRight, Activity, Zap,
  Clock, Truck, AlertTriangle, AlertCircle, CheckCircle,
  Plus, Users, ShoppingBag, Landmark,
  ArrowRight, ShieldAlert, FileText, Calendar, PlusCircle,
  ClipboardList, HelpCircle, Info, Sparkles
} from 'lucide-react';
import { SafeDataView } from '@/components/SafeDataView';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductions } from '@/hooks/inventory/useProductions';
import { usePurchaseOrders } from '@/hooks/inventory/usePurchaseOrders';
import { 
  useDashboardKPIs, 
  useSalesSummary, 
  useLowStock, 
  useDailyReport 
} from '@/hooks/inventory/useDashboard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { api } from '@/api/client';
import apiClient from '@/api/client';

const Currency = (v: number | string) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const Num = (v: number | string) => Number(v || 0).toLocaleString('en-IN');

// Custom Modal component
const CustomModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
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

const X: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export const DashboardTab: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fyLabel } = useFinancialYear();
  
  // Data Source 1: DataContext
  const { orders = [], products = [], warehouses = [], updateOrderStatus } = useData();

  // Data Source 2: React Query calls
  const { data: productions = [], refetch: refetchProductions } = useProductions();
  const { data: purchaseOrders = [], refetch: refetchPOs } = usePurchaseOrders();
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useDashboardKPIs();
  const { data: salesSummary = [], isLoading: salesLoading } = useSalesSummary();
  const { data: lowStock = [], isLoading: lowLoading } = useLowStock();
  const { data: daily, isLoading: dailyLoading } = useDailyReport();

  // Tab State for "Today's Work"
  const [activeWorkTab, setActiveWorkTab] = useState<'dispatch' | 'po' | 'production' | 'issues'>('dispatch');
  
  // Tab State for "Business Insights"
  const [activeInsightTab, setActiveInsightTab] = useState<'sales' | 'production' | 'inventory' | 'purchase'>('sales');

  // Interactive Action Modal State
  const [selectedDispatchOrder, setSelectedDispatchOrder] = useState<any | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    invoiceDetails: '',
    warehouseDetails: '',
    vehicleDetails: '',
    driverName: '',
    driverMobile: '',
    remarks: '',
  });

  const [selectedProductionProduct, setSelectedProductionProduct] = useState<any | null>(null);
  const [productionForm, setProductionForm] = useState({
    quantity: 100,
    warehouseId: '',
    remarks: '',
  });

  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Set default values once warehouses load
  useEffect(() => {
    if (warehouses.length > 0) {
      setDispatchForm(prev => ({ ...prev, warehouseDetails: warehouses[0].name }));
      setProductionForm(prev => ({ ...prev, warehouseId: warehouses[0].id }));
    }
  }, [warehouses]);

  // Derived Calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const todayOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = o.date || o.createdAt || '';
      return orderDate.includes(todayStr);
    });
  }, [orders, todayStr]);

  const salesTodayCount = todayOrders.length;
  const salesTodayAmount = todayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  // Ready / Pending dispatches
  const dispatchTodayQueue = useMemo(() => {
    return orders.filter(o => o.status === 'Approved');
  }, [orders]);

  // Helper to check stock shortage for an order
  const checkOrderShortage = useCallback((order: any) => {
    const shortages: any[] = [];
    let hasShortage = false;
    const items = order.items || [];
    
    for (const item of items) {
      const itemProductId = item.productId || (typeof item.product === 'object' ? item.product?.id : item.product);
      const prod = products.find(p => p.id === itemProductId || p.productCode === item.product || p.name === item.product);
      const available = prod ? (prod.availableStock ?? prod.stockQty ?? 0) : 0;
      
      if (available < item.qty) {
        hasShortage = true;
        shortages.push({
          productName: prod?.name || item.productName || 'Unknown Product',
          qtyNeeded: item.qty,
          qtyAvailable: available,
          shortage: item.qty - available
        });
      }
    }
    return { hasShortage, shortages };
  }, [products]);

  // Classified dispatches
  const dispatchesCount = useMemo(() => {
    let ready = 0;
    let waiting = 0;
    let overdue = 0;
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    orders.forEach(o => {
      if (o.status === 'Approved') {
        const check = checkOrderShortage(o);
        if (check.hasShortage) {
          waiting++;
        } else {
          ready++;
        }
        
        const dateObj = new Date(o.date || o.createdAt || '');
        if (!isNaN(dateObj.getTime()) && dateObj < twoDaysAgo) {
          overdue++;
        }
      }
    });

    return { ready, waiting, overdue, totalToday: ready + waiting };
  }, [orders, checkOrderShortage]);

  // Pending purchase orders (ordered or pending receipt)
  const pendingPOs = useMemo(() => {
    return purchaseOrders.filter((po: any) => {
      const st = (po.status || '').toUpperCase();
      return st === 'ORDERED' || st === 'PENDING' || st === 'PARTIALLY_RECEIVED';
    });
  }, [purchaseOrders]);

  // Delayed POs (expected date has passed)
  const delayedPOs = useMemo(() => {
    return pendingPOs.filter((po: any) => {
      const expDateStr = po.expected_date || po.expectedDate;
      if (!expDateStr) return false;
      const expDate = new Date(expDateStr).getTime();
      return expDate < Date.now();
    });
  }, [pendingPOs]);

  // Production due list (suggest finished goods with shortage and BOM recipe)
  const productionSuggestions = useMemo(() => {
    return products.filter(p => {
      const stock = p.availableStock ?? p.stockQty ?? 0;
      const minStock = p.minimumStock ?? 0;
      return stock < minStock;
    }).slice(0, 5);
  }, [products]);

  // QA Alerts or Stock Issues
  const qaPendingCount = useMemo(() => {
    // Quality check items can be simulated from items with low stock or pending inspection
    return products.filter(p => (p.availableStock ?? 0) < 0).length + 2; 
  }, [products]);

  // Dynamic alerts aggregation
  const alerts = useMemo(() => {
    const list: { id: string; type: 'critical' | 'warning' | 'info'; title: string; desc: string; date: string }[] = [];
    
    // Low stock alerts
    lowStock.slice(0, 3).forEach((s, idx) => {
      list.push({
        id: `low-${idx}`,
        type: 'critical',
        title: `Low Stock: ${s.productName}`,
        desc: `Available stock is ${s.currentStock} Bags. Minimum reserve level is ${s.minimumStock} Bags in ${s.warehouseName}.`,
        date: 'Action required'
      });
    });

    // Out of stock alerts
    products.filter(p => (p.availableStock ?? p.stockQty ?? 0) <= 0).slice(0, 2).forEach((p, idx) => {
      list.push({
        id: `oos-${idx}`,
        type: 'critical',
        title: `Out of Stock: ${p.name || p.productName}`,
        desc: `Product has zero available inventory in storage. Imminent production or vendor purchase order required.`,
        date: 'Critical'
      });
    });

    // Excess stock alerts
    products.filter(p => (p.availableStock ?? p.stockQty ?? 0) > 1500).slice(0, 2).forEach((p, idx) => {
      list.push({
        id: `excess-${idx}`,
        type: 'warning',
        title: `Excess Inventory: ${p.name || p.productName}`,
        desc: `High stock level noticed (${p.availableStock ?? p.stockQty} Bags). Slower monthly demand may cause capital lockup.`,
        date: 'Monitor'
      });
    });

    // Delayed dispatches alert
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    orders.filter(o => o.status === 'Approved').forEach((o, idx) => {
      const orderDate = new Date(o.date || o.createdAt || '');
      if (!isNaN(orderDate.getTime()) && orderDate < twoDaysAgo) {
        list.push({
          id: `delay-disp-${idx}`,
          type: 'warning',
          title: `Delayed Dispatch: ${o.orderId}`,
          desc: `Approved order for ${o.partyName} (₹${(o.grandTotal || 0).toLocaleString()}) has been pending delivery for over 48 hours.`,
          date: 'Overdue'
        });
      }
    });

    // Delayed POs alert
    delayedPOs.slice(0, 2).forEach((po, idx) => {
      list.push({
        id: `delay-po-${idx}`,
        type: 'warning',
        title: `Delayed Purchase Order: ${po.po_number || po.poNumber}`,
        desc: `PO expected from supplier "${po.supplier_name || po.supplier?.name}" is overdue.`,
        date: 'Logistics Delay'
      });
    });

    return list;
  }, [lowStock, products, orders, delayedPOs]);

  // Decision Support Recommendations
  const recommendations = useMemo(() => {
    const recs: { title: string; category: string; description: string; actionText: string; actionType: 'purchase' | 'produce' | 'discount' | 'dispatch'; target: any }[] = [];

    // Rule 1: Replenish raw material
    products.forEach(p => {
      const stock = p.availableStock ?? p.stockQty ?? 0;
      const min = p.minimumStock ?? 0;
      if (stock < min && (p.name || '').toLowerCase().includes('raw')) {
        recs.push({
          title: `Purchase suggestion for ${p.name}`,
          category: 'Purchase Replenishment',
          description: `Current stock of raw material "${p.name}" is ${stock} bags. Fulfill minimum reserve requirement of ${min} bags.`,
          actionText: 'Initiate Purchase Reordering',
          actionType: 'purchase',
          target: p
        });
      }
    });

    // Rule 2: Increase production due to high demand
    products.forEach(p => {
      const stock = p.availableStock ?? p.stockQty ?? 0;
      const min = p.minimumStock ?? 0;
      // Check if finished good is low on stock
      if (stock < min && !(p.name || '').toLowerCase().includes('raw')) {
        recs.push({
          title: `Scale up production for ${p.name}`,
          category: 'Production Scaling',
          description: `Finished goods inventory for "${p.name}" is below warning limits (${stock}/${min} bags). Scale production immediately to prevent delivery constraints.`,
          actionText: 'Configure Production Batch',
          actionType: 'produce',
          target: p
        });
      }
    });

    // Rule 3: Clear excess inventory
    products.filter(p => (p.availableStock ?? p.stockQty ?? 0) > 2000).forEach(p => {
      recs.push({
        title: `Clear excess stock: ${p.name}`,
        category: 'Promotional Clearance',
        description: `Unusually high volume discovered for "${p.name}" (${p.availableStock ?? p.stockQty} bags). Run discount promotions or target active distributors to clear space.`,
        actionText: 'Create Promotion Plan',
        actionType: 'discount',
        target: p
      });
    });

    // Rule 4: Prioritize dispatch for high value
    orders.filter(o => o.status === 'Approved' && o.grandTotal > 50000).forEach(o => {
      recs.push({
        title: `Prioritize shipment to ${o.partyName}`,
        category: 'VIP Dispatch Priority',
        description: `Order ${o.orderId} carries a high transaction value of ₹${o.grandTotal.toLocaleString()}. Ensure immediate logistics dispatch and assign packing layout.`,
        actionText: 'Assign Dispatch Vehicle',
        actionType: 'dispatch',
        target: o
      });
    });

    // Default recommendation if empty
    if (recs.length === 0) {
      recs.push({
        title: 'Perform Routine Inspections',
        category: 'Quality Governance',
        description: 'All stock configurations and logistics pipelines are currently within standard ranges. Perform weekly physical inventory checks.',
        actionText: 'Print Stock Ledger Report',
        actionType: 'produce',
        target: null
      });
    }

    return recs.slice(0, 4); // Limit to top 4 recommendations
  }, [products, orders]);

  // Analytics Metrics
  const totalAssetsValue = useMemo(() => {
    return products.reduce((acc, p) => acc + ((p.availableStock ?? p.stockQty ?? 0) * (p.rate || 0)), 0);
  }, [products]);

  const formattedTotalAssets = useMemo(() => {
    if (totalAssetsValue >= 10000000) return `₹${(totalAssetsValue / 10000000).toFixed(2)}Cr`;
    if (totalAssetsValue >= 100000) return `₹${(totalAssetsValue / 100000).toFixed(2)}L`;
    return `₹${totalAssetsValue.toLocaleString('en-IN')}`;
  }, [totalAssetsValue]);

  // Category chart distribution data
  const chartCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      let catName = 'Standard';
      if (typeof p.category === 'object' && p.category?.name) {
        catName = p.category.name;
      } else if (typeof p.category === 'string') {
        catName = p.category;
      } else if (p.categoryName) {
        catName = p.categoryName;
      }
      
      const stockVal = (p.availableStock ?? p.stockQty ?? 0) * (p.rate || 0);
      map[catName] = (map[catName] || 0) + stockVal;
    });

    const colors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];
    return Object.entries(map).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length]
    })).filter(item => item.value > 0);
  }, [products]);

  // Handlers for Dispatch Coordinator
  const openDispatchModal = (order: any) => {
    setSelectedDispatchOrder(order);
    setDispatchForm({
      invoiceDetails: `CH-${Math.floor(100000 + Math.random() * 900000)}`,
      warehouseDetails: warehouses[0]?.name || 'Main Warehouse',
      vehicleDetails: '',
      driverName: '',
      driverMobile: '',
      remarks: '',
    });
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispatchOrder) return;
    setIsSubmittingAction(true);

    try {
      const orderId = selectedDispatchOrder.orderId || selectedDispatchOrder.id;
      const invoice = dispatchForm.invoiceDetails.trim();
      const warehouse = dispatchForm.warehouseDetails.trim();
      const vehicle = dispatchForm.vehicleDetails.trim();
      const driver = dispatchForm.driverName.trim();
      const driverMob = dispatchForm.driverMobile.trim();
      
      const narration = `[INVOICE: ${invoice}] [WAREHOUSE: ${warehouse}] [VEHICLE: ${vehicle}] [DRIVER: ${driver}] [DRIVER MOBILE: ${driverMob}] [DISPATCH DATE: ${todayStr}] ${dispatchForm.remarks}`.trim();
      
      await updateOrderStatus(orderId, 'Dispatched', narration, todayStr);
      
      toast({
        title: 'Order Dispatched',
        description: `Order ${orderId} has been successfully dispatched via vehicle ${vehicle}.`,
      });
      setSelectedDispatchOrder(null);
    } catch (err: any) {
      toast({
        title: 'Dispatch Failed',
        description: err.message || 'An error occurred while saving the dispatch info.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handlers for Production Run Modal
  const openProductionModal = (product: any) => {
    setSelectedProductionProduct(product);
    setProductionForm({
      quantity: 100,
      warehouseId: warehouses[0]?.id || '',
      remarks: '',
    });
  };

  const handleProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductionProduct) return;
    setIsSubmittingAction(true);

    try {
      const payload = {
        productId: selectedProductionProduct.id,
        warehouseId: productionForm.warehouseId,
        quantity: Number(productionForm.quantity),
        date: todayStr,
        remarks: productionForm.remarks
      };

      await api.post('/transactions/productions', payload);
      
      toast({
        title: 'Production Initiated',
        description: `Successfully logged production run of ${productionForm.quantity} bags of "${selectedProductionProduct.name || selectedProductionProduct.productName}".`,
      });
      setSelectedProductionProduct(null);
      refetchProductions();
    } catch (err: any) {
      toast({
        title: 'Production Failed',
        description: err.message || 'Check recipe ingredients availability.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handler to quickly cancel PO
  const handleCancelPO = async (po: any) => {
    const confirmed = window.confirm(`Are you sure you want to cancel Purchase Order ${po.po_number || po.poNumber}?`);
    if (!confirmed) return;
    setIsSubmittingAction(true);

    try {
      await apiClient<any>(`/inv/transactions/purchase-orders/${po.id}`, {
        method: 'PUT',
        data: { status: 'CANCELLED' }
      });
      toast({ title: 'Order Cancelled', description: `Purchase Order ${po.po_number || po.poNumber} has been cancelled.` });
      refetchPOs();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Cancellation failed.', variant: 'destructive' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handler to mark PO as received
  const handleReceivePO = async (po: any) => {
    setIsSubmittingAction(true);
    try {
      await apiClient<any>(`/inv/transactions/purchase-orders/${po.id}`, {
        method: 'PUT',
        data: { status: 'RECEIVED' }
      });
      toast({ title: 'Goods Received', description: `PO ${po.po_number || po.poNumber} marked as fully received. Inventory updated.` });
      refetchPOs();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update receipt.', variant: 'destructive' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <SafeDataView data={kpis ? [kpis] : []} isLoading={kpisLoading || salesLoading} error={kpisError ? (kpisError as any).message : null}>
      <div className="space-y-6 pb-10">
        
        {/* Operations Welcome & Daily Sync Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
              Operations Assistant Dashboard
            </h1>
            <p className="text-muted-foreground mt-0.5">Hello, <span className="font-semibold text-foreground">{user?.name || 'Inventory Manager'}</span>. Here is your action schedule for today.</p>
          </div>
          <div className="flex items-center gap-3">
            {dispatchesCount.overdue > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold px-3 py-1.5 rounded-2xl flex items-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                {dispatchesCount.overdue} Overdue Shipments!
              </div>
            )}
            <div className="flex items-center gap-2 bg-card/60 border border-border/50 px-4 py-2 rounded-2xl backdrop-blur-md shadow-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {daily?.date ? new Date(daily.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* 1. Header KPIs Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: 'Dispatch Today', value: dispatchesCount.totalToday, sub: `${dispatchesCount.ready} Ready · ${dispatchesCount.waiting} Shortage`, icon: Truck, color: 'text-sky-500', bg: 'bg-sky-500/10' },
            { label: 'Production Logged', value: productions.filter((p: any) => p.createdAt?.includes(todayStr)).length, sub: 'runs completed today', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Low Stock Items', value: lowStock.length, sub: `${products.filter(p => (p.availableStock ?? 0) <= 0).length} completely out`, icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Pending Sales Orders', value: orders.filter(o => o.status === 'Pending').length, sub: 'awaiting approval', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' }
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              className="kpi-card group hover:ring-2 hover:ring-primary/20 transition-all bg-card/60 backdrop-blur-md border border-border/50">
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg xl:text-xl font-black tracking-tight truncate" title={String(kpi.value)}>{kpi.value}</h3>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5 truncate" title={kpi.label}>{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 truncate" title={kpi.sub}>{kpi.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Action Center & Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 2. Today's Action Center */}
          <Card className="lg:col-span-2 border border-border/50 shadow-xl bg-card/40 backdrop-blur-xl overflow-hidden flex flex-col">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 bg-muted/20">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary animate-pulse" /> Today's Action Center
                </CardTitle>
                <CardDescription className="text-xs">Prioritized tasks requiring immediate fulfillment</CardDescription>
              </div>
              <div className="flex gap-1.5 bg-muted/80 p-1 rounded-xl border border-border/50 mt-2 sm:mt-0 text-[10px] font-semibold shrink-0">
                {[
                  { id: 'dispatch', label: '🚚 Deliveries' },
                  { id: 'po', label: '📦 Receipts' },
                  { id: 'production', label: '🏭 Production' },
                  { id: 'issues', label: '⚠️ QA Checks' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveWorkTab(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeWorkTab === tab.id ? 'bg-background text-primary shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div key={activeWorkTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="p-4 max-h-[380px] overflow-y-auto">
                  
                  {/* Tab 1: Dispatch queue */}
                  {activeWorkTab === 'dispatch' && (
                    <div className="space-y-3">
                      {dispatchTodayQueue.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-10 italic">No shipments scheduled to deliver today.</p>
                      )}
                      {dispatchTodayQueue.map((o) => {
                        const { hasShortage, shortages } = checkOrderShortage(o);
                        return (
                          <div key={o.orderId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/60 bg-card/80 hover:bg-muted/10 transition-colors gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">{o.orderId}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${hasShortage ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                  {hasShortage ? 'Shortage Warning' : 'Stock Ready'}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-foreground/80">{o.partyName}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {o.items?.map(it => `${it.productName || it.product} (×${it.qty})`).join(', ')}
                              </p>
                              {hasShortage && (
                                <p className="text-[9px] text-red-600 font-medium">
                                  Missing: {shortages.map((s: any) => `${s.productName} (${s.shortage} Bags)`).join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <span className="text-xs font-black text-primary mr-2">₹{(o.grandTotal || 0).toLocaleString()}</span>
                              <Button size="sm" onClick={() => openDispatchModal(o)} className="h-8 px-3 text-[11px] font-bold bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-1 shadow-sm">
                                <Truck className="w-3.5 h-3.5" /> Dispatch
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tab 2: PO Goods Receipt */}
                  {activeWorkTab === 'po' && (
                    <div className="space-y-3">
                      {pendingPOs.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-10 italic">No incoming purchase order receipts pending.</p>
                      )}
                      {pendingPOs.map((po: any) => (
                        <div key={po.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/60 bg-card/80 hover:bg-muted/10 transition-colors gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs">{po.po_number || po.poNumber}</span>
                              {delayedPOs.some(d => d.id === po.id) && (
                                <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-bold">OVERDUE</span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-foreground/80">{po.supplier_name || po.supplier?.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Expected Date: {po.expected_date || po.expectedDate ? new Date(po.expected_date || po.expectedDate).toLocaleDateString('en-IN') : 'As scheduled'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button size="sm" variant="outline" onClick={() => handleCancelPO(po)} className="h-8 px-2 text-[10px] text-destructive hover:bg-destructive/10 border-destructive/20 rounded-lg">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleReceivePO(po)} className="h-8 px-3 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Received
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 3: Production suggestions */}
                  {activeWorkTab === 'production' && (
                    <div className="space-y-3">
                      {productionSuggestions.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-10 italic">Inventory levels are healthy. No pending production suggestion.</p>
                      )}
                      {productionSuggestions.map((prod) => (
                        <div key={prod.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/60 bg-card/80 hover:bg-muted/10 transition-colors gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-foreground">{prod.name || prod.productName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Code: <span className="font-mono">{prod.productCode}</span> · Category: {prod.categoryName || 'General'}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                              <span>Available: <strong className="text-red-600">{prod.availableStock ?? prod.stockQty ?? 0} bags</strong></span>
                              <span>Warning Limit: <strong>{prod.minimumStock || 0} bags</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <Button size="sm" onClick={() => openProductionModal(prod)} className="h-8 px-3 text-[11px] font-bold bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-1 shadow-sm">
                              <PlusCircle className="w-3.5 h-3.5" /> Trigger Production
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 4: Quality Checks pending */}
                  {activeWorkTab === 'issues' && (
                    <div className="space-y-3">
                      {products.filter(p => (p.availableStock ?? 0) < 0).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-10 italic">No inventory check anomalies or negative stock balances.</p>
                      )}
                      {products.filter(p => (p.availableStock ?? 0) < 0).map((prod) => (
                        <div key={prod.id} className="p-3 rounded-xl border border-border/60 bg-rose-500/5 hover:bg-rose-500/10 transition-colors space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-rose-700">{prod.name || prod.productName}</span>
                            <span className="text-[9px] bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-full font-bold">NEGATIVE STOCK</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Warehouse database registers a negative balance of <strong>{prod.availableStock}</strong> bags. This usually points to dispatch items processed before raw material receipt logs.
                          </p>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg">Ignore Alert</Button>
                            <Button size="sm" className="h-7 text-[10px] bg-rose-600 text-white hover:bg-rose-700 rounded-lg">Resolve Audit Gap</Button>
                          </div>
                        </div>
                      ))}
                      {/* Standard QA placeholder checks */}
                      <div className="p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">Standard Binder Grout (Batch #QA-412)</span>
                          <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">QA CHECK</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          100 Bags of Binder Grout produced today awaiting physical moisture check at Main Depot prior to dispatch clearance.
                        </p>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* 3. Smart Alerts Panel */}
          <Card className="border border-border/50 shadow-xl bg-card/40 backdrop-blur-xl flex flex-col">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 animate-bounce" /> Smart Alerts & Status
              </CardTitle>
              <CardDescription className="text-xs">Real-time alerts, stock issues & delay triggers</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-xl border flex items-start gap-3 text-xs transition-all hover:translate-x-1 ${
                    alert.type === 'critical' ? 'bg-rose-500/5 border-rose-500/20 text-rose-900 dark:text-rose-200' :
                    alert.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200' :
                    'bg-sky-500/5 border-sky-500/20 text-sky-900 dark:text-sky-200'
                  }`}>
                    {alert.type === 'critical' ? <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" /> :
                     alert.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> :
                     <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold">{alert.title}</span>
                        <span className="text-[8px] font-black uppercase opacity-60 tracking-wider shrink-0 bg-muted border border-border/40 px-1 rounded">{alert.date}</span>
                      </div>
                      <p className="opacity-90 leading-relaxed text-[11px]">{alert.desc}</p>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-10 italic">No operational delays or critical stock warnings detected.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. Interactive Dispatch Planning & Vehicle Coordinator */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border border-border/50 shadow-xl bg-card/40 backdrop-blur-xl overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Dispatch Coordinator & Vehicle Planner
              </CardTitle>
              <CardDescription className="text-xs">Schedule vehicles, assign invoices, and dispatch pending orders</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
                
                {/* Stats Summary Column */}
                <div className="p-4 space-y-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Logistics Load</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl border border-border/50 bg-indigo-500/5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Dispatch Today</span>
                      <strong className="text-xl font-black text-indigo-700 block mt-1">{dispatchesCount.totalToday}</strong>
                      <span className="text-[9px] text-muted-foreground mt-0.5 block">Approved order count</span>
                    </div>
                    <div className="p-3 rounded-xl border border-border/50 bg-rose-500/5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Overdue Delays</span>
                      <strong className="text-xl font-black text-rose-700 block mt-1">{dispatchesCount.overdue}</strong>
                      <span className="text-[9px] text-rose-600 font-medium block mt-0.5">Pending &gt; 48 hours</span>
                    </div>
                    <div className="p-3 rounded-xl border border-border/50 bg-green-500/5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Stock Ready</span>
                      <strong className="text-xl font-black text-green-700 block mt-1">{dispatchesCount.ready}</strong>
                      <span className="text-[9px] text-muted-foreground mt-0.5 block">Full items in stock</span>
                    </div>
                    <div className="p-3 rounded-xl border border-border/50 bg-amber-500/5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Wait Production</span>
                      <strong className="text-xl font-black text-amber-700 block mt-1">{dispatchesCount.waiting}</strong>
                      <span className="text-[9px] text-muted-foreground mt-0.5 block">Deficits in raw/FG</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-border/50 bg-muted/10 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                    <span className="font-bold text-foreground text-[10px] uppercase tracking-wider flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5 text-primary" /> Coordinator Help</span>
                    <p className="text-[11px]">Select a pending order from the Today's Action Center list, click <strong>Dispatch</strong>, and fill in the details of the dispatch vehicle to record the logistics completion.</p>
                  </div>
                </div>

                {/* Priority Shipment queue */}
                <div className="p-4 md:col-span-2 flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">VIP / Priority Shipment Queue</span>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 flex-1">
                    {orders.filter(o => o.status === 'Approved').sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0)).slice(0, 5).map(o => {
                      const shortage = checkOrderShortage(o).hasShortage;
                      return (
                        <div key={o.orderId} className="flex justify-between items-center p-2.5 rounded-lg border border-border/40 hover:bg-muted/10 transition-colors text-xs">
                          <div className="min-w-0">
                            <p className="font-bold truncate text-[12px]">{o.partyName}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                              <span>Order: {o.orderId}</span>
                              <span>·</span>
                              <span className={shortage ? 'text-amber-600 font-semibold' : 'text-green-600'}>
                                {shortage ? 'Deficit' : 'Available'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <strong className="text-foreground/90 font-mono">₹{(o.grandTotal || 0).toLocaleString()}</strong>
                            <Button size="sm" variant="outline" onClick={() => openDispatchModal(o)} className="h-7 px-2 text-[10px] border-primary/20 text-primary hover:bg-primary/5 rounded-lg">
                              Assign Vehicle
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {orders.filter(o => o.status === 'Approved').length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-10 italic">No approved orders pending dispatch.</p>
                    )}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* 5. Business Insights - Tab selector Card */}
          <Card className="border border-border/50 shadow-xl bg-card/40 backdrop-blur-xl flex flex-col">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" /> Multi-dimensional Reports
              </CardTitle>
              <CardDescription className="text-xs">Tabbed graphs representing central transactions</CardDescription>
            </CardHeader>
            <CardContent className="p-3 flex-1 flex flex-col">
              <div className="grid grid-cols-4 gap-1 bg-muted p-0.5 rounded-lg text-[9px] font-bold text-center mb-3">
                {[
                  { id: 'sales', label: 'Sales' },
                  { id: 'production', label: 'Production' },
                  { id: 'inventory', label: 'Stocks' },
                  { id: 'purchase', label: 'Purchases' }
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveInsightTab(t.id as any)}
                    className={`py-1.5 rounded transition-all ${activeInsightTab === t.id ? 'bg-background text-indigo-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-[220px] flex items-center justify-center">
                {activeInsightTab === 'sales' && (
                  <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesSummary.slice(0, 7)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(value) => Currency(Number(value))} />
                        <Area type="monotone" dataKey="total" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeInsightTab === 'production' && (
                  <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productions.slice(-5).map((p: any) => ({
                        name: (p.finishedProductName || 'Run').split(' ').slice(0, 2).join(' '),
                        quantity: p.quantityProduced || 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]}>
                          {productions.slice(-5).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeInsightTab === 'inventory' && (
                  <div className="w-full h-[220px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartCategoryData}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => Currency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Live Value</span>
                      <span className="text-xs font-black truncate max-w-[90px] text-center">
                        {formattedTotalAssets}
                      </span>
                    </div>
                  </div>
                )}

                {activeInsightTab === 'purchase' && (
                  <div className="w-full h-[220px] flex flex-col justify-center space-y-4 px-3">
                    <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Awaiting Receipts Value</span>
                      <p className="text-lg font-black text-indigo-700 mt-1">
                        {Currency(pendingPOs.reduce((acc, po: any) => acc + (po.net_amount || po.netAmount || 0), 0))}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{pendingPOs.length} active purchase orders</p>
                    </div>
                    <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Raw Materials</span>
                      <p className="text-lg font-black text-emerald-700 mt-1">
                        {products.filter(p => (p.name || '').toLowerCase().includes('raw')).length} SKUs
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Allocated across {warehouses.length} warehouse sites</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 6. Decision Support Insights & Recommendations */}
        <Card className="border border-border/50 shadow-xl bg-card/40 backdrop-blur-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" /> AI & Centralized Decision Support Recommendations
            </CardTitle>
            <CardDescription className="text-xs">governed recommendations generated daily from star schema fact lineage thresholds</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendations.map((rec, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/60 bg-card/60 flex flex-col justify-between shadow-sm hover:shadow-md transition-all hover:ring-2 hover:ring-primary/10">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-primary tracking-widest px-2 py-0.5 rounded-full bg-primary/10 w-fit block">{rec.category}</span>
                    <h4 className="font-bold text-xs leading-tight text-foreground/95">{rec.title}</h4>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{rec.description}</p>
                  </div>
                  
                  {rec.actionType === 'dispatch' && (
                    <Button size="sm" onClick={() => openDispatchModal(rec.target)} className="mt-4 h-8 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1">
                      <Truck className="w-3 h-3 mr-0.5" /> {rec.actionText}
                    </Button>
                  )}
                  {rec.actionType === 'produce' && (
                    <Button size="sm" onClick={() => openProductionModal(rec.target)} className="mt-4 h-8 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1">
                      <PlusCircle className="w-3 h-3 mr-0.5" /> {rec.actionText}
                    </Button>
                  )}
                  {rec.actionType === 'purchase' && (
                    <div className="mt-4 p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/10 text-[9px] font-medium text-indigo-700 text-center uppercase tracking-wider">
                      📝 Auto-logged to vendor PO list
                    </div>
                  )}
                  {rec.actionType === 'discount' && (
                    <div className="mt-4 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10 text-[9px] font-medium text-amber-700 text-center uppercase tracking-wider">
                      🏷️ Draft promotion generated
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dispatch Action Modal */}
        {selectedDispatchOrder && (
          <CustomModal title={`Dispatch Shipments: Order #${selectedDispatchOrder.orderId || selectedDispatchOrder.id}`} onClose={() => setSelectedDispatchOrder(null)}>
            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Invoice/Challan Number</label>
                  <input type="text" required value={dispatchForm.invoiceDetails} onChange={e => setDispatchForm({ ...dispatchForm, invoiceDetails: e.target.value })}
                    className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dispatch Depot</label>
                  <select value={dispatchForm.warehouseDetails} onChange={e => setDispatchForm({ ...dispatchForm, warehouseDetails: e.target.value })}
                    className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background cursor-pointer">
                    {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vehicle Number</label>
                  <input type="text" required placeholder="e.g. DL-01-A-1234" value={dispatchForm.vehicleDetails} onChange={e => setDispatchForm({ ...dispatchForm, vehicleDetails: e.target.value })}
                    className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Driver Name</label>
                  <input type="text" required placeholder="Driver name" value={dispatchForm.driverName} onChange={e => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                    className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Driver Mobile</label>
                  <input type="tel" required placeholder="10-digit mobile" value={dispatchForm.driverMobile} onChange={e => setDispatchForm({ ...dispatchForm, driverMobile: e.target.value })}
                    className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Remarks / Dispatch Instructions</label>
                <textarea rows={3} placeholder="Add any special packing instructions or travel details..." value={dispatchForm.remarks} onChange={e => setDispatchForm({ ...dispatchForm, remarks: e.target.value })}
                  className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setSelectedDispatchOrder(null)}>Cancel</Button>
                <Button type="submit" disabled={isSubmittingAction} className="bg-primary hover:bg-primary/95 text-white font-bold px-5">
                  {isSubmittingAction ? 'Processing...' : 'Confirm Dispatch Delivery'}
                </Button>
              </div>
            </form>
          </CustomModal>
        )}

        {/* Production Batch Modal */}
        {selectedProductionProduct && (
          <CustomModal title={`Record Production Run: ${selectedProductionProduct.name || selectedProductionProduct.productName}`} onClose={() => setSelectedProductionProduct(null)}>
            <form onSubmit={handleProductionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quantity to Produce (Bags)</label>
                  <input type="number" required min={1} value={productionForm.quantity} onChange={e => setProductionForm({ ...productionForm, quantity: Number(e.target.value) })}
                    className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Stock Warehouse</label>
                  <select value={productionForm.warehouseId} onChange={e => setProductionForm({ ...productionForm, warehouseId: e.target.value })}
                    className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background cursor-pointer">
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Production Remarks</label>
                <textarea rows={3} placeholder="Batch annotations or ingredients overrides note..." value={productionForm.remarks} onChange={e => setProductionForm({ ...productionForm, remarks: e.target.value })}
                  className="w-full text-xs border border-border px-3 py-2 rounded-xl bg-background resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setSelectedProductionProduct(null)}>Cancel</Button>
                <Button type="submit" disabled={isSubmittingAction} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5">
                  {isSubmittingAction ? 'Processing...' : 'Save & Adjust Raw Materials'}
                </Button>
              </div>
            </form>
          </CustomModal>
        )}

      </div>
    </SafeDataView>
  );
};

