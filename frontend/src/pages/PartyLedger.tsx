import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import LedgerModal from '@/pages/InventoryManagement/modals/LedgerModal';
import { Card, CardContent } from '@/components/ui/card';
import { Search, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PartyLedger: React.FC = () => {
  const { dealers, distributors } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerTarget, setLedgerTarget] = useState('');
  
  // Filter by assigned SO if they are a sales user
  const isSales = user?.role === 'SALES';
  
  const myDealers = isSales ? dealers.filter(d => d.assignedSoEmail === user?.email) : dealers;
  const myDistributors = isSales ? distributors.filter(d => d.assignedSoEmail === user?.email) : distributors;
  
  const allParties = [
    ...myDealers.map(d => ({ type: 'Dealer', name: d.dealerName, code: d.dealerCode, outstanding: d.outstanding, creditLimit: d.creditLimit })),
    ...myDistributors.map(d => ({ type: 'Distributor', name: d.distributorName, code: d.distributorCode || '', outstanding: d.outstanding, creditLimit: d.creditLimit }))
  ].filter(p => p.code); // Only include parties that have a code
  
  const filtered = allParties.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Party Ledger</h1>
          <p className="page-subheader">View live accounting ledgers for your assigned dealers and distributors</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name or code..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p, idx) => (
          <Card key={`${p.code}-${idx}`} className="hover:shadow-md transition-shadow border-blue-100">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800 line-clamp-1" title={p.name}>{p.name}</h3>
                  <p className="text-xs font-mono text-blue-600">{p.code}</p>
                </div>
                <Badge variant="outline" className={p.type === 'Dealer' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>{p.type}</Badge>
              </div>
              <div className="text-sm mt-4 mb-4 space-y-1.5 p-3 bg-gray-50 rounded-md border border-gray-100">
                <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</span><span className={`font-bold ${p.outstanding > 0 ? 'text-red-600' : p.outstanding < 0 ? 'text-green-600' : 'text-gray-600'}`}>₹{Math.abs(p.outstanding).toLocaleString()} {p.outstanding > 0 ? 'Dr' : p.outstanding < 0 ? 'Cr' : ''}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground uppercase tracking-wider">Credit Limit</span><span className="font-medium text-gray-700">₹{p.creditLimit.toLocaleString()}</span></div>
              </div>
              <Button className="w-full bg-white text-blue-600 border-blue-200 hover:bg-blue-50" variant="outline" onClick={() => { setLedgerTarget(p.code); setLedgerOpen(true); }}>
                <BookOpen className="w-4 h-4 mr-2" /> View Ledger
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            No parties found.
          </div>
        )}
      </div>

      <LedgerModal 
        isOpen={ledgerOpen} 
        onClose={() => setLedgerOpen(false)} 
        defaultSearch={ledgerTarget}
        restricted={true}
      />
    </div>
  );
};

export default PartyLedger;
