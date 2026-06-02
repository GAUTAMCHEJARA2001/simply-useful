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
  Users, TrendingUp, ArrowUpRight, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MyTerritory: React.FC = () => {
  const { user } = useAuth();
  const { dealers, distributors, orders } = useData();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'dealers' | 'distributors'>('dealers');

  // Filter to only this SO's parties
  const myDealers = useMemo(
    () => dealers.filter(
      d => (d.assignedSoEmail || '').toLowerCase() === (user?.email || '').toLowerCase()
    ),
    [dealers, user]
  );

  const myDistributors = useMemo(
    () => distributors.filter(
      d => (d.assignedSoEmail || '').toLowerCase() === (user?.email || '').toLowerCase()
    ),
    [distributors, user]
  );

  // Order count per dealer (by partyName match)
  const orderCountByParty = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(o => {
      const party = (o.partyName || '').toLowerCase();
      if (party) map.set(party, (map.get(party) || 0) + 1);
    });
    return map;
  }, [orders]);

  // Search filter
  const filteredDealers = useMemo(() => {
    if (!search) return myDealers;
    const q = search.toLowerCase();
    return myDealers.filter(
      d =>
        d.dealerName.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        (d.territory || '').toLowerCase().includes(q) ||
        d.dealerCode.toLowerCase().includes(q) ||
        (d.distributorName || '').toLowerCase().includes(q)
    );
  }, [myDealers, search]);

  const filteredDistributors = useMemo(() => {
    if (!search) return myDistributors;
    const q = search.toLowerCase();
    return myDistributors.filter(
      d =>
        d.distributorName.toLowerCase().includes(q) ||
        (d.area || '').toLowerCase().includes(q) ||
        (d.territory || '').toLowerCase().includes(q)
    );
  }, [myDistributors, search]);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <MapPin className="w-8 h-8 text-primary" /> My Territory
          </h1>
          <p className="page-subheader">
            All dealers and distributors assigned to you, {user?.name || 'Sales Officer'}
          </p>
        </div>
        <Button
          onClick={() => navigate('/sales/order')}
          className="action-button"
        >
          <Package className="w-4 h-4 mr-2" /> New Order
        </Button>
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

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 border border-border/50">
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
                      {['Code', 'Dealer Name', 'City', 'Territory', 'Distributor', 'Credit Limit', 'Orders', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
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
                            <p className="text-muted-foreground text-[10px] font-bold uppercase">Orders</p>
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
                      {['Distributor Name', 'Area / Region', 'Territory', 'Credit Limit', 'Orders', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDistributors.map((d, idx) => {
                      const orderCount = orderCountByParty.get(d.distributorName.toLowerCase()) || 0;
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
                  const orderCount = orderCountByParty.get(d.distributorName.toLowerCase()) || 0;
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
                            <p className="text-muted-foreground text-[10px] font-bold uppercase">Orders</p>
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
          {activeTab} · filtered to your account ({user?.email})
        </p>
      )}
    </div>
  );
};

export default MyTerritory;
