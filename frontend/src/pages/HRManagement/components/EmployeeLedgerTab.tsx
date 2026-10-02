import React, { useState, useMemo, useEffect } from 'react';
import { 
  useHREmployees, 
  useEmployeeLedger, 
  useLedgerMutations, 
  useEmployeeLoans, 
  useLoanMutations,
  useSalarySlips
} from '@/hooks/hr/useHR';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  IndianRupee, 
  HandCoins, 
  Search, 
  Calendar, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Check, 
  Building2, 
  User, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  Receipt,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SalarySlipPdfModal } from '@/components/PDF/SalarySlipPdfModal';

const Currency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const EmployeeLedgerTab: React.FC = () => {
  const { data: employees = [] } = useHREmployees();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [hideNonSalaried, setHideNonSalaried] = useState(true);
  const [empSearch, setEmpSearch] = useState('');
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);

  // Filtered employees list for selection
  const availableEmployees = useMemo(() => {
    return employees.filter((e: any) => {
      if (hideNonSalaried && e.employee_type === 'NONE') return false;
      if (!empSearch.trim()) return true;
      const q = empSearch.toLowerCase().trim();
      return (
        (e.name || '').toLowerCase().includes(q) ||
        (e.employee_id || '').toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q)
      );
    });
  }, [employees, hideNonSalaried, empSearch]);

  // Auto-select first available employee if none selected
  useEffect(() => {
    if (!selectedEmpId && availableEmployees.length > 0) {
      setSelectedEmpId(String(availableEmployees[0].id));
    }
  }, [availableEmployees, selectedEmpId]);

  const selectedEmp = useMemo(() => {
    return employees.find((e: any) => String(e.id) === String(selectedEmpId)) || null;
  }, [employees, selectedEmpId]);

  // Ledger query
  const { data: ledgerData, isLoading: ledgerLoading } = useEmployeeLedger(selectedEmp?.id);
  // Loans query
  const { data: loans = [], isLoading: loansLoading } = useEmployeeLoans(selectedEmp?.id);

  // Mutations
  const { recordPayment } = useLedgerMutations();
  const { issueLoan, setOffLoan } = useLoanMutations();
  const { toast } = useToast();

  // Modals state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [setOffModalOpen, setSetOffModalOpen] = useState(false);
  const [detailsModal, setDetailsModal] = useState<any>(null);
  const [activeLoanForSetOff, setActiveLoanForSetOff] = useState<any>(null);

  // Salary Slips PDF state
  const { data: employeeSlips = [], isLoading: slipsLoading } = useSalarySlips(
    selectedEmp ? { labour_id: selectedEmp.id } : undefined
  );
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [defaultPdfMonth, setDefaultPdfMonth] = useState<string | undefined>(undefined);

  // Form states
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_mode: 'BANK_TRANSFER',
    payment_reference: '',
    description: 'Salary Payment'
  });

  const [loanForm, setLoanForm] = useState({
    amount: '',
    deduction_per_month: '',
    date_issued: new Date().toISOString().split('T')[0],
    payment_mode: 'BANK_TRANSFER',
    payment_reference: '',
    reason: 'Personal Advance / Loan'
  });

  const [setOffForm, setSetOffForm] = useState({
    set_off_amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_mode: 'CASH',
    payment_reference: '',
    notes: 'Manual Set-Off'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ADVANCE' | 'SALARY' | 'PAYMENT' | 'ADJUSTMENT'>('ALL');
  const [txSearch, setTxSearch] = useState('');

  // Filtered transactions
  const filteredLedger = useMemo(() => {
    const list = ledgerData?.ledger || [];
    return list.filter((tx: any) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (!txSearch.trim()) return true;
      const q = txSearch.toLowerCase().trim();
      return (
        (tx.date || '').toLowerCase().includes(q) ||
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.type || '').toLowerCase().includes(q) ||
        (tx.payment_reference || '').toLowerCase().includes(q) ||
        (tx.payment_mode || '').toLowerCase().includes(q)
      );
    });
  }, [ledgerData?.ledger, typeFilter, txSearch]);

  // Aggregate stats
  const stats = useMemo(() => {
    const list = ledgerData?.ledger || [];
    let totalAdvances = 0;
    let totalSalary = 0;
    let totalPayments = 0;

    list.forEach((tx: any) => {
      if (tx.type === 'ADVANCE') {
        totalAdvances += Math.abs(tx.amount || 0);
      } else if (tx.type === 'SALARY') {
        totalSalary += (tx.amount || 0);
      } else if (tx.type === 'PAYMENT') {
        totalPayments += Math.abs(tx.amount || 0);
      }
    });

    const activeLoansTotal = loans
      .filter((l: any) => l.is_active)
      .reduce((sum: number, l: any) => sum + (l.remaining_balance || 0), 0);

    return {
      totalAdvances,
      totalSalary,
      totalPayments,
      activeLoansTotal,
      currentBalance: ledgerData?.current_balance || 0
    };
  }, [ledgerData, loans]);

  // Submit Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const amt = parseFloat(paymentForm.amount);
    if (!amt || amt <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter an amount greater than 0', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      await recordPayment({
        labour_id: selectedEmp.id,
        amount: amt,
        date: paymentForm.date,
        payment_mode: paymentForm.payment_mode,
        payment_reference: paymentForm.payment_reference,
        description: paymentForm.description || 'Salary Payment'
      });
      setPaymentModalOpen(false);
      setPaymentForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_mode: 'BANK_TRANSFER',
        payment_reference: '',
        description: 'Salary Payment'
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Loan / Advance
  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const amt = parseFloat(loanForm.amount);
    if (!amt || amt <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a loan amount greater than 0', variant: 'destructive' });
      return;
    }

    const emi = parseFloat(loanForm.deduction_per_month) || amt;

    try {
      setIsSubmitting(true);
      await issueLoan({
        labour_id: selectedEmp.id,
        amount: amt,
        deduction_per_month: emi,
        date_issued: loanForm.date_issued,
        payment_mode: loanForm.payment_mode,
        payment_reference: loanForm.payment_reference,
        reason: loanForm.reason || 'Personal Advance / Loan'
      });
      setLoanModalOpen(false);
      setLoanForm({
        amount: '',
        deduction_per_month: '',
        date_issued: new Date().toISOString().split('T')[0],
        payment_mode: 'BANK_TRANSFER',
        payment_reference: '',
        reason: 'Personal Advance / Loan'
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Manual Set-Off
  const handleSaveSetOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoanForSetOff) return;
    const amt = parseFloat(setOffForm.set_off_amount);
    if (!amt || amt <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a set-off amount greater than 0', variant: 'destructive' });
      return;
    }
    if (amt > activeLoanForSetOff.remaining_balance) {
      toast({ title: 'Validation Error', description: `Amount cannot exceed current loan balance (${Currency(activeLoanForSetOff.remaining_balance)})`, variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      await setOffLoan({
        advance_id: activeLoanForSetOff.id,
        set_off_amount: amt,
        date: setOffForm.date,
        payment_mode: setOffForm.payment_mode,
        payment_reference: setOffForm.payment_reference,
        notes: setOffForm.notes || 'Manual Loan Set-Off',
        labour_id: selectedEmp?.id
      });
      setSetOffModalOpen(false);
      setActiveLoanForSetOff(null);
      setSetOffForm({
        set_off_amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_mode: 'CASH',
        payment_reference: '',
        notes: 'Manual Set-Off'
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSetOffModal = (loan: any) => {
    setActiveLoanForSetOff(loan);
    setSetOffForm({
      set_off_amount: String(loan.remaining_balance || ''),
      date: new Date().toISOString().split('T')[0],
      payment_mode: 'CASH',
      payment_reference: '',
      notes: `Set-off for Loan #${loan.id}`
    });
    setSetOffModalOpen(true);
  };

  return (
    <div className="space-y-6 w-full">
      {/* 1. TOP EMPLOYEE SELECTOR & ACTION BAR (Full Width) */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Employee Dropdown Selection */}
          <div className="flex-1 max-w-xl">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Select Employee
            </Label>
            <div className="relative">
              <div 
                className="w-full flex items-center justify-between p-2.5 bg-background border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors shadow-2xs"
                onClick={() => setEmpDropdownOpen(prev => !prev)}
              >
                {selectedEmp ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                      {selectedEmp.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        {selectedEmp.name}
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                          {selectedEmp.employee_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedEmp.designation || 'No Role'} {selectedEmp.employee_id ? `• ID: ${selectedEmp.employee_id}` : ''}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Select an employee to view ledger...</span>
                )}
                <div className="text-muted-foreground text-xs font-medium">Change ▼</div>
              </div>

              {/* Dropdown Menu */}
              {empDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-lg shadow-xl z-50 max-h-72 flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-border bg-muted/40">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search employee by name, ID, or role..."
                        value={empSearch}
                        onChange={e => setEmpSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto p-1 divide-y divide-border/40">
                    {availableEmployees.map((emp: any) => (
                      <div
                        key={emp.id}
                        className={cn(
                          "p-2.5 rounded-md cursor-pointer flex items-center justify-between text-xs transition-colors hover:bg-accent",
                          selectedEmp?.id === emp.id && "bg-primary/10 font-semibold"
                        )}
                        onClick={() => {
                          setSelectedEmpId(String(emp.id));
                          setEmpDropdownOpen(false);
                          setEmpSearch('');
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-[11px]">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-foreground">{emp.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {emp.designation || 'No Role'} {emp.employee_id ? `• ${emp.employee_id}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[9px] py-0 px-1">
                            {emp.employee_type}
                          </Badge>
                          {selectedEmp?.id === emp.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                    {availableEmployees.length === 0 && (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No matching employees found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="hideNone"
                checked={hideNonSalaried}
                onChange={e => setHideNonSalaried(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-primary cursor-pointer"
              />
              <label htmlFor="hideNone" className="text-xs text-muted-foreground cursor-pointer select-none">
                Exclude Non-Salaried (Org Chart / NONE) employees
              </label>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-center">
            <Button
              onClick={() => {
                setDefaultPdfMonth(undefined);
                setPdfModalOpen(true);
              }}
              disabled={!selectedEmp || (employeeSlips.length === 0 && !slipsLoading)}
              variant="outline"
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs font-medium"
            >
              <FileText className="w-4 h-4 text-primary" />
              Salary Slips ({employeeSlips.length})
            </Button>

            <Button
              onClick={() => setLoanModalOpen(true)}
              disabled={!selectedEmp}
              variant="outline"
              className="gap-2 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer shadow-2xs font-medium"
            >
              <HandCoins className="w-4 h-4 text-amber-600" />
              Issue Loan / Advance
            </Button>

            <Button
              onClick={() => setPaymentModalOpen(true)}
              disabled={!selectedEmp}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs font-semibold"
            >
              <IndianRupee className="w-4 h-4" />
              Record Payment
            </Button>
          </div>
        </div>
      </div>

      {!selectedEmp ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No Employee Selected</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            Please select an employee from the dropdown above to view their financial ledger, loan balances, and payment records.
          </p>
        </div>
      ) : (
        <>
          {/* 2. SUMMARY METRIC CARDS (Full Width 4-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Running Balance Card */}
            <Card className="border shadow-xs bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Current Ledger Balance</span>
                  <Receipt className="w-4 h-4 text-primary" />
                </div>
                <div className={cn(
                  "text-2xl font-black tracking-tight",
                  stats.currentBalance > 0 ? "text-emerald-600" : stats.currentBalance < 0 ? "text-red-600" : "text-foreground"
                )}>
                  {Currency(stats.currentBalance)}
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] font-bold py-0.5",
                    stats.currentBalance > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" :
                    stats.currentBalance < 0 ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" :
                    "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {stats.currentBalance > 0 ? "● Company Owes Employee" : stats.currentBalance < 0 ? "● Employee Owes Company" : "● Account Settled"}
                </Badge>
              </CardContent>
            </Card>

            {/* Active Loans & Advances */}
            <Card className="border shadow-xs bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Outstanding Loans / Adv.</span>
                  <HandCoins className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black tracking-tight text-amber-700 dark:text-amber-300">
                  {Currency(stats.activeLoansTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {loans.filter((l: any) => l.is_active).length} active loan/advance records
                </p>
              </CardContent>
            </Card>

            {/* Total Salary Credited */}
            <Card className="border shadow-xs bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Total Salary Credited</span>
                  <ArrowUpRight className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black tracking-tight text-blue-600">
                  {Currency(stats.totalSalary)}
                </div>
                <p className="text-xs text-muted-foreground">
                  All finalized salary payroll credits
                </p>
              </CardContent>
            </Card>

            {/* Total Payments Made */}
            <Card className="border shadow-xs bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Total Disbursed to Employee</span>
                  <ArrowDownLeft className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black tracking-tight text-purple-600">
                  {Currency(stats.totalPayments + stats.totalAdvances)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Payments: {Currency(stats.totalPayments)} • Adv: {Currency(stats.totalAdvances)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 3. ACTIVE LOANS & ADVANCES CARD SECTION */}
          {loans.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HandCoins className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-sm text-foreground">Loan & Long-term Advance Management</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {loans.length} Record{loans.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setLoanModalOpen(true)}
                  className="text-xs text-primary gap-1 h-7 cursor-pointer"
                >
                  + New Loan
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {loans.map((loan: any) => (
                  <div 
                    key={loan.id} 
                    className={cn(
                      "p-3.5 rounded-lg border text-xs space-y-2.5 transition-all bg-card/60",
                      loan.is_active ? "border-amber-500/30 hover:border-amber-500/60" : "border-border/60 opacity-75"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Loan #{loan.id}</span>
                      <Badge 
                        variant={loan.is_active ? "default" : "secondary"} 
                        className={cn(
                          "text-[9px] py-0 px-1.5",
                          loan.is_active ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {loan.is_active ? "Active" : "Settled"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">Principal:</span>
                        <span className="font-semibold text-foreground">{Currency(loan.amount)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Outstanding:</span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">{Currency(loan.remaining_balance)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Monthly EMI:</span>
                        <span className="font-medium text-foreground">{Currency(loan.deduction_per_month)}/mo</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Issued Date:</span>
                        <span className="font-medium text-foreground">{loan.date_issued}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Repaid: {Currency(loan.repaid_amount)}</span>
                        <span>{loan.repaid_pct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-1.5 rounded-full transition-all" 
                          style={{ width: `${Math.min(100, loan.repaid_pct)}%` }} 
                        />
                      </div>
                    </div>

                    {loan.is_active && (
                      <div className="pt-1 flex justify-end">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openSetOffModal(loan)}
                          className="text-[11px] h-7 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer gap-1"
                        >
                          <RotateCcw className="w-3 h-3 text-emerald-600" />
                          Set Off Manually
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. FULL-WIDTH LEDGER TRANSACTIONS TABLE */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Transaction Ledger</h3>
                <p className="text-xs text-muted-foreground">
                  Complete history of salary credits, daily attendance advances, loan disbursements, and payment receipts.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search ledger..."
                    value={txSearch}
                    onChange={e => setTxSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border text-xs">
                  {(['ALL', 'ADVANCE', 'SALARY', 'PAYMENT', 'ADJUSTMENT'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setTypeFilter(tab)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                        typeFilter === tab ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase() + 's'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-border/80 rounded-lg overflow-x-auto bg-background">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Particulars / Description</th>
                    <th className="py-3 px-4 text-right text-red-600 dark:text-red-400">Debit (-)</th>
                    <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">Credit (+)</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {ledgerLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading transaction ledger...
                      </td>
                    </tr>
                  ) : filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No transactions found for this employee.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((tx: any) => (
                      <tr 
                        key={tx.id} 
                        onClick={() => setDetailsModal(tx)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono whitespace-nowrap text-muted-foreground">
                          {tx.date}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] font-bold py-0.5 px-2",
                                tx.type === 'ADVANCE' && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                tx.type === 'SALARY' && "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
                                tx.type === 'PAYMENT' && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                tx.type === 'ADJUSTMENT' && "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                              )}
                            >
                              {tx.type}
                            </Badge>
                            {tx.type === 'SALARY' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const m = tx.date ? tx.date.slice(0, 7) : undefined;
                                  setDefaultPdfMonth(m);
                                  setPdfModalOpen(true);
                                }}
                                className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10 gap-1 font-semibold cursor-pointer"
                                title="Download Payslip PDF"
                              >
                                <FileText className="w-3 h-3" /> Slip
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{tx.description}</div>
                          {(tx.payment_mode || tx.payment_reference) && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              {tx.payment_mode && (
                                <span className="bg-muted px-1.5 py-0.2 rounded font-mono text-[10px]">
                                  {tx.payment_mode}
                                </span>
                              )}
                              {tx.payment_reference && (
                                <span>Ref: {tx.payment_reference}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                          {tx.amount < 0 ? Currency(Math.abs(tx.amount)) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {tx.amount > 0 ? Currency(tx.amount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground whitespace-nowrap">
                          {Currency(tx.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 5. RECORD PAYMENT MODAL */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
              Record Payment to {selectedEmp?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePayment} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Date *</Label>
                <Input
                  type="date"
                  required
                  value={paymentForm.date}
                  onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Payment Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 15000"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mode of Payment</Label>
                <select
                  value={paymentForm.payment_mode}
                  onChange={e => setPaymentForm(p => ({ ...p, payment_mode: e.target.value }))}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Reference Number</Label>
                <Input
                  placeholder="UTR No / Cheque No / Trans ID"
                  value={paymentForm.payment_reference}
                  onChange={e => setPaymentForm(p => ({ ...p, payment_reference: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description / Particulars</Label>
              <Input
                placeholder="e.g. Salary Payment for September 2026"
                value={paymentForm.description}
                onChange={e => setPaymentForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                {isSubmitting ? 'Saving...' : 'Save Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. ISSUE LOAN / ADVANCE MODAL */}
      <Dialog open={loanModalOpen} onOpenChange={setLoanModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-amber-600" />
              Issue Loan / Salary Advance to {selectedEmp?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLoan} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date Issued *</Label>
                <Input
                  type="date"
                  required
                  value={loanForm.date_issued}
                  onChange={e => setLoanForm(p => ({ ...p, date_issued: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Loan Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 10000"
                  value={loanForm.amount}
                  onChange={e => setLoanForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Monthly EMI / Deduction (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 2000 (Defaults to full amount)"
                  value={loanForm.deduction_per_month}
                  onChange={e => setLoanForm(p => ({ ...p, deduction_per_month: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Disbursement Mode</Label>
                <select
                  value={loanForm.payment_mode}
                  onChange={e => setLoanForm(p => ({ ...p, payment_mode: e.target.value }))}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Payment Reference (Optional)</Label>
              <Input
                placeholder="Cheque No / UTR / Transaction ID"
                value={loanForm.payment_reference}
                onChange={e => setLoanForm(p => ({ ...p, payment_reference: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Purpose / Reason</Label>
              <Input
                placeholder="e.g. Festival Advance, Medical Loan, Bike Repair"
                value={loanForm.reason}
                onChange={e => setLoanForm(p => ({ ...p, reason: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setLoanModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                {isSubmitting ? 'Issuing...' : 'Issue Loan & Post to Ledger'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. MANUAL LOAN SET-OFF MODAL */}
      <Dialog open={setOffModalOpen} onOpenChange={setSetOffModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
              Manual Loan Set-Off / Repayment
            </DialogTitle>
          </DialogHeader>

          {activeLoanForSetOff && (
            <form onSubmit={handleSaveSetOff} className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/60 border border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan Record:</span>
                  <span className="font-bold">Loan #{activeLoanForSetOff.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Principal:</span>
                  <span>{Currency(activeLoanForSetOff.amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-700 dark:text-amber-300">
                  <span>Current Outstanding:</span>
                  <span>{Currency(activeLoanForSetOff.remaining_balance)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Set-Off Date *</Label>
                  <Input
                    type="date"
                    required
                    value={setOffForm.date}
                    onChange={e => setSetOffForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Amount (₹) *</Label>
                    <button
                      type="button"
                      onClick={() => setSetOffForm(p => ({ ...p, set_off_amount: String(activeLoanForSetOff.remaining_balance) }))}
                      className="text-[10px] text-primary hover:underline cursor-pointer"
                    >
                      Set Full
                    </button>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={activeLoanForSetOff.remaining_balance}
                    required
                    placeholder={`Max ${activeLoanForSetOff.remaining_balance}`}
                    value={setOffForm.set_off_amount}
                    onChange={e => setSetOffForm(p => ({ ...p, set_off_amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Repayment Mode</Label>
                  <select
                    value={setOffForm.payment_mode}
                    onChange={e => setSetOffForm(p => ({ ...p, payment_mode: e.target.value }))}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                  >
                    <option value="CASH">Cash Repaid by Employee</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="BANK_TRANSFER">Bank Deposit</option>
                    <option value="SALARY_DEDUCTION">Salary Deduction Adjustment</option>
                    <option value="WAIVER">Waiver / Company Relief</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Reference No</Label>
                  <Input
                    placeholder="Receipt / Voucher No"
                    value={setOffForm.payment_reference}
                    onChange={e => setSetOffForm(p => ({ ...p, payment_reference: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Reason / Remarks</Label>
                <Input
                  placeholder="e.g. Employee repaid advance in cash"
                  value={setOffForm.notes}
                  onChange={e => setSetOffForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setSetOffModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  {isSubmitting ? 'Recording...' : 'Confirm Set-Off'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 8. TRANSACTION DETAILS MODAL */}
      <Dialog open={!!detailsModal} onOpenChange={open => !open && setDetailsModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>

          {detailsModal && (
            <div className="space-y-3 py-2 text-xs divide-y divide-border/60">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono">{detailsModal.id}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-semibold">{detailsModal.date}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {detailsModal.type}
                </Badge>
              </div>
              <div className="flex flex-col py-1.5 gap-1">
                <span className="text-muted-foreground">Particulars:</span>
                <span className="text-foreground font-medium bg-muted/40 p-2 rounded">
                  {detailsModal.description}
                </span>
              </div>
              {detailsModal.payment_mode && (
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <span className="font-semibold">{detailsModal.payment_mode}</span>
                </div>
              )}
              {detailsModal.payment_reference && (
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Reference / Slip No:</span>
                  <span className="font-mono">{detailsModal.payment_reference}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Amount:</span>
                <span className={cn(
                  "font-bold text-sm",
                  detailsModal.amount < 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  {detailsModal.amount < 0 ? `${Currency(Math.abs(detailsModal.amount))} (Debit)` : `${Currency(detailsModal.amount)} (Credit)`}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm">
                <span>Running Balance After Tx:</span>
                <span className={detailsModal.balance < 0 ? "text-red-600" : "text-emerald-600"}>
                  {Currency(detailsModal.balance)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Salary Slip PDF Modal */}
      <SalarySlipPdfModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        slips={employeeSlips}
        defaultSelectedMonth={defaultPdfMonth}
        title={selectedEmp ? `Salary Slips — ${selectedEmp.name}` : 'Salary Slips'}
      />
    </div>
  );
};

export default EmployeeLedgerTab;
