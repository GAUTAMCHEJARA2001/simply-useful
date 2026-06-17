import React, { useState } from 'react';
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
import { Plus, Receipt, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

const categories = ['Travel', 'Food', 'Accommodation', 'Fuel', 'Phone', 'Other'];

const ExpenseEntry: React.FC = () => {
  const { user } = useAuth();
  const { expenses, addExpense, updateExpenseStatus, updateExpense } = useData();
  const { toast } = useToast();
  const { filterBySelectedFY, fyLabel } = useFinancialYear();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Expense>({ date: new Date().toISOString().split('T')[0], soEmail: user?.email || '', category: '', amount: 0, remarks: '', status: 'PENDING' });

  const isHr = user?.role === 'HR' || user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
  
  const displayExpenses = filterBySelectedFY(expenses, e => e.date);
  const myExpenses = displayExpenses; // Keep for KPIs items counts
  const totalExpense = myExpenses.reduce((s, e) => s + e.amount, 0);

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
      toast({ title: 'Fill required fields', variant: 'destructive' }); return;
    }
    
    if (form.id) {
       updateExpense(form.id, form);
       toast({ title: 'Expense Updated', description: 'Resubmitted to HR for Approval' });
    } else {
       addExpense({ ...form, soEmail: user?.email || '' });
       toast({ title: 'Expense Submitted', description: `₹${form.amount} for ${form.category}` });
    }
    
    setDialogOpen(false);
    setForm({ date: new Date().toISOString().split('T')[0], soEmail: user?.email || '', category: '', amount: 0, remarks: '', status: 'PENDING' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Expense Entry</h1>
          <p className="page-subheader">Submit travel expenses &middot; <span className="font-semibold text-primary">{fyLabel}</span></p>
        </div>
        <Button className="action-button" onClick={() => setDialogOpen(true)}><Plus className="w-5 h-5 mr-2" /> Add Expense</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="kpi-card">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xl xl:text-2xl font-bold text-foreground truncate" title={String(myExpenses.length)}>{myExpenses.length}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate" title="Total Entries">Total Entries</p>
        </div>
        <div className="kpi-card">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-3">
            <IndianRupee className="w-5 h-5 text-success" />
          </div>
          <p className="text-xl xl:text-2xl font-bold text-foreground truncate" title={`₹${totalExpense.toLocaleString()}`}>₹{totalExpense.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate" title="Total Amount">Total Amount</p>
        </div>
      </div>

      {displayExpenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No expenses submitted yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayExpenses.map((e, i) => (
            <Card key={e.id || i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <p className="font-semibold text-sm">{e.category}</p>
                       <span className={cn(
                         "text-[10px] px-1.5 py-0.5 rounded-full font-medium border",
                         e.status === 'APPROVED' ? "bg-success/10 text-success border-success/20" :
                         e.status === 'REJECTED' ? "bg-destructive/10 text-destructive border-destructive/20" :
                         "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                       )}>
                         {e.status || 'PENDING'}
                       </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{e.date}{e.remarks ? ` · ${e.remarks}` : ''}</p>
                    {isHr && <p className="text-[10px] text-muted-foreground">Officer: {e.soEmail}</p>}
                    
                    {e.rejectReason && (
                      <p className="text-xs text-destructive bg-destructive/5 p-1.5 rounded mt-1">Reason: {e.rejectReason}</p>
                    )}
                    {e.declaration && (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-1.5 rounded mt-1 border">Declaration: {e.declaration}</p>
                    )}
                    {e.status === 'REJECTED' && e.soEmail?.toLowerCase() === user?.email?.toLowerCase() && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] mt-1 flex items-center gap-1" onClick={() => {
                         setForm({ ...e });
                         setDialogOpen(true);
                      }}><Plus className="w-3 h-3"/> Resubmit / Declaration</Button>
                    )}

                    {e.photo && (
                      <div className="mt-2 group relative w-16 h-16 border rounded-lg overflow-hidden cursor-pointer" onClick={() => window.open(e.photo, '_blank')}>
                         <img src={e.photo} alt="Receipt" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-primary">₹{e.amount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setForm({ date: new Date().toISOString().split('T')[0], soEmail: user?.email || '', category: '', amount: 0, remarks: '', status: 'PENDING' });
      }}>
        <DialogContent className="max-w-lg" aria-describedby="expense-entry-desc">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription id="expense-entry-desc" className="sr-only">
              Enter details for your new travel or out-of-pocket expense, including category, amount, and receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
             <div className="space-y-2"><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} rows={2} /></div>
             {form.id && (
               <div className="space-y-2">
                 <Label className="text-destructive font-semibold">Declaration / Justification *</Label>
                 <Textarea value={form.declaration || ''} onChange={e => setForm(p => ({ ...p, declaration: e.target.value }))} rows={3} placeholder="Explain why this expense is valid..." />
               </div>
             )}
             <div className="space-y-2">
              <Label>Receipt / Photo</Label>
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
