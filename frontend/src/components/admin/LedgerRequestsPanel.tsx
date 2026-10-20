import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, Clock, FileText, CheckCircle, Share2, 
  Eye, Copy, Download, ExternalLink, Phone, MessageSquare
} from 'lucide-react';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import LedgerModal from '@/pages/InventoryManagement/modals/LedgerModal';

interface LedgerReq {
  id: number;
  party_code: string;
  party_name: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  requested_by_name: string;
  requested_by_email: string;
  status: string;
  document_type?: string;
  other_document_name?: string;
  requested_at: string;
  completed_at: string | null;
  file_url?: string | null;
  file_name?: string | null;
}

const LedgerRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<LedgerReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [activeLedgerPartyCode, setActiveLedgerPartyCode] = useState<string | null>(null);
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
      // 1. First fulfill request via fulfill endpoint (supports PDF, Excel, Word, Images)
      const res = await api.post(`/busy/ledger-requests/${reqId}/fulfill`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 2. If it's an Excel or CSV file, also sync transactions into the database
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        try {
          const importFormData = new FormData();
          importFormData.append('file', file);
          await api.post(`/busy/import-ledger`, importFormData, {
            params: { party_code: partyCode },
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (importErr) {
          console.warn('Database transaction import note:', importErr);
        }
      }

      if (res.data?.success) {
        toast({ 
          title: '✓ Document Uploaded', 
          description: `Ledger document "${file.name}" uploaded and request fulfilled successfully.` 
        });
        fetchRequests();
      } else {
        toast({ 
          title: 'Upload Failed', 
          description: res.data?.message || 'Failed to fulfill ledger request', 
          variant: 'destructive' 
        });
      }
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.response?.data?.message || 'Failed to upload ledger file', 
        variant: 'destructive' 
      });
    } finally {
      setUploadingId(null);
      event.target.value = '';
    }
  };

  const handleShareWhatsApp = (req: LedgerReq) => {
    const cleanPhone = (req.phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    let text = `*Kamla Enterprises - Ledger Update*\n\n` +
      `*Party:* ${req.party_name}\n` +
      `*Party Code:* ${req.party_code}\n` +
      `*Requested by:* ${req.requested_by_name || 'Admin'}\n` +
      `*Status:* ${req.status === 'COMPLETED' ? 'Fulfilled ✓' : 'Pending Upload'}\n`;
      
    if (req.file_url) {
      text += `*Download Ledger / Statement:* ${req.file_url}\n`;
    }
    text += `\nFor any queries, please reply directly.`;

    const encoded = encodeURIComponent(text);
    const url = phoneParam ? `https://wa.me/${phoneParam}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyDetails = (req: LedgerReq) => {
    let text = `Party: ${req.party_name} (${req.party_code})\n` +
      `Requested by: ${req.requested_by_name}\n` +
      `Status: ${req.status}`;
    if (req.file_url) text += `\nDocument Link: ${req.file_url}`;

    navigator.clipboard.writeText(text);
    toast({
      title: '✓ Details Copied',
      description: 'Party & ledger request details copied to clipboard.',
    });
  };

  if (loading) return null;

  if (requests.length === 0) return null;

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/30 shadow-xs">
        <CardHeader className="pb-3 border-b border-orange-100 bg-orange-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-lg text-orange-900">Pending Ledger Requests ({requests.length})</CardTitle>
            </div>
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 font-bold">
              Requires Action
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-orange-100/60 max-h-[380px] overflow-y-auto">
            {requests.map((req) => (
              <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/60 transition-colors">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 text-sm">{req.party_name}</h4>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                      {req.party_code}
                    </span>
                    {req.document_type && req.document_type !== 'LEDGER' && (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                        {req.other_document_name || req.document_type}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center text-xs text-gray-500 gap-3 flex-wrap">
                    <span className="flex items-center">
                      <span className="font-medium mr-1 text-gray-700">Requested by:</span> {req.requested_by_name || 'Admin'}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-gray-400" />
                      {req.requested_at ? formatDistanceToNow(new Date(req.requested_at), { addSuffix: true }) : 'Recently'}
                    </span>
                    {req.phone && (
                      <span className="flex items-center text-emerald-700 font-medium">
                        <Phone className="w-3 h-3 mr-1" />
                        {req.phone} {req.contact_person ? `(${req.contact_person})` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Action Toolbar: Upload, Share WhatsApp, View Ledger, Copy */}
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {/* View Party Ledger Modal */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveLedgerPartyCode(req.party_code)}
                    className="h-8 text-xs font-semibold gap-1 bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                    title="View party ledger & transactions"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ledger</span>
                  </Button>

                  {/* WhatsApp Share */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareWhatsApp(req)}
                    className="h-8 text-xs font-semibold gap-1 bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700"
                    title="Share details via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Share</span>
                  </Button>

                  {/* Copy Link / Summary */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyDetails(req)}
                    className="h-8 w-8 p-0 bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
                    title="Copy details"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>

                  {/* Upload / Fulfill Button */}
                  <label className="cursor-pointer">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1.5 bg-orange-600 text-white hover:bg-orange-700 hover:text-white border-transparent font-bold shadow-2xs" 
                      disabled={uploadingId === req.id}
                      asChild
                    >
                      <span>
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingId === req.id ? 'Uploading...' : 'Upload Ledger'}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg"
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

      {/* Interactive Ledger Viewer Modal */}
      {activeLedgerPartyCode && (
        <LedgerModal
          isOpen={true}
          onClose={() => setActiveLedgerPartyCode(null)}
          defaultSearch={activeLedgerPartyCode}
        />
      )}
    </>
  );
};

export default LedgerRequestsPanel;
