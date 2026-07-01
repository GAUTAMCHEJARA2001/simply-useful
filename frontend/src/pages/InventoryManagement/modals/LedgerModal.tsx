import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import apiService from '@/api/apiService';
import DataTable from '@/components/DataTable';
import { toast } from 'react-hot-toast';

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
}

const LedgerModal: React.FC<LedgerModalProps> = ({ isOpen, onClose, defaultSearch = '' }) => {
  const [search, setSearch] = useState(defaultSearch);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && defaultSearch) {
      handleSearch(defaultSearch);
    }
  }, [isOpen, defaultSearch]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await apiService.get(`/busy/search-parties?q=${query}`);
      if (res.success) {
        setParties(res.data);
        if (res.data.length === 1) {
          fetchLedger(res.data[0]);
        }
      }
    } catch (err: any) {
      toast.error('Failed to search parties');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (party: Party) => {
    setSelectedParty(party);
    setLoading(true);
    try {
      const res = await apiService.get(`/busy/ledger/${party.code}`);
      if (res.success) {
        setLedger(res.ledger);
      }
    } catch (err: any) {
      toast.error('Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Date', accessor: 'date' },
    { header: 'Voucher No', accessor: 'vch_no' },
    { 
      header: 'Debit (Dr)', 
      accessor: (row: LedgerEntry) => row.amount > 0 ? row.amount.toFixed(2) : '',
      className: 'text-green-600 font-medium text-right'
    },
    { 
      header: 'Credit (Cr)', 
      accessor: (row: LedgerEntry) => row.amount < 0 ? Math.abs(row.amount).toFixed(2) : '',
      className: 'text-red-600 font-medium text-right'
    },
    { 
      header: 'Balance', 
      accessor: (row: LedgerEntry) => {
        const bal = row.running_balance;
        return `${Math.abs(bal).toFixed(2)} ${bal >= 0 ? 'Dr' : 'Cr'}`;
      },
      className: 'font-bold text-right'
    },
    { header: 'Narration', accessor: 'short_nar' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Party Ledger (Busy Accounting)</DialogTitle>
        </DialogHeader>
        
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
            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-md border">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{selectedParty.name}</h3>
                <p className="text-sm text-gray-500">Party Code: {selectedParty.code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Closing Balance</p>
                <p className={`text-xl font-bold ${ledger.length > 0 && ledger[ledger.length-1].running_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {ledger.length > 0 
                    ? `${Math.abs(ledger[ledger.length-1].running_balance).toFixed(2)} ${ledger[ledger.length-1].running_balance >= 0 ? 'Dr' : 'Cr'}` 
                    : '0.00'}
                </p>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
              <DataTable columns={columns} data={ledger} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LedgerModal;
