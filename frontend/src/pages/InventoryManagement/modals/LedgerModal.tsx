import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Upload } from 'lucide-react';
import apiService from '@/api/apiService';
import { api } from '@/api/client';
import { DataTable } from '@/components/DataTable';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface LedgerEntry {
  date: string;
  vch_type: number;
  vch_no: string;
  amount: number;
  short_nar: string;
  running_balance: number;
}

interface Party {
  code: number;
  name: string;
  alias: string;
}

interface LedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSearch?: string;
  restricted?: boolean;
}

const LedgerModal: React.FC<LedgerModalProps> = ({ isOpen, onClose, defaultSearch = '', restricted = false }) => {
  const [search, setSearch] = useState(defaultSearch);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const [uploading, setUploading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<any>(null);

  const fetchRequestStatus = async (party: Party) => {
    try {
      const res = await api.get(`/busy/ledger-requests?party_code=${party.code}`);
      if (res.data?.success && res.data?.data && res.data.data.length > 0) {
        setRequestStatus(res.data.data[0]);
      } else {
        setRequestStatus(null);
      }
    } catch (err) {}
  };

  const handleRequestUpdate = async () => {
    if (!selectedParty) return;
    try {
      const res = await api.post('/busy/ledger-requests', {
        party_code: selectedParty.code,
        party_name: selectedParty.name
      });
      if (res.data?.success) {
        toast({ title: 'Requested', description: 'Ledger update requested from Admin' });
        fetchRequestStatus(selectedParty);
      } else {
        toast({ title: 'Error', description: res.data?.message || 'Failed to request', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to request update', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedParty) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post(`/busy/import-ledger`, formData, {
        params: {
          party_code: defaultSearch || selectedParty.code
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        toast({
          title: 'Success',
          description: res.data.message || 'Ledger imported successfully',
        });
        fetchLedger(selectedParty);
      } else {
        toast({
          title: 'Import Failed',
          description: res.data?.message || 'Failed to import ledger',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to upload and import ledger',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (defaultSearch) {
        if (restricted) {
          fetchLedger({ code: defaultSearch as any, name: 'Loading Party...', alias: defaultSearch });
        } else {
          setSearch(defaultSearch);
          handleSearch(defaultSearch);
        }
      } else {
        setSearch('');
        setSelectedParty(null);
        setLedger([]);
        setParties([]);
      }
    }
  }, [isOpen, defaultSearch, restricted]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/busy/search-parties?q=${query}`);
      if (res.data?.success) {
        setParties(res.data.data);
        if (res.data.data.length === 1) {
          fetchLedger(res.data.data[0]);
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to search parties', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (party: Party) => {
    setSelectedParty(party);
    setLoading(true);
    try {
      const res = await api.get(`/busy/ledger/${party.code}`);
      if (res.data?.success) {
        setLedger(res.data.ledger);
        fetchRequestStatus(party);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to fetch ledger', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Party Ledger (Busy Accounting)</DialogTitle>
        </DialogHeader>
        
        {!restricted && (
          <div className="flex gap-2 mb-4">
            <Input 
              placeholder="Search party by name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(search)}
            />
            <Button onClick={() => handleSearch(search)} disabled={loading}>
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </div>
        )}

        {parties.length > 1 && !selectedParty && (
          <div className="border rounded-md p-2 max-h-40 overflow-y-auto mb-4">
            <h4 className="font-medium mb-2 text-sm text-gray-500">Select a Party:</h4>
            {parties.map(p => (
              <div 
                key={p.code} 
                className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0"
                onClick={() => fetchLedger(p)}
              >
                {p.name} {p.alias ? `(${p.alias})` : ''}
              </div>
            ))}
          </div>
        )}

        {selectedParty && (
          <div className="flex-1 overflow-y-auto mt-2">
            <div className="flex justify-between items-center mb-3 bg-gray-50 p-3 rounded-md border">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{selectedParty.name}</h3>
                <p className="text-sm text-gray-500">Party Code: {selectedParty.code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Closing Balance</p>
                <p className={`text-xl font-bold ${ledger.length > 0 && ledger[ledger.length-1].running_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {ledger.length > 0 
                    ? `₹${Math.abs(ledger[ledger.length-1].running_balance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${ledger[ledger.length-1].running_balance >= 0 ? 'Dr' : 'Cr'}` 
                    : '₹0.00'}
                </p>
              </div>
            </div>

            {!isAdmin && (
              <div className="mb-4 bg-gray-50 border border-gray-200 p-3 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-gray-800">Need the latest ledger?</p>
                  <p className="text-[11px] text-gray-500">
                    {requestStatus?.status === 'PENDING' ? 'An update request is currently pending with the Admin.' : 'Request the Admin to upload the latest ledger sheet.'}
                  </p>
                </div>
                <Button 
                  variant={requestStatus?.status === 'PENDING' ? "secondary" : "outline"} 
                  size="sm" 
                  className="h-8 text-xs gap-1.5" 
                  onClick={handleRequestUpdate}
                  disabled={requestStatus?.status === 'PENDING'}
                >
                  {requestStatus?.status === 'PENDING' ? 'Pending Admin Upload' : 'Request Update'}
                </Button>
              </div>
            )}

            {isAdmin && (
              <div className="mb-4 bg-blue-50/40 border border-blue-100 p-3 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-blue-900">Import Ledger Sheet</p>
                  <p className="text-[11px] text-blue-700">Upload Excel (.xlsx) or CSV exported from Busy/Tally</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800" disabled={uploading}>
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? 'Importing...' : 'Choose File & Import'}
                    </Button>
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
              <DataTable 
                columns={['Date', 'Voucher Type', 'Voucher No', 'Debit (Dr)', 'Credit (Cr)', 'Balance', 'Narration']} 
                rows={ledger.map(row => {
                  const bal = row.running_balance;
                  const getVchTypeName = (vchType: number) => {
                    switch (vchType) {
                      case 0: return "Opening Balance";
                      case 9: return "Sales";
                      case 3: return "Sales Return";
                      case 2: return "Purchase";
                      case 10: return "Purchase Return";
                      case 14: return "Receipt (Payment)";
                      case 19: return "Payment Made";
                      case 16: return "Journal";
                      case 18: return "Credit Note";
                      default: return `Other (${vchType})`;
                    }
                  };
                  return [
                    row.date,
                    getVchTypeName(row.vch_type),
                    row.vch_no || '—',
                    row.amount > 0 ? `₹${row.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}` : '',
                    row.amount < 0 ? `₹${Math.abs(row.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}` : '',
                    `₹${Math.abs(bal).toLocaleString('en-IN', {minimumFractionDigits: 2})} ${bal >= 0 ? 'Dr' : 'Cr'}`,
                    row.short_nar || '—'
                  ];
                })}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LedgerModal;
