import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Printer, Download, FileText, Award, CreditCard, 
  Copy, RefreshCw, Sparkles, Briefcase, ShieldCheck, 
  ChevronsUpDown, Check, User, SlidersHorizontal, UserPlus, UserCheck,
  RotateCcw, Save, Edit3, AlertTriangle, Target, BookmarkCheck,
  FolderOpen, Plus, Trash2, X, CheckCircle2, ChevronRight, BookOpen, Layers,
  Search, History, Eye, ArrowLeft, Building2, MapPin, Phone, Mail, Globe, Calendar, FileCheck, CheckCircle, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useHREmployees, useHREmployeeMutations, useHRDepartments, useHRDesignations } from '@/hooks/hr/useHR';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSearchParams } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
  DocumentType,
  TemplateCategory,
  NoticeSeverity,
  IncentiveTier,
  DocumentTemplate,
  BUILTIN_TEMPLATES,
  loadAllTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  substitutePlaceholders
} from './documents/documentTemplates';
import {
  ALL_HR_LETTERS,
  getLetterById,
  getLettersByCategory,
  ALL_HR_LETTER_IDS,
} from './documents/hrLetterCatalogue';
import {
  HRLetterDefinition,
  HRLetterCategory,
  HR_CATEGORY_META,
  HRInputField,
  HRLetterSection,
} from './documents/hrLetterTypes';

export type { DocumentType };

export interface IssuedLetter {
  id: string;
  refNo: string;
  docType: DocumentType;
  docTitle: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  salary: number;
  issueDate: string;
  joiningDate: string;
  signatoryName: string;
  signatoryDesignation: string;
  issuedAt: string;
  issuedBy: string;
  customClause?: string;
  workLocation?: string;
}

