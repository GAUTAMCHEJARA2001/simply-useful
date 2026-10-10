import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Receipt, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  RefreshCw, 
  FileText, 
  IndianRupee, 
  AlertTriangle,
  User as UserIcon,
  Calendar,
  CheckCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { Expense } from '@/types';

export const ExpenseApprovalsTab: React.FC = () => {
  const { expenses = [], users = [], updateExpenseStatus, refreshAll } = useData();
  const { toast } = useToast();

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{ id: string; employee: string; amount: number } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  
  // Single/batch processing loaders
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Lightbox for bill/receipt image
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Receipt Preview');

  // Categories list derived from expenses
  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [expenses]);

  // Distinct employees from expenses & users
  const employeesList = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(u => {
      if (u.email) map.set(u.email.toLowerCase(), u.name || u.email);
    });
    expenses.forEach(e => {
      const email = (e.so_email || e.soEmail || '').toLowerCase();
      if (email && !map.has(email)) {
        map.set(email, email);
      }
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [users, expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const eStatus = (e.status || 'PENDING').toUpperCase();
      if (statusFilter !== 'ALL' && eStatus !== statusFilter) return false;

      if (selectedMonth && selectedMonth !== 'ALL') {
        const eDate = e.date || '';
        if (!eDate.startsWith(selectedMonth)) return false;
      }

      const eEmail = (e.so_email || e.soEmail || '').toLowerCase();
      if (selectedEmployee !== 'ALL' && eEmail !== selectedEmployee.toLowerCase()) {
        return false;
      }

      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRemarks = (e.remarks || '').toLowerCase().includes(q);
        const matchesEmail = eEmail.includes(q);
        const matchesCat = (e.category || '').toLowerCase().includes(q);
        const matchesAmt = String(e.amount || '').includes(q);
        if (!matchesRemarks && !matchesEmail && !matchesCat && !matchesAmt) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [expenses, statusFilter, selectedMonth, selectedEmployee, selectedCategory, searchQuery]);

  // KPI calculations
  const kpiData = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let approvedCount = 0;
    let approvedAmount = 0;
    let rejectedCount = 0;
    let rejectedAmount = 0;

    expenses.forEach(e => {
      const eDate = e.date || '';
      if (selectedMonth && selectedMonth !== 'ALL' && !eDate.startsWith(selectedMonth)) {
        return;
      }
      const st = (e.status || 'PENDING').toUpperCase();
      const amt = Number(e.amount || 0);

      if (st === 'APPROVED') {
        approvedCount++;
        approvedAmount += amt;
      } else if (st === 'REJECTED') {
        rejectedCount++;
        rejectedAmount += amt;
      } else {
        pendingCount++;
        pendingAmount += amt;
      }
    });

    return {
      pendingCount,
      pendingAmount,
      approvedCount,
      approvedAmount,
      rejectedCount,
      rejectedAmount,
      totalCount: pendingCount + approvedCount + rejectedCount,
      totalAmount: pendingAmount + approvedAmount + rejectedAmount
    };
  }, [expenses, selectedMonth]);

  // Approve single expense
  const handleApprove = async (expense: Expense) => {
    if (!expense.id) return;
    try {
      setActionLoadingId(expense.id);
      await updateExpenseStatus(expense.id, 'APPROVED');
      toast({
        title: 'Expense Claim Approved',
        description: `₹${Number(expense.amount).toLocaleString()} for ${expense.so_email || expense.soEmail || 'staff'} approved and ready for payroll sync.`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to approve expense',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject single expense
  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    try {
      setActionLoadingId(rejectModal.id);
      await updateExpenseStatus(rejectModal.id, 'REJECTED', rejectionReason.trim());
      toast({
        title: 'Expense Claim Rejected',
        description: `Claim for ₹${Number(rejectModal.amount).toLocaleString()} was marked as rejected.`,
      });
      setRejectModal(null);
      setRejectionReason('');
    } catch (err: any) {
      toast({
        title: 'Failed to reject expense',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Batch approve all currently filtered pending claims
  const handleBatchApprovePending = async () => {
    const pendingList = filteredExpenses.filter(e => (!e.status || e.status.toUpperCase() === 'PENDING') && e.id);
    if (pendingList.length === 0) return;

    if (!window.confirm(`Are you sure you want to approve all ${pendingList.length} filtered pending claims?`)) {
      return;
    }

    setBatchLoading(true);
    let successCount = 0;
    try {
      for (const item of pendingList) {
        if (item.id) {
          await updateExpenseStatus(item.id, 'APPROVED');
          successCount++;
        }
      }
      toast({
        title: 'Batch Approval Complete',
        description: `Successfully approved ${successCount} expense claims.`,
      });
    } catch (err: any) {
      toast({
        title: 'Partial Batch Failure',
        description: `Approved ${successCount} before encountering an error.`,
        variant: 'destructive',
      });
    } finally {
      setBatchLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const st = (status || 'PENDING').toUpperCase();
    if (st === 'APPROVED') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold text-xs flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </Badge>
      );
    }
    if (st === 'REJECTED') {
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold text-xs flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Rejected
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold text-xs flex items-center gap-1 animate-pulse">
        <Clock className="w-3 h-3" /> Pending Review
      </Badge>
    );
  };

  const pendingFilteredCount = filteredExpenses.filter(e => (!e.status || e.status.toUpperCase() === 'PENDING')).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Spend & Bill Expense Approvals
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verify, approve, or reject employee bill claims. Approved expenses automatically flow into monthly payroll.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingFilteredCount > 1 && (
            <Button
              size="sm"
              variant="default"
              disabled={batchLoading}
              onClick={handleBatchApprovePending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 flex items-center gap-1.5 shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              {batchLoading ? 'Approving...' : `Approve All Pending (${pendingFilteredCount})`}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshAll(true)}
            className="text-xs h-9 flex items-center gap-1.5"
            title="Refresh expenses"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm bg-card hover:border-amber-500/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Review</p>
              <p className="text-lg font-bold text-foreground">
                {kpiData.pendingCount} <span className="text-xs font-normal text-muted-foreground">claims</span>
              </p>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                ₹{kpiData.pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved Total</p>
              <p className="text-lg font-bold text-foreground">
                {kpiData.approvedCount} <span className="text-xs font-normal text-muted-foreground">claims</span>
              </p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ₹{kpiData.approvedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card hover:border-rose-500/40 transition-colors">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejected Total</p>
              <p className="text-lg font-bold text-foreground">
                {kpiData.rejectedCount} <span className="text-xs font-normal text-muted-foreground">claims</span>
              </p>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                ₹{kpiData.rejectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Claims</p>
              <p className="text-lg font-bold text-foreground">
                {kpiData.totalCount} <span className="text-xs font-normal text-muted-foreground">claims</span>
              </p>
              <p className="text-xs font-semibold text-primary">
                ₹{kpiData.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full text-xs h-9 px-3 rounded-lg border border-input bg-background font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">All Statuses ({kpiData.totalCount})</option>
                <option value="PENDING">Pending Review ({kpiData.pendingCount})</option>
                <option value="APPROVED">Approved ({kpiData.approvedCount})</option>
                <option value="REJECTED">Rejected ({kpiData.rejectedCount})</option>
              </select>
            </div>

            {/* Month Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Month</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="month"
                  value={selectedMonth === 'ALL' ? '' : selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value || 'ALL')}
                  className="w-full text-xs h-9 px-3 rounded-lg border border-input bg-background font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {selectedMonth !== 'ALL' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedMonth('ALL')}
                    className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="View All Months"
                  >
                    All
                  </Button>
                )}
              </div>
            </div>

            {/* Employee Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Employee / SO</label>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="w-full text-xs h-9 px-3 rounded-lg border border-input bg-background font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">All Employees</option>
                {employeesList.map(emp => (
                  <option key={emp.email} value={emp.email}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Category</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full text-xs h-9 px-3 rounded-lg border border-input bg-background font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">Search</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search claims..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs h-9 pl-8 pr-3 rounded-lg border border-input bg-background font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Expense Claims Table */}
      <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
        <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Expense Claims ({filteredExpenses.length})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Review and act on expense claims. Receipts can be previewed, rotated, and zoomed.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Staff / Employee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredExpenses.map(expense => {
                  const isProcessing = actionLoadingId === expense.id;
                  const st = (expense.status || 'PENDING').toUpperCase();
                  const empName = users.find(u => u.email?.toLowerCase() === (expense.so_email || expense.soEmail || '').toLowerCase())?.name || (expense.so_email || expense.soEmail || 'Employee');
                  const photoUrl = expense.photo || (expense as any).receipt || (expense as any).bill_image;

                  return (
                    <tr 
                      key={expense.id || `${expense.date}-${expense.amount}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{expense.date || '—'}</span>
                        </div>
                      </td>

                      {/* Staff */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {empName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[160px]">{empName}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{expense.so_email || expense.soEmail || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-secondary text-secondary-foreground border border-border/80">
                          {expense.category || 'General'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-sm text-foreground">
                        ₹{Number(expense.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* Receipt */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {photoUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImage(photoUrl);
                              setPreviewTitle(`Receipt - ${expense.category || 'Expense'} (₹${Number(expense.amount).toLocaleString()})`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Bill
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic">No Bill</span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4 max-w-[240px]">
                        <p className="text-xs text-foreground truncate" title={expense.remarks || ''}>
                          {expense.remarks || <span className="text-muted-foreground italic">No remarks</span>}
                        </p>
                        {(expense.reject_reason || (expense as any).rejectReason) && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Reason: {expense.reject_reason || (expense as any).rejectReason}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(expense.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {st !== 'APPROVED' && (
                            <Button
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleApprove(expense)}
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {st === 'REJECTED' ? 'Re-Approve' : 'Approve'}
                            </Button>
                          )}

                          {st !== 'REJECTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => {
                                setRejectModal({
                                  id: expense.id!,
                                  employee: empName,
                                  amount: Number(expense.amount || 0)
                                });
                                setRejectionReason('');
                              }}
                              className="h-7 px-2.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 font-semibold flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No expense claims match current filters</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Try changing the month, employee, or status filter.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Reason Modal Dialog */}
      <Dialog open={!!rejectModal} onOpenChange={open => { if (!open) setRejectModal(null); }}>
        <DialogContent className="max-w-md bg-card border-border shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" /> Reject Expense Claim
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide a reason for rejecting this claim of <span className="font-semibold text-foreground">₹{rejectModal?.amount.toLocaleString()}</span> for <span className="font-semibold text-foreground">{rejectModal?.employee}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Rejection Reason</Label>
              <Textarea
                placeholder="e.g., Incomplete receipt, unapproved expense type, duplicate bill..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="text-xs h-24"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModal(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoadingId === rejectModal?.id}
              onClick={handleRejectConfirm}
              className="text-xs font-semibold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Receipt Image Viewer */}
      <ImageViewerModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage}
        title={previewTitle}
      />
    </div>
  );
};
