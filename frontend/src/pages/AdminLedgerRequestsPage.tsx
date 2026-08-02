import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { api } from '@/api/client';
import { Loader2, FileText, CheckCircle, Clock, Upload, Download, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface LedgerReq {
  id: number;
  party_code: string;
  party_name: string;
  requested_by_name: string;
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

const AdminLedgerRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<LedgerReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingReqIdRef = useRef<number | null>(null);

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
      toast({ title: 'Error', description: 'Failed to fetch ledger requests.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const triggerFileUpload = (reqId: number) => {
    pendingReqIdRef.current = reqId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const reqId = pendingReqIdRef.current;
    if (!file || !reqId) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingId(reqId);
    try {
      const res = await api.post(`/busy/ledger-requests/${reqId}/fulfill`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        toast({ title: 'Success', description: `File "${file.name}" uploaded and request fulfilled!` });
        fetchRequests();
      } else {
        toast({ title: 'Failed', description: res.data?.message || 'Could not fulfill request', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to upload file', variant: 'destructive' });
    } finally {
      setUploadingId(null);
      pendingReqIdRef.current = null;
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2"><FileText className="w-7 h-7 text-primary" /> Document Request Hub</h1>
          <p className="page-subheader">Fulfill document requests from the Sales team by uploading files.</p>
        </div>
        
        <div className="w-full sm:w-64">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Requests</SelectItem>
              <SelectItem value="PENDING">Pending Upload</SelectItem>
              <SelectItem value="COMPLETED">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-gray-50/50">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-lg">No requests found</p>
              <p className="text-sm">There are no document requests matching this filter.</p>
            </div>
          ) : (
            <div className="p-4">
              <DataTable
                columns={['Document & Party', 'Request Details', 'Requested By', 'Status', 'Action']}
                rows={requests.map(req => {
                  let docLabel = req.document_type === 'OTHER' ? (req.other_document_name || 'Other') : (req.document_type || 'Ledger');
                  if (req.document_type === 'PRICELIST') docLabel = 'Price List';

                  return [
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px] bg-blue-50 text-blue-700">{docLabel}</Badge>
                    <p className="font-bold text-gray-900 text-sm">{req.party_name}</p>
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
                    <p className="text-sm font-medium">{req.requested_by_name || 'System'}</p>
                  </div>,
                  <div className="space-y-1">
                    {req.status === 'PENDING' ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" /> Fulfilled
                      </Badge>
                    )}
                    <p className="text-xs text-gray-500">
                      Req: {formatDistanceToNow(new Date(req.requested_at), { addSuffix: true })}
                    </p>
                    {req.completed_at && (
                      <p className="text-xs text-green-600">
                        Done: {formatDistanceToNow(new Date(req.completed_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>,
                  <div className="space-y-2">
                    {req.status === 'PENDING' ? (
                      <Button size="sm" disabled={uploadingId === req.id} className="bg-blue-600 hover:bg-blue-700" onClick={() => triggerFileUpload(req.id)}>
                        {uploadingId === req.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload & Fulfill
                      </Button>
                    ) : (
                      <div className="space-y-1">
                        {req.file_url ? (
                          <a href={req.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full">
                              <Download className="w-3 h-3 mr-1" />
                              {req.file_name || 'Download'}
                            </Button>
                          </a>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                            <CheckCircle className="w-3 h-3 mr-1" /> Done
                          </Badge>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs text-gray-500 w-full" onClick={() => triggerFileUpload(req.id)} disabled={uploadingId === req.id}>
                          {uploadingId === req.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                          Re-upload
                        </Button>
                      </div>
                    )}
                  </div>
                ];
              })}
            />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLedgerRequestsPage;


