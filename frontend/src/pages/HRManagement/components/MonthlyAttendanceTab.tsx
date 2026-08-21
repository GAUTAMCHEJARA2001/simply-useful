import React, { useState } from 'react';
import { useHRPayroll, useLedgerMutations } from '@/hooks/hr/useHR';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SafeDataView } from '@/components/SafeDataView';
import { Modal } from '@/components/Modal';
import { CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const MonthlyAttendanceTab = () => {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: payrollList = [], isLoading, error, refetch } = useHRPayroll(month);
  const { finalizePayroll } = useLedgerMutations();
  const { toast } = useToast();

  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [advanceOverride, setAdvanceOverride] = useState<string>('');

  const handleOpenFinalize = (emp: any) => {
    setSelectedEmp(emp);
    setAdvanceOverride(emp.deductions?.advance?.toString() || '0');
    setModalOpen(true);
  };

  const handleFinalize = async () => {
    if (!selectedEmp) return;
    try {
      const overrideVal = parseFloat(advanceOverride);
      const slipData = {
        ...selectedEmp,
        manual_advance_override: isNaN(overrideVal) ? null : overrideVal,
        net_pay: selectedEmp.earnings.gross - selectedEmp.deductions.late - (isNaN(overrideVal) ? selectedEmp.deductions.advance : overrideVal)
      };

      await finalizePayroll({
        month,
        slips: [slipData]
      });
      setModalOpen(false);
      setSelectedEmp(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold">Select Month:</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="border-input border rounded-md px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      <SafeDataView data={payrollList} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                  <th className="px-4 py-3 font-semibold">OT (hrs)</th>
                  <th className="px-4 py-3 font-semibold">Late (hrs)</th>
                  <th className="px-4 py-3 font-semibold">Travel (km)</th>
                  <th className="px-4 py-3 font-semibold">Other (₹)</th>
                  <th className="px-4 py-3 font-semibold">Payable Days</th>
                  <th className="px-4 py-3 font-semibold text-right">Gross Pay</th>
                  <th className="px-4 py-3 font-semibold text-right">Deductions</th>
                  <th className="px-4 py-3 font-semibold text-right">Net Pay</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrollList.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">No employees found</td></tr>
                ) : (
                  payrollList.map((emp: any) => (
                    <tr key={emp.labour_id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex flex-col">
                          <span>{emp.labour_name}</span>
                          <span className="text-[11px] text-muted-foreground uppercase">{emp.employee_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 text-[11px] font-medium">
                          <span className="text-green-600 bg-green-50 px-1.5 rounded" title="Present">{emp.stats.present}P</span>
                          {emp.stats.half_day > 0 && <span className="text-orange-600 bg-orange-50 px-1.5 rounded" title="Half Day">{emp.stats.half_day}HD</span>}
                          {emp.stats.absent > 0 && <span className="text-red-600 bg-red-50 px-1.5 rounded" title="Absent">{emp.stats.absent}A</span>}
                          {emp.stats.wo > 0 && <span className="text-blue-600 bg-blue-50 px-1.5 rounded" title="Weekly Off">{emp.stats.wo}WO</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.stats.ot_hours || 0}</td>
                      <td className="px-4 py-3 text-red-500/80">{emp.stats.late_hours || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.stats.km_travelled || 0}</td>
                      <td className="px-4 py-3 text-green-600/80">{(emp.earnings.incentives + emp.earnings.allowances).toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold">{emp.stats.payable_days}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col gap-0.5 text-xs w-32 ml-auto">
                          <div className="flex justify-between text-muted-foreground"><span>Base:</span> <span>₹{emp.earnings.basic.toFixed(2)}</span></div>
                          {emp.earnings.ot_pay > 0 && <div className="flex justify-between text-muted-foreground"><span>OT:</span> <span>₹{emp.earnings.ot_pay.toFixed(2)}</span></div>}
                          {emp.earnings.travel > 0 && <div className="flex justify-between text-muted-foreground"><span>Travel:</span> <span>₹{emp.earnings.travel.toFixed(2)}</span></div>}
                          {emp.earnings.allowances > 0 && <div className="flex justify-between text-muted-foreground"><span>Allow:</span> <span>₹{emp.earnings.allowances.toFixed(2)}</span></div>}
                          {emp.earnings.incentives > 0 && <div className="flex justify-between text-muted-foreground"><span>Inc:</span> <span>₹{emp.earnings.incentives.toFixed(2)}</span></div>}
                          <div className="flex justify-between font-semibold pt-1 border-t mt-1"><span>Gross:</span> <span>₹{emp.earnings.gross.toFixed(2)}</span></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col gap-0.5 text-xs w-28 ml-auto">
                          {emp.deductions.late > 0 && <div className="flex justify-between text-red-500/80"><span>Late:</span> <span>-₹{emp.deductions.late.toFixed(2)}</span></div>}
                          {emp.deductions.advance > 0 && <div className="flex justify-between text-red-500/80"><span>Adv:</span> <span>-₹{emp.deductions.advance.toFixed(2)}</span></div>}
                          {emp.deductions.total_deductions > 0 ? (
                            <div className="flex justify-between font-semibold text-red-600 pt-1 border-t border-red-100 mt-1"><span>Ded:</span> <span>-₹{emp.deductions.total_deductions.toFixed(2)}</span></div>
                          ) : (
                            <div className="text-muted-foreground text-center">-</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary text-base">₹{emp.net_pay.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {emp.is_finalized ? (
                          <span className="inline-flex items-center text-green-700 bg-green-100 text-xs px-2 py-0.5 rounded-full font-semibold">
                            <CheckCircle className="w-3 h-3 mr-1" /> Finalized
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-yellow-700 bg-yellow-100 text-xs px-2 py-0.5 rounded-full font-semibold">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            size="sm" 
                            variant={emp.is_finalized ? "outline" : "default"} 
                            className="h-7 text-xs"
                            onClick={() => handleOpenFinalize(emp)}
                          >
                            {emp.is_finalized ? 'View Slip' : 'Finalize'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </SafeDataView>

      <Modal isOpen={modalOpen} title={`Salary Slip - ${selectedEmp?.labour_name} (${month})`} onClose={() => setModalOpen(false)}>
        {selectedEmp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <h4 className="text-sm font-semibold text-green-800 mb-2 border-b border-green-200 pb-1">Earnings</h4>
                <div className="space-y-1 text-sm text-green-900">
                  <div className="flex justify-between"><span>Basic:</span> <span>₹{selectedEmp.earnings.basic.toFixed(2)}</span></div>
                  {selectedEmp.earnings.hra > 0 && <div className="flex justify-between"><span>HRA:</span> <span>₹{selectedEmp.earnings.hra.toFixed(2)}</span></div>}
                  {selectedEmp.earnings.allowances > 0 && <div className="flex justify-between"><span>Allowances & Travel:</span> <span>₹{selectedEmp.earnings.allowances.toFixed(2)}</span></div>}
                  {selectedEmp.earnings.ot_pay > 0 && <div className="flex justify-between"><span>OT Pay:</span> <span>₹{selectedEmp.earnings.ot_pay.toFixed(2)}</span></div>}
                  {selectedEmp.earnings.incentives > 0 && <div className="flex justify-between"><span>Incentives:</span> <span>₹{selectedEmp.earnings.incentives.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold pt-1 border-t border-green-200"><span>Gross Pay:</span> <span>₹{selectedEmp.earnings.gross.toFixed(2)}</span></div>
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <h4 className="text-sm font-semibold text-red-800 mb-2 border-b border-red-200 pb-1">Deductions</h4>
                <div className="space-y-2 text-sm text-red-900">
                  {selectedEmp.deductions.late > 0 && <div className="flex justify-between"><span>Late Deduction:</span> <span>₹{selectedEmp.deductions.late.toFixed(2)}</span></div>}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span>Loan/Advance:</span>
                      {selectedEmp.is_finalized ? (
                        <span>₹{selectedEmp.deductions.advance.toFixed(2)}</span>
                      ) : (
                        <div className="flex items-center border border-red-300 rounded bg-white w-24">
                          <span className="px-2 text-gray-500">₹</span>
                          <input 
                            type="number" 
                            className="w-full outline-none py-1 text-right pr-2 text-red-900 font-semibold"
                            value={advanceOverride}
                            onChange={e => setAdvanceOverride(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    {!selectedEmp.is_finalized && (
                      <p className="text-[10px] text-red-600 opacity-80 leading-tight">
                        Standard deduction computed as ₹{selectedEmp.deductions.advance.toFixed(2)}. Edit to override.
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-red-200 mt-2">
                    <span>Total Deductions:</span> 
                    <span>₹{(selectedEmp.deductions.late + parseFloat(advanceOverride || '0')).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <span className="text-base font-semibold text-primary-800">Net Payable Amount</span>
              <span className="text-2xl font-bold text-primary-900">
                ₹{Math.max(0, selectedEmp.earnings.gross - selectedEmp.deductions.late - parseFloat(advanceOverride || '0')).toFixed(2)}
              </span>
            </div>

            {!selectedEmp.is_finalized && (
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-start gap-2 border border-blue-100">
                <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>Finalizing this slip will automatically generate a <strong>Salary Payable</strong> entry of <strong>₹{Math.max(0, selectedEmp.earnings.gross - selectedEmp.deductions.late - parseFloat(advanceOverride || '0')).toFixed(2)}</strong> in the employee's ledger. Active loans will also be reduced by the Advance deduction.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Close</Button>
              {!selectedEmp.is_finalized && (
                <Button onClick={handleFinalize}>
                  Finalize & Post to Ledger
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
