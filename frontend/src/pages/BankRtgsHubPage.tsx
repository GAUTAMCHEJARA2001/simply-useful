import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Landmark, Download, Plus, Search, Edit2, Trash2, CheckCircle2, 
  AlertCircle, Building2, Users, FileText, Layers, FileSpreadsheet,
  CheckSquare, Square
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/Modal';
import { useSettings } from '@/hooks/inventory/useMasters';
import { generateRTGSSlip, generateCombinedBulkRTGSPdf, RTGSData } from '@/utils/pdfGenerator';
import apiClient from '@/api/client';

export interface RtgsPayee {
  id: string;
  name: string;
  category: 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  phone?: string;
  gstNumber?: string;
  designation?: string;
}

const STORAGE_KEY = 'simply_saved_rtgs_payees_v3';

export default function BankRtgsHubPage() {
  const [searchParams] = useSearchParams();
  const { data: settings } = useSettings();

  // Payees master state
  const [savedPayees, setSavedPayees] = useState<Record<string, Partial<RtgsPayee>>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const initialTab = (searchParams.get('tab') || 'ALL').toUpperCase();
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER'>(
    initialTab === 'SUPPLIER' || initialTab === 'EMPLOYEE' || initialTab === 'OTHER' ? initialTab : 'ALL'
  );

  // Bulk Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single RTGS Generation Modal state
  const [rtgsModalOpen, setRtgsModalOpen] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<RtgsPayee | null>(null);
  const [rtgsAmount, setRtgsAmount] = useState<string>('');
  const [rtgsReason, setRtgsReason] = useState<string>('');
  const [rtgsDate, setRtgsDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rtgsChequeNo, setRtgsChequeNo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Bulk RTGS Modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<Array<{
    payee: RtgsPayee;
    amount: string;
    reason: string;
  }>>([]);
  const [bulkDefaultReason, setBulkDefaultReason] = useState<string>('PAYMENT');
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // Edit / Add Payee Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RtgsPayee>>({
    name: '',
    category: 'SUPPLIER',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
  });

  // Fetch Suppliers and Employees on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apiClient<any[]>('/masters/suppliers').catch(() => ({ data: [] })),
      apiClient<any[]>('/hr/employees').catch(() => ({ data: [] })),
    ]).then(([suppRes, empRes]) => {
      const suppList = suppRes?.data || (Array.isArray(suppRes) ? suppRes : []);
      const empList = empRes?.data || (Array.isArray(empRes) ? empRes : []);
      setSuppliers(suppList);
      setEmployees(empList);
      setIsLoading(false);

      // Auto-open RTGS for specific supplier or employee if query param passed
      const targetSupplierId = searchParams.get('supplierId');
      const targetEmpId = searchParams.get('empId');

      if (targetSupplierId && suppList.length > 0) {
        const s = suppList.find((x: any) => String(x.id) === String(targetSupplierId));
        if (s) {
          const cached = savedPayees[`supp_${s.id}`] || {};
          openSingleRtgsModal({
            id: `supp_${s.id}`,
            name: s.name,
            category: 'SUPPLIER',
            bankName: cached.bankName || '',
            accountNumber: cached.accountNumber || '',
            ifscCode: cached.ifscCode || '',
            branch: cached.branch || s.address || 'NAVSARI',
            gstNumber: s.gstnumber,
          });
        }
      } else if (targetEmpId && empList.length > 0) {
        const e = empList.find((x: any) => String(x.id) === String(targetEmpId));
        if (e) {
          const cached = savedPayees[`emp_${e.id}`] || {};
          openSingleRtgsModal({
            id: `emp_${e.id}`,
            name: e.name,
            category: 'EMPLOYEE',
            bankName: cached.bankName || e.bank_name || '',
            accountNumber: cached.accountNumber || e.bank_account_number || '',
            ifscCode: cached.ifscCode || e.bank_ifsc || '',
            branch: cached.branch || e.bank_branch || 'NAVSARI',
            designation: e.designation,
          });
        }
      }
    });
  }, []);

  // Consolidate all payees into a single unified list
  const allPayees = useMemo<RtgsPayee[]>(() => {
    const list: RtgsPayee[] = [];

    // 1. Suppliers
    suppliers.forEach(s => {
      const cached = savedPayees[`supp_${s.id}`] || {};
      list.push({
        id: `supp_${s.id}`,
        name: (s.name || '').toUpperCase(),
        category: 'SUPPLIER',
        bankName: (cached.bankName || '').toUpperCase(),
        accountNumber: cached.accountNumber || '',
        ifscCode: (cached.ifscCode || '').toUpperCase(),
        branch: cached.branch || s.address || 'NAVSARI',
        phone: s.contactinfo || s.contactInfo,
        gstNumber: s.gstnumber,
      });
    });

    // 2. Employees (Staff)
    employees.forEach(e => {
      const cached = savedPayees[`emp_${e.id}`] || {};
      list.push({
        id: `emp_${e.id}`,
        name: (e.name || '').toUpperCase(),
        category: 'EMPLOYEE',
        bankName: (cached.bankName || e.bank_name || '').toUpperCase(),
        accountNumber: cached.accountNumber || e.bank_account_number || '',
        ifscCode: (cached.ifscCode || e.bank_ifsc || '').toUpperCase(),
        branch: cached.branch || e.bank_branch || 'NAVSARI',
        designation: e.designation,
      });
    });

    // 3. Custom / Other Payees saved in localStorage
    Object.entries(savedPayees).forEach(([key, val]) => {
      if (key.startsWith('custom_') && val.name) {
        list.push({
          id: key,
          name: val.name.toUpperCase(),
          category: 'OTHER',
          bankName: (val.bankName || '').toUpperCase(),
          accountNumber: val.accountNumber || '',
          ifscCode: (val.ifscCode || '').toUpperCase(),
          branch: val.branch || 'NAVSARI',
        });
      }
    });

    return list;
  }, [suppliers, employees, savedPayees]);

  // Filtered Payees
  const filteredPayees = useMemo(() => {
    return allPayees.filter(p => {
      if (activeCategory !== 'ALL' && p.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.accountNumber.toLowerCase().includes(q) ||
          p.ifscCode.toLowerCase().includes(q) ||
          p.bankName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allPayees, activeCategory, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: allPayees.length,
      suppliers: allPayees.filter(p => p.category === 'SUPPLIER').length,
      employees: allPayees.filter(p => p.category === 'EMPLOYEE').length,
      other: allPayees.filter(p => p.category === 'OTHER').length,
    };
  }, [allPayees]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredPayees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPayees.map(p => p.id)));
    }
  };

  // Open Single RTGS Modal
  const openSingleRtgsModal = (payee: RtgsPayee) => {
    setSelectedPayee(payee);
    setRtgsAmount('');
    setRtgsDate(new Date().toISOString().slice(0, 10));
    setRtgsChequeNo('');

    if (payee.category === 'EMPLOYEE') {
      setRtgsReason(`STAFF SALARY ADVANCE - ${payee.name}`);
    } else if (payee.category === 'SUPPLIER') {
      setRtgsReason(`SUPPLIER PAYMENT - ${payee.name}`);
    } else {
      setRtgsReason(`PAYMENT - ${payee.name}`);
    }

    setRtgsModalOpen(true);
  };

  // Open Bulk RTGS Modal
  const openBulkModal = () => {
    const targets = allPayees.filter(p => selectedIds.has(p.id));
    if (targets.length === 0) {
      toast.error('Please select at least one payee using the checkboxes.');
      return;
    }

    const defaultReason = activeCategory === 'EMPLOYEE'
      ? 'STAFF SALARY ADVANCE'
      : (activeCategory === 'SUPPLIER' ? 'SUPPLIER PAYMENT' : 'REMITTANCE');

    setBulkDefaultReason(defaultReason);
    setBulkDate(new Date().toISOString().slice(0, 10));
    setBulkRows(targets.map(p => ({
      payee: p,
      amount: '',
      reason: `${defaultReason} - ${p.name}`,
    })));

    setBulkModalOpen(true);
  };

  const handleApplyDefaultReasonToAll = () => {
    if (!bulkDefaultReason.trim()) return;
    setBulkRows(prev => prev.map(r => ({
      ...r,
      reason: `${bulkDefaultReason.trim()} - ${r.payee.name}`
    })));
    toast.success('Applied reason to all selected payees!');
  };

  const bulkTotalAmount = useMemo(() => {
    return bulkRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [bulkRows]);

  // Open Edit Bank Details Modal
  const openEditModal = (payee?: RtgsPayee) => {
    if (payee) {
      setEditForm({
        id: payee.id,
        name: payee.name,
        category: payee.category,
        bankName: payee.bankName,
        accountNumber: payee.accountNumber,
        ifscCode: payee.ifscCode,
        branch: payee.branch || 'NAVSARI',
      });
    } else {
      setEditForm({
        id: `custom_${Date.now()}`,
        name: '',
        category: 'SUPPLIER',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: 'NAVSARI',
      });
    }
    setEditModalOpen(true);
  };

  // Save Payee Bank Details
  const handleSavePayeeDetails = () => {
    if (!editForm.name?.trim()) {
      toast.error('Please enter the Beneficiary Name.');
      return;
    }
    if (!editForm.accountNumber?.trim()) {
      toast.error('Please enter Bank Account Number.');
      return;
    }
    if (!editForm.ifscCode?.trim()) {
      toast.error('Please enter IFSC Code.');
      return;
    }

    const id = editForm.id || `custom_${Date.now()}`;
    const updated = {
      ...savedPayees,
      [id]: {
        name: editForm.name.trim().toUpperCase(),
        category: editForm.category || 'OTHER',
        bankName: (editForm.bankName || '').trim().toUpperCase(),
        accountNumber: editForm.accountNumber.trim(),
        ifscCode: editForm.ifscCode.trim().toUpperCase(),
        branch: (editForm.branch || 'NAVSARI').trim().toUpperCase(),
      }
    };

    setSavedPayees(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      toast.success(`💾 Bank details saved for ${editForm.name}!`);
    } catch {
      toast.error('Failed to save to local cache.');
    }

    if (selectedPayee && selectedPayee.id === id) {
      setSelectedPayee(prev => prev ? ({ ...prev, ...updated[id] } as RtgsPayee) : null);
    }

    setEditModalOpen(false);
  };

  // Delete Custom Payee
  const handleDeletePayee = (id: string, name: string) => {
    if (!confirm(`Delete saved payee "${name}"?`)) return;
    const updated = { ...savedPayees };
    delete updated[id];
    setSavedPayees(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success(`Removed ${name}.`);
  };

  // Helper to compile RTGS item
  const buildRtgsPayload = (payee: RtgsPayee, amount: number, narration: string, date: string): RTGSData => {
    return {
      beneficiaryName: payee.name,
      bankName: payee.bankName || 'AXIS BANK',
      accountNumber: payee.accountNumber,
      ifscCode: payee.ifscCode,
      amount,
      date,
      companyName: settings?.company_name || settings?.companyName || 'KAMLA CONCHEM PVT.LTD',
      companyAccount: settings?.company_bank_account || '925030009706188',
      companyBank: settings?.company_bank_name || 'AXIS BANK',
      companyBranch: settings?.company_bank_branch || 'LUNSIKUI, NAVSARI',
      companyIfsc: settings?.company_bank_ifsc || 'UTIB0000047',
      companyAddress: settings?.company_address || 'BLOCK NO:183BHATTAI NAVSARI',
      companyPan: settings?.company_gst ? settings.company_gst.slice(2, 12) : 'AALCK3507C',
      companyPhone: settings?.company_phone || '8866322700',
      beneficiaryBranch: payee.branch || 'NAVSARI',
      narration: (narration || `RTGS ${payee.name}`).toUpperCase(),
    };
  };

  // Generate Single Axis Bank RTGS PDF
  const handleGenerateSinglePdf = async () => {
    if (!selectedPayee) return;

    const amt = parseFloat(rtgsAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid transfer amount.');
      return;
    }

    if (!selectedPayee.accountNumber) {
      toast.error('Bank Account Number is missing. Please save it first.');
      return;
    }
    if (!selectedPayee.ifscCode) {
      toast.error('IFSC Code is missing. Please save it first.');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = buildRtgsPayload(selectedPayee, amt, rtgsReason, rtgsDate);
      await generateRTGSSlip(payload);
      toast.success(`🎉 Official Axis Bank RTGS PDF generated for ${selectedPayee.name}!`);
      setRtgsModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate Axis Bank RTGS PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Bulk RTGS (Combined PDF)
  const handleGenerateBulkCombined = async () => {
    // Validate each row
    const validItems: RTGSData[] = [];
    for (const r of bulkRows) {
      const amt = parseFloat(r.amount);
      if (!amt || amt <= 0) {
        toast.error(`Please enter a valid amount for ${r.payee.name}`);
        return;
      }
      if (!r.payee.accountNumber || !r.payee.ifscCode) {
        toast.error(`Missing Bank credentials for ${r.payee.name}`);
        return;
      }
      validItems.push(buildRtgsPayload(r.payee, amt, r.reason, bulkDate));
    }

    setIsGeneratingBulk(true);
    try {
      await generateCombinedBulkRTGSPdf(validItems);
      toast.success(`🎉 Generated Combined Multi-Page Axis RTGS PDF for ${validItems.length} payees!`);
      setBulkModalOpen(false);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate Combined Bulk RTGS PDF.');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // Generate Bulk RTGS (Batch Individual PDFs)
  const handleGenerateBulkIndividual = async () => {
    const validRows = bulkRows.filter(r => parseFloat(r.amount) > 0 && r.payee.accountNumber && r.payee.ifscCode);
    if (validRows.length === 0) {
      toast.error('Please enter valid amounts for the selected payees.');
      return;
    }

    setIsGeneratingBulk(true);
    toast.info(`Generating ${validRows.length} individual RTGS forms...`);

    try {
      for (let i = 0; i < validRows.length; i++) {
        const r = validRows[i];
        const payload = buildRtgsPayload(r.payee, parseFloat(r.amount), r.reason, bulkDate);
        await generateRTGSSlip(payload);
        if (validRows.length > 1) {
          await new Promise(res => setTimeout(res, 400));
        }
      }
      toast.success(`✅ Downloaded ${validRows.length} Axis Bank RTGS PDFs!`);
      setBulkModalOpen(false);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message || 'Failed during batch download.');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // Export Axis Bank CSV / Excel Format
  const handleExportBulkCsv = () => {
    const validRows = bulkRows.filter(r => parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      toast.error('Please enter transfer amounts first.');
      return;
    }

    const headers = ['Sr No', 'Beneficiary Name', 'Beneficiary Account No', 'Beneficiary IFSC', 'Amount (INR)', 'Debit Account No', 'Narration / Purpose'];
    const rows = validRows.map((r, i) => [
      i + 1,
      `"${r.payee.name}"`,
      `"${r.payee.accountNumber}"`,
      `"${r.payee.ifscCode}"`,
      parseFloat(r.amount).toFixed(2),
      `"${settings?.company_bank_account || '925030009706188'}"`,
      `"${r.reason.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Axis_Bank_Bulk_RTGS_Annexure_${bulkDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('📊 Exported Axis Bank Corporate Bulk Annexure CSV!');
  };

  return (
    <div className="flex-1 w-full min-w-0 p-4 md:p-6 bg-background text-foreground space-y-5">
      
      {/* ── TOP HEADER (MATCHED WITH SYSTEM CARD & UI DESIGN) ── */}
      <div className="bg-card text-card-foreground border border-border p-4 md:p-5 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                Axis Bank RTGS & NEFT Center
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Official Form (02_AXIS)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Save beneficiary credentials, enter amount & reason, and generate single or bulk Axis Bank RTGS forms.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              onClick={openBulkModal}
              className="font-semibold shadow-sm"
              size="sm"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Bulk RTGS ({selectedIds.size})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditModal()}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add / Save Payee
          </Button>
        </div>
      </div>

      {/* ── SEARCH & CATEGORY FILTER BAR ── */}
      <div className="bg-card border border-border p-3 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Button
            size="sm"
            variant={activeCategory === 'ALL' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('ALL')}
            className="h-8 text-xs font-semibold"
          >
            All Payees ({counts.all})
          </Button>

          <Button
            size="sm"
            variant={activeCategory === 'SUPPLIER' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('SUPPLIER')}
            className="h-8 text-xs font-semibold"
          >
            <Building2 className="w-3.5 h-3.5 mr-1" />
            Suppliers ({counts.suppliers})
          </Button>

          <Button
            size="sm"
            variant={activeCategory === 'EMPLOYEE' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('EMPLOYEE')}
            className="h-8 text-xs font-semibold"
          >
            <Users className="w-3.5 h-3.5 mr-1" />
            Staff Advances ({counts.employees})
          </Button>

          <Button
            size="sm"
            variant={activeCategory === 'OTHER' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('OTHER')}
            className="h-8 text-xs font-semibold"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            Other ({counts.other})
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            type="text"
            placeholder="Search payee, account #, or IFSC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-3 text-xs"
          />
        </div>
      </div>

      {/* ── PAYEES TABLE ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Loading suppliers and staff payees...
          </div>
        ) : filteredPayees.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-muted-foreground text-sm">No payees found matching your filter.</p>
            <Button variant="link" size="sm" onClick={() => openEditModal()}>
              + Add a new RTGS payee now
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-muted-foreground hover:text-foreground"
                      title={selectedIds.size === filteredPayees.length ? 'Deselect All' : 'Select All'}
                    >
                      {selectedIds.size > 0 && selectedIds.size === filteredPayees.length ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-semibold">Beneficiary Name</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Bank Name</th>
                  <th className="px-3 py-3 font-semibold">Account Number</th>
                  <th className="px-3 py-3 font-semibold">IFSC Code</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayees.map((payee) => {
                  const isSelected = selectedIds.has(payee.id);
                  const hasBankDetails = Boolean(payee.accountNumber && payee.ifscCode);

                  return (
                    <tr 
                      key={payee.id} 
                      className={`hover:bg-muted/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(payee.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Name */}
                      <td className="px-3 py-3 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{payee.name}</span>
                          {payee.designation && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({payee.designation})
                            </span>
                          )}
                          {payee.gstNumber && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              GST: {payee.gstNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-3 py-3">
                        {payee.category === 'SUPPLIER' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> Supplier
                          </span>
                        )}
                        {payee.category === 'EMPLOYEE' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <Users className="w-3 h-3" /> Staff Advance
                          </span>
                        )}
                        {payee.category === 'OTHER' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold inline-flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Other
                          </span>
                        )}
                      </td>

                      {/* Bank Name */}
                      <td className="px-3 py-3 text-muted-foreground font-medium">
                        {payee.bankName || <span className="text-muted-foreground/60 italic">Not set</span>}
                      </td>

                      {/* Account Number */}
                      <td className="px-3 py-3 font-mono">
                        {payee.accountNumber ? (
                          <span className="bg-muted/70 px-2 py-0.5 rounded text-foreground font-semibold">
                            {payee.accountNumber}
                          </span>
                        ) : (
                          <span className="text-amber-500/80 italic">Missing</span>
                        )}
                      </td>

                      {/* IFSC Code */}
                      <td className="px-3 py-3 font-mono font-semibold text-primary">
                        {payee.ifscCode || <span className="text-muted-foreground/60 italic font-normal">Missing</span>}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        {hasBankDetails ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <button
                            onClick={() => openEditModal(payee)}
                            className="text-amber-600 dark:text-amber-400 hover:underline text-[11px] font-medium flex items-center gap-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Set details
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => openSingleRtgsModal(payee)}
                            className="h-7 px-2.5 text-xs font-semibold"
                          >
                            <Landmark className="w-3.5 h-3.5 mr-1" />
                            RTGS
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditModal(payee)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Edit Bank Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          {payee.id.startsWith('custom_') && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeletePayee(payee.id, payee.name)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              title="Delete Payee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── FLOATING BULK BAR (WHEN PAYEES ARE SELECTED) ── */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-20 bg-card text-card-foreground border border-primary/30 p-3.5 rounded-xl shadow-2xl flex flex-wrap items-center justify-between gap-4 ring-1 ring-primary/20">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold">
              {selectedIds.size} {selectedIds.size === 1 ? 'payee' : 'payees'} selected for Bulk RTGS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs"
            >
              Deselect All
            </Button>

            <Button
              size="sm"
              onClick={openBulkModal}
              className="text-xs font-bold shadow-sm"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Generate Bulk RTGS ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* ── 1. SINGLE RTGS MODAL ── */}
      <Modal 
        isOpen={rtgsModalOpen && !!selectedPayee} 
        onClose={() => setRtgsModalOpen(false)}
        title="Generate Axis Bank RTGS Form"
        maxWidth="max-w-lg"
      >
        {selectedPayee && (
          <div className="space-y-4 text-xs">
            {/* Payee summary card */}
            <div className="bg-muted/40 border border-border p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Beneficiary Details</span>
                <button
                  onClick={() => {
                    setRtgsModalOpen(false);
                    openEditModal(selectedPayee);
                  }}
                  className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>

              <div className="font-bold text-sm text-foreground">
                {selectedPayee.name}
              </div>

              <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-border">
                <div>
                  <span className="text-[10px] block">Account No:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedPayee.accountNumber || '⚠️ Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] block">IFSC Code:</span>
                  <span className="font-mono font-bold text-primary">
                    {selectedPayee.ifscCode || '⚠️ Missing'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground">
                Bank: <span className="font-medium text-foreground">{selectedPayee.bankName || 'AXIS BANK'}</span> • Branch: <span className="font-medium text-foreground">{selectedPayee.branch || 'NAVSARI'}</span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                Transfer Amount (₹) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-base font-bold text-primary">₹</span>
                <Input
                  type="number"
                  autoFocus
                  placeholder="Enter amount (e.g. 50000)"
                  value={rtgsAmount}
                  onChange={(e) => setRtgsAmount(e.target.value)}
                  className="pl-8 text-base font-bold text-foreground"
                />
              </div>
            </div>

            {/* Reason Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                Reason / Narration <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Staff Advance / Raw Material Bill / Monthly Salary"
                value={rtgsReason}
                onChange={(e) => setRtgsReason(e.target.value)}
                className="text-xs"
              />

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedPayee.category === 'EMPLOYEE' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRtgsReason(`STAFF SALARY ADVANCE - ${selectedPayee.name}`)}
                      className="px-2 py-0.5 bg-muted hover:bg-muted/80 rounded text-[10px] font-semibold text-foreground border border-border"
                    >
                      ⚡ Staff Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => setRtgsReason(`MONTHLY SALARY - ${selectedPayee.name}`)}
                      className="px-2 py-0.5 bg-muted hover:bg-muted/80 rounded text-[10px] font-semibold text-foreground border border-border"
                    >
                      💼 Monthly Salary
                    </button>
                  </>
                )}
                {selectedPayee.category === 'SUPPLIER' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRtgsReason(`SUPPLIER PAYMENT: ${selectedPayee.name}`)}
                      className="px-2 py-0.5 bg-muted hover:bg-muted/80 rounded text-[10px] font-semibold text-foreground border border-border"
                    >
                      📦 Raw Material Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => setRtgsReason(`ADVANCE PAYMENT: ${selectedPayee.name}`)}
                      className="px-2 py-0.5 bg-muted hover:bg-muted/80 rounded text-[10px] font-semibold text-foreground border border-border"
                    >
                      ⚡ Advance Payment
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setRtgsReason(`BILL PAYMENT - ${selectedPayee.name}`)}
                  className="px-2 py-0.5 bg-muted hover:bg-muted/80 rounded text-[10px] font-semibold text-foreground border border-border"
                >
                  📑 Invoice Clearance
                </button>
              </div>
            </div>

            {/* Date & Cheque */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={rtgsDate}
                  onChange={(e) => setRtgsDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                  Cheque No (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 541098"
                  value={rtgsChequeNo}
                  onChange={(e) => setRtgsChequeNo(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setRtgsModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateSinglePdf}
                disabled={isGenerating || !selectedPayee.accountNumber || !selectedPayee.ifscCode}
              >
                <Download className="w-4 h-4 mr-1.5" />
                {isGenerating ? 'Generating...' : 'Download Axis Bank RTGS PDF'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── 2. BULK RTGS GENERATOR MODAL ── */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Bulk Axis Bank RTGS Generator (${bulkRows.length} Payees)`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          
          {/* Default Reason & Date Banner */}
          <div className="bg-muted/40 border border-border p-3.5 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Common Narration / Reason:
              </label>
              <div className="flex gap-2">
                <Input
                  value={bulkDefaultReason}
                  onChange={(e) => setBulkDefaultReason(e.target.value)}
                  placeholder="e.g. STAFF SALARY ADVANCE or VENDOR PAYMENT"
                  className="h-8 text-xs"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleApplyDefaultReasonToAll}
                  className="h-8 whitespace-nowrap text-xs font-semibold"
                >
                  Apply to All
                </Button>
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Transfer Date:
              </label>
              <Input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="md:col-span-3 text-right">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Bulk Sum:</div>
              <div className="text-base font-bold text-primary font-mono">
                ₹ {bulkTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Payee Rows Table */}
          <div className="border border-border rounded-xl overflow-hidden max-h-[45vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold sticky top-0 border-b border-border z-10">
                <tr>
                  <th className="px-3 py-2.5">Beneficiary</th>
                  <th className="px-3 py-2.5">Bank & Account</th>
                  <th className="px-3 py-2.5 w-36">Amount (₹) *</th>
                  <th className="px-3 py-2.5 w-64">Reason / Narration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bulkRows.map((r, i) => (
                  <tr key={r.payee.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-semibold">
                      <div>{r.payee.name}</div>
                      <span className="text-[10px] text-muted-foreground">{r.payee.category}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      <div>{r.payee.accountNumber || <span className="text-destructive font-sans">Missing Acc #</span>}</div>
                      <span className="text-primary font-semibold">{r.payee.ifscCode}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={r.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkRows(prev => prev.map((row, idx) => idx === i ? { ...row, amount: val } : row));
                        }}
                        className="h-8 text-xs font-bold text-foreground"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={r.reason}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkRows(prev => prev.map((row, idx) => idx === i ? { ...row, reason: val } : row));
                        }}
                        className="h-8 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
            {/* Export CSV */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportBulkCsv}
              disabled={isGeneratingBulk}
              className="text-xs"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Export Axis Bank CSV
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkModalOpen(false)}
                disabled={isGeneratingBulk}
              >
                Cancel
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={handleGenerateBulkIndividual}
                disabled={isGeneratingBulk}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Batch Downloads
              </Button>

              <Button
                size="sm"
                onClick={handleGenerateBulkCombined}
                disabled={isGeneratingBulk}
                className="font-bold shadow-sm"
              >
                <Layers className="w-4 h-4 mr-1.5" />
                {isGeneratingBulk ? 'Compiling PDF...' : `Download Combined PDF (${bulkRows.length} Slips)`}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── 3. SAVE / EDIT PAYEE BANK DETAILS MODAL ── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Save RTGS Bank Details"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Beneficiary / Payee Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. FLEXEN SPECIALITY CHEMICALS"
              value={editForm.name || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
              className="uppercase text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Category
            </label>
            <select
              value={editForm.category || 'SUPPLIER'}
              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="SUPPLIER">Supplier / Raw Material Vendor</option>
              <option value="EMPLOYEE">Staff Member (Employee Advance)</option>
              <option value="OTHER">Other Payee (Utility / Rent / Freight)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Bank Name (e.g. HDFC Bank, SBI, ICICI, Axis Bank)
            </label>
            <Input
              placeholder="e.g. STATE BANK OF INDIA"
              value={editForm.bankName || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, bankName: e.target.value.toUpperCase() }))}
              className="uppercase text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Bank Account Number <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. 123456789012"
              value={editForm.accountNumber || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, accountNumber: e.target.value.trim() }))}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                IFSC Code <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. SBIN0001234"
                value={editForm.ifscCode || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, ifscCode: e.target.value.trim().toUpperCase() }))}
                className="font-mono font-bold text-primary uppercase text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Branch City
              </label>
              <Input
                placeholder="e.g. NAVSARI"
                value={editForm.branch || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, branch: e.target.value.toUpperCase() }))}
                className="uppercase text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSavePayeeDetails}>
              Save RTGS Details
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
