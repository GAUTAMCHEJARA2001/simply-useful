import sys

file_path = r'd:\cost 2\simply-useful\simply-useful\simply-useful\backend\api\serializers.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace 1
old_1 = """    docShowroomPhotos = serializers.JSONField(source='doc_showroom_photos', required=False, allow_null=True)
    docSignedForm = serializers.CharField(source='doc_signed_form', required=False, allow_null=True)
    
    createdPartyId = serializers.CharField(source='created_party_id', required=False, allow_null=True)"""

new_1 = """    docShowroomPhotos = serializers.JSONField(source='doc_showroom_photos', required=False, allow_null=True)
    docSignedForm = serializers.CharField(source='doc_signed_form', required=False, allow_null=True)
    
    extendedData = serializers.JSONField(source='extended_data', required=False, allow_null=True)
    
    createdPartyId = serializers.CharField(source='created_party_id', required=False, allow_null=True)"""

# Replace 2
old_2 = """            'docAadhaarFront', 'docAadhaarBack', 'docPan', 'docGst', 'docAddressProof', 'docUdhyam', 
            'docSecurityCheques', 'docPersonPhoto', 'docShowroomPhotos', 'docSignedForm',
            'status', 'remarks', 'createdPartyId', 'submittedBy', 'reviewedBy', 'companyId', 'createdAt', 'updatedAt', 'reviewedAt'"""

new_2 = """            'docAadhaarFront', 'docAadhaarBack', 'docPan', 'docGst', 'docAddressProof', 'docUdhyam', 
            'docSecurityCheques', 'docPersonPhoto', 'docShowroomPhotos', 'docSignedForm',
            'status', 'remarks', 'extendedData', 'createdPartyId', 'submittedBy', 'reviewedBy', 'companyId', 'createdAt', 'updatedAt', 'reviewedAt'"""

if old_1 in content and old_2 in content:
    content = content.replace(old_1, new_1)
    content = content.replace(old_2, new_2)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched serializers.py successfully")
else:
    print("Could not find exact text to replace.")
