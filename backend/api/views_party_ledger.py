import uuid
from decimal import Decimal
from datetime import datetime
from django.utils import timezone
from django.db import transaction, models
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import (
    Dealer, Distributor, Order, Returnlog, PaymentReceipt,
    CreditNoteDiscountRequest, Company, PartyManualLedgerEntry
)
from core.models import User
from api.views import send_success, send_error, _get_company_id
from api.views_logs import log_activity_internal


def _generate_request_id(request_type: str) -> str:
    """Generates unique human-readable Request ID e.g. CN-REQ-202610-0001 or DISC-REQ-202610-0001"""
    prefix = "CN-REQ" if request_type == 'CREDIT_NOTE' else "DISC-REQ"
    now = timezone.now()
    ym = now.strftime('%Y%m')
    count = CreditNoteDiscountRequest.objects.filter(
        request_type=request_type,
        created_at__year=now.year,
        created_at__month=now.month
    ).count() + 1
    return f"{prefix}-{ym}-{count:04d}"


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def cn_discount_requests_list_create(request):
    """
    GET: List all Credit Note & Discount requests (filtered by status, party_id, request_type).
    POST: Admin or Sales Officer raises a new Credit Note or Special Discount request for SuperAdmin approval.
    """
    user = request.user
    company_id = _get_company_id(request)
    user_role = (getattr(user, 'role', '') or '').upper()
    user_email = (getattr(user, 'email', '') or '').strip().lower()

    if request.method == 'GET':
        qs = CreditNoteDiscountRequest.objects.filter(companyid_id=company_id) if company_id else CreditNoteDiscountRequest.objects.all()

        # Role-based scoping: Sales Officers see transactions for their assigned dealers/distributors (or raised by themselves)
        is_admin_or_super = user_role in ['SUPERADMIN', 'ADMIN'] or getattr(user, 'is_superuser', False)
        if not is_admin_or_super and user_email:
            dlr_qs = Dealer.objects.filter(assignedsoemails__icontains=user_email)
            dist_qs = Distributor.objects.filter(assignedsoemails__icontains=user_email)
            if company_id:
                dlr_qs = dlr_qs.filter(companyid_id=company_id)
                dist_qs = dist_qs.filter(companyid_id=company_id)

            dlr_ids = list(dlr_qs.values_list('id', flat=True))
            dlr_codes = list(dlr_qs.values_list('dealercode', flat=True))
            dlr_names = list(dlr_qs.values_list('dealername', flat=True))

            dist_ids = list(dist_qs.values_list('id', flat=True))
            dist_codes = list(dist_qs.values_list('distributorcode', flat=True))
            dist_names = list(dist_qs.values_list('distributorname', flat=True))

            accessible_party_ids = set([str(x).strip() for x in (dlr_ids + dlr_codes + dist_ids + dist_codes) if x])
            accessible_party_names = [str(x).strip() for x in (dlr_names + dist_names) if x]

            filter_condition = models.Q(party_id__in=accessible_party_ids) | models.Q(requested_by=user)
            if accessible_party_names:
                filter_condition = filter_condition | models.Q(party_name__in=accessible_party_names)

            qs = qs.filter(filter_condition)

        status_filter = request.query_params.get('status')
        if status_filter and status_filter.upper() != 'ALL':
            qs = qs.filter(status=status_filter.upper())

        party_id = request.query_params.get('party_id')
        if party_id:
            qs = qs.filter(party_id=party_id)

        req_type = request.query_params.get('request_type')
        if req_type and req_type.upper() != 'ALL':
            qs = qs.filter(request_type=req_type.upper())

        qs = qs.select_related('requested_by', 'reviewed_by').order_by('-created_at')

        data = []
        for r in qs[:200]:
            req_by_name = (r.requested_by.name if (r.requested_by and r.requested_by.name) else (r.requested_by.email if r.requested_by else 'Admin'))
            req_by_role = getattr(r.requested_by, 'role', '') if r.requested_by else 'ADMIN'
            req_by_email = r.requested_by.email if r.requested_by else ''

            rev_by_name = (r.reviewed_by.name if (r.reviewed_by and r.reviewed_by.name) else (r.reviewed_by.email if r.reviewed_by else None))
            rev_by_role = getattr(r.reviewed_by, 'role', '') if r.reviewed_by else None
            rev_by_email = r.reviewed_by.email if r.reviewed_by else None

            data.append({
                'id': r.id,
                'request_id': r.request_id,
                'party_type': r.party_type,
                'party_id': r.party_id,
                'party_name': r.party_name,
                'request_type': r.request_type,
                'amount': float(r.amount),
                'reason': r.reason,
                'related_order_id': r.related_order_id,
                'invoice_number': r.invoice_number,
                'photo_url': r.photo_url,
                'status': r.status,
                'requested_by_id': r.requested_by_id,
                'requested_by_name': req_by_name,
                'requested_by_role': req_by_role,
                'requested_by_email': req_by_email,
                'requested_by': {
                    'id': r.requested_by_id,
                    'name': req_by_name,
                    'role': req_by_role,
                    'email': req_by_email,
                } if r.requested_by else {
                    'id': None,
                    'name': 'Admin',
                    'role': 'ADMIN',
                    'email': '',
                },
                'requested_at': r.requested_at.isoformat() if r.requested_at else None,
                'reviewed_by_id': r.reviewed_by_id,
                'reviewed_by_name': rev_by_name,
                'reviewed_by_role': rev_by_role,
                'reviewed_by_email': rev_by_email,
                'reviewed_by': {
                    'id': r.reviewed_by_id,
                    'name': rev_by_name,
                    'role': rev_by_role,
                    'email': rev_by_email,
                } if r.reviewed_by else None,
                'reviewed_at': r.reviewed_at.isoformat() if r.reviewed_at else None,
                'review_notes': r.review_notes,
                'accounting_narration': r.accounting_narration,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            })
        return send_success(data, 'Credit Note & Discount requests fetched successfully')

    elif request.method == 'POST':
        data = request.data
        party_id = data.get('party_id') or data.get('partyId')
        party_name = data.get('party_name') or data.get('partyName')
        party_type = (data.get('party_type') or data.get('partyType') or 'DEALER').upper()
        req_type = (data.get('request_type') or data.get('requestType') or 'CREDIT_NOTE').upper()
        
        try:
            amount = Decimal(str(data.get('amount') or 0.0))
        except Exception:
            return send_error('Invalid amount format', 400)

        if amount <= Decimal('0.00'):
            return send_error('Requested amount must be strictly greater than 0', 400)

        reason = str(data.get('reason') or '').strip()
        if not reason:
            return send_error('Please specify a valid reason/justification for this CN or Discount', 400)

        if not party_name:
            if party_type == 'DEALER':
                d = Dealer.objects.filter(id=party_id).first() or Dealer.objects.filter(dealercode=party_id).first()
                if d: party_name = d.dealername
            else:
                dist = Distributor.objects.filter(id=party_id).first() or Distributor.objects.filter(distributorcode=party_id).first()
                if dist: party_name = dist.distributorname

        req_id_code = _generate_request_id(req_type)
        record_id = 'c' + uuid.uuid4().hex[:23]

        # Handle photo proof upload (e.g. calculation sheet, signed note, damaged items photo)
        photo_url = data.get('photo_url') or data.get('photoUrl') or None
        photo_file = request.FILES.get('photo') or request.FILES.get('proof') or request.FILES.get('file')
        if photo_file:
            try:
                import cloudinary.uploader
                upload_result = cloudinary.uploader.upload(photo_file, folder='cn_proofs')
                photo_url = upload_result.get('secure_url')
            except Exception as e:
                try:
                    from django.core.files.storage import default_storage
                    saved_path = default_storage.save(f"cn_proofs/{photo_file.name}", photo_file)
                    photo_url = default_storage.url(saved_path)
                except Exception as ex:
                    print('[CN PROOF UPLOAD EXCEPTION]:', str(e), str(ex))

        cn_req = CreditNoteDiscountRequest.objects.create(
            id=record_id,
            request_id=req_id_code,
            party_type=party_type,
            party_id=party_id or '',
            party_name=party_name or 'Party',
            request_type=req_type,
            amount=amount,
            reason=reason,
            related_order_id=data.get('related_order_id') or data.get('relatedOrderId') or None,
            invoice_number=data.get('invoice_number') or data.get('invoiceNumber') or None,
            photo_url=photo_url,
            status='PENDING',
            requested_by=user,
            requested_at=timezone.now(),
            companyid_id=company_id
        )

        try:
            log_activity_internal(
                user=user,
                log_type='ACTION',
                feature='PartyLedger',
                action=f"Raised {req_type} Request {req_id_code} for Rs. {amount:.2f} ({party_name})",
                details={'request_id': req_id_code, 'party': party_name, 'amount': float(amount), 'reason': reason}
            )
        except Exception:
            pass

        return send_success({
            'id': cn_req.id,
            'request_id': cn_req.request_id,
            'status': cn_req.status,
            'amount': float(cn_req.amount),
            'message': f"Request {req_id_code} raised successfully and queued for SuperAdmin approval!"
        }, 'Request created successfully', 201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def review_cn_discount_request(request, pk):
    """
    SuperAdmin endpoint: Examine and Approve or Reject a Credit Note / Discount request.
    Upon approval:
      1. Sets status = 'APPROVED'
      2. Formulates accounting narration with Request ID
      3. Deducts amount from party's live outstanding balance
    """
    user = request.user
    user_role = (getattr(user, 'role', '') or '').upper()

    if user_role != 'SUPERADMIN' and not getattr(user, 'is_superuser', False):
        return send_error('Only SuperAdmin has authorization to approve or reject Credit Notes & Discounts', 403)

    req_obj = CreditNoteDiscountRequest.objects.filter(id=pk).first() or CreditNoteDiscountRequest.objects.filter(request_id=pk).first()
    if not req_obj:
        return send_error('Request not found', 404)

    if req_obj.status != 'PENDING':
        return send_error(f'This request has already been reviewed ({req_obj.status})', 400)

    action = str(request.data.get('action') or '').strip().upper()
    review_notes = str(request.data.get('review_notes') or request.data.get('notes') or '').strip()

    if action not in ['APPROVE', 'REJECT']:
        return send_error("Action must be either 'APPROVE' or 'REJECT'", 400)

    with transaction.atomic():
        if action == 'APPROVE':
            req_type_label = "Credit Note" if req_obj.request_type == 'CREDIT_NOTE' else "Special Discount"
            reviewer_name = user.name or user.email or 'SuperAdmin'
            
            # Format standard narration with Request ID for accounting books (Tally / Busy)
            order_ref_part = f" for Order #{req_obj.related_order_id}" if req_obj.related_order_id else ""
            narration = f"{req_type_label} [REQ ID: {req_obj.request_id}]{order_ref_part} - {req_obj.reason} (Approved by {reviewer_name})"

            req_obj.status = 'APPROVED'
            req_obj.reviewed_by = user
            req_obj.reviewed_at = timezone.now()
            req_obj.review_notes = review_notes or 'Approved by SuperAdmin'
            req_obj.accounting_narration = narration
            req_obj.save()

            # Deduct from live party outstanding balance
            party_type = (req_obj.party_type or '').upper()
            party_id = req_obj.party_id
            amt = Decimal(str(req_obj.amount))

            if party_type == 'DEALER':
                dealer = Dealer.objects.filter(id=party_id).first() or Dealer.objects.filter(dealercode=party_id).first() or Dealer.objects.filter(dealername__iexact=req_obj.party_name).first()
                if dealer:
                    dealer.outstanding = max(Decimal('0.00'), (dealer.outstanding or Decimal('0.00')) - amt)
                    dealer.save(update_fields=['outstanding'])
            elif party_type == 'DISTRIBUTOR':
                dist = Distributor.objects.filter(id=party_id).first() or Distributor.objects.filter(distributorcode=party_id).first() or Distributor.objects.filter(distributorname__iexact=req_obj.party_name).first()
                if dist:
                    dist.outstanding = max(Decimal('0.00'), (dist.outstanding or Decimal('0.00')) - amt)
                    dist.save(update_fields=['outstanding'])

            try:
                log_activity_internal(
                    user=user,
                    log_type='ACTION',
                    feature='PartyLedger',
                    action=f"Approved {req_obj.request_id} for Rs. {req_obj.amount:.2f} ({req_obj.party_name})",
                    details={'request_id': req_obj.request_id, 'narration': narration}
                )
            except Exception:
                pass

            return send_success({
                'request_id': req_obj.request_id,
                'status': 'APPROVED',
                'accounting_narration': narration,
                'message': f"Request {req_obj.request_id} approved! Ledger credited with Rs. {req_obj.amount:.2f}."
            }, f"Request {req_obj.request_id} approved")

        else:
            req_obj.status = 'REJECTED'
            req_obj.reviewed_by = user
            req_obj.reviewed_at = timezone.now()
            req_obj.review_notes = review_notes or 'Rejected by SuperAdmin'
            req_obj.save()

            try:
                log_activity_internal(
                    user=user,
                    log_type='ACTION',
                    feature='PartyLedger',
                    action=f"Rejected {req_obj.request_id} ({req_obj.party_name})",
                    details={'request_id': req_obj.request_id, 'reason': review_notes}
                )
            except Exception:
                pass

            return send_success({
                'request_id': req_obj.request_id,
                'status': 'REJECTED',
                'review_notes': req_obj.review_notes,
                'message': f"Request {req_obj.request_id} was rejected."
            }, f"Request {req_obj.request_id} rejected")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_live_party_ledger(request, party_type, party_id):
    """
    Live ERP Party Financial Ledger Statement:
    Dynamically compiles:
      1. Sales (Dispatched/Completed Orders) -> Debit
      2. Sales Returns -> Credit
      3. Payments Received (Verified in Cash, Bank, UPI, Cheque) -> Credit
      4. Approved Credit Notes (with Request ID in narration) -> Credit
      5. Approved Discounts (with Request ID in narration) -> Credit
    Calculates running balance, net metrics, and returns a statement ready for PDF/Excel.
    """
    company_id = _get_company_id(request)
    p_type = str(party_type).upper()

    # Resolve Party
    party_info = None
    party_name = None
    party_code = None

    if p_type == 'DEALER':
        d = (
            Dealer.objects.filter(id=party_id).first() or 
            Dealer.objects.filter(dealercode=party_id).first() or
            Dealer.objects.filter(dealercode__iexact=party_id).first() or
            Dealer.objects.filter(dealername__iexact=party_id).first()
        )
        if d:
            party_name = d.dealername
            party_code = d.dealercode
            party_info = {
                'id': d.id,
                'code': d.dealercode,
                'name': d.dealername,
                'party_type': 'DEALER',
                'city': d.city,
                'phone': d.phone,
                'gst_number': d.gst_number,
                'credit_limit': float(d.creditlimit or 0.0),
                'outstanding': float(d.outstanding or 0.0),
                'opening_balance': float(d.openingbalance or 0.0),
                'opening_balance_date': d.openingbalancedate.strftime('%Y-%m-%d') if d.openingbalancedate else None,
                'active': d.active,
            }
        else:
            dist = (
                Distributor.objects.filter(id=party_id).first() or 
                Distributor.objects.filter(distributorcode=party_id).first() or
                Distributor.objects.filter(distributorcode__iexact=party_id).first() or
                Distributor.objects.filter(distributorname__iexact=party_id).first()
            )
            if dist:
                p_type = 'DISTRIBUTOR'
                party_name = dist.distributorname
                party_code = dist.distributorcode
                party_info = {
                    'id': dist.id,
                    'code': dist.distributorcode,
                    'name': dist.distributorname,
                    'party_type': 'DISTRIBUTOR',
                    'city': dist.area,
                    'phone': dist.phone,
                    'gst_number': dist.gst_number,
                    'credit_limit': float(dist.creditlimit or 0.0),
                    'outstanding': float(dist.outstanding or 0.0),
                    'active': dist.active,
                }
    else:
        dist = (
            Distributor.objects.filter(id=party_id).first() or 
            Distributor.objects.filter(distributorcode=party_id).first() or
            Distributor.objects.filter(distributorcode__iexact=party_id).first() or
            Distributor.objects.filter(distributorname__iexact=party_id).first()
        )
        if dist:
            party_name = dist.distributorname
            party_code = dist.distributorcode
            party_info = {
                'id': dist.id,
                'code': dist.distributorcode,
                'name': dist.distributorname,
                'party_type': 'DISTRIBUTOR',
                'city': dist.area,
                'phone': dist.phone,
                'gst_number': dist.gst_number,
                'credit_limit': float(dist.creditlimit or 0.0),
                'outstanding': float(dist.outstanding or 0.0),
                'opening_balance': float(dist.openingbalance or 0.0),
                'opening_balance_date': dist.openingbalancedate.strftime('%Y-%m-%d') if dist.openingbalancedate else None,
                'active': dist.active,
            }
        else:
            d = (
                Dealer.objects.filter(id=party_id).first() or 
                Dealer.objects.filter(dealercode=party_id).first() or
                Dealer.objects.filter(dealercode__iexact=party_id).first() or
                Dealer.objects.filter(dealername__iexact=party_id).first()
            )
            if d:
                p_type = 'DEALER'
                party_name = d.dealername
                party_code = d.dealercode
                party_info = {
                    'id': d.id,
                    'code': d.dealercode,
                    'name': d.dealername,
                    'party_type': 'DEALER',
                    'city': d.city,
                    'phone': d.phone,
                    'gst_number': d.gst_number,
                    'credit_limit': float(d.creditlimit or 0.0),
                    'outstanding': float(d.outstanding or 0.0),
                    'active': d.active,
                }

    if not party_info:
        return send_error(f"Party '{party_id}' ({p_type}) not found", 404)

    # 1. SALES ORDERS (Dispatched, Completed, Partially Returned, Returned) -> DEBIT
    orders_qs = Order.objects.filter(
        models.Q(partyname__iexact=party_name) | models.Q(partyname=party_name)
    )
    if company_id:
        orders_qs = orders_qs.filter(companyid_id=company_id)

    sales_entries = []
    for ord_obj in orders_qs:
        # Include if dispatched, approved, completed or returned
        status_upper = (ord_obj.status or '').strip().upper()
        is_billed = status_upper in ['DISPATCHED', 'COMPLETED', 'APPROVED', 'PARTIALLY RETURNED', 'RETURNED']
        if is_billed and ord_obj.grandtotal and ord_obj.grandtotal > 0:
            dt = ord_obj.date.strftime('%Y-%m-%d') if ord_obj.date else (ord_obj.createdat.strftime('%Y-%m-%d') if ord_obj.createdat else '')
            inv_no = ord_obj.invoicenumber or ord_obj.orderid
            narration = f"Sales Invoice #{inv_no}"
            if ord_obj.dispatchwarehouse:
                narration += f" (Dispatched: {ord_obj.dispatchwarehouse})"
            if ord_obj.vehiclenumber:
                narration += f" | Veh: {ord_obj.vehiclenumber}"

            sales_entries.append({
                'id': f"sale_{ord_obj.id}",
                'date': dt,
                'type': 'SALES',
                'type_label': 'Sales Invoice',
                'voucher_no': inv_no,
                'debit': round(float(ord_obj.grandtotal), 2),
                'credit': 0.0,
                'narration': narration,
                'status': ord_obj.status,
                'ref_id': ord_obj.orderid,
            })

    # 2. PAYMENT RECEIPTS (VERIFIED in any medium: Cash, Bank, UPI, Cheque) -> CREDIT
    pay_qs = PaymentReceipt.objects.filter(
        models.Q(party_name__iexact=party_name) | models.Q(party_id=party_id) | models.Q(party_id=party_code),
        status='VERIFIED'
    )
    if company_id:
        pay_qs = pay_qs.filter(companyid_id=company_id)

    payment_entries = []
    payment_mode_breakdown = {'CASH': 0.0, 'BANK': 0.0, 'UPI': 0.0, 'CHEQUE': 0.0, 'OTHER': 0.0}

    for pr in pay_qs:
        amt = round(float(pr.amount or 0.0), 2)
        mode = (pr.payment_mode or 'OTHER').upper()
        if 'BANK' in mode or 'NEFT' in mode or 'RTGS' in mode:
            payment_mode_breakdown['BANK'] += amt
        elif 'CASH' in mode:
            payment_mode_breakdown['CASH'] += amt
        elif 'UPI' in mode:
            payment_mode_breakdown['UPI'] += amt
        elif 'CHEQUE' in mode:
            payment_mode_breakdown['CHEQUE'] += amt
        else:
            payment_mode_breakdown['OTHER'] += amt

        dt = pr.verified_at.strftime('%Y-%m-%d') if pr.verified_at else pr.created_at.strftime('%Y-%m-%d')
        narration = f"Payment Received ({pr.payment_mode})"
        if pr.remarks:
            narration += f" - {pr.remarks}"

        payment_entries.append({
            'id': f"pay_{pr.id}",
            'date': dt,
            'type': 'PAYMENT',
            'type_label': f"Payment ({pr.payment_mode})",
            'voucher_no': f"REC-{pr.id[:8].upper()}",
            'debit': 0.0,
            'credit': amt,
            'payment_mode': pr.payment_mode,
            'narration': narration,
            'status': 'VERIFIED',
            'ref_id': pr.id,
            'photo_url': pr.photo_url,
        })

    # 3. APPROVED CREDIT NOTES & DISCOUNTS -> CREDIT
    cn_qs = CreditNoteDiscountRequest.objects.filter(
        models.Q(party_name__iexact=party_name) | models.Q(party_id=party_id) | models.Q(party_id=party_code),
        status='APPROVED'
    ).select_related('requested_by', 'reviewed_by')
    if company_id:
        cn_qs = cn_qs.filter(companyid_id=company_id)

    cn_entries = []
    for cn in cn_qs:
        amt = round(float(cn.amount or 0.0), 2)
        dt = cn.reviewed_at.strftime('%Y-%m-%d') if cn.reviewed_at else cn.created_at.strftime('%Y-%m-%d')
        is_cn = cn.request_type == 'CREDIT_NOTE'
        type_key = 'CREDIT_NOTE' if is_cn else 'DISCOUNT'
        type_label = 'Credit Note' if is_cn else 'Special Discount'
        
        creator_name = cn.requested_by.name if (cn.requested_by and cn.requested_by.name) else (cn.requested_by.email if cn.requested_by else 'Admin')
        creator_role = getattr(cn.requested_by, 'role', '') if cn.requested_by else 'ADMIN'
        narration = cn.accounting_narration or f"{type_label} [REQ ID: {cn.request_id}] - {cn.reason} (Raised by: {creator_name})"

        cn_entries.append({
            'id': f"cndisc_{cn.id}",
            'date': dt,
            'type': type_key,
            'type_label': type_label,
            'voucher_no': cn.request_id,
            'debit': 0.0,
            'credit': amt,
            'request_id': cn.request_id,
            'narration': narration,
            'requested_by_name': creator_name,
            'requested_by_role': creator_role,
            'status': 'APPROVED',
            'ref_id': cn.request_id,
            'photo_url': cn.photo_url,
        })

    # 4. PENDING REQUESTS FOR THIS PARTY
    pending_cn_qs = CreditNoteDiscountRequest.objects.filter(
        models.Q(party_name__iexact=party_name) | models.Q(party_id=party_id) | models.Q(party_id=party_code),
        status='PENDING'
    ).select_related('requested_by')
    if company_id:
        pending_cn_qs = pending_cn_qs.filter(companyid_id=company_id)

    pending_requests_list = []
    for p_req in pending_cn_qs:
        p_creator_name = p_req.requested_by.name if (p_req.requested_by and p_req.requested_by.name) else (p_req.requested_by.email if p_req.requested_by else 'Admin')
        p_creator_role = getattr(p_req.requested_by, 'role', '') if p_req.requested_by else 'ADMIN'
        pending_requests_list.append({
            'id': str(p_req.id),
            'request_id': p_req.request_id,
            'party_type': p_req.party_type,
            'party_id': p_req.party_id,
            'party_name': p_req.party_name,
            'request_type': p_req.request_type,
            'amount': float(p_req.amount or 0.0),
            'reason': p_req.reason,
            'invoice_number': p_req.invoice_number,
            'photo_url': p_req.photo_url,
            'status': p_req.status,
            'requested_by_name': p_creator_name,
            'requested_by_role': p_creator_role,
            'created_at': p_req.created_at.strftime('%Y-%m-%d %H:%M') if p_req.created_at else '',
        })

    # 3b. OPENING BALANCE ENTRY
    party_obj = d if p_type == 'DEALER' else dist
    opening_val = float(party_obj.openingbalance or 0.0) if party_obj else 0.0
    opening_dt = party_obj.openingbalancedate.strftime('%Y-%m-%d') if (party_obj and party_obj.openingbalancedate) else '2026-04-01'
    opening_entries = []
    if opening_val != 0.0 or (party_obj and party_obj.openingbalancedate):
        opening_entries.append({
            'id': f"opening_{party_obj.id}",
            'date': opening_dt,
            'type': 'OPENING_BALANCE',
            'type_label': 'Opening Balance',
            'voucher_no': 'OPENING',
            'debit': opening_val if opening_val > 0 else 0.0,
            'credit': abs(opening_val) if opening_val < 0 else 0.0,
            'narration': f"Opening Balance Brought Forward as of {opening_dt}",
            'status': 'VERIFIED',
            'is_opening': True,
            'ref_id': 'OPENING',
        })

    # 3c. DIRECT MANUAL / EXCEL IMPORTED ENTRIES (Sales, Returns, Payments, JVs, Discounts)
    m_qs = PartyManualLedgerEntry.objects.filter(
        models.Q(partyid=party_id) | models.Q(partyid=party_code) | models.Q(partyname__iexact=party_name)
    )
    if company_id:
        m_qs = m_qs.filter(companyid_id=company_id)

    manual_entries = []
    type_label_map = {
        'SALES': 'Sales Invoice (Manual)',
        'PAYMENT': 'Payment Received (Manual)',
        'SALES_RETURN': 'Sales Return (Manual)',
        'GENERAL_JV': 'Journal Voucher (JV)',
        'DISCOUNT': 'Discount / Rebate',
        'OPENING_BALANCE': 'Opening Balance',
    }

    for m in m_qs:
        v_type = m.vouchertype.upper()
        t_label = type_label_map.get(v_type, m.vouchertype)
        manual_entries.append({
            'id': f"man_{m.id}",
            'date': m.date.strftime('%Y-%m-%d') if m.date else '',
            'type': v_type,
            'type_label': t_label,
            'voucher_no': m.voucherno or f"MAN-{m.id[-6:].upper()}",
            'debit': round(float(m.debit or 0.0), 2),
            'credit': round(float(m.credit or 0.0), 2),
            'narration': m.narration or t_label,
            'status': 'VERIFIED',
            'is_manual': True,
            'manual_id': m.id,
            'source': m.source,
            'ref_id': m.voucherno or m.id,
        })

    # Combine all transactions and sort chronologically
    all_transactions = opening_entries + sales_entries + payment_entries + cn_entries + manual_entries
    all_transactions.sort(key=lambda x: (x.get('date') or '', 0 if x.get('is_opening') else 1, x.get('id') or ''))

    # Calculate Running Balance
    running_balance = 0.0
    total_debits = 0.0
    total_credits = 0.0

    for tx in all_transactions:
        total_debits += tx['debit']
        total_credits += tx['credit']
        running_balance += (tx['debit'] - tx['credit'])
        tx['running_balance'] = round(running_balance, 2)

    # Optional Date Filtering from query params
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')
    tx_type_filter = request.query_params.get('type')

    filtered_transactions = all_transactions
    if from_date:
        filtered_transactions = [t for t in filtered_transactions if t['date'] >= from_date]
    if to_date:
        filtered_transactions = [t for t in filtered_transactions if t['date'] <= to_date]
    if tx_type_filter and tx_type_filter.upper() != 'ALL':
        filtered_transactions = [t for t in filtered_transactions if t['type'] == tx_type_filter.upper()]

    total_sales_amt = sum(t['debit'] for t in all_transactions if t['type'] == 'SALES')
    total_payments_amt = sum(t['credit'] for t in all_transactions if t['type'] == 'PAYMENT')
    total_cns_amt = sum(t['credit'] for t in all_transactions if t['type'] == 'CREDIT_NOTE')
    total_discounts_amt = sum(t['credit'] for t in all_transactions if t['type'] == 'DISCOUNT')

    response_payload = {
        'party': party_info,
        'summary': {
            'total_sales_billed': round(total_sales_amt, 2),
            'total_payments_collected': round(total_payments_amt, 2),
            'total_credit_notes': round(total_cns_amt, 2),
            'total_discounts': round(total_discounts_amt, 2),
            'total_credits': round(total_credits, 2),
            'current_net_balance': round(running_balance, 2),
            'credit_limit': party_info.get('credit_limit', 0.0),
            'payment_modes': {k: round(v, 2) for k, v in payment_mode_breakdown.items()},
        },
        'transactions': filtered_transactions,
        'statement': filtered_transactions,
        'pending_requests': pending_requests_list,
        'total_count': len(filtered_transactions),
    }

    return send_success(response_payload, f"Live ledger statement fetched for {party_name}")


def _recalculate_party_outstanding(p_type: str, party_obj, company_id=None):
    """
    Recalculates total net outstanding balance for a Dealer or Distributor:
      Outstanding = Opening Balance + Total Debits (Sales, Manual Dr, JV Dr) - Total Credits (Payments, CNs, Discounts, Manual Cr, JV Cr)
    """
    p_name = getattr(party_obj, 'dealername', None) or getattr(party_obj, 'distributorname', None)
    p_code = getattr(party_obj, 'dealercode', None) or getattr(party_obj, 'distributorcode', None)
    p_id = party_obj.id

    opening_bal = Decimal(str(party_obj.openingbalance or 0.0))

    # Sales Orders (Dispatched/Completed/Approved/Partially Returned/Returned)
    orders_qs = Order.objects.filter(
        models.Q(partyname__iexact=p_name) | models.Q(partyname=p_name)
    )
    if company_id:
        orders_qs = orders_qs.filter(companyid_id=company_id)
    billed_statuses = ['DISPATCHED', 'COMPLETED', 'APPROVED', 'PARTIALLY RETURNED', 'RETURNED']
    sales_total = orders_qs.filter(status__in=billed_statuses).aggregate(s=models.Sum('grandtotal'))['s'] or 0.0
    sales_total = Decimal(str(round(sales_total, 2)))

    # Payment Receipts (Verified)
    pay_qs = PaymentReceipt.objects.filter(
        models.Q(party_name__iexact=p_name) | models.Q(party_id=p_id) | models.Q(party_id=p_code),
        status='VERIFIED'
    )
    if company_id:
        pay_qs = pay_qs.filter(companyid_id=company_id)
    pay_total = pay_qs.aggregate(s=models.Sum('amount'))['s'] or 0.0
    pay_total = Decimal(str(round(pay_total, 2)))

    # Approved Credit Notes & Discounts
    cn_qs = CreditNoteDiscountRequest.objects.filter(
        models.Q(party_name__iexact=p_name) | models.Q(party_id=p_id) | models.Q(party_id=p_code),
        status='APPROVED'
    )
    if company_id:
        cn_qs = cn_qs.filter(companyid_id=company_id)
    cn_total = cn_qs.aggregate(s=models.Sum('amount'))['s'] or 0.0
    cn_total = Decimal(str(round(cn_total, 2)))

    # Manual entries (from PartyManualLedgerEntry)
    m_qs = PartyManualLedgerEntry.objects.filter(
        models.Q(partyid=p_id) | models.Q(partyid=p_code) | models.Q(partyname__iexact=p_name)
    )
    if company_id:
        m_qs = m_qs.filter(companyid_id=company_id)
    manual_debits = m_qs.aggregate(s=models.Sum('debit'))['s'] or 0.0
    manual_credits = m_qs.aggregate(s=models.Sum('credit'))['s'] or 0.0
    manual_debits = Decimal(str(round(manual_debits, 2)))
    manual_credits = Decimal(str(round(manual_credits, 2)))

    net_outstanding = opening_bal + sales_total + manual_debits - pay_total - cn_total - manual_credits
    party_obj.outstanding = net_outstanding
    party_obj.save(update_fields=['outstanding'])
    return net_outstanding


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_party_opening_balance(request):
    """
    Sets or updates the Opening Balance for a Dealer or Distributor as-of a specific date.
    Recalculates the party's live outstanding balance.
    """
    company_id = _get_company_id(request)
    data = request.data or {}

    party_type = (data.get('party_type') or 'DEALER').upper()
    party_id = str(data.get('party_id') or '').strip()
    raw_amount = float(data.get('opening_balance') or 0.0)
    balance_type = (data.get('balance_type') or 'DR').upper()  # 'DR' (Debit/Receivable) or 'CR' (Credit/Payable)
    opening_date_str = str(data.get('opening_balance_date') or '').strip()

    if not party_id:
        return send_error("party_id is required", 400)

    # Resolve Party
    party_obj = None
    if party_type == 'DEALER':
        party_obj = (
            Dealer.objects.filter(id=party_id).first() or
            Dealer.objects.filter(dealercode=party_id).first() or
            Dealer.objects.filter(dealername__iexact=party_id).first()
        )
    else:
        party_obj = (
            Distributor.objects.filter(id=party_id).first() or
            Distributor.objects.filter(distributorcode=party_id).first() or
            Distributor.objects.filter(distributorname__iexact=party_id).first()
        )

    if not party_obj:
        return send_error(f"Party '{party_id}' not found", 404)

    # In accounting, Debit = receivable (positive), Credit = advance/payable (negative)
    net_val = Decimal(str(round(raw_amount if balance_type == 'DR' else -raw_amount, 2)))
    party_obj.openingbalance = net_val

    if opening_date_str:
        try:
            party_obj.openingbalancedate = datetime.strptime(opening_date_str[:10], '%Y-%m-%d').date()
        except Exception:
            pass

    party_obj.save(update_fields=['openingbalance', 'openingbalancedate'])

    # Recalculate outstanding balance
    new_outstanding = _recalculate_party_outstanding(party_type, party_obj, company_id=company_id)

    p_name = getattr(party_obj, 'dealername', None) or getattr(party_obj, 'distributorname', None)
    return send_success({
        'party_id': party_obj.id,
        'party_name': p_name,
        'opening_balance': float(party_obj.openingbalance),
        'opening_balance_date': party_obj.openingbalancedate.strftime('%Y-%m-%d') if party_obj.openingbalancedate else None,
        'outstanding': float(new_outstanding),
    }, f"Opening balance updated successfully for {p_name}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_party_ledger_entry(request):
    """
    Creates a direct one-time manual transaction for a Dealer or Distributor:
      - SALES (Debit)
      - PAYMENT (Credit)
      - SALES_RETURN (Credit)
      - GENERAL_JV (Debit or Credit)
      - DISCOUNT (Credit)
    Automatically updates the party's live outstanding balance.
    """
    company_id = _get_company_id(request)
    data = request.data or {}

    party_type = (data.get('party_type') or 'DEALER').upper()
    party_id = str(data.get('party_id') or '').strip()
    voucher_type = (data.get('voucher_type') or 'SALES').upper()
    voucher_no = str(data.get('voucher_no') or '').strip()
    date_str = str(data.get('date') or datetime.now().strftime('%Y-%m-%d')).strip()[:10]
    amount = Decimal(str(round(float(data.get('amount') or 0.0), 2)))
    entry_side = (data.get('entry_side') or 'DR').upper()  # 'DR' or 'CR'
    narration = str(data.get('narration') or '').strip()

    if not party_id:
        return send_error("party_id is required", 400)
    if amount <= 0:
        return send_error("Amount must be greater than zero", 400)

    # Resolve Party
    party_obj = None
    if party_type == 'DEALER':
        party_obj = (
            Dealer.objects.filter(id=party_id).first() or
            Dealer.objects.filter(dealercode=party_id).first() or
            Dealer.objects.filter(dealername__iexact=party_id).first()
        )
    else:
        party_obj = (
            Distributor.objects.filter(id=party_id).first() or
            Distributor.objects.filter(distributorcode=party_id).first() or
            Distributor.objects.filter(distributorname__iexact=party_id).first()
        )

    if not party_obj:
        return send_error(f"Party '{party_id}' not found", 404)

    p_name = getattr(party_obj, 'dealername', None) or getattr(party_obj, 'distributorname', None)

    # Determine Debit vs Credit based on Voucher Type and Side
    # Standard rules:
    # SALES -> Debit
    # PAYMENT -> Credit
    # SALES_RETURN -> Credit
    # DISCOUNT -> Credit
    # GENERAL_JV -> Based on entry_side ('DR' or 'CR')
    if voucher_type == 'SALES':
        debit_amt = amount
        credit_amt = Decimal('0.00')
    elif voucher_type in ['PAYMENT', 'SALES_RETURN', 'DISCOUNT']:
        debit_amt = Decimal('0.00')
        credit_amt = amount
    else:  # GENERAL_JV
        if entry_side == 'CR':
            debit_amt = Decimal('0.00')
            credit_amt = amount
        else:
            debit_amt = amount
            credit_amt = Decimal('0.00')

    entry_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    entry_id = f"ple_{uuid.uuid4().hex[:16]}"

    created_by_user = getattr(request.user, 'name', None) or getattr(request.user, 'email', 'Admin')

    entry = PartyManualLedgerEntry.objects.create(
        id=entry_id,
        partytype=party_type,
        partyid=party_obj.id,
        partyname=p_name,
        companyid_id=company_id,
        date=entry_date,
        vouchertype=voucher_type,
        voucherno=voucher_no or f"MAN-{entry_id[-6:].upper()}",
        debit=debit_amt,
        credit=credit_amt,
        narration=narration,
        source='MANUAL',
        createdby=created_by_user
    )

    new_outstanding = _recalculate_party_outstanding(party_type, party_obj, company_id=company_id)

    return send_success({
        'id': entry.id,
        'voucher_no': entry.voucherno,
        'voucher_type': entry.vouchertype,
        'date': entry.date.strftime('%Y-%m-%d'),
        'debit': float(entry.debit),
        'credit': float(entry.credit),
        'narration': entry.narration,
        'outstanding': float(new_outstanding)
    }, f"Entry recorded successfully for {p_name}")


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_party_ledger_entry(request, entry_id):
    """
    Deletes a manual ledger entry and recalculates the party's outstanding balance.
    """
    company_id = _get_company_id(request)
    entry = PartyManualLedgerEntry.objects.filter(id=entry_id).first()
    if not entry:
        return send_error(f"Entry '{entry_id}' not found", 404)

    party_type = entry.partytype
    party_id = entry.partyid

    # Resolve Party
    party_obj = None
    if party_type == 'DEALER':
        party_obj = Dealer.objects.filter(id=party_id).first()
    else:
        party_obj = Distributor.objects.filter(id=party_id).first()

    entry.delete()

    new_outstanding = 0.0
    if party_obj:
        new_outstanding = _recalculate_party_outstanding(party_type, party_obj, company_id=company_id)

    return send_success({
        'deleted_id': entry_id,
        'outstanding': float(new_outstanding)
    }, "Ledger entry deleted successfully")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def import_party_ledger_file(request):
    """
    One-time bulk Excel / CSV importer for Busy ledger statements.
    Parses columns: Date, Voucher Type, Voucher No, Particulars/Narration, Debit, Credit.
    Creates PartyManualLedgerEntry records and updates party outstanding balance.
    """
    company_id = _get_company_id(request)
    party_type = (request.data.get('party_type') or 'DEALER').upper()
    party_id = str(request.data.get('party_id') or '').strip()

    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return send_error("Excel (.xlsx) or CSV file is required", 400)

    # Resolve Party
    party_obj = None
    if party_type == 'DEALER':
        party_obj = (
            Dealer.objects.filter(id=party_id).first() or
            Dealer.objects.filter(dealercode=party_id).first() or
            Dealer.objects.filter(dealername__iexact=party_id).first()
        )
    else:
        party_obj = (
            Distributor.objects.filter(id=party_id).first() or
            Distributor.objects.filter(distributorcode=party_id).first() or
            Distributor.objects.filter(distributorname__iexact=party_id).first()
        )

    if not party_obj:
        return send_error(f"Party '{party_id}' not found", 404)

    p_name = getattr(party_obj, 'dealername', None) or getattr(party_obj, 'distributorname', None)

    # Read rows from Excel or CSV
    filename = uploaded_file.name.lower()
    parsed_rows = []

    def clean_num(v):
        if not v:
            return 0.0
        try:
            return float(str(v).replace(',', '').replace('₹', '').replace('Rs.', '').replace(' ', '').strip())
        except Exception:
            return 0.0

    def parse_dt(v):
        if isinstance(v, datetime):
            return v.date()
        s = str(v).strip()
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%d-%b-%Y', '%d-%b-%y'):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        try:
            return datetime.strptime(s[:10], '%Y-%m-%d').date()
        except Exception:
            return None

    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        import openpyxl
        wb = openpyxl.load_workbook(uploaded_file, data_only=True)
        sheet = wb.active
        raw_data = list(sheet.iter_rows(values_only=True))
        if not raw_data or len(raw_data) < 2:
            return send_error("The uploaded Excel sheet contains no data rows", 400)

        # Detect header row
        header_row_idx = 0
        for idx, row in enumerate(raw_data[:10]):
            r_str = " ".join([str(c or '').lower() for c in row])
            if any(k in r_str for k in ['date', 'vch', 'voucher', 'debit', 'credit', 'amount']):
                header_row_idx = idx
                break

        headers = [str(c or '').strip().lower() for c in raw_data[header_row_idx]]
        for row in raw_data[header_row_idx + 1:]:
            if not any(row):
                continue
            row_dict = {headers[i]: row[i] for i in range(min(len(headers), len(row)))}
            parsed_rows.append(row_dict)
    else:
        import csv
        import io
        content = uploaded_file.read().decode('utf-8', errors='ignore')
        reader = csv.DictReader(io.StringIO(content))
        for r in reader:
            parsed_rows.append({k.strip().lower(): v for k, v in r.items() if k})

    if not parsed_rows:
        return send_error("No valid data rows found in the uploaded file", 400)

    # Find column keys
    sample = parsed_rows[0]
    keys = list(sample.keys())
    date_key = next((k for k in keys if any(w in k for w in ['date', 'dt'])), None)
    vch_type_key = next((k for k in keys if any(w in k for w in ['type', 'vch_type', 'vch type'])), None)
    vch_no_key = next((k for k in keys if any(w in k for w in ['vch_no', 'vchno', 'bill no', 'inv', 'no', 'number'])), None)
    nar_key = next((k for k in keys if any(w in k for w in ['narration', 'particular', 'desc', 'remarks'])), None)
    debit_key = next((k for k in keys if any(w in k for w in ['debit', 'dr'])), None)
    credit_key = next((k for k in keys if any(w in k for w in ['credit', 'cr'])), None)
    amount_key = next((k for k in keys if any(w in k for w in ['amount', 'amt', 'value'])), None)

    created_entries = []
    user_name = getattr(request.user, 'name', None) or getattr(request.user, 'email', 'Admin')

    for r in parsed_rows:
        dt = parse_dt(r.get(date_key)) if date_key else None
        if not dt:
            continue

        deb = clean_num(r.get(debit_key)) if debit_key else 0.0
        cred = clean_num(r.get(credit_key)) if credit_key else 0.0

        if not debit_key and not credit_key and amount_key:
            amt = clean_num(r.get(amount_key))
            if amt > 0:
                deb = amt
            else:
                cred = abs(amt)

        # Voucher type classification
        raw_vtype = str(r.get(vch_type_key) or '').strip().lower()
        if any(w in raw_vtype for w in ['sale', 'inv']):
            v_type = 'SALES'
        elif any(w in raw_vtype for w in ['return', 'cn', 'credit note']):
            v_type = 'SALES_RETURN'
        elif any(w in raw_vtype for w in ['receipt', 'pay', 'rcpt']):
            v_type = 'PAYMENT'
        elif any(w in raw_vtype for w in ['discount', 'disc', 'rebate']):
            v_type = 'DISCOUNT'
        elif any(w in raw_vtype for w in ['journal', 'jv']):
            v_type = 'GENERAL_JV'
        elif any(w in raw_vtype for w in ['opening', 'op bal']):
            v_type = 'OPENING_BALANCE'
        else:
            v_type = 'SALES' if deb > 0 else 'PAYMENT'

        v_no = str(r.get(vch_no_key) or '').strip()
        nar = str(r.get(nar_key) or '').strip()

        # If opening balance row detected, also set openingbalance on party
        if v_type == 'OPENING_BALANCE' or 'opening' in nar.lower():
            net_op = Decimal(str(round(deb - cred, 2)))
            party_obj.openingbalance = net_op
            party_obj.openingbalancedate = dt
            party_obj.save(update_fields=['openingbalance', 'openingbalancedate'])
            continue

        created_entries.append(PartyManualLedgerEntry(
            id=f"ple_{uuid.uuid4().hex[:16]}",
            partytype=party_type,
            partyid=party_obj.id,
            partyname=p_name,
            companyid_id=company_id,
            date=dt,
            vouchertype=v_type,
            voucherno=v_no or 'EXCEL',
            debit=Decimal(str(round(deb, 2))),
            credit=Decimal(str(round(cred, 2))),
            narration=nar or f"Imported from {filename}",
            source='EXCEL_IMPORT',
            createdby=user_name
        ))

    if created_entries:
        PartyManualLedgerEntry.objects.bulk_create(created_entries, batch_size=500)

    new_outstanding = _recalculate_party_outstanding(party_type, party_obj, company_id=company_id)

    return send_success({
        'imported_count': len(created_entries),
        'party_id': party_obj.id,
        'party_name': p_name,
        'outstanding': float(new_outstanding)
    }, f"Successfully imported {len(created_entries)} ledger entries for {p_name}")
