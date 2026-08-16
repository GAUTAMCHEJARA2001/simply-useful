import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, UserCheck, Users, Shuffle, Store, Building2, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dealer, Distributor, User } from '@/types';

type PartyType = 'dealer' | 'distributor';

interface MappingRow {
  id: string;
  name: string;
  city: string;
  type: PartyType;
  currentSoEmails: string[];
  pendingSoEmails: string[] | null; // null = no change
  territory: string;
  brand: string;
}

const SOMapping: React.FC = () => {
  const { user } = useAuth();
  const { dealers, distributors, users, updateDealer, updateDistributor } = useData();
  const { can } = usePermissions();
  const { toast } = useToast();

  if (!can('manage_customers')) {
    return <Navigate to="/" replace />;
  }

  const salesUsers = useMemo(
    () => users.filter(u => (u.role === 'SALES' || u.role === 'SALES_OFFICER') && u.active),
    [users]
  );

  const [search, setSearch] = useState('');
  const [filterSo, setFilterSo] = useState('all');      // filter table by current SO
  const [filterType, setFilterType] = useState<'all' | 'dealer' | 'distributor'>('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSo, setBulkSo] = useState('');
  const [bulkAction, setBulkAction] = useState<'add' | 'remove'>('add');
  const [saving, setSaving] = useState<Set<string>>(new Set());

  // Build unified rows
  const allRows: MappingRow[] = useMemo(() => {
    const dealerRows: MappingRow[] = dealers.map(d => ({
      id: `dlr_${d.dealerCode}`,
      name: d.dealerName,
      city: d.city || '—',
      type: 'dealer',
      currentSoEmails: d.assignedSoEmails || [],
      pendingSoEmails: null,
      territory: d.territory || '—',
      brand: d.brand || '—',
    }));
    const distRows: MappingRow[] = distributors.map(d => ({
      id: `dst_${d.distributorName}`,
      name: d.distributorName,
      city: (d as any).city || d.area || '—',
      type: 'distributor',
      currentSoEmails: d.assignedSoEmails || [],
      pendingSoEmails: null,
      territory: d.territory || '—',
      brand: d.brand || '—',
    }));
    return [...dealerRows, ...distRows];
  }, [dealers, distributors]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    allRows.forEach(r => { if (r.brand && r.brand !== '—') brands.add(r.brand); });
    return Array.from(brands).sort();
  }, [allRows]);

  const rows = allRows; // direct display, instant save

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterBrand !== 'all' && r.brand !== filterBrand) return false;
      if (filterSo !== 'all') {
        if (!r.currentSoEmails.includes(filterSo)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          (r.territory || '').toLowerCase().includes(q) ||
          (r.brand || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filterType, filterSo, filterBrand, search]);

  // SO name lookup
  const soName = (email: string) => {
    const u = salesUsers.find(s => s.email?.toLowerCase() === email?.toLowerCase());
    return u ? u.name : email ? email.split('@')[0] : 'Unassigned';
  };

  // Per-row SO change (instant save)
  const handleRowChange = async (row: MappingRow, newEmails: string[]) => {
    setSaving(prev => new Set(prev).add(row.id));
    try {
      if (row.type === 'dealer') {
        const dealerCode = row.id.replace('dlr_', '');
        const dealer = dealers.find(d => d.dealerCode === dealerCode);
        if (dealer) await updateDealer(dealerCode, { ...dealer, assignedSoEmails: newEmails });
      } else {
        const distName = row.id.replace('dst_', '');
        const dist = distributors.find(d => d.distributorName === distName);
        if (dist) await updateDistributor(distName, { ...dist, assignedSoEmails: newEmails });
      }
      toast({
        title: 'Mapping Updated',
        description: `${row.name} SOs updated.`,
      });
    } catch {
      toast({ title: 'Save Failed', description: 'Could not update mapping.', variant: 'destructive' });
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(row.id); return s; });
    }
  };

  // Toggle single SO for a row
  const toggleSoForRow = async (row: MappingRow, email: string, checked: boolean) => {
    const current = new Set(row.currentSoEmails);
    if (checked) {
      current.add(email);
    } else {
      current.delete(email);
    }
    await handleRowChange(row, Array.from(current));
  };

  // Bulk reassign
  const handleBulkApply = async () => {
    if (!bulkSo || selected.size === 0) {
      toast({ title: 'Select rows and an SO first', variant: 'destructive' });
      return;
    }
    const targets = filteredRows.filter(r => selected.has(r.id));
    for (const row of targets) {
      const current = new Set(row.currentSoEmails);
      if (bulkAction === 'add') {
        current.add(bulkSo);
      } else {
        current.delete(bulkSo);
      }
      await handleRowChange(row, Array.from(current));
    }
    setSelected(new Set());
    setBulkSo('');
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleSelectAll = () => {
    if (selected.size === filteredRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map(r => r.id)));
    }
  };

  // SO summary counts
  const soSummary = useMemo(() => {
    const map = new Map<string, { dealers: number; distributors: number }>();
    salesUsers.forEach(u => map.set(u.email, { dealers: 0, distributors: 0 }));
    map.set('unassigned', { dealers: 0, distributors: 0 });
    
    allRows.forEach(r => {
      if (r.currentSoEmails.length === 0) {
        const entry = map.get('unassigned')!;
        if (r.type === 'dealer') entry.dealers++;
        else entry.distributors++;
      } else {
        r.currentSoEmails.forEach(email => {
          if (!map.has(email)) map.set(email, { dealers: 0, distributors: 0 });
          const entry = map.get(email)!;
          if (r.type === 'dealer') entry.dealers++;
          else entry.distributors++;
        });
      }
    });
    return map;
  }, [allRows, salesUsers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-primary" /> SO Territory Mapping
          </h1>
          <p className="page-subheader">
            Assign multiple Sales Officers to dealers & distributors. Changes save instantly.
          </p>
        </div>
      </div>

      {/* SO Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {salesUsers.map(so => {
          const counts = soSummary.get(so.email) || { dealers: 0, distributors: 0 };
          const isSelected = filterSo === so.email;
          return (
            <button
              key={so.email}
              onClick={() => setFilterSo(isSelected ? 'all' : so.email)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all hover:shadow-md',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-primary">
                    {so.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground truncate">{so.name}</span>
              </div>
              <div className="flex gap-2 text-[10px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <Store className="w-3 h-3" /> {counts.dealers} dealers
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {counts.distributors} dist.
                </span>
              </div>
            </button>
          );
        })}
        <button
          onClick={() => setFilterSo('all')}
          className={cn(
            'rounded-xl border p-3 text-left transition-all hover:shadow-md',
            filterSo === 'all'
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border bg-card hover:border-primary/40'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">All SOs</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">
            {allRows.length} total parties
          </div>
        </button>
      </div>

      {/* Toolbar */}
      <Card className="p-4 bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, territory, or brand..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Party type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="all">All Parties</option>
            <option value="dealer">Dealers Only</option>
            <option value="distributor">Distributors Only</option>
          </select>

          {/* Brand Filter */}
          <select
            value={filterBrand}
            onChange={e => setFilterBrand(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="all">All Brands</option>
            {uniqueBrands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Bulk reassign strip */}
          <div className="flex items-center gap-2 border border-border/60 rounded-xl px-3 py-1.5 bg-muted/30">
            <Shuffle className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Bulk: {selected.size} selected ?
            </span>
            <Select value={bulkAction} onValueChange={(val: 'add' | 'remove') => setBulkAction(val)}>
              <SelectTrigger className="h-7 w-24 text-xs border-border/60 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add SO</SelectItem>
                <SelectItem value="remove">Remove SO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bulkSo} onValueChange={setBulkSo}>
              <SelectTrigger className="h-7 w-40 text-xs border-border/60 bg-transparent">
                <SelectValue placeholder="Pick SO..." />
              </SelectTrigger>
              <SelectContent>
                {salesUsers.map(so => (
                  <SelectItem key={so.email} value={so.email} className="text-xs">
                    {so.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              disabled={selected.size === 0 || !bulkSo}
              onClick={handleBulkApply}
            >
              Apply
            </Button>
          </div>
        </div>
      </Card>

      {/* Mapping Table */}
      <Card className="overflow-hidden border border-border/80 rounded-2xl shadow-sm">
        <CardHeader className="pb-0 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">
              {filteredRows.length} {filterType === 'all' ? 'parties' : filterType + 's'}
              {filterSo !== 'all' && ` for ${soName(filterSo)}`}
            </CardTitle>
            <span className="text-[10px] text-muted-foreground">Select multiple SOs per row to reassign</span>
          </div>
        </CardHeader>

        {/* Desktop table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded accent-primary"
                    checked={selected.size === filteredRows.length && filteredRows.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">City / Area</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Territory</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current SOs</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-52">Assign SOs</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No parties match your current filters.
                  </td>
                </tr>
              )}
              {filteredRows.map((row, idx) => {
                const isSaving = saving.has(row.id);
                const isChecked = selected.has(row.id);
                const effectiveSos = row.currentSoEmails;
 
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border/40 transition-colors',
                      idx % 2 === 1 && 'bg-muted/5',
                      isChecked && 'bg-primary/5',
                      'hover:bg-muted/20'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded accent-primary"
                        checked={isChecked}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.city}</td>
                    <td className="px-4 py-3 font-medium text-xs text-primary">{row.territory}</td>
                    <td className="px-4 py-3 font-medium text-xs text-amber-600">{row.brand}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        row.type === 'dealer'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-indigo-100 text-indigo-700'
                      )}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[150px] truncate" title={effectiveSos.map(soName).join(', ')}>
                      <span className="text-muted-foreground">{effectiveSos.length > 0 ? effectiveSos.map(soName).join(', ') : 'Unassigned'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs px-2 border-border/60 hover:border-primary/60" disabled={isSaving}>
                            <span>{effectiveSos.length} selected</span>
                            <Plus className="w-3.5 h-3.5 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {salesUsers.map(so => (
                              <label key={so.email} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors">
                                <Checkbox 
                                  checked={effectiveSos.includes(so.email)}
                                  onCheckedChange={(checked) => toggleSoForRow(row, so.email, checked as boolean)}
                                />
                                <span className="text-xs font-medium">{so.name}</span>
                              </label>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isSaving ? (
                        <div className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border/40">
          {filteredRows.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No parties match your current filters.
            </div>
          )}
          {filteredRows.map(row => {
            const isSaving = saving.has(row.id);
            const isChecked = selected.has(row.id);
            const effectiveSos = row.currentSoEmails;

            return (
              <div
                key={row.id}
                className={cn('p-4 transition-colors', isChecked && 'bg-primary/5')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded accent-primary"
                    checked={isChecked}
                    onChange={() => toggleSelect(row.id)}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.city} {row.territory ? `· Territory: ${row.territory}` : ''} {row.brand !== '—' ? `· Brand: ${row.brand}` : ''}</p>
                      </div>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        row.type === 'dealer' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'
                      )}>
                        {row.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Assign SOs:</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1 justify-between h-7 text-xs px-2 border-border/60" disabled={isSaving}>
                            <span>{effectiveSos.length} selected</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="end">
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {salesUsers.map(so => (
                              <label key={so.email} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors">
                                <Checkbox 
                                  checked={effectiveSos.includes(so.email)}
                                  onCheckedChange={(checked) => toggleSoForRow(row, so.email, checked as boolean)}
                                />
                                <span className="text-xs font-medium">{so.name}</span>
                              </label>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {isSaving && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default SOMapping;
