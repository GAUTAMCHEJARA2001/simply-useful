import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Printer, 
  Download, 
  FileText, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Loader2, 
  Layers, 
  Eye, 
  Users,
  X 
} from 'lucide-react';
import { amountToWords } from './utils/amountToWords';
import html2pdf from 'html2pdf.js';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/inventory/useMasters';

export interface SalarySlipItem {
  id?: number | string;
  month: string; // YYYY-MM
  labour_id: number | string;
  labour_name: string;
  employee_id?: string;
  employee_type?: string;
  designation?: string;
  department?: string;
  doj?: string;
  pan_number?: string;
  aadhar_number?: string;
  bank_details?: {
    bank_name?: string;
    account_no?: string;
    ifsc?: string;
  };
  stats?: {
    payable_days?: number;
    present_days?: number;
    absent?: number;
    ot_hours?: number;
    late_hours?: number;
  };
  earnings: {
    basic: number;
    hra?: number;
    allowances?: number;
    travel?: number;
    ot_pay?: number;
    incentives?: number;
    gross: number;
  };
  deductions: {
    advance?: number;
    loan_emi?: number;
    daily_advance?: number;
    late?: number;
    unpaid_leave?: number;
    other?: number;
    total_deductions?: number;
  };
  net_pay: number;
  is_finalized?: boolean;
  is_paid?: boolean;
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    gst?: string;
    logo?: string;
  };
}

interface SalarySlipPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  slips: SalarySlipItem[];
  defaultSelectedMonth?: string;
  title?: string;
}

