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
  Download, FileSpreadsheet, FileText, Loader2
} from 'lucide-react';
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

  // Export to Smart Professional PDF
  const handleExportPdf = async (onlySelected = false) => {
    const targetRows = onlySelected && selected.size > 0
      ? filteredRows.filter(r => selected.has(r.id))
      : filteredRows;

    if (targetRows.length === 0) {
      toast({ title: 'No records to export', description: 'Please filter or select parties to export.', variant: 'destructive' });
      return;
    }

    setIsExportingPdf(true);
    toast({ title: 'Generating Dossier...', description: 'Compiling high-resolution professional PDF document.' });

    try {
      const { default: html2pdf } = await import('html2pdf.js');

      const printContainer = document.createElement('div');
      printContainer.id = 'pdf-export-so-mapping-dossier';
      printContainer.style.position = 'fixed';
      printContainer.style.top = '-9999px';
      printContainer.style.left = '-9999px';
      printContainer.style.width = '1120px';
      printContainer.style.backgroundColor = '#ffffff';
      printContainer.style.color = '#0f172a';
      printContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      printContainer.style.padding = '26px 30px';
      printContainer.style.boxSizing = 'border-box';

      const dealersCount = targetRows.filter(r => r.type === 'dealer').length;
      const distCount = targetRows.filter(r => r.type === 'distributor').length;
      const assignedCount = targetRows.filter(r => r.currentSoEmails.length > 0).length;
      const unassignedCount = targetRows.filter(r => r.currentSoEmails.length === 0).length;

      const activeFiltersHtml = [
        `<div><span style="color: #64748b; font-size: 10px;">Party Type:</span> <strong style="color: #0f172a; font-size: 11px;">${filterType === 'all' ? 'All (Dealers & Distributors)' : filterType.toUpperCase() + 'S'}</strong></div>`,
        `<div><span style="color: #64748b; font-size: 10px;">Sales Officer:</span> <strong style="color: #0f172a; font-size: 11px;">${filterSo === 'all' ? 'All Sales Officers' : soName(filterSo)}</strong></div>`,
        `<div><span style="color: #64748b; font-size: 10px;">Brand:</span> <strong style="color: #0f172a; font-size: 11px;">${filterBrand === 'all' ? 'All Brands' : filterBrand}</strong></div>`,
        search ? `<div><span style="color: #64748b; font-size: 10px;">Search Keyword:</span> <strong style="color: #0f172a; font-size: 11px;">"${search}"</strong></div>` : ''
      ].filter(Boolean).join('');

      printContainer.innerHTML = `
        <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="background-color: #1e3a8a; color: #ffffff; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase;">
                Simply Useful Enterprise
              </span>
              <span style="color: #64748b; font-size: 10px; font-weight: 600;">
                Territory Governance Dossier
              </span>
            </div>
            <h1 style="font-size: 21px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em;">
              SO Territory Mapping & Channel Partner Directory
            </h1>
            <p style="font-size: 11px; color: #64748b; margin: 3px 0 0 0;">
              Comprehensive mapping of dealers and distributors, contact profiles, territories, and assigned Sales Officers.
            </p>
          </div>
          <div style="text-align: right; font-size: 10px; color: #475569; line-height: 1.45;">
            <div><span style="color: #94a3b8;">Document ID:</span> <strong style="font-family: monospace; color: #0f172a;">SOM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${targetRows.length}</strong></div>
            <div><span style="color: #94a3b8;">Generated:</span> <strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
            <div><span style="color: #94a3b8;">Generated By:</span> <strong>${user?.name || 'Admin'} (${user?.role || 'SUPERADMIN'})</strong></div>
          </div>
        </div>

        <!-- KPI Metric Ribbon -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 12px;">
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; text-align: left;">
            <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Total Filtered</div>
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.2;">${targetRows.length}</div>
          </div>
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 8px 12px; text-align: left;">
            <div style="font-size: 9px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.04em;">Dealers</div>
            <div style="font-size: 18px; font-weight: 800; color: #0284c7; line-height: 1.2;">${dealersCount}</div>
          </div>
          <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 8px 12px; text-align: left;">
            <div style="font-size: 9px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.04em;">Distributors</div>
            <div style="font-size: 18px; font-weight: 800; color: #4f46e5; line-height: 1.2;">${distCount}</div>
          </div>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; text-align: left;">
            <div style="font-size: 9px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.04em;">SO Assigned</div>
            <div style="font-size: 18px; font-weight: 800; color: #16a34a; line-height: 1.2;">${assignedCount}</div>
          </div>
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 8px 12px; text-align: left;">
            <div style="font-size: 9px; font-weight: 700; color: #be123c; text-transform: uppercase; letter-spacing: 0.04em;">Unassigned</div>
            <div style="font-size: 18px; font-weight: 800; color: #e11d48; line-height: 1.2;">${unassignedCount}</div>
          </div>
        </div>

        <!-- Active Filter Badge Strip -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; margin-bottom: 12px; display: flex; gap: 20px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 9.5px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.04em;">Filter Scope:</span>
          ${activeFiltersHtml}
        </div>

        <!-- Main Comprehensive Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; border-top: 1.5px solid #cbd5e1; border-bottom: 2px solid #94a3b8;">
              <th style="padding: 7px 6px; width: 30px; text-align: center; font-weight: 700; color: #334155;">#</th>
              <th style="padding: 7px 8px; width: 190px; font-weight: 700; color: #334155;">Party Name & Code</th>
              <th style="padding: 7px 6px; width: 75px; text-align: center; font-weight: 700; color: #334155;">Type</th>
              <th style="padding: 7px 8px; width: 125px; font-weight: 700; color: #334155;">Contact & Phone</th>
              <th style="padding: 7px 8px; width: 120px; font-weight: 700; color: #334155;">City & Territory</th>
              <th style="padding: 7px 6px; width: 75px; font-weight: 700; color: #334155;">Brand</th>
              <th style="padding: 7px 6px; width: 110px; font-weight: 700; color: #334155;">GSTIN</th>
              <th style="padding: 7px 8px; font-weight: 700; color: #334155;">Assigned Sales Officer(s)</th>
            </tr>
          </thead>
          <tbody>
            ${targetRows.map((r, i) => {
              const soList = r.currentSoEmails.map(soName);
              const isAssigned = soList.length > 0;
              return `
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${i % 2 === 1 ? '#f8fafc' : '#ffffff'}; page-break-inside: avoid;">
                <td style="padding: 6px 6px; text-align: center; color: #64748b; font-size: 9px;">${i + 1}</td>
                <td style="padding: 6px 8px;">
                  <div style="font-weight: 700; color: #0f172a; font-size: 10px; line-height: 1.25;">${r.name}</div>
                  <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">
                    <span style="font-family: monospace; font-weight: 600; color: #475569;">${r.code}</span>
                    ${r.contactPerson && r.contactPerson !== '—' ? ` &middot; ${r.contactPerson}` : ''}
                  </div>
                </td>
                <td style="padding: 6px 6px; text-align: center;">
                  <span style="display: inline-block; padding: 2px 6px; font-size: 8px; font-weight: 800; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; background-color: ${r.type === 'dealer' ? '#e0f2fe' : '#e0e7ff'}; color: ${r.type === 'dealer' ? '#0369a1' : '#4338ca'};">
                    ${r.type}
                  </span>
                </td>
                <td style="padding: 6px 8px;">
                  <div style="color: #1e293b; font-weight: 600; font-size: 9.5px;">${r.phone !== '—' ? r.phone : '<span style="color:#94a3b8;">No Phone</span>'}</div>
                  ${r.contactPerson && r.contactPerson !== '—' ? `<div style="font-size: 8.5px; color: #64748b;">${r.contactPerson}</div>` : ''}
                </td>
                <td style="padding: 6px 8px;">
                  <div style="color: #0f172a; font-weight: 600; font-size: 9.5px;">${r.city}</div>
                  <div style="font-size: 8.5px; color: #2563eb; font-weight: 600;">${r.territory}</div>
                </td>
                <td style="padding: 6px 6px;">
                  <span style="font-weight: 700; color: #b45309; font-size: 9px;">${r.brand}</span>
                </td>
                <td style="padding: 6px 6px;">
                  <span style="font-family: monospace; font-size: 8.5px; color: ${r.gst !== '—' ? '#334155' : '#94a3b8'};">
                    ${r.gst}
                  </span>
                </td>
                <td style="padding: 6px 8px;">
                  ${isAssigned ? `
                    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                      ${soList.map(name => `
                        <span style="display: inline-block; padding: 2px 6px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; font-size: 8.5px; font-weight: 700; color: #065f46;">
                          👤 ${name}
                        </span>
                      `).join('')}
                    </div>
                  ` : `
                    <span style="color: #e11d48; font-style: italic; font-size: 8.5px; font-weight: 600;">
                      &times; Unassigned
                    </span>
                  `}
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>

        <!-- Executive Footer -->
        <div style="margin-top: 22px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b;">
          <div style="display: flex; gap: 15px; align-items: center;">
            <strong style="color: #0f172a;">Simply Useful ERP</strong>
            <span>&middot;</span>
            <span>SO Territory Allocation Dossier</span>
            <span>&middot;</span>
            <span style="color: #16a34a; font-weight: 600;">&bull; Official System Document</span>
          </div>
          <div>
            <span>Confidential &middot; Exported on ${new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>
      `;

      document.body.appendChild(printContainer);

      const activeFilterDesc = [
        filterType !== 'all' ? filterType : '',
        filterBrand !== 'all' ? filterBrand : '',
        filterSo !== 'all' ? soName(filterSo).replace(/\s+/g, '_') : ''
      ].filter(Boolean).join('_');

      const filename = `SO_Territory_Dossier_${activeFilterDesc ? activeFilterDesc + '_' : ''}${new Date().toISOString().slice(0, 10)}`;

      const opt = {
        margin: [6, 6, 6, 6],
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const pdfWorker = html2pdf().set(opt).from(printContainer);
      const pdfBlob: Blob = await pdfWorker.output('blob');
      
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }

      // Save with native file path dialog or guaranteed extension download
      const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      await saveFileWithDialog(
        pdfBlob,
        safeFilename,
        'application/pdf',
        'pdf',
        'PDF Document (*.pdf)'
      );

      toast({
        title: 'Smart PDF Exported',
        description: `Successfully exported ${safeFilename} with ${targetRows.length} party profiles.`
      });
    } catch (err) {
      console.error('PDF export error:', err);
      toast({ title: 'Export Failed', description: 'Could not generate PDF file.', variant: 'destructive' });
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
            onClick={() => handleExportPdf(selected.size > 0)}
            disabled={isExportingPdf}
            className="h-9 px-3 text-xs gap-1.5 border-rose-300/80 bg-rose-50/60 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-300 font-medium"
            title={selected.size > 0 ? `Download Smart Professional PDF for ${selected.size} selected parties` : `Download Smart Professional PDF for ${filteredRows.length} filtered parties`}
          >
            {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> : <FileText className="w-4 h-4 text-rose-600" />}
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
                onClick={() => handleExportPdf(selected.size > 0)}
                disabled={isExportingPdf}
                className="h-7 text-xs px-2.5 text-rose-700 hover:text-rose-800 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 gap-1.5 font-medium"
                title={selected.size > 0 ? `Download Smart PDF for ${selected.size} selected` : `Download Smart PDF for ${filteredRows.length} filtered`}
              >
                {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                <span>Export PDF {selected.size > 0 ? `(${selected.size})` : ''}</span>
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
    </div>
  );
};

export default SOMapping;
