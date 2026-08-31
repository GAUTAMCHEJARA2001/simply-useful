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
  const { finalizePayroll, markSlipPaid } = useLedgerMutations();
  const { toast } = useToast();

  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [advanceOverride, setAdvanceOverride] = useState<string>('');

  const [paymentModalEmp, setPaymentModalEmp] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const filteredData = React.useMemo(() => {
    return payrollList.filter((emp: any) => {
      const matchesSearch = emp.labour_name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      if (filterType === 'ALL') return true;
      if (filterType === 'FIXED' && emp.employee_type !== 'FIXED') return false;
      if (filterType === 'VARIABLE' && emp.employee_type !== 'VARIABLE') return false;
      if (filterType === 'PENDING' && emp.is_finalized) return false;
      if (filterType === 'FINALIZED' && (!emp.is_finalized || emp.is_paid)) return false;
      if (filterType === 'PAID' && !emp.is_paid) return false;
      
      return true;
    });
  }, [payrollList, searchTerm, filterType]);

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

  const handleOpenPayment = (emp: any) => {
    setPaymentModalEmp(emp);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('CASH');
    setPaymentRef('');
    setPaymentRemark(`Salary Payment for ${month}`);
  };

  const handleConfirmPayment = async () => {
    if (!paymentModalEmp) return;
    try {
      await markSlipPaid({
        labour_id: paymentModalEmp.labour_id,
        month,
        amount: paymentModalEmp.net_pay,
        date: paymentDate,
        payment_mode: paymentMode,
        payment_reference: paymentRef,
        remark: paymentRemark
      });
      toast({ title: 'Success', description: 'Salary marked as paid' });
      setPaymentModalEmp(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-card border rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Select Month:</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="border-input border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
            
            <div className="h-6 w-px bg-border hidden sm:block"></div>
            
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Search Employee..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border-input border rounded-md px-3 py-1.5 text-sm w-48"
              />
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)}
                className="border-input border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                <option value="ALL">All Types</option>
                <option value="FIXED">Fixed</option>
                <option value="VARIABLE">Variable</option>
                <option value="PENDING">Pending Finalization</option>
                <option value="FINALIZED">Finalized (Unpaid)</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>

      <SafeDataView data={payrollList} isLoading={isLoading} error={error} onRetry={() => refetch()}>
        <Card>
          <div className="overflow-auto max-h-[calc(100vh-250px)] pb-4">
            <table className="w-full text-sm text-left min-w-max">
              <thead className="bg-muted text-muted-foreground border-b border-border sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                  <th className="px-4 py-3 font-semibold bg-emerald-50/50 text-emerald-800">Present Days</th>
                  <th className="px-4 py-3 font-semibold bg-emerald-50/50 text-emerald-800">Daily Wage</th>
                  <th className="px-4 py-3 font-semibold bg-emerald-50/50 text-emerald-800">Present Wages</th>
                  <th className="px-4 py-3 font-semibold bg-orange-50/50 text-orange-800">Half Day</th>
                  <th className="px-4 py-3 font-semibold bg-orange-50/50 text-orange-800">HD Wage (Rate)</th>
                  <th className="px-4 py-3 font-semibold bg-orange-50/50 text-orange-800">HD Wages Total</th>
                  <th className="px-4 py-3 font-semibold bg-green-50/50 text-green-800">Paid Leave</th>
                  <th className="px-4 py-3 font-semibold bg-green-50/50 text-green-800">PL Wage (Rate)</th>
                  <th className="px-4 py-3 font-semibold bg-green-50/50 text-green-800">PL Wages Total</th>
                  <th className="px-4 py-3 font-semibold bg-blue-50/50 text-blue-800">Bike (km)</th>
                  <th className="px-4 py-3 font-semibold bg-blue-50/50 text-blue-800">Bike Rate</th>
                  <th className="px-4 py-3 font-semibold bg-blue-50/50 text-blue-800">Bike Amt</th>
                  <th className="px-4 py-3 font-semibold bg-indigo-50/50 text-indigo-800">Car (km)</th>
                  <th className="px-4 py-3 font-semibold bg-indigo-50/50 text-indigo-800">Car Rate</th>
                  <th className="px-4 py-3 font-semibold bg-indigo-50/50 text-indigo-800">Car Amt</th>
                  <th className="px-4 py-3 font-semibold bg-purple-50/50 text-purple-800">OT (hrs)</th>
                  <th className="px-4 py-3 font-semibold bg-purple-50/50 text-purple-800">OT Rate</th>
                  <th className="px-4 py-3 font-semibold bg-purple-50/50 text-purple-800">OT Amt</th>
                  <th className="px-4 py-3 font-semibold bg-red-50/50 text-red-800">Late (hrs)</th>
                  <th className="px-4 py-3 font-semibold bg-red-50/50 text-red-800">Late Rate</th>
                  <th className="px-4 py-3 font-semibold bg-red-50/50 text-red-800">Late Amt</th>
                  <th className="px-4 py-3 font-semibold bg-yellow-50/50 text-yellow-800">Bags</th>
                  <th className="px-4 py-3 font-semibold bg-yellow-50/50 text-yellow-800">Bag Rate</th>
                  <th className="px-4 py-3 font-semibold bg-yellow-50/50 text-yellow-800">Bag Amt</th>
                  <th className="px-4 py-3 font-semibold">Payable Days</th>
                  <th className="px-4 py-3 font-semibold text-right">Gross Pay</th>
                  <th className="px-4 py-3 font-semibold text-right">Deductions</th>
                  <th className="px-4 py-3 font-semibold text-right">Net Pay</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.length === 0 ? (
                  <tr><td colSpan={27} className="px-4 py-8 text-center text-muted-foreground">No employees found</td></tr>
                ) : (
                  filteredData.map((emp: any) => (
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
                      <td className="px-4 py-3 bg-emerald-50/20 text-emerald-700">{emp.stats.present}</td>
                      <td className="px-4 py-3 bg-emerald-50/20 text-muted-foreground">₹{(emp.stats.daily_rate || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 bg-emerald-50/20 text-emerald-800 font-medium">₹{((emp.stats.present || 0) * (emp.stats.daily_rate || 0)).toFixed(2)}</td>
                      <td className="px-4 py-3 bg-orange-50/20 text-orange-700">{emp.stats.half_day}</td>
                      <td className="px-4 py-3 bg-orange-50/20 text-muted-foreground">₹{((emp.stats.daily_rate || 0) / 2).toFixed(2)}</td>
                      <td className="px-4 py-3 bg-orange-50/20 text-orange-800 font-medium">₹{((emp.stats.half_day || 0) * ((emp.stats.daily_rate || 0) / 2)).toFixed(2)}</td>
                      <td className="px-4 py-3 bg-green-50/20 text-green-700">{emp.stats.paid_leave_count || 0}</td>
                      <td className="px-4 py-3 bg-green-50/20 text-muted-foreground">₹{(emp.stats.daily_rate || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 bg-green-50/20 text-green-800 font-medium">₹{((emp.stats.paid_leave_count || 0) * (emp.stats.daily_rate || 0)).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground bg-blue-50/20">{emp.breakdown_data?.bike_km || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground bg-blue-50/20">₹{emp.breakdown_data?.bike_rate?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-blue-700 font-medium bg-blue-50/20">₹{((emp.breakdown_data?.bike_km || 0) * (emp.breakdown_data?.bike_rate || 0)).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground bg-indigo-50/20">{emp.breakdown_data?.car_km || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground bg-indigo-50/20">₹{emp.breakdown_data?.car_rate?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/20">₹{((emp.breakdown_data?.car_km || 0) * (emp.breakdown_data?.car_rate || 0)).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground bg-purple-50/20">{emp.stats.ot_hours || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground bg-purple-50/20">₹{emp.breakdown_data?.ot_rate?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-purple-700 font-medium bg-purple-50/20">₹{emp.earnings.ot_pay?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-red-500/80 bg-red-50/20">{emp.stats.late_hours || 0}</td>
                      <td className="px-4 py-3 text-red-500/80 bg-red-50/20">₹{emp.breakdown_data?.late_rate?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-red-600 font-medium bg-red-50/20">-₹{emp.deductions.late?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-muted-foreground bg-yellow-50/20">{emp.stats.bags || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground bg-yellow-50/20">₹{emp.breakdown_data?.bag_rate?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-yellow-700 font-medium bg-yellow-50/20">₹{((emp.stats.bags || 0) * (emp.breakdown_data?.bag_rate || 0)).toFixed(2)}</td>
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
                        {emp.is_paid ? (
                          <span className="inline-flex items-center text-emerald-700 bg-emerald-100 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-200 shadow-sm">
                            <CheckCircle className="w-3 h-3 mr-1" /> Paid
                          </span>
                        ) : emp.is_finalized ? (
                          <span className="inline-flex items-center text-blue-700 bg-blue-100 text-xs px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Finalized
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-yellow-700 bg-yellow-100 text-xs px-2 py-0.5 rounded-full font-semibold border border-yellow-200">
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
                          
                          {emp.is_finalized && (
                            emp.is_paid ? (
                              <span className="inline-flex items-center justify-center px-2 h-7 text-xs font-semibold text-green-700 bg-green-100 rounded-md border border-green-200">Paid</span>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" 
                                onClick={() => handleOpenPayment(emp)}
                              >
                                Pay Now
                              </Button>
                            )
                          )}
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

      <Modal isOpen={!!paymentModalEmp} onClose={() => setPaymentModalEmp(null)} title="Record Salary Payment">
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded text-sm">
            Paying <strong>{paymentModalEmp?.labour_name}</strong> for <strong>{month}</strong><br/>
            Net Pay: <strong>₹{paymentModalEmp?.net_pay.toFixed(2)}</strong>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Date</label>
            <input type="date" className="w-full border p-2 rounded" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Mode</label>
            <select className="w-full border p-2 rounded" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Ref / Txn ID</label>
            <input type="text" className="w-full border p-2 rounded" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="e.g. UTR Number (Optional)" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Remark</label>
            <input type="text" className="w-full border p-2 rounded" value={paymentRemark} onChange={e => setPaymentRemark(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPaymentModalEmp(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirmPayment}>Confirm Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
