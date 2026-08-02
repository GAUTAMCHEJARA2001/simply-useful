import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Clock, FileText, CheckCircle } from 'lucide-react';
import apiService from '@/api/apiService';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface LedgerReq {
  id: number;
  party_code: string;
  party_name: string;
  requested_by_name: string;
  requested_by_email: string;
  status: string;
  requested_at: string;
  completed_at: string;
}

const LedgerRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<LedgerReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const res = await api.get('/busy/ledger-requests?status=PENDING');
      if (res.data?.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch ledger requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, reqId: number, partyCode: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingId(reqId);
    try {
      const res = await api.post(`/busy/import-ledger`, formData, {
        params: { party_code: partyCode },
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        toast({ title: 'Success', description: 'Ledger imported successfully. Request marked as completed.' });
        fetchRequests();
      } else {
        toast({ title: 'Import Failed', description: res.data?.message || 'Failed to import ledger', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to upload ledger', variant: 'destructive' });
    } finally {
      setUploadingId(null);
      event.target.value = '';
    }
  };

  if (loading) return null;

  if (requests.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-3 border-b border-orange-100 bg-orange-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-lg text-orange-900">Pending Ledger Requests ({requests.length})</CardTitle>
          </div>
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200">Requires Action</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-orange-100/50 max-h-[300px] overflow-y-auto">
          {requests.map((req) => (
            <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-800">{req.party_name}</h4>
                  <span className="text-xs font-mono px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{req.party_code}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500 space-x-3">
                  <span className="flex items-center">
                    <span className="font-medium mr-1">Requested by:</span> {req.requested_by_name}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {req.requested_at ? formatDistanceToNow(new Date(req.requested_at), { addSuffix: true }) : 'Recently'}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                <label className="cursor-pointer">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-1.5 bg-white border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 w-full sm:w-auto" 
                    disabled={uploadingId === req.id}
                    asChild
                  >
                    <span>
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingId === req.id ? 'Importing...' : 'Upload Ledger'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, req.id, req.party_code)}
                    disabled={uploadingId === req.id}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LedgerRequestsPanel;
