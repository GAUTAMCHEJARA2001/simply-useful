import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  ArrowLeft,
  Receipt,
  Plus,
  ShieldAlert,
  Building2,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Percent,
  TrendingDown,
  Info,
  Check,
  ChevronsUpDown,
  Camera,
  UploadCloud,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const RaiseCNDiscountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const initialPartyType = (searchParams.get('partyType') || 'DEALER').toUpperCase() as 'DEALER' | 'DISTRIBUTOR';
  const initialPartyId = searchParams.get('partyId') || '';

  const [partyType, setPartyType] = useState<'DEALER' | 'DISTRIBUTOR'>(initialPartyType);
  const [partyId, setPartyId] = useState(initialPartyId);
  const [requestType, setRequestType] = useState<'CREDIT_NOTE' | 'DISCOUNT'>('CREDIT_NOTE');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Proof / Calculation photo attachment
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Data states
  const [openPartyCombobox, setOpenPartyCombobox] = useState(false);
  const [dealers, setDealers] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partySearch, setPartySearch] = useState('');

  // Fetch dealers and distributors
  useEffect(() => {
    const fetchParties = async () => {
      setLoadingParties(true);
      try {
        const [dealersRes, distRes] = await Promise.all([
          api.get('/dealers'),
          api.get('/distributors'),
        ]);

        const dList = dealersRes.data?.data || dealersRes.data?.results || dealersRes.data || [];
        const distList = distRes.data?.data || distRes.data?.results || distRes.data || [];

        setDealers(Array.isArray(dList) ? dList : []);
        setDistributors(Array.isArray(distList) ? distList : []);

        if (initialPartyId) {
          setPartyId(initialPartyId);
        } else if (dList.length > 0) {
          setPartyId(dList[0].id || dList[0].dealerCode);
        }
      } catch (err) {
        console.error('Failed to load parties:', err);
      } finally {
        setLoadingParties(false);
      }
    };

    fetchParties();
  }, [initialPartyId]);

  // Selected party object
  const selectedPartyObj = useMemo(() => {
    const pool = partyType === 'DEALER' ? dealers : distributors;
    return pool.find((p: any) => (p.id || p.dealerCode || p.distributorCode) === partyId);
  }, [partyType, partyId, dealers, distributors]);

  // Filtered party list for dropdown
  const filteredPartyList = useMemo(() => {
    const pool = partyType === 'DEALER' ? dealers : distributors;
    if (!partySearch.trim()) return pool;
    const q = partySearch.toLowerCase();
    return pool.filter((p: any) => {
      const name = (p.dealerName || p.dealername || p.distributorName || p.distributorname || '').toLowerCase();
      const code = (p.dealerCode || p.dealercode || p.distributorCode || p.distributorcode || '').toLowerCase();
      const city = (p.city || p.area || '').toLowerCase();
      return name.includes(q) || code.includes(q) || city.includes(q);
    });
  }, [partyType, dealers, distributors, partySearch]);

  // Impact calculation
  const currentOutstanding = selectedPartyObj?.outstanding || 0;
  const creditLimit = selectedPartyObj?.creditLimit || selectedPartyObj?.creditlimit || 0;
  const requestedNum = parseFloat(amount) || 0;
  const projectedBalance = Math.max(0, currentOutstanding - requestedNum);

  // Handle calculation proof / photo attachment
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyId) {
      toast({ title: 'Party Required', description: 'Please choose a Dealer or Distributor.', variant: 'destructive' });
      return;
    }

    if (!requestedNum || requestedNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Enter an amount greater than ₹0.', variant: 'destructive' });
      return;
    }

    if (!reason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide detailed justification for SuperAdmin.', variant: 'destructive' });
      return;
    }

    const partyName = selectedPartyObj?.dealerName || selectedPartyObj?.dealername || selectedPartyObj?.distributorName || selectedPartyObj?.distributorname || 'Party';

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('party_type', partyType);
      formData.append('party_id', partyId);
      formData.append('party_name', partyName);
      formData.append('request_type', requestType);
      formData.append('amount', String(requestedNum));
      formData.append('reason', reason.trim());
      if (invoiceNumber.trim()) {
        formData.append('invoice_number', invoiceNumber.trim());
      }
      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      const res = await api.post('/parties/cn-requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        toast({
          title: 'Request Queued for SuperAdmin!',
          description: res.data.message || 'Request created successfully with supporting proof.',
        });
        navigate('/finance/cn-requests');
      } else {
        toast({
          title: 'Submission Failed',
          description: res.data?.message || 'Could not submit request.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to submit request.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <button
            type="button"
            onClick={() => navigate('/finance/ledger')}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1.5 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Party Ledgers
          </button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-primary" />
            Raise Credit Note / Special Discount
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dedicated administrative entry form. Queued for SuperAdmin approval before posting a credit entry to the party accounting ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/finance/ledger?tab=cn_requests')}
            className="text-xs border-slate-300 dark:border-slate-800"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5 text-amber-500" />
            View Approval Queue
          </Button>
        </div>
      </div>

      {/* Main 2-Column Form Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 Cols): Form Inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Party Selection */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="py-4 px-5 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  1. Select Account / Party
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Account Type</Label>
                    <Select
                      value={partyType}
                      onValueChange={(val: any) => {
                        setPartyType(val);
                        const list = val === 'DEALER' ? dealers : distributors;
                        if (list.length > 0) {
                          setPartyId(list[0].id || list[0].dealerCode || list[0].distributorCode);
                        }
                      }}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEALER">Dealer / Retailer ({dealers.length})</SelectItem>
                        <SelectItem value="DISTRIBUTOR">Distributor Network ({distributors.length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold">Party Name / Code *</Label>
                    <Popover open={openPartyCombobox} onOpenChange={setOpenPartyCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPartyCombobox}
                          disabled={loadingParties}
                          className="w-full justify-between text-xs h-9 font-normal bg-background px-3 border-input hover:bg-accent/40"
                        >
                          {selectedPartyObj ? (
                            <div className="flex items-center gap-2 truncate text-left">
                              <span className="font-semibold text-foreground truncate">
                                {selectedPartyObj.dealerName || selectedPartyObj.dealername || selectedPartyObj.distributorName || selectedPartyObj.distributorname}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                ({selectedPartyObj.dealerCode || selectedPartyObj.dealercode || selectedPartyObj.distributorCode || selectedPartyObj.distributorcode})
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {loadingParties ? 'Loading parties...' : 'Search or Select Party...'}
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[340px] sm:w-[480px] p-0 z-[100]" align="start">
                        <Command>
                          <CommandInput
                            placeholder={`Search ${partyType.toLowerCase()} by name, code, or city...`}
                            className="h-9 text-xs"
                          />
                          <CommandEmpty className="p-4 text-xs text-center text-muted-foreground">
                            No {partyType.toLowerCase()} found matching search.
                          </CommandEmpty>
                          <CommandList className="max-h-72 overflow-y-auto">
                            <CommandGroup heading={`${partyType === 'DEALER' ? 'Dealers' : 'Distributors'} (${filteredPartyList.length})`}>
                              {filteredPartyList.map((p: any) => {
                                const id = p.id || p.dealerCode || p.distributorCode;
                                const name = p.dealerName || p.dealername || p.distributorName || p.distributorname;
                                const code = p.dealerCode || p.dealercode || p.distributorCode || p.distributorcode;
                                const city = p.city || p.area || '';
                                const isSelected = partyId === id;
                                return (
                                  <CommandItem
                                    key={id}
                                    value={`${name} ${code} ${city} ${id}`}
                                    onSelect={() => {
                                      setPartyId(id);
                                      setOpenPartyCombobox(false);
                                    }}
                                    className="cursor-pointer text-xs flex items-center justify-between py-2 px-3 hover:bg-accent"
                                  >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                      <Check
                                        className={cn(
                                          "h-4 w-4 shrink-0 text-primary transition-opacity",
                                          isSelected ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="font-semibold text-foreground truncate">{name}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                      {code}{city ? ` · ${city}` : ''}
                                    </span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Selected Party Summary Bar */}
                {selectedPartyObj && (
                  <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <span>{selectedPartyObj.dealerName || selectedPartyObj.distributorName}</span>
                        <Badge variant="outline" className="text-[9px] py-0 font-mono">
                          {selectedPartyObj.dealerCode || selectedPartyObj.distributorCode}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedPartyObj.city && <span>City: {selectedPartyObj.city} &bull; </span>}
                        {selectedPartyObj.phone && <span>Phone: {selectedPartyObj.phone} &bull; </span>}
                        <span>Credit Limit: ₹{(creditLimit || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Current Balance:</span>
                      <div className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{currentOutstanding.toLocaleString()} Dr
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Request Specifications */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="py-4 px-5 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  2. Voucher Type & Deduction Amount
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Type Selection Radio Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setRequestType('CREDIT_NOTE')}
                    className={`cursor-pointer rounded-xl p-4 border transition-all text-xs space-y-1.5 ${
                      requestType === 'CREDIT_NOTE'
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4 text-purple-600" />
                        Credit Note (CN)
                      </span>
                      {requestType === 'CREDIT_NOTE' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      For damaged packaging, goods returned from site, rate difference adjustments, or short delivery write-offs.
                    </p>
                  </div>

                  <div
                    onClick={() => setRequestType('DISCOUNT')}
                    className={`cursor-pointer rounded-xl p-4 border transition-all text-xs space-y-1.5 ${
                      requestType === 'DISCOUNT'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-amber-600" />
                        Special Approved Discount
                      </span>
                      {requestType === 'DISCOUNT' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Special promotional discount negotiated by Sales Officer, seasonal volume rebate, or prompt payment settlement.
                    </p>
                  </div>
                </div>

                {/* Amount & Invoice Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Credit Amount (₹) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="e.g. 5000.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-7 font-mono font-bold text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Related Invoice # / Order Ref (Optional)</Label>
                    <Input
                      placeholder="e.g. INV-202610-0042 or ORD-1082"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Detailed Reason */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Reason & Accounting Justification *
                  </Label>
                  <Textarea
                    placeholder="Provide full context for SuperAdmin: e.g. 4 damaged boxes received during transport in delivery batch #B-201; special 2% scheme discount agreed by Sales Head for Diwali order #INV-889..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[100px] text-xs leading-relaxed"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    This reason will be embedded in the official accounting narration for Tally/Busy sync once approved.
                  </p>
                </div>

                {/* Calculation Sheet & Photo Proof Upload */}
                <div className="space-y-2 pt-3 border-t border-border/70">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-primary" />
                      Attach Calculation Sheet / Proof / Supporting Photo (Optional)
                    </Label>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG, PDF up to 10MB</span>
                  </div>

                  {!selectedFile ? (
                    <label className="border-2 border-dashed border-border/90 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-all text-center group bg-card">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        Click to upload calculation sheet, invoice copy, or proof photo
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        E.g. photo of written price calculation, damaged items proof, signed approval slip
                      </span>
                    </label>
                  ) : (
                    <div className="bg-muted/40 border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Calculation proof preview"
                            className="w-14 h-14 object-cover rounded-lg border border-border shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'Attachment'}
                          </p>
                          <span className="inline-block mt-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            ✓ Attached for SuperAdmin Review
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8 px-2 text-xs font-semibold shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/finance/ledger')}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="action-button text-xs font-bold px-6 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting to SuperAdmin...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" /> Submit Request for SuperAdmin Approval
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column (1 Col): Live Ledger Impact & Audit Pipeline */}
          <div className="space-y-6">
            
            {/* Live Ledger Balance Impact Simulator */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="py-3.5 px-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  Ledger Impact Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground">Current Outstanding:</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{currentOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-border/60 text-emerald-600 dark:text-emerald-400">
                  <span>Requested Deduction:</span>
                  <span className="font-mono font-bold">
                    -₹{requestedNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr
                  </span>
                </div>

                <div className="flex justify-between py-1.5 font-bold text-sm bg-muted/30 px-2 rounded-md">
                  <span>Projected Balance:</span>
                  <span className="font-mono text-foreground">
                    ₹{projectedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Dr
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Credit Limit: ₹{(creditLimit || 0).toLocaleString()}</span>
                    <span>
                      {creditLimit > 0
                        ? `${Math.round((projectedBalance / creditLimit) * 100)}% utilization`
                        : 'No limit'}
                    </span>
                  </div>
                  {creditLimit > 0 && (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((projectedBalance / creditLimit) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Approval Workflow Explanation */}
            <Card className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
              <CardContent className="p-4 space-y-3 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  SuperAdmin Audit Enforcement
                </div>
                <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground dark:text-amber-200/80">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">1</span>
                    <span>Admin or Sales Officer submits this formal request with invoice and justification.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">2</span>
                    <span>SuperAdmin examines the justification in the Approval Queue and validates live party balance.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">3</span>
                    <span>Upon 1-click approval, the system assigns a unique Request ID (e.g. <span className="font-mono font-semibold">CN-REQ-202610-0001</span>), updates outstanding, and generates accounting narration for Tally/Busy.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </form>
    </div>
  );
};

export default RaiseCNDiscountPage;
