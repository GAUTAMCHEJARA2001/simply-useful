import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Expense } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Receipt, IndianRupee, Car, Bike, Navigation, Layers, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { travelService } from '@/api/services/travel.service';

const categories = ['Travel', 'Food', 'Accommodation', 'Fuel', 'Phone', 'Other'];

const getTravelRate = (vehicle?: string) => {
  return (vehicle || '').toUpperCase() === 'BIKE' ? 3 : 8;
};

const ExpenseEntry: React.FC = () => {
  const { user } = useAuth();
  const { expenses, addExpense, updateExpense } = useData();
  const { toast } = useToast();
  const { filterBySelectedFY, fyLabel } = useFinancialYear();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Expense>({
    date: new Date().toISOString().split('T')[0],
    soEmail: user?.email || '',
    category: '',
    amount: 0,
    remarks: '',
    status: 'PENDING'
  });

  const [travelLogs, setTravelLogs] = useState<any[]>([]);
  const [loadingTravel, setLoadingTravel] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'travel' | 'bills'>('all');

  const roleUpper = (user?.role || '').toUpperCase();
  const isHr = ['SUPERADMIN', 'ADMIN', 'HR', 'DIRECTOR', 'VP'].includes(roleUpper) || !!(user as any)?.is_superuser;

  const fetchTravelClaims = async () => {
    try {
      setLoadingTravel(true);
      const res = isHr 
        ? await travelService.getHRLogs() 
        : await travelService.getMyHistory();
      const data = res.data?.data || res.data || [];
      setTravelLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load travel claims', err);
    } finally {
      setLoadingTravel(false);
    }
  };

  useEffect(() => {
    fetchTravelClaims();
  }, [isHr, user?.email]);

  // Normalize travel logs into expense structure
  const normalizedTravelClaims = useMemo(() => {
    return travelLogs.map(l => {
      const km = Number(l.approved_km !== null && l.approved_km !== undefined ? l.approved_km : (l.total_km || 0));
      const rate = Number(l.rate !== undefined && l.rate !== null ? l.rate : getTravelRate(l.vehicle_type));
      const calculatedAmt = Math.round(km * rate);
      const vehicle = (l.vehicle_type || 'CAR').toUpperCase();

      return {
        id: l.id,
        date: l.date || (l.createdAt ? String(l.createdAt).split('T')[0] : ''),
        soEmail: l.user_email || (l.user ? l.user.email : user?.email || ''),
        category: `Travel Allowance (${vehicle})`,
        amount: calculatedAmt,
        km,
        rate,
        vehicle,
        remarks: l.visit_summary || l.order_summary || l.so_notes || `${km} KM logged`,
        status: (l.status || 'PENDING').toUpperCase(),
        isTravelClaim: true,
        photo: l.end_photo || l.start_photo || null,
        rawLog: l
      };
    });
  }, [travelLogs, user?.email]);

  // Filter bills & travel claims by selected FY
  const billExpenses = useMemo(() => {
    const list = isHr ? expenses : expenses.filter(e => e.soEmail?.toLowerCase() === user?.email?.toLowerCase());
    return filterBySelectedFY(list, e => e.date).map(e => ({
      ...e,
      isTravelClaim: false
    }));
  }, [expenses, filterBySelectedFY, isHr, user?.email]);

  const travelExpenses = useMemo(() => {
    return filterBySelectedFY(normalizedTravelClaims, e => e.date);
  }, [normalizedTravelClaims, filterBySelectedFY]);

  const allCombinedExpenses = useMemo(() => {
    return [...billExpenses, ...travelExpenses].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });
  }, [billExpenses, travelExpenses]);

  // Tab filtering
  const displayedList = useMemo(() => {
    if (activeTab === 'travel') return travelExpenses;
    if (activeTab === 'bills') return billExpenses;
    return allCombinedExpenses;
  }, [activeTab, travelExpenses, billExpenses, allCombinedExpenses]);

  // KPI calculations
  const totalEntriesCount = allCombinedExpenses.length;
  const totalCombinedAmount = allCombinedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalTravelAmount = travelExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalBillAmount = billExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(p => ({ ...p, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!form.category || !form.amount) {
      toast({ title: 'Fill required fields', variant: 'destructive' });
      return;
    }
    
    if (form.id) {
      updateExpense(form.id, form);
      toast({ title: 'Expense Updated', description: 'Resubmitted for Approval' });
    } else {
      addExpense({ ...form, soEmail: user?.email || '' });
      toast({ title: 'Expense Submitted', description: `₹${form.amount} for ${form.category}` });
    }
    
    setDialogOpen(false);
    setForm({
      date: new Date().toISOString().split('T')[0],
      soEmail: user?.email || '',
      category: '',
      amount: 0,
      remarks: '',
      status: 'PENDING'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Expense Entry</h1>
          <p className="page-subheader">
            Submit travel expenses &amp; bills &middot; <span className="font-semibold text-primary">{fyLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTravelClaims} disabled={loadingTravel} className="h-9">
            <RefreshCw className={cn("w-4 h-4 mr-1.5", loadingTravel && "animate-spin")} /> Refresh
          </Button>
          <Button className="action-button h-9" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Bill / Receipt
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xl xl:text-2xl font-bold text-foreground">
            {totalEntriesCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Total Claims ({travelExpenses.length} Travel + {billExpenses.length} Bills)
          </p>
        </div>

        <div className="kpi-card">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-3">
            <IndianRupee className="w-5 h-5 text-success" />
          </div>
          <p className="text-xl xl:text-2xl font-bold text-foreground">
            ₹{totalCombinedAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Total Combined Amount
          </p>
        </div>

        <div className="kpi-card sm:col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
            <Navigation className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xl xl:text-2xl font-bold text-foreground">
            ₹{totalTravelAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Travel KM Allowance · {travelExpenses.reduce((s, t) => s + (t.km || 0), 0).toFixed(1)} KM logged
          </p>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 max-w-md">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all",
            activeTab === 'all' 
              ? "bg-background text-foreground shadow-xs border border-border/50" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All ({totalEntriesCount})
        </button>
        <button
          onClick={() => setActiveTab('travel')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
            activeTab === 'travel' 
              ? "bg-background text-foreground shadow-xs border border-border/50" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Car className="w-3.5 h-3.5 text-blue-600" />
          Travel Claims ({travelExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
            activeTab === 'bills' 
              ? "bg-background text-foreground shadow-xs border border-border/50" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
          Bills ({billExpenses.length})
        </button>
      </div>

      {/* Expenses & Claims List */}
      {displayedList.length === 0 ? (
        <Card className="rounded-2xl border border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-foreground text-sm">No expenses or travel claims in this view.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Daily travel trips recorded from the Travel section and submitted bills will automatically appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedList.map((e, i) => (
            <Card key={e.id || i} className="rounded-xl border border-border/60 hover:border-border transition-colors shadow-xs">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {e.isTravelClaim ? (
                          e.vehicle === 'BIKE' ? <Bike className="w-4 h-4 text-blue-600" /> : <Car className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Receipt className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>

                      <p className="font-semibold text-sm text-foreground">{e.category}</p>

                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider",
                        e.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                        e.status === 'REJECTED' ? "bg-destructive/10 text-destructive border-destructive/20" :
                        "bg-amber-500/10 text-amber-700 border-amber-500/20"
                      )}>
                        {e.status || 'PENDING'}
                      </span>

                      {e.isTravelClaim && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-500/20">
                          {e.km} KM @ ₹{e.rate}/KM
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{e.date}</strong>
                      {e.remarks ? ` · ${e.remarks}` : ''}
                    </p>

                    {isHr && e.soEmail && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <span>Submitted By:</span>
                        <strong className="text-foreground">{e.soEmail}</strong>
                      </p>
                    )}
                    
                    {e.rejectReason && (
                      <p className="text-xs text-destructive bg-destructive/5 p-1.5 rounded mt-1">
                        Reason: {e.rejectReason}
                      </p>
                    )}

                    {e.declaration && (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-1.5 rounded mt-1 border">
                        Declaration: {e.declaration}
                      </p>
                    )}

                    {e.status === 'REJECTED' && !e.isTravelClaim && e.soEmail?.toLowerCase() === user?.email?.toLowerCase() && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] mt-1 flex items-center gap-1" 
                        onClick={() => {
                          setForm({ ...e });
                          setDialogOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3" /> Resubmit / Declaration
                      </Button>
                    )}

                    {e.photo && (
                      <div 
                        className="mt-2 group relative w-16 h-16 border rounded-lg overflow-hidden cursor-pointer" 
                        onClick={() => window.open(e.photo, '_blank')}
                      >
                        <img src={e.photo} alt="Receipt / Odometer" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <span className="text-lg font-black text-foreground">
                      ₹{Number(e.amount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {e.isTravelClaim ? 'Travel Pay Claim' : 'Expense Claim'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Bill / Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setForm({
            date: new Date().toISOString().split('T')[0],
            soEmail: user?.email || '',
            category: '',
            amount: 0,
            remarks: '',
            status: 'PENDING'
          });
        }
      }}>
        <DialogContent className="max-w-lg" aria-describedby="expense-entry-desc">
          <DialogHeader>
            <DialogTitle>Add Bill / Expense Receipt</DialogTitle>
            <DialogDescription id="expense-entry-desc" className="sr-only">
              Enter details for your out-of-pocket expense claim, including category, amount, and receipt photo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input 
                type="number" 
                value={form.amount || ''} 
                onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} 
                placeholder="Enter amount in ₹"
              />
            </div>

            <div className="space-y-2">
              <Label>Remarks / Purpose</Label>
              <Textarea 
                value={form.remarks} 
                onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} 
                rows={2} 
                placeholder="Hotel stay, food with client, toll tax, etc."
              />
            </div>

            {form.id && (
              <div className="space-y-2">
                <Label className="text-destructive font-semibold">Declaration / Justification *</Label>
                <Textarea 
                  value={form.declaration || ''} 
                  onChange={e => setForm(p => ({ ...p, declaration: e.target.value }))} 
                  rows={3} 
                  placeholder="Explain why this expense is valid..." 
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Receipt / Photo Proof</Label>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
              {form.photo && (
                <div className="mt-2 w-20 h-20 border rounded-lg overflow-hidden">
                  <img src={form.photo} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Submit Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseEntry;
