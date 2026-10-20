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
import { 
  Search, UserCheck, Users, Shuffle, Store, Building2, CheckCircle2, Plus,
  Download, FileSpreadsheet, FileText, Loader2, Printer, Eye, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator, 
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';
import { downloadCSV } from '@/pages/reports/utils/csv';
import { saveFileWithDialog } from '@/utils/fileDownload';
import { downloadSoMappingPdf } from '@/utils/soMappingPdfExport';
import { cn } from '@/lib/utils';
import { Dealer, Distributor, User } from '@/types';

type PartyType = 'dealer' | 'distributor';

interface MappingRow {
  id: string;
  code: string;
  name: string;
  city: string;
  type: PartyType;
  currentSoEmails: string[];
  pendingSoEmails: string[] | null; // null = no change
  territory: string;
  brand: string;
  phone: string;
  contactPerson: string;
  address: string;
  gst: string;
  creditLimit: number;
  outstanding: number;
}

const SoSelectCell = ({ row, salesUsers, effectiveSos, toggleSoForRow, isSaving }: any) => {
  const [search, setSearch] = useState("");
  const filteredSos = salesUsers.filter((so: any) => so.name?.toLowerCase().includes(search.toLowerCase()) || so.email?.toLowerCase().includes(search.toLowerCase()));
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs px-2 border-border/60 hover:border-primary/60" disabled={isSaving}>
          <span>{effectiveSos.length} selected</span>
          <Plus className="w-3.5 h-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="mb-2 px-1">
          <Input 
            placeholder="Search SO..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <label className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors border-b pb-2 mb-1">
            <Checkbox 
              checked={effectiveSos.length === 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  effectiveSos.forEach((email: string) => toggleSoForRow(row, email, false));
                }
              }}
            />
            <span className="text-xs font-medium">No Sales Officer</span>
          </label>
          {filteredSos.map((so: any) => (
            <label key={so.email} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors">
              <Checkbox 
                checked={effectiveSos.includes(so.email)}
                onCheckedChange={(checked) => toggleSoForRow(row, so.email, checked as boolean)}
              />
              <span className="text-xs font-medium">{so.name}</span>
            </label>
          ))}
          {filteredSos.length === 0 && <div className="text-xs text-muted-foreground p-2 text-center">No SO found</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const SOMapping: React.FC = () => {
  const { user } = useAuth();
  const { dealers, distributors, users, updateDealer, updateDistributor } = useData();
  const { can } = usePermissions();
  const { toast } = useToast();


  const salesUsers = useMemo(
    () => users.filter(u => {
      const r = (u.role || '').toUpperCase();
      return (r === 'SALES' || r === 'SALES_OFFICER' || r === 'SALES OFFICER' || r === 'SALES_EXECUTIVE' || r === 'SALES EXECUTIVE') && u.active;
    }),
    [users]
  );

  const [search, setSearch] = useState('');
  const [filterSo, setFilterSo] = useState('all');      // filter table by current SO
  const [filterType, setFilterType] = useState<'all' | 'dealer' | 'distributor'>('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSos, setBulkSos] = useState<string[]>([]);
  const [bulkSoSearch, setBulkSoSearch] = useState('');
  const [bulkAction, setBulkAction] = useState<'add' | 'remove'>('add');
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewOnlySelected, setPreviewOnlySelected] = useState(false);

  // Build unified rows with all details
  const allRows: MappingRow[] = useMemo(() => {
    const dealerRows: MappingRow[] = dealers.map(d => ({
      id: `dlr_${d.dealerCode}`,
      code: d.dealerCode || (d as any).dealer_code || '—',
      name: d.dealerName || (d as any).dealer_name || 'Unnamed Dealer',
      city: d.city || '—',
      type: 'dealer' as PartyType,
      currentSoEmails: d.assignedSoEmails || [],
      pendingSoEmails: null,
      territory: d.territory || '—',
      brand: d.brand || '—',
      phone: d.phone || (d as any).mobile || (d as any).contact_number || '—',
      contactPerson: d.contactPerson || (d as any).contact_person || '—',
      address: d.address || '—',
      gst: d.gst || (d as any).gst_number || (d as any).gstin || '—',
      creditLimit: d.creditLimit ?? (d as any).credit_limit ?? 0,
      outstanding: d.outstanding ?? 0,
    }));

    const distRows: MappingRow[] = distributors.map(d => ({
      id: `dst_${d.distributorName}`,
      code: d.distributorCode || (d as any).distributor_code || '—',
      name: d.distributorName || (d as any).distributor_name || 'Unnamed Distributor',
      city: (d as any).city || d.area || '—',
      type: 'distributor' as PartyType,
      currentSoEmails: d.assignedSoEmails || [],
      pendingSoEmails: null,
      territory: d.territory || '—',
      brand: d.brand || '—',
      phone: d.phone || (d as any).mobile || (d as any).contact_number || '—',
      contactPerson: d.contactPerson || (d as any).contact_person || '—',
      address: d.address || '—',
      gst: d.gst || (d as any).gst_number || (d as any).gstin || '—',
      creditLimit: d.creditLimit ?? (d as any).credit_limit ?? 0,
      outstanding: d.outstanding ?? 0,
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
          r.code.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          (r.territory || '').toLowerCase().includes(q) ||
          (r.brand || '').toLowerCase().includes(q) ||
          (r.phone || '').toLowerCase().includes(q) ||
          (r.contactPerson || '').toLowerCase().includes(q) ||
          (r.gst || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filterType, filterSo, filterBrand, search]);

  const previewTargetRows = useMemo(() => {
    return previewOnlySelected && selected.size > 0
      ? filteredRows.filter(r => selected.has(r.id))
      : filteredRows;
  }, [filteredRows, selected, previewOnlySelected]);

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
    if (bulkSos.length === 0 || selected.size === 0) {
      toast({ title: 'Select rows and at least one SO first', variant: 'destructive' });
      return;
    }
    const targets = filteredRows.filter(r => selected.has(r.id));
    for (const row of targets) {
      const current = new Set(row.currentSoEmails);
      for (const so of bulkSos) {
        if (bulkAction === 'add') {
          if (so === 'none') current.clear();
          else current.add(so);
        } else {
          if (so === 'none') current.clear();
          else current.delete(so);
        }
      }
      await handleRowChange(row, Array.from(current));
    }
    setSelected(new Set());
    setBulkSos([]);
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });

  const toggleSelectAll = () => {
    if (selected.size === filteredRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map(r => r.id)));
    }
  };

  // Export to Excel (.csv format with UTF-8 BOM)
  const handleExportExcel = (onlySelected = false) => {
    const targetRows = onlySelected && selected.size > 0
      ? filteredRows.filter(r => selected.has(r.id))
      : filteredRows;

    if (targetRows.length === 0) {
      toast({ title: 'No records to export', description: 'Please filter or select parties to export.', variant: 'destructive' });
      return;
    }

    const headers = [
      'S.No.',
      'Party Code',
      'Party Name',
      'Party Type',
      'Contact Person',
      'Phone / Mobile',
      'City / Area',
      'Territory',
      'Brand',
      'GST Number',
      'Credit Limit (₹)',
      'Outstanding (₹)',
      'Assigned Sales Officers',
      'Assignment Status'
    ];

    const data = targetRows.map((r, idx) => [
      idx + 1,
      r.code,
      r.name,
      r.type === 'dealer' ? 'Dealer' : 'Distributor',
      r.contactPerson,
      r.phone,
      r.city,
      r.territory,
      r.brand,
      r.gst,
      r.creditLimit || 0,
      r.outstanding || 0,
      r.currentSoEmails.length > 0 ? r.currentSoEmails.map(soName).join(', ') : 'Unassigned',
      r.currentSoEmails.length > 0 ? 'Assigned' : 'Unassigned'
    ]);

    const activeFilterDesc = [
      filterType !== 'all' ? filterType : '',
      filterBrand !== 'all' ? filterBrand : '',
      filterSo !== 'all' ? soName(filterSo).replace(/\s+/g, '_') : ''
    ].filter(Boolean).join('_');

    const filename = `SO_Territory_Mapping_${activeFilterDesc ? activeFilterDesc + '_' : ''}${new Date().toISOString().slice(0, 10)}`;
    downloadCSV(headers, data, filename);
    toast({
      title: 'Excel Exported',
      description: `Successfully downloaded spreadsheet with ${targetRows.length} ${targetRows.length === 1 ? 'party' : 'parties'}.`
    });
  };

  // Export to Smart Professional Landscape A4 PDF
  const handleExportPdf = async (onlySelected = false) => {
    const targetRows = onlySelected && selected.size > 0
      ? filteredRows.filter(r => selected.has(r.id))
      : filteredRows;

    if (targetRows.length === 0) {
      toast({ title: 'No records to export', description: 'Please filter or select parties to export.', variant: 'destructive' });
      return;
    }

    setIsExportingPdf(true);
    toast({ title: 'Generating Dossier...', description: 'Compiling high-resolution Landscape A4 PDF with party addresses.' });

    try {
      const filename = await downloadSoMappingPdf({
        rows: targetRows,
        filterType,
        filterSo,
        filterBrand,
        search,
        userName: user?.name,
        userRole: user?.role,
        soName
      });

      toast({
        title: 'Smart PDF Exported',
        description: `Successfully exported ${filename} with ${targetRows.length} party profiles.`
      });
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast({ title: 'Export Failed', description: err.message || 'Could not generate PDF file.', variant: 'destructive' });
    } finally {
      setIsExportingPdf(false);
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

  if (!can('manage_customers')) {
    return <Navigate to="/" replace />;
  }

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

        {/* Export Dossier & Excel Options */}
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-2 shadow-sm border-border hover:bg-muted font-medium text-xs">
                <Download className="w-4 h-4 text-primary" />
                <span>Export Dossier</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">
                Excel Spreadsheet (.csv)
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExportExcel(false)} className="cursor-pointer gap-2 text-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export All Filtered ({filteredRows.length})</span>
              </DropdownMenuItem>
              {selected.size > 0 && (
                <DropdownMenuItem onClick={() => handleExportExcel(true)} className="cursor-pointer gap-2 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Selected Only ({selected.size})</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">
                Smart Professional PDF (.pdf)
              </DropdownMenuLabel>
              <DropdownMenuItem 
                onClick={() => handleExportPdf(false)} 
                disabled={isExportingPdf}
                className="cursor-pointer gap-2 text-xs"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                ) : (
                  <FileText className="w-4 h-4 text-rose-600" />
                )}
                <span>Generate PDF Dossier ({filteredRows.length})</span>
              </DropdownMenuItem>
              {selected.size > 0 && (
                <DropdownMenuItem 
                  onClick={() => handleExportPdf(true)} 
                  disabled={isExportingPdf}
                  className="cursor-pointer gap-2 text-xs"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-rose-600" />
                  )}
                  <span>Generate PDF for Selected ({selected.size})</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Direct 1-Click Quick Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportExcel(selected.size > 0)}
            className="h-9 px-3 text-xs gap-1.5 border-emerald-300/80 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 font-medium"
            title={selected.size > 0 ? `Download Excel for ${selected.size} selected parties` : `Download Excel for ${filteredRows.length} filtered parties`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
            {selected.size > 0 ? (
              <span className="bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {selected.size}
              </span>
            ) : (
              <span className="text-[10px] opacity-70">({filteredRows.length})</span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreviewOnlySelected(selected.size > 0);
              setShowPdfPreview(true);
            }}
            className="h-9 px-3 text-xs gap-1.5 border-rose-300/80 bg-rose-50/60 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-300 font-medium cursor-pointer"
            title={selected.size > 0 ? `Preview & Export Smart PDF for ${selected.size} selected parties` : `Preview & Export Smart PDF for ${filteredRows.length} filtered parties`}
          >
            <Eye className="w-4 h-4 text-rose-600" />
            <span>Smart PDF</span>
            {selected.size > 0 ? (
              <span className="bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {selected.size}
              </span>
            ) : (
              <span className="text-[10px] opacity-70">({filteredRows.length})</span>
            )}
          </Button>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-7 text-xs w-[180px] justify-between font-normal text-left bg-white border-muted">
                  <span className="truncate">
                    {bulkSos.length > 0 
                      ? `${bulkSos.length} selected`
                      : "Select SOs..."}
                  </span>
                  <Plus className="w-3 h-3 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2" align="end">
                <div className="mb-2 px-1">
                  <Input 
                    placeholder="Search SO..." 
                    value={bulkSoSearch} 
                    onChange={(e) => setBulkSoSearch(e.target.value)} 
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <label className="flex items-center space-x-2 p-1 rounded hover:bg-muted cursor-pointer transition-colors border-b pb-2 mb-1">
                    <Checkbox 
                      checked={bulkSos.includes('none')}
                      onCheckedChange={(checked) => {
                        if (checked) setBulkSos(prev => [...prev, 'none']);
                        else setBulkSos(prev => prev.filter(e => e !== 'none'));
                      }}
                    />
                    <span className="text-xs font-medium">No Sales Officer</span>
                  </label>
                  {salesUsers
                    .filter(so => so.name?.toLowerCase().includes(bulkSoSearch.toLowerCase()) || so.email?.toLowerCase().includes(bulkSoSearch.toLowerCase()))
                    .map(so => (
                    <label key={so.email} className="flex items-center space-x-2 p-1 rounded hover:bg-muted cursor-pointer transition-colors">
                      <Checkbox 
                        checked={bulkSos.includes(so.email)}
                        onCheckedChange={(checked) => {
                          if (checked) setBulkSos(prev => [...prev, so.email]);
                          else setBulkSos(prev => prev.filter(e => e !== so.email));
                        }}
                      />
                      <span className="text-xs">{so.name}</span>
                    </label>
                  ))}
                  {salesUsers.filter(so => so.name?.toLowerCase().includes(bulkSoSearch.toLowerCase()) || so.email?.toLowerCase().includes(bulkSoSearch.toLowerCase())).length === 0 && (
                    <div className="text-xs text-muted-foreground p-2 text-center">No Sales Officer found</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              disabled={selected.size === 0 || bulkSos.length === 0}
              onClick={handleBulkApply}
            >
              Apply
            </Button>
          </div>
        </div>
      </Card>

      {/* Mapping Table */}
      <Card className="overflow-hidden border border-border/80 rounded-2xl shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-bold">
                {filteredRows.length} {filterType === 'all' ? 'parties' : filterType + 's'}
                {filterSo !== 'all' && ` for ${soName(filterSo)}`}
              </CardTitle>
              {selected.size > 0 && (
                <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary">
                  {selected.size} selected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground mr-1 hidden lg:inline">
                Select multiple SOs per row to reassign
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExportExcel(selected.size > 0)}
                className="h-7 text-xs px-2.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 gap-1.5 font-medium"
                title={selected.size > 0 ? `Download Excel for ${selected.size} selected` : `Download Excel for ${filteredRows.length} filtered`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel {selected.size > 0 ? `(${selected.size})` : ''}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPreviewOnlySelected(selected.size > 0);
                  setShowPdfPreview(true);
                }}
                className="h-7 text-xs px-2.5 text-rose-700 hover:text-rose-800 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 gap-1.5 font-medium cursor-pointer"
                title={selected.size > 0 ? `Preview & Download Smart PDF for ${selected.size} selected` : `Preview & Download Smart PDF for ${filteredRows.length} filtered`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview PDF {selected.size > 0 ? `(${selected.size})` : ''}</span>
              </Button>
            </div>
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
                      <SoSelectCell 
                        row={row} 
                        salesUsers={salesUsers} 
                        effectiveSos={effectiveSos} 
                        toggleSoForRow={toggleSoForRow} 
                        isSaving={isSaving} 
                      />
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

      {/* Smart Professional PDF Preview & Export Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
          <DialogHeader className="p-4 border-b border-border bg-card shrink-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                SO Territory Dossier &middot; Document Preview
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Executive landscape report &middot; {previewTargetRows.length} party profiles included
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 text-xs gap-1.5 cursor-pointer no-print"
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                Print / Save as PDF
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isExportingPdf || previewTargetRows.length === 0}
                onClick={async () => {
                  setIsExportingPdf(true);
                  try {
                    const filename = await downloadSoMappingPdf({
                      rows: previewTargetRows,
                      filterType,
                      filterSo,
                      filterBrand,
                      search,
                      userName: user?.name,
                      userRole: user?.role,
                      soName
                    });
                    toast({
                      title: 'Smart PDF Exported',
                      description: `Successfully exported ${filename}.`
                    });
                  } catch (err: any) {
                    toast({ title: 'Export Failed', description: err.message, variant: 'destructive' });
                  } finally {
                    setIsExportingPdf(false);
                  }
                }}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer no-print"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download PDF ({previewTargetRows.length})
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>

          {/* Embedded Print Styles for perfect A4 Landscape print & PDF generation */}
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm 6mm;
              }
              body {
                background: #ffffff !important;
                color: #0f172a !important;
              }
              body > * {
                visibility: hidden !important;
              }
              [data-radix-portal],
              [role="dialog"],
              #so-mapping-pdf-preview-content,
              #so-mapping-pdf-preview-content * {
                visibility: visible !important;
              }
              [role="dialog"] {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: none !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                background: #ffffff !important;
                overflow: visible !important;
              }
              .no-print,
              button,
              [data-radix-overlay],
              header {
                display: none !important;
              }
              #so-mapping-pdf-preview-content {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
            }
          `}</style>

          {/* Scrollable Preview Container */}
          <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100/70 dark:bg-slate-900/40 flex justify-center print-preview-scroll">
            <div
              id="so-mapping-pdf-preview-content"
              className="bg-white text-slate-900 shadow-xl rounded-sm p-8 max-w-6xl w-full border border-slate-200"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            >
              {/* Report Header */}
              <div className="border-b-2 border-blue-900 pb-3 mb-4 flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-900 text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                      Simply Useful Enterprise
                    </span>
                    <span className="text-slate-500 text-[10px] font-semibold">
                      Territory Governance Dossier
                    </span>
                  </div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    SO Territory Mapping &amp; Channel Partner Directory
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Verified master mapping for dealers, distributors, registered addresses, and Sales Officer allocations.
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-600 leading-tight">
                  <div><span className="text-slate-400">Doc ID:</span> <strong className="font-mono text-slate-900">SOM-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-{previewTargetRows.length}</strong></div>
                  <div><span className="text-slate-400">Date:</span> <strong>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                  <div><span className="text-slate-400">Issuer:</span> <strong>{user?.name || 'Admin'} ({user?.role || 'SUPERADMIN'})</strong></div>
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-5 gap-2.5 mb-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Filtered</div>
                  <div className="text-lg font-black text-slate-900">{previewTargetRows.length}</div>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5">
                  <div className="text-[9px] font-bold text-sky-700 uppercase tracking-wider">Dealers</div>
                  <div className="text-lg font-black text-sky-800">{previewTargetRows.filter(r => r.type === 'dealer').length}</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5">
                  <div className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Distributors</div>
                  <div className="text-lg font-black text-indigo-800">{previewTargetRows.filter(r => r.type === 'distributor').length}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">SO Assigned</div>
                  <div className="text-lg font-black text-emerald-800">{previewTargetRows.filter(r => r.currentSoEmails.length > 0).length}</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <div className="text-[9px] font-bold text-rose-700 uppercase tracking-wider">Unassigned</div>
                  <div className="text-lg font-black text-rose-800">{previewTargetRows.filter(r => r.currentSoEmails.length === 0).length}</div>
                </div>
              </div>

              {/* Active Filter Scope */}
              <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 mb-3 flex gap-4 flex-wrap items-center text-xs">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Active Scope:</span>
                <div><span className="text-slate-500 text-[10px]">Party Type:</span> <strong className="text-slate-900">{filterType === 'all' ? 'All (Dealers & Distributors)' : filterType.toUpperCase() + 'S'}</strong></div>
                <div><span className="text-slate-500 text-[10px]">Sales Officer:</span> <strong className="text-slate-900">{filterSo === 'all' ? 'All Sales Officers' : soName(filterSo)}</strong></div>
                <div><span className="text-slate-500 text-[10px]">Brand:</span> <strong className="text-slate-900">{filterBrand === 'all' ? 'All Brands' : filterBrand}</strong></div>
                {search && <div><span className="text-slate-500 text-[10px]">Keyword:</span> <strong className="text-slate-900">&ldquo;{search}&rdquo;</strong></div>}
              </div>

              {/* Data Table */}
              <table className="w-full border-collapse text-[10px] text-left">
                <thead>
                  <tr className="bg-slate-100 border-t border-slate-300 border-b-2 border-slate-400">
                    <th className="py-1.5 px-2 w-8 text-center font-bold text-slate-700">#</th>
                    <th className="py-1.5 px-2 w-44 font-bold text-slate-700">Party Name &amp; Code</th>
                    <th className="py-1.5 px-2 w-16 text-center font-bold text-slate-700">Type</th>
                    <th className="py-1.5 px-2 w-56 font-bold text-slate-700">Registered Address</th>
                    <th className="py-1.5 px-2 w-28 font-bold text-slate-700">City &amp; Territory</th>
                    <th className="py-1.5 px-2 w-28 font-bold text-slate-700">Contact &amp; Phone</th>
                    <th className="py-1.5 px-2 w-16 font-bold text-slate-700">Brand</th>
                    <th className="py-1.5 px-2 w-28 font-bold text-slate-700">GSTIN</th>
                    <th className="py-1.5 px-2 font-bold text-slate-700">Assigned Sales Officer(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {previewTargetRows.map((r, i) => {
                    const soList = r.currentSoEmails.map(soName);
                    const isAssigned = soList.length > 0;
                    return (
                      <tr key={r.id} className={cn("border-b border-slate-200", i % 2 === 1 ? "bg-slate-50/60" : "bg-white")}>
                        <td className="py-1.5 px-2 text-center text-slate-500 font-mono text-[9px]">{i + 1}</td>
                        <td className="py-1.5 px-2">
                          <div className="font-bold text-slate-900 text-[10px] leading-tight">{r.name}</div>
                          <div className="text-[8.5px] text-slate-500 font-mono">
                            {r.code} {r.contactPerson && r.contactPerson !== '—' ? `· ${r.contactPerson}` : ''}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider",
                            r.type === 'dealer' ? "bg-sky-100 text-sky-800" : "bg-indigo-100 text-indigo-800"
                          )}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="text-[8.5px] text-slate-700 leading-snug line-clamp-3">
                            {r.address && r.address !== '—' ? r.address : <span className="text-slate-400 italic">No registered address</span>}
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="font-semibold text-slate-900 text-[9.5px]">{r.city}</div>
                          <div className="text-[8.5px] font-semibold text-blue-600">{r.territory}</div>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="font-semibold text-slate-800 text-[9.5px]">{r.phone !== '—' ? r.phone : <span className="text-slate-400">No Phone</span>}</div>
                        </td>
                        <td className="py-1.5 px-2 font-semibold text-amber-700 text-[9px]">{r.brand}</td>
                        <td className="py-1.5 px-2 font-mono text-[8.5px] text-slate-600">{r.gst}</td>
                        <td className="py-1.5 px-2">
                          {isAssigned ? (
                            <div className="flex flex-wrap gap-1">
                              {soList.map(name => (
                                <span key={name} className="inline-block px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[8.5px] font-bold text-emerald-800">
                                  👤 {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-rose-600 italic font-semibold text-[8.5px]">&times; Unassigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div className="mt-6 pt-3 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-500">
                <div className="flex gap-3 items-center">
                  <strong className="text-slate-900">Simply Useful ERP</strong>
                  <span>&middot;</span>
                  <span>SO Territory Allocation Dossier</span>
                  <span>&middot;</span>
                  <span className="text-emerald-700 font-semibold">&bull; Official System Document</span>
                </div>
                <div>
                  <span>Confidential &middot; Exported on {new Date().toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SOMapping;
