import re

with open(r'd:\cost 2\simply-useful\simply-useful\simply-useful\frontend\src\pages\OnboardingRequestsPage.tsx', 'r', encoding='utf-8') as f:
    orig = f.read()

# Extract the form block
start_tag = '<form id="onboarding-form"'
end_tag = '</form>'
start_idx = orig.find(start_tag)
end_idx = orig.find(end_tag, start_idx) + len(end_tag)
form_html = orig[start_idx:end_idx]

# Remove the Submit button
form_html = re.sub(r'\{!isViewOnly && \(.*?\)\}', '', form_html, flags=re.DOTALL)

# Convert all states to use selectedRequest
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
    'value={d.companyName}': 'value={d.companyName}', # inside map, handled manually below
}

for k, v in replacements.items():
    form_html = form_html.replace(f'value={{{k}}}', f'value={{{v}}}')
    form_html = form_html.replace(f'value={{{k} || \'\'}}', f'value={{{v} || \'\'}}')

# Add disabled and readOnly to inputs
form_html = re.sub(r'onChange=\{[^\}]+\}', 'readOnly disabled', form_html)
# Also handle any multi-line onChange if they exist
form_html = re.sub(r'onChange=\{e => [^\}]+\}', 'readOnly disabled', form_html)
form_html = re.sub(r'onChange=\{\(e\) => [^\}]+\}', 'readOnly disabled', form_html)

# Handle maps for Dealerships and Proprietors
form_html = form_html.replace('extendedData.existingDealerships?.map((d, i)', 'selectedRequest?.extendedData?.existingDealerships?.map((d: any, i: number)')
form_html = form_html.replace('extendedData.proprietorDetails?.map((p, i)', 'selectedRequest?.extendedData?.proprietorDetails?.map((p: any, i: number)')

# Handle file uploads section - replace it with the admin one
# I will just write the script to replace the entire DialogContent

admin_file_path = r'd:\cost 2\simply-useful\simply-useful\simply-useful\frontend\src\pages\AdminOnboardingPage.tsx'
with open(admin_file_path, 'r', encoding='utf-8') as f:
    admin_content = f.read()

# We need to manually build the new DialogContent
# I'll output it to a new file and then we can review it
with open(r'd:\cost 2\simply-useful\simply-useful\simply-useful\frontend\_scratch\new_dialog.txt', 'w', encoding='utf-8') as f:
    f.write(form_html)
print("Extracted form HTML")
