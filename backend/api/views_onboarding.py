from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
import uuid
import cloudinary.uploader
from decimal import Decimal

from api.models import PartyOnboardingRequest, Dealer, Distributor
from api.serializers import PartyOnboardingSerializer
from api.views import send_success, send_error

class PartyOnboardingViewSet(viewsets.ModelViewSet):
    serializer_class = PartyOnboardingSerializer

    def get_queryset(self):
        user = self.request.user
        company_id = getattr(user, 'companyId', None)
        if user.role in ['ADMIN', 'SUPERADMIN']:
            return PartyOnboardingRequest.objects.filter(companyid_id=company_id).order_by('-created_at')
        return PartyOnboardingRequest.objects.filter(companyid_id=company_id, submitted_by_id=user.id).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data
        
        party_type = data.get('partyType', 'DEALER')
        party_name = data.get('partyName')
        city_or_area = data.get('cityOrArea')
        address = data.get('address')
        phone = data.get('phone')
        contact_person = data.get('contactPerson')
        
        if not party_name or not city_or_area or not address or not phone or not contact_person:
            return send_error("partyName, cityOrArea, address, phone, and contactPerson are required.", 400)
            
        doc_urls = {}
        
        # Single file fields
        single_doc_fields = [
            'docAadhaarFront', 'docAadhaarBack', 'docPan', 'docGst', 'docAddressProof', 
            'docUdhyam', 'docPersonPhoto', 'docSignedForm'
        ]
        
        for field in single_doc_fields:
            file_obj = request.FILES.get(field)
            if file_obj:
                try:
                    upload_result = cloudinary.uploader.upload(file_obj, folder='onboarding_docs')
                    db_field_name = ''.join(['_' + c.lower() if c.isupper() else c for c in field]).lstrip('_')
                    doc_urls[db_field_name] = upload_result.get('secure_url')
                except Exception as e:
                    return send_error(f"Upload failed for {field}: {str(e)}", 500)
                    
        # Multiple file fields
        multi_doc_fields = ['docSecurityCheques', 'docShowroomPhotos']
        for field in multi_doc_fields:
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
                doc_urls[db_field_name] = urls
                    
        import json
        extended_data_str = data.get('extendedData', '{}')
        try:
            extended_data = json.loads(extended_data_str)
        except Exception:
            extended_data = {}

        for key in request.FILES.keys():
            if key.startswith('proprietorAadhaar_') or key.startswith('proprietorPan_'):
                file_obj = request.FILES.get(key)
                if file_obj:
                    try:
                        upload_result = cloudinary.uploader.upload(file_obj, folder='onboarding_docs')
                        extended_data[key] = upload_result.get('secure_url')
                    except Exception as e:
                        pass

        request_obj = PartyOnboardingRequest.objects.create(
            id=f"obr_{uuid.uuid4().hex[:16]}",
            party_type=party_type,
            party_name=party_name,
            city_or_area=city_or_area,
            gst_number=data.get('gstNumber'),
            address=address,
            phone=phone,
            email=data.get('email'),
            contact_person=contact_person,
            status=data.get('status', 'PENDING'),
            extended_data=extended_data,
            doc_aadhaar_front=doc_urls.get('doc_aadhaar_front'),
            doc_aadhaar_back=doc_urls.get('doc_aadhaar_back'),
            doc_pan=doc_urls.get('doc_pan'),
            doc_gst=doc_urls.get('doc_gst'),
            doc_address_proof=doc_urls.get('doc_address_proof'),
            doc_udhyam=doc_urls.get('doc_udhyam'),
            doc_security_cheques=doc_urls.get('doc_security_cheques', []),
            doc_person_photo=doc_urls.get('doc_person_photo'),
            doc_showroom_photos=doc_urls.get('doc_showroom_photos', []),
            submitted_by_id=user.id,
            companyid_id=getattr(user, 'companyId', None)
        )
        
        serializer = self.get_serializer(request_obj)
        return send_success(serializer.data, "Onboarding request saved successfully", 201)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        
        if obj.status not in ['DRAFT', 'REJECTED', 'APPROVED']:
            return send_error("Can only edit DRAFT, REJECTED, or APPROVED requests.", 400)
            
        data = request.data
        
        # We only update fields that are provided
        if 'status' in data: obj.status = data.get('status')
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

        for key in request.FILES.keys():
            if key.startswith('proprietorAadhaar_') or key.startswith('proprietorPan_'):
                file_obj = request.FILES.get(key)
                if file_obj:
                    try:
                        upload_result = cloudinary.uploader.upload(file_obj, folder='onboarding_docs')
                        if not obj.extended_data:
                            obj.extended_data = {}
                        obj.extended_data[key] = upload_result.get('secure_url')
                    except Exception as e:
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
        multi_doc_fields = ['docSecurityCheques', 'docShowroomPhotos', 'docSignedForm']
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
    def verify(self, request, pk=None):
        if request.user.role not in ['ADMIN', 'SUPERADMIN']:
            return send_error("Unauthorized", 403)
            
        obj = self.get_object()
        status_val = request.data.get('status')
        remarks = request.data.get('remarks')
        
        if status_val not in ['APPROVED', 'REJECTED']:
            return send_error("Invalid status", 400)
            
        if obj.status not in ['PENDING', 'REJECTED']:
            return send_error(f"Request is currently {obj.status} and cannot be verified", 400)
            
        obj.status = status_val
        obj.remarks = remarks
        
        field_reviews = request.data.get('fieldReviews')
        if field_reviews:
            if not isinstance(obj.extended_data, dict):
                obj.extended_data = {}
            obj.extended_data['fieldReviews'] = field_reviews
            
        obj.reviewed_by_id = request.user.id
        obj.reviewed_at = timezone.now()
        
        obj.save()
        serializer = self.get_serializer(obj)
        return send_success(serializer.data, f"Onboarding request marked as {status_val}")

    @action(detail=True, methods=['post'])
    def finalize_and_create_dealer(self, request, pk=None):
        if request.user.role not in ['ADMIN', 'SUPERADMIN']:
            return send_error("Unauthorized", 403)
            
        obj = self.get_object()
        
        if obj.status != 'APPROVED':
            return send_error("Request must be APPROVED to finalize.", 400)
            
        files = request.FILES.getlist('docSignedForm')
        if not files and (not obj.doc_signed_form or len(obj.doc_signed_form) == 0):
            return send_error("Signed Form is required to create a dealer.", 400)
            
        if files:
            try:
                urls = []
                for file_obj in files:
                    upload_result = cloudinary.uploader.upload(file_obj, folder='onboarding_docs')
                    urls.append(upload_result.get('secure_url'))
                
                # If they were already some signed forms, append to them, else overwrite
                if not isinstance(obj.doc_signed_form, list):
                    obj.doc_signed_form = []
                obj.doc_signed_form.extend(urls)
            except Exception as e:
                return send_error(f"Failed to upload Signed Form: {str(e)}", 500)
            
        # Get fields from request data (edited by Admin) or fallback to original request
        final_party_name = request.data.get('partyName', obj.party_name)
        final_city = request.data.get('cityOrArea', obj.city_or_area)
        final_gst = request.data.get('gstNumber', obj.gst_number)
        final_address = request.data.get('address', obj.address)
        final_phone = request.data.get('phone', obj.phone)
        final_email = request.data.get('email', obj.email)
        final_contact = request.data.get('contactPerson', obj.contact_person)
        
        final_credit_limit = Decimal(request.data.get('creditLimit', '0.00'))
        final_outstanding = Decimal(request.data.get('outstanding', '0.00'))
        final_territory = request.data.get('territory', '')
        final_assigned_so = request.data.get('assignedSoEmail', obj.submitted_by_id)
        final_distributor = request.data.get('distributorName', '')

        # Create Dealer or Distributor
        if obj.party_type == 'DEALER':
            new_id = f"DLR-{uuid.uuid4().hex[:8].upper()}"
            Dealer.objects.create(
                id=f"dlr_{uuid.uuid4().hex[:16]}",
                dealercode=new_id,
                dealername=final_party_name,
                city=final_city,
                assignedsoemail=final_assigned_so, 
                creditlimit=final_credit_limit,
                outstanding=final_outstanding,
                territory=final_territory,
                distributorname=final_distributor,
                active=True,
                gst_number=final_gst,
                address=final_address,
                phone=final_phone,
                email=final_email,
                contact_person=final_contact,
                companyid_id=obj.companyid_id
            )
            obj.created_party_id = new_id
        else:
            new_id = f"DIST-{uuid.uuid4().hex[:8].upper()}"
            Distributor.objects.create(
                id=f"dist_{uuid.uuid4().hex[:16]}",
                distributorcode=new_id,
                distributorname=final_party_name,
                area=final_city,
                assignedsoemail=final_assigned_so,
                creditlimit=final_credit_limit,
                outstanding=final_outstanding,
                territory=final_territory,
                active=True,
                gst_number=final_gst,
                address=final_address,
                phone=final_phone,
                email=final_email,
                contact_person=final_contact,
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
