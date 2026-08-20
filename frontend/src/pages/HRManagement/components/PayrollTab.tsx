import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useHRPayroll, useLedgerMutations } from '@/hooks/hr/useHR';
import { SafeDataView } from '@/components/SafeDataView';
import { Printer, Download, Search, FileText, Calculator } from 'lucide-react';

const Currency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const PayrollTab: React.FC = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [fetchMonth, setFetchMonth] = useState<string>(currentMonth);
  
  const { data: payroll = [], isLoading, error, refetch } = useHRPayroll(fetchMonth);

  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  
  const { finalizePayroll } = useLedgerMutations();

  const handleGenerate = () => {
    setFetchMonth(selectedMonth);
    setSelectedSlip(null);
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

  const handlePrint = () => {
    window.print();
  };

  if (selectedSlip) {
    return (
      <div className="max-w-3xl mx-auto bg-white text-black p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-8 print:hidden">
          <Button variant="outline" onClick={() => setSelectedSlip(null)}>Back to List</Button>
          <Button onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" /> Print Slip</Button>
        </div>

        {/* Salary Slip Template */}
        <div className="border border-gray-800 p-6 print:border-none">
          <div className="text-center mb-6 border-b border-gray-800 pb-4">
            <h1 className="text-2xl font-bold uppercase tracking-wider">Company Name</h1>
            <p className="text-sm">Salary Slip for the month of {new Date(fetchMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p><span className="font-semibold w-32 inline-block">Employee Name:</span> {selectedSlip.labour_name}</p>
              <p><span className="font-semibold w-32 inline-block">Employee Type:</span> {selectedSlip.employee_type}</p>
            </div>
            <div>
              <p><span className="font-semibold w-32 inline-block">Total Days:</span> {selectedSlip.stats.payable_days}</p>
              <p><span className="font-semibold w-32 inline-block">Leave/Absent:</span> {selectedSlip.stats.absent}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 border-t border-gray-800 pt-4">
            {/* Earnings Column */}
            <div>
              <h3 className="font-bold border-b border-gray-400 pb-2 mb-2">Earnings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Basic Pay</span><span>{Currency(selectedSlip.earnings.basic)}</span></div>
                {selectedSlip.earnings.hra > 0 && <div className="flex justify-between"><span>House Rent Allowance (HRA)</span><span>{Currency(selectedSlip.earnings.hra)}</span></div>}
                {selectedSlip.earnings.allowances > 0 && <div className="flex justify-between"><span>Other / Travel Allowances</span><span>{Currency(selectedSlip.earnings.allowances)}</span></div>}
                {selectedSlip.earnings.ot_pay > 0 && <div className="flex justify-between"><span>Overtime Pay ({selectedSlip.stats.ot_hours} hrs)</span><span>{Currency(selectedSlip.earnings.ot_pay)}</span></div>}
                {selectedSlip.earnings.incentives > 0 && <div className="flex justify-between"><span>Incentives</span><span>{Currency(selectedSlip.earnings.incentives)}</span></div>}
              </div>
              <div className="flex justify-between font-bold border-t border-gray-400 mt-4 pt-2">
                <span>Total Earnings</span><span>{Currency(selectedSlip.earnings.gross)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div>
              <h3 className="font-bold border-b border-gray-400 pb-2 mb-2">Deductions</h3>
              <div className="space-y-2 text-sm">
                {selectedSlip.deductions.late > 0 && <div className="flex justify-between"><span>Late Coming Deduction</span><span>{Currency(selectedSlip.deductions.late)}</span></div>}
                {selectedSlip.deductions.advance > 0 && <div className="flex justify-between"><span>Salary Advance Recovery</span><span>{Currency(selectedSlip.deductions.advance)}</span></div>}
                {selectedSlip.deductions.total_deductions === 0 && <div className="text-gray-500 italic">No deductions</div>}
              </div>
              <div className="flex justify-between font-bold border-t border-gray-400 mt-4 pt-2">
                <span>Total Deductions</span><span>{Currency(selectedSlip.deductions.total_deductions)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t-2 border-gray-800 pt-4 bg-gray-100 p-4 flex justify-between items-center text-lg">
            <span className="font-bold uppercase">Net Pay</span>
            <span className="font-bold text-2xl">{Currency(selectedSlip.net_pay)}</span>
          </div>
          
          <div className="mt-16 flex justify-between text-sm pt-8">
            <div className="border-t border-gray-800 w-48 text-center pt-2">Employer Signature</div>
            <div className="border-t border-gray-800 w-48 text-center pt-2">Employee Signature</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-bold">Payroll & Salary Slips</h2>
          <p className="text-sm text-muted-foreground mt-1">Generate compliant Indian salary slips for your staff.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background"
          />
          {payroll.some((p: any) => !p.is_finalized) && (
            <Button onClick={handleFinalize} variant="default" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              Finalize Payroll
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowBreakdown(!showBreakdown)} className="gap-2">
            <Calculator className="w-4 h-4" /> {showBreakdown ? 'Hide Breakdown' : 'Show Breakdown'}
          </Button>
          <Button onClick={handleGenerate} className="gap-2"><Search className="w-4 h-4" /> Run Payroll</Button>
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
              <Button variant="secondary" className="w-full gap-2" onClick={() => setSelectedSlip(slip)}>
                <FileText className="w-4 h-4" /> View Salary Slip
              </Button>
            </div>
          ))}
          {payroll.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No payroll data generated for this month.
            </div>
          )}
        </div>
      </SafeDataView>
    </div>
  );
};
