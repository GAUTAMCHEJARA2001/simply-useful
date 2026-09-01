import React, { useState } from 'react';
import { useHREmployees, useEmployeeLedger, useLedgerMutations } from '@/hooks/hr/useHR';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { IndianRupee } from 'lucide-react';

const Currency = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const EmployeeLedgerTab: React.FC = () => {
  const { data: employees = [] } = useHREmployees();
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredEmployees = React.useMemo(() => {
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter((e: any) => e.name.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q));
  }, [employees, searchQuery]);

  const { data: ledgerData, isLoading } = useEmployeeLedger(selectedEmp?.id);
  const { recordPayment } = useLedgerMutations();
  
  const [paymentModal, setPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDesc, setPayDesc] = useState('Salary Payment');
  
  const [detailsModal, setDetailsModal] = useState<any>(null);
  
  const handlePayment = async () => {
    if (!selectedEmp) return;
    if (payAmount <= 0) return alert('Amount must be > 0');
    
    await recordPayment({
      labour_id: selectedEmp.id,
      amount: payAmount,
      description: payDesc
    });
    setPaymentModal(false);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sidebar Employee List */}
        <div className="w-full sm:w-1/3 sm:border-r border-border sm:pr-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-background z-10 pb-2">
            <h2 className="font-bold mb-2">Select Employee</h2>
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full p-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div className="space-y-2">
            {filteredEmployees.map((emp: any) => (
            <div 
              key={emp.id} 
              className={`p-3 rounded-lg cursor-pointer border ${selectedEmp?.id === emp.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-accent'}`}
              onClick={() => setSelectedEmp(emp)}
            >
              <div className="font-medium">{emp.name}</div>
              <div className="text-xs text-muted-foreground">{emp.employee_type} | {emp.designation || 'No Role'}</div>
            </div>
            ))}
            {filteredEmployees.length === 0 && <div className="text-sm text-muted-foreground p-2">No employees found.</div>}
          </div>
        </div>
        
        {/* Ledger View */}
        <div className="w-full sm:w-2/3 sm:pl-4">
          {!selectedEmp ? (
            <div className="text-center text-muted-foreground py-12">Select an employee to view ledger</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
                <div>
                  <h2 className="text-xl font-bold">{selectedEmp.name} - Ledger</h2>
                  <p className="text-sm text-muted-foreground">Running Balance: <span className={`font-bold ${ledgerData?.current_balance > 0 ? 'text-green-600' : ledgerData?.current_balance < 0 ? 'text-red-600' : ''}`}>{Currency(ledgerData?.current_balance || 0)}</span> {ledgerData?.current_balance > 0 ? '(Company Owes)' : ledgerData?.current_balance < 0 ? '(Employee Owes)' : ''}</p>
                </div>
                
                <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white"><IndianRupee className="w-4 h-4" /> Record Payment</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Record Payment to {selectedEmp.name}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium">Payment Amount (₹)</label>
                        <input type="number" className="w-full border p-2 rounded mt-1" value={payAmount || ''} onChange={e => setPayAmount(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <input type="text" className="w-full border p-2 rounded mt-1" value={payDesc} onChange={e => setPayDesc(e.target.value)} />
                      </div>
                      <Button className="w-full" onClick={handlePayment}>Save Payment</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left border-b border-border">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Particulars</th>
                      <th className="p-3 text-right text-red-600">Debit (-)</th>
                      <th className="p-3 text-right text-green-600">Credit (+)</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={6} className="text-center p-4">Loading...</td></tr>
                    ) : ledgerData?.ledger?.length === 0 ? (
                      <tr><td colSpan={6} className="text-center p-4 text-muted-foreground">No transactions found</td></tr>
                    ) : (
                      ledgerData?.ledger?.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-border hover:bg-accent/50 cursor-pointer" onClick={() => setDetailsModal(tx)}>
                          <td className="p-3 whitespace-nowrap">{tx.date}</td>
                          <td className="p-3"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{tx.type}</span></td>
                          <td className="p-3">{tx.description}</td>
                          <td className="p-3 text-right text-red-600">{tx.amount < 0 ? Currency(Math.abs(tx.amount)) : '-'}</td>
                          <td className="p-3 text-right text-green-600">{tx.amount > 0 ? Currency(tx.amount) : '-'}</td>
                          <td className="p-3 text-right font-medium">{Currency(tx.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Transaction Details Modal */}
              <Dialog open={!!detailsModal} onOpenChange={(open) => !open && setDetailsModal(null)}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Transaction Details</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4 text-sm">
                    <div className="flex justify-between border-b border-border pb-2"><span className="font-medium text-muted-foreground">Date:</span> <span>{detailsModal?.date}</span></div>
                    <div className="flex justify-between border-b border-border pb-2"><span className="font-medium text-muted-foreground">Type:</span> <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">{detailsModal?.type}</span></div>
                    <div className="flex flex-col border-b border-border pb-2"><span className="font-medium text-muted-foreground mb-1">Particulars:</span> <span className="text-foreground whitespace-pre-wrap">{detailsModal?.description}</span></div>
                    <div className="flex justify-between border-b border-border pb-2"><span className="font-medium text-muted-foreground">Amount:</span> <span className={detailsModal?.amount < 0 ? 'text-red-600' : 'text-green-600'}>{detailsModal?.amount < 0 ? Currency(Math.abs(detailsModal?.amount)) + ' (Debit)' : Currency(detailsModal?.amount) + ' (Credit)'}</span></div>
                    <div className="flex justify-between"><span className="font-medium text-muted-foreground">Running Balance:</span> <span className="font-bold">{Currency(detailsModal?.balance)}</span></div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