const Currency = (v: number) => {
  const val = Number(v || 0);
  if (val < 0) {
    return `-₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatMonthName = (monthStr: string) => {
  if (!monthStr) return '';
  try {
    const [y, m] = monthStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch (e) {
    return monthStr;
  }
};

export const SalarySlipPdfModal: React.FC<SalarySlipPdfModalProps> = ({
  isOpen,
  onClose,
  slips,
  defaultSelectedMonth,
  title = 'Salary Slip / Payslip'
}) => {
  const { toast } = useToast();
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: settings } = useSettings();

  // All distinct months in given slips
  const allMonths = Array.from(new Set(slips.map(s => s.month))).filter(Boolean).sort().reverse();
  
  // All distinct employees in given slips
  const allEmployees = Array.from(
    new Map(slips.map(s => [String(s.labour_id), { id: s.labour_id, name: s.labour_name }])).values()
  );

  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');

  // Synchronize filters when modal opens or slips change
  useEffect(() => {
    if (isOpen) {
      if (defaultSelectedMonth && allMonths.includes(defaultSelectedMonth)) {
        setSelectedMonths([defaultSelectedMonth]);
      } else {
        setSelectedMonths(allMonths.length > 0 ? allMonths : []);
      }
      setSelectedEmployeeId('ALL');
    }
  }, [isOpen, slips, defaultSelectedMonth]);

  // Slips filtered by chosen months and chosen employee
  const activeSlips = slips.filter(s => {
    const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(s.month);
    const empMatch = selectedEmployeeId === 'ALL' || String(s.labour_id) === String(selectedEmployeeId);
    return monthMatch && empMatch;
  });

  const toggleMonth = (m: string) => {
    setSelectedMonths(prev => 
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const selectAllMonths = () => {
    if (selectedMonths.length === allMonths.length) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths(allMonths);
    }
  };

  const fallbackCompany = {
    name: settings?.company_name || 'KAMLA CONCHEM PVT LTD',
    address: settings?.company_address || 'navsari, gujarat-396445',
    phone: settings?.company_phone || '+91 81559 31559',
    email: settings?.company_email || 'support@kamla.com',
    gst: settings?.company_gst || '24AALCK3507C1ZX',
    logo: settings?.company_logo || ''
  };

  const handleDownloadPdf = async () => {
    if (!printContainerRef.current || activeSlips.length === 0) {
      toast({ title: 'No Slips Selected', description: 'Please select at least one month/slip to export.', variant: 'destructive' });
      return;
    }

    try {
      setIsGenerating(true);
      const element = printContainerRef.current;

      const isMultipleEmployees = new Set(activeSlips.map(s => s.labour_id)).size > 1;
      const employeeName = activeSlips[0]?.labour_name || 'Staff';
      const cleanName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');

      let filename = `Payslips_${cleanName}.pdf`;
      if (isMultipleEmployees) {
        const monthTag = selectedMonths.length === 1 ? selectedMonths[0] : `${selectedMonths.length}_Months`;
        filename = `Payslips_${monthTag}_All_Employees.pdf`;
      } else {
        if (activeSlips.length === 1) {
          filename = `Payslip_${cleanName}_${activeSlips[0].month}.pdf`;
        } else {
          filename = `Payslips_${cleanName}_${selectedMonths.length}_Months.pdf`;
        }
      }

      const opt: any = {
        margin: [6, 6, 6, 6],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], after: '.payslip-page-break' }
      };

      await html2pdf().set(opt).from(element).save();
      toast({ title: 'PDF Downloaded', description: `Successfully generated ${filename}` });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      toast({ title: 'Download Error', description: err?.message || 'Failed to generate PDF document.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="p-4 border-b border-border bg-card shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {title}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compliant Indian salary slip with company branding, tax breakdown &amp; legal particulars.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBrowserPrint}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              Print
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isGenerating || activeSlips.length === 0}
              onClick={handleDownloadPdf}
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-2xs cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Download PDF ({activeSlips.length})
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Filters Toolbar (Months & Employees) */}
        {(allMonths.length > 1 || allEmployees.length > 1) && (
          <div className="px-6 py-2.5 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            {/* Multi-month selection */}
            {allMonths.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Month(s):</span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllMonths}
                  className="h-6 text-xs font-semibold text-primary px-1.5"
                >
                  {selectedMonths.length === allMonths.length ? 'Deselect All' : 'Select All'}
                </Button>

                {allMonths.map(m => (
                  <label 
                    key={m} 
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                      selectedMonths.includes(m) 
                        ? 'bg-primary/10 border-primary text-primary font-bold' 
                        : 'bg-background border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(m)}
                      onChange={() => toggleMonth(m)}
                      className="w-3.5 h-3.5 rounded text-primary"
                    />
                    <span>{formatMonthName(m)}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Employee Filter (if modal has multiple employees) */}
            {allEmployees.length > 1 && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Employee:</span>
                </div>
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="h-7 text-xs rounded-md border border-border bg-background px-2 py-0.5 font-medium"
                >
                  <option value="ALL">All Staff ({allEmployees.length})</option>
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={String(emp.id)}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Printable Container / Preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-slate-900/60">
          {activeSlips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Please select at least one month to preview and download the salary slip.
            </div>
          ) : (
            <div ref={printContainerRef} className="max-w-[760px] mx-auto space-y-6">
              {activeSlips.map((slip, index) => {
                const isLast = index === activeSlips.length - 1;
                const rawCompany = slip.company || {};
                const company = {
                  name: (rawCompany.name && rawCompany.name !== 'Company Name' && rawCompany.name !== 'Simply Useful ERP')
                    ? rawCompany.name
                    : (fallbackCompany.name || 'KAMLA CONCHEM PVT LTD'),
                  address: rawCompany.address || fallbackCompany.address,
                  phone: rawCompany.phone || fallbackCompany.phone,
                  email: rawCompany.email || fallbackCompany.email,
                  gst: rawCompany.gst || fallbackCompany.gst,
                  logo: rawCompany.logo || fallbackCompany.logo,
                };
                const netInWords = (slip.net_pay || 0) < 0 
                  ? `Minus ${amountToWords(Math.abs(slip.net_pay || 0))}` 
                  : amountToWords(slip.net_pay || 0);
                const deductionsTotal = slip.deductions.total_deductions !== undefined
                  ? slip.deductions.total_deductions
                  : ((slip.deductions.advance || 0) + (slip.deductions.late || 0) + (slip.deductions.unpaid_leave || 0) + (slip.deductions.other || 0));

                return (
                  <div
                    key={`${slip.labour_id}-${slip.month}`}
                    className={`bg-white text-slate-900 rounded-lg shadow-sm border border-slate-300 p-6 md:p-8 space-y-5 print:shadow-none print:border-none ${
                      !isLast ? 'payslip-page-break break-after-page' : ''
                    }`}
                    style={{ pageBreakAfter: isLast ? 'auto' : 'always' }}
                  >
                    {/* Header: Company Logo & Details */}
                    <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 gap-4">
                      {/* Logo or Brand Monogram */}
                      <div className="flex items-center gap-3">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt="Company Logo"
                            className="h-16 max-w-[160px] object-contain shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">
                            {(company.name || 'ERP').charAt(0)}
                          </div>
                        )}
                        <div>
                          <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                            {company.name || 'Simply Useful ERP'}
                          </h1>
                          {company.address && (
                            <p className="text-[11px] text-slate-600 max-w-md leading-relaxed whitespace-pre-line">
                              {company.address}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-1 font-medium">
                            {company.phone && <span>Phone: {company.phone}</span>}
                            {company.email && <span>Email: {company.email}</span>}
                            {company.gst && <span>GSTIN: {company.gst}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Payslip Badge Title */}
                      <div className="text-right shrink-0">
                        <span className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 uppercase tracking-wider rounded">
                          Salary Payslip
                        </span>
                        <p className="text-xs font-bold text-slate-800 mt-1.5">
                          {formatMonthName(slip.month)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Slip #{slip.id || `SLIP-${slip.month}-${slip.labour_id}`}
                        </p>
                      </div>
                    </div>

                    {/* Employee & Employment Particulars Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-md p-3 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Employee Name</span>
                        <span className="font-bold text-slate-900">{slip.labour_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Employee ID</span>
                        <span className="font-mono font-medium text-slate-900">{slip.employee_id || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Designation</span>
                        <span className="font-medium text-slate-900">{slip.designation || 'Staff'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Department</span>
                        <span className="font-medium text-slate-900">{slip.department || 'Operations'}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Staff Type</span>
                        <span className="font-medium text-slate-900">{slip.employee_type || 'FIXED'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Date of Joining</span>
                        <span className="font-medium text-slate-900">{slip.doj || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Bank Name</span>
                        <span className="font-medium text-slate-900">{slip.bank_details?.bank_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Bank A/c No.</span>
                        <span className="font-mono font-medium text-slate-900">{slip.bank_details?.account_no || '—'}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Bank IFSC</span>
                        <span className="font-mono font-medium text-slate-900">{slip.bank_details?.ifsc || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Payable Days</span>
                        <span className="font-bold text-slate-900">{slip.stats?.payable_days ?? 30} days</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Leaves / LOP</span>
                        <span className="font-medium text-slate-900">{slip.stats?.absent ?? 0} days</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Overtime</span>
                        <span className="font-medium text-slate-900">{slip.stats?.ot_hours ?? 0} hrs</span>
                      </div>
                    </div>

                    {/* Earnings & Deductions Tables (2-Column Grid) */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Earnings Column */}
                      <div className="border border-slate-300 rounded-md overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 text-xs border-b border-slate-300 uppercase tracking-wider flex justify-between">
                            <span>Earnings</span>
                            <span>Amount (₹)</span>
                          </div>
                          <div className="p-3 space-y-1.5 text-xs">
                            <div className="flex justify-between py-0.5">
                              <span className="text-slate-600">Basic Pay</span>
                              <span className="font-mono font-medium">{Currency(slip.earnings.basic)}</span>
                            </div>
                            {(slip.earnings.hra || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">House Rent Allowance (HRA)</span>
                                <span className="font-mono font-medium">{Currency(slip.earnings.hra || 0)}</span>
                              </div>
                            )}
                            {(slip.earnings.allowances || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">Other Allowances</span>
                                <span className="font-mono font-medium">{Currency(slip.earnings.allowances || 0)}</span>
                              </div>
                            )}
                            {(slip.earnings.travel || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">Travel Allowance</span>
                                <span className="font-mono font-medium">{Currency(slip.earnings.travel || 0)}</span>
                              </div>
                            )}
                            {(slip.earnings.ot_pay || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">Overtime Pay ({slip.stats?.ot_hours || 0} hrs)</span>
                                <span className="font-mono font-medium">{Currency(slip.earnings.ot_pay || 0)}</span>
                              </div>
                            )}
                            {(slip.earnings.incentives || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">Incentives &amp; Commission</span>
                                <span className="font-mono font-medium">{Currency(slip.earnings.incentives || 0)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-100/80 border-t-2 border-slate-300 px-3 py-2 flex justify-between font-bold text-xs text-slate-900">
                          <span>Gross Earnings (A)</span>
                          <span className="font-mono text-sm">{Currency(slip.earnings.gross)}</span>
                        </div>
                      </div>

                      {/* Deductions Column */}
                      <div className="border border-slate-300 rounded-md overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="bg-slate-100 text-slate-800 font-bold px-3 py-1.5 text-xs border-b border-slate-300 uppercase tracking-wider flex justify-between">
                            <span>Deductions</span>
                            <span>Amount (₹)</span>
                          </div>
                          <div className="p-3 space-y-1.5 text-xs">
                            {((slip.deductions.loan_emi || 0) > 0 || (slip.deductions.advance && !slip.deductions.daily_advance && !slip.deductions.loan_emi)) && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600 font-medium">Loan EMI Deduction</span>
                                <span className="font-mono font-medium text-red-600">
                                  -{Currency(slip.deductions.loan_emi || slip.deductions.advance || 0)}
                                </span>
                              </div>
                            )}
                            {(slip.deductions.daily_advance || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600 font-medium">Salary / Daily Advance</span>
                                <span className="font-mono font-medium text-red-600">
                                  -{Currency(slip.deductions.daily_advance || 0)}
                                </span>
                              </div>
                            )}
                            {!(slip.deductions.loan_emi || 0) && !(slip.deductions.daily_advance || 0) && !(slip.deductions.advance || 0) && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">Loan &amp; Advance</span>
                                <span className="font-mono font-medium text-slate-400">₹0.00</span>
                              </div>
                            )}
                            {(slip.deductions.late || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">Late Attendance Penalty</span>
                                <span className="font-mono font-medium text-red-600">-{Currency(slip.deductions.late || 0)}</span>
                              </div>
                            )}
                            {(slip.deductions.unpaid_leave || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">Unpaid Leave (LOP) Deduction</span>
                                <span className="font-mono font-medium text-red-600">-{Currency(slip.deductions.unpaid_leave || 0)}</span>
                              </div>
                            )}
                            {(slip.deductions.other || 0) > 0 && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-slate-600">Other Deductions</span>
                                <span className="font-mono font-medium text-red-600">-{Currency(slip.deductions.other || 0)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-100/80 border-t-2 border-slate-300 px-3 py-2 flex justify-between font-bold text-xs text-slate-900">
                          <span>Total Deductions (B)</span>
                          <span className="font-mono text-sm text-red-600">-{Currency(deductionsTotal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Salary Payable Highlight Box */}
                    <div className="bg-slate-900 text-white rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold block">
                          Net Salary Payable (A - B)
                        </span>
                        <div className="text-xs text-slate-200 font-medium italic mt-0.5">
                          Amount in Words: <span className="text-amber-300 font-semibold">{netInWords}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-black tracking-tight text-white font-mono">
                          {Currency(slip.net_pay)}
                        </div>
                        {slip.is_paid ? (
                          <span className="text-[10px] text-emerald-400 font-semibold uppercase">● Payment Disbursed</span>
                        ) : slip.is_finalized ? (
                          <span className="text-[10px] text-amber-300 font-semibold uppercase">● Approved &amp; Finalized</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">● Draft Calculation</span>
                        )}
                      </div>
                    </div>

                    {/* Signatures & Footer Note */}
                    <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                      <div className="space-y-12">
                        <div className="h-8" />
                        <div className="border-t border-slate-400 pt-1 text-[11px] font-semibold text-slate-700">
                          Employee Signature
                        </div>
                      </div>

                      <div className="space-y-12">
                        <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                          (Authorized Signatory / HR Manager)
                        </div>
                        <div className="border-t border-slate-400 pt-1 text-[11px] font-semibold text-slate-700">
                          For {company.name || 'Company Management'}
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-2 font-mono">
                      This is a computer-generated salary slip and does not require a physical signature if digitally approved. Generated via Simply Useful ERP.
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-3 border-t border-border bg-card shrink-0 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Displaying <span className="font-semibold text-foreground">{activeSlips.length}</span> slip{activeSlips.length !== 1 ? 's' : ''} across {selectedMonths.length} month{selectedMonths.length !== 1 ? 's' : ''}.
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalarySlipPdfModal;
