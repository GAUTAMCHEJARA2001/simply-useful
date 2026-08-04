import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { paymentService } from '@/api/services/payment.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, ChevronsUpDown, Plus, Eye } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { PaymentReceipt } from '@/types';

const SubmitPaymentPage: React.FC = () => {
  const { dealers, distributors } = useData();
  const { toast } = useToast();

  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [partyType, setPartyType] = useState<'Dealer' | 'Distributor'>('Dealer');
  const [selectedParty, setSelectedParty] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [remarks, setRemarks] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openPartyCombobox, setOpenPartyCombobox] = useState(false);

  const parties = useMemo(() => {
    const rawList = partyType === 'Dealer' 
      ? dealers.filter(d => d.active).map(d => ({ id: d.dealerCode || d.dealerName, name: d.dealerName }))
      : distributors.filter(d => d.active).map(d => ({ id: d.distributorCode || d.distributorName, name: d.distributorName }));
    return Array.from(new Map(rawList.filter(p => p.name).map(item => [item.name, item])).values());
  }, [partyType, dealers, distributors]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getAll();
      setPayments(data.results || data.data || data || []); 
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to fetch payments', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const resetForm = () => {
    setSelectedParty('');
    setAmount('');
    setPaymentMode('UPI');
    setRemarks('');
    setPhoto(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !amount || !paymentMode) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const party = parties.find(p => p.name === selectedParty);
      const formData = new FormData();
      formData.append('partyId', party?.id || selectedParty);
      formData.append('partyName', selectedParty);
      formData.append('partyType', partyType.toUpperCase());
      formData.append('amount', amount);
      formData.append('paymentMode', paymentMode);
      formData.append('remarks', remarks);
      if (photo) {
        formData.append('photo', photo);
      }

      await paymentService.submitPayment(formData);
      toast({ title: 'Success', description: 'Payment receipt submitted successfully.' });
      resetForm();
      setIsDialogOpen(false);
      fetchPayments();
    } catch (err: any) {
      toast({ title: 'Submission Failed', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Payment Receipts</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Submit Payment Receipt</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Party Type</Label>
                <Select value={partyType} onValueChange={(val: any) => { setPartyType(val); setSelectedParty(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dealer">Dealer</SelectItem>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Party Name *</Label>
                <Popover open={openPartyCombobox} onOpenChange={setOpenPartyCombobox}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openPartyCombobox} className="w-full justify-between">
                      {selectedParty || `Select ${partyType}...`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 z-[100]">
                    <Command>
                      <CommandInput placeholder={`Search ${partyType}...`} />
                      <CommandEmpty>No {partyType.toLowerCase()} found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {parties.map((party) => (
                            <CommandItem key={party.name} value={party.name} onSelect={(currentValue) => {
                              setSelectedParty(party.name);
                              setOpenPartyCombobox(false);
                            }}>
                              <Check className={`mr-2 h-4 w-4 ${selectedParty === party.name ? "opacity-100" : "opacity-0"}`} />
                              {party.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount Received (₹) *</Label>
                  <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" required />
                </div>

                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="NEFT/RTGS">NEFT / RTGS</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Photo / Receipt</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              </div>

              <div className="space-y-2">
                <Label>Remarks (Optional)</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any notes..." />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Payment Receipt'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading payments...</TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments submitted yet.</TableCell></TableRow>
                ) : payments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.createdAt ? format(new Date(payment.createdAt), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell>{payment.partyName} <span className="text-xs text-gray-500">({payment.partyType})</span></TableCell>
                    <TableCell className="font-medium">₹{payment.amount}</TableCell>
                    <TableCell>{payment.paymentMode}</TableCell>
                    <TableCell>
                      {payment.photoUrl ? (
                        <a href={payment.photoUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> View
                          </Button>
                        </a>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No Photo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        payment.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                        payment.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitPaymentPage;
