import sys

file_path = r'd:\cost 2\simply-useful\simply-useful\simply-useful\frontend\src\pages\OnboardingRequestsPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add lucide icons Eye and Edit
if "Eye," not in content:
    content = content.replace("Printer,", "Printer, Eye, Edit,")

# 2. Add editingId and isViewOnly states
state_target = "const [isDialogOpen, setIsDialogOpen] = useState(!!location.state?.prefillLead);"
state_replacement = """const [isDialogOpen, setIsDialogOpen] = useState(!!location.state?.prefillLead);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  const openEditModal = (req: PartyOnboardingRequest, viewOnly: boolean) => {
    setEditingId(req.id);
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
    setIsDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingId(null);
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
"""
content = content.replace(state_target, state_replacement)

# 3. Update 'Submit New Request' button to use handleAddNew
content = content.replace("onClick={() => setIsDialogOpen(true)}", "onClick={handleAddNew}")

# 4. Update Dialog title based on state
content = content.replace("<DialogTitle>Submit New Dealer/Distributor</DialogTitle>", "<DialogTitle>{isViewOnly ? 'View Request' : editingId ? 'Edit Request' : 'Submit New Dealer/Distributor'}</DialogTitle>")

# 5. Make form readonly if isViewOnly, and hide submit button
form_target = '<form onSubmit={handleSubmit} className="space-y-6 mt-4">'
form_replacement = '<form onSubmit={handleSubmit} className={`space-y-6 mt-4 ${isViewOnly ? "pointer-events-none opacity-90" : ""}`}>'
content = content.replace(form_target, form_replacement)

submit_btn_target = """<Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Application'}
                </Button>"""
submit_btn_replacement = """{!isViewOnly && (
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : (editingId ? 'Update Application' : 'Submit Application')}
                </Button>
              )}"""
content = content.replace(submit_btn_target, submit_btn_replacement)

# 6. Update handleSubmit to call update if editingId
submit_logic_target = """      const response = await onboardingService.create(formData);
      toast({ title: 'Success', description: 'Onboarding request submitted successfully.' });"""
submit_logic_replacement = """      if (editingId) {
        await onboardingService.update(editingId, formData);
        toast({ title: 'Success', description: 'Onboarding request updated successfully.' });
      } else {
        await onboardingService.create(formData);
        toast({ title: 'Success', description: 'Onboarding request submitted successfully.' });
      }"""
content = content.replace(submit_logic_target, submit_logic_replacement)

# 7. Add View and Edit buttons to the table actions
actions_target = """                      <div className="flex flex-col gap-2 items-end">
                        <Link to={`/sales/onboarding/${req.id}/print`} target="_blank">
                          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 w-full justify-start">
                            <Printer className="mr-2 h-4 w-4" /> Print Form
                          </Button>
                        </Link>
                      </div>"""
actions_replacement = """                      <div className="flex gap-2 items-center justify-end flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(req, true)} className="h-8 px-2">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {req.status === 'PENDING' && (
                          <Button variant="outline" size="sm" onClick={() => openEditModal(req, false)} className="h-8 px-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Link to={`/sales/onboarding/${req.id}/print`} target="_blank">
                          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10 h-8">
                            <Printer className="mr-1 h-3 w-3" /> Print
                          </Button>
                        </Link>
                      </div>"""
content = content.replace(actions_target, actions_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched OnboardingRequestsPage.tsx successfully")