export const EmployeeDocumentsTab: React.FC = () => {
  const { settings } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: employees = [], isLoading } = useHREmployees();
  const { data: departments = [] } = useHRDepartments();
  const { data: designations = [] } = useHRDesignations();
  const { saveEmployee } = useHREmployeeMutations();
  const [searchParams, setSearchParams] = useSearchParams();

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Active View Tab: 'composer' (generator studio) vs 'archive' (searchable issued letters history)
  const [studioTab, setStudioTab] = useState<'composer' | 'archive'>('composer');

  // Active Document Type
  const [activeDoc, setActiveDoc] = useState<DocumentType>('offer_letter');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegisteringCandidate, setIsRegisteringCandidate] = useState(false);
  const [empSelectorOpen, setEmpSelectorOpen] = useState(false);

  // HR Letter Catalogue State (28+ enterprise letters across 9 categories)
  const [catalogueFieldValues, setCatalogueFieldValues] = useState<Record<string, string>>({});
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState<HRLetterCategory | 'ALL'>('ALL');
  const [catalogueSearchQuery, setCatalogueSearchQuery] = useState('');
  const [cataloguePickerOpen, setCataloguePickerOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // ── ISSUED LETTERS ARCHIVE STATE ──
  const [issuedLetters, setIssuedLetters] = useState<IssuedLetter[]>(() => {
    const key = `kc_hr_issued_letters_${user?.schemaName || 'default'}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse issued letters', e);
    }
    return [
      {
        id: 'iss_001',
        refNo: 'KCPL/HR/OFF/2026-27/0010',
        docType: 'offer_letter',
        docTitle: 'Letter of Offer of Employment',
        employeeId: 'EMP-0010',
        employeeName: 'Nehaben Halpati',
        department: 'PRODUCTION',
        designation: 'Team Associate',
        salary: 10400,
        issueDate: '2026-10-18',
        joiningDate: '2026-10-18',
        signatoryName: 'Authorized Signatory',
        signatoryDesignation: 'Head of Human Resources',
        issuedAt: '2026-10-18T12:18:00.000Z',
        issuedBy: 'HR Admin',
        customClause: 'Financial Non-Disclosure & Integrity: You shall maintain absolute confidentiality regarding corporate balance sheets, profit margins, bank transactions, and dealer financial ledgers.',
        workLocation: 'Corporate Head Office'
      },
      {
        id: 'iss_002',
        refNo: 'KCPL/HR/APPT/2026-27/0004',
        docType: 'appointment_letter',
        docTitle: 'Letter of Appointment',
        employeeId: 'EMP-0004',
        employeeName: 'Ramesh K. Patel',
        department: 'Accounts & Finance',
        designation: 'Senior Accountant',
        salary: 28000,
        issueDate: '2026-10-01',
        joiningDate: '2026-10-01',
        signatoryName: 'Authorized Signatory',
        signatoryDesignation: 'Head of Human Resources',
        issuedAt: '2026-10-01T09:30:00.000Z',
        issuedBy: 'HR Admin',
        workLocation: 'Plant Manufacturing Unit, Sisodra'
      },
      {
        id: 'iss_003',
        refNo: 'KCPL/HR/INC/2026-27/0012',
        docType: 'sales_incentive_letter',
        docTitle: 'Sales Target & Incentive Agreement',
        employeeId: 'SO-0012',
        employeeName: 'Vikram Desai',
        department: 'Sales & Marketing',
        designation: 'Field Sales Officer',
        salary: 22000,
        issueDate: '2026-09-15',
        joiningDate: '2026-09-15',
        signatoryName: 'Director / Operations Head',
        signatoryDesignation: 'VP of Commercial Operations',
        issuedAt: '2026-09-15T11:00:00.000Z',
        issuedBy: 'HR Admin',
        workLocation: 'South Gujarat Territory'
      },
      {
        id: 'iss_004',
        refNo: 'KCPL/HR/NOT/2026-27/0005',
        docType: 'notice_letter',
        docTitle: 'Formal Warning: Habitual Late Coming',
        employeeId: 'EMP-0007',
        employeeName: 'Jayesh Sharma',
        department: 'Warehouse & Logistics',
        designation: 'Store Keeper',
        salary: 19000,
        issueDate: '2026-10-05',
        joiningDate: '2025-06-01',
        signatoryName: 'Authorized Signatory',
        signatoryDesignation: 'Head of Human Resources',
        issuedAt: '2026-10-05T14:20:00.000Z',
        issuedBy: 'HR Admin',
        workLocation: 'Central Dispatch Depot'
      }
    ];
  });

  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<'ALL' | DocumentType>('ALL');
  const [viewingArchivedLetter, setViewingArchivedLetter] = useState<IssuedLetter | null>(null);

  // Sync issued letters to localStorage
  useEffect(() => {
    const key = `kc_hr_issued_letters_${user?.schemaName || 'default'}`;
    try {
      localStorage.setItem(key, JSON.stringify(issuedLetters));
    } catch (e) {
      console.error('Failed to sync issued letters', e);
    }
  }, [issuedLetters, user?.schemaName]);

  // ── TEMPLATE MANAGEMENT STATE ──
  const [templates, setTemplates] = useState<DocumentTemplate[]>(() => loadAllTemplates(user?.schemaName));
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'All' | TemplateCategory>('All');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('builtin_acc_offer');
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [manageTemplatesModalOpen, setManageTemplatesModalOpen] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState<{
    name: string;
    category: TemplateCategory;
    description: string;
  }>({
    name: '',
    category: 'Accounts',
    description: '',
  });

  // Reload templates when schema changes
  useEffect(() => {
    setTemplates(loadAllTemplates(user?.schemaName));
  }, [user?.schemaName]);

  // Roles & Responsibilities list for Offer/Appointment letters
  const [rolesAndDuties, setRolesAndDuties] = useState<string[]>([
    'Maintain day-to-day double-entry bookkeeping, ledger entries, and voucher verification in ERP / Tally.',
    'Prepare monthly Bank Reconciliation Statements (BRS) for all corporate accounts on or before the 5th of each month.',
    'Scrutinize vendor bills, verify against Goods Receipt Notes (GRN) and Purchase Orders before payment recommendation.',
    'Assist in filing statutory returns including GSTR-1, GSTR-3B, TDS deductions, and monthly PF / ESIC remittances.'
  ]);
  const [newDutyInput, setNewDutyInput] = useState('');

  // ── SALES INCENTIVE SPECIFIC STATE ──
  const [salesTargetAmount, setSalesTargetAmount] = useState<number>(500000);
  const [salesTargetUnit, setSalesTargetUnit] = useState<string>('Monthly Net Sales Turnover (INR)');
  const [collectionDaysLimit, setCollectionDaysLimit] = useState<number>(30);
  const [travelAllowancePerKm, setTravelAllowancePerKm] = useState<number>(3.5);
  const [dailyAllowance, setDailyAllowance] = useState<number>(250);
  const [payoutDayOfMonth, setPayoutDayOfMonth] = useState<number>(10);
  const [incentiveTiers, setIncentiveTiers] = useState<IncentiveTier[]>([
    {
      id: 'tier_1',
      tierName: 'Tier 1 (Base Qualifying Achiever)',
      achievementRange: '80% – 100% of Target',
      incentiveRate: '1.50% on Total Realized Sales',
      bonusAmount: '₹2,500 Flat Milestone Bonus',
      description: 'Minimum qualifying threshold for the monthly incentive pool.'
    },
    {
      id: 'tier_2',
      tierName: 'Tier 2 (Star Performer)',
      achievementRange: '101% – 120% of Target',
      incentiveRate: '2.50% on Total Realized Sales',
      bonusAmount: '₹5,000 Milestone Bonus',
      description: 'Accelerated payout for exceeding territory turnover benchmarks.'
    },
    {
      id: 'tier_3',
      tierName: 'Tier 3 (Super Achiever & Champion)',
      achievementRange: '> 120% of Target',
      incentiveRate: '4.00% on Incremental Turnover',
      bonusAmount: '₹10,000 Bonus + Quarterly Trophy',
      description: 'Top-tier recognition with eligibility for the annual executive trip.'
    }
  ]);
  const [salesConditions, setSalesConditions] = useState<string[]>([
    'Payment Realization Rule: Incentives are strictly computed upon realized payments received within the approved credit terms (maximum 30 days). Collections received after 30 days will not qualify for incentive payouts.',
    'Market Deductions: Any returned materials, rejected batches, or approved credit notes will be deducted from the qualifying sales turnover.',
    'Field Attendance Requirement: Eligibility requires completing daily GPS check-ins (minimum 8-10 dealer visits/day) and odometer route submissions in the mobile ERP app.',
    'Disbursement Schedule: Incentives are calculated at calendar month-end and credited on or before the 10th of the following month along with regular salary.'
  ]);

  // Unregistered Candidate Mode State
  const [isCandidateMode, setIsCandidateMode] = useState(false);
  const [candidateData, setCandidateData] = useState({
    name: 'Mr. Ramesh Kumar',
    contactinfo: '+91 98765 43210',
    department: 'Accounts',
    designation: 'Senior Accountant',
    base_salary_monthly: 25000,
    dailywage: 0,
    employee_type: 'FIXED',
    employee_id: 'CAND-2026-001',
    aadhar_number: 'XXXX-XXXX-4589',
    doj: todayStr,
  });

  // Automatically enable Candidate Mode if no registered employees exist yet
  useEffect(() => {
    if (!isLoading && employees.length === 0 && !isCandidateMode) {
      setIsCandidateMode(true);
    }
  }, [employees, isLoading]);

  // Set initial employee from query param or first available
  useEffect(() => {
    const paramId = searchParams.get('employeeId');
    if (paramId && employees.some((e: any) => String(e.id) === String(paramId))) {
      setSelectedEmployeeId(String(paramId));
      setIsCandidateMode(false);
    } else if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(String(employees[0].id));
    }
  }, [employees, searchParams]);

  const selectedEmployee = employees.find((e: any) => String(e.id) === String(selectedEmployeeId)) || employees[0] || null;

  // Flexible On-the-fly Overrides for Registered Staff
  const [empOverrides, setEmpOverrides] = useState({
    name: '',
    designation: '',
    department: '',
    base_salary_monthly: 0,
    employee_type: 'FIXED',
    contactinfo: '',
    employee_id: '',
    aadhar_number: '',
    doj: todayStr,
  });
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);

  // Sync overrides whenever selected employee changes
  useEffect(() => {
    if (selectedEmployee) {
      setEmpOverrides({
        name: selectedEmployee.name || '',
        designation: selectedEmployee.designation || '',
        department: selectedEmployee.department || '',
        base_salary_monthly: Number(selectedEmployee.base_salary_monthly || (selectedEmployee.dailywage ? selectedEmployee.dailywage * 26 : 0) || 0),
        employee_type: selectedEmployee.employee_type || 'FIXED',
        contactinfo: selectedEmployee.contactinfo || '',
        employee_id: selectedEmployee.employee_id || '',
        aadhar_number: selectedEmployee.aadhar_number || '',
        doj: selectedEmployee.doj || todayStr,
      });
    }
  }, [selectedEmployee?.id]);

  // Check if current values differ from database profile
  const isOverridden = Boolean(!isCandidateMode && selectedEmployee && (
    empOverrides.name !== (selectedEmployee.name || '') ||
    empOverrides.designation !== (selectedEmployee.designation || '') ||
    empOverrides.department !== (selectedEmployee.department || '') ||
    empOverrides.base_salary_monthly !== Number(selectedEmployee.base_salary_monthly || (selectedEmployee.dailywage ? selectedEmployee.dailywage * 26 : 0) || 0) ||
    empOverrides.contactinfo !== (selectedEmployee.contactinfo || '') ||
    empOverrides.employee_id !== (selectedEmployee.employee_id || '') ||
    empOverrides.doj !== (selectedEmployee.doj || '')
  ));

  const handleResetOverrides = () => {
    if (selectedEmployee) {
      setEmpOverrides({
        name: selectedEmployee.name || '',
        designation: selectedEmployee.designation || '',
        department: selectedEmployee.department || '',
        base_salary_monthly: Number(selectedEmployee.base_salary_monthly || (selectedEmployee.dailywage ? selectedEmployee.dailywage * 26 : 0) || 0),
        employee_type: selectedEmployee.employee_type || 'FIXED',
        contactinfo: selectedEmployee.contactinfo || '',
        employee_id: selectedEmployee.employee_id || '',
        aadhar_number: selectedEmployee.aadhar_number || '',
        doj: selectedEmployee.doj || todayStr,
      });
      toast({ title: 'Defaults Restored', description: 'Reverted all fields back to database profile values.' });
    }
  };

  const handleSaveToDatabase = async () => {
    if (!selectedEmployee?.id) return;
    setIsUpdatingDb(true);
    try {
      await saveEmployee({
        ...selectedEmployee,
        name: empOverrides.name,
        designation: empOverrides.designation,
        department: empOverrides.department,
        base_salary_monthly: empOverrides.base_salary_monthly,
        employee_type: empOverrides.employee_type,
        contactinfo: empOverrides.contactinfo,
        employee_id: empOverrides.employee_id,
        aadhar_number: empOverrides.aadhar_number,
        doj: empOverrides.doj,
      });
      toast({ 
        title: 'Database Profile Updated', 
        description: `Permanent changes saved to Employee Master for ${empOverrides.name}.` 
      });
    } catch (err: any) {
      toast({ 
        title: 'Update Failed', 
        description: err.message || 'Could not update employee in database.', 
        variant: 'destructive' 
      });
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Active Person: either unregistered candidate or overridden registered employee
  const activePerson = isCandidateMode 
    ? candidateData 
    : selectedEmployee 
      ? {
          ...selectedEmployee,
          name: empOverrides.name || selectedEmployee.name,
          designation: empOverrides.designation ?? selectedEmployee.designation,
          department: empOverrides.department ?? selectedEmployee.department,
          base_salary_monthly: empOverrides.base_salary_monthly,
          employee_type: empOverrides.employee_type || selectedEmployee.employee_type,
          contactinfo: empOverrides.contactinfo ?? selectedEmployee.contactinfo,
          employee_id: empOverrides.employee_id ?? selectedEmployee.employee_id,
          aadhar_number: empOverrides.aadhar_number ?? selectedEmployee.aadhar_number,
          doj: empOverrides.doj ?? selectedEmployee.doj,
        }
      : candidateData; // Fallback to candidateData so canvas is always active!

  // Company details
  const companyName = settings?.company_name || 'KAMLA CONCHEM PVT LTD';
  const companyAddress = settings?.company_address || 'Phase-1, Industrial Area, Gujarat, India';
  const companyEmail = settings?.company_email || 'support@kamla.com';
  const companyPhone = settings?.company_phone || '+91 81559 31559';
  const companyGst = settings?.company_gst || '24AALCK3507C1ZX';
  const companyLogo = settings?.company_logo || '';

  // Configurable fields state
  const [docConfig, setDocConfig] = useState({
    issueDate: todayStr,
    signatoryName: 'Authorized Signatory',
    signatoryDesignation: 'Head of Human Resources',
    joiningDate: todayStr,
    probationPeriod: '3 Months',
    noticePeriod: '30 Days',
    workHours: '9:30 AM – 6:30 PM (Monday to Saturday)',
    workLocation: 'Corporate Head Office',
    relievingDate: todayStr,
    conductRating: 'Satisfactory and Exemplary',
    relievingReason: 'Personal career progression',
    relievingRemarks: '',
    addressedTo: 'To Whom It May Concern',
    certificatePurpose: 'for Official Verification / Financial Application',
    salaryRemarks: '',
    bloodGroup: 'B+',
    emergencyContact: '+91 98765 43210',
    validUpto: `${new Date().getFullYear() + 3}-12-31`,
    customClause: 'Financial Non-Disclosure & Integrity: You shall maintain absolute confidentiality regarding corporate balance sheets, profit margins, bank transactions, and dealer financial ledgers.',
    
    // Notice Letter Specifics
    noticeSubject: 'Formal Warning: Habitual Late Coming and Disregard of Shift Timings',
    noticeSeverity: 'Warning' as NoticeSeverity,
    explanationDeadlineHours: 24,
    noticeBody: `It has been observed from our biometric attendance records that you have arrived significantly late for your designated work shifts on multiple occasions during the current month without prior written approval or valid justification.

Your reporting hours are {{work_hours}}. Repeated unpunctuality disrupts department operations, delays team handovers, and violates the company's code of conduct.

You are hereby formally cautioned to strictly adhere to the designated working hours with immediate effect. Please be advised that any further late arrivals may result in loss of pay, forfeiture of allowances, and formal disciplinary proceedings.`,
  });

  // Keep joiningDate & contact synced when activePerson changes
  useEffect(() => {
    if (activePerson) {
      setDocConfig(prev => ({
        ...prev,
        joiningDate: activePerson.doj || prev.joiningDate,
        emergencyContact: activePerson.contactinfo || prev.emergencyContact,
      }));
    }
  }, [activePerson?.doj, activePerson?.contactinfo]);

  const resolveMediaUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:4000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const monthlyBase = Number(activePerson?.base_salary_monthly || (activePerson?.dailywage ? activePerson.dailywage * 26 : 0) || 0);
  const annualCtc = monthlyBase * 12;
  const basicSalary = Math.round(monthlyBase * 0.5);
  const hraSalary = Math.round(monthlyBase * 0.3);
  const conveyance = Math.round(monthlyBase * 0.1);
  const specialAllowance = Math.round(monthlyBase * 0.1);

  const formatCurrency = (val: number) => {
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // ── FILTERED TEMPLATES ──
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesDoc = t.docType === activeDoc;
      if (!matchesDoc) return false;
      if (selectedCategoryFilter === 'All') return true;
      if (selectedCategoryFilter === 'General') return true;
      return t.category === selectedCategoryFilter;
    });
  }, [templates, activeDoc, selectedCategoryFilter]);

  // Apply a chosen template to the active document configuration
  const handleApplyTemplate = (templateId: string) => {
    const t = templates.find(item => item.id === templateId);
    if (!t) return;
    setSelectedTemplateId(templateId);

    // Apply general terms
    setDocConfig(prev => ({
      ...prev,
      probationPeriod: t.probationPeriod || prev.probationPeriod,
      noticePeriod: t.noticePeriod || prev.noticePeriod,
      workHours: t.workHours || prev.workHours,
      workLocation: t.workLocation || prev.workLocation,
      customClause: t.customClause !== undefined ? t.customClause : prev.customClause,
      noticeSubject: t.noticeSubject || prev.noticeSubject,
      noticeBody: t.noticeBody || prev.noticeBody,
      noticeSeverity: t.noticeSeverity || prev.noticeSeverity,
      explanationDeadlineHours: t.explanationDeadlineHours || prev.explanationDeadlineHours,
    }));

    if (t.rolesAndDuties && t.rolesAndDuties.length > 0) {
      setRolesAndDuties([...t.rolesAndDuties]);
    }

    if (t.docType === 'sales_incentive_letter') {
      if (t.salesTargetAmount) setSalesTargetAmount(t.salesTargetAmount);
      if (t.salesTargetUnit) setSalesTargetUnit(t.salesTargetUnit);
      if (t.collectionDaysLimit) setCollectionDaysLimit(t.collectionDaysLimit);
      if (t.travelAllowancePerKm) setTravelAllowancePerKm(t.travelAllowancePerKm);
      if (t.dailyAllowance) setDailyAllowance(t.dailyAllowance);
      if (t.payoutDayOfMonth) setPayoutDayOfMonth(t.payoutDayOfMonth);
      if (t.incentiveTiers) setIncentiveTiers([...t.incentiveTiers]);
      if (t.salesConditions) setSalesConditions([...t.salesConditions]);
    }

    // Adapt candidate preset if candidate mode
    if (isCandidateMode) {
      let candidateDept = t.category !== 'General' && (t.category as string) !== 'Notices' ? t.category : 'Operations';
      let candidateDesig = 'Executive';
      let candidateSal = 25000;

      if (t.category === 'Accounts') {
        candidateDept = 'Accounts & Finance';
        candidateDesig = 'Senior Accountant';
        candidateSal = 25000;
      } else if (t.category === 'Stock') {
        candidateDept = 'Warehouse & Logistics';
        candidateDesig = 'Warehouse In-Charge / Store Keeper';
        candidateSal = 22000;
      } else if (t.category === 'Receptionist') {
        candidateDept = 'Administration & Front Desk';
        candidateDesig = 'Front Desk Receptionist';
        candidateSal = 18000;
      } else if (t.category === 'Sales') {
        candidateDept = 'Sales & Marketing';
        candidateDesig = 'Field Sales Officer';
        candidateSal = 20000;
      } else if (t.category === 'Production') {
        candidateDept = 'Plant Manufacturing';
        candidateDesig = 'Production Supervisor';
        candidateSal = 24000;
      }

      setCandidateData(prev => ({
        ...prev,
        department: candidateDept,
        designation: candidateDesig,
        base_salary_monthly: candidateSal,
      }));
    }

    toast({
      title: 'Template Loaded',
      description: `Active template: "${t.name}".`
    });
  };

  // Category filter click handler: auto-applies matching template immediately
  const handleSelectCategory = (cat: 'All' | TemplateCategory) => {
    setSelectedCategoryFilter(cat);
    if (cat === 'Notices') {
      setActiveDoc('notice_letter');
      const noticeT = templates.find(t => t.docType === 'notice_letter');
      if (noticeT) handleApplyTemplate(noticeT.id);
    } else if (cat === 'Sales' && activeDoc === 'sales_incentive_letter') {
      const salesT = templates.find(t => t.docType === 'sales_incentive_letter');
      if (salesT) handleApplyTemplate(salesT.id);
    } else {
      const matching = templates.find(t => t.category === cat && t.docType === activeDoc) ||
                       templates.find(t => t.category === cat);
      if (matching) {
        if (matching.docType !== activeDoc) {
          setActiveDoc(matching.docType);
        }
        handleApplyTemplate(matching.id);
      }
    }
  };

  // Save current configuration as a new custom template
  const handleSaveAsNewTemplate = () => {
    if (!newTemplateForm.name.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a template name.', variant: 'destructive' });
      return;
    }

    const templateToSave: DocumentTemplate = {
      id: `custom_${Date.now()}`,
      name: newTemplateForm.name.trim(),
      category: newTemplateForm.category,
      docType: activeDoc,
      description: newTemplateForm.description.trim() || `Custom ${newTemplateForm.category} template for ${activeDoc}`,
      probationPeriod: docConfig.probationPeriod,
      noticePeriod: docConfig.noticePeriod,
      workHours: docConfig.workHours,
      workLocation: docConfig.workLocation,
      customClause: docConfig.customClause,
      rolesAndDuties: [...rolesAndDuties],
      salesTargetAmount,
      salesTargetUnit,
      incentiveTiers: [...incentiveTiers],
      collectionDaysLimit,
      travelAllowancePerKm,
      dailyAllowance,
      payoutDayOfMonth,
      salesConditions: [...salesConditions],
      noticeSubject: docConfig.noticeSubject,
      noticeBody: docConfig.noticeBody,
      noticeSeverity: docConfig.noticeSeverity,
      explanationDeadlineHours: docConfig.explanationDeadlineHours,
    };

    const updated = saveCustomTemplate(templateToSave, user?.schemaName);
    setTemplates(updated);
    setSelectedTemplateId(templateToSave.id);
    setSaveTemplateModalOpen(false);
    setNewTemplateForm({ name: '', category: 'Accounts', description: '' });

    toast({
      title: 'Template Saved Successfully! 🎉',
      description: `"${templateToSave.name}" is now saved under ${templateToSave.category} and can be reused anytime.`
    });
  };

  // Delete a custom template
  const handleDeleteCustomTemplate = (id: string, name: string) => {
    const updated = deleteCustomTemplate(id, user?.schemaName);
    setTemplates(updated);
    if (selectedTemplateId === id) {
      const fallback = updated.find(t => t.docType === activeDoc) || updated[0];
      if (fallback) handleApplyTemplate(fallback.id);
    }
    toast({ title: 'Template Removed', description: `Deleted "${name}".` });
  };

  // Add Duty handler
  const handleAddDuty = () => {
    if (!newDutyInput.trim()) return;
    setRolesAndDuties([...rolesAndDuties, newDutyInput.trim()]);
    setNewDutyInput('');
  };

  const handleRemoveDuty = (idx: number) => {
    setRolesAndDuties(rolesAndDuties.filter((_, i) => i !== idx));
  };

  // Dynamic Placeholder helper
  const replaceTokens = (rawText: string) => {
    if (!rawText) return '';
    let result = substitutePlaceholders(rawText, {
      employeeName: activePerson?.name,
      designation: activePerson?.designation,
      department: activePerson?.department,
      companyName,
      doj: formatDate(docConfig.joiningDate),
      salary: formatCurrency(monthlyBase),
      annualCtc: formatCurrency(annualCtc),
      workLocation: docConfig.workLocation,
      workHours: docConfig.workHours,
      probationPeriod: docConfig.probationPeriod,
      noticePeriod: docConfig.noticePeriod,
      employeeId: activePerson?.employee_id || (isCandidateMode ? 'CAND-REF' : 'REF'),
      issueDate: formatDate(docConfig.issueDate),
    });

    // Intelligent fallbacks for common HR catalogue letter tokens
    const defaultsMap: Record<string, string> = {
      effective_date: formatDate(docConfig.issueDate),
      new_designation: activePerson?.designation || 'Senior Team Member',
      previous_designation: activePerson?.designation || 'Associate',
      transfer_location: docConfig.workLocation,
      transfer_from: `${activePerson?.department || 'Operations'} (${docConfig.workLocation})`,
      transfer_to: docConfig.workLocation,
      leave_type: 'Annual / Privilege Leave',
      leave_start_date: formatDate(docConfig.issueDate),
      leave_end_date: formatDate(docConfig.issueDate),
      total_days: '3',
      holiday_date: formatDate(docConfig.issueDate),
      holiday_name: 'Upcoming Public Holiday',
      policy_date: formatDate(docConfig.issueDate),
      policy_name: 'Workplace Operations & Conduct Policy',
      appreciation_reason: 'Exemplary diligence, high operational standards, and commitment to corporate excellence',
      relieving_date: formatDate(docConfig.relievingDate || docConfig.issueDate),
      resignation_date: formatDate(docConfig.issueDate),
      last_working_day: formatDate(docConfig.relievingDate || docConfig.issueDate),
      experience_start_date: formatDate(activePerson?.doj || docConfig.joiningDate),
      experience_end_date: formatDate(docConfig.relievingDate || docConfig.issueDate),
      noc_purpose: 'Higher Education / Passport & Visa Processing',
      employment_status: 'Currently Employed',
      verification_requested_by: 'Background Verification Agency / Official Authority',
      verification_ref: `BGV-${activePerson?.employee_id || '001'}-VER`,
      interview_date: formatDate(docConfig.issueDate),
      interview_time: '11:00 AM',
      interview_venue: `${companyName} Corporate Office`,
      reporting_manager: 'Department Head / Operations Manager',
      revised_salary: `${formatCurrency(monthlyBase)} per month`,
      previous_salary: `${formatCurrency(Math.round(monthlyBase * 0.85))} per month`,
      extended_probation_period: '3 Additional Months',
      probation_end_date: formatDate(docConfig.issueDate),
      bonus_amount: formatCurrency(monthlyBase),
      bonus_type: 'Annual Festival Ex-Gratia',
      bonus_year: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
      disbursement_date: formatDate(docConfig.issueDate),
      severance_amount: formatCurrency(monthlyBase * 2),
      notice_period_served: 'Full Notice Period Served',
    };

    // Dynamic replacement for catalogue fields (supports snake_case and camelCase placeholders)
    result = result.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
      // 1. Direct match in catalogueFieldValues
      if (catalogueFieldValues[key] !== undefined && catalogueFieldValues[key] !== '') {
        return catalogueFieldValues[key];
      }
      // 2. CamelCase version of snake_case key (e.g. transfer_from -> transferFrom)
      const camelKey = key.replace(/_([a-z0-9])/g, (_: string, letter: string) => letter.toUpperCase());
      if (catalogueFieldValues[camelKey] !== undefined && catalogueFieldValues[camelKey] !== '') {
        return catalogueFieldValues[camelKey];
      }
      // 3. Snake_case version of camelKey
      const snakeKey = key.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
      if (catalogueFieldValues[snakeKey] !== undefined && catalogueFieldValues[snakeKey] !== '') {
        return catalogueFieldValues[snakeKey];
      }
      // 4. In docConfig
      if ((docConfig as any)[key] !== undefined && (docConfig as any)[key] !== '') {
        return String((docConfig as any)[key]);
      }
      if ((docConfig as any)[camelKey] !== undefined && (docConfig as any)[camelKey] !== '') {
        return String((docConfig as any)[camelKey]);
      }
      // 5. In intelligent defaults
      if (defaultsMap[key] !== undefined) {
        return defaultsMap[key];
      }
      if (defaultsMap[snakeKey] !== undefined) {
        return defaultsMap[snakeKey];
      }
      // 6. Return placeholder as-is if no match
      return match;
    });

    return result;
  };

  // Register Candidate into database
  const handleRegisterCandidate = async () => {
    if (!candidateData.name || candidateData.name === 'Candidate Full Name') {
      toast({ title: 'Validation Error', description: 'Please enter a valid candidate name.', variant: 'destructive' });
      return;
    }
    setIsRegisteringCandidate(true);
    try {
      const payload = {
        name: candidateData.name,
        contactinfo: candidateData.contactinfo,
        department: candidateData.department,
        designation: candidateData.designation,
        employee_type: candidateData.employee_type,
        base_salary_monthly: candidateData.base_salary_monthly,
        dailywage: candidateData.dailywage,
        doj: candidateData.doj || todayStr,
        aadhar_number: candidateData.aadhar_number,
      };
      const res = await saveEmployee(payload);
      toast({ 
        title: 'Candidate Registered Successfully!', 
        description: `${candidateData.name} has been added to the Employee Master.` 
      });
      setIsCandidateMode(false);
      const createdId = (res as any)?.data?.id || (res as any)?.id;
      if (createdId) {
        setSelectedEmployeeId(String(createdId));
      }
    } catch (err: any) {
      toast({ 
        title: 'Registration Failed', 
        description: err.message || 'Could not register candidate.', 
        variant: 'destructive' 
      });
    } finally {
      setIsRegisteringCandidate(false);
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (!printContainerRef.current || !activePerson) return;
    setIsGenerating(true);
    try {
      const docNameMapping: Record<DocumentType, string> = {
        // Recruitment
        offer_letter: 'Offer_Letter',
        appointment_letter: 'Appointment_Letter',
        probationary_appointment: 'Probationary_Appointment',
        internship_offer: 'Internship_Offer',
        interview_invitation: 'Interview_Invitation',
        // Employment Administration
        promotion_letter: 'Promotion_Letter',
        transfer_letter: 'Transfer_Letter',
        salary_revision_letter: 'Salary_Revision',
        probation_extension: 'Probation_Extension',
        confirmation_letter: 'Confirmation_Letter',
        // Attendance & Discipline
        notice_letter: 'Notice_Letter',
        show_cause_notice: 'Show_Cause_Notice',
        attendance_warning: 'Attendance_Warning',
        pip_notice: 'Performance_Improvement_Plan',
        // Leave & Benefits
        leave_approval: 'Leave_Approval',
        leave_rejection: 'Leave_Rejection',
        // Payroll
        sales_incentive_letter: 'Sales_Incentive_Scheme',
        // Performance
        appreciation_letter: 'Appreciation_Letter',
        performance_review_invitation: 'Appraisal_Invitation',
        // Policy
        policy_circular: 'HR_Circular',
        holiday_notification: 'Holiday_Notification',
        // Separation
        relieving_letter: 'Relieving_Certificate',
        resignation_acceptance: 'Resignation_Acceptance',
        termination_letter: 'Termination_Letter',
        // Certificates
        salary_certificate: 'Salary_Certificate',
        experience_certificate: 'Experience_Certificate',
        noc_letter: 'No_Objection_Certificate',
        employment_verification: 'Employment_Verification',
        // Legacy
        id_card: 'Employee_ID_Card_A4',
      };

      const filename = `${docNameMapping[activeDoc]}_${(activePerson.name || 'Candidate').replace(/\s+/g, '_')}_${activePerson.employee_id || 'REF'}.pdf`;

      const opt: any = {
        margin: [10, 12, 10, 12],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf().set(opt).from(printContainerRef.current).save();
      toast({ title: 'Download Complete', description: `${filename} has been saved as standard A4.` });
    } catch (err: any) {
      toast({ title: 'Error generating PDF', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to compute formal reference number
  const getFormalRefNumber = (type: DocumentType, person: any) => {
    const docCodeMap: Record<DocumentType, string> = {
      // Recruitment
      offer_letter: 'OFF', appointment_letter: 'APPT', probationary_appointment: 'PROB',
      internship_offer: 'INT', interview_invitation: 'IVT',
      // Employment Admin
      promotion_letter: 'PRM', transfer_letter: 'TRF', salary_revision_letter: 'SAR',
      probation_extension: 'PEX', confirmation_letter: 'CNF',
      // Discipline
      notice_letter: 'NOT', show_cause_notice: 'SCN', attendance_warning: 'ATW', pip_notice: 'PIP',
      // Leave
      leave_approval: 'LAP', leave_rejection: 'LRJ',
      // Payroll
      sales_incentive_letter: 'INC',
      // Performance
      appreciation_letter: 'APR', performance_review_invitation: 'PRI',
      // Policy
      policy_circular: 'CIR', holiday_notification: 'HOL',
      // Separation
      relieving_letter: 'REL', resignation_acceptance: 'RSA', termination_letter: 'TRM',
      // Certificates
      salary_certificate: 'SAL', experience_certificate: 'EXP',
      noc_letter: 'NOC', employment_verification: 'EVL',
      // Legacy
      id_card: 'IDC',
    };
    const prefix = docCodeMap[type] || 'HR';
    const year = new Date().getFullYear();
    const nextYear = String(year + 1).slice(-2);
    const idPart = (person?.employee_id || (isCandidateMode ? 'CAND-0010' : 'EMP-0010')).replace(/[^a-zA-Z0-9]/g, '');
    return `KCPL/HR/${prefix}/${year}-${nextYear}/${idPart}`;
  };

  const currentRefNumber = getFormalRefNumber(activeDoc, activePerson);

  // Save & Issue Official Letter to Archive
  const handleIssueAndSaveLetter = () => {
    if (!activePerson) return;
    const docTitleMap: Partial<Record<DocumentType, string>> = {
      offer_letter: 'Letter of Offer of Employment',
      appointment_letter: 'Letter of Appointment',
      sales_incentive_letter: 'Sales Target & Incentive Agreement',
      relieving_letter: 'Relieving & Experience Certificate',
      salary_certificate: 'Salary Certificate',
      id_card: 'Employee ID Card Pass',
      notice_letter: `${docConfig.noticeSeverity} Notice: ${docConfig.noticeSubject}`
    };

    const letterDef = getLetterById(activeDoc);
    const resolvedTitle = letterDef?.title || docTitleMap[activeDoc] || 'Official HR Letter';

    const newLetter: IssuedLetter = {
      id: `iss_${Date.now()}`,
      refNo: currentRefNumber,
      docType: activeDoc,
      docTitle: resolvedTitle,
      employeeId: activePerson.employee_id || (isCandidateMode ? 'CAND-REF' : 'EMP-001'),
      employeeName: activePerson.name,
      department: activePerson.department || 'Operations',
      designation: activePerson.designation || 'Staff',
      salary: monthlyBase,
      issueDate: docConfig.issueDate,
      joiningDate: docConfig.joiningDate,
      signatoryName: docConfig.signatoryName,
      signatoryDesignation: docConfig.signatoryDesignation,
      customClause: docConfig.customClause,
      workLocation: docConfig.workLocation,
      issuedAt: new Date().toISOString(),
      issuedBy: user?.name || 'HR Admin',
    };

    setIssuedLetters(prev => [newLetter, ...prev]);
    toast({
      title: 'Official Letter Issued & Archived!',
      description: `Reference ${currentRefNumber} saved to archive for ${activePerson.name}. You can retrieve and reprint it anytime.`,
    });
  };

  // Delete an archived letter
  const handleDeleteArchivedLetter = (id: string, refNo: string) => {
    setIssuedLetters(prev => prev.filter(item => item.id !== id));
    toast({
      title: 'Archived Letter Revoked',
      description: `Letter record ${refNo} has been removed from archive.`,
    });
  };

  // Print Handler
  const handlePrint = () => {
    if (!printContainerRef.current || !activePerson) return;
    const printContent = printContainerRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Popup Blocked', description: 'Please allow popups to print.', variant: 'destructive' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${companyName} - ${activeDoc.toUpperCase()} - ${activePerson.name}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            @media print {
              html, body {
                width: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .a4-print-sheet {
                width: 210mm !important;
                max-width: 210mm !important;
                box-sizing: border-box !important;
                padding: 8mm 10mm !important;
                margin: 0 auto !important;
                background: white !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body class="bg-white p-0">
          <div class="a4-print-sheet">
            ${printContent}
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 350);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Copy text to clipboard
  const handleCopyText = () => {
    if (!printContainerRef.current) return;
    navigator.clipboard.writeText(printContainerRef.current.innerText);
    toast({ title: 'Copied to Clipboard', description: 'Document text copied.' });
  };

  // Render Official Corporate Letterhead Header
  const renderHeader = () => (
    <div className="border-b-2 border-slate-900 pb-3 mb-3">
      {/* Top Corporate Branding & Official Registration */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {companyLogo ? (
            <img src={resolveMediaUrl(companyLogo)} alt={companyName} className="h-16 max-w-[190px] object-contain shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white font-black flex flex-col items-center justify-center text-lg tracking-wider shrink-0 border border-amber-400/40 shadow-sm">
              <span className="leading-none font-serif font-black text-amber-300">KC</span>
              <span className="text-[7px] font-sans font-bold tracking-widest text-slate-300 uppercase mt-0.5">GROUP</span>
            </div>
          )}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase leading-none font-serif">
                {companyName}
              </h1>
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300/80 font-sans">
                ISO 9001:2015 CERTIFIED
              </span>
            </div>
            <p className="text-[10px] font-bold tracking-wide text-slate-600 uppercase">
              Manufacturers of Advanced Construction Chemicals, Waterproofing &amp; Concrete Admixtures
            </p>
            <p className="text-[10.5px] text-slate-700 leading-tight">
              <strong>Regd. Office &amp; Works:</strong> {companyAddress}
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 text-[9.5px] text-slate-600 pt-0.5 font-medium">
              <span><strong>CIN:</strong> U24290GJ2020PTC115488</span>
              <span>• <strong>GSTIN:</strong> {companyGst}</span>
              <span>• <strong>Email:</strong> {companyEmail}</span>
              <span>• <strong>Tel:</strong> {companyPhone}</span>
              <span>• <strong>Web:</strong> www.kamlaconchem.com</span>
            </div>
          </div>
        </div>

        {/* Date of Issue & Official Reference Number Box */}
        <div className="text-right shrink-0 bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg min-w-[145px] shadow-2xs">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block font-bold">DATE OF ISSUANCE</span>
          <span className="text-xs font-black text-slate-950">{formatDate(docConfig.issueDate)}</span>
          <div className="mt-1 pt-1 border-t border-slate-200">
            <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider block">OFFICIAL REF NO</span>
            <span className="text-[9px] font-mono text-purple-900 font-bold block truncate max-w-[140px]" title={currentRefNumber}>
              {currentRefNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Elegant Multi-Tone Corporate Accent Divider */}
      <div className="relative mt-2">
        <div className="h-1 w-full bg-slate-900 rounded-full"></div>
        <div className="h-0.5 w-1/3 bg-amber-500 -mt-0.5 rounded-full"></div>
      </div>

      {/* Official Confidentiality Banner */}
      <div className="flex items-center justify-between text-[8px] text-slate-500 uppercase tracking-widest pt-1 px-0.5 font-semibold">
        <span>Confidential Corporate Human Resources Documentation</span>
        <span>Strictly Private &amp; Addressee Only</span>
      </div>
    </div>
  );

  // Render Official Corporate Letterhead Footer
  const renderFooter = () => (
    <div className="mt-3 pt-2 border-t border-slate-200">
      <div className="flex items-center justify-between text-[7.5px] text-slate-400 font-mono">
        <span>System Authenticated • Doc Ref: {currentRefNumber}</span>
        <span>Corporate Human Resources • {companyName}</span>
        <span>Page 1 of 1 • Strictly Private &amp; Confidential</span>
      </div>
    </div>
  );

  // Render Signature Section
  const renderSignatory = () => {
    const isRelieving = activeDoc === 'relieving_letter';
    const isSalaryCert = activeDoc === 'salary_certificate';
    const isNotice = activeDoc === 'notice_letter';
    const letterDef = getLetterById(activeDoc);

    const requiresEmployeeAck = letterDef 
      ? letterDef.employeeAcknowledgment === 'required'
      : (!isRelieving && !isSalaryCert);

    const ackTitle = letterDef?.acknowledgmentLabel || (isNotice ? 'Employee Acknowledgment' : 'Candidate / Employee Acceptance');

    // For letters that don't require employee acceptance / signature:
    if (!requiresEmployeeAck) {
      return (
        <div className="pt-3 mt-3 border-t-2 border-slate-300">
          <div className="flex justify-end text-xs">
            {/* Right Column: Company Authorized Signatory with Official Seal */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 w-80 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                  <span className="font-bold text-[9.5px] uppercase tracking-wider text-slate-900">
                    For {companyName}
                  </span>
                  <span className="text-[8px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Authorized Signatory
                  </span>
                </div>
                
                {/* Stamp & Seal Watermark Badge */}
                <div className="h-8 flex items-center justify-between px-1 my-1">
                  <div className="inline-flex items-center gap-1 border border-purple-300 bg-purple-50/80 px-2 py-0.5 rounded text-[8px] font-bold text-purple-900 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-purple-700 shrink-0" />
                    <span>CORPORATE HR SEAL • VERIFIED</span>
                  </div>
                  <span className="text-[7.5px] font-mono text-slate-400">Ref: {currentRefNumber}</span>
                </div>
              </div>

              <div className="space-y-0.5 pt-2">
                <div className="border-b-2 border-slate-400 w-full h-4 mb-1"></div>
                <div className="pt-0.5">
                  <p className="font-bold text-slate-950 text-[11px] leading-tight">{docConfig.signatoryName}</p>
                  <p className="text-[9.5px] font-medium text-slate-600">{docConfig.signatoryDesignation}</p>
                  <p className="text-[8.5px] font-semibold text-slate-500 uppercase">{companyName}</p>
                </div>
              </div>
            </div>
          </div>

          {renderFooter()}
        </div>
      );
    }

    return (
      <div className="pt-3 mt-3 border-t-2 border-slate-300">
        <div className="grid grid-cols-2 gap-6 text-xs">
          {/* Left Column: Candidate / Employee Acceptance (for Offer / Appointment / Notice) */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                <span className="font-bold text-[9.5px] uppercase tracking-wider text-slate-700">
                  {ackTitle}
                </span>
                <span className="text-[8px] text-slate-500 font-medium">Duplicate Copy</span>
              </div>
              <p className="text-[9.5px] text-slate-600 leading-relaxed mb-2">
                {isNotice ? (
                  <>I, <strong>{activePerson?.name}</strong>, hereby acknowledge receipt of this official notice letter.</>
                ) : letterDef?.acknowledgmentLabel ? (
                  <>I, <strong>{activePerson?.name}</strong>, hereby acknowledge receipt of this official letter ({letterDef.shortTitle || letterDef.title}), accept the terms &amp; conditions stated herein, and confirm my acknowledgment.</>
                ) : (
                  <>I, <strong>{activePerson?.name}</strong>, hereby acknowledge receipt of this official letter, accept all terms, conditions &amp; responsibilities stated herein, and confirm my acceptance.</>
                )}
              </p>
            </div>
            
            <div className="space-y-1 pt-1">
              <div className="border-b-2 border-slate-400 w-full h-7 flex items-end">
                <span className="text-[8.5px] text-slate-400 italic font-mono">[Signature of Candidate / Employee]</span>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-600 pt-0.5">
                <span>Name: <strong>{activePerson?.name}</strong></span>
                <span>Date: __________________</span>
              </div>
            </div>
          </div>

          {/* Right Column: Company Authorized Signatory with Official Seal */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                <span className="font-bold text-[9.5px] uppercase tracking-wider text-slate-900">
                  For {companyName}
                </span>
                <span className="text-[8px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Authorized Executive
                </span>
              </div>
              
              {/* Stamp & Seal Watermark Badge */}
              <div className="h-8 flex items-center justify-between px-1">
                <div className="inline-flex items-center gap-1 border border-purple-300 bg-purple-50/80 px-2 py-0.5 rounded text-[8px] font-bold text-purple-900 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-purple-700 shrink-0" />
                  <span>CORPORATE HR SEAL • VERIFIED</span>
                </div>
                <span className="text-[7.5px] font-mono text-slate-400">Ref: {currentRefNumber}</span>
              </div>
            </div>

            <div className="space-y-0.5 pt-1">
              <div className="border-b-2 border-slate-400 w-full h-3"></div>
              <div className="pt-0.5">
                <p className="font-bold text-slate-950 text-[11px] leading-tight">{docConfig.signatoryName}</p>
                <p className="text-[9.5px] font-medium text-slate-600">{docConfig.signatoryDesignation}</p>
                <p className="text-[8.5px] font-semibold text-slate-500 uppercase">{companyName}</p>
              </div>
            </div>
          </div>
        </div>

        {renderFooter()}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Scoped Print Style to guarantee exact A4 pagination and hide dashboard elements */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-a4-document,
          #printable-a4-document * {
            visibility: visible !important;
          }
          #printable-a4-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            box-shadow: none !important;
            border: none !important;
            padding: 10mm 12mm !important;
            margin: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      
      {/* ── UNIFIED STREAMLINED EXECUTIVE CONTROL DECK ── */}
      <div className="bg-card border border-border rounded-xl shadow-xs p-3 space-y-2.5">
        
        {/* Row 1: Studio Switcher + Title + Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 border border-purple-500/20 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground tracking-tight">Employee Letters Studio</h2>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Official HR
              </span>
            </div>

            {/* Inline Segmented Switcher */}
            <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40 ml-1">
              <button
                type="button"
                onClick={() => setStudioTab('composer')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  studioTab === 'composer' ? 'bg-purple-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Composer</span>
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('archive')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  studioTab === 'archive' ? 'bg-purple-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="w-3 h-3" />
                <span>Archive ({issuedLetters.length})</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {studioTab === 'composer' && (
              <>
                <Button 
                  size="sm" 
                  onClick={handleIssueAndSaveLetter} 
                  disabled={!activePerson} 
                  className="text-xs gap-1 h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                  title="Issue letter with official reference number and save to archive"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Save &amp; Issue</span>
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleDownloadPdf} 
                  disabled={isGenerating || !activePerson} 
                  className="text-xs gap-1 h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  <span>PDF</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrint} 
                  className="text-xs gap-1 h-8 px-2.5 hover:bg-muted cursor-pointer" 
                  title="Print directly"
                >
                  <Printer className="w-3 h-3" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyText} 
                  className="text-xs gap-1 h-8 px-2.5 hover:bg-muted cursor-pointer" 
                  title="Copy plain text"
                >
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">Copy</span>
                </Button>
              </>
            )}
            {studioTab === 'archive' && (
              <Button 
                size="sm" 
                onClick={() => setStudioTab('composer')} 
                className="text-xs gap-1 h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Letter</span>
              </Button>
            )}
          </div>
        </div>

        {studioTab === 'composer' && (
          <div className="space-y-2 pt-0.5">
            {/* Row 2: Recipient Selector + Document Type Pills */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
              {/* Recipient Picker */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCandidateMode(false)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      !isCandidateMode ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    👤 Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCandidateMode(true)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      isCandidateMode ? 'bg-purple-600 text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ✍️ Candidate
                  </button>
                </div>

                {!isCandidateMode ? (
                  <Popover open={empSelectorOpen} onOpenChange={setEmpSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        role="combobox" 
                        aria-expanded={empSelectorOpen} 
                        className="w-[240px] sm:w-[280px] justify-between text-xs px-2.5 h-8 bg-background/60 hover:bg-background border-border overflow-hidden cursor-pointer"
                      >
                        {selectedEmployee ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold truncate">{selectedEmployee.name}</span>
                            <span className="text-[10px] font-mono text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1 rounded">
                              {selectedEmployee.employee_id}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select employee...</span>
                        )}
                        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search employee..." />
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            {employees.map((emp: any) => (
                              <CommandItem 
                                key={emp.id} 
                                value={`${emp.name} ${emp.employee_id} ${emp.department} ${emp.designation}`}
                                onSelect={() => {
                                  setSelectedEmployeeId(String(emp.id));
                                  setSearchParams({ tab: 'documents', employeeId: String(emp.id) });
                                  setEmpSelectorOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", String(selectedEmployeeId) === String(emp.id) ? "opacity-100" : "opacity-0")} />
                                <div className="truncate">
                                  <p className="text-xs font-semibold truncate">{emp.name} ({emp.employee_id})</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{emp.designation || 'Staff'} • {emp.department || 'Operations'}</p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="text-xs font-semibold px-2.5 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-500/20 truncate max-w-[260px]">
                    Candidate: {candidateData.name || 'New Recruit'}
                  </div>
                )}
              </div>

              {/* Document Type Switcher & Full Catalogue Popover */}
              <div className="flex items-center gap-1 flex-wrap overflow-x-hidden">
                {[
                  { id: 'offer_letter', label: '1. Offer', icon: Briefcase },
                  { id: 'appointment_letter', label: '2. Appointment', icon: FileText },
                  { id: 'sales_incentive_letter', label: '3. Incentive', icon: Target },
                  { id: 'relieving_letter', label: '4. Experience', icon: Award },
                  { id: 'salary_certificate', label: '5. Salary Slip', icon: CreditCard },
                  { id: 'id_card', label: '6. ID Card', icon: ShieldCheck },
                  { id: 'notice_letter', label: '7. Notice', icon: AlertTriangle, isWarning: true },
                ].map(doc => {
                  const isActive = activeDoc === doc.id;
                  const Icon = doc.icon;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setActiveDoc(doc.id as DocumentType);
                        if (doc.id === 'sales_incentive_letter') setSelectedCategoryFilter('Sales');
                        if (doc.id === 'notice_letter') setSelectedCategoryFilter('Notices');
                        const t = templates.find(item => item.docType === doc.id);
                        if (t) handleApplyTemplate(t.id);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? doc.isWarning 
                            ? 'bg-red-600 text-white shadow-2xs' 
                            : 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{doc.label}</span>
                    </button>
                  );
                })}

                {/* Active Indicator for Extended Catalogue Letters */}
                {!['offer_letter', 'appointment_letter', 'sales_incentive_letter', 'relieving_letter', 'salary_certificate', 'id_card', 'notice_letter'].includes(activeDoc) && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>{getLetterById(activeDoc)?.shortTitle || getLetterById(activeDoc)?.title || activeDoc}</span>
                  </div>
                )}

                {/* Full 28-Letter Enterprise Catalogue Popover */}
                <Popover open={cataloguePickerOpen} onOpenChange={setCataloguePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs"
                    >
                      <BookOpen className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>Catalogue ({ALL_HR_LETTERS.length})</span>
                      <ChevronsUpDown className="w-3 h-3 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] sm:w-[500px] p-3 shadow-xl rounded-xl border border-border" align="end">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-purple-600" />
                            Enterprise HR Letter Catalogue
                          </h4>
                          <p className="text-[10px] text-muted-foreground">
                            {ALL_HR_LETTERS.length} statutory letters across 9 specialized HR categories
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                          All ISO Compliant
                        </span>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search letters (e.g. probation, promotion, NOC, bonus)..."
                          value={catalogueSearchQuery}
                          onChange={(e) => setCatalogueSearchQuery(e.target.value)}
                          className="w-full bg-muted/40 border rounded-lg pl-8 pr-3 py-1 text-xs focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                        <button
                          onClick={() => setCatalogueCategoryFilter('ALL')}
                          className={`px-2 py-0.5 rounded-md font-bold shrink-0 transition-all cursor-pointer ${
                            catalogueCategoryFilter === 'ALL'
                              ? 'bg-purple-600 text-white'
                              : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          All ({ALL_HR_LETTERS.length})
                        </button>
                        {HR_CATEGORY_META.map(cat => {
                          const count = ALL_HR_LETTERS.filter(l => l.category === cat.id).length;
                          if (count === 0) return null;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setCatalogueCategoryFilter(cat.id)}
                              className={`px-2 py-0.5 rounded-md font-bold shrink-0 transition-all cursor-pointer ${
                                catalogueCategoryFilter === cat.id
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                              }`}
                            >
                              {cat.shortLabel} ({count})
                            </button>
                          );
                        })}
                      </div>

                      {/* Filtered Letters List */}
                      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                        {ALL_HR_LETTERS
                          .filter(l => catalogueCategoryFilter === 'ALL' || l.category === catalogueCategoryFilter)
                          .filter(l => {
                            if (!catalogueSearchQuery.trim()) return true;
                            const q = catalogueSearchQuery.toLowerCase();
                            return l.title.toLowerCase().includes(q) ||
                              l.shortTitle.toLowerCase().includes(q) ||
                              l.purpose.toLowerCase().includes(q) ||
                              l.refCode.toLowerCase().includes(q);
                          })
                          .map(letter => {
                            const isSelected = activeDoc === letter.id;
                            const catMeta = HR_CATEGORY_META.find(c => c.id === letter.category);
                            return (
                              <button
                                key={letter.id}
                                onClick={() => {
                                  setActiveDoc(letter.id as DocumentType);
                                  setCataloguePickerOpen(false);
                                  toast({
                                    title: `Letter Selected: ${letter.title}`,
                                    description: `Switched document canvas to ${letter.shortTitle}.`,
                                  });
                                }}
                                className={`w-full text-left p-2 rounded-lg transition-all flex items-start justify-between gap-2 border cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-950 dark:text-purple-200'
                                    : 'bg-card hover:bg-muted/40 border-border/50'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-foreground">{letter.title}</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                                      {letter.refCode}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                                      {catMeta?.shortLabel || letter.category}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                                    {letter.purpose}
                                  </p>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 3: Role Filter & Template Picker (Clean 2-tier responsive deck, zero overlap) */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 bg-muted/20 border border-border/60 rounded-lg p-2 text-xs">
              {/* Left: Role Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">Role:</span>
                {(['All', 'Accounts', 'Stock', 'Receptionist', 'Sales', 'Production', 'Notices'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className={`text-[10.5px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      selectedCategoryFilter === cat
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-background hover:bg-muted text-muted-foreground border border-border/50'
                    }`}
                  >
                    {cat === 'All' ? 'All' : cat}
                  </button>
                ))}
              </div>

              {/* Right: Template Selector & Management Actions */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">Template:</span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="bg-background border border-border rounded-md px-2.5 py-1 text-xs font-semibold text-foreground focus:ring-1 focus:ring-purple-500 cursor-pointer w-48 sm:w-60 truncate"
                  >
                    {filteredTemplates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.isBuiltIn ? '📋' : '⭐'} {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManageTemplatesModalOpen(true)}
                    className="h-7 text-[11px] gap-1 px-2.5 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 cursor-pointer font-medium"
                    title="Manage custom templates"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Templates ({templates.filter(t => !t.isBuiltIn).length})</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setNewTemplateForm({
                        name: `${activePerson?.designation || 'Custom'} ${activeDoc === 'sales_incentive_letter' ? 'Incentive Scheme' : (activeDoc === 'notice_letter' ? 'Notice' : 'Template')}`,
                        category: (selectedCategoryFilter !== 'All' ? selectedCategoryFilter : 'General') as TemplateCategory,
                        description: `Customized responsibilities and clauses for ${activePerson?.name || 'staff'}`
                      });
                      setSaveTemplateModalOpen(true);
                    }}
                    className="h-7 text-[11px] gap-1 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Template</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── MAIN WORKSPACE (LEFT SETTINGS SIDEBAR + RIGHT STAGED DOCUMENT CANVAS) ── */}
      {studioTab === 'composer' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Document Customizer Sidebar (4 cols, Sticky) */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 text-xs lg:sticky lg:top-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" /> Document Configuration
            </h3>
            <span className="text-[10px] text-muted-foreground">Live updates on right</span>
          </div>

          {/* Section 0: Unregistered Candidate Details Form */}
          {isCandidateMode && (
            <div className="space-y-3 bg-purple-500/5 border border-purple-500/20 p-3.5 rounded-xl">
              <div className="flex items-center justify-between pb-1 border-b border-purple-500/20">
                <span className="font-bold text-purple-700 dark:text-purple-300 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Candidate Information
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono font-bold">
                  Candidate Mode
                </span>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-foreground">Candidate Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-bold"
                  placeholder="e.g. Ramesh Kumar"
                  value={candidateData.name}
                  onChange={(e) => setCandidateData({ ...candidateData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Department</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    placeholder="e.g. Accounts / Stock"
                    value={candidateData.department}
                    onChange={(e) => setCandidateData({ ...candidateData, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Designation</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    placeholder="e.g. Senior Accountant"
                    value={candidateData.designation}
                    onChange={(e) => setCandidateData({ ...candidateData, designation: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Gross Monthly Pay</label>
                  <input 
                    type="number" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-bold text-purple-600"
                    value={candidateData.base_salary_monthly || ''}
                    onChange={(e) => setCandidateData({ ...candidateData, base_salary_monthly: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Mobile Phone</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={candidateData.contactinfo}
                    onChange={(e) => setCandidateData({ ...candidateData, contactinfo: e.target.value })}
                  />
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleRegisterCandidate}
                disabled={isRegisteringCandidate}
                className="w-full text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 border-purple-300 gap-1.5 cursor-pointer mt-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {isRegisteringCandidate ? 'Registering...' : 'Register to Employee Master'}
              </Button>
            </div>
          )}

          {/* Registered Employee In-place Customizer */}
          {!isCandidateMode && selectedEmployee && (
            <div className="space-y-3 bg-muted/30 border border-border/80 p-3.5 rounded-xl">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <span className="font-bold text-foreground uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-purple-600" /> Adapt Staff Details
                </span>
                {isOverridden && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
                    Modified
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Designation</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={empOverrides.designation}
                    onChange={(e) => setEmpOverrides({ ...empOverrides, designation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Department</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={empOverrides.department}
                    onChange={(e) => setEmpOverrides({ ...empOverrides, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Base Salary (₹/mo)</label>
                  <input 
                    type="number" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-bold text-purple-600"
                    value={empOverrides.base_salary_monthly || ''}
                    onChange={(e) => setEmpOverrides({ ...empOverrides, base_salary_monthly: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Joining Date</label>
                  <input 
                    type="date" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={empOverrides.doj}
                    onChange={(e) => setEmpOverrides({ ...empOverrides, doj: e.target.value })}
                  />
                </div>
              </div>

              {isOverridden && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleResetOverrides}
                    className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveToDatabase}
                    disabled={isUpdatingDb}
                    className="text-[11px] h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white ml-auto cursor-pointer"
                  >
                    <Save className="w-3 h-3 mr-1" /> {isUpdatingDb ? 'Saving...' : 'Save to Master'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── HR LETTER CATALOGUE PROFILE & DYNAMIC FIELDS ── */}
          {getLetterById(activeDoc) && (
            <div className="space-y-3 pt-3 border-t border-border">
              {/* Profile Card */}
              <div className="bg-muted/30 border border-border/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {HR_CATEGORY_META.find(c => c.id === getLetterById(activeDoc)?.category)?.label || getLetterById(activeDoc)?.category}
                  </span>
                  <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    REF: {getLetterById(activeDoc)?.refCode} • {getLetterById(activeDoc)?.sensitivity.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground leading-tight">
                    {getLetterById(activeDoc)?.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {getLetterById(activeDoc)?.purpose}
                  </p>
                </div>

                {/* Legal Advisory / Statutory Compliance Notes */}
                {getLetterById(activeDoc)?.legalNotes && getLetterById(activeDoc)!.legalNotes!.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5 text-[10px] text-amber-900 dark:text-amber-200 space-y-1">
                    <p className="font-bold flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      Statutory HR Compliance &amp; Guidelines:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                      {getLetterById(activeDoc)!.legalNotes!.map((note, nIdx) => (
                        <li key={nIdx} className="leading-tight">{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Dynamic Specific Fields for Extended Catalogue Letters */}
              {!['offer_letter', 'appointment_letter', 'sales_incentive_letter', 'id_card', 'notice_letter', 'relieving_letter', 'salary_certificate'].includes(activeDoc) && (
                <div className="space-y-2.5 bg-muted/20 border border-border/60 p-3 rounded-xl">
                  <span className="font-bold text-purple-600 uppercase text-[10.5px] tracking-wider block">
                    Letter Parameters &amp; Custom Fields
                  </span>
                  {getLetterById(activeDoc)?.specificFields
                    .filter(f => !['signatoryName', 'signatoryDesignation', 'issueDate'].includes(f.key))
                    .map(field => {
                      const val = catalogueFieldValues[field.key] ?? field.defaultValue ?? '';
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="font-semibold text-xs text-muted-foreground flex items-center justify-between">
                            <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                            {field.helpText && <span className="text-[9.5px] text-muted-foreground font-normal">{field.helpText}</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              rows={2}
                              value={val}
                              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                              onChange={(e) => setCatalogueFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full border rounded-lg p-2 bg-background text-xs font-medium resize-none leading-relaxed"
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={val}
                              onChange={(e) => setCatalogueFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                            >
                              {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              value={val}
                              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                              onChange={(e) => setCatalogueFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ── SECTION A: ROLES & RESPONSIBILITIES (FOR OFFER & APPOINTMENT LETTERS) ── */}
          {(activeDoc === 'offer_letter' || activeDoc === 'appointment_letter') && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">
                  Role Duties &amp; Responsibilities ({rolesAndDuties.length})
                </span>
                <span className="text-[10px] text-muted-foreground">Appears in letter</span>
              </div>

              {/* Duties List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {rolesAndDuties.map((duty, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 bg-muted/40 p-2 rounded-lg border border-border/50 group">
                    <span className="font-bold text-purple-600 text-xs mt-0.5">{idx + 1}.</span>
                    <p className="text-[11px] text-foreground flex-1 leading-snug">{duty}</p>
                    <button
                      onClick={() => handleRemoveDuty(idx)}
                      className="text-muted-foreground hover:text-red-500 opacity-60 group-hover:opacity-100 p-0.5 transition-all cursor-pointer"
                      title="Remove this duty"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Duty Input */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Add custom duty or responsibility..."
                  className="flex-1 border rounded-lg px-2.5 py-1.5 bg-background text-xs"
                  value={newDutyInput}
                  onChange={(e) => setNewDutyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDuty();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddDuty}
                  disabled={!newDutyInput.trim()}
                  className="h-8 px-2.5 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Employment parameters */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Work Location</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={docConfig.workLocation}
                    onChange={(e) => setDocConfig({ ...docConfig, workLocation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Work Hours</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={docConfig.workHours}
                    onChange={(e) => setDocConfig({ ...docConfig, workHours: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Probation Period</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={docConfig.probationPeriod}
                    onChange={(e) => setDocConfig({ ...docConfig, probationPeriod: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Notice Period</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={docConfig.noticePeriod}
                    onChange={(e) => setDocConfig({ ...docConfig, noticePeriod: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Special / Role Clauses</label>
                <textarea 
                  rows={3}
                  className="w-full border rounded-lg p-2.5 bg-background text-xs font-medium resize-none leading-relaxed"
                  value={docConfig.customClause}
                  onChange={(e) => setDocConfig({ ...docConfig, customClause: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ── SECTION B: SALES INCENTIVE LETTER CUSTOMIZER ── */}
          {activeDoc === 'sales_incentive_letter' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-emerald-600 uppercase text-[10px] tracking-wider block">
                🎯 Sales Quotas &amp; Incentive Slabs
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Target Amount (₹)</label>
                  <input 
                    type="number" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-bold text-emerald-600"
                    value={salesTargetAmount}
                    onChange={(e) => setSalesTargetAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Credit Limit (Days)</label>
                  <input 
                    type="number" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={collectionDaysLimit}
                    onChange={(e) => setCollectionDaysLimit(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Target Metric / Unit</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                  value={salesTargetUnit}
                  onChange={(e) => setSalesTargetUnit(e.target.value)}
                />
              </div>

              {/* Incentive Slabs Overview */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <span className="font-bold text-foreground text-[11px] block">Commission Tiers ({incentiveTiers.length}):</span>
                {incentiveTiers.map((tier) => (
                  <div key={tier.id} className="bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-lg space-y-1 text-[11px]">
                    <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                      <span>{tier.tierName}</span>
                      <span className="font-mono bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded text-[10px]">{tier.incentiveRate}</span>
                    </div>
                    <p className="text-muted-foreground text-[10px]">{tier.achievementRange} • Bonus: {tier.bonusAmount || 'N/A'}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Travel Allowance (₹/KM)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={travelAllowancePerKm}
                    onChange={(e) => setTravelAllowancePerKm(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-muted-foreground">Daily Field DA (₹/day)</label>
                  <input 
                    type="number" 
                    className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                    value={dailyAllowance}
                    onChange={(e) => setDailyAllowance(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION C: NOTICE LETTER CUSTOMIZER ── */}
          {activeDoc === 'notice_letter' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-red-600 uppercase text-[10px] tracking-wider block">
                ⚠️ Notice Specifications &amp; Severity
              </span>

              {/* Severity Pill Selector */}
              <div>
                <label className="font-semibold block mb-1.5 text-muted-foreground">Notice Classification</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Warning', 'Show Cause', 'PIP', 'Misconduct', 'Termination', 'Memo'] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setDocConfig({ ...docConfig, noticeSeverity: sev })}
                      className={`text-[10px] font-bold py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                        docConfig.noticeSeverity === sev
                          ? (sev === 'Termination' ? 'bg-red-600 text-white border-red-700' :
                             sev === 'Show Cause' ? 'bg-orange-600 text-white border-orange-700' :
                             sev === 'Warning' ? 'bg-amber-600 text-white border-amber-700' :
                             sev === 'PIP' ? 'bg-blue-600 text-white border-blue-700' :
                             'bg-purple-600 text-white border-purple-700')
                          : 'bg-background hover:bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Notice Subject Line</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-bold text-foreground"
                  value={docConfig.noticeSubject}
                  onChange={(e) => setDocConfig({ ...docConfig, noticeSubject: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-muted-foreground">Notice Body Text</label>
                  <span className="text-[10px] text-purple-600 font-mono">Dynamic Placeholders enabled</span>
                </div>
                <textarea 
                  rows={6}
                  className="w-full border rounded-lg p-2.5 bg-background text-xs font-medium resize-y leading-relaxed font-sans"
                  value={docConfig.noticeBody}
                  onChange={(e) => setDocConfig({ ...docConfig, noticeBody: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Explanation Deadline (Hours)</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.explanationDeadlineHours}
                  onChange={(e) => setDocConfig({ ...docConfig, explanationDeadlineHours: Number(e.target.value) })}
                >
                  <option value={24}>Within 24 Hours</option>
                  <option value={48}>Within 48 Hours</option>
                  <option value={72}>Within 72 Hours (3 Days)</option>
                  <option value={168}>Within 7 Calendar Days</option>
                </select>
              </div>
            </div>
          )}

          {/* ── SECTION D: RELIEVING / SALARY / ID CARD FIELDS ── */}
          {activeDoc === 'relieving_letter' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Relieving &amp; Conduct</span>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Formal Relieving Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.relievingDate}
                  onChange={(e) => setDocConfig({ ...docConfig, relievingDate: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Conduct Rating</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.conductRating}
                  onChange={(e) => setDocConfig({ ...docConfig, conductRating: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Reason for Relieving</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.relievingReason}
                  onChange={(e) => setDocConfig({ ...docConfig, relievingReason: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeDoc === 'salary_certificate' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Salary Certificate Details</span>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Addressed To</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.addressedTo}
                  onChange={(e) => setDocConfig({ ...docConfig, addressedTo: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Certificate Purpose</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.certificatePurpose}
                  onChange={(e) => setDocConfig({ ...docConfig, certificatePurpose: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeDoc === 'id_card' && (
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">ID Card Badge Details</span>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Blood Group</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.bloodGroup}
                  onChange={(e) => setDocConfig({ ...docConfig, bloodGroup: e.target.value })}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Emergency Contact Phone</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.emergencyContact}
                  onChange={(e) => setDocConfig({ ...docConfig, emergencyContact: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Valid Upto Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-lg px-3 py-2 bg-background text-xs font-medium"
                  value={docConfig.validUpto}
                  onChange={(e) => setDocConfig({ ...docConfig, validUpto: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Common Signatory Meta */}
          <div className="space-y-3 pt-3 border-t border-border">
            <span className="font-bold text-purple-600 uppercase text-[10px] tracking-wider block">Signatory &amp; Issue Date</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Signatory Name</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                  value={docConfig.signatoryName}
                  onChange={(e) => setDocConfig({ ...docConfig, signatoryName: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Signatory Post</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-background text-xs font-medium"
                  value={docConfig.signatoryDesignation}
                  onChange={(e) => setDocConfig({ ...docConfig, signatoryDesignation: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1 text-muted-foreground">Issue Date</label>
              <input 
                type="date" 
                className="w-full border rounded-lg px-3 py-1.5 bg-background text-xs font-medium"
                value={docConfig.issueDate}
                onChange={(e) => setDocConfig({ ...docConfig, issueDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Document Canvas Staging Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center justify-start bg-slate-100/70 dark:bg-slate-900/50 p-4 sm:p-6 lg:p-8 rounded-2xl border border-border overflow-x-auto">
          
          {/* Top Paper Calibration Bar */}
          <div className="w-full max-w-[210mm] flex items-center justify-between text-xs text-muted-foreground pb-2 px-1">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <FileText className="w-4 h-4 text-purple-600" />
              Standard A4 Page (210mm × 297mm)
            </span>
            <span className="text-[11px] bg-background border border-border px-2.5 py-0.5 rounded-full font-mono text-muted-foreground shadow-2xs">
              ISO 216 • Aspect Ratio 1:1.414 • Print &amp; PDF Ready
            </span>
          </div>

          {!activePerson ? (
            <div className="w-full max-w-[210mm] bg-card border border-border rounded-xl p-12 text-center text-muted-foreground space-y-3">
              <User className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <h3 className="font-bold text-foreground text-base">No Employee or Candidate Selected</h3>
              <p className="text-xs">Please select a registered employee or switch to Candidate Mode.</p>
            </div>
          ) : (
            <div 
              id="printable-a4-document"
              ref={printContainerRef}
              className="bg-white text-slate-900 shadow-2xl border border-slate-300/80 rounded-xs font-sans transition-all w-full max-w-[210mm] min-h-[297mm] p-[10mm] sm:p-[12mm] box-border relative flex flex-col justify-between"
              style={{ color: '#0f172a' }}
            >

              {/* ────────────────── 1. OFFER LETTER ────────────────── */}
              {activeDoc === 'offer_letter' && (
                <div className="space-y-2.5 text-xs leading-normal">
                  {renderHeader()}

                  {/* Recipient / Candidate Meta Block */}
                  <div className="space-y-0.5 border-b border-slate-200 pb-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider">To / Candidate Details:</p>
                      <span className="font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                        REF ID: {activePerson.employee_id || (isCandidateMode ? 'CAND-0010' : 'EMP-0010')}
                      </span>
                    </div>
                    <p className="font-black text-sm text-slate-950 uppercase tracking-tight">{activePerson.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-[10.5px] text-slate-600">
                      <span>Proposed Role: <strong>{activePerson.designation || 'Staff'}</strong> ({activePerson.department || 'Operations'})</span>
                      {activePerson.contactinfo && <span>• Mobile: {activePerson.contactinfo}</span>}
                      {activePerson.aadhar_number && <span>• Aadhaar: {activePerson.aadhar_number}</span>}
                    </div>
                  </div>

                  {/* Offer Title Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-1 px-4 rounded text-center shadow-xs border border-amber-400/40">
                    <h2 className="font-serif font-black text-xs tracking-[2px] uppercase text-amber-200">
                      Letter of Offer of Employment
                    </h2>
                  </div>

                  <p className="text-xs">Dear <strong>{activePerson.name}</strong>,</p>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    We are pleased to extend an offer of employment with <strong>{companyName}</strong> for the position of{' '}
                    <strong>{activePerson.designation || 'Team Associate'}</strong> in our{' '}
                    <strong>{activePerson.department || 'Operations'}</strong> Department.
                    We believe that your skill set, dedication, and energy will make a notable contribution to our company.
                  </p>

                  {/* Role Duties & Responsibilities Section */}
                  {rolesAndDuties.length > 0 && (
                    <div className="my-1.5 border border-slate-200 rounded-lg p-2.5 bg-slate-50/70">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-slate-800 mb-1">
                        Key Responsibilities &amp; Assigned Duties:
                      </p>
                      <ul className="list-decimal pl-4 space-y-0.5 text-[10.5px] text-slate-700">
                        {rolesAndDuties.map((duty, idx) => (
                          <li key={idx} className="leading-snug">{replaceTokens(duty)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Terms & Compensation Table */}
                  <div className="my-1.5 border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1 font-bold text-[9.5px] uppercase tracking-wider text-slate-700 flex justify-between items-center">
                      <span>Summary of Terms &amp; Compensation</span>
                      <span className="font-mono text-[8.5px] text-slate-500">Corporate Master Pay Grade</span>
                    </div>
                    <table className="w-full text-[10.5px] text-left">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1 font-semibold bg-slate-50 w-1/3">Designation / Role:</td>
                          <td className="px-3 py-1 font-medium">{activePerson.designation || 'Staff'}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1 font-semibold bg-slate-50">Department:</td>
                          <td className="px-3 py-1">{activePerson.department || 'General'}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1 font-semibold bg-slate-50">Proposed Date of Joining:</td>
                          <td className="px-3 py-1 font-bold text-slate-900">{formatDate(docConfig.joiningDate)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1 font-semibold bg-slate-50">Work Location:</td>
                          <td className="px-3 py-1">{docConfig.workLocation}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1 font-semibold bg-slate-50">Employment Type:</td>
                          <td className="px-3 py-1 font-medium">
                            {activePerson.employee_type === 'FIXED' ? 'Regular Monthly Salaried' : 'Daily Wage Variable'}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-1 font-semibold bg-slate-50">Gross Base Monthly Salary:</td>
                          <td className="px-3 py-1 font-bold text-purple-900">{formatCurrency(monthlyBase)} / month</td>
                        </tr>
                        {activePerson.employee_type === 'FIXED' && (
                          <tr className="border-b border-slate-200">
                            <td className="px-3 py-1 font-semibold bg-slate-50">Annual Cost to Company (CTC):</td>
                            <td className="px-3 py-1 font-bold text-slate-900">{formatCurrency(annualCtc)} per annum</td>
                          </tr>
                        )}
                        <tr>
                          <td className="px-3 py-1 font-semibold bg-slate-50">Probation Period:</td>
                          <td className="px-3 py-1">{docConfig.probationPeriod}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {docConfig.customClause && (
                    <div className="my-1.5 p-2 bg-purple-50/70 border border-purple-200 rounded text-[10px] space-y-0.5">
                      <span className="font-bold text-purple-900 block uppercase tracking-wide text-[8.5px]">Special Clauses / Additional Terms:</span>
                      <p className="text-slate-700 whitespace-pre-line leading-tight">{replaceTokens(docConfig.customClause)}</p>
                    </div>
                  )}

                  <p className="text-[10.5px] text-slate-700 leading-snug">
                    Your appointment is subject to verification of your professional credentials and identity documents (Aadhaar, PAN). A formal Appointment Letter containing full standing orders will be issued upon joining.
                  </p>

                  <p className="text-[10.5px] text-slate-700 leading-snug">
                    Kindly sign and return a duplicate copy of this letter as a token of your formal acceptance of this offer on or before{' '}
                    <strong>{formatDate(docConfig.joiningDate)}</strong>.
                  </p>

                  <p className="text-[11px] font-medium text-slate-900 pt-0.5">
                    We look forward to welcoming you to the <strong>{companyName}</strong> family!
                  </p>

                  {renderSignatory()}
                </div>
              )}

              {/* ────────────────── 2. APPOINTMENT LETTER ────────────────── */}
              {activeDoc === 'appointment_letter' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-xs space-y-1 mb-4">
                    <p className="font-semibold text-slate-500">To,</p>
                    <p className="font-bold text-base text-slate-900">{activePerson.name}</p>
                    <p className="font-mono text-purple-700">Employee / Ref ID: {activePerson.employee_id || 'CAND-REF'}</p>
                    {activePerson.contactinfo && <p className="text-slate-600">Mobile: {activePerson.contactinfo}</p>}
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded text-center">
                    <h2 className="font-bold text-base text-purple-900 tracking-wide uppercase">
                      Letter of Appointment
                    </h2>
                  </div>

                  <p>Dear <strong>{activePerson.name}</strong>,</p>

                  <p>
                    Further to your acceptance of our offer, the management of <strong>{companyName}</strong> is pleased to confirm your appointment as{' '}
                    <strong>{activePerson.designation || 'Executive'}</strong> in the{' '}
                    <strong>{activePerson.department || 'Operations'}</strong> Department, effective from{' '}
                    <strong>{formatDate(docConfig.joiningDate)}</strong>.
                  </p>

                  <div className="space-y-3 text-xs text-slate-800">
                    <p className="font-bold text-sm text-slate-900 border-b pb-1">Terms and Conditions of Employment:</p>
                    
                    <p>
                      <strong>1. Remuneration &amp; Benefits:</strong> Your total monthly salary will be{' '}
                      <strong>{formatCurrency(monthlyBase)}</strong>, subject to statutory deductions (PF, ESIC, TDS if applicable) and attendance parameters as per company policy.
                    </p>

                    <p>
                      <strong>2. Probation &amp; Confirmation:</strong> You will be on probation for an initial period of{' '}
                      <strong>{docConfig.probationPeriod}</strong>. Upon satisfactory evaluation of your performance and conduct, your services will be confirmed in writing.
                    </p>

                    <p>
                      <strong>3. Working Hours &amp; Schedule:</strong> Your standard working hours will be{' '}
                      <strong>{docConfig.workHours}</strong>. You may be required to work additional hours or shifts depending on operational exigencies.
                    </p>

                    {/* Dynamic Roles & Responsibilities Section */}
                    <div>
                      <p className="font-bold text-slate-900 mb-1">4. Key Roles &amp; Duties:</p>
                      <ul className="list-decimal pl-5 space-y-1 text-slate-700">
                        {rolesAndDuties.length > 0 ? (
                          rolesAndDuties.map((duty, idx) => (
                            <li key={idx} className="leading-snug">{replaceTokens(duty)}</li>
                          ))
                        ) : (
                          <li>Faithfully perform all duties and responsibilities assigned by management.</li>
                        )}
                      </ul>
                    </div>

                    <p>
                      <strong>5. Confidentiality &amp; Non-Disclosure:</strong> You agree that all customer data, formulas, pricing, accounts, software, and trade secrets of {companyName} are strictly confidential and shall not be disclosed to any third party during or after your tenure.
                    </p>

                    <p>
                      <strong>6. Termination &amp; Notice Period:</strong> During probation, either party may terminate this employment by giving 15 days written notice. Post confirmation, the notice period shall be{' '}
                      <strong>{docConfig.noticePeriod}</strong> or salary in lieu thereof.
                    </p>

                    {docConfig.customClause && (
                      <p className="break-words [overflow-wrap:anywhere] bg-purple-50/60 p-2.5 rounded border border-purple-200">
                        <strong>7. Special Terms &amp; Provisions:</strong>{' '}
                        <span className="break-words [overflow-wrap:anywhere]">{replaceTokens(docConfig.customClause)}</span>
                      </p>
                    )}
                  </div>

                  <p className="text-xs pt-2">
                    Please sign the duplicate copy of this letter as an endorsement of your acceptance of the terms outlined above.
                  </p>

                  {renderSignatory()}
                </div>
              )}

              {/* ────────────────── 3. SALES INCENTIVE LETTER (NEW!) ────────────────── */}
              {activeDoc === 'sales_incentive_letter' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-xs space-y-1 mb-4">
                    <p className="font-semibold text-slate-500">To,</p>
                    <p className="font-bold text-base text-slate-900">{activePerson.name}</p>
                    <p className="font-mono text-emerald-700 font-bold">Sales Officer ID: {activePerson.employee_id || 'SO-REF'}</p>
                    <p className="text-slate-600">Designation: {activePerson.designation || 'Sales Officer'}</p>
                    <p className="text-slate-600">Territory: {docConfig.workLocation || 'Assigned Territory & Beats'}</p>
                  </div>

                  <div className="bg-emerald-50 border-2 border-emerald-300 p-3 rounded-lg text-center shadow-xs">
                    <h2 className="font-black text-base text-emerald-900 tracking-wide uppercase">
                      Sales Target &amp; Incentive Scheme Agreement
                    </h2>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                      Performance Incentive &amp; Commission Policy (FY {new Date().getFullYear()}–{new Date().getFullYear() + 1})
                    </p>
                  </div>

                  <p>Dear <strong>{activePerson.name}</strong>,</p>

                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    In alignment with <strong>{companyName}</strong>'s business expansion objectives, we are pleased to issue your official Sales Target, Incentive Structure, and Field Commission Policy. This scheme has been structured to recognize and richly reward high-performing sales officers who exceed territory revenue benchmarks while maintaining exemplary credit discipline.
                  </p>

                  {/* Section 1: Quota Matrix */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wider text-slate-800">
                      1. Baseline Territory Sales Quota &amp; Parameters
                    </div>
                    <table className="w-full text-xs text-left">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50 w-1/3">Assigned Monthly Target:</td>
                          <td className="px-3 py-2 font-bold text-emerald-800 text-sm">{formatCurrency(salesTargetAmount)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Measurement Metric:</td>
                          <td className="px-3 py-2 font-medium">{salesTargetUnit}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-2 font-semibold bg-slate-50">Credit Realization Term:</td>
                          <td className="px-3 py-2 font-bold text-slate-900">Within {collectionDaysLimit} Days (Strict Limit)</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold bg-slate-50">Daily Field Mobility:</td>
                          <td className="px-3 py-2 font-medium">₹{travelAllowancePerKm}/KM (Odometer) + ₹{dailyAllowance}/Day Field DA</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2: Commission Tiers Table */}
                  <div className="border border-emerald-200 rounded-lg overflow-hidden my-3">
                    <div className="bg-emerald-800 text-white px-3 py-2 font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                      <span>2. Performance Commission &amp; Milestone Bonus Matrix</span>
                      <span className="text-[10px] font-normal text-emerald-200">Effective from {formatDate(docConfig.issueDate)}</span>
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead className="bg-emerald-50/80 border-b border-emerald-200 text-emerald-950 font-bold text-[11px]">
                        <tr>
                          <th className="px-3 py-2">Tier Level</th>
                          <th className="px-3 py-2">Target Achievement</th>
                          <th className="px-3 py-2">Incentive Rate</th>
                          <th className="px-3 py-2">Milestone Bonus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {incentiveTiers.map((tier) => (
                          <tr key={tier.id} className="hover:bg-emerald-50/30">
                            <td className="px-3 py-2 font-bold text-slate-900">{tier.tierName}</td>
                            <td className="px-3 py-2 font-medium text-slate-700">{tier.achievementRange}</td>
                            <td className="px-3 py-2 font-bold font-mono text-emerald-700">{tier.incentiveRate}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{tier.bonusAmount || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 3: Operating Terms & Realization Clauses */}
                  <div className="space-y-2 text-xs text-slate-800 border border-slate-200 rounded-lg p-3 bg-slate-50/70">
                    <p className="font-bold text-xs uppercase text-slate-900 border-b pb-1">
                      3. Operational Guidelines &amp; Disbursement Conditions:
                    </p>
                    <ul className="list-decimal pl-4 space-y-1.5 text-slate-700 leading-relaxed">
                      {salesConditions.map((cond, idx) => (
                        <li key={idx}>{replaceTokens(cond)}</li>
                      ))}
                    </ul>
                  </div>

                  {docConfig.customClause && (
                    <div className="my-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded text-xs text-slate-700">
                      <strong className="text-emerald-950">Management Clause:</strong> {replaceTokens(docConfig.customClause)}
                    </div>
                  )}

                  <p className="text-xs pt-1 text-slate-700">
                    Kindly sign and return a duplicate copy of this document as formal acceptance of your sales target commitments.
                  </p>

                  {renderSignatory()}
                </div>
              )}

              {/* ────────────────── 4. RELIEVING / EXPERIENCE CERTIFICATE ────────────────── */}
              {activeDoc === 'relieving_letter' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-center my-6">
                    <h2 className="font-extrabold text-lg text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                      Relieving &amp; Experience Certificate
                    </h2>
                  </div>

                  <div className="text-xs text-right font-semibold text-slate-600">
                    Ref No: CERT/{activePerson.employee_id || 'HR'}/{new Date().getFullYear()}
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    TO WHOMSOEVER IT MAY CONCERN
                  </div>

                  <p className="text-justify leading-7">
                    This is to formally certify that <strong>{activePerson.name}</strong> (Employee ID:{' '}
                    <strong className="font-mono">{activePerson.employee_id || 'N/A'}</strong>) was employed with{' '}
                    <strong>{companyName}</strong> from{' '}
                    <strong>{formatDate(activePerson.doj || '2023-01-01')}</strong> to{' '}
                    <strong>{formatDate(docConfig.relievingDate)}</strong>.
                  </p>

                  <p className="text-justify leading-7">
                    At the time of leaving the services of the organization, they were designated as{' '}
                    <strong>{activePerson.designation || 'Executive'}</strong> in the{' '}
                    <strong>{activePerson.department || 'Operations'}</strong> Department.
                  </p>

                  <p className="text-justify leading-7">
                    During their tenure with us, we found them to be diligent, honest, hardworking, and dedicated to their duties. Their professional conduct and personal character were found to be{' '}
                    <strong>{docConfig.conductRating}</strong>.
                  </p>

                  <p className="text-justify leading-7">
                    {activePerson.name} has been formally relieved from all responsibilities and company duties at the close of working hours on{' '}
                    <strong>{formatDate(docConfig.relievingDate)}</strong> following{' '}
                    {docConfig.relievingReason}. All company assets, tools, and dues have been properly cleared and accounted for.
                  </p>

                  {docConfig.customClause && (
                    <div className="my-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-700 break-words [overflow-wrap:anywhere]">
                      <strong className="text-slate-900">Additional Remarks / Service Note:</strong>{' '}
                      <span className="break-words [overflow-wrap:anywhere]">{replaceTokens(docConfig.customClause)}</span>
                    </div>
                  )}

                  <p className="pt-2">
                    We sincerely thank them for their contributions and wish them the very best in all their future endeavors and career pursuits.
                  </p>

                  <div className="pt-12">
                    {renderSignatory()}
                  </div>
                </div>
              )}

              {/* ────────────────── 5. SALARY CERTIFICATE ────────────────── */}
              {activeDoc === 'salary_certificate' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-center my-4">
                    <h2 className="font-extrabold text-lg text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block pb-1">
                      Salary Certificate
                    </h2>
                  </div>

                  <div className="text-xs space-y-1 mb-4">
                    <p className="font-semibold text-slate-500">To,</p>
                    <p className="font-bold text-sm text-slate-900">{docConfig.addressedTo}</p>
                  </div>

                  <p className="text-justify leading-7">
                    This is to certify that <strong>{activePerson.name}</strong> (Employee ID:{' '}
                    <strong className="font-mono">{activePerson.employee_id || 'N/A'}</strong>) is a permanent, full-time employee of{' '}
                    <strong>{companyName}</strong>, working as{' '}
                    <strong>{activePerson.designation || 'Staff'}</strong> in our{' '}
                    <strong>{activePerson.department || 'Operations'}</strong> Department since{' '}
                    <strong>{formatDate(activePerson.doj || '2023-01-01')}</strong>.
                  </p>

                  {/* Salary Statement Table */}
                  <div className="my-3 border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 font-bold text-xs uppercase text-slate-700 flex justify-between">
                      <span>Salary Component</span>
                      <span>Monthly Amount (INR)</span>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-2 text-slate-700">Basic Salary:</td>
                          <td className="px-4 py-2 font-mono font-bold text-right">{formatCurrency(monthlyBase * 0.5)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-2 text-slate-700">House Rent Allowance (HRA):</td>
                          <td className="px-4 py-2 font-mono font-bold text-right">{formatCurrency(monthlyBase * 0.25)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-2 text-slate-700">Special / Conveyance Allowance:</td>
                          <td className="px-4 py-2 font-mono font-bold text-right">{formatCurrency(monthlyBase * 0.25)}</td>
                        </tr>
                        <tr className="bg-purple-50/60 font-bold border-t-2 border-purple-200">
                          <td className="px-4 py-2 text-purple-900">Total Gross Monthly Salary:</td>
                          <td className="px-4 py-2 font-mono text-purple-900 text-sm text-right">{formatCurrency(monthlyBase)}</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="px-4 py-2 text-slate-800">Annual Gross Compensation (CTC):</td>
                          <td className="px-4 py-2 font-mono text-slate-900 text-sm text-right">{formatCurrency(annualCtc)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {docConfig.customClause && (
                    <div className="my-2 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                      <strong className="text-slate-900">Remarks / Special Allowances Note:</strong> {replaceTokens(docConfig.customClause)}
                    </div>
                  )}

                  {activePerson.bank_account_number && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                      <span className="font-bold text-slate-700 block">Bank Disbursement Account Details:</span>
                      <p>Bank: <strong>{activePerson.bank_name || 'Designated Bank'}</strong> • A/C No: <strong className="font-mono">{activePerson.bank_account_number}</strong> • IFSC: <strong className="font-mono">{activePerson.bank_ifsc || '—'}</strong></p>
                    </div>
                  )}

                  <p className="text-xs text-slate-700 pt-2">
                    This certificate is issued at the specific request of the individual {docConfig.certificatePurpose}, without any financial liability or warranty on the part of the company or its signatories.
                  </p>

                  {renderSignatory()}
                </div>
              )}

              {/* ────────────────── 6. EMPLOYEE ID CARD BADGE (A4 SHEET) ────────────────── */}
              {activeDoc === 'id_card' && (
                <div className="space-y-4 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded text-center">
                    <h2 className="font-bold text-base text-purple-900 tracking-wide uppercase">
                      Employee Identity Card &amp; Authorization Pass
                    </h2>
                    <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                      Standard A4 Printable Sheet • Dual-Sided Badges with Cut &amp; Laminate Guidelines
                    </p>
                  </div>

                  {/* Summary verification metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Employee Name</span>
                      <span className="font-bold text-slate-900">{activePerson.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Badge / Employee ID</span>
                      <span className="font-bold font-mono text-purple-700">{activePerson.employee_id || 'ID PENDING'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Designation</span>
                      <span className="font-bold text-slate-800">{activePerson.designation || 'Staff'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Department</span>
                      <span className="font-bold text-slate-800">{activePerson.department || 'Operations'}</span>
                    </div>
                  </div>

                  {/* Cutting guidelines notice */}
                  <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400 border-b border-dashed border-slate-300 pb-1 font-mono">
                    <span>✂ ── Cut along card border line and insert into standard CR80 lanyard holder ── ✂</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-5 justify-center items-center py-1">
                    
                    {/* FRONT SIDE */}
                    <div className="w-[260px] h-[390px] rounded-2xl overflow-hidden border-2 border-slate-800 shadow-lg bg-gradient-to-b from-white via-slate-50 to-purple-50/50 flex flex-col justify-between relative">
                      
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-slate-200 border border-slate-300"></div>

                      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white p-2.5 pt-5 text-center shadow">
                        <h3 className="font-black text-xs tracking-wider uppercase leading-tight truncate">{companyName}</h3>
                        <p className="text-[9px] text-purple-200 uppercase tracking-widest font-semibold">Identity Pass</p>
                      </div>

                      <div className="flex flex-col items-center px-3 -mt-2">
                        <div className="w-20 h-20 rounded-full border-4 border-white shadow overflow-hidden bg-white flex items-center justify-center">
                          {activePerson.employee_photo ? (
                            <img 
                              src={resolveMediaUrl(activePerson.employee_photo)} 
                              alt={activePerson.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-purple-100 text-purple-700 font-extrabold text-xl flex items-center justify-center">
                              {activePerson.name ? activePerson.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                          )}
                        </div>

                        <h4 className="font-black text-sm text-slate-900 mt-1.5 text-center leading-tight truncate max-w-[230px]">{activePerson.name}</h4>
                        <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide truncate max-w-[230px]">{activePerson.designation || 'Staff'}</span>
                        <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.2 rounded-full mt-0.5 border border-purple-200">
                          {activePerson.employee_id || 'ID Pending'}
                        </span>
                      </div>

                      <div className="px-4 py-1.5 text-[10px] space-y-0.5 text-slate-700">
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Department:</span>
                          <span className="font-bold text-slate-900 truncate max-w-[140px]">{activePerson.department || 'Operations'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Blood Group:</span>
                          <span className="font-bold text-red-600">{docConfig.bloodGroup}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-0.5">
                          <span className="text-slate-500 font-semibold">Joining Date:</span>
                          <span className="font-bold">{formatDate(activePerson.doj || todayStr)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-semibold">Valid Upto:</span>
                          <span className="font-bold">{formatDate(docConfig.validUpto)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white p-1.5 text-center">
                        <div className="font-mono text-[8px] tracking-[3px] uppercase text-slate-300">
                          * {activePerson.employee_id || 'CAND-0001'} *
                        </div>
                      </div>
                    </div>

                    {/* BACK SIDE */}
                    <div className="w-[260px] h-[390px] rounded-2xl overflow-hidden border-2 border-slate-800 shadow-lg bg-white flex flex-col justify-between p-3.5 relative text-center">
                      
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-slate-200 border border-slate-300"></div>

                      <div className="pt-3 space-y-1">
                        <h4 className="font-extrabold text-[11px] text-slate-900 uppercase truncate">{companyName}</h4>
                        <p className="text-[8px] text-slate-600 leading-tight px-1 line-clamp-2">{companyAddress}</p>
                        <p className="text-[9px] text-purple-700 font-semibold">Emergency: {docConfig.emergencyContact}</p>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[8px] text-slate-600 text-left space-y-0.5 leading-snug">
                        <p className="font-bold text-slate-900 uppercase">Card Rules &amp; Decorum:</p>
                        <p>1. Property of {companyName}; must be displayed during working hours.</p>
                        <p>2. If lost/found, surrender to company administration.</p>
                        <p>3. Non-transferable; surrender upon conclusion of tenure.</p>
                      </div>

                      <div className="border-t border-slate-200 pt-1.5 space-y-0.5">
                        <div className="h-7 flex items-center justify-center">
                          <span className="text-[9px] italic text-slate-400">[Authorized Signatory]</span>
                        </div>
                        <p className="font-bold text-[9px] text-slate-900 truncate">{docConfig.signatoryName}</p>
                        <p className="text-[8px] text-slate-500 truncate">{docConfig.signatoryDesignation}</p>
                      </div>

                      <div className="text-[8px] text-slate-400 font-mono">
                        System Generated • {companyEmail}
                      </div>
                    </div>

                  </div>

                  {/* Authorization Notice & Signatory */}
                  <div className="border border-slate-200 bg-slate-50/80 p-2.5 rounded-lg text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-900 uppercase text-[10px]">Official A4 Issuance Record &amp; Verification Note:</p>
                    <p className="text-[11px] leading-relaxed text-slate-700">
                      This A4 document certifies that the individual named above is an authorized employee of <strong>{companyName}</strong>. The photo identity pass printed hereon is authorized for premises entry, shift attendance logging, and client site visits.
                    </p>
                  </div>

                  {renderSignatory()}
                </div>
              )}

              {/* ────────────────── 7. NOTICE LETTER ────────────────── */}
              {activeDoc === 'notice_letter' && (
                <div className="space-y-5 text-sm leading-relaxed">
                  {renderHeader()}

                  <div className="text-xs space-y-1 mb-4">
                    <p className="font-semibold text-slate-500">To,</p>
                    <p className="font-bold text-base text-slate-900">{activePerson.name}</p>
                    <p className="font-mono text-purple-700">Employee ID: {activePerson.employee_id || 'N/A'}</p>
                    <p className="text-slate-600">Designation: {activePerson.designation || 'Staff'}</p>
                    <p className="text-slate-600">Department: {activePerson.department || 'Operations'}</p>
                  </div>

                  {/* Dynamic Severity Header */}
                  <div className={`border-2 p-3 rounded-lg text-center ${
                    docConfig.noticeSeverity === 'Warning' ? 'bg-amber-50 border-amber-300 text-amber-950' :
                    docConfig.noticeSeverity === 'Show Cause' ? 'bg-orange-50 border-orange-300 text-orange-950' :
                    docConfig.noticeSeverity === 'Termination' ? 'bg-red-50 border-red-400 text-red-950' :
                    docConfig.noticeSeverity === 'PIP' ? 'bg-blue-50 border-blue-300 text-blue-950' :
                    docConfig.noticeSeverity === 'Misconduct' ? 'bg-rose-50 border-rose-300 text-rose-950' :
                    'bg-purple-50 border-purple-300 text-purple-950'
                  }`}>
                    <h2 className="font-black text-base tracking-wider uppercase">
                      {docConfig.noticeSeverity} Notice
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block mt-0.5">
                      Formal Official HR Communication
                    </span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-900 border-b pb-1">
                      Subject: {replaceTokens(docConfig.noticeSubject)}
                    </p>
                    <p>Dear <strong>{activePerson.name}</strong>,</p>
                    <div className="whitespace-pre-wrap text-slate-800 text-xs leading-relaxed text-justify">
                      {replaceTokens(docConfig.noticeBody)}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <p className="font-bold text-slate-900">
                      Required Action: Written Explanation Deadline:
                    </p>
                    <p className="text-slate-700">
                      You are required to submit your formal written reply/explanation to the HR Department within{' '}
                      <strong>{docConfig.explanationDeadlineHours} Hours</strong> of receiving this notice. Failure to submit your reply within the stipulated time will result in ex-parte administrative action as per company standing orders.
                    </p>
                  </div>

                  <p className="text-xs pt-1 text-slate-600 italic">
                    Please sign and return the duplicate copy of this communication as an acknowledgment of receipt.
                  </p>

                  {renderSignatory()}
                </div>
              )}

              {/* ── 8. DYNAMIC HR LETTER CATALOGUE RENDERER (FOR EXTENDED CATALOGUE LETTERS) ── */}
              {getLetterById(activeDoc) && !['offer_letter', 'appointment_letter', 'sales_incentive_letter', 'relieving_letter', 'salary_certificate', 'id_card', 'notice_letter'].includes(activeDoc) && (
                <div className="space-y-4 text-xs leading-relaxed">
                  {renderHeader()}

                  {/* Letter Formal Subject / Header Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-1.5 px-4 rounded text-center shadow-xs border border-amber-400/40">
                    <h2 className="font-serif font-black text-xs tracking-[2px] uppercase text-amber-200">
                      {getLetterById(activeDoc)?.title}
                    </h2>
                    <span className="text-[8px] font-sans font-semibold tracking-wider text-slate-300 uppercase block mt-0.5">
                      Official Corporate Communication • Ref: {currentRefNumber}
                    </span>
                  </div>

                  {/* Recipient Details Block */}
                  <div className="space-y-0.5 border-b border-slate-200 pb-2 text-[10.5px]">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider">
                        {getLetterById(activeDoc)?.audience === 'all_staff' ? 'Circular Notice / Addressed To:' : 'Addressee / Recipient:'}
                      </p>
                      <span className="font-mono text-[8.5px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                        REF ID: {activePerson.employee_id || (isCandidateMode ? 'CAND-0010' : 'EMP-0010')}
                      </span>
                    </div>
                    <p className="font-black text-sm text-slate-950 uppercase tracking-tight">{activePerson.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-600">
                      <span>Designation: <strong>{activePerson.designation || 'Staff'}</strong></span>
                      <span>• Department: <strong>{activePerson.department || 'Operations'}</strong></span>
                      {activePerson.contactinfo && <span>• Mobile: {activePerson.contactinfo}</span>}
                      {activePerson.aadhar_number && <span>• Aadhaar: {activePerson.aadhar_number}</span>}
                    </div>
                  </div>

                  {/* Dynamic Sections from bodyTemplate */}
                  <div className="space-y-3 pt-1">
                    {getLetterById(activeDoc)?.bodyTemplate.map((section) => {
                      if (section.type === 'heading') {
                        return (
                          <div key={section.id} className="pt-1">
                            <h3 className="font-bold text-[11px] text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-1">
                              {replaceTokens(section.content || '')}
                            </h3>
                          </div>
                        );
                      }

                      if (section.type === 'paragraph') {
                        const content = replaceTokens(section.content || '');
                        if (!content.trim() && section.optional) return null;
                        return (
                          <p key={section.id} className="text-[11px] text-slate-800 leading-relaxed text-justify whitespace-pre-wrap">
                            {content}
                          </p>
                        );
                      }

                      if (section.type === 'table_terms') {
                        return (
                          <div key={section.id} className="my-2 border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
                            {section.label && (
                              <div className="bg-slate-100 px-3 py-1 font-bold text-[9px] uppercase tracking-wider text-slate-800 border-b border-slate-200">
                                {section.label}
                              </div>
                            )}
                            <table className="w-full text-[10px] text-left">
                              <tbody>
                                {section.rows?.map((row, rIdx) => (
                                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                    <td className="py-1 px-3 font-semibold text-slate-600 border-b border-slate-100 w-2/5">
                                      {replaceTokens(row.label)}
                                    </td>
                                    <td className="py-1 px-3 font-bold text-slate-900 border-b border-slate-100">
                                      {replaceTokens(row.value)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }

                      if (section.type === 'roles_duties') {
                        return rolesAndDuties.length > 0 ? (
                          <div key={section.id} className="my-1.5 border border-slate-200 rounded-lg p-2.5 bg-slate-50/70">
                            <p className="font-bold text-[9.5px] uppercase tracking-wider text-slate-800 mb-1">
                              Roles &amp; Assigned Responsibilities:
                            </p>
                            <ul className="list-decimal pl-4 space-y-0.5 text-[10px] text-slate-700">
                              {rolesAndDuties.map((duty, idx) => (
                                <li key={idx} className="leading-snug">{replaceTokens(duty)}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null;
                      }

                      if (section.type === 'salary_breakdown') {
                        return (
                          <div key={section.id} className="my-2 border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
                            <div className="bg-slate-100 px-3 py-1 font-bold text-[9px] uppercase tracking-wider text-slate-800 border-b border-slate-200 flex justify-between">
                              <span>Compensation Structure</span>
                              <span className="font-mono text-purple-900 font-bold">Total Monthly: {formatCurrency(monthlyBase)}</span>
                            </div>
                            <table className="w-full text-[10px] text-left">
                              <tbody>
                                <tr className="bg-white"><td className="py-1 px-3 text-slate-600 border-b border-slate-100 w-2/5">Basic Salary (50%)</td><td className="py-1 px-3 font-bold text-slate-900 border-b border-slate-100">{formatCurrency(basicSalary)}</td></tr>
                                <tr className="bg-slate-50/70"><td className="py-1 px-3 text-slate-600 border-b border-slate-100">House Rent Allowance - HRA (30%)</td><td className="py-1 px-3 font-bold text-slate-900 border-b border-slate-100">{formatCurrency(hraSalary)}</td></tr>
                                <tr className="bg-white"><td className="py-1 px-3 text-slate-600 border-b border-slate-100">Conveyance Allowance (10%)</td><td className="py-1 px-3 font-bold text-slate-900 border-b border-slate-100">{formatCurrency(conveyance)}</td></tr>
                                <tr className="bg-slate-50/70"><td className="py-1 px-3 text-slate-600 border-b border-slate-100">Special &amp; Performance Allowance (10%)</td><td className="py-1 px-3 font-bold text-slate-900 border-b border-slate-100">{formatCurrency(specialAllowance)}</td></tr>
                                <tr className="bg-purple-50/60 font-bold"><td className="py-1 px-3 text-purple-950 border-t border-purple-200">Total Cost to Company (Annual CTC)</td><td className="py-1 px-3 text-purple-950 border-t border-purple-200 font-black">{formatCurrency(annualCtc)}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      }

                      if (section.type === 'notice_box') {
                        const sevClass = 
                          section.severity === 'danger' ? 'bg-red-50 border-red-300 text-red-950' :
                          section.severity === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-950' :
                          section.severity === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' :
                          'bg-blue-50 border-blue-300 text-blue-950';

                        return (
                          <div key={section.id} className={`p-2.5 rounded-lg border text-[10px] leading-relaxed my-1.5 ${sevClass}`}>
                            {replaceTokens(section.content || '')}
                          </div>
                        );
                      }

                      if (section.type === 'bullet_list') {
                        return (
                          <ul key={section.id} className="list-disc pl-5 space-y-0.5 text-[10.5px] text-slate-700 my-1">
                            {section.items?.map((it, idx) => (
                              <li key={idx} className="leading-snug">{replaceTokens(it)}</li>
                            ))}
                          </ul>
                        );
                      }

                      if (section.type === 'numbered_list') {
                        return (
                          <ol key={section.id} className="list-decimal pl-5 space-y-0.5 text-[10.5px] text-slate-700 my-1">
                            {section.items?.map((it, idx) => (
                              <li key={idx} className="leading-snug">{replaceTokens(it)}</li>
                            ))}
                          </ol>
                        );
                      }

                      if (section.type === 'blank_lines') {
                        return <div key={section.id} className="h-3" />;
                      }

                      return null;
                    })}
                  </div>

                  {/* Statutory Signatures & Seal Block */}
                  {renderSignatory()}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
      )}

      {/* ── ISSUED LETTERS ARCHIVE & SEARCH VIEW ── */}
      {studioTab === 'archive' && (
        <div className="space-y-4">
          {/* Top Filter and Search Control Card */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  Official Issued Letters Repository
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Search, verify, preview, and re-print historical employment letters issued to staff and candidates.
                </p>
              </div>

              {/* Live Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Name, Ref No, ID, Role..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                {archiveSearch && (
                  <button 
                    onClick={() => setArchiveSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Document Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 border-t border-border/60 pb-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-purple-600" /> Type:
              </span>
              {[
                { type: 'ALL', label: 'All Letters' },
                { type: 'offer_letter', label: 'Offer Letters' },
                { type: 'appointment_letter', label: 'Appointment' },
                { type: 'sales_incentive_letter', label: 'Sales Incentive' },
                { type: 'relieving_letter', label: 'Experience / Relieving' },
                { type: 'salary_certificate', label: 'Salary Certificate' },
                { type: 'notice_letter', label: 'Notices & Memos' },
              ].map(f => {
                const count = f.type === 'ALL' 
                  ? issuedLetters.length 
                  : issuedLetters.filter(l => l.docType === f.type).length;
                return (
                  <button
                    key={f.type}
                    onClick={() => setArchiveTypeFilter(f.type as any)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      archiveTypeFilter === f.type
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      archiveTypeFilter === f.type ? 'bg-purple-700 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Total Letters Issued</p>
                <p className="text-lg font-black text-foreground">{issuedLetters.length}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Offer Letters</p>
                <p className="text-lg font-black text-foreground">{issuedLetters.filter(l => l.docType === 'offer_letter').length}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Appointments</p>
                <p className="text-lg font-black text-foreground">{issuedLetters.filter(l => l.docType === 'appointment_letter').length}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Notices &amp; Memos</p>
                <p className="text-lg font-black text-foreground">{issuedLetters.filter(l => l.docType === 'notice_letter').length}</p>
              </div>
            </div>
          </div>

          {/* Archive Data Table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-foreground">Archived Official Records</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  ({issuedLetters.filter(l => {
                    const matchesType = archiveTypeFilter === 'ALL' || l.docType === archiveTypeFilter;
                    if (!matchesType) return false;
                    if (!archiveSearch.trim()) return true;
                    const q = archiveSearch.toLowerCase();
                    return l.employeeName.toLowerCase().includes(q) || l.refNo.toLowerCase().includes(q) || l.employeeId.toLowerCase().includes(q) || l.designation.toLowerCase().includes(q) || l.department.toLowerCase().includes(q);
                  }).length} matched)
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStudioTab('composer')}
                className="h-8 text-xs gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Compose New Letter
              </Button>
            </div>

            {issuedLetters.filter(l => {
              const matchesType = archiveTypeFilter === 'ALL' || l.docType === archiveTypeFilter;
              if (!matchesType) return false;
              if (!archiveSearch.trim()) return true;
              const q = archiveSearch.toLowerCase();
              return l.employeeName.toLowerCase().includes(q) || l.refNo.toLowerCase().includes(q) || l.employeeId.toLowerCase().includes(q) || l.designation.toLowerCase().includes(q) || l.department.toLowerCase().includes(q);
            }).length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <Search className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <h4 className="font-bold text-foreground text-sm">No Matching Letters Found</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Try adjusting your search query or letter type filter, or issue a new letter from the composer studio.
                </p>
                <Button 
                  size="sm" 
                  onClick={() => { setArchiveSearch(''); setArchiveTypeFilter('ALL'); }}
                  variant="outline"
                  className="text-xs cursor-pointer"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground text-[10.5px] uppercase font-bold border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Official Ref No</th>
                      <th className="px-4 py-3">Recipient &amp; Role</th>
                      <th className="px-4 py-3">Letter Classification</th>
                      <th className="px-4 py-3">Dates (Issue / Joining)</th>
                      <th className="px-4 py-3">Compensation / Terms</th>
                      <th className="px-4 py-3">Authorized Signatory</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {issuedLetters.filter(l => {
                      const matchesType = archiveTypeFilter === 'ALL' || l.docType === archiveTypeFilter;
                      if (!matchesType) return false;
                      if (!archiveSearch.trim()) return true;
                      const q = archiveSearch.toLowerCase();
                      return l.employeeName.toLowerCase().includes(q) || l.refNo.toLowerCase().includes(q) || l.employeeId.toLowerCase().includes(q) || l.designation.toLowerCase().includes(q) || l.department.toLowerCase().includes(q);
                    }).map(letter => {
                      const docBadgeStyle = 
                        letter.docType === 'offer_letter' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200' :
                        letter.docType === 'appointment_letter' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200' :
                        letter.docType === 'sales_incentive_letter' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200' :
                        letter.docType === 'notice_letter' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';

                      return (
                        <tr key={letter.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">{letter.refNo}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(letter.refNo);
                                  toast({ title: 'Ref Copied', description: letter.refNo });
                                }}
                                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Copy Reference Number"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              Issued: {new Date(letter.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {letter.issuedBy}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <p className="font-bold text-foreground text-xs">{letter.employeeName}</p>
                            <p className="text-[11px] text-muted-foreground">{letter.designation} • {letter.department}</p>
                            <span className="font-mono text-[9px] text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.2 rounded border border-purple-200/50">
                              {letter.employeeId}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${docBadgeStyle}`}>
                              {letter.docTitle}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5 text-[11px]">
                              <div><span className="text-muted-foreground">Issued:</span> <strong className="text-foreground">{formatDate(letter.issueDate)}</strong></div>
                              {letter.joiningDate && (
                                <div><span className="text-muted-foreground">Joining:</span> <strong className="text-foreground">{formatDate(letter.joiningDate)}</strong></div>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {letter.salary > 0 ? (
                              <div>
                                <span className="font-bold text-foreground text-xs">{formatCurrency(letter.salary)}</span>
                                <span className="text-[10px] text-muted-foreground block">Monthly Base</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">As per standing policy</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-[11px]">
                            <p className="font-semibold text-foreground">{letter.signatoryName}</p>
                            <p className="text-[10px] text-muted-foreground">{letter.signatoryDesignation}</p>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingArchivedLetter(letter)}
                                className="h-7 text-[11px] px-2.5 gap-1 hover:bg-purple-50 text-purple-700 border-purple-200 dark:border-purple-800 cursor-pointer"
                                title="View exact letter"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteArchivedLetter(letter.id, letter.refNo)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                title="Revoke letter"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
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

      {/* ── MODAL 1: SAVE AS NEW TEMPLATE ── */}
      {saveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground">Save as Reusable Template</h3>
              </div>
              <button 
                onClick={() => setSaveTemplateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-foreground">Template Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Senior Store Keeper Damage Clause Appointment"
                  className="w-full border rounded-lg px-3 py-2 bg-background font-bold text-xs"
                  value={newTemplateForm.name}
                  onChange={(e) => setNewTemplateForm({ ...newTemplateForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Department / Role Category</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-background font-bold text-xs cursor-pointer"
                  value={newTemplateForm.category}
                  onChange={(e) => setNewTemplateForm({ ...newTemplateForm, category: e.target.value as TemplateCategory })}
                >
                  <option value="Accounts">💼 Accounts (Finance, Cashier, Billing)</option>
                  <option value="Stock">📦 Stock (Warehouse, Store Keeper, Dispatch)</option>
                  <option value="Receptionist">🏢 Receptionist (Front Desk, Admin)</option>
                  <option value="Sales">🎯 Sales &amp; Field Operations</option>
                  <option value="Production">🏭 Production &amp; Plant Operations</option>
                  <option value="HR">👥 HR &amp; Workforce</option>
                  <option value="General">🌐 General / Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-muted-foreground">Short Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Standard terms with strict inventory custody and cycle count terms"
                  className="w-full border rounded-lg p-2.5 bg-background font-medium text-xs resize-none"
                  value={newTemplateForm.description}
                  onChange={(e) => setNewTemplateForm({ ...newTemplateForm, description: e.target.value })}
                />
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg text-[11px] text-purple-900 dark:text-purple-200">
                <p className="font-bold">What will be saved:</p>
                <p>• {rolesAndDuties.length} Role Duties, work schedule, special clauses, and parameters</p>
                {activeDoc === 'sales_incentive_letter' && <p>• Sales target amount, {incentiveTiers.length} commission slabs, and TA/DA rates</p>}
                {activeDoc === 'notice_letter' && <p>• Notice classification, subject, and customized body text</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveTemplateModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAsNewTemplate}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 mr-1" /> Save &amp; Set Active
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MANAGE SAVED TEMPLATES ── */}
      {manageTemplatesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-xl rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground">Manage Templates Studio</h3>
              </div>
              <button 
                onClick={() => setManageTemplatesModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              <p className="text-muted-foreground text-xs pb-1">
                Your custom saved templates are stored in persistent organization memory. Built-in templates are available across all accounts.
              </p>

              {templates.map(t => (
                <div 
                  key={t.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    t.id === selectedTemplateId 
                      ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-400' 
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-xs">{t.name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                        {t.category}
                      </span>
                      {t.isBuiltIn ? (
                        <span className="text-[9px] font-semibold text-muted-foreground">Standard Preset</span>
                      ) : (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">Custom Saved</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{t.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveDoc(t.docType);
                        handleApplyTemplate(t.id);
                        setManageTemplatesModalOpen(false);
                      }}
                      className="h-7 text-[11px] px-2.5 cursor-pointer"
                    >
                      Apply
                    </Button>
                    {!t.isBuiltIn && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCustomTemplate(t.id, t.name)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border flex justify-end shrink-0">
              <Button
                size="sm"
                onClick={() => setManageTemplatesModalOpen(false)}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: VIEW ARCHIVED LETTER ── */}
      {viewingArchivedLetter && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <span>{viewingArchivedLetter.docTitle}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-900 border font-bold">
                      {viewingArchivedLetter.refNo}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">Issued to {viewingArchivedLetter.employeeName} on {formatDate(viewingArchivedLetter.issueDate)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    const el = document.getElementById('archived-modal-letter-preview');
                    if (!el) return;
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>${viewingArchivedLetter.refNo} - ${viewingArchivedLetter.employeeName}</title>
                          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            @page { size: A4 portrait; margin: 8mm 10mm; }
                            @media print { html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                          </style>
                        </head>
                        <body class="bg-white p-4">
                          ${el.innerHTML}
                          <script>setTimeout(() => { window.print(); window.close(); }, 350);</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Letter</span>
                </Button>
                <button 
                  onClick={() => setViewingArchivedLetter(null)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Sheet Area */}
            <div className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl max-h-[70vh] overflow-y-auto flex justify-center">
              <div 
                id="archived-modal-letter-preview" 
                className="bg-white text-slate-900 shadow-xl border border-slate-300 rounded p-[12mm] max-w-[210mm] w-full text-xs space-y-3 font-sans"
              >
                {/* Formal Letterhead */}
                <div className="border-b-2 border-slate-900 pb-3 mb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {companyLogo ? (
                        <img src={resolveMediaUrl(companyLogo)} alt={companyName} className="h-14 max-w-[170px] object-contain shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-lg tracking-wider shrink-0 font-serif">
                          KC
                        </div>
                      )}
                      <div>
                        <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase font-serif">{companyName}</h1>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase">Manufacturers of Construction Chemicals, Waterproofing &amp; Concrete Admixtures</p>
                        <p className="text-[10.5px] text-slate-700">{companyAddress}</p>
                        <p className="text-[9.5px] text-slate-600">CIN: U24290GJ2020PTC115488 • GSTIN: {companyGst} • Email: {companyEmail}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 bg-slate-50 border border-slate-300 p-2 rounded min-w-[140px]">
                      <span className="text-[8px] font-mono text-slate-500 uppercase block font-bold">DATE OF ISSUANCE</span>
                      <span className="text-xs font-black text-slate-950">{formatDate(viewingArchivedLetter.issueDate)}</span>
                      <span className="text-[8.5px] font-mono text-purple-900 block font-bold truncate max-w-[130px] mt-0.5">{viewingArchivedLetter.refNo}</span>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-slate-900 mt-2"></div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-0.5 border-b border-slate-200 pb-2">
                  <p className="text-[9px] font-semibold text-slate-500 uppercase">To / Candidate Details:</p>
                  <p className="font-black text-sm text-slate-950 uppercase">{viewingArchivedLetter.employeeName}</p>
                  <p className="text-[10.5px] text-slate-600">{viewingArchivedLetter.designation} ({viewingArchivedLetter.department}) • Ref ID: {viewingArchivedLetter.employeeId}</p>
                </div>

                {/* Title Banner */}
                <div className="bg-slate-900 text-white py-1 px-4 rounded text-center">
                  <h2 className="font-serif font-black text-xs tracking-[2px] uppercase text-amber-200">
                    {viewingArchivedLetter.docTitle}
                  </h2>
                </div>

                <p>Dear <strong>{viewingArchivedLetter.employeeName}</strong>,</p>
                <p className="text-slate-700 leading-relaxed">
                  We are pleased to confirm that this document serves as official employment documentation for <strong>{companyName}</strong> in the position of <strong>{viewingArchivedLetter.designation}</strong> in our <strong>{viewingArchivedLetter.department}</strong> Department.
                </p>

                {/* Terms Summary */}
                <div className="border border-slate-200 rounded overflow-hidden my-2">
                  <div className="bg-slate-100 px-3 py-1 font-bold text-[9.5px] uppercase text-slate-700">Summary of Parameters</div>
                  <table className="w-full text-[10.5px]">
                    <tbody>
                      <tr className="border-b"><td className="px-3 py-1 font-semibold bg-slate-50 w-1/3">Designation:</td><td className="px-3 py-1">{viewingArchivedLetter.designation}</td></tr>
                      <tr className="border-b"><td className="px-3 py-1 font-semibold bg-slate-50">Department:</td><td className="px-3 py-1">{viewingArchivedLetter.department}</td></tr>
                      <tr className="border-b"><td className="px-3 py-1 font-semibold bg-slate-50">Date of Joining:</td><td className="px-3 py-1 font-bold">{formatDate(viewingArchivedLetter.joiningDate)}</td></tr>
                      {viewingArchivedLetter.salary > 0 && (
                        <tr className="border-b"><td className="px-3 py-1 font-semibold bg-slate-50">Monthly Base Salary:</td><td className="px-3 py-1 font-bold text-purple-900">{formatCurrency(viewingArchivedLetter.salary)} / month</td></tr>
                      )}
                      <tr><td className="px-3 py-1 font-semibold bg-slate-50">Work Location:</td><td className="px-3 py-1">{viewingArchivedLetter.workLocation || 'Corporate Head Office'}</td></tr>
                    </tbody>
                  </table>
                </div>

                {viewingArchivedLetter.customClause && (
                  <div className="p-2 bg-purple-50/70 border border-purple-200 rounded text-[10px]">
                    <strong className="block uppercase text-[8.5px] text-purple-900">Special Terms &amp; Provisions:</strong>
                    <p className="text-slate-700 whitespace-pre-line mt-0.5">{viewingArchivedLetter.customClause}</p>
                  </div>
                )}

                {/* Dual Signatures */}
                <div className="pt-3 mt-3 border-t-2 border-slate-300 grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 border p-2 rounded">
                    <p className="font-bold text-[9px] uppercase text-slate-700 mb-1">Employee Acceptance</p>
                    <div className="border-b-2 border-slate-400 h-6 mt-4"></div>
                    <p className="text-[9px] text-slate-600 mt-1">Name: {viewingArchivedLetter.employeeName}</p>
                  </div>
                  <div className="bg-slate-50 border p-2 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-[9px] uppercase text-slate-900">For {companyName}</p>
                      <span className="text-[7.5px] bg-purple-100 text-purple-800 px-1 rounded font-bold">VERIFIED SEAL</span>
                    </div>
                    <div className="border-b-2 border-slate-400 h-6 mt-4"></div>
                    <p className="font-bold text-[10px] text-slate-950 mt-1">{viewingArchivedLetter.signatoryName}</p>
                    <p className="text-[9px] text-slate-600">{viewingArchivedLetter.signatoryDesignation}</p>
                  </div>
                </div>

                {/* Legal Footer */}
                <div className="mt-2 pt-1 border-t border-slate-200 text-center text-[7.5px] text-slate-500">
                  <p>Regd Office: {companyAddress} • CIN: U24290GJ2020PTC115488 • Web: www.kamlaconchem.com</p>
                  <p className="text-slate-400 mt-0.5">Strictly Private &amp; Confidential • Official Ref: {viewingArchivedLetter.refNo}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveDoc(viewingArchivedLetter.docType);
                  setDocConfig(prev => ({
                    ...prev,
                    issueDate: viewingArchivedLetter.issueDate,
                    joiningDate: viewingArchivedLetter.joiningDate,
                    signatoryName: viewingArchivedLetter.signatoryName,
                    signatoryDesignation: viewingArchivedLetter.signatoryDesignation,
                    customClause: viewingArchivedLetter.customClause || prev.customClause,
                  }));
                  setStudioTab('composer');
                  setViewingArchivedLetter(null);
                  toast({
                    title: 'Loaded in Composer Studio',
                    description: `Letter for ${viewingArchivedLetter.employeeName} loaded for editing and re-issuance.`
                  });
                }}
                className="text-xs text-purple-700 hover:bg-purple-50 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Load in Composer to Re-issue
              </Button>

              <Button
                size="sm"
                onClick={() => setViewingArchivedLetter(null)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
