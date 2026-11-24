import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Landmark, Download, Plus, Search, Edit2, Trash2, CheckCircle2, 
  AlertCircle, Building2, Users, FileText, Layers, FileSpreadsheet,
  CheckSquare, Square, Clock, History, FileCheck, ArrowDownToLine,
  ShieldCheck, Lock, Unlock, Check, X, RefreshCw, Zap, DollarSign,
  Truck, Flame
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/Modal';
import { useSettings } from '@/hooks/inventory/useMasters';
import { useAuth } from '@/contexts/AuthContext';
import { generateRTGSSlip, generateCombinedBulkRTGSPdf, RTGSData } from '@/utils/pdfGenerator';
import { 
  saveRtgsRecord, saveBulkRtgsRecords, getRtgsHistory, 
  deleteRtgsRecord, clearRtgsHistory, RtgsHistoryRecord 
} from '@/utils/rtgsHistory';
import { formatIndianAmountInput, parseIndianAmount } from '@/utils/format';
import { amountToWords } from '@/components/PDF/utils/amountToWords';
import { rtgsService, RtgsRequestItem, RtgsStatus, RtgsPayeeCategory } from '@/api/services/rtgs.service';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';

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

const EXPENSE_HEAD_OPTIONS = [
  { value: 'STAFF_SALARY', label: 'Staff Salary / Advance (Salary)', category: 'SALARY' },
  { value: 'RAW_MATERIAL', label: 'Raw Material / Vendor Payment (Supplier)', category: 'SUPPLIER' },
  { value: 'FREIGHT_OUTWARD', label: 'Outward Freight / Transporter (Transport)', category: 'TRANSPORTATION' },
  { value: 'FREIGHT_INWARD', label: 'Inward Freight (RM Transport)', category: 'TRANSPORTATION' },
  { value: 'ELECTRICITY_POWER', label: 'Electricity & Power Bill (DGVCL)', category: 'ELECTRICITY' },
  { value: 'PLANT_MAINTENANCE', label: 'Machinery Repair & Spares', category: 'OTHER' },
  { value: 'FACTORY_RENT', label: 'Factory / Godown Rent', category: 'OTHER' },
  { value: 'DIESEL_FUEL', label: 'Diesel / Fuel (Forklift/Gen)', category: 'OTHER' },
  { value: 'HAMALI_CONTRACT', label: 'Hamali & Loading Labour', category: 'OTHER' },
  { value: 'ADMIN_OFFICE', label: 'Admin, Office & Utilities', category: 'OTHER' },
  { value: 'PROFESSIONAL_FEES', label: 'CA, GST & Legal Fees', category: 'OTHER' },
  { value: 'INSURANCE_COMPLIANCE', label: 'Insurance & Statutory', category: 'OTHER' },
  { value: 'CAPEX_ASSET', label: 'Capital Asset Purchase', category: 'OTHER' },
];

