import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { paymentService } from '@/api/services/payment.service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubmitPaymentPage: React.FC = () => {
  const { dealers, distributors } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

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
      navigate('/'); // go to dashboard
    } catch (err: any) {
      toast({ title: 'Submission Failed', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Submit Payment Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                <PopoverContent className="w-[400px] p-0">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitPaymentPage;
