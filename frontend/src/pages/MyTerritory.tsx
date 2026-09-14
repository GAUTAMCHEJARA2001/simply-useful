import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin, Store, Building2, Search, Phone, CreditCard,
  Users, TrendingUp, ArrowUpRight, Package, Calendar, ChevronDown, Check, ArrowUpDown
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MyTerritory: React.FC = () => {
  const { user } = useAuth();
  const { dealers, distributors, orders, users } = useData();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'dealers' | 'distributors'>('dealers');
  const [selectedSo, setSelectedSo] = useState<string>('all');

  // Month Period filter - resets automatically every 1st of the month
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthName = now.toLocaleString('default', { month: 'short', year: 'numeric' });

  const [selectedPeriod, setSelectedPeriod] = useState<string>('CURRENT_MONTH');
  const [orderSort, setOrderSort] = useState<'none' | 'desc' | 'asc'>('none');

  // Discover all past months with orders
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    orders.forEach(o => {
      const dStr = o.date || (o as any).createdAt;
      if (!dStr) return;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key !== currentMonthKey && !monthMap.has(key)) {
        const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthMap.set(key, label);
      }
    });
    return Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [orders, currentMonthKey]);

  const selectedPeriodLabel = useMemo(() => {
    if (selectedPeriod === 'CURRENT_MONTH') return `This Month (${currentMonthName})`;
    if (selectedPeriod === 'ALL_TIME') return 'All Time';
    const found = availableMonths.find(([k]) => k === selectedPeriod);
    return found ? found[1] : selectedPeriod;
  }, [selectedPeriod, currentMonthName, availableMonths]);

  const selectedPeriodShort = useMemo(() => {
    if (selectedPeriod === 'CURRENT_MONTH') return currentMonthName;
    if (selectedPeriod === 'ALL_TIME') return 'All Time';
    const found = availableMonths.find(([k]) => k === selectedPeriod);
    return found ? found[1] : selectedPeriod;
  }, [selectedPeriod, currentMonthName, availableMonths]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const userEmail = (user?.email || '').toLowerCase().trim();

  // Sales Officers for admin filtering
  const salesOfficers = useMemo(() => {
    return (users || []).filter(u => {
      const role = (u.role || '').toUpperCase();
      return role.includes('SALES');
    });
  }, [users]);

  // Check if a party is assigned to the current user (or selected SO if admin)
  const isPartyAssigned = (party: any) => {
    const emails: string[] = [
      ...(Array.isArray(party.assignedSoEmails) ? party.assignedSoEmails : []),
      ...(Array.isArray(party.assignedsoemails) ? party.assignedsoemails : []),
      party.assignedSoEmail,
    ].filter(Boolean).map(e => String(e).toLowerCase().trim());

    if (isAdmin) {
      if (selectedSo === 'all') return true;
      return emails.includes(selectedSo.toLowerCase().trim());
    }

    if (!userEmail) return false;
    if (emails.includes(userEmail)) return true;

    // Optional territory-based matching
    if (user?.territory && party.territory && user.territory.trim().toLowerCase() === party.territory.trim().toLowerCase()) {
      return true;
    }

    return false;
  };

  // Filter to this SO's (or selected) parties
  const myDealers = useMemo(
    () => dealers.filter(isPartyAssigned),
    [dealers, user, isAdmin, selectedSo, userEmail]
  );

  const myDistributors = useMemo(
    () => distributors.filter(isPartyAssigned),
    [distributors, user, isAdmin, selectedSo, userEmail]
  );

  // Orders filtered by the selected period (resets every 1st of month by default)
  const scopedOrders = useMemo(() => {
    if (selectedPeriod === 'ALL_TIME') return orders;
    const targetYM = selectedPeriod === 'CURRENT_MONTH' ? currentMonthKey : selectedPeriod;
    return orders.filter(o => {
      const dStr = o.date || (o as any).createdAt;
      if (!dStr) return false;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return false;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === targetYM;
    });
  }, [orders, selectedPeriod, currentMonthKey]);

  // Order count per party in the selected period
  const orderCountByParty = useMemo(() => {
    const map = new Map<string, number>();
    scopedOrders.forEach(o => {
      const party = (o.partyName || '').toLowerCase().trim();
      if (party) map.set(party, (map.get(party) || 0) + 1);
      const dist = (o.distributor || '').toLowerCase().trim();
      if (dist && dist !== party) {
        map.set(`dist_${dist}`, (map.get(`dist_${dist}`) || 0) + 1);
      }
    });
    return map;
  }, [scopedOrders]);

  // Search and sort filter
  const filteredDealers = useMemo(() => {
    let list = myDealers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        d =>
          d.dealerName.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q) ||
          (d.territory || '').toLowerCase().includes(q) ||
          d.dealerCode.toLowerCase().includes(q) ||
          (d.distributorName || '').toLowerCase().includes(q)
      );
    }
    if (orderSort === 'desc') {
      return [...list].sort((a, b) => {
        const ca = orderCountByParty.get(a.dealerName.toLowerCase().trim()) || 0;
        const cb = orderCountByParty.get(b.dealerName.toLowerCase().trim()) || 0;
        return cb - ca;
      });
    }
    if (orderSort === 'asc') {
      return [...list].sort((a, b) => {
        const ca = orderCountByParty.get(a.dealerName.toLowerCase().trim()) || 0;
        const cb = orderCountByParty.get(b.dealerName.toLowerCase().trim()) || 0;
        return ca - cb;
      });
    }
    return list;
  }, [myDealers, search, orderSort, orderCountByParty]);

  const filteredDistributors = useMemo(() => {
    let list = myDistributors;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        d =>
          d.distributorName.toLowerCase().includes(q) ||
          (d.area || '').toLowerCase().includes(q) ||
          (d.territory || '').toLowerCase().includes(q)
      );
    }
    if (orderSort === 'desc') {
      return [...list].sort((a, b) => {
        const dName = a.distributorName.toLowerCase().trim();
        const ca = (orderCountByParty.get(dName) || 0) + (orderCountByParty.get(`dist_${dName}`) || 0);
        const dNameB = b.distributorName.toLowerCase().trim();
        const cb = (orderCountByParty.get(dNameB) || 0) + (orderCountByParty.get(`dist_${dNameB}`) || 0);
        return cb - ca;
      });
    }
    if (orderSort === 'asc') {
      return [...list].sort((a, b) => {
        const dName = a.distributorName.toLowerCase().trim();
        const ca = (orderCountByParty.get(dName) || 0) + (orderCountByParty.get(`dist_${dName}`) || 0);
        const dNameB = b.distributorName.toLowerCase().trim();
        const cb = (orderCountByParty.get(dNameB) || 0) + (orderCountByParty.get(`dist_${dNameB}`) || 0);
        return ca - cb;
      });
    }
    return list;
  }, [myDistributors, search, orderSort, orderCountByParty]);

  // KPI totals
  const activeDealers      = myDealers.filter(d => d.active).length;
  const activeDistributors = myDistributors.filter(d => d.active).length;
  const totalCreditLimit   = myDealers.reduce((s, d) => s + (d.creditLimit || 0), 0) +
                             myDistributors.reduce((s, d) => s + (d.creditLimit || 0), 0);

  const kpis = [
    {
      label: 'My Dealers',
      value: myDealers.length,
      sub: `${activeDealers} active`,
      icon: Store,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      label: 'My Distributors',
      value: myDistributors.length,
      sub: `${activeDistributors} active`,
      icon: Building2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Total Parties',
      value: myDealers.length + myDistributors.length,
      sub: 'dealers + distributors',
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Combined Credit',
      value: `₹${(totalCreditLimit / 100000).toFixed(1)}L`,
      sub: 'total credit limit',
      icon: CreditCard,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  const formatCurrency = (v: number) =>
    v >= 100000
      ? `₹${(v / 100000).toFixed(1)}L`
      : `₹${v.toLocaleString('en-IN')}`;

  const OrdersHeaderPopover = () => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-bold uppercase tracking-wider px-2 py-1 -ml-2 rounded-lg hover:bg-primary/10 transition-colors"
          title="Filter order period and sort"
        >
          <span>Orders</span>
          <span className="text-[10px] normal-case px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold">
            {selectedPeriodShort}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-[100]" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary" /> Order Period (Resets 1st of month)
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedPeriod('CURRENT_MONTH')}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors",
                  selectedPeriod === 'CURRENT_MONTH' ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
                )}
              >
                <span>This Month ({currentMonthName})</span>
                {selectedPeriod === 'CURRENT_MONTH' && <Check className="w-3.5 h-3.5" />}
              </button>
              {availableMonths.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPeriod(key)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors",
                    selectedPeriod === key ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
                  )}
                >
                  <span>{label}</span>
                  {selectedPeriod === key && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedPeriod('ALL_TIME')}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors border-t border-border pt-1.5 mt-1",
                  selectedPeriod === 'ALL_TIME' ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
                )}
              >
                <span>All Time (Full History)</span>
                {selectedPeriod === 'ALL_TIME' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-primary" /> Sort by Order Count
            </p>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setOrderSort(orderSort === 'desc' ? 'none' : 'desc')}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium border text-center transition-colors",
                  orderSort === 'desc' ? "bg-primary text-primary-foreground border-primary font-bold" : "hover:bg-muted border-border"
                )}
              >
                High ↓
              </button>
              <button
                type="button"
                onClick={() => setOrderSort(orderSort === 'asc' ? 'none' : 'asc')}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium border text-center transition-colors",
                  orderSort === 'asc' ? "bg-primary text-primary-foreground border-primary font-bold" : "hover:bg-muted border-border"
                )}
              >
                Low ↑
              </button>
              <button
                type="button"
                onClick={() => setOrderSort('none')}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium border text-center transition-colors",
                  orderSort === 'none' ? "bg-muted text-foreground font-semibold" : "hover:bg-muted border-border"
                )}
              >
                Off
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <MapPin className="w-8 h-8 text-primary" /> {isAdmin ? 'Territory Management' : 'My Territory'}
          </h1>
          <p className="page-subheader">
            {isAdmin 
              ? (selectedSo === 'all' 
                  ? 'Viewing all dealers and distributors across the organization' 
                  : `Viewing parties assigned to ${salesOfficers.find(s => s.email.toLowerCase() === selectedSo.toLowerCase())?.name || selectedSo}`)
              : `All dealers and distributors assigned to you, ${user?.name || 'Sales Officer'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Filter SO:</span>
              <select
                value={selectedSo}
                onChange={e => setSelectedSo(e.target.value)}
                className="text-xs border rounded-lg px-3 py-2 bg-background font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Sales Officers ({dealers.length} dealers)</option>
                {salesOfficers.map(so => (
                  <option key={so.id || so.email} value={so.email}>
                    {so.name || so.email} ({so.territory || 'Sales'})
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button
            onClick={() => navigate('/sales/order')}
            className="action-button"
          >
            <Package className="w-4 h-4 mr-2" /> New Order
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div className="kpi-card">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', kpi.bg)}>
                  <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/40" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{kpi.value}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                {kpi.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search + Period + Tabs */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Period Filter (resets every 1st of month) */}
        <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border/50 shadow-sm shrink-0">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Orders:</span>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="text-xs font-bold bg-transparent border-none focus:outline-none cursor-pointer pr-1 text-foreground"
            title="Filter order count period"
          >
            <option value="CURRENT_MONTH">This Month ({currentMonthName})</option>
            {availableMonths.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
            <option value="ALL_TIME">All Time</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 border border-border/50 shrink-0">
          {([
            { id: 'dealers',      label: `Dealers (${myDealers.length})`,       icon: Store },
            { id: 'distributors', label: `Distributors (${myDistributors.length})`, icon: Building2 },
          ] as const).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DEALERS TAB ─────────────────────────────────────────── */}
      {activeTab === 'dealers' && (
        <>
          {filteredDealers.length === 0 ? (
            <Card className="rounded-2xl border border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Store className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-muted-foreground">
                  {search ? 'No dealers match your search.' : 'No dealers assigned to you yet.'}
                </p>
                {!search && (
                  <p className="text-xs text-muted-foreground">
                    Contact your admin to get dealers mapped to your account.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden md:block rounded-2xl border border-border/70 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dealer Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Territory</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distributor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit Limit</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <OrdersHeaderPopover />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDealers.map((d, idx) => {
                      const orderCount = orderCountByParty.get(d.dealerName.toLowerCase()) || 0;
                      return (
                        <tr
                          key={d.dealerCode}
                          className={cn(
                            'border-b border-border/40 transition-colors hover:bg-muted/20',
                            idx % 2 === 1 && 'bg-muted/5'
                          )}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {d.dealerCode}
                          </td>
                          <td className="px-4 py-3 font-semibold">{d.dealerName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.city}</td>
                          <td className="px-4 py-3 font-medium text-xs text-primary">{d.territory || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {d.distributorName || '—'}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(d.creditLimit || 0)}
                          </td>
                          <td className="px-4 py-3">
                            {orderCount > 0 ? (
                              <span className="flex items-center gap-1 text-primary font-semibold">
                                <TrendingUp className="w-3.5 h-3.5" /> {orderCount}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={d.active ? 'default' : 'destructive'}
                              className="text-[10px]"
                            >
                              {d.active ? 'Active' : 'Blocked'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredDealers.map(d => {
                  const orderCount = orderCountByParty.get(d.dealerName.toLowerCase()) || 0;
                  return (
                    <Card key={d.dealerCode} className="rounded-2xl border border-border/60">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{d.dealerName}</p>
                            <p className="text-xs text-muted-foreground">{d.dealerCode} · {d.city} {d.territory ? `· Territory: ${d.territory}` : ''}</p>
                          </div>
                          <Badge variant={d.active ? 'default' : 'destructive'} className="text-[10px]">
                            {d.active ? 'Active' : 'Blocked'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                            <p className="text-muted-foreground text-[10px] font-bold uppercase">Credit</p>
                            <p className="font-semibold mt-0.5">{formatCurrency(d.creditLimit || 0)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                            <p className="text-muted-foreground text-[10px] font-bold uppercase">Distributor</p>
                            <p className="font-semibold mt-0.5 truncate">{d.distributorName || '—'}</p>
                          </div>
                          <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                            <p className="text-muted-foreground text-[10px] font-bold uppercase truncate" title={`Orders (${selectedPeriodShort})`}>
                              Orders ({selectedPeriodShort})
                            </p>
                            <p className="font-semibold mt-0.5 text-primary">{orderCount || '—'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── DISTRIBUTORS TAB ─────────────────────────────────────── */}
      {activeTab === 'distributors' && (
        <>
          {filteredDistributors.length === 0 ? (
            <Card className="rounded-2xl border border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Building2 className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-muted-foreground">
                  {search
                    ? 'No distributors match your search.'
                    : 'No distributors assigned to you yet.'}
                </p>
                {!search && (
                  <p className="text-xs text-muted-foreground">
                    Contact your admin to get distributors mapped to your account.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden md:block rounded-2xl border border-border/70 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distributor Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Area / Region</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Territory</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit Limit</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <OrdersHeaderPopover />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDistributors.map((d, idx) => {
                      const dName = d.distributorName.toLowerCase().trim();
                      const orderCount = (orderCountByParty.get(dName) || 0) + (orderCountByParty.get(`dist_${dName}`) || 0);
                      return (
                        <tr
                          key={d.distributorName}
                          className={cn(
                            'border-b border-border/40 transition-colors hover:bg-muted/20',
                            idx % 2 === 1 && 'bg-muted/5'
                          )}
                        >
                          <td className="px-4 py-3 font-semibold">{d.distributorName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.area || '—'}</td>
                          <td className="px-4 py-3 font-medium text-xs text-primary">{d.territory || '—'}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(d.creditLimit || 0)}
                          </td>
                          <td className="px-4 py-3">
                            {orderCount > 0 ? (
                              <span className="flex items-center gap-1 text-primary font-semibold">
                                <TrendingUp className="w-3.5 h-3.5" /> {orderCount}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={d.active ? 'default' : 'destructive'}
                              className="text-[10px]"
                            >
                              {d.active ? 'Active' : 'Blocked'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredDistributors.map(d => {
                  const dName = d.distributorName.toLowerCase().trim();
                  const orderCount = (orderCountByParty.get(dName) || 0) + (orderCountByParty.get(`dist_${dName}`) || 0);
                  return (
                    <Card key={d.distributorName} className="rounded-2xl border border-border/60">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{d.distributorName}</p>
                            <p className="text-xs text-muted-foreground">{d.area || 'No area specified'} {d.territory ? `· Territory: ${d.territory}` : ''}</p>
                          </div>
                          <Badge variant={d.active ? 'default' : 'destructive'} className="text-[10px]">
                            {d.active ? 'Active' : 'Blocked'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                            <p className="text-muted-foreground text-[10px] font-bold uppercase">Credit Limit</p>
                            <p className="font-semibold mt-0.5">{formatCurrency(d.creditLimit || 0)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-center">
                            <p className="text-muted-foreground text-[10px] font-bold uppercase truncate" title={`Orders (${selectedPeriodShort})`}>
                              Orders ({selectedPeriodShort})
                            </p>
                            <p className="font-semibold mt-0.5 text-primary">{orderCount || '—'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Summary footer */}
      {(filteredDealers.length > 0 || filteredDistributors.length > 0) && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          Showing {activeTab === 'dealers' ? filteredDealers.length : filteredDistributors.length}{' '}
          {activeTab} · Orders: {selectedPeriodLabel} · {isAdmin ? (selectedSo === 'all' ? 'All Organization Parties (Admin View)' : `Filtered to SO: ${selectedSo}`) : `Filtered to your account (${user?.email})`}
        </p>
      )}
    </div>
  );
};

export default MyTerritory;
