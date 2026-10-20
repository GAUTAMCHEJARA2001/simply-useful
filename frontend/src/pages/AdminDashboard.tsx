import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Users, ShoppingCart, TrendingUp, CheckCircle, XCircle, Clock, Truck, 
  Star, Warehouse, ClipboardList, AlertTriangle, Trophy, ArrowUpRight, 
  Target, IndianRupee, Search, Filter, Calendar, Send, ShieldCheck, 
  Store, Globe, FileText, Check, AlertCircle, Sparkles, Building2, Eye, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, Navigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Order } from '@/types';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';
import { reportService } from '@/api/services/report.service';
import { useQuery } from '@tanstack/react-query';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LedgerRequestsPanel from '@/components/admin/LedgerRequestsPanel';
import OnboardingRequestsPanel from '@/components/admin/OnboardingRequestsPanel';
import PaymentRequestsPanel from '@/components/admin/PaymentRequestsPanel';
import { SmartDatePicker } from '@/components/ui/SmartDatePicker';

const statusStyles: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  'Partially Dispatched': 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800',
  Dispatched: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  Completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  'Partially Returned': 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
  Returned: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  Cancelled: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800',
};

const getDeliveryUrgency = (dateStr?: string) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const formattedDate = target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)}d (${formattedDate})`,
      days: diffDays,
      status: 'overdue' as const,
      color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      badge: 'Overdue'
    };
  }
  if (diffDays === 0) {
    return {
      label: `Deliver Today (${formattedDate})`,
      days: diffDays,
      status: 'today' as const,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse',
      badge: 'Today'
    };
  }
  if (diffDays <= 3) {
    return {
      label: `Due in ${diffDays}d (${formattedDate})`,
      days: diffDays,
      status: 'urgent' as const,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      badge: 'Urgent'
    };
  }
  return {
    label: `Deliver by ${formattedDate} (${diffDays}d)`,
    days: diffDays,
    status: 'normal' as const,
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    badge: 'Scheduled'
  };
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const { orders, dealers, products, users, warehouses, updateOrderStatus, updateOrderItems } = useData();
  const { toast } = useToast();
  const { can } = usePermissions();
  const { filterBySelectedFY, fyLabel, selectedFY } = useFinancialYear();

  // Local state
  const [broadcastText, setBroadcastText] = useState('');
  const [targetRole, setTargetRole] = useState('ALL');
  const [confirmOrder, setConfirmOrder] = useState<{ order: Order; action: 'Approved' | 'Cancelled'; reason?: string; action_date?: string } | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // Approval queue filters
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'UNALLOCATED' | 'URGENT' | 'READY'>('ALL');

  // Backend KPIs
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-kpis', selectedFY],
    queryFn: () => reportService.dashboard().then(res => res.data.data),
    staleTime: 30000,
  });

  // Filter orders to selected FY
  const fyOrders = useMemo(() => {
    return filterBySelectedFY(orders, o => o.date || (o as any).createdAt);
  }, [orders, filterBySelectedFY]);

  // Comprehensive Pipeline Calculation
  const pipeline = useMemo(() => {
    const counts = {
      Pending: 0,
      Approved: 0,
      Dispatched: 0,
      Completed: 0,
      Returned: 0,
      Cancelled: 0,
    };
    const amounts = {
      Pending: 0,
      Approved: 0,
      Dispatched: 0,
      Completed: 0,
      Returned: 0,
      Cancelled: 0,
    };

    fyOrders.forEach(o => {
      const status = (o.status || 'Pending') as keyof typeof counts;
      const amt = o.grandTotal ?? o.grand_total ?? 0;
      if (counts[status] !== undefined) {
        counts[status]++;
        amounts[status] += amt;
      }
    });

    return { counts, amounts };
  }, [fyOrders]);

  const pendingOrders = useMemo(() => {
    return fyOrders.filter(o => o.status === 'Pending');
  }, [fyOrders]);

  const unallocatedCount = useMemo(() => {
    return pendingOrders.filter(o => !((o as any).assignedWarehouse || o.warehouseId || o.warehouseid)).length;
  }, [pendingOrders]);

  const urgentCount = useMemo(() => {
    return pendingOrders.filter(o => {
      const urg = getDeliveryUrgency(o.expectedDeliveryDate || (o as any).expected_delivery_date);
      return urg?.status === 'overdue' || urg?.status === 'today' || urg?.status === 'urgent';
    }).length;
  }, [pendingOrders]);

  const totalDealers = dealers.filter(d => d.active).length;
  const totalRevenue = fyOrders.reduce((sum, o) => sum + (o.grandTotal ?? o.grand_total ?? 0), 0);
  const formattedRevenue = totalRevenue >= 10000000 
    ? `₹${(totalRevenue / 10000000).toFixed(2)} Cr`
    : totalRevenue >= 100000 
      ? `₹${(totalRevenue / 100000).toFixed(2)} Lac` 
      : `₹${(totalRevenue / 1000).toFixed(0)} K`;

  const avgOrderValue = fyOrders.length > 0 ? Math.round(totalRevenue / fyOrders.length) : 0;
  const completionRate = fyOrders.length > 0 ? Math.round((pipeline.counts.Completed / fyOrders.length) * 100) : 0;

  const salesOfficers = useMemo(() => {
    return (users || []).filter(u => (u.role === 'SALES' || u.role === 'SALES_OFFICER') && u.active);
  }, [users]);

  // SO Chart Data
  const soData = useMemo(() => {
    const salesUsers = (users || []).filter(u => u.role === 'SALES' || u.role === 'SALES_OFFICER');
    return salesUsers.map(u => ({
      name: (u.name || '').split(' ')[0] || u.email.split('@')[0],
      orders: fyOrders.filter(o => (o.soEmail || o.so_email) === u.email).length,
      revenue: fyOrders
        .filter(o => (o.soEmail || o.so_email) === u.email && o.status !== 'Cancelled')
        .reduce((s, o) => s + (o.grandTotal ?? o.grand_total ?? 0), 0),
    })).sort((a, b) => b.revenue - a.revenue);
  }, [users, fyOrders]);

  // Filtered Pending Orders
  const filteredPendingOrders = useMemo(() => {
    return pendingOrders.filter(o => {
      const orderId = (o.orderId || o.order_id || o.id || '').toLowerCase();
      const party = (o.partyName || o.party_name || '').toLowerCase();
      const so = (o.soEmail || o.so_email || '').toLowerCase();
      const searchMatch = !approvalSearch.trim() || 
        orderId.includes(approvalSearch.toLowerCase()) || 
        party.includes(approvalSearch.toLowerCase()) || 
        so.includes(approvalSearch.toLowerCase());

      if (!searchMatch) return false;

      const hasWarehouse = Boolean((o as any).assignedWarehouse || o.warehouseId || o.warehouseid);
      const urgency = getDeliveryUrgency(o.expectedDeliveryDate || (o as any).expected_delivery_date);

      if (approvalFilter === 'UNALLOCATED') return !hasWarehouse;
      if (approvalFilter === 'READY') return hasWarehouse;
      if (approvalFilter === 'URGENT') return urgency?.status === 'overdue' || urgency?.status === 'today' || urgency?.status === 'urgent';
      return true;
    });
  }, [pendingOrders, approvalSearch, approvalFilter]);

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) {
      toast({
        title: 'Empty Message',
        description: 'Please enter a broadcast message to announce to staff.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { crudApi } = await import('@/api/crud');
      const { API_ENDPOINTS } = await import('@/api/endpoints');
      await crudApi.create(API_ENDPOINTS.BROADCASTS, {
        message: broadcastText.trim(),
        targetRole: targetRole,
      });
      setBroadcastText('');
      toast({
        title: '📢 Broadcast Sent Successfully',
        description: `Message broadcasted to ${targetRole === 'ALL' ? 'all staff members' : targetRole.toLowerCase() + 's'}.`,
      });
    } catch (e: any) {
      toast({
        title: 'Broadcast Error',
        description: e?.message || 'Failed to send broadcast.',
        variant: 'destructive',
      });
    }
  };

  const handleAssignWarehouse = async (orderId: string, warehouseId: string) => {
    try {
      const wh = warehouses.find(w => String(w.id) === warehouseId);
      await updateOrderItems(orderId, { assignedWarehouse: Number(warehouseId) });
      toast({
        title: 'Warehouse Assigned',
        description: `Order ${orderId} allocated to warehouse "${wh?.name || warehouseId}".`,
      });
    } catch (err: any) {
      toast({
        title: 'Allocation Failed',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleReassignSO = async (orderId: string, soEmail: string) => {
    try {
      await updateOrderItems(orderId, { soEmail });
      toast({
        title: 'Sales Officer Reassigned',
        description: `Order ${orderId} is now assigned to ${soEmail}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Reassignment Failed',
        description: err.message || 'An error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleAction = async () => {
    if (!confirmOrder) return;
    const orderId = confirmOrder.order.orderId || confirmOrder.order.order_id || confirmOrder.order.id || '';
    const partyName = confirmOrder.order.partyName || confirmOrder.order.party_name || 'Party';
    
    if (confirmOrder.action === 'Cancelled') {
      if (!confirmOrder.reason?.trim()) {
        toast({ title: 'Reason Required', description: 'Please provide a clear reason for rejecting this order.', variant: 'destructive' });
        return;
      }
      if (!confirmOrder.action_date) {
        toast({ title: 'Date Required', description: 'Please provide the rejection date.', variant: 'destructive' });
        return;
      }
    }
    await updateOrderStatus(orderId, confirmOrder.action, confirmOrder.reason, confirmOrder.action_date);
    toast({
      title: confirmOrder.action === 'Approved' ? '✅ Order Approved' : '❌ Order Rejected',
      description: `${orderId} — ${partyName} has been ${confirmOrder.action.toLowerCase()}. Inventory and sales teams notified.`,
    });
    setConfirmOrder(null);
  };

  if (!can('view_admin_dashboard')) {
    return <Navigate to="/" replace />;
  }

  // Quick Command Hub Items
  const quickLinks = [
    { label: 'Warehouse Facilities', path: '/admin/warehouses', icon: Warehouse, desc: 'Stock locations & storage rooms' },
    { label: 'Dealers & Retailers', path: '/admin/dealers', icon: Store, desc: 'Registered retail partners & credit' },
    { label: 'Staff Management', path: '/admin/users', icon: Users, desc: 'Staff logins, roles & scopes' },
    { label: 'Product BOM Recipes', path: '/admin/bom', icon: ClipboardList, desc: 'Bill of Materials & formulations' },
    { label: 'Global Stock Matrix', path: '/admin/global-inventory', icon: Globe, desc: 'Consolidated multi-depot stock' },
    { label: 'Audit & Activity Logs', path: '/admin/activity-logs', icon: ShieldCheck, desc: 'System security audit trail' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── TOP HEADER & OPERATIONAL STATUS ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/70 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">Admin Overview</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Executive command dashboard, sales pipeline, approval queues & operational fulfillment for{' '}
            <span className="font-semibold text-primary">{fyLabel}</span>
          </p>
        </div>

        {/* Action pills & quick switch */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {pendingOrders.length > 0 && (
            <button
              onClick={() => setActiveTab('approvals')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-all text-xs font-semibold cursor-pointer"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>{pendingOrders.length} Pending Approval</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary/80 border border-border text-xs font-medium text-foreground">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>FY: {fyLabel}</span>
          </div>
        </div>
      </div>

      {/* ── HERO KPI STATS CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dispatch & Logistics Pipeline */}
        <div className="bg-card border border-border/80 hover:border-primary/40 transition-all rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dispatch Pipeline</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-foreground">
              {pipeline.counts.Dispatched + pipeline.counts.Completed}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-indigo-600 font-medium">{pipeline.counts.Dispatched} in transit</span>
              <span>&middot;</span>
              <span className="text-emerald-600 font-medium">{pipeline.counts.Completed} delivered</span>
            </p>
          </div>
        </div>

        {/* Card 2: Order Fulfillment */}
        <div className="bg-card border border-border/80 hover:border-primary/40 transition-all rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Volume</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-foreground">{fyOrders.length}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-blue-600 font-medium">{completionRate}% completed</span>
              <span>&middot;</span>
              <span>{pipeline.counts.Dispatched} in transit</span>
            </p>
          </div>
        </div>

        {/* Card 3: Pending Approvals Action Hub */}
        <div 
          onClick={() => setActiveTab('approvals')}
          className={`bg-card border transition-all rounded-2xl p-5 shadow-sm space-y-3 cursor-pointer ${
            pendingOrders.length > 0 
              ? 'border-amber-500/40 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10' 
              : 'border-border/80 hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action Required</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              pendingOrders.length > 0 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-secondary text-muted-foreground'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
              {pendingOrders.length}
              {pendingOrders.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                  Needs Review
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {unallocatedCount > 0 ? (
                <span className="text-amber-700 dark:text-amber-400 font-medium">⚠️ {unallocatedCount} unallocated warehouse</span>
              ) : pendingOrders.length > 0 ? (
                <span className="text-emerald-600 font-medium">All warehouses assigned</span>
              ) : (
                <span className="text-emerald-600 font-medium">All caught up</span>
              )}
            </p>
          </div>
        </div>

        {/* Card 4: Network Reach */}
        <div className="bg-card border border-border/80 hover:border-primary/40 transition-all rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Distribution</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-foreground">{dashboardData?.activeDealersCount ?? totalDealers}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>{salesOfficers.length} Sales Officers</span>
              <span>&middot;</span>
              <span>{warehouses.length} Depots</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── SPACIOUS EXECUTIVE TABS WORKSPACE ────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1 w-full sm:w-auto">
            <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-xs md:text-sm font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Executive Overview</span>
            </TabsTrigger>

            <TabsTrigger value="approvals" className="rounded-lg px-4 py-2 text-xs md:text-sm font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm relative">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Orders Approval Queue</span>
              {pendingOrders.length > 0 && (
                <Badge className="ml-1 bg-amber-500 text-white hover:bg-amber-600 text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full">
                  {pendingOrders.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="requests" className="rounded-lg px-4 py-2 text-xs md:text-sm font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <ClipboardList className="w-4 h-4 text-purple-500" />
              <span>Operations &amp; Requests</span>
            </TabsTrigger>

            <TabsTrigger value="broadcast" className="rounded-lg px-4 py-2 text-xs md:text-sm font-semibold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Send className="w-4 h-4 text-blue-500" />
              <span>Broadcast &amp; Comms</span>
            </TabsTrigger>
          </TabsList>

          <p className="text-xs text-muted-foreground hidden sm:block">
            {activeTab === 'overview' && 'High-level metrics & pipeline insights'}
            {activeTab === 'approvals' && `${pendingOrders.length} order(s) waiting for administrative decision`}
            {activeTab === 'requests' && 'Compliance, ledger & onboarding workflows'}
            {activeTab === 'broadcast' && 'Send instant notifications to field teams'}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: EXECUTIVE OVERVIEW
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6 focus:outline-none">
          {/* Attention Banner if Pending Orders Exist */}
          {pendingOrders.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-card border border-amber-500/30 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm md:text-base font-bold text-foreground">
                      {pendingOrders.length} Sales Order{pendingOrders.length > 1 ? 's' : ''} Require Approval
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {unallocatedCount > 0 
                        ? `${unallocatedCount} order(s) need warehouse allocation before dispatch.`
                        : 'All orders allocated and ready for executive authorization.'}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setActiveTab('approvals')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 h-9 shadow-xs shrink-0 cursor-pointer"
                >
                  <span>Open Orders Approval Queue</span>
                  <ArrowUpRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Spacious Order Pipeline ─────────────────────────────────── */}
          <Card className="border-border/80 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-secondary/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <span>Order Fulfillment Pipeline</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive lifecycle stages from placement to delivery for FY {fyLabel}
                  </CardDescription>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{fyOrders.length}</span> total orders &middot;{' '}
                  <span className="font-semibold text-emerald-600">{completionRate}% completion rate</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 md:p-6 space-y-6">
              {/* Pipeline Stage Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Pending', count: pipeline.counts.Pending, color: '#eab308', icon: Clock, bg: 'bg-yellow-500/10' },
                  { label: 'Approved', count: pipeline.counts.Approved, color: '#3b82f6', icon: CheckCircle, bg: 'bg-blue-500/10' },
                  { label: 'Dispatched', count: pipeline.counts.Dispatched, color: '#a855f7', icon: Truck, bg: 'bg-purple-500/10' },
                  { label: 'Completed', count: pipeline.counts.Completed, color: '#22c55e', icon: CheckCircle, bg: 'bg-emerald-500/10' },
                  { label: 'Returned', count: pipeline.counts.Returned, color: '#f97316', icon: AlertTriangle, bg: 'bg-orange-500/10' },
                  { label: 'Cancelled', count: pipeline.counts.Cancelled, color: '#ef4444', icon: XCircle, bg: 'bg-rose-500/10' },
                ].map((item, i) => (
                  <motion.div 
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col p-3.5 rounded-xl border border-border/70 bg-card hover:bg-secondary/20 transition-all text-center relative"
                  >
                    <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2" style={{ backgroundColor: `${item.color}18` }}>
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <span className="text-xl md:text-2xl font-bold text-foreground">{item.count}</span>
                    <span className="text-xs font-semibold text-muted-foreground mt-0.5">{item.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Progress Multi-Bar */}
              {fyOrders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted p-0.5 gap-0.5">
                    {[
                      { label: 'Pending', count: pipeline.counts.Pending, color: '#eab308' },
                      { label: 'Approved', count: pipeline.counts.Approved, color: '#3b82f6' },
                      { label: 'Dispatched', count: pipeline.counts.Dispatched, color: '#a855f7' },
                      { label: 'Completed', count: pipeline.counts.Completed, color: '#22c55e' },
                      { label: 'Returned', count: pipeline.counts.Returned, color: '#f97316' },
                      { label: 'Cancelled', count: pipeline.counts.Cancelled, color: '#ef4444' },
                    ].map(item => item.count > 0 && (
                      <div 
                        key={item.label}
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(item.count / fyOrders.length) * 100}%`, backgroundColor: item.color }}
                        title={`${item.label}: ${item.count} orders (${Math.round((item.count / fyOrders.length) * 100)}%)`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Order distribution ratio</span>
                    <span>{pipeline.counts.Completed} of {fyOrders.length} orders delivered</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Enterprise Sales Scorecards Banner ─────────────────────── */}
          <Card className="border border-amber-500/30 shadow-xs bg-gradient-to-r from-amber-500/10 via-card to-card rounded-2xl overflow-hidden">
            <CardContent className="p-5 md:p-6 flex flex-col lg:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                  <Trophy className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-bold text-foreground">Sales Officers Performance Scorecard &amp; Leaderboard</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                      100-Pt Enterprise KPI
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Evaluate all field officers across Order Bags (30%), Visits (25%), Collections (20%), New Dealers (15%) &amp; Discipline (10%).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap shrink-0">
                <Button
                  variant="outline"
                  onClick={() => navigate('/sales/targets')}
                  className="w-full sm:w-auto h-9 text-xs font-semibold gap-1.5 bg-background hover:bg-muted"
                >
                  <Target className="w-4 h-4 text-primary" />
                  <span>Targets &amp; SIP</span>
                </Button>
                <Button
                  onClick={() => navigate('/sales/travel?tab=SCORECARD')}
                  className="w-full sm:w-auto h-9 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                >
                  <span>View Full Scorecards</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── 2-Column: Performance Chart & Quick Hub ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sales Performance Chart (7 cols) */}
            <Card className="lg:col-span-7 border-border/80 shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base md:text-lg">Sales Officers Revenue Velocity</CardTitle>
                    <CardDescription className="text-xs">Revenue booked per sales officer this financial year</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-normal">
                    {soData.length} Officers Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {soData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                    No active sales officers or order data recorded for this FY
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={soData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${Math.round(val / 1000)}k`} />
                          <Tooltip 
                            formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Revenue']}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                          />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Summary row */}
                    {soData[0] && (
                      <div className="p-3 bg-secondary/30 rounded-xl border border-border/60 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Top Field Performer:</span>
                        <span className="font-bold text-foreground">
                          {soData[0].name} ({soData[0].orders} orders &middot; ₹{soData[0].revenue.toLocaleString()})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Command Hub (5 cols) */}
            <Card className="lg:col-span-5 border-border/80 shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base md:text-lg">Quick Command Center</CardTitle>
                <CardDescription className="text-xs">Direct access to core administrative management modules</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-5 space-y-2.5">
                {quickLinks.map(link => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-card hover:bg-secondary/50 border border-border/60 hover:border-primary/40 transition-all text-left group shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <link.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs md:text-sm text-foreground">{link.label}</p>
                        <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: APPROVALS QUEUE (SPACIOUS & DETAILED!)
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="approvals" className="space-y-6 focus:outline-none">
          {/* Queue Filter Bar */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Sales Order Approval &amp; Allocation Queue</span>
                  <Badge className="bg-amber-500 text-white font-bold">{pendingOrders.length}</Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Review commercial orders, verify warehouse inventory allocation, and check expected delivery timelines.
                </p>
              </div>

              {/* Status pill counts */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium">
                  {unallocatedCount} Needs Warehouse
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-800 dark:text-blue-300 font-medium">
                  {pendingOrders.length - unallocatedCount} Allocated
                </span>
                {urgentCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-800 dark:text-rose-300 font-medium">
                    🔥 {urgentCount} Urgent Delivery
                  </span>
                )}
              </div>
            </div>

            {/* Search and Filter Toggles */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border/50">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={approvalSearch}
                  onChange={(e) => setApprovalSearch(e.target.value)}
                  placeholder="Search by Order ID, Party Name, or Sales Officer..."
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  size="sm"
                  variant={approvalFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setApprovalFilter('ALL')}
                  className="h-8 text-xs font-semibold rounded-xl"
                >
                  All ({pendingOrders.length})
                </Button>
                <Button
                  size="sm"
                  variant={approvalFilter === 'UNALLOCATED' ? 'default' : 'outline'}
                  onClick={() => setApprovalFilter('UNALLOCATED')}
                  className="h-8 text-xs font-semibold rounded-xl text-amber-700 dark:text-amber-400"
                >
                  Warehouse Needed ({unallocatedCount})
                </Button>
                <Button
                  size="sm"
                  variant={approvalFilter === 'URGENT' ? 'default' : 'outline'}
                  onClick={() => setApprovalFilter('URGENT')}
                  className="h-8 text-xs font-semibold rounded-xl text-rose-700 dark:text-rose-400"
                >
                  Urgent ({urgentCount})
                </Button>
                <Button
                  size="sm"
                  variant={approvalFilter === 'READY' ? 'default' : 'outline'}
                  onClick={() => setApprovalFilter('READY')}
                  className="h-8 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-400"
                >
                  Ready ({pendingOrders.length - unallocatedCount})
                </Button>
              </div>
            </div>
          </div>

          {/* Orders List / Empty State */}
          {filteredPendingOrders.length === 0 ? (
            <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-foreground">
                  {approvalSearch || approvalFilter !== 'ALL' ? 'No Matching Orders' : 'All Caught Up!'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {approvalSearch || approvalFilter !== 'ALL'
                    ? 'No pending orders match your active search or filter criteria. Try clearing your filters.'
                    : 'There are currently zero pending orders waiting for approval. New incoming orders will appear here automatically.'}
                </p>
              </div>
              {(approvalSearch || approvalFilter !== 'ALL') && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => { setApprovalSearch(''); setApprovalFilter('ALL'); }}
                  className="text-xs font-semibold h-8 rounded-xl"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPendingOrders.map((o) => {
                const orderId = o.orderId || o.order_id || o.id || 'Unknown ID';
                const partyName = o.partyName || o.party_name || 'Party';
                const soEmail = o.soEmail || o.so_email || '';
                const grandTotal = o.grandTotal ?? o.grand_total ?? 0;
                const assignedWarehouse = (o as any).assignedWarehouse || o.warehouseId || o.warehouseid;
                const deliveryDate = o.expectedDeliveryDate || (o as any).expected_delivery_date;
                const urgency = getDeliveryUrgency(deliveryDate);
                const orderDate = new Date(o.createdAt || o.date || new Date()).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                const dealer = dealers.find(d => d.dealerName === partyName || d.dealer_name === partyName);
                const soUser = users.find(u => u.email === soEmail);

                return (
                  <div 
                    key={orderId}
                    className={`bg-card border transition-all rounded-2xl p-5 shadow-sm space-y-4 ${
                      !assignedWarehouse 
                        ? 'border-amber-500/40 hover:border-amber-500 bg-amber-500/2' 
                        : 'border-border/80 hover:border-primary/40'
                    }`}
                  >
                    {/* Top Row: ID, Badges, Urgency, Total */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-foreground text-sm tracking-tight">{orderId}</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
                          Pending Approval
                        </span>

                        {/* Expected Delivery Urgency Pill */}
                        {urgency ? (
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${urgency.color}`}>
                            <Calendar className="w-3 h-3" />
                            <span>{urgency.label}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full text-muted-foreground bg-muted border border-border">
                            Standard Dispatch
                          </span>
                        )}

                        <span className="text-xs text-muted-foreground">Placed on {orderDate}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total:</span>
                        <span className="text-lg font-extrabold text-primary">₹{grandTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Middle: Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Party Info (5 cols) */}
                      <div className="md:col-span-5 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Party &amp; Destination</p>
                        <h4 className="text-sm font-bold text-foreground">{partyName}</h4>
                        {dealer ? (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>{dealer.city}{dealer.state ? `, ${dealer.state}` : ''}</p>
                            {dealer.phone && <p className="text-[11px]">Contact: {dealer.phone}</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Direct / Counter Customer</p>
                        )}
                      </div>

                      {/* Items Preview (4 cols) */}
                      <div className="md:col-span-4 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Order Items ({o.items?.length || 0})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(o.items || []).slice(0, 3).map((it: any, idx: number) => {
                            const pName = it.productName || (typeof it.product === 'object' && it.product ? (it.product as any).name || (it.product as any).productName : it.product);
                            return (
                              <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-foreground font-medium border border-border truncate max-w-[200px]">
                                {pName} &times;{it.qty}
                              </span>
                            );
                          })}
                          {(o.items?.length || 0) > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                              +{(o.items?.length || 0) - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Allocations: SO & Warehouse (3 cols) */}
                      <div className="md:col-span-3 space-y-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                            Sales Officer
                          </label>
                          <Select value={soEmail || ''} onValueChange={(val) => handleReassignSO(orderId, val)}>
                            <SelectTrigger className="h-8 text-xs bg-background border border-border rounded-xl">
                              <SelectValue placeholder="Assign SO" />
                            </SelectTrigger>
                            <SelectContent>
                              {salesOfficers.map(so => (
                                <SelectItem key={so.id} value={so.email} className="text-xs">
                                  {so.name || so.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                            Warehouse Allocation {!assignedWarehouse && <span className="text-rose-500">*</span>}
                          </label>
                          <Select
                            value={String(assignedWarehouse || '')}
                            onValueChange={(val) => handleAssignWarehouse(orderId, val)}
                          >
                            <SelectTrigger className={`h-8 text-xs bg-background rounded-xl ${
                              !assignedWarehouse ? 'border-amber-500 ring-1 ring-amber-500/20 text-amber-700 font-semibold' : 'border-border'
                            }`}>
                              <SelectValue placeholder="Select Warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map(wh => (
                                <SelectItem key={wh.id} value={String(wh.id)} className="text-xs">
                                  {wh.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Narration Note if present */}
                    {o.narration && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground flex items-start gap-2">
                        <span className="text-sm">📝</span>
                        <div>
                          <span className="font-semibold text-amber-800 dark:text-amber-300">Delivery Instructions / Narration:</span>{' '}
                          <span>{o.narration}</span>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setViewOrder(o)}
                          className="h-8 text-xs font-semibold rounded-xl gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>View Full Details</span>
                        </Button>

                        <PDFGenerator 
                          type="SALES_ORDER" 
                          size="sm"
                          data={{
                            orderNo: orderId,
                            date: new Date(o.createdAt || new Date()).toLocaleDateString('en-IN'),
                            expectedDeliveryDate: deliveryDate,
                            party: {
                              name: partyName,
                              address: o.address || dealer?.address || '—',
                              contact: o.contact || dealer?.phone || '—',
                              gst: o.gst || dealer?.gst || '—',
                            },
                            items: (o.items || []).map((it: any) => ({
                              product_name: it.productName || it.product_name || (typeof it.product === 'object' && it.product ? (it.product as any).name || (it.product as any).productName : it.product),
                              qty: it.qty,
                              unit: it.unit || 'Bags',
                              rate: it.price || it.rate || 0,
                              total: it.total || (it.qty * (it.price || it.rate || 0)),
                              remark: it.item_remark || it.remark
                            })),
                            totals: {
                              subtotal: grandTotal,
                              grandTotal: grandTotal
                            }
                          }}
                          filename={`Order_${orderId}.pdf`}
                          buttonLabel="Preview PDF"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setConfirmOrder({ 
                            order: o, 
                            action: 'Cancelled', 
                            action_date: new Date().toISOString().split('T')[0] 
                          })}
                          className="h-8 text-xs font-semibold rounded-xl gap-1 px-3.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </Button>

                        <Button
                          size="sm"
                          disabled={!assignedWarehouse}
                          onClick={() => {
                            if (!assignedWarehouse) {
                              toast({
                                title: 'Warehouse Allocation Required',
                                description: 'Please select a fulfillment warehouse before approving this order.',
                                variant: 'destructive',
                              });
                              return;
                            }
                            setConfirmOrder({ order: o, action: 'Approved' });
                          }}
                          className={`h-8 text-xs font-semibold rounded-xl gap-1 px-4 shadow-xs ${
                            assignedWarehouse 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve &amp; Dispatch</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: OPERATIONS & REQUESTS
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="requests" className="space-y-6 focus:outline-none">
          <div className="bg-card border border-border/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-2">
            <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span>Operations, KYC &amp; Financial Requests</span>
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Action pending retail dealer onboarding applications, party collection receipts, and Busy accounting ledger imports.
            </p>
          </div>

          <div className="space-y-6">
            {/* Onboarding & Payments Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <OnboardingRequestsPanel />
              </div>
              <div className="space-y-4">
                <PaymentRequestsPanel />
              </div>
            </div>

            {/* Ledger Requests Section */}
            <div>
              <LedgerRequestsPanel />
            </div>

            {/* Direct Quick Shortcuts to Full Pages */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <button
                onClick={() => navigate('/admin/onboarding')}
                className="p-4 rounded-xl bg-card border border-border/80 hover:border-orange-400/50 transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-xs md:text-sm text-foreground">Dealer KYC Onboarding</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Manage full retail applications &amp; documents</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-500" />
              </button>

              <button
                onClick={() => navigate('/admin/payments')}
                className="p-4 rounded-xl bg-card border border-border/80 hover:border-emerald-400/50 transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-xs md:text-sm text-foreground">Payment Approvals</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Verify bank transfers &amp; collection slips</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500" />
              </button>

              <button
                onClick={() => navigate('/admin/ledger-requests')}
                className="p-4 rounded-xl bg-card border border-border/80 hover:border-blue-400/50 transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-xs md:text-sm text-foreground">Busy Ledger Imports</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Upload statement Excel/CSVs for parties</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500" />
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: BROADCAST & FIELD COMMS
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="broadcast" className="space-y-6 focus:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Broadcast Composer (8 cols) */}
            <Card className="lg:col-span-8 border-border/80 shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  <span>Broadcast Announcements</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Publish high-priority administrative bulletins to staff mobile devices and web workspaces.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Target Audience Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Target Audience
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'ALL', label: 'All Staff', desc: 'Company-wide' },
                      { id: 'SALES', label: 'Sales Officers', desc: 'Field teams' },
                      { id: 'INVENTORY', label: 'Inventory', desc: 'Warehouse staff' },
                      { id: 'HR', label: 'HR Managers', desc: 'Personnel' },
                    ].map(aud => (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setTargetRole(aud.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          targetRole === aud.id 
                            ? 'border-primary bg-primary/10 text-primary font-bold' 
                            : 'border-border/70 bg-card hover:bg-secondary/40 text-muted-foreground'
                        }`}
                      >
                        <p className="text-xs font-semibold text-foreground">{aud.label}</p>
                        <p className="text-[10px] text-muted-foreground">{aud.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Announcement Message
                    </label>
                    <span className="text-[11px] text-muted-foreground">{broadcastText.length} characters</span>
                  </div>
                  <textarea
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Type your company bulletin or operational notice here..."
                    className="w-full text-xs md:text-sm border border-border rounded-xl p-3.5 bg-background min-h-[140px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Quick Templates */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Quick Suggestions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Quarterly Sales Target closes this Friday at 6:00 PM.',
                      'Important: Warehouse stock audit in progress. Dispatch delays possible.',
                      'New Product Catalog with updated seasonal rates is now active.',
                    ].map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBroadcastText(tmpl)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/50 text-left"
                      >
                        &ldquo;{tmpl.slice(0, 42)}...&rdquo;
                      </button>
                    ))}
                  </div>
                </div>

                {/* Send Button */}
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSendBroadcast}
                    disabled={!broadcastText.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Announcement</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Broadcast Best Practices (4 cols) */}
            <Card className="lg:col-span-4 border-border/80 shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base md:text-lg">Broadcast Guidelines</CardTitle>
                <CardDescription className="text-xs">Best practices for field communication</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs text-muted-foreground">
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                  <p className="font-bold text-foreground">💡 High-Priority Alerts Only</p>
                  <p className="text-[11px] leading-relaxed">
                    Broadcasts appear in real-time across active user viewports. Reserve for essential price changes, dispatch schedules, and target deadlines.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                  <p className="font-bold text-foreground">🎯 Role Targeting</p>
                  <p className="text-[11px] leading-relaxed">
                    Select specific roles (e.g. Sales Officers) to avoid notification fatigue for administrative and warehouse teams.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                  <p className="font-bold text-foreground">📅 Delivery Urgency</p>
                  <p className="text-[11px] leading-relaxed">
                    When communicating dispatch cutoffs, reference the Expected Delivery Date recorded on pending sales orders.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── APPROVE / REJECT CONFIRM DIALOG ───────────────────────── */}
      <Dialog open={!!confirmOrder} onOpenChange={() => setConfirmOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-5 md:p-6 rounded-2xl" aria-describedby="order-approval-desc">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
              {confirmOrder?.action === 'Approved' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Authorize Sales Order &middot; {confirmOrder?.order.orderId || confirmOrder?.order.id}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span>Reject Sales Order &middot; {confirmOrder?.order.orderId || confirmOrder?.order.id}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription id="order-approval-desc" className="text-xs text-muted-foreground">
              Review complete customer details, delivery schedule, items breakdown, and depot allocation before confirming your decision.
            </DialogDescription>
          </DialogHeader>

          {confirmOrder && (() => {
            const orderId = confirmOrder.order.orderId || confirmOrder.order.order_id || confirmOrder.order.id || '';
            const partyName = confirmOrder.order.partyName || confirmOrder.order.party_name || 'Party';
            const soEmail = confirmOrder.order.soEmail || confirmOrder.order.so_email || '';
            const grandTotal = confirmOrder.order.grandTotal ?? confirmOrder.order.grand_total ?? 0;
            const deliveryDate = confirmOrder.order.expectedDeliveryDate || (confirmOrder.order as any).expected_delivery_date;
            const urgency = getDeliveryUrgency(deliveryDate);
            
            const wh = warehouses.find(w => String(w.id) === String((confirmOrder.order as any).assignedWarehouse || confirmOrder.order.warehouseId));
            const soUser = users.find(u => u.email === soEmail);
            const dealer = dealers.find(d => d.dealerName === partyName || d.dealer_name === partyName);
            const orderDate = new Date(confirmOrder.order.createdAt || confirmOrder.order.date || new Date()).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const totalBags = (confirmOrder.order.items || []).reduce((s, it) => s + (it.qty || 0), 0);
            
            return (
              <div className="text-xs space-y-4 mt-2">
                {/* 1. Header Information Ribbon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-secondary/30 p-3.5 rounded-xl border border-border/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Order ID</span>
                    <span className="font-extrabold text-foreground text-sm">{orderId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Booking Date</span>
                    <span className="font-semibold text-foreground">{orderDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Fulfillment Depot</span>
                    {wh ? (
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <Warehouse className="w-3.5 h-3.5 text-primary" /> {wh.name}
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Not Allocated
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Grand Total</span>
                    <span className="font-extrabold text-primary text-base">₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. Expected Delivery Target Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${urgency?.color || 'bg-secondary/40 border-border/70'}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-semibold text-foreground">Expected Delivery Target: </span>
                      {deliveryDate ? (
                        <span className="font-bold text-foreground">
                          {new Date(deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="font-medium text-muted-foreground">Standard Dispatch (Not Specified)</span>
                      )}
                    </div>
                  </div>
                  {urgency ? (
                    <span className="font-extrabold px-2.5 py-0.5 rounded-full text-[10px] bg-background/80 shadow-2xs border">
                      {urgency.badge}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                      Standard
                    </span>
                  )}
                </div>

                {/* 3. Customer & Field Officer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Customer / Party Details */}
                  <div className="border border-border/80 rounded-xl p-3.5 bg-card space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-primary" /> Customer &amp; Destination Details
                    </p>
                    <p className="font-bold text-sm text-foreground">{partyName}</p>
                    <div className="text-[11px] text-muted-foreground space-y-0.5 leading-relaxed">
                      <p><span className="font-medium text-foreground/80">Address:</span> {dealer?.address || confirmOrder.order.address || 'Direct Delivery'}</p>
                      {(dealer?.city || dealer?.state) && (
                        <p><span className="font-medium text-foreground/80">Location:</span> {dealer?.city}{dealer?.state ? `, ${dealer.state}` : ''}</p>
                      )}
                      <p><span className="font-medium text-foreground/80">Contact Phone:</span> {dealer?.phone || confirmOrder.order.contact || '—'}</p>
                      <p><span className="font-medium text-foreground/80">GSTIN:</span> {dealer?.gst || confirmOrder.order.gst || 'Unregistered'}</p>
                    </div>
                  </div>

                  {/* Sales Officer & Commercial Origin */}
                  <div className="border border-border/80 rounded-xl p-3.5 bg-card space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500" /> Sales Officer &amp; Territory
                    </p>
                    <p className="font-bold text-sm text-foreground">{soUser?.name || soEmail || 'Direct Order'}</p>
                    <div className="text-[11px] text-muted-foreground space-y-0.5 leading-relaxed">
                      <p><span className="font-medium text-foreground/80">Official Email:</span> {soEmail || '—'}</p>
                      <p><span className="font-medium text-foreground/80">Contact Number:</span> {(soUser as any)?.phone || '—'}</p>
                      <p><span className="font-medium text-foreground/80">Assigned Territory:</span> {soUser?.territory || 'General Field'}</p>
                      <p><span className="font-medium text-foreground/80">Items Count:</span> {confirmOrder.order.items?.length || 0} line items &middot; {totalBags} total bags</p>
                    </div>
                  </div>
                </div>
                
                {/* 4. Instructions / Narration */}
                {confirmOrder.order.narration && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs flex items-start gap-2">
                    <span className="text-sm">📝</span>
                    <div>
                      <span className="font-bold text-amber-800 dark:text-amber-300">Special Instructions / Narration:</span>{' '}
                      <span className="text-foreground">{confirmOrder.order.narration}</span>
                    </div>
                  </div>
                )}

                {/* 5. Complete Line Items Specification */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      Order Items Breakdown ({confirmOrder.order.items?.length || 0})
                    </p>
                    <span className="text-[11px] font-bold text-foreground">
                      Total Volume: {totalBags} Bags
                    </span>
                  </div>
                  <div className="border border-border/80 rounded-xl overflow-x-auto w-full max-h-[220px]">
                    <table className="min-w-full divide-y divide-border text-xs">
                      <thead className="bg-secondary/40 text-muted-foreground font-semibold text-[10px]">
                        <tr>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-center">Qty (Bags)</th>
                          <th className="px-3 py-2 text-right">Rate / Unit</th>
                          <th className="px-3 py-2 text-right">Row Total</th>
                          <th className="px-3 py-2 text-left">Line Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card text-[11px]">
                        {confirmOrder.order.items.map((it, idx) => {
                          const pName = it.productName || (typeof it.product === 'object' && it.product ? (it.product as any).name || (it.product as any).productName : it.product);
                          const remark = it.itemRemark || (it as any).item_remark || (it as any).remark;
                          return (
                            <tr key={idx} className="hover:bg-accent/5 transition-colors">
                              <td className="px-3 py-2 font-semibold text-foreground">
                                {pName}
                              </td>
                              <td className="px-3 py-2 text-center font-bold">{it.qty}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">₹{(it.price || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-bold text-foreground">₹{((it.qty || 0) * (it.price || 0)).toLocaleString()}</td>
                              <td className="px-3 py-2 text-muted-foreground text-[10px]">{remark || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-secondary/30 font-bold border-t border-border text-xs">
                        <tr>
                          <td className="px-3 py-2">Total Net Payable</td>
                          <td className="px-3 py-2 text-center text-primary">{totalBags} Bags</td>
                          <td className="px-3 py-2 text-right">—</td>
                          <td className="px-3 py-2 text-right text-primary text-sm font-extrabold">₹{grandTotal.toLocaleString()}</td>
                          <td className="px-3 py-2">—</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 6. Rejection inputs if cancelling */}
                {confirmOrder.action === 'Cancelled' && (
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div>
                      <label className="text-xs font-semibold block mb-1">
                        Rejection Date <span className="text-rose-500">*</span>
                      </label>
                      <SmartDatePicker
                        value={confirmOrder.action_date || ''}
                        onChange={val => setConfirmOrder({...confirmOrder, action_date: val})}
                        className="w-full"
                        inputClassName="text-xs rounded-xl px-3 py-2 bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">
                        Rejection Reason <span className="text-rose-500">*</span>
                      </label>
                      <textarea 
                        value={confirmOrder.reason || ''} 
                        onChange={e => setConfirmOrder({...confirmOrder, reason: e.target.value})} 
                        placeholder="State reason for rejecting this order (visible to sales officer)..." 
                        className="w-full text-xs border border-border rounded-xl px-3 py-2 bg-background min-h-[70px] outline-none" 
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2 mt-4 pt-3 border-t border-border flex-row items-center justify-between">
            {confirmOrder && (
              <PDFGenerator 
                type="SALES_ORDER" 
                size="sm"
                data={{
                  orderNo: confirmOrder.order.orderId || confirmOrder.order.order_id || confirmOrder.order.id || '',
                  date: new Date(confirmOrder.order.createdAt || new Date()).toLocaleDateString('en-IN'),
                  expectedDeliveryDate: confirmOrder.order.expectedDeliveryDate || (confirmOrder.order as any).expected_delivery_date,
                  party: {
                    name: confirmOrder.order.partyName || confirmOrder.order.party_name || 'Party',
                    address: confirmOrder.order.address || dealers.find(d => d.dealerName === confirmOrder.order.partyName)?.address || '—',
                    contact: confirmOrder.order.contact || dealers.find(d => d.dealerName === confirmOrder.order.partyName)?.phone || '—',
                    gst: confirmOrder.order.gst || dealers.find(d => d.dealerName === confirmOrder.order.partyName)?.gst || '—',
                  },
                  items: (confirmOrder.order.items || []).map((it: any) => ({
                    product_name: it.productName || it.product_name || (typeof it.product === 'object' && it.product ? (it.product as any).name || (it.product as any).productName : it.product),
                    qty: it.qty,
                    unit: it.unit || 'Bags',
                    rate: it.price || it.rate || 0,
                    total: it.total || (it.qty * (it.price || it.rate || 0)),
                    remark: it.item_remark || it.remark
                  })),
                  totals: {
                    subtotal: confirmOrder.order.grandTotal ?? confirmOrder.order.grand_total ?? 0,
                    grandTotal: confirmOrder.order.grandTotal ?? confirmOrder.order.grand_total ?? 0
                  }
                }}
                filename={`Order_${confirmOrder.order.orderId || confirmOrder.order.id}.pdf`}
                buttonLabel="Preview PDF"
              />
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmOrder(null)} className="h-8 text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                size="sm"
                className={`h-8 px-4 text-xs font-semibold rounded-xl ${
                  confirmOrder?.action === 'Approved' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                    : 'bg-destructive hover:bg-destructive/90 text-white shadow-xs'
                }`}
                onClick={handleAction}
              >
                {confirmOrder?.action === 'Approved' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── VIEW FULL ORDER DETAILS DIALOG ───────────────────────── */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 md:p-6 rounded-2xl" aria-describedby="full-order-desc">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <span>📦 Order Details &middot; {viewOrder?.orderId || viewOrder?.id}</span>
              {viewOrder && (
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${statusStyles[viewOrder.status || 'Pending']}`}>
                  {viewOrder.status || 'Pending'}
                </span>
              )}
            </DialogTitle>
            <DialogDescription id="full-order-desc" className="text-xs text-muted-foreground">
              Complete invoice breakdown, delivery target, party details, and item fulfillment status.
            </DialogDescription>
          </DialogHeader>

          {viewOrder && (() => {
            const orderId = viewOrder.orderId || viewOrder.order_id || viewOrder.id || 'Unknown ID';
            const partyName = viewOrder.partyName || viewOrder.party_name || '—';
            const soEmail = viewOrder.soEmail || viewOrder.so_email || '—';
            const grandTotal = viewOrder.grandTotal ?? viewOrder.grand_total ?? 0;
            const date = new Date(viewOrder.createdAt || viewOrder.date || new Date()).toLocaleDateString('en-IN', { 
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
            const deliveryDate = viewOrder.expectedDeliveryDate || (viewOrder as any).expected_delivery_date;
            const urgency = getDeliveryUrgency(deliveryDate);
            
            const wh = warehouses.find(w => String(w.id) === String((viewOrder as any).assignedWarehouse || viewOrder.warehouseId));
            const soUser = users.find(u => u.email === soEmail);
            const dealer = dealers.find(d => d.dealerName === partyName || d.dealer_name === partyName);

            return (
              <div className="space-y-4 mt-2">
                {/* Header Information Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-secondary/20 p-4 rounded-xl border border-border/80 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Order ID</p>
                    <p className="font-bold text-foreground text-sm">{orderId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Order Date</p>
                    <p className="font-semibold text-foreground">{date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Fulfillment Depot</p>
                    <p className="font-semibold text-foreground">{wh ? wh.name : '— Not Allocated'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Total Amount</p>
                    <p className="font-extrabold text-primary text-base">₹{grandTotal.toLocaleString()}</p>
                  </div>
                </div>

                {/* Delivery Target Card */}
                {deliveryDate && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${urgency?.color || 'bg-muted'}`}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-semibold">Expected Delivery Target:</span>
                      <span className="font-bold">{new Date(deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    {urgency && (
                      <span className="font-extrabold px-2 py-0.5 rounded-full text-[10px] bg-background/80 shadow-2xs">
                        {urgency.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* People Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-border/80 rounded-xl p-3.5 text-xs bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1 mb-1.5">
                      <Store className="w-3.5 h-3.5 text-primary" /> Party Details
                    </p>
                    <p className="font-bold text-sm text-foreground">{partyName}</p>
                    {dealer && (
                      <div className="mt-1 text-muted-foreground space-y-0.5 text-[11px]">
                        <p>{dealer.address}</p>
                        <p>{dealer.city}{dealer.state ? `, ${dealer.state}` : ''}</p>
                        <p>Phone: {dealer.phone}</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-border/80 rounded-xl p-3.5 text-xs bg-card">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1 mb-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" /> Sales Officer
                    </p>
                    <p className="font-bold text-sm text-foreground">{soUser?.name || soEmail}</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] truncate">{soEmail}</p>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1.5">
                    Order Items ({viewOrder.items.length})
                  </p>
                  <div className="border border-border/80 rounded-xl overflow-x-auto w-full">
                    <table className="min-w-full divide-y divide-border text-xs">
                      <thead className="bg-secondary/40 text-muted-foreground font-semibold text-[10px]">
                        <tr>
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-center">Qty (Bags)</th>
                          <th className="px-3 py-2 text-right">Rate</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card text-[11px]">
                        {viewOrder.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-accent/5 transition-colors">
                            <td className="px-3 py-2 font-medium">
                              {it.productName || (typeof it.product === 'object' && it.product ? (it.product as any).name || (it.product as any).productName : it.product)}
                              {it.itemRemark && <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Note: {it.itemRemark}</p>}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">{it.qty}</td>
                            <td className="px-3 py-2 text-right">₹{(it.price || 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-medium">₹{((it.qty) * (it.price || 0)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {viewOrder.narration && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs">
                    <p className="text-[10px] text-amber-800 dark:text-amber-300 uppercase tracking-wider font-bold mb-0.5">
                      📝 Instructions &amp; Narration
                    </p>
                    <p className="text-foreground">{viewOrder.narration}</p>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2 mt-2 pt-3 border-t border-border flex-row justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewOrder(null)} className="h-8 text-xs rounded-xl">
              Close
            </Button>
            {viewOrder?.status === 'Pending' && (
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => {
                    setConfirmOrder({ order: viewOrder, action: 'Cancelled', action_date: new Date().toISOString().split('T')[0] });
                    setViewOrder(null);
                  }}
                  className="h-8 text-xs font-semibold rounded-xl"
                >
                  Reject
                </Button>
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold rounded-xl" 
                  onClick={() => {
                    setConfirmOrder({ order: viewOrder, action: 'Approved' });
                    setViewOrder(null);
                  }}
                >
                  Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
