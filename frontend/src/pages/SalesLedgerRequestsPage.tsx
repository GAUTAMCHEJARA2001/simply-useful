import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { api } from '@/api/client';
import { Loader2, FileText, CheckCircle, Clock, Plus, Download } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface LedgerReq {
  id: number;
  party_code: string;
  party_name: string;
  status: string;
  document_type?: string;
  other_document_name?: string;
  from_date?: string;
  to_date?: string;
  remarks?: string;
  requested_at: string;
  completed_at: string | null;
  file_url?: string | null;
  file_name?: string | null;
}

const SalesLedgerRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<LedgerReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' 
        ? '/busy/ledger-requests?status=' 
        : `/busy/ledger-requests?status=${statusFilter}`;
      const res = await api.get(url);
      if (res.data?.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch your requests.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const completedCount = requests.filter(r => r.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2"><FileText className="w-7 h-7 text-primary" /> My Ledger Requests</h1>
          <p className="page-subheader">Track the status of ledger updates you've requested from the Admin team.</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Requests</SelectItem>
              <SelectItem value="PENDING">Pending Upload</SelectItem>
              <SelectItem value="COMPLETED">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate('/sales/new-ledger-request')}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-6 flex flex-col justify-center items-center">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Total Requests</span>
            <span className="text-4xl font-black text-blue-900">{requests.length}</span>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50/50 border-amber-100">
          <CardContent className="p-6 flex flex-col justify-center items-center">
            <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">Pending Upload</span>
            <span className="text-4xl font-black text-amber-900">{pendingCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="p-6 flex flex-col justify-center items-center">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-2">Fulfilled</span>
            <span className="text-4xl font-black text-green-900">{completedCount}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading your requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-lg">No requests yet</p>
              <p className="text-sm">When you request a ledger update, it will appear here.</p>
            </div>
          ) : (
            <DataTable
              columns={['Document & Party', 'Details', 'Requested At', 'Status', 'Completed At']}
              rows={requests.map(req => {
                let docLabel = req.document_type === 'OTHER' ? (req.other_document_name || 'Other') : (req.document_type || 'Ledger');
                if (req.document_type === 'PRICELIST') docLabel = 'Price List';
                
                return [
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px] bg-blue-50 text-blue-700">{docLabel}</Badge>
                    <p className="font-semibold text-gray-900">{req.party_name}</p>
                    <p className="text-xs text-gray-500 font-mono">Code: {req.party_code}</p>
                  </div>,
                  <div className="max-w-[200px]">
                    {(req.from_date || req.to_date) && (
                      <p className="text-xs text-gray-700 mb-1 font-medium">
                        {req.from_date ? format(new Date(req.from_date), 'dd MMM yyyy') : '...'} to {req.to_date ? format(new Date(req.to_date), 'dd MMM yyyy') : '...'}
                      </p>
                    )}
                    {req.remarks ? (
                      <p className="text-xs text-gray-500 truncate" title={req.remarks}>"{req.remarks}"</p>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No remarks</span>
                    )}
                  </div>,
                  <div>
                    <p className="text-sm font-medium">{format(new Date(req.requested_at), 'dd MMM yyyy, hh:mm a')}</p>
                    <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(req.requested_at), { addSuffix: true })}</p>
                  </div>,
                  req.status === 'PENDING' ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Clock className="w-3 h-3 mr-1" /> Pending
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" /> Fulfilled
                    </Badge>
                  ),
                  req.completed_at ? (
                    <div className="space-y-1">
                      <p className="text-sm">{format(new Date(req.completed_at), 'dd MMM yyyy, hh:mm a')}</p>
                      {req.file_url ? (
                        <a href={req.file_url} target="_blank" rel="noopener noreferrer" className="inline-block w-full">
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full h-8 px-2">
                            <Download className="w-3 h-3 mr-1" />
                            {req.file_name || 'Download File'}
                          </Button>
                        </a>
                      ) : (
                        <p className="text-xs text-green-600 font-medium">Ready</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )
                ];
              })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesLedgerRequestsPage;
