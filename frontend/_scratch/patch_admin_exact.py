import re

with open(r'd:\cost 2\simply-useful\simply-useful\simply-useful\frontend\src\pages\OnboardingRequestsPage.tsx', 'r', encoding='utf-8') as f:
    orig = f.read()

start_tag = '<form id="onboarding-form"'
end_tag = '</form>'
start_idx = orig.find(start_tag)
end_idx = orig.find(end_tag, start_idx) + len(end_tag)
form_html = orig[start_idx:end_idx]

# Remove the Submit button and form tag
form_html = re.sub(r'<form[^>]*>', '<div className="space-y-8 pointer-events-none opacity-90">', form_html)
form_html = form_html.replace('</form>', '</div>')
form_html = re.sub(r'\{!isViewOnly && \(.*?\)\}', '', form_html, flags=re.DOTALL)

# Remove document uploads section (Admin already has a custom one that displays the images properly)
doc_start = form_html.find('{/* 5. Document Uploads */}')
if doc_start != -1:
    form_html = form_html[:doc_start] + '</div>' # close the form div early

# Replace state variables
replacements = {
    'partyType': 'selectedRequest?.partyType',
    'partyName': 'selectedRequest?.partyName',
    'contactPerson': 'selectedRequest?.contactPerson',
    'phone': 'selectedRequest?.phone',
    'email': 'selectedRequest?.email',
    'cityOrArea': 'selectedRequest?.cityOrArea',
    'gstNumber': 'selectedRequest?.gstNumber',
    'address': 'selectedRequest?.address',
    'extendedData.': 'selectedRequest?.extendedData?.',
}

for k, v in replacements.items():
    form_html = form_html.replace(f'value={{{k}}}', f'value={{{v}}}')
    form_html = form_html.replace(f'value={{{k} || \'\'}}', f'value={{{v} || \'\'}}')

# Remove onChange completely, and add readOnly disabled to all Inputs and Selects
form_html = re.sub(r'\s*onChange=\{[^}]*\}\}', ' readOnly disabled', form_html) # for cases with nested braces
form_html = re.sub(r'\s*onChange=\{[^}]*\}', ' readOnly disabled', form_html)
form_html = re.sub(r'\s*onValueChange=\{[^}]*\}', ' disabled', form_html)

# Handle the mapped lists
form_html = form_html.replace('extendedData.existingDealerships?.map((d, i)', 'selectedRequest?.extendedData?.existingDealerships?.map((d: any, i: number)')
form_html = form_html.replace('extendedData.proprietorDetails?.map((p, i)', 'selectedRequest?.extendedData?.proprietorDetails?.map((p: any, i: number)')
form_html = form_html.replace('value={d.companyName}', 'value={d.companyName || ""}')
form_html = form_html.replace('value={d.products}', 'value={d.products || ""}')
form_html = form_html.replace('value={d.quantity}', 'value={d.quantity || ""}')
form_html = form_html.replace('value={p.name}', 'value={p.name || ""}')
form_html = form_html.replace('value={p.dob}', 'value={p.dob || ""}')
form_html = form_html.replace('value={p.fathersName}', 'value={p.fathersName || ""}')
form_html = form_html.replace('value={p.maritalStatus}', 'value={p.maritalStatus || ""}')

# Remove "Add" buttons and "Trash" buttons
form_html = re.sub(r'<Button type="button" variant="outline"[^>]*>.*?</Button>', '', form_html)
form_html = re.sub(r'<Button type="button" variant="ghost"[^>]*>.*?</Button>', '', form_html)


admin_file_path = r'd:\cost 2\simply-useful\simply-useful\simply-useful\frontend\src\pages\AdminOnboardingPage.tsx'
with open(admin_file_path, 'r', encoding='utf-8') as f:
    admin_content = f.read()

# Splice it in AdminOnboardingPage.tsx
# Find the start of the <div className="space-y-6 py-4"> inside DialogContent
replace_start_marker = '{selectedRequest && ('
replace_end_marker = '{selectedRequest.status === \'PENDING\' && ('

start_idx = admin_content.find(replace_start_marker)
end_idx = admin_content.find(replace_end_marker)

# Keep the Document Uploads from Admin panel because it displays images properly
docs_section = """
              <div className="bg-white p-6 rounded-lg border shadow-sm mt-8">
                <h3 className="font-semibold text-lg mb-4 border-b pb-2">Uploaded Documents</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Aadhaar (Front)', url: selectedRequest.docAadhaarFront },
                    { label: 'Aadhaar (Back)', url: selectedRequest.docAadhaarBack },
                    { label: 'PAN', url: selectedRequest.docPan },
                    { label: 'GST', url: selectedRequest.docGst },
                    { label: 'Address Proof', url: selectedRequest.docAddressProof },
                    { label: 'Udhyam', url: selectedRequest.docUdhyam },
                    { label: 'Person Photo', url: selectedRequest.docPersonPhoto },
                    { label: 'Signed Form (Scanned)', url: selectedRequest.docSignedForm },
                  ].map((doc, idx) => (
                    <div key={idx} className="border rounded-lg p-2 flex flex-col items-center text-center">
                      <span className="text-sm font-medium mb-2">{doc.label}</span>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex flex-col items-center">
                          <img src={doc.url} alt={doc.label} className="h-20 w-auto object-cover mb-2 border rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                          <span className="hidden text-gray-500">📄 View File</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not provided</span>
                      )}
                    </div>
                  ))}
                  {selectedRequest.docSecurityCheques && selectedRequest.docSecurityCheques.map((url, idx) => (
                    <div key={`sec_${idx}`} className="border rounded-lg p-2 flex flex-col items-center text-center">
                      <span className="text-sm font-medium mb-2">Security Cheque {idx + 1}</span>
                      <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex flex-col items-center">
                        <img src={url} alt="Security Cheque" className="h-20 w-auto object-cover mb-2 border rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                        <span className="hidden text-gray-500">📄 View File</span>
                      </a>
                    </div>
                  ))}
                  {selectedRequest.docShowroomPhotos && selectedRequest.docShowroomPhotos.map((url, idx) => (
                    <div key={`show_${idx}`} className="border rounded-lg p-2 flex flex-col items-center text-center">
                      <span className="text-sm font-medium mb-2">Showroom Photo {idx + 1}</span>
                      <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex flex-col items-center">
                        <img src={url} alt="Showroom" className="h-20 w-auto object-cover mb-2 border rounded" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                        <span className="hidden text-gray-500">📄 View File</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
"""

new_content = admin_content[:start_idx + len(replace_start_marker)] + '\n            <div className="space-y-6 py-4 bg-gray-50/50 -mx-6 px-6">\n' + form_html + docs_section + '\n            </div>\n\n            ' + admin_content[end_idx:]

# Missing imports for Select
if 'Select,' not in new_content:
    new_content = new_content.replace('import { Input } from', 'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\nimport { Input } from')

with open(admin_file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Patched AdminOnboardingPage.tsx with exact form layout successfully")
