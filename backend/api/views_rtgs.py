from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
import uuid

from api.models import RtgsPaymentRequest, Labour, SalarySlip, SalaryAdvance, EmployeeLedger
from core.models import Broadcast
from api.serializers import RtgsPaymentRequestSerializer
from api.response import send_success, send_error
from api.request_context import get_company_id

SUPERADMIN_ROLES = {'SUPERADMIN', 'SUPER_ADMIN', 'DIRECTOR'}

def is_superadmin_or_director(user):
    if not user or not user.is_authenticated:
        return False
    role = (getattr(user, 'role', '') or '').upper()
    return role in SUPERADMIN_ROLES or getattr(user, 'is_superuser', False)

def _create_broadcast(company_id, message, target_role, author):
    try:
        Broadcast.objects.create(
            id='bc_' + uuid.uuid4().hex[:20],
            message=message,
            target_role=target_role,
            author=author,
            company_id=company_id
        )
    except Exception:
        pass

def _sync_rtgs_to_employee_ledger(req, utr):
    """
    Auto-maps an approved/paid Bank RTGS payment or advance directly to the Employee Ledger:
    1. Salary Payment (SALARY / HR_SALARY):
       - Posts a Debit (-) PAYMENT entry into EmployeeLedger so the payable salary liability is cleared.
       - Marks any matching finalized SalarySlip as PAID with payment_mode='RTGS' and payment_reference=utr.
    2. Salary Advance (ADVANCE / SALARY_ADVANCE / LOAN):
       - Automatically creates a SalaryAdvance record so next month's payroll engine auto-deducts it!
       - Posts a Debit (-) ADVANCE entry into EmployeeLedger.
    """
    try:
        emp = None
        if req.account_number:
            emp = Labour.objects.filter(bank_account_number=req.account_number, companyid_id=req.companyid_id).first()
        if not emp and req.beneficiary_name:
            emp = Labour.objects.filter(name__iexact=req.beneficiary_name.strip(), companyid_id=req.companyid_id).first()
        if not emp and req.beneficiary_name:
            emp = Labour.objects.filter(name__icontains=req.beneficiary_name.strip(), companyid_id=req.companyid_id).first()

        if not emp:
            return None

        cat_upper = (req.payee_category or '').upper()
        narr_upper = (req.narration or '').upper()
        head_upper = (req.expense_head or '').upper()

        is_advance = (
            cat_upper in ('ADVANCE', 'SALARY_ADVANCE', 'LOAN') or
            head_upper in ('ADVANCE', 'SALARY_ADVANCE') or
            'ADVANCE' in narr_upper
        )

        is_salary = (
            cat_upper == 'SALARY' or
            head_upper == 'SALARY' or
            req.source in ('HR_SALARY', 'PAYROLL') or
            'SALARY' in narr_upper
        )

        amount_val = float(req.amount or 0.0)
        pay_date = req.payment_date or timezone.now().date()

        if is_advance:
            # Check for existing advance posted for this RTGS UTR / approval code
            existing = EmployeeLedger.objects.filter(
                labourid=emp,
                payment_reference=utr,
                transaction_type='ADVANCE'
            ).first()
            if not existing:
                # 1. Create SalaryAdvance so it's auto-deducted from future salary slips
                adv = SalaryAdvance.objects.create(
                    labourid=emp,
                    amount=amount_val,
                    deduction_per_month=amount_val,
                    remaining_balance=amount_val,
                    date_issued=pay_date
                )
                # 2. Post Debit (-) to EmployeeLedger
                ledger_entry = EmployeeLedger.objects.create(
                    labourid=emp,
                    date=pay_date,
                    transaction_type='ADVANCE',
                    description=f"Bank RTGS Salary Advance ({req.approval_code}) — UTR: {utr}",
                    amount=-amount_val,
                    reference_id=adv.id,
                    payment_mode='RTGS',
                    payment_reference=utr
                )
                return ledger_entry
        elif is_salary:
            # Check for existing payment posted for this RTGS UTR
            existing = EmployeeLedger.objects.filter(
                labourid=emp,
                payment_reference=utr,
                transaction_type='PAYMENT'
            ).first()
            if not existing:
                # 1. Match and mark SalarySlip as PAID
                slip = SalarySlip.objects.filter(labourid=emp, net_pay=amount_val).order_by('-id').first()
                if not slip:
                    slip = SalarySlip.objects.filter(labourid=emp, is_finalized=True).order_by('-id').first()
                if slip:
                    slip.payment_mode = 'RTGS'
                    slip.payment_reference = utr
                    slip.save()

                # 2. Post Debit (-) to EmployeeLedger
                ledger_entry = EmployeeLedger.objects.create(
                    labourid=emp,
                    date=pay_date,
                    transaction_type='PAYMENT',
                    description=f"Bank RTGS Salary Transfer ({req.approval_code}) — UTR: {utr}",
                    amount=-amount_val,
                    reference_id=slip.id if slip else None,
                    payment_mode='RTGS',
                    payment_reference=utr
                )
                return ledger_entry
        return None
    except Exception as e:
        print(f"[RTGS SYNC ERROR] Failed to sync RTGS {req.approval_code} to ledger: {e}")
        return None

class RtgsPaymentRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = RtgsPaymentRequest.objects.all()
    serializer_class = RtgsPaymentRequestSerializer

    def get_queryset(self):
        company_id = get_company_id(self.request)
        qs = RtgsPaymentRequest.objects.filter(companyid_id=company_id)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param and status_param.upper() != 'ALL':
            qs = qs.filter(status=status_param.upper())

        # Filter by payee_category
        cat_param = self.request.query_params.get('category')
        if cat_param and cat_param.upper() != 'ALL':
            qs = qs.filter(payee_category=cat_param.upper())

        # Filter by expense_head
        head_param = self.request.query_params.get('expense_head')
        if head_param and head_param.upper() != 'ALL':
            qs = qs.filter(expense_head=head_param.upper())

        # Search query
        search = self.request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(beneficiary_name__icontains=search) |
                Q(account_number__icontains=search) |
                Q(approval_code__icontains=search) |
                Q(bill_number__icontains=search) |
                Q(narration__icontains=search)
            )

        return qs.order_by('-requested_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return send_success(serializer.data, 'RTGS payment requests retrieved successfully')

    def create(self, request, *args, **kwargs):
        company_id = get_company_id(request)
        data = request.data

        # Support both single request object and array of requests for bulk submission
        is_bulk = isinstance(data, list)
        items = data if is_bulk else [data]

        created_objs = []
        for item in items:
            beneficiary_name = (item.get('beneficiary_name') or item.get('beneficiaryName') or '').strip().upper()
            account_number = str(item.get('account_number') or item.get('accountNumber') or item.get('beneficiary_account') or item.get('beneficiaryAccount') or '').strip()
            ifsc_code = str(item.get('ifsc_code') or item.get('ifscCode') or item.get('beneficiary_ifsc') or item.get('beneficiaryIfsc') or '').strip().upper()
            amount = item.get('amount')

            if not beneficiary_name:
                return send_error('Beneficiary name is required for all requests', 400)
            if not amount or float(amount) <= 0:
                return send_error('Valid transfer amount is required for all requests', 400)

            today_str = timezone.now().strftime('%Y%m%d')
            approval_code = f"RTGS-{today_str}-{uuid.uuid4().hex[:6].upper()}"

            payee_cat = (item.get('payee_category') or item.get('payeeCategory') or item.get('payment_type') or item.get('paymentType') or 'OTHER').upper()
            bank_name = (item.get('bank_name') or item.get('bankName') or item.get('beneficiary_bank') or item.get('beneficiaryBank') or 'AXIS BANK').strip().upper()
            narration_val = (item.get('narration') or item.get('purpose') or f"RTGS {beneficiary_name}").strip()

            req_obj = RtgsPaymentRequest(
                id=str(uuid.uuid4()),
                approval_code=approval_code,
                payment_mode=item.get('payment_mode') or item.get('paymentMode') or 'RTGS',
                payee_category=payee_cat,
                beneficiary_name=beneficiary_name,
                bank_name=bank_name,
                account_number=account_number,
                ifsc_code=ifsc_code,
                branch=(item.get('branch') or 'NAVSARI').strip().upper(),
                amount=amount,
                expense_head=item.get('expense_head') or item.get('expenseHead') or ('SALARY' if payee_cat == 'SALARY' else 'RAW_MATERIAL'),
                bill_date=item.get('bill_date') or item.get('billDate') or timezone.now().date(),
                payment_date=item.get('payment_date') or item.get('paymentDate') or timezone.now().date(),
                bill_number=item.get('bill_number') or item.get('billNumber'),
                cheque_number=item.get('cheque_number') or item.get('chequeNumber'),
                narration=narration_val[:200],
                status='PENDING', # Always starts in PENDING for approval gate!
                source=item.get('source') or ('HUB_BULK' if is_bulk else 'HR_SALARY' if payee_cat == 'SALARY' else 'HUB_SINGLE'),
                company_account=item.get('company_account') or item.get('companyAccount') or '',
                company_bank=item.get('company_bank') or item.get('companyBank') or 'AXIS BANK',
                requested_by=request.user,
                companyid_id=company_id,
            )
            req_obj.save()
            created_objs.append(req_obj)

        if is_bulk:
            total_amt = sum(float(o.amount or 0) for o in created_objs)
            names_preview = ", ".join(o.beneficiary_name for o in created_objs[:2])
            if len(created_objs) > 2:
                names_preview += f" +{len(created_objs) - 2} more"
            maker_name = request.user.first_name or request.user.email.split('@')[0]
            _create_broadcast(
                company_id=company_id,
                message=f"🏦 Bulk RTGS Awaiting Approval: {len(created_objs)} transfers totaling ₹{total_amt:,.2f} submitted by {maker_name}.",
                target_role='SUPERADMIN',
                author=maker_name
            )
            serializer = self.get_serializer(created_objs, many=True)
            return send_success(serializer.data, f'Successfully queued {len(created_objs)} RTGS requests for SuperAdmin approval', 201)
        else:
            first_obj = created_objs[0]
            maker_name = request.user.first_name or request.user.email.split('@')[0]
            _create_broadcast(
                company_id=company_id,
                message=f"🏦 RTGS Awaiting Approval: ₹{float(first_obj.amount):,.2f} for {first_obj.beneficiary_name} ({first_obj.payee_category}) submitted by {maker_name}.",
                target_role='SUPERADMIN',
                author=maker_name
            )
            serializer = self.get_serializer(first_obj)
            return send_success(serializer.data, 'RTGS payment request queued for SuperAdmin approval', 201)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Approve single RTGS payment request. Strictly SuperAdmin or Director only."""
        if not is_superadmin_or_director(request.user):
            return send_error('Exclusively SuperAdmin or Director can approve RTGS payments. Standard Admin cannot approve.', 403)

        company_id = get_company_id(request)
        try:
            req = RtgsPaymentRequest.objects.get(id=pk, companyid_id=company_id)
        except RtgsPaymentRequest.DoesNotExist:
            return send_error('RTGS payment request not found', 404)

        req.status = 'APPROVED'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.review_notes = request.data.get('review_notes') or request.data.get('reviewNotes') or 'Approved for Bank RTGS transfer'
        req.save()

        # Notify concerned department official (HR for salary, ACCOUNTS for vendors)
        target_role = 'HR' if req.payee_category == 'SALARY' else 'ACCOUNTS'
        _create_broadcast(
            company_id=company_id,
            message=f"✅ RTGS Approved: ₹{float(req.amount):,.2f} for {req.beneficiary_name} has been authorized by SuperAdmin. Unlocked for bank download.",
            target_role=target_role,
            author='SuperAdmin'
        )

        serializer = self.get_serializer(req)
        return send_success(serializer.data, f'RTGS payment #{req.approval_code} approved! PDF download unlocked.')

    @action(detail=False, methods=['post'], url_path='bulk-approve')
    def bulk_approve(self, request):
        """Bulk approve multiple RTGS payment requests at once. Strictly SuperAdmin or Director only."""
        if not is_superadmin_or_director(request.user):
            return send_error('Exclusively SuperAdmin or Director can bulk approve RTGS payments. Standard Admin cannot approve.', 403)

        company_id = get_company_id(request)
        ids = request.data.get('ids', [])
        if not ids or not isinstance(ids, list):
            return send_error('List of request ids is required', 400)

        matching_reqs = list(RtgsPaymentRequest.objects.filter(
            id__in=ids,
            companyid_id=company_id,
            status='PENDING'
        ))

        updated_count = len(matching_reqs)
        if updated_count > 0:
            RtgsPaymentRequest.objects.filter(
                id__in=[r.id for r in matching_reqs]
            ).update(
                status='APPROVED',
                reviewed_by=request.user,
                reviewed_at=timezone.now(),
                review_notes=request.data.get('review_notes') or 'Bulk approved by SuperAdmin'
            )

            total_amt = sum(float(r.amount or 0) for r in matching_reqs)
            _create_broadcast(
                company_id=company_id,
                message=f"✅ Bulk RTGS Approved: {updated_count} transfers totaling ₹{total_amt:,.2f} approved by SuperAdmin. Ready for bank slip download.",
                target_role='HR',
                author='SuperAdmin'
            )
            _create_broadcast(
                company_id=company_id,
                message=f"✅ Bulk RTGS Approved: {updated_count} transfers totaling ₹{total_amt:,.2f} approved by SuperAdmin. Ready for bank slip download.",
                target_role='ACCOUNTS',
                author='SuperAdmin'
            )

        return send_success({'approved_count': updated_count}, f'{updated_count} RTGS payments approved! PDF download unlocked.')

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Reject RTGS payment request. Strictly SuperAdmin or Director only."""
        if not is_superadmin_or_director(request.user):
            return send_error('Exclusively SuperAdmin or Director can reject RTGS payments. Standard Admin cannot reject.', 403)

        company_id = get_company_id(request)
        try:
            req = RtgsPaymentRequest.objects.get(id=pk, companyid_id=company_id)
        except RtgsPaymentRequest.DoesNotExist:
            return send_error('RTGS payment request not found', 404)

        reason = request.data.get('reason') or request.data.get('review_notes') or 'Rejected by administrator'
        req.status = 'REJECTED'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.review_notes = reason
        req.save()

        # Notify concerned department official of rejection with reason
        target_role = 'HR' if req.payee_category == 'SALARY' else 'ACCOUNTS'
        _create_broadcast(
            company_id=company_id,
            message=f"❌ RTGS Rejected: ₹{float(req.amount):,.2f} for {req.beneficiary_name} was rejected by SuperAdmin. Reason: {reason}",
            target_role=target_role,
            author='SuperAdmin'
        )

        serializer = self.get_serializer(req)
        return send_success(serializer.data, f'RTGS request #{req.approval_code} rejected.')

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        """Mark as paid and record bank UTR number, auto-mapping to Employee Ledger if Salary or Advance."""
        company_id = get_company_id(request)
        try:
            req = RtgsPaymentRequest.objects.get(id=pk, companyid_id=company_id)
        except RtgsPaymentRequest.DoesNotExist:
            return send_error('RTGS payment request not found', 404)

        utr = request.data.get('utr_number') or request.data.get('utrNumber')
        if not utr:
            return send_error('Bank UTR number is required to confirm payment', 400)

        req.status = 'PAID'
        req.utr_number = utr
        req.save()

        # Auto-map to Employee Ledger and Salary Advances if applicable
        ledger_entry = _sync_rtgs_to_employee_ledger(req, utr)
        sync_msg = ' Auto-mapped to employee ledger.' if ledger_entry else ''

        serializer = self.get_serializer(req)
        return send_success(serializer.data, f'RTGS request #{req.approval_code} marked as PAID with UTR {utr}.{sync_msg}')
