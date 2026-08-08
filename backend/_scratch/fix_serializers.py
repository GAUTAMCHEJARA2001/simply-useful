import sys

file_path = r'd:\cost 2\simply-useful\simply-useful\simply-useful\backend\api\serializers.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

serializer_code = """
class PartyOnboardingSerializer(serializers.ModelSerializer):
    partyType = serializers.CharField(source='party_type', required=False)
    partyName = serializers.CharField(source='party_name')
    cityOrArea = serializers.CharField(source='city_or_area')
    gstNumber = serializers.CharField(source='gst_number', required=False, allow_null=True, allow_blank=True)
    contactPerson = serializers.CharField(source='contact_person')
    
    docAadhaarFront = serializers.CharField(source='doc_aadhaar_front', required=False, allow_null=True)
    docAadhaarBack = serializers.CharField(source='doc_aadhaar_back', required=False, allow_null=True)
    docPan = serializers.CharField(source='doc_pan', required=False, allow_null=True)
    docGst = serializers.CharField(source='doc_gst', required=False, allow_null=True)
    docAddressProof = serializers.CharField(source='doc_address_proof', required=False, allow_null=True)
    docUdhyam = serializers.CharField(source='doc_udhyam', required=False, allow_null=True)
    docSecurityCheques = serializers.JSONField(source='doc_security_cheques', required=False, allow_null=True)
    docPersonPhoto = serializers.CharField(source='doc_person_photo', required=False, allow_null=True)
    docShowroomPhotos = serializers.JSONField(source='doc_showroom_photos', required=False, allow_null=True)
    docSignedForm = serializers.CharField(source='doc_signed_form', required=False, allow_null=True)
    
    extendedData = serializers.JSONField(source='extended_data', required=False, allow_null=True)
    
    createdPartyId = serializers.CharField(source='created_party_id', required=False, allow_null=True)
    
    submittedBy = UserSerializer(source='submitted_by', read_only=True)
    reviewedBy = UserSerializer(source='reviewed_by', read_only=True)
    
    companyId = serializers.CharField(source='companyid_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    reviewedAt = serializers.DateTimeField(source='reviewed_at', read_only=True)

    class Meta:
        from api.models import PartyOnboardingRequest
        model = PartyOnboardingRequest
        fields = [
            'id', 'partyType', 'partyName', 'cityOrArea', 'gstNumber', 'address', 'phone', 'email', 'contactPerson',
            'docAadhaarFront', 'docAadhaarBack', 'docPan', 'docGst', 'docAddressProof', 'docUdhyam', 
            'docSecurityCheques', 'docPersonPhoto', 'docShowroomPhotos', 'docSignedForm',
            'status', 'remarks', 'extendedData', 'createdPartyId', 'submittedBy', 'reviewedBy', 'companyId', 'createdAt', 'updatedAt', 'reviewedAt'
        ]
"""

if 'class PartyOnboardingSerializer' not in content:
    with open(file_path, 'a', encoding='utf-8') as f:
        f.write("\n" + serializer_code)
    print("Added PartyOnboardingSerializer successfully")
else:
    print("PartyOnboardingSerializer already exists")
