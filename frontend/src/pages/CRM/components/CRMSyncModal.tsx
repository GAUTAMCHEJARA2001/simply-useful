import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { leadService } from '@/api/services/lead.service';
import { RefreshCw, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Plus, Sparkles } from 'lucide-react';

interface CRMSyncModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  salesOfficers?: any[];
  currentUserId?: string;
}

export const CRMSyncModal: React.FC<CRMSyncModalProps> = ({
  open,
  onClose,
  onSuccess,
  salesOfficers = [],
  currentUserId = '',
}) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [loading, setLoading] = useState(false);

  // Single inquiry state
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState('Web Inquiry');
  const [value, setValue] = useState('');
  const [assignedTo, setAssignedTo] = useState(currentUserId || '');
  const [notes, setNotes] = useState('');

  // Batch paste state
  const [batchText, setBatchText] = useState('');
  const [syncResult, setSyncResult] = useState<any | null>(null);

  const resetForm = () => {
    setName('');
    setCompanyName('');
    setPhone('');
    setEmail('');
    setCity('');
    setValue('');
    setNotes('');
    setBatchText('');
    setSyncResult(null);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !companyName.trim()) {
      toast({ title: 'Validation error', description: 'Contact name or company name is required.', variant: 'destructive' });
      return;
    }
    if (!phone.trim() && !email.trim()) {
      toast({ title: 'Validation error', description: 'Phone number or email is required.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload = [{
        name: name.trim() || companyName.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        source: source || 'Web Inquiry',
        value: Number(value) || 0,
        notes: notes.trim() || undefined,
        assignedTo: assignedTo || undefined,
      }];

      const res = await leadService.syncInquiries(payload);
      if (res.data?.success) {
        const d = res.data.data;
        if (d.created_count > 0) {
          toast({
            title: 'Inquiry Synced Successfully! 🎯',
            description: `${name || companyName} added to active pipeline.`,
          });
          resetForm();
          onSuccess();
          onClose();
        } else if (d.skipped_count > 0) {
          toast({
            title: 'Duplicate Detected',
            description: d.skipped[0]?.reason || 'Inquiry with this phone/email already exists.',
            variant: 'destructive',
          });
        }
      }
    } catch (err: any) {
      toast({
        title: 'Sync failed',
        description: err.response?.data?.message || err.message || 'Server error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (!batchText.trim()) {
      toast({ title: 'Input required', description: 'Please paste inquiry lines.', variant: 'destructive' });
      return;
    }

    // Parse lines: Name, Phone, Company, City, Value
    const lines = batchText.trim().split('\n');
    const parsedItems: any[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Split by comma or tab
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 2) {
        parsedItems.push({
          name: (parts[0] || '').trim(),
          phone: (parts[1] || '').trim(),
          companyName: (parts[2] || '').trim() || undefined,
          city: (parts[3] || '').trim() || undefined,
          value: Number((parts[4] || '').trim()) || 0,
          source: 'Bulk CSV / Sync',
          assignedTo: assignedTo || undefined,
        });
      }
    }

    if (parsedItems.length === 0) {
      toast({
        title: 'Parsing error',
        description: 'No valid rows found. Ensure format: Name, Phone, Company (optional), City (optional)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await leadService.syncInquiries(parsedItems);
      if (res.data?.success) {
        setSyncResult(res.data.data);
        toast({
          title: 'Batch Sync Complete! 🚀',
          description: `Created: ${res.data.data.created_count}, Skipped: ${res.data.data.skipped_count}`,
        });
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: 'Batch sync failed',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="w-5 h-5 text-primary" /> Synchronize & Ingest New Inquiries
          </DialogTitle>
          <DialogDescription>
            Instant de-duplication check against active dealer & customer database.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Quick Inquiry Log
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Bulk Sync / Paste
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 pt-4">
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Contact Person Name *</Label>
                  <Input
                    placeholder="e.g. Ramesh Patel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Company / Counter Name</Label>
                  <Input
                    placeholder="e.g. Patel Hardware & Paints"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone / WhatsApp *</Label>
                  <Input
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email (Optional)</Label>
                  <Input
                    type="email"
                    placeholder="ramesh@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City / Territory</Label>
                  <Input
                    placeholder="e.g. Surat, Vapi, Ahmedabad"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Inquiry Source</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Web Inquiry">Web Inquiry / Website</SelectItem>
                      <SelectItem value="WhatsApp Lead">WhatsApp Direct</SelectItem>
                      <SelectItem value="Cold Call">Cold Call / Field Visit</SelectItem>
                      <SelectItem value="Dealer Referral">Dealer Referral</SelectItem>
                      <SelectItem value="Architect / Mason Meet">Architect / Mason Meet</SelectItem>
                      <SelectItem value="Exhibition / Expo">Exhibition / Expo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated Deal Value (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
                {salesOfficers.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Assign to Sales Officer</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Officer" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesOfficers.map((so) => (
                          <SelectItem key={so.id} value={so.id}>
                            {so.name || so.email} ({so.territory || 'General'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Requirement Notes / Product Interest</Label>
                <Textarea
                  placeholder="e.g. Inquired about tile adhesives & epoxy grout for 50-flat apartment project..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save & Ingest Inquiry
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 pt-4">
            <div className="bg-muted/40 p-3 rounded-lg border text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Supported Format (Comma or Tab separated):
              </p>
              <p className="font-mono bg-background px-2 py-1 rounded border">
                Name, Phone, Company, City, Estimated Value
              </p>
              <p className="text-[11px]">Example: Ramesh Patel, 9876543210, Patel Hardware, Surat, 75000</p>
            </div>

            <div className="space-y-1.5">
              <Label>Paste Lines from Excel / Google Sheets</Label>
              <Textarea
                placeholder={`Ramesh Patel, 9876543210, Patel Hardware, Surat, 75000\nSuresh Shah, 9123456780, Shah Ceramics, Vapi, 120000`}
                rows={6}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {syncResult && (
              <div className="bg-muted/30 p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Created: {syncResult.created_count}
                  </Badge>
                  {syncResult.skipped_count > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Skipped (Duplicates): {syncResult.skipped_count}
                    </Badge>
                  )}
                </div>
                {syncResult.skipped?.length > 0 && (
                  <div className="max-h-24 overflow-y-auto text-[11px] text-muted-foreground space-y-1">
                    {syncResult.skipped.map((s: any, idx: number) => (
                      <p key={idx}>⚠️ {s.item?.name || 'Item'}: {s.reason}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Close
              </Button>
              <Button type="button" onClick={handleBatchSubmit} disabled={loading || !batchText.trim()} className="gap-2">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Process Batch Sync
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
