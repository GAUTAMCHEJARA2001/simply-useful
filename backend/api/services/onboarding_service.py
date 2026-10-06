import uuid
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from api.models import PartyOnboardingRequest, Dealer, Distributor
from core.models import User

class OnboardingService:
    """
    Service Layer encapsulating all business logic for Party Onboarding.
    Handles verification, status transitions, atomic party creation,
    and batch Sales Officer (SO) email resolution.
    """

    @classmethod
    def resolve_so_emails(cls, raw_sos: Any, fallback_user_id: Optional[str] = None) -> List[str]:
        """
        Parses and resolves SO identifiers into normalized lowercase email addresses.
        Supports list of emails/IDs, comma-separated strings, or single identifiers.
        Batches database lookups to eliminate N+1 queries.
        """
        raw_items: List[str] = []
        if isinstance(raw_sos, list):
            for item in raw_sos:
                if item:
                    raw_items.append(str(item).strip())
        elif isinstance(raw_sos, str) and raw_sos.strip():
            for item in raw_sos.split(','):
                item = item.strip()
                if item:
                    raw_items.append(item)

        emails: List[str] = []
        user_ids_to_lookup: List[str] = []

        for item in raw_items:
            if '@' in item:
                emails.append(item.lower())
            else:
                user_ids_to_lookup.append(item)

        # Batch query all IDs in a single SQL query (O(1) roundtrip)
        if user_ids_to_lookup:
            found_emails = User.objects.filter(id__in=user_ids_to_lookup).values_list('email', flat=True)
            for e in found_emails:
                if e and '@' in e:
                    emails.append(e.strip().lower())

        # If no SO found, fallback to the submitter's email
        if not emails and fallback_user_id:
            fallback_email = User.objects.filter(id=fallback_user_id).values_list('email', flat=True).first()
            if fallback_email and '@' in fallback_email:
                emails.append(fallback_email.strip().lower())

        # Return unique, sorted/deduplicated list
        return list(dict.fromkeys(emails))

    @classmethod
    @transaction.atomic
    def verify_request(
        cls, 
        obj: PartyOnboardingRequest, 
        status_val: str, 
        remarks: Optional[str] = None, 
        field_reviews: Optional[Dict] = None, 
        reviewer_id: Optional[str] = None
    ) -> PartyOnboardingRequest:
        """
        Atomically updates the verification status of an onboarding request.
        """
        if status_val not in ['APPROVED', 'REJECTED']:
            raise ValueError("Status must be either APPROVED or REJECTED.")
            
        if obj.status not in ['PENDING', 'REJECTED']:
            raise ValueError(f"Request is currently {obj.status} and cannot be verified.")

        obj.status = status_val
        obj.remarks = remarks
        
        if field_reviews:
            if not isinstance(obj.extended_data, dict):
                obj.extended_data = {}
            obj.extended_data['fieldReviews'] = field_reviews
            
        obj.reviewed_by_id = reviewer_id
        obj.reviewed_at = timezone.now()
        obj.save()
        return obj

    @classmethod
    @transaction.atomic
    def finalize_party(
        cls, 
        obj: PartyOnboardingRequest, 
        data: Dict[str, Any], 
        company_id: Optional[str]
    ) -> Tuple[Any, str]:
        """
        Atomically creates a Dealer or Distributor from an APPROVED onboarding request,
        links assigned Sales Officers, and marks the request as COMPLETED.
        """
        if obj.status != 'APPROVED':
            raise ValueError("Request must be APPROVED before finalization.")

        final_party_name = data.get('partyName') or obj.party_name
        final_city = data.get('cityOrArea') or obj.city_or_area
        final_gst = data.get('gstNumber') or obj.gst_number
        final_address = data.get('address') or obj.address
        final_phone = data.get('phone') or obj.phone
        final_email = data.get('email') or obj.email
        final_contact = data.get('contactPerson') or obj.contact_person
        final_territory = data.get('territory', '')
        final_distributor = data.get('distributorName', '')

        try:
            final_credit_limit = Decimal(str(data.get('creditLimit') or '0.00'))
        except Exception:
            final_credit_limit = Decimal('0.00')

        try:
            final_outstanding = Decimal(str(data.get('outstanding') or '0.00'))
        except Exception:
            final_outstanding = Decimal('0.00')

        raw_sos = (
            data.get('assignedSoEmails') or 
            data.get('assignedsoemails') or 
            data.get('assignedSoEmail') or 
            data.get('assignedsoemail')
        )
        so_list = cls.resolve_so_emails(raw_sos, fallback_user_id=obj.submitted_by_id)
        effective_company_id = obj.companyid_id or company_id

        if obj.party_type == 'DEALER':
            new_id = f"DLR-{uuid.uuid4().hex[:8].upper()}"
            party = Dealer.objects.create(
                id=f"dlr_{uuid.uuid4().hex[:16]}",
                dealercode=new_id,
                dealername=final_party_name,
                city=final_city,
                assignedsoemails=so_list,
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
                companyid_id=effective_company_id
            )
        else:
            new_id = f"DIST-{uuid.uuid4().hex[:8].upper()}"
            party = Distributor.objects.create(
                id=f"dist_{uuid.uuid4().hex[:16]}",
                distributorcode=new_id,
                distributorname=final_party_name,
                area=final_city,
                assignedsoemails=so_list,
                creditlimit=final_credit_limit,
                outstanding=final_outstanding,
                territory=final_territory,
                active=True,
                gst_number=final_gst,
                address=final_address,
                phone=final_phone,
                email=final_email,
                contact_person=final_contact,
                companyid_id=effective_company_id
            )

        obj.created_party_id = new_id
        obj.status = 'COMPLETED'
        obj.save()

        return party, new_id
