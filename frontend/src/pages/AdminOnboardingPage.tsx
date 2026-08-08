import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { onboardingService } from '@/api/services/onboarding.service';
import { PartyOnboardingRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


const ReviewableField: React.FC<{
  label: string,
  fieldKey: string,
  value: React.ReactNode,
  status: 'APPROVED' | 'REJECTED' | null,
  comment: string,
  onStatusChange: (key: string, st: 'APPROVED'|'REJECTED'|null) => void,
  onCommentChange: (key: string, val: string) => void,
  className?: string,
  isReadOnly?: boolean
}> = ({ label, fieldKey, value, status, comment, onStatusChange, onCommentChange, className, isReadOnly = false }) => (
  <div className={`space-y-2 ${className || ''}`}>
    <div className="flex justify-between items-center bg-gray-50 px-2 py-1 border rounded-t">
      <Label className="font-semibold text-gray-700 text-xs">{label}</Label>
      <div className="flex gap-1">
        <Button disabled={isReadOnly} type="button" variant={status === 'APPROVED' ? 'default' : 'outline'} size="sm" className={`h-6 px-2 text-[10px] ${status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'text-gray-500 hover:text-green-600'}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(fieldKey, status === 'APPROVED' ? null : 'APPROVED'); }}>OK</Button>
        <Button disabled={isReadOnly} type="button" variant={status === 'REJECTED' ? 'destructive' : 'outline'} size="sm" className={`h-6 px-2 text-[10px] ${status === 'REJECTED' ? '' : 'text-gray-500 hover:text-red-600'}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(fieldKey, status === 'REJECTED' ? null : 'REJECTED'); }}>Reject</Button>
      </div>
    </div>
    <div className="px-2 pb-2 pt-1 border border-t-0 rounded-b bg-white">
      {value}
      {status === 'REJECTED' && (
        <Input disabled={isReadOnly} placeholder="Reason for rejection..." value={comment} onChange={e => onCommentChange(fieldKey, e.target.value)} className="mt-2 text-xs h-7 border-red-200 focus-visible:ring-red-500" />
      )}
    </div>
  </div>
);

const AdminOnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PartyOnboardingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { users, distributors } = useData();
  const salesUsers = users.filter(u => u.role === 'SALES' && u.active);
  
  const [selectedRequest, setSelectedRequest] = useState<PartyOnboardingRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [signedFormFile, setSignedFormFile] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const extendedData = selectedRequest?.extendedData || {};

  const [fieldStatuses, setFieldStatuses] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  const [fieldComments, setFieldComments] = useState<Record<string, string>>({});
  
  const [dealerForm, setDealerForm] = useState({
    partyName: '', cityOrArea: '', address: '', phone: '', email: '', gstNumber: '', contactPerson: '',
    creditLimit: 0, outstanding: 0, territory: '', assignedSoEmail: '', distributorName: ''
  });

  useEffect(() => {
    if (selectedRequest) {
      setDealerForm({
        partyName: selectedRequest.partyName || '',
        cityOrArea: selectedRequest.cityOrArea || '',
        address: selectedRequest.address || '',
        phone: selectedRequest.phone || '',
        email: selectedRequest.email || '',
        gstNumber: selectedRequest.gstNumber || '',
        contactPerson: selectedRequest.contactPerson || '',
        creditLimit: 0,
        outstanding: 0,
        territory: '',
        assignedSoEmail: selectedRequest.submittedBy?.email || '',
        distributorName: ''
      });
      const savedState = localStorage.getItem(`admin_review_${selectedRequest.id}`);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setFieldStatuses(parsed.statuses || {});
          setFieldComments(parsed.comments || {});
          return;
        } catch(e) {}
      }

      if (selectedRequest.extendedData?.fieldReviews) {
        const reviews = selectedRequest.extendedData.fieldReviews;
        const initialStatuses: any = {};
        const initialComments: any = {};
        for (const [key, rev] of Object.entries(reviews) as any) {
          initialStatuses[key] = rev.status;
          initialComments[key] = rev.comment || '';
        }
        setFieldStatuses(initialStatuses);
        setFieldComments(initialComments);
      } else {
        setFieldStatuses({});
        setFieldComments({});
      }
    } else {
      setFieldStatuses({});
      setFieldComments({});
    }
  }, [selectedRequest]);

  const handleStatusChange = (key: string, status: 'APPROVED' | 'REJECTED' | null) => {
    setFieldStatuses(prev => {
      const next = { ...prev, [key]: status as any };
      if (selectedRequest?.id) {
        localStorage.setItem(`admin_review_${selectedRequest.id}`, JSON.stringify({ statuses: next, comments: fieldComments }));
      }
      return next;
    });
  };
  const handleCommentChange = (key: string, comment: string) => {
    setFieldComments(prev => {
      const next = { ...prev, [key]: comment };
      if (selectedRequest?.id) {
        localStorage.setItem(`admin_review_${selectedRequest.id}`, JSON.stringify({ statuses: fieldStatuses, comments: next }));
      }
      return next;
    });
  };


  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await onboardingService.getAll();
      setRequests(data.results || data.data || data || []);
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to fetch onboarding requests', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleVerify = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    // Package field reviews
    const fieldReviews: any = {};
    let hasRejections = false;
    for (const key of Object.keys(fieldStatuses)) {
      fieldReviews[key] = {
        status: fieldStatuses[key],
        comment: fieldComments[key] || ''
      };
      if (fieldStatuses[key] === 'REJECTED') hasRejections = true;
    }
    
    if (status === 'REJECTED' && !hasRejections && !rejectRemarks) {
      toast({ title: 'Error', description: 'Please reject at least one field or provide a reason.', variant: 'destructive' });
      return;
    }

    const finalRemarks = status === 'REJECTED' ? (hasRejections ? 'Some fields require correction. Please review the feedback.' : rejectRemarks) : 'Approved successfully';
    
    try {
      setIsProcessing(true);
      await onboardingService.verify(id, status, finalRemarks, fieldReviews);
      toast({ title: 'Success', description: `Request marked as ${status}` });
      setIsReviewOpen(false);
      localStorage.removeItem(`admin_review_${id}`);
      await fetchRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update request', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async (id: string) => {
    if (signedFormFile.length === 0 && (!selectedRequest?.docSignedForm || selectedRequest.docSignedForm.length === 0)) {
      toast({ title: 'Error', description: 'Please upload the Signed Form', variant: 'destructive' });
      return;
    }
    
    try {
      setIsProcessing(true);
      const formData = new FormData();
      if (signedFormFile.length > 0) {
        signedFormFile.forEach((file) => {
          formData.append('docSignedForm', file);
        });
      }
      formData.append('partyName', dealerForm.partyName);
      formData.append('cityOrArea', dealerForm.cityOrArea);
      formData.append('address', dealerForm.address);
      formData.append('phone', dealerForm.phone);
      formData.append('email', dealerForm.email);
      formData.append('gstNumber', dealerForm.gstNumber);
      formData.append('contactPerson', dealerForm.contactPerson);
      formData.append('creditLimit', dealerForm.creditLimit.toString());
      formData.append('outstanding', dealerForm.outstanding.toString());
      formData.append('territory', dealerForm.territory);
      formData.append('assignedSoEmail', dealerForm.assignedSoEmail);
      formData.append('distributorName', dealerForm.distributorName);
      
      await onboardingService.finalizeAndCreateDealer(id, formData);
      toast({ title: 'Success', description: 'Dealer created successfully!' });
      
      setSignedFormFile([]);
      await fetchRequests();
      setIsReviewOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to finalize request', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openReview = (req: PartyOnboardingRequest) => {
    setSelectedRequest(req);
    setIsReviewOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Onboarding Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>SO Name</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No requests found</TableCell></TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.createdAt ? format(new Date(req.createdAt), 'dd MMM yyyy') : ''}</TableCell>
                      <TableCell>{req.submittedBy?.name || req.submittedBy?.email}</TableCell>
                      <TableCell>
                        <div className="font-medium">{req.partyName}</div>
                        <div className="text-xs text-gray-500">{req.partyType}</div>
                      </TableCell>
                      <TableCell>{req.cityOrArea}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {req.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openReview(req)}>
                          <FileText className="h-4 w-4 mr-2" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Review Onboarding: {selectedRequest?.partyName}</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (<React.Fragment>
            <div className="space-y-6 py-4 bg-gray-50/50 -mx-6 px-6">
              <div className="space-y-8">
                
                {/* 1. Basic Information */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">1. Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Party Type</Label>
                      <Select value={selectedRequest?.partyType} disabled>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="DEALER">Dealer</SelectItem><SelectItem value="DISTRIBUTOR">Distributor</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Firm Name *" fieldKey="firmName" value={<Input required value={selectedRequest?.partyName} readOnly disabled className="bg-white" />} status={fieldStatuses['firmName'] || null} comment={fieldComments['firmName'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Contact Person *" fieldKey="contactPerson" value={<Input required value={selectedRequest?.contactPerson} readOnly disabled className="bg-white" />} status={fieldStatuses['contactPerson'] || null} comment={fieldComments['contactPerson'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Phone *" fieldKey="phone" value={<Input required value={selectedRequest?.phone} readOnly disabled className="bg-white" />} status={fieldStatuses['phone'] || null} comment={fieldComments['phone'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Email" fieldKey="email" value={<Input type="email" value={selectedRequest?.email} readOnly disabled className="bg-white" />} status={fieldStatuses['email'] || null} comment={fieldComments['email'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Fax No" fieldKey="faxNo" value={<Input value={extendedData.faxNo} readOnly disabled className="bg-white" />} status={fieldStatuses['faxNo'] || null} comment={fieldComments['faxNo'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="City / Area *" fieldKey="cityArea" value={<Input required value={selectedRequest?.cityOrArea} readOnly disabled className="bg-white" />} status={fieldStatuses['cityArea'] || null} comment={fieldComments['cityArea'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="GST Number" fieldKey="gSTNumber" value={<Input value={selectedRequest?.gstNumber} readOnly disabled className="bg-white" />} status={fieldStatuses['gSTNumber'] || null} comment={fieldComments['gSTNumber'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} className="col-span-2 space-y-2" label="Registered Address *" fieldKey="registeredAddress" value={<Input required value={selectedRequest?.address} readOnly disabled className="bg-white" />} status={fieldStatuses['registeredAddress'] || null} comment={fieldComments['registeredAddress'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                  </div>
                </div>

                {/* 2. Bank Details */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">2. Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} className="col-span-2 space-y-2" label="Name & Address of Bank" fieldKey="nameAddressofBank" value={<Input value={extendedData.bankName} readOnly disabled className="bg-white" />} status={fieldStatuses['nameAddressofBank'] || null} comment={fieldComments['nameAddressofBank'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <div className="space-y-2">
                      <Label>Type of A/c</Label>
                      <Select value={extendedData.bankAccountType} disabled>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Savings">Savings</SelectItem>
                          <SelectItem value="Current">Current</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Account No" fieldKey="accountNo" value={<Input value={extendedData.bankAccountNo} readOnly disabled className="bg-white" />} status={fieldStatuses['accountNo'] || null} comment={fieldComments['accountNo'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} className="col-span-2 space-y-2" label="Name of Authorised Signatory" fieldKey="nameofAuthorisedSignatory" value={<Input value={extendedData.bankSignatory} readOnly disabled className="bg-white" />} status={fieldStatuses['nameofAuthorisedSignatory'] || null} comment={fieldComments['nameofAuthorisedSignatory'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                  </div>
                </div>

                {/* 3. Status & Existing Dealerships */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">3. Business Status</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status of Firm</Label>
                        <Select value={extendedData.firmStatus} disabled>
                          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                            <SelectItem value="Partnership">Partnership</SelectItem>
                            <SelectItem value="Limited Company">Limited Company</SelectItem>
                            <SelectItem value="Private Ltd. Co.">Private Ltd. Co.</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 flex flex-col justify-end">
                        <label className="flex items-center space-x-2 text-sm font-medium">
                          <input type="checkbox" checked={extendedData.isRegisteredDealer} readOnly disabled className="rounded border-gray-300" />
                          <span>Are you a registered dealer?</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Existing Dealerships (Name of firm/company under which dealership exist)</Label>
                        
                      </div>
                      {selectedRequest?.extendedData?.existingDealerships?.map((d: any, i: number) => (
                        <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                          <Input placeholder="Company Name" value={d.companyName || ""} readOnly disabled className="bg-white" />
                          <Input placeholder="Products" value={d.products || ""} readOnly disabled className="bg-white" />
                          <Input placeholder="Qty" value={d.quantity || ""} readOnly disabled className="bg-white w-24" />
                          
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center">
                        <Label>Details of Proprietor/Partners/Directors</Label>
                        
                      </div>
                      {selectedRequest?.extendedData?.proprietorDetails?.map((p: any, i: number) => (
                        <div key={i} className="flex flex-col gap-2 bg-gray-50 p-4 rounded border">
                          <div className="flex gap-2 items-center">
                            <Input placeholder="Name" value={p.name || ""} readOnly disabled className="bg-white flex-1" />
                            <Input placeholder="DOB" type="date" value={p.dob || ""} readOnly disabled className="bg-white w-40" />
                            <Input placeholder="Father's Name" value={p.fathersName || ""} readOnly disabled className="bg-white flex-1" />
                            <Input placeholder="Marital Status" value={p.maritalStatus || ""} readOnly disabled className="bg-white w-32" />
                          </div>
                          <div className="flex gap-4 mt-2">
                            <div className="flex-1">
                              <ReviewableField
                                label={`Partner ${i + 1} Aadhaar`}
                                fieldKey={`proprietorAadhaar_${i}`}
                                status={fieldStatuses[`proprietorAadhaar_${i}`] || null}
                                comment={fieldComments[`proprietorAadhaar_${i}`] || ''}
                                onStatusChange={handleStatusChange}
                                onCommentChange={handleCommentChange}
                                value={
                                  selectedRequest?.extendedData?.[`proprietorAadhaar_${i}`] ? (
                                    <a href={selectedRequest.extendedData[`proprietorAadhaar_${i}`]} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex flex-col items-center pt-2">
                                      <img src={selectedRequest.extendedData[`proprietorAadhaar_${i}`]} alt="Partner Aadhaar" className="h-20 w-auto object-cover mb-2 border rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                      <span className="hidden text-gray-500">📄 View File</span>
                                    </a>
                                  ) : (
                                    <div className="text-xs text-gray-400 italic text-center py-4">Not provided</div>
                                  )
                                }
                              />
                            </div>
                            <div className="flex-1">
                              <ReviewableField
                                label={`Partner ${i + 1} PAN`}
                                fieldKey={`proprietorPan_${i}`}
                                status={fieldStatuses[`proprietorPan_${i}`] || null}
                                comment={fieldComments[`proprietorPan_${i}`] || ''}
                                onStatusChange={handleStatusChange}
                                onCommentChange={handleCommentChange}
                                value={
                                  selectedRequest?.extendedData?.[`proprietorPan_${i}`] ? (
                                    <a href={selectedRequest.extendedData[`proprietorPan_${i}`]} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex flex-col items-center pt-2">
                                      <img src={selectedRequest.extendedData[`proprietorPan_${i}`]} alt="Partner PAN" className="h-20 w-auto object-cover mb-2 border rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                      <span className="hidden text-gray-500">📄 View File</span>
                                    </a>
                                  ) : (
                                    <div className="text-xs text-gray-400 italic text-center py-4">Not provided</div>
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Operations & Security */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">4. Operations & Security</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label>Turnover (Last 3 Yrs in Lacs)</Label>
                      <div className="flex gap-2">
                        <Input placeholder="Yr 1" value={extendedData.turnoverLast3Years?.[0]} readOnly disabled className="bg-white" />
                        <Input placeholder="Yr 2" value={extendedData.turnoverLast3Years?.[1]} readOnly disabled className="bg-white" />
                        <Input placeholder="Yr 3" value={extendedData.turnoverLast3Years?.[2]} readOnly disabled className="bg-white" />
                      </div>
                    </div>
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="No. of Persons Employed" fieldKey="noofPersonsEmployed" value={<Input value={extendedData.personsEmployed} readOnly disabled className="bg-white" />} status={fieldStatuses['noofPersonsEmployed'] || null} comment={fieldComments['noofPersonsEmployed'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                  </div>

                  <h4 className="font-medium mb-2">Security Deposit (If Any)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                    <Input placeholder="DD/Cheque No" value={extendedData.securityDeposit?.ddChequeNo} readOnly disabled className="bg-white" />
                    <Input placeholder="Bank" value={extendedData.securityDeposit?.bank} readOnly disabled className="bg-white" />
                    <Input placeholder="Payable At" value={extendedData.securityDeposit?.payableAt} readOnly disabled className="bg-white" />
                  </div>

                  <h4 className="font-medium mb-2 mt-4 text-primary">Cheque Submission Details (For Printing Letter)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-blue-50 p-4 rounded border border-blue-100">
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Cheque Bank Name" fieldKey="chequeBankName" value={<Input placeholder="e.g. HDFC Bank" value={extendedData.chequeBankName} readOnly disabled className="bg-white" />} status={fieldStatuses['chequeBankName'] || null} comment={fieldComments['chequeBankName'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Cheque Numbers" fieldKey="chequeNumbers" value={<Input placeholder="Comma separated, e.g. 100234, 100235" value={extendedData.chequeNumbers} readOnly disabled className="bg-white" />} status={fieldStatuses['chequeNumbers'] || null} comment={fieldComments['chequeNumbers'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                  </div>

                  <h4 className="font-medium mb-2">Godown Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col justify-end">
                        <label className="flex items-center space-x-2 text-sm font-medium">
                          <input type="checkbox" checked={extendedData.hasGodown} readOnly disabled className="rounded border-gray-300" />
                          <span>Do you have godown facility?</span>
                        </label>
                    </div>
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} className="col-span-2 space-y-2" label="Godown Address" fieldKey="godownAddress" value={<Input value={extendedData.godownAddress} readOnly className="bg-white" disabled={!extendedData.hasGodown} />} status={fieldStatuses['godownAddress'] || null} comment={fieldComments['godownAddress'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Area (sq. feet)" fieldKey="areasqfeet" value={<Input value={extendedData.godownArea} readOnly className="bg-white" disabled={!extendedData.hasGodown} />} status={fieldStatuses['areasqfeet'] || null} comment={fieldComments['areasqfeet'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                    <ReviewableField isReadOnly={selectedRequest.status === 'APPROVED'} label="Capacity (in bags)" fieldKey="capacityinbags" value={<Input value={extendedData.godownCapacity} readOnly className="bg-white" disabled={!extendedData.hasGodown} />} status={fieldStatuses['capacityinbags'] || null} comment={fieldComments['capacityinbags'] || ''} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} />
                  </div>
                </div>

                </div>
              <div className="bg-white p-6 rounded-lg border shadow-sm mt-8">
                <h3 className="font-semibold text-lg mb-4 border-b pb-2">Uploaded Documents</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Aadhaar (Front)', url: selectedRequest.docAadhaarFront, key: 'docAadhaarFront' },
                    { label: 'Aadhaar (Back)', url: selectedRequest.docAadhaarBack, key: 'docAadhaarBack' },
                    { label: 'PAN', url: selectedRequest.docPan, key: 'docPan' },
                    { label: 'GST', url: selectedRequest.docGst, key: 'docGst' },
                    { label: 'Address Proof', url: selectedRequest.docAddressProof, key: 'docAddressProof' },
                    { label: 'Udhyam', url: selectedRequest.docUdhyam, key: 'docUdhyam' },
                    { label: 'Person Photo', url: selectedRequest.docPersonPhoto, key: 'docPersonPhoto' },
                  ].map((doc, idx) => (
                    <ReviewableField
                      key={idx}
                      label={doc.label}
                      fieldKey={doc.key}
                      status={fieldStatuses[doc.key] || null}
                      comment={fieldComments[doc.key] || ''}
                      onStatusChange={handleStatusChange}
                      onCommentChange={handleCommentChange}
                      value={
                        doc.url ? (
                          <a href={doc.url as string} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex flex-col items-center pt-2">
                            <img src={doc.url as string} alt={doc.label} className="h-20 w-auto object-cover mb-2 border rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                            <span className="hidden text-gray-500">📄 View File</span>
                          </a>
                        ) : (
                          <div className="text-xs text-gray-400 italic text-center py-4">Not provided</div>
                        )
                      }
                    />
                  ))}
                  {selectedRequest.docSecurityCheques && selectedRequest.docSecurityCheques.map((url, idx) => (
                    <ReviewableField
                      key={`sec_${idx}`}
                      label={`Security Cheque ${idx + 1}`}
                      fieldKey={`docSecurityCheque_${idx}`}
                      status={fieldStatuses[`docSecurityCheque_${idx}`] || null}
                      comment={fieldComments[`docSecurityCheque_${idx}`] || ''}
                      onStatusChange={handleStatusChange}
                      onCommentChange={handleCommentChange}
                      value={
                        <a href={url as string} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex flex-col items-center pt-2">
                          <img src={url as string} alt="Security Cheque" className="h-20 w-auto object-cover mb-2 border rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                          <span className="hidden text-gray-500">📄 View File</span>
                        </a>
                      }
                    />
                  ))}
                  {selectedRequest.docShowroomPhotos && selectedRequest.docShowroomPhotos.map((url, idx) => (
                    <ReviewableField
                      key={`show_${idx}`}
                      label={`Showroom Photo ${idx + 1}`}
                      fieldKey={`docShowroomPhoto_${idx}`}
                      status={fieldStatuses[`docShowroomPhoto_${idx}`] || null}
                      comment={fieldComments[`docShowroomPhoto_${idx}`] || ''}
                      onStatusChange={handleStatusChange}
                      onCommentChange={handleCommentChange}
                      value={
                        <a href={url as string} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex flex-col items-center pt-2">
                          <img src={url as string} alt="Showroom" className="h-20 w-auto object-cover mb-2 border rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                          <span className="hidden text-gray-500">📄 View File</span>
                        </a>
                      }
                    />
                  ))}
                </div>
              </div>

            </div>

            {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'REJECTED') && (
                <div className="border-t pt-4 mt-6 flex justify-end items-center gap-4 p-4 rounded-lg bg-gray-50">
                  {Object.values(fieldStatuses).includes('REJECTED') ? (
                    <div className="flex w-full items-center justify-between">
                      <p className="text-red-600 font-medium text-sm flex-1">You have rejected one or more fields. The application will be sent back to the Sales Officer for correction.</p>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleVerify(selectedRequest.id!, 'REJECTED')}
                        disabled={isProcessing}
                      >
                        <X className="mr-2 h-4 w-4" /> Submit Feedback to Sales Officer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex w-full items-center justify-between">
                      <p className="text-green-600 font-medium text-sm flex-1">All fields look good. You can now verify and approve this application.</p>
                      <Button 
                        className="bg-green-600 hover:bg-green-700" 
                        onClick={() => handleVerify(selectedRequest.id!, 'APPROVED')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Verify Application
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedRequest.status === 'APPROVED' && (
                <div className="border-t pt-4 mt-6 flex flex-col items-start gap-4 bg-blue-50 p-6 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-blue-900 text-lg">Finalize & Create {selectedRequest.partyType}</h4>
                    <p className="text-sm text-blue-700">Review the auto-filled details below, make any final corrections, upload the signed form, and create the {selectedRequest.partyType.toLowerCase()}.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full bg-white p-4 rounded border border-blue-100">
                    <div className="space-y-2">
                      <Label className="text-xs">Party Name</Label>
                      <Input value={dealerForm.partyName} onChange={(e) => setDealerForm({...dealerForm, partyName: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">City/Area</Label>
                      <Input value={dealerForm.cityOrArea} onChange={(e) => setDealerForm({...dealerForm, cityOrArea: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs">Address</Label>
                      <Input value={dealerForm.address} onChange={(e) => setDealerForm({...dealerForm, address: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Phone</Label>
                      <Input value={dealerForm.phone} onChange={(e) => setDealerForm({...dealerForm, phone: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={dealerForm.email} onChange={(e) => setDealerForm({...dealerForm, email: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">GST Number</Label>
                      <Input value={dealerForm.gstNumber} onChange={(e) => setDealerForm({...dealerForm, gstNumber: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Contact Person</Label>
                      <Input value={dealerForm.contactPerson} onChange={(e) => setDealerForm({...dealerForm, contactPerson: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Territory (Area Code)</Label>
                      <Input value={dealerForm.territory} onChange={(e) => setDealerForm({...dealerForm, territory: e.target.value})} placeholder="e.g. T-WEST" className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Assigned SO *</Label>
                      <Select value={dealerForm.assignedSoEmail} onValueChange={v => setDealerForm({...dealerForm, assignedSoEmail: v})}>
                        <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Select SO" /></SelectTrigger>
                        <SelectContent>
                          {salesUsers.filter(u => u.email).map(u => <SelectItem key={u.email} value={u.email}>{u.name} ({u.email})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Credit Limit</Label>
                      <Input type="number" value={dealerForm.creditLimit} onChange={(e) => setDealerForm({...dealerForm, creditLimit: Number(e.target.value)})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Outstanding</Label>
                      <Input type="number" value={dealerForm.outstanding} onChange={(e) => setDealerForm({...dealerForm, outstanding: Number(e.target.value)})} className="bg-white" />
                    </div>
                    {selectedRequest.partyType === 'DEALER' && (
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="text-xs">Distributor</Label>
                        <Select value={dealerForm.distributorName || 'None'} onValueChange={v => setDealerForm({...dealerForm, distributorName: v === 'None' ? '' : v})}>
                          <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Select Distributor" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">None / Direct Dealer</SelectItem>
                            {Array.from(new Set(distributors.map(d => d.distributorName).filter(Boolean))).map(name => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex w-full items-end space-x-4 mt-2">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs font-semibold">Signed Form (Scanned) *</Label>
                      {Array.isArray(selectedRequest.docSignedForm) && selectedRequest.docSignedForm.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {selectedRequest.docSignedForm.map((url, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-gray-50 border p-2 rounded text-sm">
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-gray-700">Uploaded by SO ({idx + 1})</span>
                              <a href={url as string} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-auto flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" /> View
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : selectedRequest.docSignedForm && !Array.isArray(selectedRequest.docSignedForm) ? (
                        <div className="flex items-center gap-2 bg-gray-50 border p-2 rounded text-sm">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">Uploaded by SO</span>
                          <a href={selectedRequest.docSignedForm as string} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-auto flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> View
                          </a>
                        </div>
                      ) : (
                        <Input 
                          type="file" 
                          multiple
                          accept="image/*,.pdf" 
                          onChange={(e) => setSignedFormFile(e.target.files ? Array.from(e.target.files) : [])}
                          className="bg-white"
                        />
                      )}
                    </div>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 h-10" 
                      onClick={() => handleFinalize(selectedRequest.id!)}
                      disabled={isProcessing || (signedFormFile.length === 0 && (!selectedRequest.docSignedForm || selectedRequest.docSignedForm.length === 0)) || !dealerForm.partyName || !dealerForm.cityOrArea}
                    >
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Create {selectedRequest.partyType}
                    </Button>
                  </div>
                </div>
              )}
          </React.Fragment>)}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOnboardingPage;
