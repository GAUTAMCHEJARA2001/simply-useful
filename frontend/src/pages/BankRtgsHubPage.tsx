import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Landmark, Download, Plus, Search, Edit2, Trash2, CheckCircle2, 
  AlertCircle, Building2, Users, FileText, X, Sparkles, ArrowRight, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/inventory/useMasters';
import { generateRTGSSlip } from '@/utils/pdfGenerator';
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

  // RTGS Generation Modal state
  const [rtgsModalOpen, setRtgsModalOpen] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<RtgsPayee | null>(null);
  const [rtgsAmount, setRtgsAmount] = useState<string>('');
  const [rtgsReason, setRtgsReason] = useState<string>('');
  const [rtgsDate, setRtgsDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rtgsChequeNo, setRtgsChequeNo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

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
          openRtgsModal({
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
          openRtgsModal({
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

  // Open RTGS Modal
  const openRtgsModal = (payee: RtgsPayee) => {
    setSelectedPayee(payee);
    setRtgsAmount('');
    setRtgsDate(new Date().toISOString().slice(0, 10));
    setRtgsChequeNo('');

    // Default reason according to category
    if (payee.category === 'EMPLOYEE') {
      setRtgsReason(`STAFF SALARY ADVANCE - ${payee.name}`);
    } else if (payee.category === 'SUPPLIER') {
      setRtgsReason(`SUPPLIER PAYMENT - ${payee.name}`);
    } else {
      setRtgsReason(`PAYMENT - ${payee.name}`);
    }

    setRtgsModalOpen(true);
  };

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

    // If currently editing selectedPayee in open modal, sync it
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
    toast.success(`Removed ${name}.`);
  };

  // Generate Axis Bank RTGS PDF
  const handleGeneratePdf = async () => {
    if (!selectedPayee) return;

    const amt = parseFloat(rtgsAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid transfer amount.');
      return;
    }

    if (!selectedPayee.accountNumber) {
      toast.error('Bank Account Number is required. Please edit details to add it.');
      return;
    }

    if (!selectedPayee.ifscCode) {
      toast.error('IFSC Code is required. Please edit details to add it.');
      return;
    }

    setIsGenerating(true);
    try {
      // Calls the real Axis Bank fillable PDF generator using the same template as salary RTGS
      await generateRTGSSlip({
        beneficiaryName: selectedPayee.name,
        bankName: selectedPayee.bankName || 'AXIS BANK',
        accountNumber: selectedPayee.accountNumber,
        ifscCode: selectedPayee.ifscCode,
        amount: amt,
        date: rtgsDate || new Date().toISOString().slice(0, 10),
        companyName: settings?.company_name || settings?.companyName || 'KAMLA CONCHEM PVT.LTD',
        companyAccount: settings?.company_bank_account || '925030009706188',
        companyBank: settings?.company_bank_name || 'AXIS BANK',
        companyBranch: settings?.company_bank_branch || 'LUNSIKUI, NAVSARI',
        companyIfsc: settings?.company_bank_ifsc || 'UTIB0000047',
        companyAddress: settings?.company_address || 'BLOCK NO:183BHATTAI NAVSARI',
        companyPan: settings?.company_gst ? settings.company_gst.slice(2, 12) : 'AALCK3507C',
        companyPhone: settings?.company_phone || '8866322700',
        beneficiaryBranch: selectedPayee.branch || 'NAVSARI',
        narration: (rtgsReason || `RTGS ${selectedPayee.name}`).toUpperCase(),
      });

      toast.success(`🎉 Official Axis Bank RTGS Form generated & downloaded for ${selectedPayee.name}!`);
      setRtgsModalOpen(false);
    } catch (e: any) {
      console.error('RTGS Generation Error:', e);
      toast.error(e.message || 'Failed to generate Axis Bank RTGS PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      
      {/* ── TOP HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Landmark className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Axis Bank RTGS / NEFT Hub
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Official Form (02_AXIS)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Save beneficiary bank credentials once, click RTGS, enter amount & reason, and download the official Axis Bank RTGS PDF.
            </p>
          </div>
        </div>

        {/* Quick Add Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => openEditModal()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" />
            Add / Save RTGS Payee
          </button>
        </div>
      </div>

      {/* ── SEARCH & CATEGORY FILTER BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === 'ALL'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Payees ({counts.all})
          </button>

          <button
            onClick={() => setActiveCategory('SUPPLIER')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === 'SUPPLIER'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Suppliers ({counts.suppliers})
          </button>

          <button
            onClick={() => setActiveCategory('EMPLOYEE')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === 'EMPLOYEE'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Staff Advances ({counts.employees})
          </button>

          <button
            onClick={() => setActiveCategory('OTHER')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === 'OTHER'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Other ({counts.other})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search payee, account #, or IFSC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
          />
        </div>
      </div>

      {/* ── PAYEES TABLE ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading suppliers and staff payees...
          </div>
        ) : filteredPayees.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-slate-400 text-sm">No payees found matching your filter.</p>
            <button
              onClick={() => openEditModal()}
              className="text-xs text-purple-400 font-bold underline hover:text-purple-300"
            >
              + Add a new RTGS payee now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-bold">Beneficiary Name</th>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold">Bank Name</th>
                  <th className="px-4 py-3 font-bold">Account Number</th>
                  <th className="px-4 py-3 font-bold">IFSC Code</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayees.map((payee) => {
                  const hasBankDetails = Boolean(payee.accountNumber && payee.ifscCode);

                  return (
                    <tr key={payee.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3.5 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{payee.name}</span>
                          {payee.designation && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({payee.designation})
                            </span>
                          )}
                          {payee.gstNumber && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              GST: {payee.gstNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-4 py-3.5">
                        {payee.category === 'SUPPLIER' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> Supplier
                          </span>
                        )}
                        {payee.category === 'EMPLOYEE' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <Users className="w-3 h-3" /> Staff Advance
                          </span>
                        )}
                        {payee.category === 'OTHER' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold inline-flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Other Payee
                          </span>
                        )}
                      </td>

                      {/* Bank Name */}
                      <td className="px-4 py-3.5 text-slate-300 font-medium">
                        {payee.bankName || <span className="text-slate-600 italic">Not set</span>}
                      </td>

                      {/* Account Number */}
                      <td className="px-4 py-3.5 font-mono text-slate-200">
                        {payee.accountNumber ? (
                          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 font-semibold text-sky-400">
                            {payee.accountNumber}
                          </span>
                        ) : (
                          <span className="text-amber-500/80 italic">Missing account #</span>
                        )}
                      </td>

                      {/* IFSC Code */}
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                        {payee.ifscCode || <span className="text-slate-600 italic font-normal">Missing</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {hasBankDetails ? (
                          <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <button
                            onClick={() => openEditModal(payee)}
                            className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1 underline"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Save details
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* RTGS Button */}
                          <button
                            type="button"
                            onClick={() => openRtgsModal(payee)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-sm"
                          >
                            <Landmark className="w-3.5 h-3.5" />
                            RTGS
                          </button>

                          {/* Edit Details Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(payee)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit Bank Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete if custom */}
                          {payee.id.startsWith('custom_') && (
                            <button
                              type="button"
                              onClick={() => handleDeletePayee(payee.id, payee.name)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete Payee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* ── 1. GENERATE RTGS MODAL (AMOUNT & REASON) ── */}
      {rtgsModalOpen && selectedPayee && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Generate Axis Bank RTGS</h3>
                  <p className="text-[11px] text-slate-400">Official Fillable Form (02_AXIS_Real_RTGS)</p>
                </div>
              </div>
              <button
                onClick={() => setRtgsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Beneficiary summary card */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Beneficiary</span>
                  <button
                    onClick={() => {
                      setRtgsModalOpen(false);
                      openEditModal(selectedPayee);
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit Credentials
                  </button>
                </div>
                <div className="font-bold text-white text-sm">
                  {selectedPayee.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Account No:</span>
                    <span className="font-mono font-bold text-sky-400">
                      {selectedPayee.accountNumber || '⚠️ Missing - click Edit above'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">IFSC Code:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {selectedPayee.ifscCode || '⚠️ Missing'}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  Bank: <span className="font-medium text-slate-200">{selectedPayee.bankName || 'AXIS BANK'}</span> • Branch: <span className="font-medium text-slate-200">{selectedPayee.branch || 'NAVSARI'}</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Transfer Amount (₹) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-base font-bold text-purple-400">₹</span>
                  <input
                    type="number"
                    autoFocus
                    placeholder="Enter amount (e.g. 50000)"
                    value={rtgsAmount}
                    onChange={(e) => setRtgsAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-500/40 text-purple-300 text-base font-bold pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Reason / Narration Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Reason / Narration (Sender to Receiver) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Staff Advance / Raw Material Bill / Monthly Salary"
                  value={rtgsReason}
                  onChange={(e) => setRtgsReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                {/* Quick suggestion chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedPayee.category === 'EMPLOYEE' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRtgsReason(`STAFF SALARY ADVANCE - ${selectedPayee.name}`)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10px] font-semibold border border-amber-500/20"
                      >
                        ⚡ Staff Advance
                      </button>
                      <button
                        type="button"
                        onClick={() => setRtgsReason(`MONTHLY SALARY - ${selectedPayee.name}`)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-[10px] font-semibold border border-emerald-500/20"
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
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded text-[10px] font-semibold border border-blue-500/20"
                      >
                        📦 Raw Material Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => setRtgsReason(`ADVANCE PAYMENT: ${selectedPayee.name}`)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-[10px] font-semibold border border-purple-500/20"
                      >
                        ⚡ Advance Payment
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setRtgsReason(`BILL PAYMENT - ${selectedPayee.name}`)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold border border-slate-700"
                  >
                    📑 Invoice Clearance
                  </button>
                </div>
              </div>

              {/* Date & Cheque No */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={rtgsDate}
                    onChange={(e) => setRtgsDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cheque No (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 541098"
                    value={rtgsChequeNo}
                    onChange={(e) => setRtgsChequeNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRtgsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isGenerating || !selectedPayee.accountNumber || !selectedPayee.ifscCode}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/25 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Download Axis Bank RTGS PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. SAVE / EDIT PAYEE BANK DETAILS MODAL ── */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="font-bold text-sm text-white">Save RTGS Bank Details</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Beneficiary / Payee Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. FLEXEN SPECIALITY CHEMICALS"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={editForm.category || 'SUPPLIER'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg"
                >
                  <option value="SUPPLIER">Supplier / Raw Material Vendor</option>
                  <option value="EMPLOYEE">Staff Member (Employee Advance)</option>
                  <option value="OTHER">Other Payee (Utility / Rent / Freight)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Bank Name (e.g. HDFC Bank, SBI, ICICI, Axis Bank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. STATE BANK OF INDIA"
                  value={editForm.bankName || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bankName: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Bank Account Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012"
                  value={editForm.accountNumber || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, accountNumber: e.target.value.trim() }))}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    IFSC Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={editForm.ifscCode || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, ifscCode: e.target.value.trim().toUpperCase() }))}
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-bold text-xs px-3 py-2 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Branch City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NAVSARI"
                    value={editForm.branch || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, branch: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePayeeDetails}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <ShieldCheck className="w-4 h-4" />
                Save RTGS Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
