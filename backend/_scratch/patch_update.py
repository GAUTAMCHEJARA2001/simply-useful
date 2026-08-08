import sys

file_path = r'd:\cost 2\simply-useful\simply-useful\simply-useful\backend\api\views_onboarding.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

update_method_code = """
    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        
        if obj.status != 'PENDING':
            return send_error("Can only edit PENDING requests.", 400)
            
        data = request.data
        
        # We only update fields that are provided
        if 'partyType' in data: obj.party_type = data.get('partyType')
        if 'partyName' in data: obj.party_name = data.get('partyName')
        if 'cityOrArea' in data: obj.city_or_area = data.get('cityOrArea')
        if 'gstNumber' in data: obj.gst_number = data.get('gstNumber')
        if 'address' in data: obj.address = data.get('address')
        if 'phone' in data: obj.phone = data.get('phone')
        if 'email' in data: obj.email = data.get('email')
        if 'contactPerson' in data: obj.contact_person = data.get('contactPerson')
        
        if 'extendedData' in data:
            import json
            try:
                obj.extended_data = json.loads(data.get('extendedData'))
            except:
                pass

        # Handle file updates
        single_doc_fields = [
            'docAadhaarFront', 'docAadhaarBack', 'docPan', 'docGst',
            'docAddressProof', 'docUdhyam', 'docPersonPhoto'
        ]
        
        for field in single_doc_fields:
            if field in request.FILES:
                file_obj = request.FILES[field]
                try:
                    upload_result = cloudinary.uploader.upload(file_obj, folder='onboarding_docs')
                    db_field_name = ''.join(['_' + c.lower() if c.isupper() else c for c in field]).lstrip('_')
                    setattr(obj, db_field_name, upload_result.get('secure_url'))
                except Exception as e:
                    return send_error(f"Upload failed for {field}: {str(e)}", 500)
                    
        # Multiple file fields
        multi_doc_fields = ['docSecurityCheques', 'docShowroomPhotos']
        for field in multi_doc_fields:
            if field in request.FILES:
                files = request.FILES.getlist(field)
                urls = []
                for file_obj in files:
                    try:
                        upload_result = cloudinary.uploader.upload(file_obj, folder='onboarding_docs')
                        urls.append(upload_result.get('secure_url'))
                    except Exception as e:
                        return send_error(f"Upload failed for {field}: {str(e)}", 500)
                if urls:
                    db_field_name = ''.join(['_' + c.lower() if c.isupper() else c for c in field]).lstrip('_')
                    
                    # Optionally merge with existing or overwrite. We will overwrite.
                    setattr(obj, db_field_name, urls)
                    
        obj.save()
        serializer = self.get_serializer(obj)
        return send_success(serializer.data, "Onboarding request updated successfully", 200)

    @action(detail=True, methods=['patch'])
"""

target = """        serializer = self.get_serializer(request_obj)
        return send_success(serializer.data, "Onboarding request submitted successfully", 201)

    @action(detail=True, methods=['patch'])"""

if target in content:
    content = content.replace(target, target.replace("    @action(detail=True, methods=['patch'])", update_method_code.strip() + "\n    def verify"))
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
