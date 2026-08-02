import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';
import { Loader2, Search, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const NewLedgerRequest: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [docType, setDocType] = useState('LEDGER');
  const [otherDocName, setOtherDocName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/busy/search-parties?q=${query}`);
      if (res.data?.success) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Search failed', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // 300ms debounce
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    performSearch(searchQuery);
  };

  const submitRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedParty) return;
    
    setSubmitting(true);
    try {
      const res = await api.post('/busy/ledger-requests', {
        party_code: selectedParty.code,
        party_name: selectedParty.name,
        document_type: docType,
        other_document_name: docType === 'OTHER' ? otherDocName : '',
        from_date: fromDate || null,
        to_date: toDate || null,
        remarks: remarks
      });
      if (res.data?.success) {
        toast({ title: 'Success', description: 'Document request submitted successfully!' });
        navigate('/sales/ledger-requests');
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to submit document request', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickDate = (type: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY' | 'LAST_FY') => {
    const now = new Date();
    let from, to;
    
    const formatDate = (d: Date) => {
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - (offset*60*1000));
      return local.toISOString().split('T')[0];
    };

    if (type === 'THIS_MONTH') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'LAST_MONTH') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'THIS_FY') {
      const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      from = new Date(startYear, 3, 1);
      to = new Date(startYear + 1, 2, 31);
    } else if (type === 'LAST_FY') {
      const startYear = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
      from = new Date(startYear, 3, 1);
      to = new Date(startYear + 1, 2, 31);
    }

    if (from && to) {
      setFromDate(formatDate(from));
      setToDate(formatDate(to));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/sales/ledger-requests')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="page-header">New Document Request</h1>
          <p className="page-subheader">Request a ledger, bill, or price list from the Admin team.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {!selectedParty ? (
            <div className="max-w-xl mx-auto">
              <Label className="mb-2 block text-lg">1. Search for Customer</Label>
              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <Input 
                  placeholder="Enter customer name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="h-12 text-lg"
                />
                <Button type="submit" disabled={searching} className="h-12 px-6">
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </Button>
              </form>

              {searchResults.length > 0 && (
                <div className="bg-white rounded-md border shadow-sm max-h-96 overflow-y-auto">
                  {searchResults.map((party) => (
                    <div key={party.code} className="p-4 border-b last:border-0 flex justify-between items-center hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedParty(party)}>
                      <div className="flex-1 mr-4">
                        <p className="font-semibold text-gray-900 text-base">{party.name}</p>
                        <p className="text-sm text-gray-500 font-mono mt-1">{party.alias} • {party.code}</p>
                        
                        <div className="mt-2 text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {party.gst_number && <p><span className="font-medium text-gray-500">GST:</span> {party.gst_number}</p>}
                          {party.contact_person && <p><span className="font-medium text-gray-500">Contact:</span> {party.contact_person}</p>}
                          {party.phone && <p><span className="font-medium text-gray-500">Phone:</span> {party.phone}</p>}
                          {party.email && <p><span className="font-medium text-gray-500">Email:</span> {party.email}</p>}
                          {party.address && <p className="col-span-1 sm:col-span-2"><span className="font-medium text-gray-500">Address:</span> {party.address}</p>}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="whitespace-nowrap">Select</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submitRequest} className="space-y-6 max-w-2xl mx-auto">
              <div className="flex justify-between items-center bg-blue-50 p-4 border border-blue-100 rounded-md mb-6">
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Selected Customer</p>
                  <p className="font-bold text-blue-900 text-lg">{selectedParty.name}</p>
                  <p className="font-mono text-blue-700 text-sm">{selectedParty.code}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedParty(null)}>Change Customer</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base">Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="bg-white h-12">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEDGER">Ledger Statement</SelectItem>
                      <SelectItem value="BILL">Specific Bill/Invoice</SelectItem>
                      <SelectItem value="PRICELIST">Latest Price List</SelectItem>
                      <SelectItem value="OTHER">Other Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {docType === 'OTHER' && (
                  <div className="space-y-2">
                    <Label className="text-base">Specify Document</Label>
                    <Input 
                      placeholder="e.g. Credit Note" 
                      value={otherDocName} 
                      onChange={(e) => setOtherDocName(e.target.value)}
                      className="bg-white h-12"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate('THIS_MONTH')}>This Month</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate('LAST_MONTH')}>Last Month</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate('THIS_FY')}>This FY</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate('LAST_FY')}>Last FY</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-base">From Date (Optional)</Label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-white h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base">To Date (Optional)</Label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-white h-12" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Remarks / Notes (Optional)</Label>
                <Textarea 
                  placeholder="Explicitly mention exactly what you need..." 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)}
                  className="bg-white min-h-[120px] text-base"
                />
              </div>

              <div className="pt-6 border-t mt-6">
                <Button type="submit" disabled={submitting} size="lg" className="w-full">
                  {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  Submit Document Request
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NewLedgerRequest;