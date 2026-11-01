import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useHRPayroll, useLedgerMutations } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import { Download, Search, FileText, Calculator } from 'lucide-react';
import { SalarySlipPdfModal } from '@/components/PDF/SalarySlipPdfModal';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/inventory/useMasters';
import { generateRTGSSlip } from '@/utils/pdfGenerator';
import { Landmark } from 'lucide-react';

const Currency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const PayrollTab: React.FC = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [fetchMonth, setFetchMonth] = useState<string>(currentMonth);
  
  const { data: payroll = [], isLoading, error, refetch } = useHRPayroll(fetchMonth);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [modalSlips, setModalSlips] = useState<any[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  
  const { finalizePayroll } = useLedgerMutations();
  const { toast } = useToast();
  const { data: settings } = useSettings();

  const getNetPay = (slip: any) => {
    const adv = overrides[slip.labour_id] !== undefined ? overrides[slip.labour_id] : (slip.deductions?.advance || 0);
    return (slip.earnings?.gross || 0) - (slip.deductions?.late || 0) - adv;
  };

  const handlePrintRTGS = async (slip: any) => {
    try {
      const netPay = getNetPay(slip);
      const mStr = slip.month || fetchMonth || '';
      await generateRTGSSlip({
        beneficiaryName: slip.labour_name,
        bankName: slip.bank_details?.bank_name || '',
        accountNumber: slip.bank_details?.account_no || '',
        ifscCode: slip.bank_details?.ifsc || '',
        amount: netPay,
        date: new Date().toISOString().slice(0, 10),
        companyName: settings?.company_name || settings?.companyName || 'KAMLA CONCHEM PVT.LTD',
        companyAccount: settings?.company_bank_account || '925030009706188',
        companyBank: settings?.company_bank_name || 'AXIS BANK',
        companyBranch: settings?.company_bank_branch || 'LUNSIKUI, NAVSARI',
        companyIfsc: settings?.company_bank_ifsc || 'UTIB0000047',
        companyAddress: settings?.company_address || 'BLOCK NO:183BHATTAI NAVSARI',
        companyPan: settings?.company_gst ? settings.company_gst.slice(2, 12) : 'AALCK3507C',
        companyPhone: settings?.company_phone || '8866322700',
        beneficiaryBranch: 'NAVSARI',
        narration: `SALARY ${mStr ? mStr.toUpperCase() : ''}`
      });
      toast({ title: 'RTGS Form Ready', description: `Axis Bank RTGS Form filled & downloaded for ${slip.labour_name}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to generate RTGS form', variant: 'destructive' });
    }
  };

  const handleBulkRTGS = async () => {
    if (payroll.length === 0) return;
    toast({ title: 'Generating RTGS Forms', description: `Generating forms for ${payroll.length} employees...` });
    for (const slip of payroll) {
      try {
        await handlePrintRTGS(slip);
        if (payroll.length > 1) {
          await new Promise(r => setTimeout(r, 400));
        }
      } catch (e) {
        console.error('RTGS error:', e);
      }
    }
  };

  const handleGenerate = () => {
    setFetchMonth(selectedMonth);
    setOverrides({});
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize payroll for this month? This will post salary and advance deductions to the employee ledgers.')) return;
    
    const slipsToFinalize = payroll.filter((p: any) => !p.is_finalized).map((p: any) => {
      const manualAdv = overrides[p.labour_id];
      const actualAdv = manualAdv !== undefined ? manualAdv : p.deductions.advance;
      const netPay = p.earnings.gross - p.deductions.late - actualAdv;
      
      return {
        ...p,
        manual_advance_override: manualAdv,
        net_pay: netPay,
        deductions: {
          ...p.deductions,
          advance: actualAdv
        }
      };
    });
    
    if (slipsToFinalize.length === 0) return;
    
    await finalizePayroll({ month: fetchMonth, slips: slipsToFinalize });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-bold">Payroll & Salary Slips</h2>
          <p className="text-sm text-muted-foreground mt-1">Generate compliant Indian salary slips for your staff.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background"
          />
          {payroll.some((p: any) => !p.is_finalized) && (
            <Button onClick={handleFinalize} variant="default" className="gap-2 bg-green-600 hover:bg-green-700 text-white cursor-pointer">
              Finalize Payroll
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowBreakdown(!showBreakdown)} className="gap-2 cursor-pointer">
            <Calculator className="w-4 h-4" /> {showBreakdown ? 'Hide Breakdown' : 'Show Breakdown'}
          </Button>
          <Button onClick={handleGenerate} className="gap-2 cursor-pointer"><Search className="w-4 h-4" /> Run Payroll</Button>
          <Button 
            variant="outline" 
            disabled={payroll.length === 0} 
            onClick={handleBulkRTGS}
            className="gap-2 border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer font-medium"
          >
            <Landmark className="w-4 h-4 text-blue-600" /> RTGS Forms ({payroll.length})
          </Button>
          <Button 
            variant="outline" 
            disabled={payroll.length === 0} 
            onClick={() => {
              setModalSlips(payroll);
              setPdfModalOpen(true);
            }} 
            className="gap-2 border-primary/50 text-primary hover:bg-primary/10 cursor-pointer font-medium"
          >
            <Download className="w-4 h-4" /> Download Slips (PDF)
          </Button>
        </div>
      </div>

      <SafeDataView isLoading={isLoading} error={error} data={payroll} onRetry={refetch}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payroll.map((slip: any) => (
            <div key={slip.labour_id} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{slip.labour_name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${slip.employee_type === 'FIXED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {slip.employee_type}
                  </span>
                  {slip.is_finalized && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-green-100 text-green-700 ml-2">Finalized</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                  <div>Paid Days: <span className="font-medium text-foreground">{slip.stats.payable_days}</span></div>
                  <div>OT Hours: <span className="font-medium text-foreground">{slip.stats.ot_hours}</span></div>
                </div>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Gross:</span> <span>{Currency(slip.earnings.gross)}</span></div>
                  
                  {/* Advance Override */}
                  <div className="flex justify-between items-center text-red-500/80">
                    <span>Adv/Loan Ded:</span> 
                    {!slip.is_finalized ? (
                      <input 
                        type="number" 
                        min="0"
                        className="w-24 border border-red-200 rounded px-2 py-1 text-right text-xs bg-red-50"
                        value={overrides[slip.labour_id] !== undefined ? overrides[slip.labour_id] : slip.deductions.advance}
                        onChange={e => setOverrides(prev => ({ ...prev, [slip.labour_id]: Number(e.target.value) }))}
                      />
                    ) : (
                      <span>-{Currency(slip.deductions.advance)}</span>
                    )}
                  </div>
                  
                  {slip.deductions.late > 0 && <div className="flex justify-between text-red-500/80"><span>Late Ded:</span> <span>-{Currency(slip.deductions.late)}</span></div>}
                  
                  <div className="flex justify-between font-bold text-primary border-t border-border pt-2 mt-2">
                    <span>Net Pay:</span> 
                    <span>
                      {Currency(
                        slip.earnings.gross - slip.deductions.late - (overrides[slip.labour_id] !== undefined ? overrides[slip.labour_id] : slip.deductions.advance)
                      )}
                    </span>
                  </div>
                </div>
                
                {showBreakdown && slip.breakdown && (
                  <div className="mt-4 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-[11px] font-mono text-gray-700 space-y-1">
                    <div className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-1">Calculation Breakdown</div>
                    {slip.breakdown.basic && <div><span className="text-gray-500">Basic:</span> {slip.breakdown.basic}</div>}
                    {slip.breakdown.ot && <div><span className="text-gray-500">OT:</span> {slip.breakdown.ot}</div>}
                    {slip.breakdown.travel && <div><span className="text-gray-500">Travel:</span> {slip.breakdown.travel}</div>}
                    {slip.breakdown.incentive && <div><span className="text-gray-500">Incentive:</span> {slip.breakdown.incentive}</div>}
                    {slip.breakdown.late && <div><span className="text-gray-500">Late:</span> {slip.breakdown.late}</div>}
                    {slip.breakdown.advance && <div><span className="text-gray-500">Advance:</span> {slip.breakdown.advance}</div>}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="w-full gap-1.5 cursor-pointer font-medium text-xs h-9" 
                  onClick={() => {
                    setModalSlips([slip]);
                    setPdfModalOpen(true);
                  }}
                >
                  <FileText className="w-3.5 h-3.5" /> Payslip
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full gap-1.5 cursor-pointer font-semibold text-xs h-9 border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10" 
                  onClick={() => handlePrintRTGS(slip)}
                >
                  <Landmark className="w-3.5 h-3.5 text-blue-600" /> RTGS Form
                </Button>
              </div>
            </div>
          ))}
          {payroll.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No payroll data generated for this month.
            </div>
          )}
        </div>
      </SafeDataView>

      {/* Salary Slip PDF Modal */}
      <SalarySlipPdfModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        slips={modalSlips}
        defaultSelectedMonth={fetchMonth}
        title={modalSlips.length === 1 ? `Salary Slip — ${modalSlips[0]?.labour_name}` : `Staff Salary Slips (${modalSlips.length})`}
      />
    </div>
  );
};
