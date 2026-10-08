import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, Edit2, Trash2, Check, ChevronsUpDown, Upload, Search, Filter, 
  Eye, FileText, Image as ImageIcon, ExternalLink, X, User, Phone, 
  Calendar, CreditCard, ShieldCheck, Download, CheckCircle2, Building, AlertCircle
} from 'lucide-react';
import { useHREmployees, useHREmployeeMutations, useHRDepartments, useHRDesignations, useHRUsers } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import { DataTable } from '@/components/DataTable';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from '@/hooks/use-toast';
import { PromotionDemotionModal } from './PromotionDemotionModal';
import { EmployeeDocumentsModal } from './EmployeeDocumentsModal';
import { generatePromotionLetter } from '@/utils/promotionPdfGenerator';
import { useData } from '@/contexts/DataContext';
import { cn } from "@/lib/utils";

const resolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:4000${url.startsWith('/') ? '' : '/'}${url}`;
};

const isPdf = (urlOrName: string | null | undefined): boolean => {
  if (!urlOrName) return false;
  return urlOrName.toLowerCase().endsWith('.pdf') || urlOrName.toLowerCase().includes('.pdf?');
};

const SearchableSelect = ({ options, value, onChange, placeholder }: { options: {label: string, value: any}[], value: any, onChange: (v: any) => void, placeholder: string }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((opt) => String(opt.value) === String(value))?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal text-sm px-3 py-2 h-auto text-left">
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { onChange(""); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                - None -
              </CommandItem>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.label} onSelect={() => { onChange(option.value); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", String(value) === String(option.value) ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const EmployeeMasterTab: React.FC = () => {
  const { data: employees = [], isLoading, error, refetch } = useHREmployees();
  const { data: departments = [] } = useHRDepartments();
  const { data: designations = [] } = useHRDesignations();
  const { data: users = [] } = useHRUsers();
  const { saveEmployee, deleteEmployee, changeStatus } = useHREmployeeMutations();
  const { toast } = useToast();
  const { settings } = useData();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoEmployee, setPromoEmployee] = useState<any>(null);

  // Viewing Window State & Lightbox State
  const [viewEmployee, setViewEmployee] = useState<any>(null);
  const [lightboxDoc, setLightboxDoc] = useState<{ url: string; title: string; isPdf?: boolean } | null>(null);
  const [docsModalEmployee, setDocsModalEmployee] = useState<any>(null);

  const handleEdit = (emp: any) => {
    setFormData(emp);
    setFilePreviews({});
    setIsEditing(true);
  };

  const handlePromoteDemote = (emp: any) => {
    setPromoEmployee(emp);
    setPromoModalOpen(true);
  };

  const handlePromoSubmit = async (data: any) => {
    if (!promoEmployee) return;
    try {
      await changeStatus({ id: promoEmployee.id, data });
      
      await generatePromotionLetter({
        employeeName: promoEmployee.name,
        action: data.action,
        oldType: promoEmployee.employee_type,
        newType: data.employee_type,
        oldSalary: promoEmployee.fixed_salary,
        newSalary: data.fixed_salary,
        oldWage: promoEmployee.daily_wage,
        newWage: data.daily_wage,
        reason: data.reason,
        effectiveDate: data.effectiveDate,
        companyName: settings.company_name || 'Simply Useful',
      });
      
      toast({ title: 'Success', description: `${data.action} applied and letter generated` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || `Failed to apply ${data.action}`, variant: 'destructive' });
      throw e;
    }
  };

  const handleAddNew = () => {
    setFormData({
      name: '',
      employee_type: 'VARIABLE',
      base_salary_monthly: 0,
      dailywage: 0,
      overtime_hourly_rate: 0,
      late_deduction_rate: 0,
      bike_allowance_per_km: 0,
      car_allowance_per_km: 0,
      sales_incentive_pct: 0,
      bag_incentive_rate: 0,
      contactinfo: '',
      department: '',
      designation: '',
      reports_to: '',
      user_id: '',
      doj: '',
      aadhar_number: '',
      pan_number: '',
      bank_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      is_ot_eligible: false,
      is_late_deduction_eligible: false,
      is_km_eligible: false,
      is_bag_eligible: false
    });
    setFilePreviews({});
    setIsEditing(true);
  };

  const handleFileChange = (field: string, file: File | null) => {
    if (file) {
      setFormData((prev: any) => ({ ...prev, [field]: file }));
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setFilePreviews((prev: any) => ({ ...prev, [field]: previewUrl }));
      } else {
        setFilePreviews((prev: any) => ({ ...prev, [field]: file.name }));
      }
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: null }));
      setFilePreviews((prev: any) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      // For document fields: ONLY append if the user selected a new File object
      if (['employee_photo', 'aadhar_photo', 'pan_photo', 'bank_proof_photo'].includes(key)) {
        if (formData[key] instanceof File) {
          submitData.append(key, formData[key]);
        }
      } else if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
        submitData.append(key, formData[key]);
      }
    });

    try {
      await saveEmployee(submitData);
      setIsEditing(false);
      setFilePreviews({});
    } catch (err: any) {
      // Error handled by mutation toast
    }
  };

  // Document Upload Item inside Add/Edit Form
  const FormDocumentInput: React.FC<{
    label: string;
    field: string;
    accept?: string;
    docNumber?: string;
    docNumberLabel?: string;
  }> = ({ label, field, accept = "image/*,.pdf", docNumber, docNumberLabel }) => {
    const rawVal = formData[field];
    const newPreview = filePreviews[field];
    const isNewFile = rawVal instanceof File;
    const existingUrl = typeof rawVal === 'string' && rawVal ? resolveMediaUrl(rawVal) : '';

    return (
      <div className="space-y-2 p-3 bg-muted/20 border border-border/60 rounded-xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            {label}
          </label>
          {docNumber && (
            <span className="text-[11px] font-mono bg-background border px-1.5 py-0.5 rounded text-muted-foreground">
              {docNumberLabel ? `${docNumberLabel}: ` : ''}{docNumber}
            </span>
          )}
        </div>

        {/* Existing file or new preview display */}
        {newPreview ? (
          <div className="flex items-center gap-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            {newPreview.startsWith('blob:') ? (
              <img 
                src={newPreview} 
                alt={label} 
                className="w-12 h-12 rounded object-cover border border-emerald-500/30 cursor-pointer hover:opacity-80"
                onClick={() => setLightboxDoc({ url: newPreview, title: `${label} (New Preview)` })}
              />
            ) : (
              <div className="w-12 h-12 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">
                PDF
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> New File Selected
              </span>
              <p className="text-xs truncate text-muted-foreground">{isNewFile ? (rawVal as File).name : newPreview}</p>
            </div>
            <button
              type="button"
              onClick={() => handleFileChange(field, null)}
              className="text-xs text-destructive hover:underline font-medium px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : existingUrl ? (
          <div className="flex items-center gap-3 p-2 bg-background border border-border rounded-lg">
            {!isPdf(existingUrl) ? (
              <img 
                src={existingUrl} 
                alt={label} 
                className="w-12 h-12 rounded object-cover border border-border cursor-pointer hover:opacity-80"
                onClick={() => setLightboxDoc({ url: existingUrl, title: `${formData.name || 'Employee'} - ${label}` })}
              />
            ) : (
              <div className="w-12 h-12 rounded bg-red-500/10 text-red-600 border border-red-500/20 flex flex-col items-center justify-center text-[10px] font-bold shrink-0">
                <FileText className="w-4 h-4 mb-0.5" />
                PDF
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Current Document Uploaded
              </span>
              <p className="text-[11px] text-muted-foreground truncate">{existingUrl.split('/').pop() || 'Document on File'}</p>
            </div>
            <button
              type="button"
              onClick={() => setLightboxDoc({ 
                url: existingUrl, 
                title: `${formData.name || 'Employee'} - ${label}`,
                isPdf: isPdf(existingUrl)
              })}
              className="px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/20 flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> View
            </button>
          </div>
        ) : null}

        {/* File Input */}
        <div className="flex items-center gap-2 pt-1">
          <input 
            type="file" 
            accept={accept} 
            className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
            onChange={e => handleFileChange(field, e.target.files?.[0] || null)} 
          />
        </div>
      </div>
    );
  };

  if (isEditing) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">{formData.id ? 'Edit Employee Profile' : 'Register New Employee'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage personal details, salary configuration, and official KYC documents.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setFilePreviews({}); }}>
            <X className="w-4 h-4 mr-1" /> Close Form
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Personal Details */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-primary flex items-center gap-2">
              <User className="w-4 h-4" /> Personal Information &amp; Photo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Employee Full Name <span className="text-destructive">*</span></label>
                <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Employee ID</label>
                <input type="text" disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-muted/50 text-muted-foreground font-mono"
                  value={formData.employee_id || 'Auto-generated on Save'} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Contact Mobile / Phone</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  placeholder="+91 98765 43210"
                  value={formData.contactinfo || ''} onChange={e => setFormData({...formData, contactinfo: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Date of Joining (DOJ)</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={formData.doj || ''} onChange={e => setFormData({...formData, doj: e.target.value})} />
              </div>
              <div className="col-span-1 md:col-span-2">
                <FormDocumentInput 
                  label="Employee Profile Photo" 
                  field="employee_photo" 
                  accept="image/*" 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Salary Configuration */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-primary flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Compensation &amp; Salary Structure
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Employee Compensation Type</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={formData.employee_type} onChange={e => setFormData({...formData, employee_type: e.target.value})}>
                  <option value="VARIABLE">Variable / Daily Wage</option>
                  <option value="FIXED">Fixed / Monthly Salary</option>
                  <option value="NONE">No Salary (Org Chart Only)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                {formData.employee_type === 'FIXED' ? (
                  <>
                    <label className="text-xs font-semibold text-primary">Monthly Base Salary (₹) <span className="text-destructive">*</span></label>
                    <input required type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-semibold"
                      value={formData.base_salary_monthly} onChange={e => setFormData({...formData, base_salary_monthly: Number(e.target.value)})} />
                  </>
                ) : formData.employee_type === 'VARIABLE' ? (
                  <>
                    <label className="text-xs font-semibold text-primary">Daily Base Wage (₹) <span className="text-destructive">*</span></label>
                    <input required type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-semibold"
                      value={formData.dailywage} onChange={e => setFormData({...formData, dailywage: Number(e.target.value)})} />
                  </>
                ) : (
                  <>
                    <label className="text-xs font-semibold text-muted-foreground">Salary Configuration</label>
                    <div className="w-full border rounded-lg px-3 py-2 text-sm bg-muted/50 text-muted-foreground">Org Chart Only (No Payroll)</div>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Overtime Multiplier (e.g. 1.5x)</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={formData.overtime_hourly_rate} onChange={e => setFormData({...formData, overtime_hourly_rate: Number(e.target.value)})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Late Deduction Multiplier (e.g. 1.0x)</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={formData.late_deduction_rate} onChange={e => setFormData({...formData, late_deduction_rate: Number(e.target.value)})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Bike Allowance (₹/km)</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={formData.bike_allowance_per_km} onChange={e => setFormData({...formData, bike_allowance_per_km: Number(e.target.value)})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Car Allowance (₹/km)</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={formData.car_allowance_per_km} onChange={e => setFormData({...formData, car_allowance_per_km: Number(e.target.value)})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Sales Incentive (%)</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={formData.sales_incentive_pct} onChange={e => setFormData({...formData, sales_incentive_pct: Number(e.target.value)})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Bag Incentive Rate (₹/bag)</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={formData.bag_incentive_rate} onChange={e => setFormData({...formData, bag_incentive_rate: Number(e.target.value)})} />
              </div>
            </div>
          </div>

          {/* Section 3: KYC & Banking with Document Photos */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> KYC Verification &amp; Document Photos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Aadhar Card Number</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono"
                    placeholder="1234 5678 9012"
                    value={formData.aadhar_number || ''} onChange={e => setFormData({...formData, aadhar_number: e.target.value})} />
                </div>
                <FormDocumentInput 
                  label="Aadhar Card Photo / PDF" 
                  field="aadhar_photo" 
                  docNumber={formData.aadhar_number}
                  docNumberLabel="Aadhar"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">PAN Card Number</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono uppercase"
                    placeholder="ABCDE1234F"
                    value={formData.pan_number || ''} onChange={e => setFormData({...formData, pan_number: e.target.value.toUpperCase()})} />
                </div>
                <FormDocumentInput 
                  label="PAN Card Photo / PDF" 
                  field="pan_photo" 
                  docNumber={formData.pan_number}
                  docNumberLabel="PAN"
                />
              </div>

              <div className="space-y-3 col-span-1 md:col-span-2 pt-2 border-t border-border/40">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Bank Name</label>
                    <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                      placeholder="e.g. HDFC Bank"
                      value={formData.bank_name || ''} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Bank Account Number</label>
                    <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono"
                      placeholder="Account No"
                      value={formData.bank_account_number || ''} onChange={e => setFormData({...formData, bank_account_number: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">IFSC Code</label>
                    <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono uppercase"
                      placeholder="e.g. HDFC0001234"
                      value={formData.bank_ifsc || ''} onChange={e => setFormData({...formData, bank_ifsc: e.target.value.toUpperCase()})} />
                  </div>
                </div>
                <FormDocumentInput 
                  label="Bank Proof (Passbook Photo / Cancelled Cheque)" 
                  field="bank_proof_photo" 
                />
              </div>
            </div>
          </div>

          {/* Section 4: Hierarchy & Eligibility */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-primary flex items-center gap-2">
              <Building className="w-4 h-4" /> Hierarchy &amp; Entitlements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Linked App User</label>
                <SearchableSelect 
                  placeholder="- Map to System User -"
                  value={formData.user_id || ''}
                  onChange={(val) => setFormData({...formData, user_id: val})}
                  options={users.map((u: any) => ({ 
                    label: `${u.first_name || u.email} (${u.role})`, 
                    value: u.id 
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Department</label>
                <SearchableSelect 
                  placeholder="- Select Department -"
                  value={formData.department || ''}
                  onChange={(val) => setFormData({...formData, department: val})}
                  options={departments.map((d: any) => ({ label: d.name, value: d.name }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Post (Designation)</label>
                <SearchableSelect 
                  placeholder="- Select Post -"
                  value={formData.designation || ''}
                  onChange={(val) => setFormData({...formData, designation: val})}
                  options={designations
                    .filter((d: any) => !formData.department || d.department_name === formData.department || !d.department_name)
                    .map((d: any) => ({ label: d.name, value: d.name }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Reports To (Manager)</label>
                <SearchableSelect 
                  placeholder="- None -"
                  value={formData.reports_to || ''}
                  onChange={(val) => setFormData({...formData, reports_to: val})}
                  options={employees.filter((e: any) => e.id !== formData.id).map((e: any) => ({ 
                    label: `${e.name} (${e.designation || e.department || 'No Post'})`, 
                    value: e.id 
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer bg-muted/30 hover:bg-muted/50 p-2.5 rounded-lg border border-border/50">
                <input type="checkbox" checked={!!formData.is_ot_eligible} onChange={e => setFormData({...formData, is_ot_eligible: e.target.checked})} />
                Overtime (OT) Eligible
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer bg-muted/30 hover:bg-muted/50 p-2.5 rounded-lg border border-border/50">
                <input type="checkbox" checked={!!formData.is_late_deduction_eligible} onChange={e => setFormData({...formData, is_late_deduction_eligible: e.target.checked})} />
                Late Deduction Apply
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer bg-muted/30 hover:bg-muted/50 p-2.5 rounded-lg border border-border/50">
                <input type="checkbox" checked={!!formData.is_km_eligible} onChange={e => setFormData({...formData, is_km_eligible: e.target.checked})} />
                KM / Travel Allowance
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer bg-muted/30 hover:bg-muted/50 p-2.5 rounded-lg border border-border/50">
                <input type="checkbox" checked={!!formData.is_bag_eligible} onChange={e => setFormData({...formData, is_bag_eligible: e.target.checked})} />
                Bag Incentive Apply
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setFilePreviews({}); }}>
              Cancel
            </Button>
            <Button type="submit">
              {formData.id ? 'Save Changes' : 'Create Employee Profile'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const columns = ['Employee', 'Department', 'Post', 'Type', 'Base Pay', 'OT Rate', 'KM Rate'];
  
  const filteredEmployees = employees.filter((emp: any) => {
    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.employee_id && emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'ALL' || emp.employee_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const rows = filteredEmployees.map((emp: any) => [
    <div key={emp.id} className="flex items-center gap-3 py-1">
      {emp.employee_photo ? (
        <img 
          src={resolveMediaUrl(emp.employee_photo)} 
          alt={emp.name} 
          className="w-9 h-9 rounded-full object-cover border border-border shrink-0 shadow-sm cursor-pointer hover:scale-105 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxDoc({ url: resolveMediaUrl(emp.employee_photo), title: `${emp.name} - Profile Photo` });
          }}
          title="Click to view full photo"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
          {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
        </div>
      )}
      <div className="min-w-0">
        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
          <span className="truncate">{emp.name}</span>
          {emp.employee_photo && (
            <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1 rounded font-medium" title="Photo Available">📷</span>
          )}
          {(emp.aadhar_photo || emp.pan_photo || emp.bank_proof_photo) && (
            <span className="text-[10px] text-blue-600 bg-blue-500/10 px-1 rounded font-medium" title="Documents Uploaded">📄</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
          <span className="font-mono">{emp.employee_id || 'ID Pending'}</span>
          {emp.contactinfo && <span>• {emp.contactinfo}</span>}
        </div>
      </div>
    </div>,
    emp.department || '-',
    emp.designation || '-',
    <span key="type" className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      emp.employee_type === 'FIXED' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
      emp.employee_type === 'VARIABLE' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
      'bg-muted text-muted-foreground'
    }`}>
      {emp.employee_type === 'NONE' ? 'Org Only' : emp.employee_type === 'FIXED' ? 'Fixed (Monthly)' : 'Variable (Daily)'}
    </span>,
    <span key="pay" className="font-semibold text-xs text-foreground">
      {emp.employee_type === 'NONE' ? 'N/A' : emp.employee_type === 'FIXED' ? `₹${Number(emp.base_salary_monthly || 0).toLocaleString('en-IN')}/mo` : `₹${Number(emp.dailywage || 0).toLocaleString('en-IN')}/day`}
    </span>,
    emp.is_ot_eligible ? `${emp.overtime_hourly_rate || 0}x` : 'N/A',
    emp.is_km_eligible ? `₹${emp.bike_allowance_per_km} / ₹${emp.car_allowance_per_km}` : 'N/A'
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Employee Master</h2>
          <p className="text-xs text-muted-foreground">Manage workforce profiles, salary rules, and employee documentation.</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2"><Plus className="w-4 h-4" /> Add Employee</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, employee ID, department, or post..."
            className="pl-9 w-full border rounded-lg px-3 py-2 text-sm bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select 
            className="border rounded-lg px-3 py-2 text-sm bg-card min-w-[150px]"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="FIXED">Fixed (Monthly)</option>
            <option value="VARIABLE">Variable (Daily)</option>
            <option value="NONE">Org Only (No Salary)</option>
          </select>
        </div>
      </div>

      <SafeDataView isLoading={isLoading} error={error} data={employees} onRetry={refetch}>
        <DataTable 
          columns={columns} 
          rows={rows} 
          onView={(idx) => setViewEmployee(filteredEmployees[idx])}
          onRowClick={(idx) => setViewEmployee(filteredEmployees[idx])}
          onEdit={(idx) => handleEdit(filteredEmployees[idx])}
          onDelete={(idx) => {
            if(confirm(`Deactivate employee "${filteredEmployees[idx].name}"?`)) deleteEmployee(filteredEmployees[idx].id);
          }}
          customActions={(idx) => (
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs text-purple-600 hover:text-purple-700 bg-purple-50/50 hover:bg-purple-50 border-purple-200"
                onClick={(e) => { e.stopPropagation(); setDocsModalEmployee(filteredEmployees[idx]); }}
                title="Generate Offer Letter, Appointment Letter, Experience Certificate, Salary Certificate, ID Card"
              >
                <FileText className="w-3.5 h-3.5 mr-1" /> Letters &amp; ID
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200"
                onClick={(e) => { e.stopPropagation(); setViewEmployee(filteredEmployees[idx]); }}
                title="View Full Profile & Uploaded Documents"
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> View Docs
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 border-blue-200"
                onClick={(e) => { e.stopPropagation(); handlePromoteDemote(filteredEmployees[idx]); }}
              >
                Promote / Demote
              </Button>
            </div>
          )}
        />
      </SafeDataView>

      {/* ── EMPLOYEE VIEWING WINDOW (FULL DETAILS & DOCUMENTS MODAL) ── */}
      {viewEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Employee Profile &amp; Documents</h2>
                  <p className="text-xs text-muted-foreground">Comprehensive employee record and verified KYC attachments</p>
                </div>
              </div>
              <button 
                onClick={() => setViewEmployee(null)} 
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-muted/30 to-background border border-border">
                {viewEmployee.employee_photo ? (
                  <div className="relative group cursor-pointer" onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.employee_photo), title: `${viewEmployee.name} - Profile Photo` })}>
                    <img 
                      src={resolveMediaUrl(viewEmployee.employee_photo)} 
                      alt={viewEmployee.name} 
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                      <Eye className="w-4 h-4 mr-1" /> Zoom
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center border-2 border-primary/20 shadow-sm shrink-0">
                    {viewEmployee.name ? viewEmployee.name.slice(0, 2).toUpperCase() : 'EM'}
                  </div>
                )}
                
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-bold text-foreground">{viewEmployee.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono font-bold">
                      {viewEmployee.employee_id || 'ID Pending'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                      Active
                    </span>
                  </div>

                  <p className="text-xs font-medium text-foreground/80">
                    {viewEmployee.designation || 'No Designation'} • <span className="text-muted-foreground">{viewEmployee.department || 'No Department'}</span>
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-muted-foreground">
                    {viewEmployee.contactinfo && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-primary" /> {viewEmployee.contactinfo}
                      </span>
                    )}
                    {viewEmployee.doj && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Joined: {new Date(viewEmployee.doj).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setDocsModalEmployee(viewEmployee);
                    }}
                    className="text-xs text-purple-600 border-purple-200 hover:bg-purple-50 gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Generate Letters &amp; ID
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const emp = viewEmployee;
                      setViewEmployee(null);
                      handleEdit(emp);
                    }}
                    className="text-xs gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                  </Button>
                </div>
              </div>

              {/* ── DOCUMENTS & PHOTOS GALLERY (CORE USER REQUIREMENT) ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Uploaded Document Photos &amp; Verification
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Click any thumbnail to inspect document in high resolution
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Document Card 1: Employee Photo */}
                  <div className="p-4 bg-muted/20 border border-border/70 rounded-xl space-y-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" /> Employee Profile Photo
                      </span>
                      {viewEmployee.employee_photo ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Uploaded
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Not Provided
                        </span>
                      )}
                    </div>

                    <div className="h-32 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                      {viewEmployee.employee_photo ? (
                        <img 
                          src={resolveMediaUrl(viewEmployee.employee_photo)} 
                          alt="Employee Photo" 
                          className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.employee_photo), title: `${viewEmployee.name} - Profile Photo` })}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground p-3">
                          <User className="w-8 h-8 mx-auto mb-1 opacity-30" />
                          <p className="text-xs">No profile photo uploaded</p>
                        </div>
                      )}
                    </div>

                    {viewEmployee.employee_photo && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full h-8 text-xs font-semibold gap-1.5"
                          onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.employee_photo), title: `${viewEmployee.name} - Profile Photo` })}
                        >
                          <Eye className="w-3.5 h-3.5" /> View Fullscreen
                        </Button>
                        <a 
                          href={resolveMediaUrl(viewEmployee.employee_photo)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Open in new window"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Document Card 2: Aadhar Card */}
                  <div className="p-4 bg-muted/20 border border-border/70 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <FileText className="w-3.5 h-3.5 text-primary" /> Aadhar Card Document
                        </span>
                        {viewEmployee.aadhar_photo ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Uploaded
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Not Provided
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                        Number: <strong className="text-foreground">{viewEmployee.aadhar_number || '—'}</strong>
                      </p>
                    </div>

                    <div className="h-32 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                      {viewEmployee.aadhar_photo ? (
                        !isPdf(viewEmployee.aadhar_photo) ? (
                          <img 
                            src={resolveMediaUrl(viewEmployee.aadhar_photo)} 
                            alt="Aadhar Document" 
                            className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.aadhar_photo), title: `${viewEmployee.name} - Aadhar Card` })}
                          />
                        ) : (
                          <div 
                            className="text-center p-3 cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.aadhar_photo), title: `${viewEmployee.name} - Aadhar Card`, isPdf: true })}
                          >
                            <FileText className="w-10 h-10 mx-auto text-red-500 mb-1" />
                            <span className="text-xs font-bold text-foreground">PDF Document</span>
                            <p className="text-[10px] text-muted-foreground">Click to preview PDF</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center text-muted-foreground p-3">
                          <ShieldCheck className="w-8 h-8 mx-auto mb-1 opacity-30" />
                          <p className="text-xs">No Aadhar document attached</p>
                        </div>
                      )}
                    </div>

                    {viewEmployee.aadhar_photo && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full h-8 text-xs font-semibold gap-1.5"
                          onClick={() => setLightboxDoc({ 
                            url: resolveMediaUrl(viewEmployee.aadhar_photo), 
                            title: `${viewEmployee.name} - Aadhar Card`,
                            isPdf: isPdf(viewEmployee.aadhar_photo)
                          })}
                        >
                          <Eye className="w-3.5 h-3.5" /> View Document
                        </Button>
                        <a 
                          href={resolveMediaUrl(viewEmployee.aadhar_photo)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Open in new window"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Document Card 3: PAN Card */}
                  <div className="p-4 bg-muted/20 border border-border/70 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <FileText className="w-3.5 h-3.5 text-primary" /> PAN Card Document
                        </span>
                        {viewEmployee.pan_photo ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Uploaded
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Not Provided
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                        Number: <strong className="text-foreground uppercase">{viewEmployee.pan_number || '—'}</strong>
                      </p>
                    </div>

                    <div className="h-32 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                      {viewEmployee.pan_photo ? (
                        !isPdf(viewEmployee.pan_photo) ? (
                          <img 
                            src={resolveMediaUrl(viewEmployee.pan_photo)} 
                            alt="PAN Document" 
                            className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.pan_photo), title: `${viewEmployee.name} - PAN Card` })}
                          />
                        ) : (
                          <div 
                            className="text-center p-3 cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.pan_photo), title: `${viewEmployee.name} - PAN Card`, isPdf: true })}
                          >
                            <FileText className="w-10 h-10 mx-auto text-red-500 mb-1" />
                            <span className="text-xs font-bold text-foreground">PDF Document</span>
                            <p className="text-[10px] text-muted-foreground">Click to preview PDF</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center text-muted-foreground p-3">
                          <ShieldCheck className="w-8 h-8 mx-auto mb-1 opacity-30" />
                          <p className="text-xs">No PAN document attached</p>
                        </div>
                      )}
                    </div>

                    {viewEmployee.pan_photo && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full h-8 text-xs font-semibold gap-1.5"
                          onClick={() => setLightboxDoc({ 
                            url: resolveMediaUrl(viewEmployee.pan_photo), 
                            title: `${viewEmployee.name} - PAN Card`,
                            isPdf: isPdf(viewEmployee.pan_photo)
                          })}
                        >
                          <Eye className="w-3.5 h-3.5" /> View Document
                        </Button>
                        <a 
                          href={resolveMediaUrl(viewEmployee.pan_photo)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Open in new window"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Document Card 4: Bank Proof */}
                  <div className="p-4 bg-muted/20 border border-border/70 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <CreditCard className="w-3.5 h-3.5 text-primary" /> Bank Proof (Passbook / Cheque)
                        </span>
                        {viewEmployee.bank_proof_photo ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Uploaded
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Not Provided
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        Bank: <strong className="text-foreground">{viewEmployee.bank_name || '—'}</strong> • A/C: <span className="font-mono text-foreground">{viewEmployee.bank_account_number || '—'}</span>
                      </p>
                    </div>

                    <div className="h-32 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                      {viewEmployee.bank_proof_photo ? (
                        !isPdf(viewEmployee.bank_proof_photo) ? (
                          <img 
                            src={resolveMediaUrl(viewEmployee.bank_proof_photo)} 
                            alt="Bank Proof Document" 
                            className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.bank_proof_photo), title: `${viewEmployee.name} - Bank Proof` })}
                          />
                        ) : (
                          <div 
                            className="text-center p-3 cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxDoc({ url: resolveMediaUrl(viewEmployee.bank_proof_photo), title: `${viewEmployee.name} - Bank Proof`, isPdf: true })}
                          >
                            <FileText className="w-10 h-10 mx-auto text-red-500 mb-1" />
                            <span className="text-xs font-bold text-foreground">PDF Document</span>
                            <p className="text-[10px] text-muted-foreground">Click to preview PDF</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center text-muted-foreground p-3">
                          <CreditCard className="w-8 h-8 mx-auto mb-1 opacity-30" />
                          <p className="text-xs">No bank proof document attached</p>
                        </div>
                      )}
                    </div>

                    {viewEmployee.bank_proof_photo && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full h-8 text-xs font-semibold gap-1.5"
                          onClick={() => setLightboxDoc({ 
                            url: resolveMediaUrl(viewEmployee.bank_proof_photo), 
                            title: `${viewEmployee.name} - Bank Proof`,
                            isPdf: isPdf(viewEmployee.bank_proof_photo)
                          })}
                        >
                          <Eye className="w-3.5 h-3.5" /> View Document
                        </Button>
                        <a 
                          href={resolveMediaUrl(viewEmployee.bank_proof_photo)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Open in new window"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Specs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                {/* Compensation Card */}
                <div className="p-4 bg-muted/10 border border-border rounded-xl space-y-2.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Salary Configuration</h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Employee Type:</span>
                      <span className="font-semibold text-foreground">
                        {viewEmployee.employee_type === 'FIXED' ? 'Fixed (Monthly)' : viewEmployee.employee_type === 'VARIABLE' ? 'Variable (Daily Wage)' : 'Org Chart Only'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Base Pay:</span>
                      <span className="font-bold text-primary">
                        {viewEmployee.employee_type === 'FIXED' ? `₹${Number(viewEmployee.base_salary_monthly || 0).toLocaleString('en-IN')}/mo` : `₹${Number(viewEmployee.dailywage || 0).toLocaleString('en-IN')}/day`}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Overtime Multiplier:</span>
                      <span className="font-semibold text-foreground">{viewEmployee.is_ot_eligible ? `${viewEmployee.overtime_hourly_rate || 0}x` : 'Not Eligible'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Travel Allowances:</span>
                      <span className="font-semibold text-foreground">
                        {viewEmployee.is_km_eligible ? `Bike ₹${viewEmployee.bike_allowance_per_km}/km • Car ₹${viewEmployee.car_allowance_per_km}/km` : 'Not Eligible'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Incentives:</span>
                      <span className="font-semibold text-foreground">
                        Sales: {viewEmployee.sales_incentive_pct || 0}% • Bag: ₹{viewEmployee.bag_incentive_rate || 0}/bag
                      </span>
                    </div>
                  </div>
                </div>

                {/* Banking & Hierarchy Card */}
                <div className="p-4 bg-muted/10 border border-border rounded-xl space-y-2.5">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Banking &amp; Reporting</h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Bank Name:</span>
                      <span className="font-semibold text-foreground">{viewEmployee.bank_name || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-mono font-semibold text-foreground">{viewEmployee.bank_account_number || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">IFSC Code:</span>
                      <span className="font-mono font-semibold text-foreground uppercase">{viewEmployee.bank_ifsc || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Reports To:</span>
                      <span className="font-semibold text-foreground">
                        {employees.find((e: any) => e.id === viewEmployee.reports_to)?.name || 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Linked System Account:</span>
                      <span className="font-semibold text-foreground">
                        {users.find((u: any) => u.id === viewEmployee.user_id)?.email || 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10 sticky bottom-0">
              <Button 
                variant="outline" 
                onClick={() => setViewEmployee(null)}
              >
                Close Window
              </Button>
              <Button 
                onClick={() => {
                  const emp = viewEmployee;
                  setViewEmployee(null);
                  handleEdit(emp);
                }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX DOCUMENT & PHOTO VIEWER MODAL ── */}
      {lightboxDoc && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[70] p-4"
          onClick={() => setLightboxDoc(null)}
        >
          <div 
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground truncate">{lightboxDoc.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={lightboxDoc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1 px-2.5"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Original
                </a>
                <button 
                  onClick={() => setLightboxDoc(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-black/30 flex items-center justify-center overflow-auto max-h-[calc(92vh-60px)]">
              {lightboxDoc.isPdf ? (
                <iframe 
                  src={lightboxDoc.url} 
                  title={lightboxDoc.title}
                  className="w-full h-[75vh] rounded-lg border border-border bg-white"
                />
              ) : (
                <img 
                  src={lightboxDoc.url} 
                  alt={lightboxDoc.title} 
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {promoModalOpen && (
        <PromotionDemotionModal
          isOpen={promoModalOpen}
          onClose={() => { setPromoModalOpen(false); setPromoEmployee(null); }}
          employee={promoEmployee}
          onSubmit={handlePromoSubmit}
        />
      )}

      {docsModalEmployee && (
        <EmployeeDocumentsModal
          isOpen={!!docsModalEmployee}
          onClose={() => setDocsModalEmployee(null)}
          employee={docsModalEmployee}
        />
      )}
    </div>
  );
};
