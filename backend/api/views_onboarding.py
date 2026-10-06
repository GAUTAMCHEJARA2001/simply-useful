from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
import uuid
import cloudinary.uploader
from decimal import Decimal

from api.models import PartyOnboardingRequest, Dealer, Distributor
from api.serializers import PartyOnboardingSerializer
from api.views import send_success, send_error, _get_company_id
from api.services.onboarding_service import OnboardingService

class PartyOnboardingViewSet(viewsets.ModelViewSet):
    serializer_class = PartyOnboardingSerializer

    def get_queryset(self):
        user = self.request.user
        company_id = _get_company_id(self.request)
        user_role = (getattr(user, 'role', '') or '').upper()
        qs = PartyOnboardingRequest.objects.select_related('submitted_by', 'reviewed_by').all()
        if company_id:
            qs = qs.filter(companyid_id=company_id)
        if user_role not in ['ADMIN', 'SUPERADMIN']:
            user_id = getattr(user, 'id', None) or getattr(user, 'userId', None)
            if user_id:
                qs = qs.filter(submitted_by_id=user_id)
        return qs.order_by('-created_at')

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
            submitted_by_id=getattr(user, 'id', None) or getattr(user, 'userId', None),
            companyid_id=_get_company_id(request)
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
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role not in ['ADMIN', 'SUPERADMIN']:
            return send_error("Unauthorized", 403)
            
        obj = self.get_object()
        status_val = request.data.get('status')
        remarks = request.data.get('remarks')
        field_reviews = request.data.get('fieldReviews')
        reviewer_id = getattr(request.user, 'id', None) or getattr(request.user, 'userId', None)
        
        try:
            updated_obj = OnboardingService.verify_request(
                obj=obj,
                status_val=status_val,
                remarks=remarks,
                field_reviews=field_reviews,
                reviewer_id=reviewer_id
            )
            serializer = self.get_serializer(updated_obj)
            return send_success(serializer.data, f"Onboarding request marked as {status_val}")
        except ValueError as ve:
            return send_error(str(ve), 400)
        except Exception as e:
            return send_error(f"Failed to verify request: {str(e)}", 500)

    @action(detail=True, methods=['post'])
    def finalize_and_create_dealer(self, request, pk=None):
        user_role = (getattr(request.user, 'role', '') or '').upper()
        if user_role not in ['ADMIN', 'SUPERADMIN']:
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
                
                # If there were already signed forms, append to them, else overwrite
                if not isinstance(obj.doc_signed_form, list):
                    obj.doc_signed_form = []
                obj.doc_signed_form.extend(urls)
                obj.save(update_fields=['doc_signed_form'])
            except Exception as e:
                return send_error(f"Failed to upload Signed Form: {str(e)}", 500)

        try:
            party, new_id = OnboardingService.finalize_party(
                obj=obj,
                data=request.data,
                company_id=_get_company_id(request)
            )
            serializer = self.get_serializer(obj)
            return send_success(serializer.data, f"{obj.party_type} successfully created with code {new_id}")
        except ValueError as ve:
            return send_error(str(ve), 400)
        except Exception as e:
            return send_error(f"Failed to create {obj.party_type}: {str(e)}", 400)

