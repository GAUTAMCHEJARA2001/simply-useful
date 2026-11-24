import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, FileText, Building2, CheckCircle2, Loader2, Calculator } from 'lucide-react';
import { amountToWords } from './utils/amountToWords';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/inventory/useMasters';

interface SalaryRegisterReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  slips: any[];
  month: string; // YYYY-MM
  overrides?: Record<number, number>;
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
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    return monthStr;
  }
};

export const SalaryRegisterReportModal: React.FC<SalaryRegisterReportModalProps> = ({
  isOpen,
  onClose,
  slips = [],
  month,
  overrides = {},
}) => {
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const monthLabel = formatMonthName(month);
  const companyName = settings?.company_name || settings?.companyName || 'KAMLA CONCHEM PVT. LTD.';
  const companyAddress = settings?.company_address || settings?.companyAddress || 'Navsari, Gujarat, India';
  const companyGst = settings?.company_gst || settings?.companyGst || '24AALCK3507C1ZV';
  const companyPhone = settings?.company_phone || settings?.companyPhone || '8866322700';

  // Calculate net pay per employee taking overrides into account
  const processedSlips = slips.map((slip: any, index: number) => {
    const manualAdv = overrides[slip.labour_id];
    const advanceDed = manualAdv !== undefined ? manualAdv : (slip.deductions?.advance || 0);
    const gross = Number(slip.earnings?.gross || 0);
    const lateDed = Number(slip.deductions?.late || 0);
    const unpaidDed = Number(slip.deductions?.unpaid_leave || 0);
    const otherDed = Number(slip.deductions?.other || 0);
    const totalDed = advanceDed + lateDed + unpaidDed + otherDed;
    const netPay = gross - lateDed - advanceDed;

    return {
      srNo: index + 1,
      id: slip.labour_id,
      name: slip.labour_name,
      employeeType: slip.employee_type || 'STAFF',
      payableDays: slip.stats?.payable_days || 0,
      otHours: slip.stats?.ot_hours || 0,
      basic: Number(slip.earnings?.basic || 0),
      allowances: Number(slip.earnings?.allowances || 0) + Number(slip.earnings?.travel || 0) + Number(slip.earnings?.incentives || 0),
      gross,
      advanceDed,
      lateDed,
      unpaidDed,
      totalDed,
      netPay,
      bankName: slip.bank_details?.bank_name || 'AXIS BANK',
      accountNo: slip.bank_details?.account_no || '—',
      ifsc: slip.bank_details?.ifsc || '—',
      breakdown: slip.breakdown || {},
      isFinalized: slip.is_finalized,
    };
  });

  // Grand totals
  const totalEmployees = processedSlips.length;
  const totalGross = processedSlips.reduce((sum, s) => sum + s.gross, 0);
  const totalAdvanceDed = processedSlips.reduce((sum, s) => sum + s.advanceDed, 0);
  const totalLateDed = processedSlips.reduce((sum, s) => sum + s.lateDed, 0);
  const totalDeductions = totalAdvanceDed + totalLateDed;
  const totalNetPay = processedSlips.reduce((sum, s) => sum + s.netPay, 0);
  const totalNetInWords = amountToWords(totalNetPay);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    const filename = `SALARY_REGISTER_REPORT_${(month || 'MONTH').toUpperCase().replace('-', '_')}.pdf`;

    try {
      const opt = {
        margin: [8, 8, 8, 8],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf().set(opt).from(reportRef.current).save();
      toast({
        title: 'Salary Report Downloaded ✅',
        description: `Successfully downloaded ${filename}`,
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      toast({
        title: 'Download Failed',
        description: err?.message || 'Could not compile salary PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    const printContents = reportRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Register & Calculation Report — ${monthLabel}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .border-b { border-bottom: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Monthly Master Salary &amp; Calculation Register
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consolidated payroll calculation report with individual staff formulas and net payout summary
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isGenerating || processedSlips.length === 0}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isGenerating || processedSlips.length === 0}
                className="gap-1.5 h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download Report (Single PDF)
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Printable Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
          <div
            ref={reportRef}
            className="bg-white text-slate-900 p-6 rounded-lg shadow-sm max-w-full mx-auto space-y-5 border border-slate-200"
            style={{ minWidth: '960px' }}
          >
            {/* 1. Official Company Header */}
            <div className="border-b-2 border-slate-800 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    {companyName}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">{companyAddress}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    GSTIN: <strong>{companyGst}</strong> | Phone: {companyPhone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                    Official Salary Register
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">Month: {monthLabel}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Date Generated: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* 2. Executive Summary Metrics Box */}
            <div className="grid grid-cols-5 gap-3 p-3 bg-slate-100 rounded-lg border border-slate-300 text-center">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Staff</span>
                <span className="text-base font-extrabold text-slate-900">{totalEmployees}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Gross Earnings</span>
                <span className="text-base font-extrabold text-slate-900">{Currency(totalGross)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Advance &amp; Loan Ded.</span>
                <span className="text-base font-extrabold text-rose-600">-{Currency(totalAdvanceDed)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Late / LOP Ded.</span>
                <span className="text-base font-extrabold text-rose-600">-{Currency(totalLateDed)}</span>
              </div>
              <div className="bg-slate-900 text-white p-2 rounded -my-1 shadow-sm">
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Net Payable</span>
                <span className="text-base font-black text-amber-300 font-mono">{Currency(totalNetPay)}</span>
              </div>
            </div>

            {/* Total Net in Words */}
            <div className="px-3 py-1.5 bg-slate-50 rounded border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold">Total Net Salary Payable in Words: </span>
              <strong className="text-slate-900 uppercase font-mono">{totalNetInWords} ONLY</strong>
            </div>

            {/* 3. Master Consolidated Staff Salary Table */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Staff Salary Payout Roster ({totalEmployees} Employees)
                </h3>
                <span className="text-[10px] text-slate-500">All figures in INR (₹)</span>
              </div>

              <table className="w-full text-[10px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-200/80 text-slate-900 font-bold border-b border-slate-300">
                    <th className="p-1.5 border border-slate-300 text-center w-7">#</th>
                    <th className="p-1.5 border border-slate-300 text-left">Employee Name</th>
                    <th className="p-1.5 border border-slate-300 text-center w-14">Type</th>
                    <th className="p-1.5 border border-slate-300 text-center w-14">Paid Days</th>
                    <th className="p-1.5 border border-slate-300 text-right w-20">Basic Pay</th>
                    <th className="p-1.5 border border-slate-300 text-right w-20">Allow/Incent</th>
                    <th className="p-1.5 border border-slate-300 text-right w-20 font-bold bg-slate-100">Gross (A)</th>
                    <th className="p-1.5 border border-slate-300 text-right w-20 text-rose-700">Advance Ded</th>
                    <th className="p-1.5 border border-slate-300 text-right w-16 text-rose-700">Late/LOP</th>
                    <th className="p-1.5 border border-slate-300 text-right w-24 font-extrabold bg-slate-100 text-slate-950">Net Pay (A-B)</th>
                    <th className="p-1.5 border border-slate-300 text-left">Bank &amp; Account No</th>
                    <th className="p-1.5 border border-slate-300 text-center w-16">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {processedSlips.map((slip) => (
                    <tr key={slip.id} className="border-b border-slate-200 hover:bg-slate-50 font-medium">
                      <td className="p-1.5 border border-slate-300 text-center text-slate-500">{slip.srNo}</td>
                      <td className="p-1.5 border border-slate-300 font-bold text-slate-900">
                        {slip.name}
                        {slip.isFinalized && <span className="ml-1 text-[8px] text-emerald-600 font-bold">✓</span>}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-center text-slate-600 text-[9px]">{slip.employeeType}</td>
                      <td className="p-1.5 border border-slate-300 text-center font-semibold">{slip.payableDays}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono">{Currency(slip.basic)}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono text-slate-600">{Currency(slip.allowances)}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono font-bold bg-slate-50">{Currency(slip.gross)}</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono text-rose-600">
                        {slip.advanceDed > 0 ? `-${Currency(slip.advanceDed)}` : '—'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono text-rose-600">
                        {slip.lateDed > 0 ? `-${Currency(slip.lateDed)}` : '—'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono font-black text-xs bg-slate-100 text-slate-900">
                        {Currency(slip.netPay)}
                      </td>
                      <td className="p-1.5 border border-slate-300 font-mono text-[9px] text-slate-600 truncate max-w-[150px]">
                        {slip.bankName}: {slip.accountNo} ({slip.ifsc})
                      </td>
                      <td className="p-1.5 border border-slate-300 text-center text-slate-300 text-[8px]">
                        {slip.isFinalized ? 'APPROVED' : 'Pending'}
                      </td>
                    </tr>
                  ))}

                  {/* Grand Totals Row */}
                  <tr className="bg-slate-200/90 font-black text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={4} className="p-2 border border-slate-300 text-right uppercase tracking-wider">
                      Grand Totals ({totalEmployees} Staff):
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono">
                      {Currency(processedSlips.reduce((sum, s) => sum + s.basic, 0))}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono">
                      {Currency(processedSlips.reduce((sum, s) => sum + s.allowances, 0))}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-black bg-slate-200">
                      {Currency(totalGross)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono text-rose-700">
                      -{Currency(totalAdvanceDed)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono text-rose-700">
                      -{Currency(totalLateDed)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-black text-sm bg-slate-300 text-slate-950">
                      {Currency(totalNetPay)}
                    </td>
                    <td colSpan={2} className="p-2 border border-slate-300 text-center font-bold text-slate-700">
                      Net Payout Complete
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Individual Staff Calculation Breakdown Section */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Calculator className="w-4 h-4 text-primary" />
                Individual Salary Calculation Breakdown &amp; Audit Formulas
              </div>
              <p className="text-[10px] text-slate-500">
                Verified formula details showing exact daily rate conversions, overtime, allowances, advance recoveries, and net payable.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {processedSlips.map((slip) => (
                  <div
                    key={slip.id}
                    className="p-2 rounded border border-slate-200 bg-slate-50/80 space-y-1"
                  >
                    <div className="flex justify-between items-baseline font-bold text-slate-900 border-b border-slate-200 pb-0.5">
                      <span>{slip.srNo}. {slip.name}</span>
                      <span className="text-emerald-700 font-black">{Currency(slip.netPay)}</span>
                    </div>
                    <div className="text-slate-600 space-y-0.5 text-[9px]">
                      {slip.breakdown.basic && <div>• Basic Calculation: {slip.breakdown.basic}</div>}
                      {slip.breakdown.ot && <div>• Overtime (OT): {slip.breakdown.ot}</div>}
                      {slip.breakdown.travel && <div>• Travel Allowance: {slip.breakdown.travel}</div>}
                      {slip.breakdown.incentive && <div>• Incentive / Commission: {slip.breakdown.incentive}</div>}
                      {slip.breakdown.advance && <div className="text-rose-600">• Advance Deduction: {slip.breakdown.advance}</div>}
                      {slip.breakdown.late && <div className="text-rose-600">• Late Attendance Deduction: {slip.breakdown.late}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Authorization & Sign-off Boxes */}
            <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <div className="h-6" />
                <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-800">
                  Prepared By (HR Manager)
                </div>
                <p className="text-[9px] text-slate-500">Attendance &amp; Payroll Computation</p>
              </div>

              <div className="space-y-8">
                <div className="h-6" />
                <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-800">
                  Verified By (Accounts Dept)
                </div>
                <p className="text-[9px] text-slate-500">Ledger &amp; Advance Reconciliation</p>
              </div>

              <div className="space-y-8">
                <div className="h-6" />
                <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-800">
                  Approved By (Managing Director)
                </div>
                <p className="text-[9px] text-slate-500">Final Salary Disbursement Approval</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-2 font-mono">
              Computer Generated Master Salary Register &bull; Simply Useful ERP &bull; Confidential Payroll Record
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-border bg-card shrink-0 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Total Staff: <strong>{totalEmployees}</strong> | Total Net Payable: <strong className="text-foreground">{Currency(totalNetPay)}</strong>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
