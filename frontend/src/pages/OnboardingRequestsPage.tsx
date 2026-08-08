import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingService } from '@/api/services/onboarding.service';
import { PartyOnboardingRequest, DealerExtendedData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Printer, Eye, Edit, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const FilePreview: React.FC<{ file: File | string }> = ({ file }) => {
  if (typeof file === 'string') {
    return (
      <a href={file} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100">
        <Eye className="w-3 h-3" /> View Uploaded Document
      </a>
    );
  }
  
  if (file.type && file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    return (
      <div className="mt-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group w-20 h-20 rounded border border-gray-200 shadow-sm overflow-hidden bg-gray-50">
          <img src={url} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white">
            <Eye className="w-4 h-4" />
          </div>
        </a>
        <p className="text-[10px] text-green-600 truncate mt-1 max-w-[150px]">Selected: {file.name}</p>
      </div>
    );
  }
  
  return <p className="text-xs text-green-600 truncate mt-2 bg-green-50 px-2 py-1 rounded border border-green-100 inline-block">Selected: {file.name}</p>;
};
const OnboardingRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [requests, setRequests] = useState<PartyOnboardingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(!!location.state?.prefillLead);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  const openEditModal = (req: PartyOnboardingRequest, viewOnly: boolean) => {
    setEditingId(req.id || null);
    setEditingStatus(req.status || null);
    setIsViewOnly(viewOnly);
    setPartyType(req.partyType as 'DEALER' | 'DISTRIBUTOR');
    setPartyName(req.partyName);
    setCityOrArea(req.cityOrArea);
    setGstNumber(req.gstNumber || '');
    setAddress(req.address);
    setPhone(req.phone);
    setEmail(req.email || '');
    setContactPerson(req.contactPerson || '');
    if (req.extendedData) {
      setExtendedData({ ...extendedData, ...req.extendedData });
    }
    setFiles({
      docAadhaarFront: req.docAadhaarFront || null,
      docAadhaarBack: req.docAadhaarBack || null,
      docPan: req.docPan || null,
      docGst: req.docGst || null,
      docAddressProof: req.docAddressProof || null,
      docUdhyam: req.docUdhyam || null,
      docPersonPhoto: req.docPersonPhoto || null,
      docSignedForm: req.docSignedForm || null,
      docSecurityCheques: req.docSecurityCheques || [],
      docShowroomPhotos: req.docShowroomPhotos || [],
    });
    setIsDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingId(null);
    setEditingStatus(null);
    setIsViewOnly(false);
    // Reset fields
    setPartyType('DEALER');
    setPartyName('');
    setCityOrArea('');
    setGstNumber('');
    setAddress('');
    setPhone('');
    setEmail('');
    setContactPerson('');
    setExtendedData({
      faxNo: '', bankName: '', bankAccountType: 'Savings', bankAccountNo: '', bankSignatory: '',
      firmStatus: 'Proprietorship', existingDealerships: [], proprietorDetails: [], associateFirms: '',
      turnoverLast3Years: ['', '', ''], securityDeposit: { ddChequeNo: '', date: '', amount: '', bank: '', payableAt: '' },
      chequeBankName: '', chequeNumbers: '', isRegisteredDealer: false, personsEmployed: '',
      hasGodown: false, godownAddress: '', godownArea: '', godownCapacity: '', godownConstruction: 'Permanent', godownOwnership: 'Owned',
      expectedMonthlySales: '', priorExperience: '', otherRelevantInfo: ''
    });
    setFiles({ docAadhaarFront: null, docAadhaarBack: null, docPan: null, docGst: null, docAddressProof: null, docUdhyam: null, docSecurityCheques: [], docPersonPhoto: null, docShowroomPhotos: [] });
    setIsDialogOpen(true);
  };


  // Basic Form State
  const prefill = location.state?.prefillLead || {};
  const [partyType, setPartyType] = useState<'DEALER' | 'DISTRIBUTOR'>('DEALER');
  const [partyName, setPartyName] = useState(prefill.name || '');
  const [cityOrArea, setCityOrArea] = useState(prefill.address || '');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState(prefill.address || '');
  const [phone, setPhone] = useState(prefill.phone || '');
  const [email, setEmail] = useState(prefill.email || '');
  const [contactPerson, setContactPerson] = useState(prefill.contactPerson || prefill.name || '');

  // Extended Data State
  const [extendedData, setExtendedData] = useState<DealerExtendedData>({
    faxNo: '',
    bankName: '',
    bankAccountType: 'Savings',
    bankAccountNo: '',
    bankSignatory: '',
    firmStatus: 'Proprietorship',
    existingDealerships: [],
    proprietorDetails: [],
    associateFirms: '',
    turnoverLast3Years: ['', '', ''],
    securityDeposit: { ddChequeNo: '', date: '', amount: '', bank: '', payableAt: '' },
    chequeBankName: '',
    chequeNumbers: '',
    isRegisteredDealer: false,
    personsEmployed: '',
    hasGodown: false,
    godownAddress: '',
    godownArea: '',
    godownCapacity: '',
    godownConstruction: 'Permanent',
    expectedMonthlySales: '',
    experience: '',
    financialStanding: '',
    marketReputation: 'Good'
  });

  // Files State
  const [files, setFiles] = useState<{ [key: string]: File | File[] | string | string[] | (string | File)[] | null }>({
    docAadhaarFront: null, docAadhaarBack: null, docPan: null, docGst: null, docAddressProof: null,
    docUdhyam: null, docSecurityCheques: [], docPersonPhoto: null, docShowroomPhotos: [], docSignedForm: null
  });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.multiple) {
        const newFiles = Array.from(e.target.files);
        setFiles((prev) => {
          const existing = Array.isArray(prev[fieldName]) ? (prev[fieldName] as File[]) : [];
          return { ...prev, [fieldName]: [...existing, ...newFiles] };
        });
        e.target.value = '';
      } else {
        setFiles((prev) => ({ ...prev, [fieldName]: e.target.files![0] }));
      }
    }
  };

  const removeFile = (fieldName: string, index: number) => {
    setFiles((prev) => {
      const existing = Array.isArray(prev[fieldName]) ? (prev[fieldName] as File[]) : [];
      const updated = [...existing];
      updated.splice(index, 1);
      return { ...prev, [fieldName]: updated };
    });
  };

  const isMultiFieldDisabled = (baseKey: string) => {
    if (isViewOnly) return true;
    if (editingId && editingStatus === 'APPROVED') return true;
    if (editingId && editingStatus === 'REJECTED') {
      const reviews = extendedData.fieldReviews || {};
      for (const key of Object.keys(reviews)) {
        if (key.startsWith(baseKey + '_') && reviews[key].status === 'REJECTED') {
          return false;
        }
      }
      return true;
    }
    return false;
  };

  const isFieldDisabled = (key: string) => {
    if (isViewOnly) return true;
    if (editingId && editingStatus === 'APPROVED') {
      return key !== 'docSignedForm';
    }
    if (editingId && editingStatus === 'REJECTED') {
      const reviews = extendedData.fieldReviews || {};
      return reviews[key]?.status !== 'REJECTED';
    }
    return false;
  };

  const FieldFeedback = ({ fieldKey }: { fieldKey: string }) => {
    const review = extendedData.fieldReviews?.[fieldKey];
    if (!review) return null;
    return (
      <div className={`text-xs mt-1 font-medium ${review.status === 'REJECTED' ? 'text-red-600' : 'text-green-600'}`}>
        {review.status === 'REJECTED' ? '❌ Rejected' : '✅ Approved'}
        {review.comment && `: ${review.comment}`}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!partyName || !cityOrArea || !address || !phone || !contactPerson) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    
    // Determine if Save as Draft or Submit
    const submitter = (e.nativeEvent as any).submitter as HTMLButtonElement | null;
    const targetStatus = submitter?.value === 'DRAFT' ? 'DRAFT' : 'PENDING';

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('status', targetStatus);
      formData.append('partyType', partyType);
      formData.append('partyName', partyName);
      formData.append('cityOrArea', cityOrArea);
      formData.append('gstNumber', gstNumber);
      formData.append('address', address);
      formData.append('phone', phone);
      formData.append('email', email);
      formData.append('contactPerson', contactPerson);
      
      formData.append('extendedData', JSON.stringify(extendedData));

      Object.keys(files).forEach((key) => {
        const fileData = files[key];
        if (Array.isArray(fileData)) {
          fileData.forEach((f) => formData.append(key, f));
        } else if (fileData) {
          formData.append(key, fileData as File);
        }
      });

      if (editingId) {
        await onboardingService.update(editingId, formData);
        toast({ title: 'Success', description: 'Onboarding request updated successfully!' });
      } else {
        await onboardingService.create(formData);
        toast({ title: 'Success', description: 'Onboarding request submitted successfully!' });
      }
      setIsDialogOpen(false);
      fetchRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to submit request', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for dynamic tables
  const addProprietor = () => {
    setExtendedData(prev => ({
      ...prev,
      proprietorDetails: [...(prev.proprietorDetails || []), { name: '', dob: '', fathersName: '', maritalStatus: '' }]
    }));
  };
  const updateProprietor = (index: number, field: string, value: string) => {
    const updated = [...(extendedData.proprietorDetails || [])];
    updated[index] = { ...updated[index], [field]: value };
    setExtendedData(prev => ({ ...prev, proprietorDetails: updated }));
  };
  const removeProprietor = (index: number) => {
    const updated = [...(extendedData.proprietorDetails || [])];
    updated.splice(index, 1);
    setExtendedData(prev => ({ ...prev, proprietorDetails: updated }));
  };

  const addDealership = () => {
    setExtendedData(prev => ({
      ...prev,
      existingDealerships: [...(prev.existingDealerships || []), { companyName: '', products: '', quantity: '', remarks: '' }]
    }));
  };
  const updateDealership = (index: number, field: string, value: string) => {
    const updated = [...(extendedData.existingDealerships || [])];
    updated[index] = { ...updated[index], [field]: value };
    setExtendedData(prev => ({ ...prev, existingDealerships: updated }));
  };
  const removeDealership = (index: number) => {
    const updated = [...(extendedData.existingDealerships || [])];
    updated.splice(index, 1);
    setExtendedData(prev => ({ ...prev, existingDealerships: updated }));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Onboarding Requests</h1>
          <p className="text-gray-500">Submit and track dealer/distributor onboarding applications.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="bg-primary hover:bg-primary-dark">
              <Plus className="mr-2 h-4 w-4" /> Submit New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[800px] w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 border-b shrink-0">
              <DialogTitle className="text-2xl">
                {isViewOnly ? 'View Onboarding Request' : editingId ? 'Edit Onboarding Request' : 'Submit New Dealer/Distributor'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-8">
                
                {/* 1. Basic Information */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">1. Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Party Type</Label>
                      <Select disabled={isFieldDisabled('partyType')} value={partyType} onValueChange={(val: any) => setPartyType(val)}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="DEALER">Dealer</SelectItem><SelectItem value="DISTRIBUTOR">Distributor</SelectItem></SelectContent>
                      </Select>
                      <FieldFeedback fieldKey="partyType" />
                    </div>
                    <div className="space-y-2">
                      <Label>Firm Name *</Label>
                      <Input required value={partyName} onChange={(e) => setPartyName(e.target.value)} className="bg-white" disabled={isFieldDisabled('firmName')} />
                      <FieldFeedback fieldKey="firmName" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Person *</Label>
                      <Input required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="bg-white" disabled={isFieldDisabled('contactPerson')} />
                      <FieldFeedback fieldKey="contactPerson" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input required value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white" disabled={isFieldDisabled('phone')} />
                      <FieldFeedback fieldKey="phone" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white" disabled={isFieldDisabled('email')} />
                      <FieldFeedback fieldKey="email" />
                    </div>
                    <div className="space-y-2">
                      <Label>Fax No</Label>
                      <Input value={extendedData.faxNo} onChange={(e) => setExtendedData({...extendedData, faxNo: e.target.value})} className="bg-white" disabled={isFieldDisabled('faxNo')} />
                      <FieldFeedback fieldKey="faxNo" />
                    </div>
                    <div className="space-y-2">
                      <Label>City / Area *</Label>
                      <Input required value={cityOrArea} onChange={(e) => setCityOrArea(e.target.value)} className="bg-white" disabled={isFieldDisabled('cityArea')} />
                      <FieldFeedback fieldKey="cityArea" />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Number</Label>
                      <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="bg-white" disabled={isFieldDisabled('gSTNumber')} />
                      <FieldFeedback fieldKey="gSTNumber" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Registered Address *</Label>
                      <Input required value={address} onChange={(e) => setAddress(e.target.value)} className="bg-white" disabled={isFieldDisabled('registeredAddress')} />
                      <FieldFeedback fieldKey="registeredAddress" />
                    </div>
                  </div>
                </div>

                {/* 2. Bank Details */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">2. Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Name & Address of Bank</Label>
                      <Input value={extendedData.bankName} onChange={(e) => setExtendedData({...extendedData, bankName: e.target.value})} className="bg-white" disabled={isFieldDisabled('nameAddressBank')} />
                      <FieldFeedback fieldKey="nameAddressBank" />
                    </div>
                    <div className="space-y-2">
                      <Label>Type of A/c</Label>
                      <Select disabled={isFieldDisabled('typeofAc')} value={extendedData.bankAccountType} onValueChange={(val: any) => setExtendedData({...extendedData, bankAccountType: val})}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Savings">Savings</SelectItem>
                          <SelectItem value="Current">Current</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldFeedback fieldKey="typeofAc" />
                    </div>
                    <div className="space-y-2">
                      <Label>Account No</Label>
                      <Input value={extendedData.bankAccountNo} onChange={(e) => setExtendedData({...extendedData, bankAccountNo: e.target.value})} className="bg-white" disabled={isFieldDisabled('accountNo')} />
                      <FieldFeedback fieldKey="accountNo" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Name of Authorised Signatory</Label>
                      <Input value={extendedData.bankSignatory} onChange={(e) => setExtendedData({...extendedData, bankSignatory: e.target.value})} className="bg-white" disabled={isFieldDisabled('nameAuthorised')} />
                      <FieldFeedback fieldKey="nameAuthorised" />
                    </div>
                  </div>
                </div>

                {/* 3. Status & Existing Dealerships */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">3. Business Status</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status of Firm</Label>
                        <Select disabled={isFieldDisabled('statusofFirm')} value={extendedData.firmStatus} onValueChange={(val: any) => setExtendedData({...extendedData, firmStatus: val})}>
                          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                            <SelectItem value="Partnership">Partnership</SelectItem>
                            <SelectItem value="Limited Company">Limited Company</SelectItem>
                            <SelectItem value="Private Ltd. Co.">Private Ltd. Co.</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldFeedback fieldKey="statusofFirm" />
                      </div>
                      <div className="space-y-2 flex flex-col justify-end">
                        <label className="flex items-center space-x-2 text-sm font-medium">
                          <input type="checkbox" checked={extendedData.isRegisteredDealer} disabled={isFieldDisabled('areYouRegisteredDealer')} onChange={(e) => setExtendedData({...extendedData, isRegisteredDealer: e.target.checked})} className="rounded border-gray-300" />
                          <span>Are you a registered dealer?</span>
                        </label>
                        <FieldFeedback fieldKey="areYouRegisteredDealer" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Existing Dealerships (Name of firm/company under which dealership exist)</Label>
                        {!isViewOnly && <Button type="button" variant="outline" size="sm" onClick={addDealership}><Plus className="w-4 h-4 mr-1"/> Add</Button>}
                      </div>
                      {extendedData.existingDealerships?.map((d, i) => (
                        <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                          <Input disabled={isViewOnly} placeholder="Company Name" value={d.companyName} onChange={e => updateDealership(i, 'companyName', e.target.value)} className="bg-white" />
                          <Input disabled={isViewOnly} placeholder="Products" value={d.products} onChange={e => updateDealership(i, 'products', e.target.value)} className="bg-white" />
                          <Input disabled={isViewOnly} placeholder="Qty" value={d.quantity} onChange={e => updateDealership(i, 'quantity', e.target.value)} className="bg-white w-24" />
                          {!isViewOnly && <Button type="button" variant="ghost" size="icon" onClick={() => removeDealership(i)}><Trash2 className="w-4 h-4 text-red-500"/></Button>}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center">
                        <Label>Details of Proprietor/Partners/Directors</Label>
                        {!isViewOnly && <Button type="button" variant="outline" size="sm" onClick={addProprietor}><Plus className="w-4 h-4 mr-1"/> Add</Button>}
                      </div>
                      {extendedData.proprietorDetails?.map((p, i) => (
                        <div key={i} className="flex flex-col gap-2 bg-gray-50 p-4 rounded border">
                          <div className="flex gap-2 items-start">
                            <div className="flex-1 space-y-1">
                              <Label className="text-[10px] text-gray-500 uppercase">Full Name</Label>
                              <Input disabled={isViewOnly} placeholder="Name" value={p.name} onChange={e => updateProprietor(i, 'name', e.target.value)} className="bg-white" />
                            </div>
                            <div className="w-40 space-y-1">
                              <Label className="text-[10px] text-gray-500 uppercase">Date of Birth</Label>
                              <Input disabled={isViewOnly} type="date" value={p.dob} onChange={e => updateProprietor(i, 'dob', e.target.value)} className="bg-white" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-[10px] text-gray-500 uppercase">Father's Name</Label>
                              <Input disabled={isViewOnly} placeholder="Father's Name" value={p.fathersName} onChange={e => updateProprietor(i, 'fathersName', e.target.value)} className="bg-white" />
                            </div>
                            <div className="w-32 space-y-1">
                              <Label className="text-[10px] text-gray-500 uppercase">Marital Status</Label>
                              <Input disabled={isViewOnly} placeholder="Single / Married" value={p.maritalStatus} onChange={e => updateProprietor(i, 'maritalStatus', e.target.value)} className="bg-white" />
                            </div>
                            {!isViewOnly && (
                              <div className="pt-5">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeProprietor(i)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-4 mt-2">
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs">Aadhaar Card (Partner {i+1})</Label>
                              {!isViewOnly && <Input type="file" onChange={(e) => handleFileChange(e, `proprietorAadhaar_${i}`)} className="bg-white text-xs" />}
                              {files[`proprietorAadhaar_${i}`] && <FilePreview file={files[`proprietorAadhaar_${i}`] as File | string} />}
                              {isViewOnly && extendedData[`proprietorAadhaar_${i}`] && !files[`proprietorAadhaar_${i}`] && <FilePreview file={extendedData[`proprietorAadhaar_${i}`]} />}
                            </div>
                            <div className="space-y-1 flex-1">
                              <Label className="text-xs">PAN Card (Partner {i+1})</Label>
                              {!isViewOnly && <Input type="file" onChange={(e) => handleFileChange(e, `proprietorPan_${i}`)} className="bg-white text-xs" />}
                              {files[`proprietorPan_${i}`] && <FilePreview file={files[`proprietorPan_${i}`] as File | string} />}
                              {isViewOnly && extendedData[`proprietorPan_${i}`] && !files[`proprietorPan_${i}`] && <FilePreview file={extendedData[`proprietorPan_${i}`]} />}
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
                        <Input disabled={isFieldDisabled('turnoverLast3Yrs')} placeholder="Yr 1" value={extendedData.turnoverLast3Years?.[0]} onChange={e => {const t = [...(extendedData.turnoverLast3Years||[])]; t[0] = e.target.value; setExtendedData({...extendedData, turnoverLast3Years: t})}} className="bg-white" />
                        <Input disabled={isFieldDisabled('turnoverLast3Yrs')} placeholder="Yr 2" value={extendedData.turnoverLast3Years?.[1]} onChange={e => {const t = [...(extendedData.turnoverLast3Years||[])]; t[1] = e.target.value; setExtendedData({...extendedData, turnoverLast3Years: t})}} className="bg-white" />
                        <Input disabled={isFieldDisabled('turnoverLast3Yrs')} placeholder="Yr 3" value={extendedData.turnoverLast3Years?.[2]} onChange={e => {const t = [...(extendedData.turnoverLast3Years||[])]; t[2] = e.target.value; setExtendedData({...extendedData, turnoverLast3Years: t})}} className="bg-white" />
                      </div>
                      <FieldFeedback fieldKey="turnoverLast3Yrs" />
                    </div>
                    <div className="space-y-2">
                      <Label>No. of Persons Employed</Label>
                      <Input disabled={isFieldDisabled('noofPersonsEmployed')} value={extendedData.personsEmployed} onChange={(e) => setExtendedData({...extendedData, personsEmployed: e.target.value})} className="bg-white" />
                      <FieldFeedback fieldKey="noofPersonsEmployed" />
                    </div>
                  </div>

                  <h4 className="font-medium mb-2">Security Deposit (If Any)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                    <Input disabled={isViewOnly} placeholder="DD/Cheque No" value={extendedData.securityDeposit?.ddChequeNo} onChange={e => setExtendedData({...extendedData, securityDeposit: {...extendedData.securityDeposit!, ddChequeNo: e.target.value}})} className="bg-white" />
                    <Input disabled={isViewOnly} placeholder="Bank" value={extendedData.securityDeposit?.bank} onChange={e => setExtendedData({...extendedData, securityDeposit: {...extendedData.securityDeposit!, bank: e.target.value}})} className="bg-white" />
                    <Input disabled={isViewOnly} placeholder="Payable At" value={extendedData.securityDeposit?.payableAt} onChange={e => setExtendedData({...extendedData, securityDeposit: {...extendedData.securityDeposit!, payableAt: e.target.value}})} className="bg-white" />
                  </div>

                  <h4 className="font-medium mb-2 mt-4 text-primary">Cheque Submission Details (For Printing Letter)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-blue-50 p-4 rounded border border-blue-100">
                    <div className="space-y-2">
                      <Label>Cheque Bank Name</Label>
                      <Input disabled={isViewOnly} placeholder="e.g. HDFC Bank" value={extendedData.chequeBankName} onChange={(e) => setExtendedData({...extendedData, chequeBankName: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cheque Numbers</Label>
                      <Input disabled={isViewOnly} placeholder="Comma separated, e.g. 100234, 100235" value={extendedData.chequeNumbers} onChange={(e) => setExtendedData({...extendedData, chequeNumbers: e.target.value})} className="bg-white" />
                    </div>
                  </div>

                  <h4 className="font-medium mb-2">Godown Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col justify-end">
                        <label className="flex items-center space-x-2 text-sm font-medium">
                          <input disabled={isFieldDisabled('doyouhavegodownfacility')} type="checkbox" checked={extendedData.hasGodown} onChange={(e) => setExtendedData({...extendedData, hasGodown: e.target.checked})} className="rounded border-gray-300" />
                          <span>Do you have godown facility?</span>
                        </label>
                        <FieldFeedback fieldKey="doyouhavegodownfacility" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Godown Address</Label>
                      <Input disabled={isFieldDisabled('godownAddress') || !extendedData.hasGodown} value={extendedData.godownAddress} onChange={(e) => setExtendedData({...extendedData, godownAddress: e.target.value})} className="bg-white" />
                      <FieldFeedback fieldKey="godownAddress" />
                    </div>
                    <div className="space-y-2">
                      <Label>Area (sq. feet)</Label>
                      <Input disabled={isFieldDisabled('areasqfeet') || !extendedData.hasGodown} value={extendedData.godownArea} onChange={(e) => setExtendedData({...extendedData, godownArea: e.target.value})} className="bg-white" />
                      <FieldFeedback fieldKey="areasqfeet" />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity (in bags)</Label>
                      <Input disabled={isFieldDisabled('capacityinbags') || !extendedData.hasGodown} value={extendedData.godownCapacity} onChange={(e) => setExtendedData({...extendedData, godownCapacity: e.target.value})} className="bg-white" />
                      <FieldFeedback fieldKey="capacityinbags" />
                    </div>
                  </div>
                </div>

                {/* 5. Document Uploads */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b pb-2">5. Document Uploads</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { label: 'Aadhaar (Front)', key: 'docAadhaarFront', multiple: false },
                      { label: 'Aadhaar (Back)', key: 'docAadhaarBack', multiple: false },
                      { label: 'PAN Card', key: 'docPan', multiple: false },
                      { label: 'GST Certificate', key: 'docGst', multiple: false },
                      { label: 'Address Proof', key: 'docAddressProof', multiple: false },
                      { label: 'Udhyam Certificate', key: 'docUdhyam', multiple: false },
                      { label: 'Person Photo', key: 'docPersonPhoto', multiple: false },
                    ].map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label}</Label>
                        {!isViewOnly && <Input type="file" disabled={isFieldDisabled(field.key)} onChange={(e) => handleFileChange(e, field.key)} className="bg-white text-xs" />}
                        {files[field.key] && <FilePreview file={files[field.key] as File | string} />}
                        <FieldFeedback fieldKey={field.key} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 space-y-6">
                    <div className="space-y-2">
                      <Label>Security Cheques (Multiple)</Label>
                      {!isViewOnly && <Input type="file" multiple disabled={isMultiFieldDisabled('docSecurityCheque')} onChange={(e) => handleFileChange(e, 'docSecurityCheques')} className="bg-white text-xs" />}
                      {Array.isArray(files.docSecurityCheques) && files.docSecurityCheques.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-3">
                          {(files.docSecurityCheques as (File|string)[]).map((f, idx) => (
                            <div key={idx} className="flex flex-col items-start bg-gray-50 p-2 rounded border">
                              <FilePreview file={f} />
                              {!isFieldDisabled(`docSecurityCheque_${idx}`) && !isViewOnly && <button type="button" onClick={() => removeFile('docSecurityCheques', idx)} className="text-red-500 text-xs mt-2 font-medium hover:underline flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>}
                              <FieldFeedback fieldKey={`docSecurityCheque_${idx}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Showroom Photos (Multiple)</Label>
                      {!isViewOnly && <Input type="file" multiple disabled={isMultiFieldDisabled('docShowroomPhoto')} onChange={(e) => handleFileChange(e, 'docShowroomPhotos')} className="bg-white text-xs" />}
                      {Array.isArray(files.docShowroomPhotos) && files.docShowroomPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-3">
                          {(files.docShowroomPhotos as (File|string)[]).map((f, idx) => (
                            <div key={idx} className="flex flex-col items-start bg-gray-50 p-2 rounded border">
                              <FilePreview file={f} />
                              {!isFieldDisabled(`docShowroomPhoto_${idx}`) && !isViewOnly && <button type="button" onClick={() => removeFile('docShowroomPhotos', idx)} className="text-red-500 text-xs mt-2 font-medium hover:underline flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>}
                              <FieldFeedback fieldKey={`docShowroomPhoto_${idx}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Signed Dealer Forms (Multiple)</Label>
                      {!isViewOnly && <Input type="file" multiple disabled={isMultiFieldDisabled('docSignedForm')} onChange={(e) => handleFileChange(e, 'docSignedForm')} className="bg-white text-xs" />}
                      {Array.isArray(files.docSignedForm) && files.docSignedForm.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-3">
                          {(files.docSignedForm as (File|string)[]).map((f, idx) => (
                            <div key={idx} className="flex flex-col items-start bg-gray-50 p-2 rounded border">
                              <FilePreview file={f} />
                              {!isFieldDisabled(`docSignedForm_${idx}`) && !isViewOnly && <button type="button" onClick={() => removeFile('docSignedForm', idx)} className="text-red-500 text-xs mt-2 font-medium hover:underline flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>}
                              <FieldFeedback fieldKey={`docSignedForm_${idx}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="flex justify-end pt-4 border-t gap-4 p-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              {!isViewOnly && (
                <>
                  {editingStatus !== 'APPROVED' && (
                    <Button form="onboarding-form" type="submit" name="status" value="DRAFT" variant="secondary" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save as Draft'}
                    </Button>
                  )}
                  <Button 
                    form="onboarding-form" 
                    type="submit" 
                    name="status" 
                    value={editingStatus === 'APPROVED' ? 'APPROVED' : 'PENDING'} 
                    className="bg-primary hover:bg-primary-dark" 
                    disabled={isSubmitting || (editingStatus === 'APPROVED' && !files.docSignedForm)}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Submitting...' : (editingStatus === 'APPROVED' ? 'Submit Signed Form' : 'Submit Request')}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-primary/20 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Firm Name</TableHead>
                <TableHead>Area</TableHead>
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
                    <TableCell><span className="font-semibold">{req.partyType}</span></TableCell>
                    <TableCell>
                      <div className="font-medium">{req.partyName}</div>
                      <div className="text-xs text-gray-500">{req.partyType}</div>
                      {req.status === 'COMPLETED' && req.createdPartyId && (
                        <div className="mt-1 text-xs font-semibold text-green-700 bg-green-50 inline-block px-2 py-0.5 rounded border border-green-200">
                          Code: {req.createdPartyId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{req.cityOrArea}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        req.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        req.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {req.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 items-center justify-end flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(req, true)} className="h-8 px-2">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(req.status === 'DRAFT' || req.status === 'REJECTED') && (
                          <Button variant="outline" size="sm" onClick={() => openEditModal(req, false)} className="h-8 px-2" title="Edit Request">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Link to={`/sales/onboarding/${req.id}/print`} target="_blank">
                          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 h-8">
                            <Printer className="h-4 w-4 mr-2" /> Download
                          </Button>
                        </Link>
                      </div>
                      {req.status === 'REJECTED' && (
                        <span className="text-xs text-red-500 block mt-1" title={req.remarks}>{req.remarks?.substring(0,20)}...</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingRequestsPage;
