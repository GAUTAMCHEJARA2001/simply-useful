import sys
import re

file_path = r'd:\cost 2\simply-useful\simply-useful\simply-useful\backend\api\views_onboarding.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the verify method to NOT create the dealer
target_verify_start = "        if status_val == 'APPROVED':"
target_verify_end = "        serializer = self.get_serializer(obj)"

# We need to find exactly this block. Since it spans many lines, let's use re.
pattern = r"        if status_val == 'APPROVED':.*?        serializer = self\.get_serializer\(obj\)"

# Wait, if I just replace from `if status_val == 'APPROVED':` down to `obj.save()`
old_verify_block = """        if status_val == 'APPROVED':
            # Create Dealer or Distributor
            if obj.party_type == 'DEALER':
                new_id = f"DLR-{uuid.uuid4().hex[:8].upper()}"
                Dealer.objects.create(
                    id=f"dlr_{uuid.uuid4().hex[:16]}",
                    dealercode=new_id,
                    dealername=obj.party_name,
                    city=obj.city_or_area,
                    assignedsoemail=obj.submitted_by_id, 
                    creditlimit=Decimal('0.00'),
                    outstanding=Decimal('0.00'),
                    active=True,
                    gst_number=obj.gst_number,
                    address=obj.address,
                    phone=obj.phone,
                    email=obj.email,
                    contact_person=obj.contact_person,
                    companyid_id=obj.companyid_id
                )
                obj.created_party_id = new_id
            else:
                new_id = f"DIST-{uuid.uuid4().hex[:8].upper()}"
                Distributor.objects.create(
                    id=f"dist_{uuid.uuid4().hex[:16]}",
                    distributorcode=new_id,
                    distributorname=obj.party_name,
                    area=obj.city_or_area,
                    assignedsoemail=obj.submitted_by_id,
                    creditlimit=Decimal('0.00'),
                    outstanding=Decimal('0.00'),
                    active=True,
                    gst_number=obj.gst_number,
                    address=obj.address,
                    phone=obj.phone,
                    email=obj.email,
                    contact_person=obj.contact_person,
                    companyid_id=obj.companyid_id
                )
                obj.created_party_id = new_id
                
        obj.save()
        
        from core.models import User
        if status_val == 'APPROVED':
            so = User.objects.filter(id=obj.submitted_by_id).first()
            if so:
                if obj.party_type == 'DEALER':
                    Dealer.objects.filter(dealercode=obj.created_party_id).update(assignedsoemail=so.email)
                else:
                    Distributor.objects.filter(distributorcode=obj.created_party_id).update(assignedsoemail=so.email)
        
        serializer = self.get_serializer(obj)"""

new_verify_block = """        obj.save()
        serializer = self.get_serializer(obj)"""

content = content.replace(old_verify_block, new_verify_block)

new_action = """
    @action(detail=True, methods=['post'])
    def finalize_and_create_dealer(self, request, pk=None):
        if request.user.role not in ['ADMIN', 'SUPERADMIN']:
            return send_error("Unauthorized", 403)
            
        obj = self.get_object()
        
        if obj.status != 'APPROVED':
            return send_error("Request must be APPROVED to finalize.", 400)
            
        file_obj = request.FILES.get('docSignedForm')
        if not file_obj:
            return send_error("Signed Form is required to create a dealer.", 400)
            
        try:
            upload_result = cloudinary.uploader.upload(file_obj, folder='onboarding_docs')
            obj.doc_signed_form = upload_result.get('secure_url')
        except Exception as e:
            return send_error(f"Failed to upload Signed Form: {str(e)}", 500)
            
        # Create Dealer or Distributor
        if obj.party_type == 'DEALER':
            new_id = f"DLR-{uuid.uuid4().hex[:8].upper()}"
            Dealer.objects.create(
                id=f"dlr_{uuid.uuid4().hex[:16]}",
                dealercode=new_id,
                dealername=obj.party_name,
                city=obj.city_or_area,
                assignedsoemail=obj.submitted_by_id, 
                creditlimit=Decimal('0.00'),
                outstanding=Decimal('0.00'),
                active=True,
                gst_number=obj.gst_number,
                address=obj.address,
                phone=obj.phone,
                email=obj.email,
                contact_person=obj.contact_person,
                companyid_id=obj.companyid_id
            )
            obj.created_party_id = new_id
        else:
            new_id = f"DIST-{uuid.uuid4().hex[:8].upper()}"
            Distributor.objects.create(
                id=f"dist_{uuid.uuid4().hex[:16]}",
                distributorcode=new_id,
                distributorname=obj.party_name,
                area=obj.city_or_area,
                assignedsoemail=obj.submitted_by_id,
                creditlimit=Decimal('0.00'),
                outstanding=Decimal('0.00'),
                active=True,
                gst_number=obj.gst_number,
                address=obj.address,
                phone=obj.phone,
                email=obj.email,
                contact_person=obj.contact_person,
                companyid_id=obj.companyid_id
            )
            obj.created_party_id = new_id
            
        obj.status = 'COMPLETED'
        obj.save()
        
        from core.models import User
        so = User.objects.filter(id=obj.submitted_by_id).first()
        if so:
            if obj.party_type == 'DEALER':
                Dealer.objects.filter(dealercode=obj.created_party_id).update(assignedsoemail=so.email)
            else:
                Distributor.objects.filter(distributorcode=obj.created_party_id).update(assignedsoemail=so.email)
                
        serializer = self.get_serializer(obj)
        return send_success(serializer.data, f"{obj.party_type} successfully created with code {new_id}")
"""

content = content + new_action

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched views_onboarding.py successfully")