export default function BankRtgsHubPage() {
  const [searchParams] = useSearchParams();
  const { data: settings } = useSettings();
  const { user } = useAuth();

  // SuperAdmin / Director check for Maker-Checker workflow (strictly SuperAdmin/Director only, NOT standard Admin)
  const isSuperAdminOrDirector = useMemo(() => {
    const role = (user?.role || '').toUpperCase();
    return ['SUPERADMIN', 'SUPER_ADMIN', 'DIRECTOR'].includes(role) || user?.is_superuser === true;
  }, [user]);

  // Top level View: SuperAdmin defaults to APPROVALS desk; Maker/Admin defaults to PAYEES master
  const [activeMainTab, setActiveMainTab] = useState<'APPROVALS' | 'PAYEES' | 'HISTORY'>(() => {
    const role = (user?.role || '').toUpperCase();
    const isSuper = ['SUPERADMIN', 'SUPER_ADMIN', 'DIRECTOR'].includes(role) || user?.is_superuser === true;
    return isSuper ? 'APPROVALS' : 'PAYEES';
  });

  // ──────────────────────────────────────────────────────────
  // 1. APPROVAL QUEUE STATE
  // ──────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<RtgsRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('ALL');
  const [approvalCategoryFilter, setApprovalCategoryFilter] = useState<string>('ALL');
  const [approvalSearch, setApprovalSearch] = useState<string>('');
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // UTR Entry Modal State
  const [utrModalOpen, setUtrModalOpen] = useState(false);
  const [selectedRequestForUtr, setSelectedRequestForUtr] = useState<RtgsRequestItem | null>(null);
  const [utrNumberInput, setUtrNumberInput] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);

  // Fetch approval requests from backend
  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await rtgsService.getRequests({
        status: approvalStatusFilter !== 'ALL' ? approvalStatusFilter : undefined,
        category: approvalCategoryFilter !== 'ALL' ? approvalCategoryFilter : undefined,
        search: approvalSearch.trim() || undefined,
      });
      const data = (res as any)?.data?.data || (res as any)?.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch RTGS requests:', err);
      toast.error('Failed to load RTGS payment requests');
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'APPROVALS') {
      fetchRequests();
    }
  }, [activeMainTab, approvalStatusFilter, approvalCategoryFilter]);

  // Filter requests locally for quick search
  const filteredRequests = useMemo(() => {
    if (!approvalSearch.trim()) return requests;
    const q = approvalSearch.toLowerCase().trim();
    return requests.filter(r =>
      r.beneficiary_name.toLowerCase().includes(q) ||
      r.approval_code.toLowerCase().includes(q) ||
      r.account_number.toLowerCase().includes(q) ||
      (r.ifsc_code && r.ifsc_code.toLowerCase().includes(q)) ||
      (r.narration && r.narration.toLowerCase().includes(q)) ||
      (r.bill_number && r.bill_number.toLowerCase().includes(q))
    );
  }, [requests, approvalSearch]);

  // Request KPI Counts
  const requestMetrics = useMemo(() => {
    const pendingList = requests.filter(r => r.status === 'PENDING');
    const approvedList = requests.filter(r => r.status === 'APPROVED');
    const paidList = requests.filter(r => r.status === 'PAID');

    return {
      totalCount: requests.length,
      pendingCount: pendingList.length,
      pendingAmount: pendingList.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
      approvedCount: approvedList.length,
      approvedAmount: approvedList.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
      paidCount: paidList.length,
      paidAmount: paidList.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    };
  }, [requests]);

  // Single Approve handler
  const handleApproveSingle = async (req: RtgsRequestItem) => {
    try {
      await rtgsService.approveRequest(req.id);
      toast.success(`✓ RTGS Request #${req.approval_code} approved! PDF download is now UNLOCKED.`);
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to approve RTGS request');
    }
  };

  // Single Reject handler
  const handleRejectSingle = async (req: RtgsRequestItem) => {
    const reason = prompt(`Enter rejection reason for request #${req.approval_code}:`);
    if (reason === null) return;
    try {
      await rtgsService.rejectRequest(req.id, reason || 'Rejected by administrator');
      toast.info(`Request #${req.approval_code} marked as rejected.`);
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to reject request');
    }
  };

  // Bulk Approve handler
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedRequestIds);
    if (ids.length === 0) {
      toast.error('Please select requests to approve');
      return;
    }
    const pendingTargets = requests.filter(r => ids.includes(r.id) && r.status === 'PENDING');
    if (pendingTargets.length === 0) {
      toast.info('No pending requests found among selected items to approve');
      return;
    }

    setIsBulkApproving(true);
    try {
      await rtgsService.bulkApproveRequests(pendingTargets.map(t => t.id));
      toast.success(`🎉 Approved ${pendingTargets.length} RTGS requests! PDFs are now UNLOCKED.`);
      setSelectedRequestIds(new Set());
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to bulk approve');
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Mark Paid & UTR Handler
  const handleOpenUtrModal = (req: RtgsRequestItem) => {
    setSelectedRequestForUtr(req);
    setUtrNumberInput(req.utr_number || '');
    setUtrModalOpen(true);
  };

  const handleConfirmUtrPaid = async () => {
    if (!selectedRequestForUtr) return;
    if (!utrNumberInput.trim()) {
      toast.error('Please enter the Bank UTR number to confirm payment.');
      return;
    }

    setIsSubmittingUtr(true);
    try {
      await rtgsService.markPaid(selectedRequestForUtr.id, utrNumberInput.trim());
      toast.success(`✓ Marked #${selectedRequestForUtr.approval_code} as PAID with UTR ${utrNumberInput.trim()}`);
      setUtrModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record UTR');
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  // Strict PDF Download Gate: Locks if not approved!
  const handleDownloadRequestPdf = async (req: RtgsRequestItem) => {
    if (req.status === 'PENDING') {
      toast.error('🔒 Locked: SuperAdmin approval is required before downloading this Axis Bank RTGS PDF!');
      return;
    }
    if (req.status === 'REJECTED') {
      toast.error('❌ Cannot download: This payment request was rejected.');
      return;
    }

    try {
      const payload: RTGSData = {
        beneficiaryName: req.beneficiary_name,
        bankName: req.bank_name || 'AXIS BANK',
        accountNumber: req.account_number,
        ifscCode: req.ifsc_code,
        amount: Number(req.amount),
        date: req.payment_date || req.bill_date || new Date().toISOString().slice(0, 10),
        companyName: settings?.company_name || settings?.companyName || 'KAMLA CONCHEM PVT.LTD',
        companyAccount: req.company_account || settings?.company_bank_account || '925030009706188',
        companyBank: req.company_bank || settings?.company_bank_name || 'AXIS BANK',
        companyBranch: settings?.company_bank_branch || 'LUNSIKUI, NAVSARI',
        companyIfsc: settings?.company_bank_ifsc || 'UTIB0000047',
        companyAddress: settings?.company_address || 'BLOCK NO:183BHATTAI NAVSARI',
        companyPan: settings?.company_gst ? settings.company_gst.slice(2, 12) : 'AALCK3507C',
        companyPhone: settings?.company_phone || '8866322700',
        beneficiaryBranch: req.branch || 'NAVSARI',
        narration: (req.narration || `RTGS ${req.beneficiary_name}`).toUpperCase(),
      };

      await generateRTGSSlip(payload);

      saveRtgsRecord({
        date: payload.date || new Date().toISOString().slice(0, 10),
        beneficiaryName: req.beneficiary_name,
        category: req.payee_category === 'SALARY' ? 'EMPLOYEE' : (req.payee_category === 'SUPPLIER' ? 'SUPPLIER' : 'OTHER'),
        bankName: payload.bankName,
        accountNumber: payload.accountNumber,
        ifscCode: payload.ifscCode,
        branch: payload.beneficiaryBranch,
        amount: Number(req.amount),
        narration: payload.narration || req.narration,
        chequeNumber: req.cheque_number || undefined,
        source: 'APPROVAL_GATE',
        companyAccount: payload.companyAccount,
        companyBank: payload.companyBank,
      });

      setHistoryRecords(getRtgsHistory());
      toast.success(`🎉 Official Axis Bank RTGS PDF generated for ${req.beneficiary_name}!`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate Axis Bank RTGS PDF.');
    }
  };

  // Bulk Download Approved Combined PDF
  const handleDownloadBulkApprovedPdf = async () => {
    const ids = Array.from(selectedRequestIds);
    if (ids.length === 0) {
      toast.error('Please select requests to download');
      return;
    }
    const selectedList = requests.filter(r => ids.includes(r.id));
    const pendingList = selectedList.filter(r => r.status === 'PENDING');
    if (pendingList.length > 0) {
      toast.error(`🔒 Cannot download: ${pendingList.length} of the selected requests are still PENDING SuperAdmin approval! Only approved requests can be downloaded.`);
      return;
    }
    const eligibleList = selectedList.filter(r => r.status === 'APPROVED' || r.status === 'PAID');
    if (eligibleList.length === 0) {
      toast.error('No approved requests found in selection.');
      return;
    }

    setIsBulkDownloading(true);
    try {
      const items: RTGSData[] = eligibleList.map(req => ({
        beneficiaryName: req.beneficiary_name,
        bankName: req.bank_name || 'AXIS BANK',
        accountNumber: req.account_number,
        ifscCode: req.ifsc_code,
        amount: Number(req.amount),
        date: req.payment_date || req.bill_date || new Date().toISOString().slice(0, 10),
        companyName: settings?.company_name || settings?.companyName || 'KAMLA CONCHEM PVT.LTD',
        companyAccount: req.company_account || settings?.company_bank_account || '925030009706188',
        companyBank: req.company_bank || settings?.company_bank_name || 'AXIS BANK',
        companyBranch: settings?.company_bank_branch || 'LUNSIKUI, NAVSARI',
        companyIfsc: settings?.company_bank_ifsc || 'UTIB0000047',
        companyAddress: settings?.company_address || 'BLOCK NO:183BHATTAI NAVSARI',
        companyPan: settings?.company_gst ? settings.company_gst.slice(2, 12) : 'AALCK3507C',
        companyPhone: settings?.company_phone || '8866322700',
        beneficiaryBranch: req.branch || 'NAVSARI',
        narration: (req.narration || `RTGS ${req.beneficiary_name}`).toUpperCase(),
      }));

      await generateCombinedBulkRTGSPdf(items);

      saveBulkRtgsRecords(items.map(it => ({
        date: it.date || new Date().toISOString().slice(0, 10),
        beneficiaryName: it.beneficiaryName,
        category: 'OTHER',
        bankName: it.bankName,
        accountNumber: it.accountNumber,
        ifscCode: it.ifscCode,
        branch: it.beneficiaryBranch,
        amount: it.amount,
        narration: it.narration || '',
        source: 'APPROVAL_BULK',
        companyAccount: it.companyAccount,
        companyBank: it.companyBank,
      })));

      setHistoryRecords(getRtgsHistory());
      toast.success(`🎉 Downloaded combined multi-page Axis Bank RTGS PDF for ${items.length} approved payments!`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate combined bulk PDF');
    } finally {
      setIsBulkDownloading(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // 2. PAYEES MASTER & OFFLINE ARCHIVE STATE
  // ──────────────────────────────────────────────────────────
  const [historyRecords, setHistoryRecords] = useState<RtgsHistoryRecord[]>(() => getRtgsHistory());
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategory, setHistoryCategory] = useState<string>('ALL');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());

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

  const [searchQuery, setSearchQuery] = useState('');
  const initialTab = (searchParams.get('tab') || 'ALL').toUpperCase();
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER'>(
    initialTab === 'SUPPLIER' || initialTab === 'EMPLOYEE' || initialTab === 'OTHER' ? initialTab : 'ALL'
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single Maker Modal state
  const [rtgsModalOpen, setRtgsModalOpen] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<RtgsPayee | null>(null);
  const [rtgsCategory, setRtgsCategory] = useState<RtgsPayeeCategory>('SUPPLIER');
  const [rtgsExpenseHead, setRtgsExpenseHead] = useState<string>('RAW_MATERIAL');
  const [rtgsAmount, setRtgsAmount] = useState<string>('');
  const [rtgsReason, setRtgsReason] = useState<string>('');
  const [rtgsDate, setRtgsDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rtgsBillNo, setRtgsBillNo] = useState<string>('');
  const [rtgsChequeNo, setRtgsChequeNo] = useState<string>('');
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Bulk Maker Modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<Array<{
    payee: RtgsPayee;
    amount: string;
    reason: string;
    category: RtgsPayeeCategory;
    expenseHead: string;
  }>>([]);
  const [bulkDefaultReason, setBulkDefaultReason] = useState<string>('PAYMENT');
  const [bulkDefaultAmount, setBulkDefaultAmount] = useState<string>('');
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

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
    });
  }, []);

  // Consolidate all payees into a single unified list
  const allPayees = useMemo<RtgsPayee[]>(() => {
    const list: RtgsPayee[] = [];

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

  // Payees selection
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
    setRtgsBillNo('');
    setRtgsChequeNo('');

    if (payee.category === 'EMPLOYEE') {
      setRtgsCategory('SALARY');
      setRtgsExpenseHead('STAFF_SALARY');
      setRtgsReason(`STAFF SALARY ADVANCE - ${payee.name}`);
    } else if (payee.category === 'SUPPLIER') {
      setRtgsCategory('SUPPLIER');
      setRtgsExpenseHead('RAW_MATERIAL');
      setRtgsReason(`SUPPLIER PAYMENT - ${payee.name}`);
    } else {
      setRtgsCategory('OTHER');
      setRtgsExpenseHead('ADMIN_OFFICE');
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

    const defaultCat: RtgsPayeeCategory = activeCategory === 'EMPLOYEE' ? 'SALARY' : (activeCategory === 'SUPPLIER' ? 'SUPPLIER' : 'OTHER');
    const defaultHead = defaultCat === 'SALARY' ? 'STAFF_SALARY' : (defaultCat === 'SUPPLIER' ? 'RAW_MATERIAL' : 'ADMIN_OFFICE');
    const defaultReason = defaultCat === 'SALARY' ? 'STAFF SALARY' : (defaultCat === 'SUPPLIER' ? 'SUPPLIER PAYMENT' : 'REMITTANCE');

    setBulkDefaultReason(defaultReason);
    setBulkDefaultAmount('');
    setBulkDate(new Date().toISOString().slice(0, 10));
    setBulkRows(targets.map(p => ({
      payee: p,
      amount: '',
      reason: `${defaultReason} - ${p.name}`,
      category: p.category === 'EMPLOYEE' ? 'SALARY' : (p.category === 'SUPPLIER' ? 'SUPPLIER' : 'OTHER'),
      expenseHead: p.category === 'EMPLOYEE' ? 'STAFF_SALARY' : (p.category === 'SUPPLIER' ? 'RAW_MATERIAL' : 'ADMIN_OFFICE'),
    })));

    setBulkModalOpen(true);
  };

  // Apply default reason to bulk
  const handleApplyDefaultReasonToAll = () => {
    if (!bulkDefaultReason.trim()) return;
    setBulkRows(prev => prev.map(r => ({
      ...r,
      reason: `${bulkDefaultReason.trim()} - ${r.payee.name}`
    })));
    toast.success('Applied reason to all selected payees!');
  };

  // Apply default amount to bulk
  const handleApplyDefaultAmountToAll = () => {
    if (!bulkDefaultAmount.trim()) return;
    const formatted = formatIndianAmountInput(bulkDefaultAmount);
    setBulkRows(prev => prev.map(r => ({
      ...r,
      amount: formatted,
    })));
    toast.success(`Applied ₹${formatted} to all selected payees!`);
  };

  // Submit Single RTGS Request for SuperAdmin Approval (Maker Flow)
  const handleSubmitSingleRtgs = async (directApprove: boolean = false) => {
    if (!selectedPayee) return;

    const amt = parseIndianAmount(rtgsAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid transfer amount.');
      return;
    }
    if (!selectedPayee.accountNumber) {
      toast.error('Bank Account Number is missing. Please edit and save it first.');
      return;
    }
    if (!selectedPayee.ifscCode) {
      toast.error('IFSC Code is missing. Please edit and save it first.');
      return;
    }

    setIsSubmittingSingle(true);
    try {
      const payload = {
        payee_category: rtgsCategory,
        expense_head: rtgsExpenseHead,
        beneficiary_name: selectedPayee.name,
        bank_name: selectedPayee.bankName || 'AXIS BANK',
        account_number: selectedPayee.accountNumber,
        ifsc_code: selectedPayee.ifscCode,
        branch: selectedPayee.branch || 'NAVSARI',
        amount: amt,
        bill_date: rtgsDate,
        payment_date: rtgsDate,
        bill_number: rtgsBillNo || undefined,
        cheque_number: rtgsChequeNo || undefined,
        narration: (rtgsReason || `RTGS ${selectedPayee.name}`).toUpperCase(),
        company_account: settings?.company_bank_account || '925030009706188',
        company_bank: settings?.company_bank_name || 'AXIS BANK',
      };

      const res = await rtgsService.createRequest(payload);
      const createdItem = (res as any)?.data?.data || (res as any)?.data;

      if (directApprove && isSuperAdminOrDirector && createdItem?.id) {
        // Direct SuperAdmin execution
        await rtgsService.approveRequest(createdItem.id, 'Directly approved by SuperAdmin');
        toast.success(`✓ RTGS Request approved and queued! Generating PDF...`);
        await handleDownloadRequestPdf({ ...createdItem, status: 'APPROVED' });
      } else {
        toast.success(`🔒 RTGS Payment Request queued for SuperAdmin approval! Status: PENDING.`);
      }

      setRtgsModalOpen(false);
      setActiveMainTab('APPROVALS');
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit RTGS request');
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // Submit Bulk RTGS for SuperAdmin Approval (Maker Flow)
  const handleSubmitBulkRtgs = async () => {
    const validRows = bulkRows.filter(r => parseIndianAmount(r.amount) > 0 && r.payee.accountNumber && r.payee.ifscCode);
    if (validRows.length === 0) {
      toast.error('Please enter valid transfer amounts for payees with complete bank credentials.');
      return;
    }

    setIsSubmittingBulk(true);
    try {
      const batchPayload = validRows.map(r => ({
        payee_category: r.category,
        expense_head: r.expenseHead,
        beneficiary_name: r.payee.name,
        bank_name: r.payee.bankName || 'AXIS BANK',
        account_number: r.payee.accountNumber,
        ifsc_code: r.payee.ifscCode,
        branch: r.payee.branch || 'NAVSARI',
        amount: parseIndianAmount(r.amount),
        bill_date: bulkDate,
        payment_date: bulkDate,
        narration: (r.reason || `RTGS ${r.payee.name}`).toUpperCase(),
        company_account: settings?.company_bank_account || '925030009706188',
        company_bank: settings?.company_bank_name || 'AXIS BANK',
        source: 'HUB_BULK',
      }));

      await rtgsService.createRequest(batchPayload);
      toast.success(`🎉 Queued ${batchPayload.length} RTGS requests for SuperAdmin approval! Status: PENDING.`);
      setBulkModalOpen(false);
      setSelectedIds(new Set());
      setActiveMainTab('APPROVALS');
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit bulk RTGS requests');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Edit / Save Payee
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

  // Helper category badge renderer
  const renderCategoryBadge = (cat?: string) => {
    const c = (cat || '').toUpperCase();
    if (c === 'SALARY') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1">
          <Users className="w-3 h-3 text-amber-600" /> Salary
        </span>
      );
    }
    if (c === 'SUPPLIER') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold inline-flex items-center gap-1">
          <Building2 className="w-3 h-3 text-blue-600" /> Supplier
        </span>
      );
    }
    if (c === 'TRANSPORTATION') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold inline-flex items-center gap-1">
          <Truck className="w-3 h-3 text-purple-600" /> Transport
        </span>
      );
    }
    if (c === 'ELECTRICITY') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
          <Zap className="w-3 h-3 text-emerald-600" /> Electricity
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold inline-flex items-center gap-1">
        <FileText className="w-3 h-3 text-slate-500" /> Other
      </span>
    );
  };

  return (
    <div className="flex-1 w-full min-w-0 p-4 md:p-6 bg-background text-foreground space-y-5">
      {/* ── TOP HEADER ── */}
      <div className="bg-card text-card-foreground border border-border p-4 md:p-5 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                Bank RTGS & Approval Center
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Maker-Checker Gate
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submit RTGS for Salary, Suppliers, Transporters or Electricity bills. SuperAdmin approves before PDF download unlocks.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeMainTab === 'APPROVALS' && isSuperAdminOrDirector && selectedRequestIds.size > 0 && (
            <Button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Approve Selected ({selectedRequestIds.size})
            </Button>
          )}

          {activeMainTab === 'APPROVALS' && selectedRequestIds.size > 0 && (
            <Button
              onClick={handleDownloadBulkApprovedPdf}
              disabled={isBulkDownloading}
              variant="outline"
              className="border-blue-500/40 text-blue-700 dark:text-blue-400 font-bold text-xs h-8 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download Approved Combined PDF
            </Button>
          )}

          {activeMainTab === 'PAYEES' && selectedIds.size > 0 && (
            <Button
              onClick={openBulkModal}
              className="font-bold text-xs h-8 cursor-pointer shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 mr-1" />
              Bulk RTGS ({selectedIds.size})
            </Button>
          )}

          {activeMainTab === 'PAYEES' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditModal()}
              className="text-xs h-8 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Payee
            </Button>
          )}
        </div>
      </div>

      {/* ── MAIN TAB SWITCHER: APPROVALS VS PAYEES MASTER VS OFFLINE ARCHIVE ── */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => {
            setActiveMainTab('APPROVALS');
            fetchRequests();
          }}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer",
            activeMainTab === 'APPROVALS'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isSuperAdminOrDirector ? 'SuperAdmin Approval Queue' : 'Submitted Requests & Status'}</span>
          {requestMetrics.pendingCount > 0 && (
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono font-bold animate-pulse">
              {requestMetrics.pendingCount} Pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('PAYEES')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer",
            activeMainTab === 'PAYEES'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Users className="w-4 h-4" />
          <span>Payees Master</span>
          <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono font-semibold">
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab('HISTORY');
            setHistoryRecords(getRtgsHistory());
          }}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer",
            activeMainTab === 'HISTORY'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Downloaded Slips Archive</span>
          <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono font-semibold">
            {historyRecords.length}
          </span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          TAB 1: APPROVAL & PAYMENT QUEUE (THE MAKER-CHECKER HUB)
      ────────────────────────────────────────────────────────── */}
      {activeMainTab === 'APPROVALS' && (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Pending SuperAdmin Approval
                </span>
                <span className="text-xs font-mono font-bold">{requestMetrics.pendingCount} requests</span>
              </div>
              <div className="text-2xl font-black text-amber-950 mt-1">
                ₹{requestMetrics.pendingAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">
                🔒 PDF download is locked until approved
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved / Ready for PDF
                </span>
                <span className="text-xs font-mono font-bold">{requestMetrics.approvedCount} ready</span>
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                ₹{requestMetrics.approvedAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">
                ✓ PDF download unlocked & verified
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-blue-800">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" /> Paid & UTR Confirmed
                </span>
                <span className="text-xs font-mono font-bold">{requestMetrics.paidCount} completed</span>
              </div>
              <div className="text-2xl font-black text-blue-950 mt-1">
                ₹{requestMetrics.paidAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-blue-700/80 mt-0.5">
                Bank transaction cleared
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-card border border-border p-3 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={approvalStatusFilter}
                onChange={(e) => setApprovalStatusFilter(e.target.value)}
                className="text-xs h-8 px-2.5 rounded-lg border border-border bg-background font-semibold"
              >
                <option value="ALL">All Statuses ({requests.length})</option>
                <option value="PENDING">Pending Approval ({requestMetrics.pendingCount})</option>
                <option value="APPROVED">Approved / Unlocked ({requestMetrics.approvedCount})</option>
                <option value="PAID">Paid / Completed ({requestMetrics.paidCount})</option>
                <option value="REJECTED">Rejected</option>
              </select>

              {/* Category Filter */}
              <select
                value={approvalCategoryFilter}
                onChange={(e) => setApprovalCategoryFilter(e.target.value)}
                className="text-xs h-8 px-2.5 rounded-lg border border-border bg-background font-semibold"
              >
                <option value="ALL">All Categories</option>
                <option value="SALARY">Salary / Staff Advances</option>
                <option value="SUPPLIER">Supplier Payments</option>
                <option value="TRANSPORTATION">Transporter / Freight</option>
                <option value="ELECTRICITY">Electricity Bill (DGVCL)</option>
                <option value="OTHER">Other Operational</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchRequests}
                className="h-8 text-xs font-semibold"
              >
                <RefreshCw className={cn("w-3 h-3 mr-1", requestsLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search beneficiary, approval code, a/c #..."
                value={approvalSearch}
                onChange={(e) => setApprovalSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Requests Queue Table */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            {requestsLoading ? (
              <div className="py-16 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span>Loading RTGS approval queue...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">No RTGS Requests Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No payment requests match the current filters. When Accounts creates an RTGS request, it will appear here for SuperAdmin review.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveMainTab('PAYEES')}
                  className="mt-2 text-xs font-semibold cursor-pointer"
                >
                  Go to Payees Master to create RTGS →
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-black tracking-wider border-b border-border">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedRequestIds.size === filteredRequests.length) {
                              setSelectedRequestIds(new Set());
                            } else {
                              setSelectedRequestIds(new Set(filteredRequests.map(r => r.id)));
                            }
                          }}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {selectedRequestIds.size > 0 && selectedRequestIds.size === filteredRequests.length ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-2.5 font-bold">Approval Code & Date</th>
                      <th className="px-3 py-2.5 font-bold">Beneficiary / Bank</th>
                      <th className="px-3 py-2.5 font-bold">Category & Expense Head</th>
                      <th className="px-3 py-2.5 font-bold text-right">Amount (₹)</th>
                      <th className="px-3 py-2.5 font-bold">Requested / Reviewed</th>
                      <th className="px-3 py-2.5 font-bold text-center">Status</th>
                      <th className="px-3 py-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRequests.map((req) => {
                      const isSelected = selectedRequestIds.has(req.id);
                      const isPending = req.status === 'PENDING';
                      const isApproved = req.status === 'APPROVED';
                      const isPaid = req.status === 'PAID';

                      return (
                        <tr
                          key={req.id}
                          className={cn(
                            "hover:bg-muted/40 transition-colors",
                            isSelected && "bg-primary/5",
                            isPending && "bg-amber-50/20"
                          )}
                        >
                          {/* Checkbox */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequestIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(req.id)) next.delete(req.id);
                                  else next.add(req.id);
                                  return next;
                                });
                              }}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Approval Code & Date */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {req.approval_code}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {req.payment_date || req.bill_date || req.requested_at?.slice(0, 10)}
                            </div>
                          </td>

                          {/* Beneficiary & Bank */}
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-foreground">{req.beneficiary_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {req.bank_name} • A/C: {req.account_number} • IFSC: {req.ifsc_code}
                            </div>
                          </td>

                          {/* Category & Head */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {renderCategoryBadge(req.payee_category)}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                              {req.expense_head.replace(/_/g, ' ')}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono font-bold text-sm text-foreground">
                            ₹{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Requested / Reviewed By */}
                          <td className="px-3 py-2.5 whitespace-nowrap text-[11px]">
                            <div className="text-foreground">
                              Req: <span className="font-semibold">{req.requested_by_name || 'Accounts'}</span>
                            </div>
                            {req.reviewed_by_name && (
                              <div className="text-emerald-700 text-[10px]">
                                Apprv: <span className="font-semibold">{req.reviewed_by_name}</span>
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {isPending && (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black inline-flex items-center gap-1 shadow-xs">
                                <Lock className="w-3 h-3 text-amber-600" /> Pending Approval
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black inline-flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                              </span>
                            )}
                            {isPaid && (
                              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-black inline-flex items-center gap-1 shadow-xs">
                                <FileCheck className="w-3 h-3 text-blue-600" /> Paid
                              </span>
                            )}
                            {req.status === 'REJECTED' && (
                              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black inline-flex items-center gap-1 shadow-xs">
                                <X className="w-3 h-3 text-rose-600" /> Rejected
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* SuperAdmin Approve Button */}
                              {isPending && isSuperAdminOrDirector && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveSingle(req)}
                                    className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1"
                                    title="Approve this RTGS payment request"
                                  >
                                    <Check className="w-3 h-3" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectSingle(req)}
                                    className="h-7 px-2 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
                                    title="Reject request"
                                  >
                                    <X className="w-3 h-3" /> Reject
                                  </Button>
                                </>
                              )}

                              {/* Download PDF button (Locked if pending!) */}
                              {isPending ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="h-7 px-2 text-[10px] font-bold opacity-60 bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed gap-1"
                                  title="Locked: Cannot download Axis RTGS form until approved by SuperAdmin"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" /> PDF Locked
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadRequestPdf(req)}
                                  className="h-7 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1 shadow-xs"
                                  title="Download Official Axis Bank RTGS Slip"
                                >
                                  <Download className="w-3 h-3" /> RTGS PDF
                                </Button>
                              )}

                              {/* Mark Paid / UTR */}
                              {isApproved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenUtrModal(req)}
                                  className="h-7 px-2 text-[10px] font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                                  title="Confirm payment & enter Bank UTR number"
                                >
                                  Enter UTR
                                </Button>
                              )}

                              {isPaid && req.utr_number && (
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border" title={`UTR: ${req.utr_number}`}>
                                  UTR: {req.utr_number}
                                </span>
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
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 2: PAYEES MASTER (SUPPLIERS, EMPLOYEES & OTHER)
      ────────────────────────────────────────────────────────── */}
      {activeMainTab === 'PAYEES' && (
        <div className="space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="bg-card border border-border p-3 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
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

          {/* Payees Table */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
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
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
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
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(payee.id)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="px-3 py-3 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{payee.name}</span>
                              {payee.designation && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({payee.designation})
                                </span>
                              )}
                            </div>
                          </td>

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

                          <td className="px-3 py-3 text-muted-foreground font-medium">
                            {payee.bankName || <span className="text-muted-foreground/60 italic">Not set</span>}
                          </td>

                          <td className="px-3 py-3 font-mono">
                            {payee.accountNumber ? (
                              <span className="bg-muted/70 px-2 py-0.5 rounded text-foreground font-semibold">
                                {payee.accountNumber}
                              </span>
                            ) : (
                              <span className="text-amber-500/80 italic">Missing</span>
                            )}
                          </td>

                          <td className="px-3 py-3 font-mono font-semibold text-primary">
                            {payee.ifscCode || <span className="text-muted-foreground/60 italic font-normal">Missing</span>}
                          </td>

                          <td className="px-3 py-3">
                            {hasBankDetails ? (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                              </span>
                            ) : (
                              <button
                                onClick={() => openEditModal(payee)}
                                className="text-amber-600 dark:text-amber-400 hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <AlertCircle className="w-3.5 h-3.5" /> Set details
                              </button>
                            )}
                          </td>

                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => openSingleRtgsModal(payee)}
                                className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
                              >
                                <Landmark className="w-3.5 h-3.5 mr-1" />
                                Create RTGS
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditModal(payee)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Edit Bank Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>

                              {payee.id.startsWith('custom_') && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeletePayee(payee.id, payee.name)}
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
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
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 3: DOWNLOADED SLIPS OFFLINE ARCHIVE
      ────────────────────────────────────────────────────────── */}
      {activeMainTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="bg-card border border-border p-3 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-foreground">
              Downloaded RTGS Slips History ({historyRecords.length} records)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (historyRecords.length === 0) return;
                const rows = historyRecords.map((r, i) => [
                  i + 1, r.date, r.beneficiaryName, r.category, r.bankName, r.accountNumber, r.ifscCode, r.amount, r.narration
                ]);
                const csv = ['Index,Date,Beneficiary,Category,Bank,Account,IFSC,Amount,Narration', ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RTGS_History_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
              className="h-8 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Export History CSV
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            {historyRecords.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs">
                No downloaded RTGS slips recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-black border-b border-border">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Beneficiary</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Bank Details</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                      <th className="p-3">Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-muted/40">
                        <td className="p-3 whitespace-nowrap font-medium text-foreground">{rec.date}</td>
                        <td className="p-3 font-bold text-foreground">{rec.beneficiaryName}</td>
                        <td className="p-3">{renderCategoryBadge(rec.category)}</td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {rec.bankName} • {rec.accountNumber} • {rec.ifscCode}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          ₹{Number(rec.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-muted-foreground truncate max-w-xs">{rec.narration || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          MODAL 1: CREATE / QUEUE SINGLE RTGS REQUEST (MAKER FLOW)
      ────────────────────────────────────────────────────────── */}
      <Modal 
        isOpen={rtgsModalOpen && !!selectedPayee} 
        onClose={() => setRtgsModalOpen(false)}
        title="Create RTGS Payment Request"
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
                  className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
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

            {/* Category & Expense Head Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
                  Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={rtgsCategory}
                  onChange={(e) => {
                    const cat = e.target.value as RtgsPayeeCategory;
                    setRtgsCategory(cat);
                    if (cat === 'SALARY') setRtgsExpenseHead('STAFF_SALARY');
                    else if (cat === 'SUPPLIER') setRtgsExpenseHead('RAW_MATERIAL');
                    else if (cat === 'TRANSPORTATION') setRtgsExpenseHead('FREIGHT_OUTWARD');
                    else if (cat === 'ELECTRICITY') setRtgsExpenseHead('ELECTRICITY_POWER');
                    else setRtgsExpenseHead('ADMIN_OFFICE');
                  }}
                  className="w-full text-xs h-8 px-2 rounded-lg border border-border bg-background font-semibold"
                >
                  <option value="SALARY">Salary / Staff Advance</option>
                  <option value="SUPPLIER">Supplier / Raw Material</option>
                  <option value="TRANSPORTATION">Transporter / Freight</option>
                  <option value="ELECTRICITY">Electricity Bill (DGVCL)</option>
                  <option value="OTHER">Other Operational Head</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
                  Expense Head
                </label>
                <select
                  value={rtgsExpenseHead}
                  onChange={(e) => setRtgsExpenseHead(e.target.value)}
                  className="w-full text-xs h-8 px-2 rounded-lg border border-border bg-background font-medium"
                >
                  {EXPENSE_HEAD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Transfer Amount (₹) <span className="text-destructive">*</span>
                </label>
                {parseIndianAmount(rtgsAmount) > 0 && (
                  <span className="text-[11px] font-bold text-primary font-mono">
                    ₹{formatIndianAmountInput(rtgsAmount)}
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2 text-base font-bold text-primary select-none">₹</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1,00,000"
                  value={rtgsAmount}
                  onChange={(e) => setRtgsAmount(formatIndianAmountInput(e.target.value))}
                  className="pl-9 text-base font-bold font-mono tracking-wide text-foreground h-9"
                />
              </div>

              {parseIndianAmount(rtgsAmount) > 0 && (
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                    Amount in Words (Axis Bank Mandate):
                  </div>
                  <div className="font-bold text-primary text-[12px] leading-tight">
                    {amountToWords(parseIndianAmount(rtgsAmount))}
                  </div>
                </div>
              )}
            </div>

            {/* Reason Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                Narration / Purpose <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Staff Salary / Raw Material Bill / Electricity Power Bill"
                value={rtgsReason}
                onChange={(e) => setRtgsReason(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* Date & Cheque */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                  Payment Date
                </label>
                <Input
                  type="date"
                  value={rtgsDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                  Bill / Cheque No (Optional)
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

            {/* Approval Workflow Warning Notice */}
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900 text-[11px]">
              <span className="font-bold">🔒 Approval Gate: </span>
              This request will be created in <span className="font-bold text-amber-800">PENDING</span> status. The Axis Bank RTGS PDF will remain locked until SuperAdmin reviews and approves it.
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setRtgsModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleSubmitSingleRtgs(false)}
                disabled={isSubmittingSingle || !selectedPayee.accountNumber || !selectedPayee.ifscCode}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                {isSubmittingSingle ? 'Submitting...' : 'Queue for SuperAdmin Approval'}
              </Button>

              {isSuperAdminOrDirector && (
                <Button 
                  onClick={() => handleSubmitSingleRtgs(true)}
                  disabled={isSubmittingSingle || !selectedPayee.accountNumber || !selectedPayee.ifscCode}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Approve & Download PDF
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ──────────────────────────────────────────────────────────
          MODAL 2: BULK RTGS QUEUE MODAL (MAKER FLOW)
      ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Queue Bulk RTGS for SuperAdmin Approval (${bulkRows.length} Payees)`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          {/* Default Reason & Date & Amount Banner */}
          <div className="bg-muted/40 border border-border p-3 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            <div className="md:col-span-4 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Common Narration:
              </label>
              <div className="flex gap-1.5">
                <Input
                  value={bulkDefaultReason}
                  onChange={(e) => setBulkDefaultReason(e.target.value)}
                  placeholder="e.g. STAFF ADVANCE"
                  className="h-8 text-xs"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleApplyDefaultReasonToAll}
                  className="h-8 whitespace-nowrap text-[11px] font-semibold px-2 cursor-pointer"
                >
                  Apply
                </Button>
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Common Amount (₹):
              </label>
              <div className="flex gap-1.5">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={bulkDefaultAmount}
                  onChange={(e) => setBulkDefaultAmount(formatIndianAmountInput(e.target.value))}
                  placeholder="e.g. 50,000"
                  className="h-8 text-xs font-mono font-bold"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleApplyDefaultAmountToAll}
                  className="h-8 whitespace-nowrap text-[11px] font-semibold px-2 cursor-pointer"
                >
                  Apply All
                </Button>
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Date:
              </label>
              <Input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="md:col-span-2 text-right">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Batch</div>
              <div className="text-sm font-black text-primary font-mono">
                ₹{bulkRows.reduce((sum, r) => sum + parseIndianAmount(r.amount), 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Bulk Payees Table */}
          <div className="border border-border rounded-xl max-h-[350px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-muted-foreground sticky top-0 uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="p-2.5">Beneficiary</th>
                  <th className="p-2.5">Category & Head</th>
                  <th className="p-2.5">Account / IFSC</th>
                  <th className="p-2.5 w-32">Amount (₹)</th>
                  <th className="p-2.5">Narration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bulkRows.map((row, idx) => (
                  <tr key={row.payee.id} className="hover:bg-muted/40">
                    <td className="p-2.5 font-bold text-foreground">
                      {row.payee.name}
                    </td>
                    <td className="p-2.5">
                      <select
                        value={row.category}
                        onChange={(e) => {
                          const cat = e.target.value as RtgsPayeeCategory;
                          setBulkRows(prev => prev.map((r, i) => i === idx ? {
                            ...r,
                            category: cat,
                            expenseHead: cat === 'SALARY' ? 'STAFF_SALARY' : (cat === 'SUPPLIER' ? 'RAW_MATERIAL' : (cat === 'TRANSPORTATION' ? 'FREIGHT_OUTWARD' : (cat === 'ELECTRICITY' ? 'ELECTRICITY_POWER' : 'ADMIN_OFFICE')))
                          } : r));
                        }}
                        className="text-[11px] h-7 px-1.5 rounded border border-border bg-background"
                      >
                        <option value="SALARY">Salary</option>
                        <option value="SUPPLIER">Supplier</option>
                        <option value="TRANSPORTATION">Transport</option>
                        <option value="ELECTRICITY">Electricity</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {row.payee.accountNumber} • {row.payee.ifscCode}
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={row.amount}
                        onChange={(e) => {
                          const val = formatIndianAmountInput(e.target.value);
                          setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: val } : r));
                        }}
                        placeholder="₹ Amount"
                        className="h-7 text-xs font-mono font-bold"
                      />
                    </td>
                    <td className="p-2.5">
                      <Input
                        type="text"
                        value={row.reason}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, reason: val } : r));
                        }}
                        className="h-7 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitBulkRtgs}
              disabled={isSubmittingBulk}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              {isSubmittingBulk ? 'Submitting...' : `Queue All ${bulkRows.length} Requests for SuperAdmin Approval`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ──────────────────────────────────────────────────────────
          MODAL 3: UTR CONFIRMATION MODAL
      ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={utrModalOpen && !!selectedRequestForUtr}
        onClose={() => setUtrModalOpen(false)}
        title="Confirm Bank Payment & Enter UTR Number"
        maxWidth="max-w-md"
      >
        {selectedRequestForUtr && (
          <div className="space-y-3.5 text-xs">
            <div className="bg-muted/40 p-3 rounded-xl space-y-1.5 border border-border">
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Approval Code:</span>
                <span className="font-mono font-bold text-foreground">{selectedRequestForUtr.approval_code}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Beneficiary:</span>
                <span className="font-bold text-foreground">{selectedRequestForUtr.beneficiary_name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Amount:</span>
                <span className="font-bold text-primary font-mono text-sm">₹{Number(selectedRequestForUtr.amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                Bank UTR / Transaction Reference Number <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. UTIB261122001928"
                value={utrNumberInput}
                onChange={(e) => setUtrNumberInput(e.target.value)}
                className="text-xs h-9 font-mono font-bold"
              />
              <p className="text-[10px] text-muted-foreground">
                Enter the official Axis Bank transaction reference number to complete the audit trail.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setUtrModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUtrPaid}
                disabled={isSubmittingUtr || !utrNumberInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                {isSubmittingUtr ? 'Saving...' : 'Confirm Payment as PAID'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ──────────────────────────────────────────────────────────
          MODAL 4: EDIT / ADD PAYEE MODAL
      ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editForm.id?.startsWith('custom_') ? 'Add New RTGS Payee' : `Edit Bank Details — ${editForm.name}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
              Beneficiary Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={editForm.name || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Full Account Holder Name"
              className="text-xs h-8"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
              Category
            </label>
            <select
              value={editForm.category || 'SUPPLIER'}
              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full text-xs h-8 px-2 rounded-lg border border-border bg-background"
            >
              <option value="SUPPLIER">Supplier</option>
              <option value="EMPLOYEE">Staff Advance</option>
              <option value="OTHER">Other Payee</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                Bank Name
              </label>
              <Input
                value={editForm.bankName || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="e.g. AXIS BANK"
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                Branch
              </label>
              <Input
                value={editForm.branch || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, branch: e.target.value }))}
                placeholder="e.g. NAVSARI"
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                Account Number <span className="text-destructive">*</span>
              </label>
              <Input
                value={editForm.accountNumber || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="Account No"
                className="text-xs h-8 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                IFSC Code <span className="text-destructive">*</span>
              </label>
              <Input
                value={editForm.ifscCode || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                placeholder="UTIB0000047"
                className="text-xs h-8 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSavePayeeDetails} className="cursor-pointer">
              Save Payee Bank Details
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
